import accordLogo from './accord.png';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from './supabaseClient';
import DepartmentCard from './components/DepartmentCard';
import ScheduleCalendar from './components/ScheduleCalendar';
import ConflictTable from './components/ConflictTable';
import GlobalResourceMonitor from './components/GlobalResourceMonitor';
import {
  LayoutDashboard, Printer, Activity, Zap, LogOut, Lock, User, 
  RefreshCw, Globe, Calendar, List, Users, Shield, UserPlus, Trash2, Archive, CheckCircle, Plus, Clock, AlertOctagon, Download, Bell, BellRing, AlertTriangle, X, Upload, CheckCircle2, AlertCircle, HelpCircle, ArrowRight, MessageSquare, Send, Search, ArrowLeft, Reply, Edit2, MoreVertical, Layers, ChevronDown, ChevronUp
} from 'lucide-react';

// --- GLOBAL TIME FORMATTER (Converts 24h to 12h AM/PM) ---
const formatTime = (timeStr) => {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${suffix}`;
};

// --- RELATIVE TIME FORMATTER (Respects AM/PM Rule) ---
const formatRelativeTime = (dateString) => {
  if (!dateString) return "";
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  
  // Fallback for older messages
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit', hour12: true });
};

// --- GLOBAL & DIRECT REAL-TIME CHAT PANEL ---
const ChatPanel = ({ profile, onClose, onViewProctor }) => {
  const [messages, setMessages] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [text, setText] = useState("");
  const [chatMode, setChatMode] = useState("global"); 
  const [dmTarget, setDmTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [activeThread, setActiveThread] = useState(null);
  const [localToast, setLocalToast] = useState(null);
  
  // Session-based Unread Tracker for DMs
  const [unreadDMs, setUnreadDMs] = useState({}); 
  
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null); 

  useEffect(() => {
    const fetchChatData = async () => {
      const { data: msgData } = await supabase.from('messages')
        .select('*')
        .or(`receiver_id.is.null,receiver_id.eq.${profile.id},sender_id.eq.${profile.id}`)
        .order('created_at', { ascending: true }); 
      
      if (msgData) {
        setMessages(msgData);
        
        // --- NEW: CALCULATE PERSISTENT UNREAD BADGES ---
        const initialUnread = {};
        msgData.forEach(m => {
          if (m.receiver_id === profile.id) {
             const lastRead = localStorage.getItem(`last_read_dm_${profile.id}_${m.sender_id}`) || '1970-01-01T00:00:00.000Z';
             if (new Date(m.created_at) > new Date(lastRead)) {
                initialUnread[m.sender_id] = (initialUnread[m.sender_id] || 0) + 1;
             }
          }
        });
        setUnreadDMs(initialUnread);
      }

      const { data: userData } = await supabase.from('profiles')
        .select('id, full_name, role, assigned_dept')
        .neq('id', profile.id)
        .order('full_name', { ascending: true });
      if (userData) setSystemUsers(userData);
    };
    fetchChatData();

    const channel = supabase.channel('global_chat')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const m = payload.new;
          if (!m.receiver_id || m.receiver_id === profile.id || m.sender_id === profile.id) {
            setMessages(prev => [...prev, m]); 
            
            if (m.sender_id !== profile.id) {
              setLocalToast(`New message from ${m.sender_name}`);
              setTimeout(() => setLocalToast(null), 4000);

              if (m.receiver_id === profile.id) {
                 setUnreadDMs(prev => {
                    if (chatMode !== 'dm' || dmTarget?.id !== m.sender_id) {
                       return { ...prev, [m.sender_id]: (prev[m.sender_id] || 0) + 1 };
                    } else {
                       // Update memory if we are actively chatting with them!
                       localStorage.setItem(`last_read_dm_${profile.id}_${m.sender_id}`, new Date().toISOString());
                       return prev;
                    }
                 });
              }
            }
          }
        } else if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
        } else if (payload.eventType === 'DELETE') {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile.id, chatMode, dmTarget]);
 

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (editingId) {
      await supabase.from('messages').update({ text, is_edited: true }).eq('id', editingId);
      setEditingId(null);
    } else {
      const { error } = await supabase.from('messages').insert([{
        sender_id: profile.id, sender_name: profile.full_name, sender_role: profile.role,
        text, 
        receiver_id: chatMode === 'dm' ? dmTarget.id : null,
        parent_id: activeThread ? activeThread.id : null
      }]);

      if (!error) {
        const payloads = [];
        const isAdmin = profile.role === 'HEAD_ADMIN' || profile.role === 'DEPT_ADMIN';

        // ONLY send system bell notifications for Global Campus Announcements
        // DMs and Replies will now only show the red badge inside the chat panel!
        if (chatMode === 'global' && isAdmin && !activeThread) {
          const createPayload = (u, titleMsg, customMessage = text) => {
            if (u.role === 'HEAD_ADMIN') return { target_role: 'HEAD_ADMIN', title: titleMsg, message: customMessage, type: 'info' };
            if (u.role === 'DEPT_ADMIN') return { target_dept: u.assigned_dept, title: titleMsg, message: customMessage, type: 'info' };
            return { target_user_id: u.id, title: titleMsg, message: customMessage, type: 'info' };
          };

          const uniqueTargets = new Set();
          systemUsers.forEach(u => {
            const p = createPayload(u, `Campus Announcement: ${profile.full_name}`);
            const key = p.target_role || p.target_dept || p.target_user_id; 
            if (!uniqueTargets.has(key)) {
              uniqueTargets.add(key);
              payloads.push(p);
            }
          });
        }

        if (payloads.length > 0) {
          await supabase.from('notifications').insert(payloads);
        }
      }
    }
    setText(""); 
  };
    
  const displayedMessages = messages.filter(m => {
    if (activeThread) return m.parent_id === activeThread.id;
    if (chatMode === 'global') return !m.receiver_id && !m.parent_id;
    if (chatMode === 'dm' && dmTarget) {
      return !m.parent_id && ((m.sender_id === profile.id && m.receiver_id === dmTarget.id) || (m.sender_id === dmTarget.id && m.receiver_id === profile.id));
    }
    return false;
  });

  // Auto-scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedMessages]);

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[400px] max-w-full bg-slate-50 shadow-2xl z-[200] flex flex-col border-l-[8px] border-indigo-500 animate-in slide-in-from-right-full duration-500">
      
      {localToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl z-50 animate-bounce">
          {localToast}
        </div>
      )}

      <div className="bg-slate-900 p-6 flex justify-between items-center text-white shadow-md z-10">
        <div>
          <h3 className="text-2xl font-black uppercase flex items-center gap-3"><MessageSquare className="text-indigo-400" size={24} /> Accord Chat</h3>
          <p className="text-[9px] font-black uppercase text-slate-400">Communication Hub</p>
        </div>
        <button onClick={onClose} className="bg-white/10 p-3 rounded-2xl hover:bg-rose-500 transition-all"><X size={20}/></button>
      </div>

      {!activeThread && chatMode !== 'dm' && (
        <div className="flex bg-white border-b-2">
          <button onClick={() => setChatMode('global')} className={`flex-1 py-4 text-xs font-black uppercase border-b-4 ${chatMode === 'global' ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-400'}`}>Campus</button>
          <button onClick={() => setChatMode('directory')} className={`flex-1 py-4 text-xs font-black uppercase border-b-4 relative ${chatMode === 'directory' ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-400'}`}>
             Direct
             {Object.values(unreadDMs).some(count => count > 0) && (
               <span className="absolute top-2 right-8 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-white shadow-md animate-pulse">
                 {Object.values(unreadDMs).reduce((a, b) => a + b, 0)}
               </span>
             )}
          </button>
        </div>
      )}

     {!activeThread && chatMode === 'dm' && dmTarget && (
        <div className="bg-white p-4 border-b-2 flex justify-between items-center shadow-sm z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => { setChatMode('directory'); setDmTarget(null); }} className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors"><ArrowLeft size={16}/></button>
            <div><h4 className="text-sm font-black text-slate-900 uppercase">{dmTarget.full_name}</h4><span className="text-[9px] font-black uppercase text-indigo-500">{dmTarget.role}</span></div>
          </div>
          <button onClick={() => {
            onClose(); // Closes the chat panel
            onViewProctor(dmTarget); // Opens their dashboard
          }} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center gap-2 text-[9px] font-black uppercase tracking-widest" title="View Profile Dashboard">
            <LayoutDashboard size={14}/> View
          </button>
        </div>
      )}

      {(chatMode === 'global' || chatMode === 'dm') && (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar bg-slate-50">
          
{activeThread && (
            <div className="bg-white p-4 rounded-3xl border-2 border-indigo-200 shadow-md mb-6 relative">
               <button 
                 onClick={() => {
                    const targetUser = systemUsers.find(u => u.id === activeThread.sender_id);
                    if (targetUser) onViewProctor(targetUser);
                 }}
                 className="text-[10px] font-black text-indigo-700 uppercase mb-2 flex items-center gap-1.5 hover:text-indigo-500 transition-colors w-max"
                 title="View Profile Dashboard"
               >
                 <User size={12}/> {activeThread.sender_name}
               </button>
               <p className="text-sm font-bold text-slate-800">{activeThread.text}</p>
               <span className="text-[8px] font-black text-slate-400 uppercase mt-2 block border-t border-indigo-50 pt-2">Original Post</span>
            </div>
          )}

          {displayedMessages.length === 0 && <div className="text-center py-20 text-slate-400 uppercase text-xs font-black tracking-widest">No Messages</div>}
          
          {displayedMessages.map(m => {
            const isMe = m.sender_id === profile.id;
            const replyCount = messages.filter(r => r.parent_id === m.id).length;

            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative`}>
{!isMe && (
                  <button 
                    onClick={() => {
                       const targetUser = systemUsers.find(u => u.id === m.sender_id);
                       if (targetUser) onViewProctor(targetUser);
                    }}
                    className="text-[10px] font-black text-slate-700 uppercase mb-1 ml-1 flex items-center gap-1 hover:text-indigo-600 transition-colors cursor-pointer group/name text-left"
                    title="View Profile Dashboard"
                  >
                    <User size={10} className="opacity-50 group-hover/name:opacity-100 transition-opacity" />
                    {m.sender_name} 
                    <span className="text-[8px] text-slate-400 font-bold group-hover/name:text-indigo-400 transition-colors">({m.sender_role})</span>
                  </button>
                )}
                <div className="flex items-center gap-2 max-w-[90%]">
                  {isMe && (
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                      <button onClick={() => { setEditingId(m.id); setText(m.text); inputRef.current?.focus(); }} className="p-1.5 text-slate-400 hover:text-blue-500 bg-white rounded-lg border shadow-sm"><Edit2 size={12}/></button>
                      <button onClick={async () => { if(window.confirm("Delete?")) await supabase.from('messages').delete().eq('id', m.id); }} className="p-1.5 text-slate-400 hover:text-rose-500 bg-white rounded-lg border shadow-sm"><Trash2 size={12}/></button>
                    </div>
                  )}
                  <div className={`p-4 rounded-3xl shadow-sm relative ${isMe ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border-2 text-slate-800 rounded-tl-sm'}`}>
                    <p className="text-xs md:text-sm font-bold leading-relaxed">{m.text}</p>
                    {m.is_edited && <span className="text-[7px] italic opacity-50 block text-right mt-1">Edited</span>}
                  </div>
                  {!isMe && !activeThread && (
                    <button onClick={() => setActiveThread(m)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-indigo-600 bg-white rounded-full border shadow-sm transition-opacity" title="Reply in Thread"><Reply size={14}/></button>
                  )}
                </div>
                <div className="flex gap-2 items-center mt-1 px-1">
                   <span className="text-[8px] font-black text-slate-400 uppercase">{formatRelativeTime(m.created_at)}</span>
                   {!activeThread && replyCount > 0 && (
                     <button onClick={() => setActiveThread(m)} className="text-[8px] font-black text-indigo-500 hover:text-indigo-700 uppercase cursor-pointer">
                        {replyCount} {replyCount === 1 ? 'Reply' : 'Replies'}
                     </button>
                   )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      )}

    {chatMode === 'directory' && !activeThread && (
        <div className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar flex flex-col">
          <div className="p-4 border-b bg-white sticky top-0"><input type="text" placeholder="Search staff..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-black text-xs border-2 outline-none focus:border-indigo-500 transition-all"/></div>
          {[...systemUsers].sort((a, b) => {
            const aMsgs = messages.filter(m => (m.sender_id === a.id && m.receiver_id === profile.id) || (m.sender_id === profile.id && m.receiver_id === a.id));
            const bMsgs = messages.filter(m => (m.sender_id === b.id && m.receiver_id === profile.id) || (m.sender_id === profile.id && m.receiver_id === b.id));
            const aLatest = aMsgs.length > 0 ? new Date(aMsgs[aMsgs.length - 1].created_at).getTime() : 0;
            const bLatest = bMsgs.length > 0 ? new Date(bMsgs[bMsgs.length - 1].created_at).getTime() : 0;
            return bLatest - aLatest || (a.full_name || "").localeCompare(b.full_name || "");
          }).filter(u => u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())).map(u => ( 
            <div key={u.id} className="w-full text-left p-5 bg-white hover:bg-indigo-50 border-b flex justify-between items-center group transition-all">
              <div><h4 className="text-xs font-black uppercase text-slate-900 group-hover:text-indigo-600 transition-colors">{u.full_name}</h4><span className="text-[8px] font-black uppercase text-slate-400">{u.role}</span></div>
              <div className="flex gap-2 items-center">
                 {unreadDMs[u.id] > 0 && (
                   <span className="bg-rose-500 text-white text-[8px] font-black px-2 py-1 rounded-full mr-2 shadow-sm animate-pulse">
                     {unreadDMs[u.id]} NEW
                   </span>
                 )}
                 <button onClick={() => onViewProctor(u)} className="p-3 bg-slate-100 rounded-xl hover:bg-blue-500 hover:text-white text-slate-400 transition-all" title="View Dashboard"><LayoutDashboard size={16}/></button>
               <button onClick={() => { 
                    setDmTarget(u); 
                    setChatMode('dm'); 
                    setUnreadDMs(prev => ({...prev, [u.id]: 0})); 
                    localStorage.setItem(`last_read_dm_${profile.id}_${u.id}`, new Date().toISOString());
                 }} className="p-3 bg-slate-100 rounded-xl hover:bg-indigo-500 hover:text-white text-slate-400 transition-all" title="Send Message">
                    <MessageSquare size={16}/>
                 </button>  
              </div>
            </div>
          ))}
        </div>
      )}

      {chatMode !== 'directory' && (
        <div className="p-4 bg-white border-t-2">
          {editingId && <div className="flex justify-between items-center mb-2 px-4 py-2 bg-amber-50 rounded-xl border border-amber-200"><span className="text-[9px] font-black text-amber-600 uppercase italic">Editing Message...</span><button onClick={() => { setEditingId(null); setText(""); }}><X size={12} className="text-amber-600"/></button></div>}
          <form onSubmit={handleSend} className="flex items-center gap-2 bg-slate-50 p-2 rounded-[2rem] border-2 focus-within:border-indigo-500 transition-colors">
            <input ref={inputRef} type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder={activeThread ? "Reply to thread..." : "Type a message..."} className="flex-1 bg-transparent border-none outline-none px-4 text-xs font-bold text-slate-800"/>
            <button type="submit" disabled={!text.trim()} className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-500 disabled:opacity-50 transition-all active:scale-95"><Send size={16} /></button>
          </form>
        </div>
      )}
    </div>
  );
};

// --- SMART HELP CENTER (ROLE-AWARE FAQ) ---
const HelpCenter = ({ role, onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const getFaqContent = () => {
    if (role === 'HEAD_ADMIN') {
      return [
        { q: "How does the University & Branch system work?", a: "Your system is securely locked to your University name. When adding a Department, you specify a 'Branch / Location' (e.g., Muzon vs Kaypian). The dashboard automatically groups your departments by location, allowing one Head Admin to oversee multiple branches seamlessly." },
        { q: "How do I set up a new Department?", a: "Click the '+ Add Department' button. You must then manually create the Department Head account and permanently assign them to that specific department card." },
        { q: "Can I manually remove a scheduled block?", a: "Yes. As a Head Admin, you have full global override powers to remove any scheduled block. However, you must provide a mandatory audit note, and the system will trigger a global re-validation." },
        { q: "How are subjects distributed across exam days?", a: "The system automatically splits subjects evenly across the chosen days. Each day's subjects for a year level form one continuous, back-to-back block (e.g., 3 subjects = 3 consecutive hours)." },
        { q: "What are the rules for sections of the same year level?", a: "Hard constraint: All sections of the same year level within a department must take the exact same subjects, in the exact same order, on the exact same day and time block to prevent answer leakage." },
        { q: "What is the Global Resource Monitor?", a: "It is a live, master calendar showing all scheduled exam sessions across the entire university. Proctors can view it read-only, but you have full system-wide access to manage it." }
      ];
    } else if (role === 'DEPT_ADMIN') {
      return [
        { q: "Can I manage proctors for other departments?", a: "No. Your power is scoped only to your assigned department card. You create and manage proctors exclusively for your own department pool." },
        { q: "How do I handle a Proctor's emergency flag?", a: "In the preview timeline, their assignment will be highlighted in orange. It does not automatically remove them. You must review the note and manually switch the proctor." },
        { q: "How does Proctor Switching work?", a: "Click any specific subject hour. You can swap the proctor from your Department Pool or the Global Pool, provided they have logged availability and no overlapping assignments for that day." },
        { q: "What is Reliever Logic?", a: "During a manual proctor switch, if your chosen substitute proctor already has an exam, the system auto-detects the conflict and offers a 'Find Reliever' button to safely re-assign their original slot." },
        { q: "Can I manually switch rooms?", a: "Yes, but strictly within the same year level and department. Cross-department room swaps are blocked to prevent accidental global conflicts. Consecutive room preferences are automatically reapplied." },
        { q: "Why won't the system let me save a manual change?", a: "The Re-Validation Engine runs after every manual action. If a hard constraint is violated, the slot turns red and saving is blocked until you resolve the conflict." }
      ];
    } else {
      // PROCTOR
      return [
        { q: "How do I log my availability?", a: "Use your Log Book to add exact date and time windows (e.g., '04/10/2026 from 09:00 AM - 01:00 PM'). This instantly syncs to your Dept Head as the single source of truth." },
        { q: "What if I have an emergency on exam day?", a: "Click the 'Flag for Emergency' button on your slot and leave a required note (e.g., 'Medical emergency'). This turns the block orange on the master timeline and alerts your Admins immediately." },
        { q: "Why was I only assigned to one session today?", a: "By default, the system enforces a strict 'one-session-per-day' rule for proctors. You will not receive multiple blocks unless an Admin manually reactivates you for another slot." },
        { q: "Can I edit other schedules on the Global Resource Monitor?", a: "No, it is strictly a read-only view for your context. You can see the full university schedule, but you cannot edit anything outside your own assignments." }
      ];
    }
  };

  const faqs = getFaqContent();
  
  // Filter logic: checks if the search query matches the question OR the answer
  const filteredFaqs = faqs.filter(faq => 
    faq.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
    faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[400px] max-w-full bg-slate-50 shadow-[0_0_100px_rgba(0,0,0,0.3)] z-[200] flex flex-col animate-in slide-in-from-right-full duration-500 border-l-[8px] border-emerald-500">
      <div className="bg-slate-900 p-6 md:p-10 flex justify-between items-center text-white">
        <div>
          <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
            <HelpCircle className="text-emerald-500" size={24} /> Smart <span className="text-emerald-500 italic">Help</span>
          </h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Support: {role || 'USER'}</p>
        </div>
        <button onClick={onClose} className="bg-white/10 p-3 rounded-2xl hover:bg-rose-500 transition-all active:scale-95"><X size={20}/></button>
      </div>
      
      {/* SEARCH BAR SECTION */}
      <div className="p-4 md:px-8 md:pt-8 bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search guides, rules, or logic..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white p-4 pl-12 rounded-[2rem] font-black text-xs border-2 border-slate-100 outline-none focus:border-emerald-500 transition-colors shadow-sm text-slate-800"
          />
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 bg-slate-100 p-1 rounded-full transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:px-8 pb-8 space-y-4 custom-scrollbar bg-slate-50">
        
        {/* Hide the welcome banner if the user is actively searching */}
        {!searchQuery && (
          <div className="bg-emerald-50 text-emerald-800 p-6 rounded-[2rem] border-2 border-emerald-100 mb-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest mb-2">Accord Pro Guide</p>
            <p className="text-xs font-bold leading-relaxed">Welcome to your personalized help center. These guides are dynamically tailored to your specific access level and database constraints.</p>
          </div>
        )}

        {filteredFaqs.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-[2rem]">
             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">No matching guides found</p>
          </div>
        ) : (
          filteredFaqs.map((faq, i) => (
            <div key={i} className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm hover:border-emerald-200 transition-all group cursor-default">
              <h4 className="text-xs font-black text-slate-900 mb-3 leading-snug group-hover:text-emerald-600 transition-colors">{faq.q}</h4>
              <p className="text-[10px] font-bold text-slate-500 leading-relaxed">{faq.a}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// --- NOTIFICATION PANEL (ACCORD STYLED) ---
const NotificationPanel = ({ notifications, onClose, onNotificationClick }) => {
  const unread = notifications.filter(n => !n.is_read).length;
  
  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[400px] max-w-full bg-slate-50 shadow-[0_0_100px_rgba(0,0,0,0.3)] z-[200] flex flex-col animate-in slide-in-from-right-full duration-500 border-l-[8px] border-blue-600">
      <div className="bg-slate-900 p-6 md:p-10 flex justify-between items-center text-white">
        <div>
          <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
            <Bell className="text-blue-500" size={24} /> Action <span className="text-blue-500 italic">Logs</span>
          </h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">{unread} Unread Alerts</p>
        </div>
        <button onClick={onClose} className="bg-white/10 p-3 rounded-2xl hover:bg-rose-500 transition-all active:scale-95"><X size={20}/></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 custom-scrollbar">
        {notifications.length === 0 && <div className="text-center py-20 text-slate-400 font-black uppercase text-xs tracking-widest">System Quiet</div>}
        {notifications.map(n => (
          <div key={n.id} onClick={() => onNotificationClick(n)} className={`p-5 md:p-6 rounded-[2rem] border-2 cursor-pointer transition-all ${n.is_read ? 'bg-white border-slate-100 opacity-60' : n.type === 'urgent' ? 'bg-rose-50 border-rose-200 shadow-md hover:border-rose-400 hover:shadow-lg' : 'bg-white border-blue-200 shadow-lg hover:border-blue-400 hover:-translate-y-1'}`}>
            <div className="flex justify-between items-start mb-3">
               <h4 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${n.type === 'urgent' ? 'text-rose-600' : 'text-blue-600'}`}>
                 {n.type === 'urgent' && <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"/>}
                 {!n.is_read && n.type !== 'urgent' && <div className="w-2 h-2 rounded-full bg-blue-500"/>}
                 {n.title}
               </h4>
               <span className="text-[8px] font-black text-slate-400 uppercase">{new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true})}</span>
            </div>
            <p className="text-xs font-bold text-slate-700 leading-relaxed">{n.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- 1. USER REGISTRY COMPONENT ---
const UserRegistry = ({ profiles, highlightTarget, onBlock, onDelete, onCreate, onEdit, onApprove, currentRole, currentUserDept, onView }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterScope, setFilterScope] = useState("ALL");
  const [sortMode, setSortMode] = useState("NEWEST");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const isHead = currentRole === 'HEAD_ADMIN';

  // Auto-fill the search bar when a notification routes here
  useEffect(() => {
    if (highlightTarget) setSearchTerm(highlightTarget);
  }, [highlightTarget]);

  let filteredProfiles = profiles.filter(p => 
    (p.full_name || p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Apply Scope Filter
  if (filterScope === 'DEPT' && currentUserDept) {
     filteredProfiles = filteredProfiles.filter(p => p.assigned_dept === currentUserDept);
  }

  // Apply Sorting Logic
  filteredProfiles.sort((a, b) => {
     if (sortMode === 'A-Z') return (a.full_name || a.name || "").localeCompare(b.full_name || b.name || "");
     if (sortMode === 'Z-A') return (b.full_name || b.name || "").localeCompare(a.full_name || a.name || "");
     const dateA = new Date(a.created_at || 0).getTime();
     const dateB = new Date(b.created_at || 0).getTime();
     if (sortMode === 'NEWEST') return dateB - dateA;
     if (sortMode === 'OLDEST') return dateA - dateB;
     return 0;
  });

  const formatJoinDate = (dateStr) => {
     if (!dateStr) return "Date Unknown";
     return new Date(dateStr).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const sortOptions = [
    { id: 'NEWEST', label: 'Newest First' },
    { id: 'OLDEST', label: 'Oldest First' },
    { id: 'A-Z', label: 'A-Z Sort' },
    { id: 'Z-A', label: 'Z-A Sort' }
  ];

  return (
    <div className="bg-white border-2 border-slate-100 rounded-3xl md:rounded-[3rem] overflow-hidden shadow-2xl mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="bg-slate-900 p-6 md:p-10 flex flex-col md:flex-row justify-between items-start md:items-center border-b-8 border-blue-600 gap-4 md:gap-0">
        <div>
          <h3 className="text-white text-xl md:text-3xl font-black uppercase tracking-tighter flex items-center gap-2 md:gap-3">
            <Shield className="text-blue-500" size={24} /> System <span className="text-blue-500 italic">Registry</span>
          </h3>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
            Global Staff Directory
          </p>
        </div>
        <button 
          onClick={onCreate}
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-4 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <UserPlus size={18} /> {isHead ? 'Create Dept Head' : 'Create Proctor'}
        </button>
      </div>

      <div className="p-4 md:p-8">
        <div className="flex flex-col md:flex-row gap-3 mb-6 relative z-10">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search staff by name or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 p-4 pl-12 rounded-2xl font-black text-[10px] md:text-xs border-2 border-slate-100 outline-none focus:border-blue-500 transition-all"
            />
          </div>
          
          <div className="flex gap-2 relative z-20">
            <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-1 flex">
               <button onClick={() => setFilterScope('ALL')} className={`px-4 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${filterScope === 'ALL' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>Global</button>
               <button onClick={() => setFilterScope('DEPT')} className={`px-4 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${filterScope === 'DEPT' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>My Dept</button>
            </div>
            
            {/* CUSTOM DROPDOWN UI */}
            <div className="relative">
              <button 
                onClick={() => setIsSortOpen(!isSortOpen)} 
                className={`flex items-center justify-between gap-3 bg-slate-50 border-2 rounded-2xl p-3 min-w-[130px] transition-all active:scale-95 h-full ${isSortOpen ? 'border-blue-500 text-blue-600' : 'border-slate-100 text-slate-600 hover:border-slate-200'}`}
              >
                <span className="text-[9px] font-black uppercase tracking-widest mt-0.5">
                  {sortOptions.find(o => o.id === sortMode)?.label}
                </span>
                <ChevronDown size={14} className={`transition-transform duration-300 ${isSortOpen ? 'rotate-180 text-blue-500' : 'text-slate-400'}`} />
              </button>

              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)}></div>
                  <div className="absolute top-full right-0 mt-2 w-full min-w-[140px] bg-white border-2 border-slate-100 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {sortOptions.map(opt => (
                      <button 
                        key={opt.id}
                        onClick={() => { setSortMode(opt.id); setIsSortOpen(false); }}
                        className={`w-full text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-all hover:bg-blue-50 hover:text-blue-600 ${sortMode === opt.id ? 'bg-blue-50 text-blue-600' : 'text-slate-500'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {searchTerm && filteredProfiles.length === 0 && (
          <div className="p-10 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] mb-4">
             <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">No matching accounts found.</p>
          </div>
        )}
        
        {/* MOBILE CARD VIEW */}
        <div className="md:hidden space-y-4 mb-4 relative z-0">
          {filteredProfiles.map(p => (
             <div key={p.id} className={`bg-slate-50 p-5 rounded-[2rem] border-2 border-slate-100 ${p.status === 'ARCHIVED' || p.status === 'BLOCKED' ? 'opacity-40 grayscale' : ''}`}>
                 <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-black text-slate-900 uppercase text-sm">{p.full_name || p.name}</p>
                      <p className="text-[10px] font-bold text-slate-400">{p.email}</p>
                      <p className="text-[8px] font-black text-slate-400 uppercase mt-1">Joined: {formatJoinDate(p.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${p.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : p.status === 'PENDING' ? 'bg-amber-500 animate-bounce' : 'bg-rose-500'}`} />
                    </div>
                 </div>
                 <div className="flex justify-between items-center mb-5 bg-white p-3 rounded-xl border border-slate-100">
                     <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg border-2 ${p.role?.trim().toUpperCase() === 'HEAD_ADMIN' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-900 border-slate-200'}`}>{p.role}</span>
                     <span className="font-black text-[9px] text-blue-600 uppercase italic">
                        {!p.assigned_dept || p.assigned_dept === 'GLOBAL' ? "GLOBAL POOL" : `${p.assigned_dept}`}
                      </span>
                 </div>
                 <div className="flex flex-wrap justify-end gap-2 pt-4 border-t-2 border-slate-100/50">
                    {p.status === 'PENDING' && (isHead || p.assigned_dept === currentUserDept) && (
                      <button onClick={() => onApprove(p.id)} className="flex-1 p-3 bg-white hover:bg-emerald-500 hover:text-white rounded-xl border-2 border-emerald-100 transition-all text-emerald-500 shadow-sm flex justify-center"><CheckCircle2 size={16} /></button>
                    )}
                    {p.role?.trim().toUpperCase() === 'PROCTOR' && p.status === 'ACTIVE' && (
                      <button onClick={() => onView(p)} className="flex-1 p-3 bg-white hover:bg-blue-600 hover:text-white rounded-xl border-2 border-slate-100 transition-all text-slate-400 flex justify-center"><LayoutDashboard size={16} /></button>
                    )}
                    {(isHead || p.assigned_dept === currentUserDept) && (
                      <>
                        <button onClick={() => onEdit(p)} className="flex-1 p-3 bg-white hover:bg-indigo-600 hover:text-white rounded-xl border-2 border-slate-100 transition-all text-slate-400 flex justify-center"><Edit2 size={16} /></button>
                        <button onClick={() => onBlock(p.id, p.status)} className="flex-1 p-3 bg-white hover:bg-orange-500 hover:text-white rounded-xl border-2 border-slate-100 transition-all text-slate-400 flex justify-center"><Lock size={16} /></button>
                        <button onClick={() => onDelete(p.id)} className="flex-1 p-3 bg-white hover:bg-rose-600 hover:text-white rounded-xl border-2 border-slate-100 transition-all text-slate-400 flex justify-center"><Trash2 size={16} /></button>
                      </>
                    )}
                 </div>
             </div>
          ))}
        </div>

        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto custom-scrollbar relative z-0">
          <table className="w-full text-left border-separate border-spacing-y-3 min-w-[800px]">
            <thead>
              <tr className="text-[10px] font-black uppercase text-slate-400">
                <th className="px-6 py-4">User Identity</th>
                <th className="px-6 py-4">Access Level</th>
                <th className="px-6 py-4">Assignment</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map(p => (
                <tr key={p.id} className={`group transition-all ${p.status === 'ARCHIVED' || p.status === 'BLOCKED' ? 'opacity-40 grayscale' : ''}`}>
                  <td className="bg-slate-50 p-6 rounded-l-[2rem] border-y-2 border-l-2 border-slate-100">
                    <p className="font-black text-slate-900 uppercase text-sm">{p.full_name || p.name}</p>
                    <p className="text-[10px] font-bold text-slate-400">{p.email}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Joined: {formatJoinDate(p.created_at)}</p>
                  </td>
                  <td className="bg-slate-50 p-6 border-y-2 border-slate-100">
                    <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg border-2 ${p.role?.trim().toUpperCase() === 'HEAD_ADMIN' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-900 border-slate-200'}`}>
                      {p.role}
                    </span>
                  </td>
                 <td className="bg-slate-50 p-6 border-y-2 border-slate-100 font-black text-[10px] text-blue-600 uppercase italic">
                    {!p.assigned_dept || p.assigned_dept === 'GLOBAL' ? "GLOBAL POOL" : `${p.assigned_dept} DEPARTMENT`}
                  </td>
                  <td className="bg-slate-50 p-6 border-y-2 border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${p.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : p.status === 'PENDING' ? 'bg-amber-500 animate-bounce' : 'bg-rose-500'}`} />
                      <span className="text-[10px] font-black uppercase">{p.status}</span>
                    </div>
                  </td>
                  <td className="bg-slate-50 p-6 rounded-r-[2rem] border-y-2 border-r-2 border-slate-100 text-right">
                    <div className="flex justify-end gap-2">
                      {p.status === 'PENDING' && (isHead || p.assigned_dept === currentUserDept) && (
                        <button onClick={() => onApprove(p.id)} className="p-3 bg-white hover:bg-emerald-500 hover:text-white rounded-xl border-2 border-emerald-100 transition-all text-emerald-500 shadow-sm" title="Approve Request"><CheckCircle2 size={16} /></button>
                      )}
                      {p.role?.trim().toUpperCase() === 'PROCTOR' && p.status === 'ACTIVE' && (
                        <button onClick={() => onView(p)} className="p-3 bg-white hover:bg-blue-600 hover:text-white rounded-xl border-2 border-slate-100 transition-all text-slate-400" title="View Dashboard"><LayoutDashboard size={16} /></button>
                      )}
                      {(isHead || p.assigned_dept === currentUserDept) && (
                        <>
                          <button onClick={() => onEdit(p)} className="p-3 bg-white hover:bg-indigo-600 hover:text-white rounded-xl border-2 border-slate-100 transition-all text-slate-400" title="Edit Account Details"><Edit2 size={16} /></button>
                          <button onClick={() => onBlock(p.id, p.status)} className="p-3 bg-white hover:bg-orange-500 hover:text-white rounded-xl border-2 border-slate-100 transition-all text-slate-400" title={p.status === 'ACTIVE' ? 'Block User' : 'Unblock User'}><Lock size={16} /></button>
                          <button onClick={() => onDelete(p.id)} className="p-3 bg-white hover:bg-rose-600 hover:text-white rounded-xl border-2 border-slate-100 transition-all text-slate-400" title="Delete User"><Trash2 size={16} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

      
// --- 2. AVAILABILITY LOG BOOK COMPONENT ---
const AvailabilityLogBook = ({ profile, globalAvailability, onAdd, onBulkAdd, onDelete, readOnly = false, showToast, isHighlighted }) => {
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [logView, setLogView] = useState('upcoming');
  const fileInputRef = useRef(null);

  const now = new Date();
  const todayString = now.toISOString().split('T')[0];
  const currentTimeStr = now.toTimeString().substring(0, 5);

  const isPast = (d, eTime) => {
    if (!d) return false;
    if (d < todayString) return true;
    if (d === todayString && eTime < currentTimeStr) return true;
    return false;
  };

  const myAvails = globalAvailability.filter(a => a.proctor_id === profile.id);
  const displayedAvails = logView === 'upcoming' 
    ? myAvails.filter(a => !isPast(a.exam_date, a.end_time)) 
    : myAvails.filter(a => isPast(a.exam_date, a.end_time));
 
    const handleSubmit = () => {
    if (!date || !start || !end) return showToast ? showToast("Please fill in all fields.", "error") : alert("Please fill in all fields.");
    const formattedStart = start.length === 5 ? `${start}:00` : start;
    const formattedEnd = end.length === 5 ? `${end}:00` : end;

    onAdd({ 
      proctor_id: profile.id,         
      proctor_name: profile.full_name,
      dept_code: profile.assigned_dept,
      exam_date: date,                
      start_time: formattedStart,     
      end_time: formattedEnd,         
      is_emergency_flag: false,       
      note: "Standard Log",
      university: profile.university // <-- FIX: STAMP ADDED HERE
    });
    
    setDate(""); setStart(""); setEnd("");
    if (showToast) showToast("Availability logged successfully!");
  };

  const handleDownloadTemplate = () => {
    const csvContent = "Date (YYYY-MM-DD),Start Time (HH:MM AM/PM),End Time (HH:MM AM/PM)\n2026-05-01,08:00 AM,12:00 PM\n2026-05-02,01:00 PM,05:00 PM";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Accord_Availability_Template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
       const text = event.target.result;
       const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
       
       if (lines.length <= 1) return showToast ? showToast("File is empty or only contains headers.", "error") : alert("File is empty or only contains headers.");
       
       const bulkData = [];
       let errors = 0;

       // --- BULLETPROOF EXCEL DATA PARSERS ---
       const parseTimeTo24H = (timeStr) => {
          let t = String(timeStr).replace(/['"]/g, '').trim();
          
          const ampmMatch = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/i);
          if (ampmMatch) {
             let hour = parseInt(ampmMatch[1], 10);
             const min = ampmMatch[2];
             const modifier = ampmMatch[3].toUpperCase();
             if (modifier === 'PM' && hour < 12) hour += 12;
             if (modifier === 'AM' && hour === 12) hour = 0;
             return `${String(hour).padStart(2, '0')}:${min}:00`;
          }
          
          const standardMatch = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
          if (standardMatch) {
             const hour = String(standardMatch[1]).padStart(2, '0');
             const min = standardMatch[2];
             const sec = standardMatch[3] || '00';
             return `${hour}:${min}:${sec}`;
          }
          
          return t; 
       };

       const parseDateToYYYYMMDD = (dateStr) => {
            let d = String(dateStr).replace(/['"]/g, '').trim();
            const slashMatch = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
            if (slashMatch) {
                const month = String(slashMatch[1]).padStart(2, '0');
                const day = String(slashMatch[2]).padStart(2, '0');
                let year = slashMatch[3];
                if (year.length === 2) year = `20${year}`; 
                return `${year}-${month}-${day}`;
            }
            return d; 
       };

       for(let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c ? c.trim() : '');
          if (cols.length >= 3) {
             const examDate = parseDateToYYYYMMDD(cols[0]);
             const startTime = parseTimeTo24H(cols[1]);
             const endTime = parseTimeTo24H(cols[2]);
             
            if (examDate && startTime && endTime && startTime.includes(':') && endTime.includes(':')) {
               bulkData.push({
                  proctor_id: profile.id,         
                  proctor_name: profile.full_name,
                  dept_code: profile.assigned_dept,
                  exam_date: examDate,                
                  start_time: startTime,     
                  end_time: endTime,         
                  is_emergency_flag: false,       
                  note: "Bulk Excel Import",
                  university: profile.university // <-- FIX: STAMP ADDED HERE
               });
             } else {
               errors++;
             }
          }
       }

       if (bulkData.length > 0) {
          if (onBulkAdd) onBulkAdd(bulkData);
          if (showToast) showToast(`Successfully parsed ${bulkData.length} availability slots! ${errors > 0 ? `(${errors} rows skipped)` : ''}`);
          else alert(`Successfully parsed ${bulkData.length} availability slots! ${errors > 0 ? `(${errors} rows had errors and were skipped)` : ''}`);
       } else {
          if (showToast) showToast("No valid data found. Please follow the template exactly.", "error");
          else alert("No valid data found. Please make sure you followed the template exactly.");
       }
    };
    reader.readAsText(file);
    e.target.value = null; 
  };

return (
    <div className={`rounded-3xl md:rounded-[3rem] p-6 md:p-8 shadow-xl transition-all duration-700 ${isHighlighted ? 'border-4 border-blue-500 bg-blue-100 scale-105 z-10 relative shadow-blue-300' : 'bg-white border-2 border-slate-100'}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 mb-6">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <List size={16} className="text-blue-600"/> {readOnly ? 'Logged Availability' : 'Availability Log Book'}
          </h2>
          <div className="flex bg-slate-100/50 border border-slate-200 p-1 rounded-lg">
              <button onClick={() => setLogView('upcoming')} className={`px-3 py-1 text-[8px] font-black uppercase rounded transition-all ${logView === 'upcoming' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>Active</button>
              <button onClick={() => setLogView('history')} className={`px-3 py-1 text-[8px] font-black uppercase rounded transition-all ${logView === 'history' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>History</button>
          </div>
        </div>
        
        {!readOnly && logView === 'upcoming' && (
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button onClick={handleDownloadTemplate} className="flex-1 md:flex-none text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-4 py-2.5 rounded-xl hover:bg-emerald-100 transition-all active:scale-95 flex items-center justify-center gap-2 border border-emerald-200">
              <Download size={14}/> Excel Template
            </button>
            <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="flex-1 md:flex-none text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-4 py-2.5 rounded-xl hover:bg-blue-100 transition-all active:scale-95 flex items-center justify-center gap-2 border border-blue-200 shadow-sm">
              <Upload size={14}/> Bulk Upload
            </button>
          </div>
        )}
      </div>
      
      {!readOnly && (
        <div className="bg-slate-50 rounded-3xl p-4 md:p-6 border-2 border-slate-100 mb-8 flex flex-col md:flex-row gap-4 items-end">
         <div className="w-full md:flex-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-2 mb-1 block">Date</label>
            <input type="date" min={todayString} value={date} onChange={e=>setDate(e.target.value)} className="w-full bg-white p-4 rounded-2xl font-black text-xs border border-slate-200 outline-none focus:border-blue-500" />
          </div>
          <div className="w-full md:flex-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-2 mb-1 block">Start Time</label>
            <input type="time" value={start} onChange={e=>setStart(e.target.value)} className="w-full bg-white p-4 rounded-2xl font-black text-xs border border-slate-200 outline-none focus:border-blue-500" />
          </div>
          <div className="w-full md:flex-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-2 mb-1 block">End Time</label>
            <input type="time" value={end} onChange={e=>setEnd(e.target.value)} className="w-full bg-white p-4 rounded-2xl font-black text-xs border border-slate-200 outline-none focus:border-blue-500" />
          </div>
          <button onClick={handleSubmit} className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg hover:bg-blue-500 transition-all active:scale-95 w-full md:w-auto flex justify-center">
            <Plus size={20} />
          </button>
        </div>
      )}

     <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
        {displayedAvails.length === 0 ? (
           <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-3xl">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{logView === 'history' ? 'No Past Records' : 'No Active Availability'}</p>
           </div>
        ) : displayedAvails.map(avail => (
          <div key={avail.id} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm group">
            <div className="flex items-center gap-4">
              <div className="bg-blue-50 text-blue-600 p-3 rounded-xl"><Calendar size={18} /></div>
              <div>
                <p className="font-black text-sm text-slate-900">{avail.exam_date}</p>
                <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock size={10}/> {formatTime(avail.start_time)} - {formatTime(avail.end_time)}</p>
              </div>
            </div>
            {!readOnly && (
              <button onClick={() => { onDelete(avail.id); if (showToast) showToast("Availability record removed."); }} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- 3. PROCTOR DASHBOARD ---
const ProctorDashboard = ({ profile, globalSchedule, allExamDates, globalAvailability, onAddAvailability, onBulkAddAvailability, onDeleteAvailability, isViewMode, onCloseView, notifications, onShowNotify, onFlagIssue, onDeclineAssignment, onAcceptAssignment, onShowHelp, onShowChat, allProfiles, onViewProctor, onEditProfile, highlightTarget, unreadMessageCount }) => {
const [dashboardView, setDashboardView] = useState('upcoming');

  useEffect(() => {
    if (highlightTarget === 'availability-log') {
      setTimeout(() => document.getElementById('availability-log-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 400);
    }
  }, [highlightTarget]);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentTimeStr = now.toTimeString().substring(0, 5);

  const isPast = (date, endTime) => {
     if (!date) return false;
     if (date < todayStr) return true;
     if (date === todayStr && endTime < currentTimeStr) return true;
     return false;
  };

  const mySchedule = globalSchedule.filter(s => s.proctor === profile.full_name);
  
  const pendingRequests = [];
  const confirmedAssignments = [];
  const historyAssignments = [];

  mySchedule.forEach(s => {
    const isVerified = globalAvailability.some(a => a.proctor_id === profile.id && a.exam_date === s.exam_date && (s.start_time < a.end_time && s.end_time > a.start_time));
    
    if (isPast(s.exam_date, s.end_time)) {
      historyAssignments.push(s);
    } else {
      if (!isVerified && !s.flagged && !isViewMode) {
        pendingRequests.push(s);
      } else {
        confirmedAssignments.push(s);
      }
    }
  });
  
  const [flagModal, setFlagModal] = useState({ isOpen: false, scheduleId: null, subjectCode: '', deptCode: '', note: '' });
  const [declineModal, setDeclineModal] = useState({ isOpen: false, scheduleId: null, subjectCode: '', deptCode: '', note: '' });
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleExportPDF = () => {
    try {
      if (!confirmedAssignments || confirmedAssignments.length === 0) {
        showToast("You have no confirmed assignments to export!", "error");
        return;
      }
      
      const doc = new jsPDF({ orientation: 'landscape' });
      const proctorName = profile?.full_name || 'Staff';
      const titleText = `Official Proctor Itinerary: ${proctorName}`;

      // 1. UPDATED LETTERHEAD FUNCTION
      const drawLetterhead = (data) => {
        if (!doc.headerPrintedPages) doc.headerPrintedPages = new Set();
        if (doc.headerPrintedPages.has(data.pageNumber)) return;
        doc.headerPrintedPages.add(data.pageNumber);

        // Logo
        doc.addImage(accordLogo, 'PNG', 14, 12, 12, 12);

        // "ACCORD PRO" Official System Font (Bold & Italic)
        doc.setFont("helvetica", "bolditalic");
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42); // Slate 900
        doc.text("ACCORD", 30, 20);
        
        // Dynamically calculate width so "PRO" sits perfectly next to it
        const accordWidth = doc.getTextWidth("ACCORD ");
        doc.setTextColor(37, 99, 235); // Accord Blue
        doc.text("PRO", 30 + accordWidth, 20);

        // Clean Subtitle (Removed the pipe character, made it uppercase & bold)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // Slate 500
        doc.text(titleText.toUpperCase(), 30, 26);

        // Enhanced Blue Divider Line
        doc.setDrawColor(37, 99, 235); 
        doc.setLineWidth(0.5);
        doc.line(14, 32, doc.internal.pageSize.getWidth() - 14, 32);
      };

      let currentY = 40; // Shifted down to account for the new header

      const groupedData = {};
      const sorted = [...confirmedAssignments].sort((a, b) => new Date(a.exam_date || 0) - new Date(b.exam_date || 0) || (a.start_time || "").localeCompare(b.start_time || ""));

      sorted.forEach(item => {
        const date = item.exam_date || "N/A";
        if (!groupedData[date]) groupedData[date] = [];
        groupedData[date].push(item);
      });

      Object.keys(groupedData).sort().forEach(date => {
        const items = groupedData[date];

        const tableRows = items.map(item => [
          `${item.start_time ? formatTime(item.start_time) : "--:--"} - ${item.end_time ? formatTime(item.end_time) : "--:--"}`,
          item.dept_code || "N/A",
          item.section || "N/A",
          `${item.subject_code || "N/A"} - ${item.subject_name || "N/A"}`,
          item.room || "N/A"
        ]);

        autoTable(doc, { 
          head: [
            [
              { content: `EXAM DATE: ${date}`, colSpan: 5, styles: { halign: 'center', fillColor: [37, 99, 235], fontStyle: 'bold', fontSize: 11 } }
            ],
            ["Time", "Department", "Section", "Subject", "Room"]
          ],
          body: tableRows, 
          startY: currentY, 
          theme: 'grid', 
          styles: { font: 'helvetica', fontSize: 10, cellPadding: 5 }, 
          headStyles: { font: 'helvetica', fillColor: [15, 23, 42], textColor: [255, 255, 255] },
          // 2. THE FIX FOR MISSING HEADERS: Explicitly reserve the top 40 units of every page!
          margin: { top: 40, bottom: 20 }, 
          pageBreak: 'avoid',
          didDrawPage: drawLetterhead 
        });

        currentY = doc.lastAutoTable.finalY + 15; 
      });

      doc.save(`Accord_Itinerary_${proctorName.replace(/\s+/g, '_')}.pdf`);
      showToast("PDF Itinerary Downloaded!");
    } catch (err) { 
      showToast("SYSTEM ERROR during PDF generation: " + err.message, "error"); 
    }
  };
  
  const handleExportExcel = () => {
    try {
      if (!confirmedAssignments || confirmedAssignments.length === 0) return showToast("No confirmed assignments to export!", "error");
      const headers = ["Date,Time,Department,Subject Code,Subject Name,Section,Room"];
      const sorted = [...confirmedAssignments].sort((a, b) => new Date(a.exam_date || 0) - new Date(b.exam_date || 0) || (a.start_time || "").localeCompare(b.start_time || ""));
      const rows = sorted.map(item => `${item.exam_date || "N/A"},${item.start_time ? formatTime(item.start_time) : "--:--"} - ${item.end_time ? formatTime(item.end_time) : "--:--"},${item.dept_code || "N/A"},${item.subject_code || ""},"${item.subject_name || ""}",${item.section || "N/A"},${item.room || "N/A"}`);
      const csvContent = headers.concat(rows).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Accord_Itinerary_${(profile?.full_name || 'Proctor').replace(/\s+/g, '_')}.csv`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      showToast("Excel Itinerary Downloaded!");
    } catch (err) { showToast("Excel Export Failed: " + err.message, "error"); }
  };

  const proctorDirectory = (allProfiles || []).filter(p => p.role?.trim().toUpperCase() === 'PROCTOR' && p.id !== profile?.id);
  const filteredDirectory = searchQuery.trim() ? proctorDirectory.filter(p => p.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) : [];

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900 relative">
      
      {/* FIXED TOAST UI */}
      {toast && (
        <div className={`fixed bottom-4 md:bottom-10 right-4 md:right-10 z-[400] p-4 md:p-6 rounded-2xl shadow-2xl flex items-center gap-3 md:gap-4 text-white font-black text-[10px] md:text-xs uppercase tracking-widest animate-in slide-in-from-bottom-10 md:slide-in-from-right-10 ${toast.type === 'error' ? 'bg-rose-600' : 'bg-slate-900 border border-blue-500/50'}`}>
          {toast.type === 'error' ? <AlertCircle size={20}/> : <CheckCircle2 size={20} className="text-emerald-400"/>}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-auto"><X size={16} className="opacity-50 hover:opacity-100"/></button>
        </div>
      )}

      <nav className="bg-slate-900 px-4 md:px-8 py-4 md:py-5 mb-6 md:mb-10 flex flex-col md:flex-row justify-between items-center sticky top-0 z-50 shadow-2xl text-white gap-4 md:gap-0">
        <div className="flex items-center gap-3 font-black uppercase tracking-tighter text-lg md:text-xl w-full md:w-auto justify-center md:justify-start">
          <img src={accordLogo} alt="Accord Logo" className="w-8 h-8 md:w-10 md:h-10 object-contain brightness-0 invert drop-shadow-lg opacity-90" />
          ACCORD <span className="text-blue-500 italic">PROCTOR</span>
        </div>

        <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto justify-between md:justify-end">
         <div className="text-left md:text-right mr-auto md:mr-4">
            <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-400">{isViewMode ? 'Viewing Dashboard Of' : 'Logged in as'}</p>
            <div className="flex items-center gap-2 justify-start md:justify-end">
                <p className="text-xs font-bold text-blue-400 uppercase">{profile?.full_name}</p>
                <button onClick={() => onEditProfile && onEditProfile(profile)} className="text-slate-400 hover:text-white bg-white/10 hover:bg-blue-500 p-1.5 rounded-lg transition-all" title="Edit Profile">
                   <Edit2 size={12} />
                </button>
            </div>
            {profile?.assigned_dept && <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mt-1">{profile.assigned_dept} DEPARTMENT</p>}
          </div>
          
          <div className="flex gap-2">
            {!isViewMode && (
              <>
<button onClick={onShowChat} className="bg-white/10 hover:bg-indigo-500 text-white p-2.5 rounded-xl transition-all relative">
                  <MessageSquare size={18} />
                  {unreadMessageCount > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 border-2 border-slate-900 text-[8px] font-black text-white shadow-lg animate-bounce">
                      {unreadMessageCount}
                    </span>
                  )}
                </button>
                <button onClick={onShowHelp} className="bg-white/10 hover:bg-emerald-500 text-white p-2.5 rounded-xl transition-all relative"><HelpCircle size={18} /></button>
                <button onClick={onShowNotify} className="bg-white/10 hover:bg-blue-500 text-white p-2.5 rounded-xl transition-all relative">
                  <Bell size={18} />
                  {notifications?.filter(n => !n.is_read).length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-pulse border-2 border-slate-900"/>}
                </button>
              </>
            )}
            {isViewMode ? (
              <button onClick={onCloseView} className="bg-rose-500 hover:bg-rose-600 text-white px-4 md:px-6 py-2.5 rounded-xl transition-all font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-xl">Close View</button>
            ) : (
              <button onClick={() => supabase.auth.signOut()} className="bg-white/10 hover:bg-rose-500 text-white p-2.5 rounded-xl transition-all"><LogOut size={18} /></button>
            )}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 md:px-6 max-w-7xl">
        {!isViewMode && (
          <div className="bg-white rounded-3xl md:rounded-[2rem] p-4 md:p-5 mb-6 md:mb-8 border-2 border-slate-100 shadow-xl flex flex-col md:flex-row items-center gap-4 relative z-40 animate-in slide-in-from-top-4">
            <div className="flex items-center w-full md:w-auto text-blue-600 gap-2 font-black uppercase text-[10px] tracking-widest px-2"><Search size={18} /> Directory Search</div>
            <div className="relative w-full flex-1">
              <input type="text" placeholder="Search other proctors to view their dashboard..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-black text-xs border-2 border-slate-100 outline-none focus:border-blue-500 transition-all"/>
              {searchQuery && (
                <div className="absolute top-full mt-2 left-0 w-full bg-white border-2 border-slate-100 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar z-50">
                  {filteredDirectory.length > 0 ? filteredDirectory.map(p => (
                    <div key={p.id} onClick={() => { onViewProctor(p); setSearchQuery(""); }} className="p-4 border-b border-slate-50 hover:bg-blue-50 cursor-pointer flex justify-between items-center group transition-all">
                       <div><p className="text-xs font-black text-slate-900 uppercase group-hover:text-blue-600 transition-colors">{p.full_name}</p><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{p.assigned_dept || 'Global System'}</p></div>
                       <button className="bg-blue-100 text-blue-600 p-3 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm"><LayoutDashboard size={14} /></button>
                    </div>
                  )) : (
                    <div className="p-6 text-center border-2 border-dashed border-slate-100 m-2 rounded-xl">
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">"{searchQuery.trim()}" is not a registered account.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
        {isViewMode && (
          <div className="bg-blue-600 text-white rounded-3xl md:rounded-[2rem] p-6 md:p-8 mb-8 md:mb-10 flex flex-col md:flex-row justify-between items-center md:items-start text-center md:text-left shadow-2xl animate-in slide-in-from-top-4 gap-4 md:gap-0">
            <div>
              <h4 className="font-black uppercase tracking-widest text-xs md:text-sm flex items-center justify-center md:justify-start gap-3"><Shield size={20} className="text-blue-300" /> Read-Only Access</h4>
              <p className="text-blue-100 text-[10px] md:text-xs font-bold mt-2 leading-relaxed">You are currently viewing <strong>{profile?.full_name}'s</strong> itinerary and availability logs. <br className="hidden md:block"/>To assign or remove them from an exam, return to the Department Workspace.</p>
            </div>
            <button onClick={onCloseView} className="w-full md:w-auto mt-2 md:mt-0 bg-white text-blue-600 hover:bg-blue-50 px-6 md:px-10 py-3 md:py-4 rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all shadow-xl active:scale-95">Manage in Workspace</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mb-12">
          
          <div className="lg:col-span-1 flex flex-col gap-6">
            
         {/* --- NEW: DEDICATED PENDING REQUESTS SECTION --- */}
            {pendingRequests.length > 0 && (
              <div className="bg-amber-500 border-4 border-amber-600 rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none"></div>
                <h3 className="text-white font-black text-lg uppercase tracking-widest mb-6 flex items-center gap-3 relative z-10">
                  <BellRing size={24} className="animate-pulse"/> Reliever Request ({pendingRequests.length})
                </h3>
                
                <div className="space-y-4 relative z-10">
                  {pendingRequests.map((s, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl shadow-xl relative overflow-hidden border-2 border-amber-100">
                      <div className="mb-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">{s.subject_code}</p>
                        <p className="text-sm font-black truncate text-slate-900">{s.subject_name}</p>
                      </div>
                      
                      <div className="flex flex-wrap items-center bg-amber-50 p-3 rounded-xl gap-4 mb-6 border border-amber-100">
                        <span className="text-[10px] font-black text-amber-700 uppercase flex items-center gap-1.5"><Clock size={12}/> {s.start_time ? formatTime(s.start_time) : ''} - {s.end_time ? formatTime(s.end_time) : ''}</span>
                        <span className="text-[10px] font-black text-amber-700 uppercase flex items-center gap-1.5"><Calendar size={12}/> {s.exam_date}</span>
                        <span className="text-[10px] font-black text-rose-500 uppercase">RM {s.room}</span>
                      </div>

                     <div className="flex gap-3">
                        <button onClick={() => {
                          const fStart = s.start_time.length === 5 ? `${s.start_time}:00` : s.start_time;
                          const fEnd = s.end_time.length === 5 ? `${s.end_time}:00` : s.end_time;
                          onAcceptAssignment(profile.id, profile.full_name, profile.assigned_dept, s.exam_date, fStart, fEnd, s.subject_code);
                          showToast("Request Accepted! Schedule verified.", "success");
                        }} className="flex-[2] bg-emerald-500 hover:bg-emerald-400 text-white font-black text-[11px] uppercase py-4 rounded-xl transition-all shadow-md flex justify-center items-center gap-2"><CheckCircle2 size={16}/> Accept Assignment</button>
                        
                        <button onClick={() => setDeclineModal({ isOpen: true, scheduleId: s.id, subjectCode: s.subject_code, deptCode: s.dept_code, note: '' })} className="flex-1 bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white font-black text-[11px] uppercase py-4 rounded-xl transition-all border border-rose-200 hover:border-transparent flex justify-center items-center gap-2"><X size={16}/> Decline</button>
                      </div> 
                    </div>
                  ))}
                </div>
              </div>
            )}   

          {/* CONFIRMED ASSIGNMENTS SECTION */}
            <div className="bg-slate-900 rounded-3xl md:rounded-[3rem] p-6 md:p-8 text-white shadow-2xl flex flex-col flex-1 max-h-[600px]">
              <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
                <div className="flex items-center gap-3">
                  <h2 className="text-xs md:text-sm font-black uppercase tracking-widest text-blue-400 flex items-center gap-2"><Calendar size={16}/> {dashboardView === 'history' ? 'Past History' : (isViewMode ? "Their Schedule" : "Confirmed Schedule")}</h2>
                  <span className="bg-white/10 px-3 py-1 rounded-full text-[9px] font-black">{dashboardView === 'history' ? historyAssignments.length : confirmedAssignments.length}</span>
                </div>
                <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
                   <button onClick={() => setDashboardView('upcoming')} className={`px-4 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${dashboardView === 'upcoming' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}>Upcoming</button>
                   <button onClick={() => setDashboardView('history')} className={`px-4 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${dashboardView === 'history' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}>History</button>
                </div>
              </div>
              
              <div className="space-y-4 flex-1 overflow-y-auto pr-2 mb-6 custom-scrollbar">
                {(dashboardView === 'upcoming' ? confirmedAssignments : historyAssignments).length === 0 ? (
                  <p className="text-slate-500 text-xs italic text-center py-10 border-2 border-dashed border-white/10 rounded-2xl">{dashboardView === 'history' ? 'No past assignments.' : 'No confirmed assignments.'}</p>
                ) : (dashboardView === 'upcoming' ? confirmedAssignments : historyAssignments).map((s, i) => (
                    <div key={i} className={`p-4 rounded-2xl border transition-all ${s.flagged ? 'bg-rose-500/10 border-rose-500/30' : 'bg-white/5 border-white/10 hover:border-blue-500/50'}`}>
                      <div className="flex justify-between items-start mb-3">
                         <div><p className={`text-[10px] font-black uppercase tracking-widest ${s.flagged ? 'text-rose-400' : 'text-blue-400'}`}>{s.subject_code}</p><p className="text-xs md:text-sm font-bold truncate">{s.subject_name}</p></div>
                         {!isViewMode && !s.flagged && <button onClick={() => setFlagModal({ isOpen: true, scheduleId: s.id, subjectCode: s.subject_code, deptCode: s.dept_code, note: '' })} className="p-2 bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition-all" title="Flag Emergency"><AlertTriangle size={14}/></button>}
                         {s.flagged && <span className="bg-rose-500 text-white px-2 py-1 rounded text-[8px] font-black uppercase animate-pulse">Flagged</span>}
                      </div>
                      {s.flagged && s.flagNote && <div className="mb-3 bg-rose-500/20 border border-rose-500/30 p-3 rounded-xl"><p className="text-[9px] font-black text-rose-300 uppercase mb-1">Emergency Note:</p><p className="text-[10px] md:text-[11px] font-bold text-rose-100 italic">{s.flagNote}</p></div>}
                      <div className="flex flex-wrap md:flex-nowrap justify-between items-center bg-slate-800 p-2.5 rounded-xl gap-2 md:gap-0">
                        <span className="text-[8px] md:text-[9px] font-black text-emerald-400 uppercase flex items-center gap-1"><Clock size={10}/> {s.start_time ? formatTime(s.start_time) : ''} - {s.end_time ? formatTime(s.end_time) : ''}</span>
                        <span className="text-[8px] md:text-[9px] font-black text-amber-400 uppercase flex items-center gap-1"><Calendar size={10}/> {s.exam_date}</span>
                        <span className="text-[8px] md:text-[9px] font-black text-rose-400 uppercase">RM {s.room}</span>
                      </div>
                    </div>
                  )
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-auto pt-6 border-t border-white/10">
                <button onClick={handleExportExcel} className="w-full sm:flex-1 p-3 md:p-4 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-2xl font-black text-[9px] md:text-[10px] uppercase transition-all flex justify-center items-center gap-2"><Download size={16} /> <span className="sm:hidden">Export Excel</span></button>
                <button onClick={handleExportPDF} className="w-full sm:flex-[3] p-3 md:p-4 bg-blue-600 text-white hover:bg-blue-500 rounded-2xl font-black text-[9px] md:text-[10px] uppercase shadow-lg transition-all flex justify-center items-center gap-2"><Printer size={16} /> PDF Itinerary</button>
              </div>
            </div>
          </div>
          
      <div id="availability-log-section" className="lg:col-span-2">
             <AvailabilityLogBook 
               profile={profile} 
               globalAvailability={globalAvailability} 
               onAdd={onAddAvailability} 
               onBulkAdd={onBulkAddAvailability} 
               onDelete={onDeleteAvailability} 
               readOnly={isViewMode} 
               showToast={showToast} 
               isHighlighted={highlightTarget === 'availability-log'}
             />
          </div>
        </div>

        <div className="bg-white p-2 md:p-6 rounded-2xl md:rounded-[4rem] shadow-xl border border-slate-100 overflow-hidden relative">
          <div className="p-3 md:p-8 pb-0 flex justify-between items-end">
             <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter mb-4 text-center md:text-left">Master <span className="text-blue-600 italic">Timeline</span></h2>
          </div>
          <div className="overflow-x-auto pb-4 custom-scrollbar">
             <div className="min-w-[800px] px-2 md:px-0"><ScheduleCalendar scheduleData={globalSchedule} examDates={allExamDates} readOnly={true} /></div>
          </div>
        </div>

      </main>

      {/* --- PROCTOR MODALS --- */}
      {flagModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-md p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 md:gap-4 text-rose-500 mb-6"><AlertTriangle size={28} className="md:w-8 md:h-8" /><h3 className="text-lg md:text-xl font-black uppercase tracking-tighter text-slate-900">Flag Emergency</h3></div>
            <textarea value={flagModal.note} onChange={(e) => setFlagModal({...flagModal, note: e.target.value})} placeholder="e.g. Medical emergency..." className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-rose-500 h-24 md:h-32 resize-none mb-6" />
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <button onClick={() => setFlagModal({ isOpen: false, scheduleId: null, subjectCode: '', deptCode: '', note: '' })} className="w-full sm:flex-1 p-4 rounded-xl font-black text-[10px] uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={() => { onFlagIssue(flagModal.scheduleId, flagModal.note, flagModal.deptCode, flagModal.subjectCode); setFlagModal({ isOpen: false, scheduleId: null, subjectCode: '', deptCode: '', note: '' }); showToast("Emergency flag submitted successfully!", "success"); }} disabled={!flagModal.note} className="w-full sm:flex-1 p-4 rounded-xl font-black text-[10px] uppercase text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-50 transition-colors">Submit Flag</button>
            </div>
          </div>
        </div>
      )}

      {declineModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
          <div className="bg-white w-full max-w-md p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] shadow-2xl">
            <div className="flex items-center gap-3 md:gap-4 text-rose-500 mb-6"><AlertTriangle size={28} className="md:w-8 md:h-8" /><h3 className="text-lg md:text-xl font-black uppercase tracking-tighter text-slate-900">Decline Request</h3></div>
            <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Please provide a reason. This instantly alerts your Dept Head and removes you from the schedule.</p>
            <textarea value={declineModal.note} onChange={(e) => setDeclineModal({...declineModal, note: e.target.value})} placeholder="e.g. Schedule conflict, out of town..." className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-rose-500 h-24 md:h-32 resize-none mb-6 transition-all" />
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
<button onClick={() => setDeclineModal({ isOpen: true, scheduleId: s.id, subjectCode: s.subject_code, deptCode: s.dept_code, examDate: s.exam_date, note: '' })} className="flex-1 bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white font-black text-[11px] uppercase py-4 rounded-xl transition-all border border-rose-200 hover:border-transparent flex justify-center items-center gap-2"><X size={16}/> Decline</button>
              <button onClick={() => { 
                
                onDeclineAssignment(declineModal.scheduleId, `DECLINED RELIEVER REQUEST: ${declineModal.note}`, declineModal.deptCode, declineModal.subjectCode); 
                setDeclineModal({ isOpen: false, scheduleId: null, subjectCode: '', deptCode: '', note: '' }); 
                showToast("Assignment Declined. Admins notified.", "success"); 
              }} disabled={!declineModal.note} className="w-full sm:flex-1 p-4 rounded-xl font-black text-[10px] uppercase text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-50 transition-colors shadow-lg">Submit Decline</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
            
// --- 4. MAIN APP COMPONENT ---
function App() {
  // --- GLOBAL STATES ---
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState(null); 
  const [activeTab, setActiveTab] = useState("dashboard"); 
  const [allProfiles, setAllProfiles] = useState([]);
  
  // --- AUTH & REGISTRATION STATES ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); 
  const [regRole, setRegRole] = useState('PROCTOR'); 
  const [regDept, setRegDept] = useState(''); 
  const [regUni, setRegUni] = useState('');
  const [authMode, setAuthMode] = useState('login');
// --- NEW OTP STATES ---
  const [otpMode, setOtpMode] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [regMode, setRegMode] = useState('join'); 
  const [joinCode, setJoinCode] = useState('');

  // --- DATA STATES ---
  const [departments, setDepartments] = useState([]);
  const [globalSchedule, setGlobalSchedule] = useState([]);
  const [globalAvailability, setGlobalAvailability] = useState([]);
  const [allExamDates, setAllExamDates] = useState([]);
  const [viewingProctor, setViewingProctor] = useState(null);
  
  // --- UI & MODAL STATES ---
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  const handleOpenChat = () => {
    setShowChat(true);
    setUnreadMessageCount(0);
    if (profile) localStorage.setItem(`last_read_chat_${profile.id}`, new Date().toISOString());
  };

  const [createModal, setCreateModal] = useState({ isOpen: false, name: '', email: '', pass: '', dept: '' });
  const [deptModal, setDeptModal] = useState({ isOpen: false, name: '', code: '', campus: 'Main' });
  const [appToast, setAppToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', text: '', action: null });
  const [approvalModal, setApprovalModal] = useState({ isOpen: false, profile: null }); 
  const [editStaffModal, setEditStaffModal] = useState({ isOpen: false, id: '', name: '', role: '', dept: '' });
  const [editDeptModal, setEditDeptModal] = useState({ isOpen: false, id: '', name: '', code: '' });
  const [activeDeptId, setActiveDeptId] = useState(null);
  const [showMasterTimeline, setShowMasterTimeline] = useState(false);
  const [targetHighlight, setTargetHighlight] = useState("");

 

  // --- ROLE HELPERS ---
  const safeRole = profile?.role?.trim().toUpperCase() || '';
  const isHeadAdmin = safeRole === 'HEAD_ADMIN';
  const isDeptAdmin = safeRole === 'DEPT_ADMIN';
  const isProctor = safeRole === 'PROCTOR';

  // --- SYSTEM FUNCTIONS ---
  const sendNotification = async (targetDept, targetRole, targetUserId, title, message, type = 'info') => {
    try {
      const payload = [];
      if (targetDept || targetRole || targetUserId) {
         payload.push({ target_dept: targetDept, target_role: targetRole, target_user_id: targetUserId, title, message, type });
      }
      if (targetDept && targetRole !== 'HEAD_ADMIN') {
         payload.push({ target_dept: null, target_role: 'HEAD_ADMIN', target_user_id: null, title: `[${targetDept}] ${title}`, message, type });
      }
      if (payload.length > 0) {
        await supabase.from('notifications').insert(payload);
      }
    } catch (e) { console.error("Notification Failed", e); }
  };

  const markNotificationRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };
 
  // --- UPGRADED: CONTEXT-AWARE ROUTER & MODAL TRIGGER ---
  const handleNotificationClick = async (notification) => {
    await markNotificationRead(notification.id);
    setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
    setShowNotifications(false);
    setTargetHighlight(""); 

    const title = (notification.title || "").toLowerCase();
    const msg = notification.message || "";

    if (title.includes('announcement')) { setShowChat(true); return; }

    if (title.includes('availability')) {
      const nameMatch = msg.match(/^(.*?)\s+(updated|uploaded)/i);
      if (nameMatch) {
        const proctorName = nameMatch[1].trim().toLowerCase();
        const targetUser = allProfiles.find(p => (p.full_name || "").toLowerCase() === proctorName || (p.name || "").toLowerCase() === proctorName);
        if (targetUser) { setViewingProctor(targetUser); setTargetHighlight("availability-log"); }
      }
      return;
    }

   if (title.includes('account') || (title.includes('request') && !title.includes('assignment'))) {
      const nameMatch = msg.match(/^(.*?)\s+(requested|created)/i) || msg.match(/account for\s+(.*?)\./i);
      if (nameMatch) {
         let extractedName = nameMatch[1].trim();
         if(extractedName.startsWith("Created account for ")) extractedName = extractedName.replace("Created account for ", "");
         
         // NEW: Intercept and open the Approval Modal directly
         const pendingUser = allProfiles.find(p => p.full_name === extractedName && p.status === 'PENDING');
         if (pendingUser) {
            setApprovalModal({ isOpen: true, profile: pendingUser });
            return;
         }

         setActiveTab('users');
         setTargetHighlight(extractedName);
      }
      return;
    } 

    // --- TIMELINE ROUTING & SWITCH PROCTOR MODAL TRIGGER ---
    setActiveTab('dashboard');
    if (notification.target_dept) {
       const targetDept = departments.find(d => d.code === notification.target_dept);
       if (targetDept) setActiveDeptId(targetDept.id);
    }
    
    if (title.includes('declined')) {
        const switchMatch = notification.message.match(/SWITCH-PROCTOR-([^\s|]+)/);
        if (switchMatch) {
            setTargetHighlight(`SWITCH-PROCTOR-${switchMatch[1]}`);
        } else {
            setAppToast({ message: "Action Required: Reliever request was DECLINED. Review or switch proctor in the preview draft.", type: "error" });
        }
    } else if (title.includes('accepted') || title.includes('request accepted')) {
        setAppToast({ message: "Success: Reliever request was ACCEPTED. Slot verified and locked.", type: "success" });
    }
  };
  
  const fetchNotifications = async () => {
    if (!profile) return;
    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });
    if (isHeadAdmin) query = query.or(`target_role.eq.HEAD_ADMIN,target_user_id.eq.${profile.id}`);
    else if (isDeptAdmin) query = query.or(`target_dept.eq.${profile.assigned_dept},target_user_id.eq.${profile.id}`);
    else query = query.eq('target_user_id', profile.id);

    const { data } = await query;
    if (data) setNotifications(data);
  };

  const fetchAllData = async (showSpinner = true, activeProfile = profile) => {
    if (showSpinner) { setLoading(true); setSyncError(null); }
    try {
      const uni = activeProfile?.university || 'UNKNOWN';
      const fetchPromise = Promise.all([
        supabase.from('departments').select('*').eq('university', uni).order('name', { ascending: true }),
        supabase.from('schedules').select('*').eq('university', uni),
        supabase.from('proctor_availability').select('*').eq('university', uni),
        supabase.from('profiles').select('*').eq('university', uni)
      ]);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Database took too long to respond.")), 10000));
      const [deptsRes, schedsRes, availRes, profilesRes] = await Promise.race([fetchPromise, timeoutPromise]);

      if (deptsRes.error) throw new Error(`Departments: ${deptsRes.error.message}`);
      if (schedsRes.error) throw new Error(`Schedules: ${schedsRes.error.message}`);
      if (availRes.error) throw new Error(`Availability: ${availRes.error.message}`);

      setDepartments(deptsRes.data || []);
      setGlobalAvailability(availRes.data || []);
      setAllProfiles(profilesRes.data || []);
      if (schedsRes.data) {
        const sortedData = schedsRes.data.sort((a, b) => a.id - b.id);
        const dates = [...new Set(sortedData.map(s => s.exam_date))].sort();
        setGlobalSchedule(runConflictDetection(sortedData));
        setAllExamDates(dates);
      }
      await fetchNotifications();
    } catch (err) {
      console.error("Silent Background Sync Error:", err.message);
      if (showSpinner) setSyncError(err.message);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

 const fetchProfiles = async () => {
    if (!profile?.university) return;
    
    // Security gatekeeper filter applied
    const { data } = await supabase.from('profiles').select('*').eq('university', profile.university);
    setAllProfiles(data || []);
  };

  // --- BULLETPROOF AUTHENTICATION ENGINE ---
  useEffect(() => {
    let isMounted = true;

    // 1. Unified function to handle both initial load and future logins
    const loadUserSession = async (currentSession) => {
      if (!currentSession) {
        if (isMounted) { setSession(null); setProfile(null); setLoading(false); }
        return;
      }
      
      if (isMounted) { setSession(currentSession); setLoading(true); }

      let fetchedProfile = null;
      for (let i = 0; i < 4; i++) {
         const { data: pData } = await supabase.from('profiles').select('*').eq('id', currentSession.user.id).maybeSingle();
         if (pData) { fetchedProfile = pData; break; }
         await new Promise(res => setTimeout(res, 1000)); // Retry logic
      }

     if (isMounted) {
          if (fetchedProfile) {
             setProfile(fetchedProfile);
             // THIS IS THE FIX: Passes the newly loaded profile directly into the fetcher!
             await fetchAllData(false, fetchedProfile); 
          } else {
             console.error("Profile completely disconnected from database.");
          }
          setLoading(false); 
        }
    };

    // 2. Force check on mount (Fixes the perpetual refresh bug)
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      loadUserSession(initialSession);
    });

    // 3. Listen for Auth State Changes (Login / Logout / Expiry)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!isMounted) return;
      
      // We ignore INITIAL_SESSION here because getSession() already handled it!
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadUserSession(currentSession);
      } else if (event === 'SIGNED_OUT') {
        setSession(null); setProfile(null); setDepartments([]); setGlobalSchedule([]); setGlobalAvailability([]); setLoading(false);
      }
    });

    return () => { isMounted = false; subscription.unsubscribe(); };
  }, []);

useEffect(() => { 
    if (profile) {
      fetchProfiles(); 
      fetchNotifications(); 
      
      // --- NEW: FETCH UNREAD MESSAGES ON LOAD ---
      const fetchUnreadCount = async () => {
        const lastRead = localStorage.getItem(`last_read_chat_${profile.id}`) || '1970-01-01T00:00:00.000Z';
        const { count } = await supabase.from('messages')
          .select('*', { count: 'exact', head: true })
          .gt('created_at', lastRead)
          .neq('sender_id', profile.id)
          .or(`receiver_id.is.null,receiver_id.eq.${profile.id}`);
        if (count) setUnreadMessageCount(count);
      };
      fetchUnreadCount();
    }
  }, [profile]);

 // --- FIX 2: THE DEBOUNCER (Prevents the "Sledgehammer" Lag) ---
  const syncTimeoutRef = useRef(null);

  const triggerSmartSync = () => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    // Wait 3 seconds after the database stops changing before downloading new data
    syncTimeoutRef.current = setTimeout(() => {
      fetchAllData(false);
    }, 3000); 
  };

  useEffect(() => {
    if (!session) return;
    const dbChannel = supabase.channel('system-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, triggerSmartSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, triggerSmartSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proctor_availability' }, triggerSmartSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchProfiles)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
         if (payload.new.sender_id !== profile?.id) {
           if (payload.new.receiver_id === profile?.id || !payload.new.receiver_id) {
             setUnreadMessageCount(prev => prev + 1);
             setAppToast({ message: `New message from ${payload.new.sender_name}`, type: 'success' });
           }
         }
      })
      .subscribe();
      
    return () => { 
      supabase.removeChannel(dbChannel); 
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [session, profile]);

  const conflictCount = useMemo(() => globalSchedule.filter(s => s.hasConflict).length, [globalSchedule]);
  const visibleDepartments = useMemo(() => {
    if (isHeadAdmin) return departments;
    return departments.filter(d => d.code === profile?.assigned_dept);
  }, [departments, profile, isHeadAdmin]);

  // --- NEW: Auto-route Department Heads straight to their workspace ---
  useEffect(() => {
    if (visibleDepartments.length === 1) {
      setActiveDeptId(visibleDepartments[0].id);
    }
  }, [visibleDepartments]);
  
  const handleAddAvailability = async (newAvail) => {
    const { error } = await supabase.from('proctor_availability').insert([newAvail]);
    if (error) alert(`DATABASE REJECTION: \nMessage: ${error.message}`);
    else {
      await sendNotification(profile.assigned_dept, null, null, 'Availability Logged', `${profile.full_name} updated their calendar.`, 'info');
      await fetchAllData(false);
    }
  };

  const handleBulkAddAvailability = async (bulkAvails) => {
    const { error } = await supabase.from('proctor_availability').insert(bulkAvails);
    if (error) return alert("Bulk Import Database Error: " + error.message);
    await sendNotification(profile.assigned_dept, null, null, 'Bulk Availability Logged', `${profile.full_name} uploaded ${bulkAvails.length} slots via Excel.`, 'info');
    await fetchAllData(false);
  };

  const handleDeleteAvailability = async (id) => {
    await supabase.from('proctor_availability').delete().eq('id', id);
    await fetchAllData(false);
  };

  const handleFlagIssue = async (scheduleId, reason, deptCode, subjectCode) => {
    await supabase.from('schedules').update({ flagged: true, flagNote: reason }).eq('id', scheduleId);
    await sendNotification(deptCode, null, null, 'Urgent Proctor Flag', `${profile.full_name} flagged ${subjectCode}. Reason: ${reason}`, 'urgent');
    fetchAllData(false);
  };

  // --- NEW: VOID DECLINED ASSIGNMENTS ---
  const handleDeclineAssignment = async (scheduleId, reason, deptCode, subjectCode, examDate) => {
    await supabase.from('schedules').update({ flagged: true, flagNote: `DECLINED: ${reason}`, proctor: 'TBA' }).eq('id', scheduleId);
    
    const msg = `SWITCH-PROCTOR-${scheduleId} | CRITICAL: ${profile.full_name} declined the reliever request for ${subjectCode} on ${examDate}. Reason: ${reason}.`;
    await sendNotification(deptCode, 'DEPT_ADMIN', null, 'Assignment Declined', msg, 'urgent');
    await sendNotification(deptCode, 'HEAD_ADMIN', null, 'Assignment Declined', msg, 'urgent');
    fetchAllData(false);
  };

 // --- NEW: ACCEPT RELIEVER ASSIGNMENT ---
  const handleAcceptAssignment = async (proctorId, proctorName, deptCode, examDate, startTime, endTime, subjectCode) => {
    // 1. Log the availability to verify the pending slot
    const { error } = await supabase.from('proctor_availability').insert([{
      proctor_id: proctorId,
      proctor_name: proctorName,
      dept_code: deptCode,
      exam_date: examDate,
      start_time: startTime,
      end_time: endTime,
      is_emergency_flag: false,
      note: "Accepted Proctor Assignment Request",
      university: profile.university // <-- FIX: STAMP ADDED HERE
    }]);

    if (error) {
      alert("Database Error: " + error.message);
    } else {
      // 2. Explicitly fire the targeted notifications to both Admins
      await sendNotification(deptCode, 'DEPT_ADMIN', null, 'Request Accepted', `${proctorName} accepted the assignment for ${subjectCode}.`, 'success');
      await sendNotification(deptCode, 'HEAD_ADMIN', null, 'Request Accepted', `${proctorName} accepted the assignment for ${subjectCode}.`, 'success');
      
      await fetchAllData(false);
    }
  };

  const handleHardReset = async () => {
    await supabase.auth.signOut();
    localStorage.clear(); sessionStorage.clear(); window.location.reload();
  };

  const handleCreateAccount = () => {
    setCreateModal({ isOpen: true, name: '', email: '', pass: '', dept: '' });
  };

  const executeCreateAccount = async (e) => {
    e.preventDefault();
    const { name, email, pass, dept } = createModal;
    let d = isHeadAdmin ? dept : profile.assigned_dept;
    if (!name || !email || !pass) return;
    
    const { data, error } = await supabase.auth.signUp({ email, password: pass, options: { data: { full_name: name } } });
    if (error) {
      setAppToast({ message: error.message, type: 'error' });
    } else if (data.user) {
      await supabase.from('profiles').upsert([{ 
        id: data.user.id, 
        full_name: name, 
        role: isHeadAdmin ? 'DEPT_ADMIN' : 'PROCTOR', 
        assigned_dept: d, 
        status: 'ACTIVE',
        university: profile.university // <-- FIX: STAMP ADDED HERE
      }]);
      sendNotification(null, 'HEAD_ADMIN', null, 'Account Created', `Created account for ${name}.`);
      setAppToast({ message: "Account successfully created!", type: 'success' });
      setCreateModal({ isOpen: false, name: '', email: '', pass: '', dept: '' });
      fetchProfiles();
    }
  };

  const executeEditStaff = async (e) => {
    e.preventDefault();
    const { id, name, role, dept } = editStaffModal;
    await supabase.from('profiles').update({ 
      full_name: name, role, assigned_dept: role === 'HEAD_ADMIN' ? null : dept.toUpperCase() 
    }).eq('id', id);
    setAppToast({ message: "Staff profile successfully updated.", type: "success" });
    setEditStaffModal({ isOpen: false, id: '', name: '', role: '', dept: '' });
    fetchProfiles();
  };

  const executeEditDept = async (e) => {
    e.preventDefault();
    const { id, name, code } = editDeptModal;
    await supabase.from('departments').update({ name, code: code.toUpperCase() }).eq('id', id);
    setAppToast({ message: "Department successfully updated.", type: "success" });
    setEditDeptModal({ isOpen: false, id: '', name: '', code: '' });
    fetchAllData(false);
  };

  const handleBlockUser = async (id, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    await supabase.from('profiles').update({ status: newStatus }).eq('id', id);
    setAppToast({ message: `Account ${newStatus.toLowerCase()} successfully.`, type: 'success' });
    fetchProfiles();
  };

  const handleDeleteUser = (id) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete account permanently?",
      text: "This action is permanent. All associated logs and availability data will be destroyed.",
      action: async () => {
        // 1. Delete their profile and availability logs
        await supabase.from('profiles').delete().eq('id', id);
        await supabase.from('proctor_availability').delete().eq('proctor_id', id);

        // 2. Notify and Sync
        await sendNotification(null, 'HEAD_ADMIN', null, 'Account Deleted', `A system account was permanently deleted.`, 'urgent');
        await fetchAllData(false);
        setAppToast({ message: "Account permanently deleted.", type: "success" });
      }
    });
  };

const executeRegistration = async () => {
    setLoading(true);
    try {
      if (regMode === 'join') {
        if (!joinCode.trim()) throw new Error("Invite Code is required.");
        const { data: dData, error: dErr } = await supabase.from('departments').select('university, code').eq('invite_code', joinCode.toUpperCase().trim()).maybeSingle();
        if (dErr || !dData) throw new Error("Invalid or expired Invite Code. Please check with your Administrator.");
        
        setRegUni(dData.university);
        setRegDept(dData.code);
      } else {
        if (!regUni.trim()) throw new Error("University Name is required.");
        setRegRole('HEAD_ADMIN'); 
      }
      
      const { data, error } = await supabase.auth.signUp({ 
         email, 
         password, 
         options: { data: { full_name: fullName } } 
      });
      if (error) throw error;
      
      setOtpMode(true);
      setAppToast({ message: "Verification code sent to your email!", type: "success" });
      
    } catch (err) { setAppToast({ message: err.message, type: "error" }); } 
    finally { setLoading(false); }
  };

  const executeVerifyOtp = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'signup' });
      if (error) throw error;

      if (data?.user) {
// FIX: Retain exact DB casing when joining via Invite Code to prevent Ghost Universities!
        const targetUni = regMode === 'new' ? regUni.toUpperCase().trim() : regUni.trim();
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'HEAD_ADMIN').eq('university', targetUni);
        
        if (count === 0) {
          await supabase.from('profiles').upsert([{ id: data.user.id, full_name: fullName, role: 'HEAD_ADMIN', university: targetUni, status: 'ACTIVE' }]);
          setAppToast({ message: "First user auto-promoted to Head Admin for this University!", type: "success" });
          setTimeout(() => window.location.reload(), 2000);
        } else {
          await supabase.from('profiles').upsert([{ 
            id: data.user.id, full_name: fullName, role: regRole, assigned_dept: regRole === 'HEAD_ADMIN' ? null : regDept.toUpperCase(), university: targetUni, status: 'PENDING' 
          }]);
          
          if (regRole === 'PROCTOR') await sendNotification(regDept.toUpperCase(), 'DEPT_ADMIN', null, 'New Proctor Request', `${fullName} requested to join ${regDept.toUpperCase()}.`, 'info');
          else await sendNotification(null, 'HEAD_ADMIN', null, 'New Admin Request', `${fullName} requested access as a ${regRole}.`, 'info');
          
          await supabase.auth.signOut();
          setOtpMode(false);
          setAuthMode('success'); 
          setEmail(''); setPassword(''); setFullName(''); setRegDept(''); setRegUni(''); setOtpCode('');
        }
      }
    } catch (err) { setAppToast({ message: "Invalid code: " + err.message, type: "error" }); } 
    finally { setLoading(false); }
  };

  const handleApproveUser = async (id) => {
    await supabase.from('profiles').update({ status: 'ACTIVE' }).eq('id', id);
    await sendNotification(null, null, id, 'Account Approved', 'Your account has been approved. You can now access the system.');
    setAppToast({ message: "Account approved successfully.", type: "success" });
    fetchProfiles();
  };

  const handleDeclineUser = async (id) => {
    await supabase.from('profiles').delete().eq('id', id);
    setAppToast({ message: "Registration request declined and removed.", type: "success" });
    fetchProfiles();
  };

  async function handleDepartmentUpdate(actionType, payload) {
    if (['manual_override', 'lock_and_save', 'schedule_sync'].includes(actionType)) {
      if (!Array.isArray(payload) || payload.length === 0) return false;
      
      const itemsToUpdate = [];
      const itemsToInsert = [];

      payload.forEach(item => {
        const { hasConflict, conflictType, ...validData } = item;
        if (validData.id && String(validData.id).includes('temp')) delete validData.id;
        if (validData.tempId) delete validData.tempId;
        
       const cleanItem = { 
            ...validData, 
            year_level: String(validData.year_level), 
            flagged: Boolean(validData.flagged ?? false),
            isManualProctor: Boolean(validData.isManualProctor ?? false), 
            original_proctor: validData.original_proctor || validData.proctor,
            university: profile.university // Explicitly assigns the generated schedule to this university
        };
        
        // --- NEW: BULLETPROOF ROUTING ---
        if (cleanItem.id) itemsToUpdate.push(cleanItem);
        else itemsToInsert.push(cleanItem);
      });

      // Safely route to the correct Supabase function to prevent Schema crashes
      if (itemsToUpdate.length > 0) await supabase.from('schedules').upsert(itemsToUpdate, { onConflict: 'id' });
      if (itemsToInsert.length > 0) await supabase.from('schedules').insert(itemsToInsert);

      const dCode = payload[0]?.dept_code || profile?.assigned_dept || 'Unknown';
      await sendNotification(null, 'HEAD_ADMIN', null, `Master Schedule: ${actionType.replace(/_/g, ' ')}`, `Department ${dCode} applied manual overrides/locks to the timeline.`, 'warning');
      await fetchAllData(false);
      return true;
    }
    
    if (['proctors', 'rooms', 'subjects'].includes(actionType)) {
      if (!payload?.id) return false;
      await supabase.from('departments').update({ [actionType]: payload[actionType] }).eq('id', payload.id);
      await sendNotification(null, 'HEAD_ADMIN', null, `Registry Updated: ${actionType}`, `Department ${payload.code} updated their ${actionType} list.`, 'info');
      await fetchAllData(false);
      return true;
    }
    return true;
  }
  
  const handleScheduleGenerated = async (newAssignments, _newDates, deptCode) => {
    if (!newAssignments?.length) return;
    const targetYear = String(newAssignments[0].year_level);
    try {
      await supabase.from('schedules').delete().eq('dept_code', deptCode).eq('year_level', targetYear);
      
      // FIX APPLIED HERE: Added university: profile.university to the stamp!
      const formattedData = newAssignments.map(item => ({
        dept_code: deptCode, year_level: String(item.year_level), section: item.section || 'A', subject_code: item.subject_code || 'N/A',
        subject_name: item.subject_name || 'N/A', proctor: item.proctor, room: item.room, exam_date: item.exam_date,
        start_time: item.start_time, end_time: item.end_time, flagged: false, flagNote: "", isManualProctor: false,
        university: profile.university 
      }));
      
      await supabase.from('schedules').insert(formattedData);
      await sendNotification(null, 'HEAD_ADMIN', null, 'Schedule Generated', `Department ${deptCode} generated a draft for Year ${targetYear}.`, 'info');
      await fetchAllData(false);
    } catch (err) { alert("Failed to save schedule."); }
  };

  const runConflictDetection = (scheduleList) => {
    return scheduleList.map(item => {
      const conflict = scheduleList.find(target =>
        target.id !== item.id && target.exam_date === item.exam_date && target.section !== item.section && 
        (target.room === item.room || target.proctor === item.proctor) && (item.start_time < target.end_time && item.end_time > target.start_time)
      );
      return { ...item, hasConflict: !!conflict, conflictType: conflict ? (conflict.room === item.room ? 'ROOM' : 'PROCTOR') : null };
    });
  };
// --- NEW: MASTER TIMELINE PDF EXPORT ---
  const exportGlobalPDF = () => {
    try {
      if (!globalSchedule || globalSchedule.length === 0) {
        setAppToast({ message: "No schedule data to export!", type: "error" });
        return;
      }

      const doc = new jsPDF({ orientation: 'landscape' });
      
      const drawLetterhead = (data) => {
        if (!doc.headerPrintedPages) doc.headerPrintedPages = new Set();
        if (doc.headerPrintedPages.has(data.pageNumber)) return;
        doc.headerPrintedPages.add(data.pageNumber);

        doc.addImage(accordLogo, 'PNG', 14, 12, 12, 12);
        doc.setFont("helvetica", "bolditalic");
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42); 
        doc.text("ACCORD", 30, 20);
        
        const accordWidth = doc.getTextWidth("ACCORD ");
        doc.setTextColor(37, 99, 235); 
        doc.text("PRO", 30 + accordWidth, 20);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); 
        doc.text("UNIVERSITY MASTER TIMELINE", 30, 26);

        doc.setDrawColor(37, 99, 235); 
        doc.setLineWidth(0.5);
        doc.line(14, 32, doc.internal.pageSize.getWidth() - 14, 32);
      };

      let currentY = 40; 

      // 1. Group by Date, then by Department
      const groupedData = {};
      const sorted = [...globalSchedule].sort((a, b) => new Date(a.exam_date || 0) - new Date(b.exam_date || 0) || (a.start_time || "").localeCompare(b.start_time || ""));

      sorted.forEach(item => {
        const date = item.exam_date || "N/A";
        const dept = item.dept_code || "UNKNOWN";
        if (!groupedData[date]) groupedData[date] = {};
        if (!groupedData[date][dept]) groupedData[date][dept] = [];
        groupedData[date][dept].push(item);
      });

      // 2. Iterate through Dates and Departments
      Object.keys(groupedData).sort().forEach(date => {
        Object.keys(groupedData[date]).sort().forEach(dept => {
          const items = groupedData[date][dept];

          const tableRows = items.map(item => [
            `${item.start_time ? formatTime(item.start_time) : "--:--"} - ${item.end_time ? formatTime(item.end_time) : "--:--"}`,
            `Yr ${item.year_level} - ${item.section}`,
            `${item.subject_code || "N/A"} - ${item.subject_name || "N/A"}`,
            item.room || "N/A",
            item.proctor || "TBA"
          ]);

          autoTable(doc, { 
            head: [
              [
                { content: `EXAM DATE: ${date}   |   DEPARTMENT: ${dept}`, colSpan: 5, styles: { halign: 'center', fillColor: [37, 99, 235], fontStyle: 'bold', fontSize: 11 } }
              ],
              ["Time", "Section", "Subject", "Room", "Proctor"]
            ],
            body: tableRows, 
            startY: currentY, 
            theme: 'grid', 
            styles: { font: 'helvetica', fontSize: 10, cellPadding: 5 }, 
            headStyles: { font: 'helvetica', fillColor: [15, 23, 42], textColor: [255, 255, 255] },
            margin: { top: 40, bottom: 20 }, 
            pageBreak: 'avoid',
            didDrawPage: drawLetterhead 
          });

          currentY = doc.lastAutoTable.finalY + 15; 
        });
      });

      doc.save(`Accord_Master_Timeline.pdf`);
      setAppToast({ message: "Master PDF Downloaded!", type: "success" });
    } catch (err) { 
      setAppToast({ message: "PDF Error: " + err.message, type: "error" }); 
    }
  };

const executeAddDepartment = async (e) => {
    e.preventDefault();
    const { name, code, campus } = deptModal;
    if (!name || !code) return;

   const generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase();

   const { error } = await supabase.from('departments').insert([{ 
      name, 
      code: code.toUpperCase(), 
      campus_location: campus, 
      university: profile.university,
      subjects: {}, 
      rooms: [],
      invite_code: generatedCode
    }]); 
    
    if (error) {
      setAppToast({ message: error.message, type: "error" });
    } else {
      await sendNotification(null, 'HEAD_ADMIN', null, 'New Department', `Created department ${code.toUpperCase()} at ${campus}.`, 'info');
      await fetchAllData(false);
      setAppToast({ message: `Workspace initialized! Code: ${generatedCode}`, type: "success" });
      setDeptModal({ isOpen: false, name: '', code: '', campus: 'Main' });
    }
  };

  const deleteDepartment = async (deptId, deptCode) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete ${deptCode} Department?`,
      text: "This action is permanent. All associated schedules and resources will be destroyed.",
      action: async () => {
        await supabase.from('departments').delete().eq('id', deptId);
        await sendNotification(null, 'HEAD_ADMIN', null, 'Department Deleted', `Removed department ${deptCode}.`, 'urgent');
        await fetchAllData(false);
        setAppToast({ message: "Department permanently deleted.", type: "success" });
      }
    });
  };

 
  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><RefreshCw className="text-blue-500 animate-spin" size={48} /></div>;

   // --- AUTHENTICATION SCREEN LOCK ---
  const isRegisteringProcess = session && !profile && (authMode === 'register' || authMode === 'success');
  
  if (!session || isRegisteringProcess || authMode === 'success') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-white p-10 md:p-12 rounded-[3.5rem] w-full max-w-md shadow-[0_0_100px_rgba(0,0,0,0.5)] text-center animate-in zoom-in-95 duration-500">
          <img src={accordLogo} alt="Accord Pro Logo" className="w-20 h-20 mx-auto mb-4 object-contain drop-shadow-2xl brightness-0" />
          <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-2">Accord <span className="text-blue-600">Pro</span></h1>
          
          {authMode === 'success' ? (
            <div className="animate-in fade-in zoom-in duration-300 py-8">
              <CheckCircle2 size={64} className="mx-auto text-emerald-500 mb-6" />
              <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-2">Request Sent!</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-8 leading-relaxed">
                Your account has been registered.<br/>Please wait for an Administrator to approve your access.
              </p>
              <button onClick={() => setAuthMode('login')} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl active:scale-95">
                Return to Login
              </button>
            </div>
          ) : authMode === 'login' ? (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Secure System Login</p>
              <input type="email" placeholder="Email Address" value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl mb-3 font-bold text-xs border-2 border-transparent focus:border-blue-500 outline-none transition-all"/>
              <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl mb-8 font-bold text-xs border-2 border-transparent focus:border-blue-500 outline-none transition-all"/>
              
              <button onClick={async () => {
                const {error}=await supabase.auth.signInWithPassword({email,password}); 
                if(error) setAppToast({ message: error.message, type: "error" });
              }} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 transition-all mb-6 shadow-xl active:scale-95">
                Sign In
              </button>
              
              <div className="pt-6 border-t-2 border-slate-50">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">No account yet?</p>
                <button onClick={() => { setAuthMode('register'); setFullName(''); setEmail(''); setPassword(''); }} className="w-full bg-blue-50 text-blue-600 p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-100 transition-all active:scale-95">
                  Create New Account
                </button>
              </div>
            </div>
          ) : (
           <div className="animate-in fade-in slide-in-from-right-4 duration-300 text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center">
                 {otpMode ? "Verify Your Email" : "Staff Registration"}
              </p>
              
              {!otpMode ? (
                <>
                  <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                    <button onClick={() => { setRegMode('join'); setRegRole('PROCTOR'); }} className={`flex-1 py-3 text-[9px] font-black uppercase rounded-lg transition-all ${regMode === 'join' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>Join Workspace</button>
                    <button onClick={() => { setRegMode('new'); setRegRole('HEAD_ADMIN'); }} className={`flex-1 py-3 text-[9px] font-black uppercase rounded-lg transition-all ${regMode === 'new' ? 'bg-white shadow text-emerald-600' : 'text-slate-400'}`}>New University</button>
                  </div>

                  <div className="space-y-3 mb-6">
                    <input type="text" placeholder="Full Name (e.g. Juan Dela Cruz)" value={fullName} onChange={e=>setFullName(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-xs border-2 border-transparent focus:border-blue-500 outline-none transition-all"/>
                    <input type="email" placeholder="Work Email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-xs border-2 border-transparent focus:border-blue-500 outline-none transition-all"/>
                    <input type="password" placeholder="Create Password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-xs border-2 border-transparent focus:border-blue-500 outline-none transition-all"/>
                    
                    {regMode === 'join' ? (
                      <>
                        <input type="text" placeholder="6-Character Invite Code (e.g. X7B9PQ)" value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} className="w-full bg-blue-50 p-4 rounded-2xl font-black text-xs text-blue-800 border-2 border-transparent focus:border-blue-500 outline-none transition-all tracking-widest uppercase"/>
                        <select value={regRole} onChange={e=>setRegRole(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-xs border-2 border-transparent focus:border-blue-500 outline-none transition-all cursor-pointer appearance-none">
                          <option value="PROCTOR">Proctor</option>
                          <option value="DEPT_ADMIN">Department Head</option>
                        </select>
                      </>
                    ) : (
                      <input type="text" placeholder="Official University Name" value={regUni} onChange={e=>setRegUni(e.target.value)} className="w-full bg-emerald-50 p-4 rounded-2xl font-black text-xs text-emerald-800 border-2 border-transparent focus:border-emerald-500 outline-none transition-all uppercase"/>
                    )}
                  </div>
                  
                  <button onClick={executeRegistration} disabled={loading} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-500 disabled:opacity-50 transition-all mb-6 shadow-xl active:scale-95">
                    {loading ? "Processing..." : "Send Verification Code"}
                  </button>
                </>
              ) : (
                <div className="space-y-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                     <p className="text-[10px] font-bold text-blue-800 text-center">We sent a 6-digit code to <strong>{email}</strong></p>
                  </div>
                  <input type="text" maxLength="6" placeholder="Enter 6-Digit Code" value={otpCode} onChange={e=>setOtpCode(e.target.value)} className="w-full bg-slate-50 p-6 rounded-2xl font-black text-2xl text-center tracking-[0.5em] border-2 border-transparent focus:border-blue-500 outline-none transition-all"/>
                  
                  <button onClick={executeVerifyOtp} disabled={loading || otpCode.length < 6} className="w-full bg-emerald-500 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-400 disabled:opacity-50 transition-all shadow-xl active:scale-95">
                    {loading ? "Verifying..." : "Verify & Complete"}
                  </button>
                </div>
              )}
              
              <div className="pt-6 border-t-2 border-slate-50">
                <button onClick={() => { setAuthMode('login'); setEmail(''); setPassword(''); }} className="w-full bg-slate-50 text-slate-500 p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all active:scale-95 flex items-center justify-center gap-2">
                  <ArrowLeft size={14}/> Back to Login
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* We put the Toast here too so errors show on the login screen! */}
        {appToast && (
          <div className={`fixed bottom-10 right-10 z-[400] p-6 rounded-2xl shadow-2xl flex items-center gap-4 text-white font-black text-[10px] uppercase tracking-widest animate-in slide-in-from-right-10 ${appToast.type === 'error' ? 'bg-rose-600' : 'bg-slate-900 border border-blue-500/50'}`}>
            {appToast.type === 'error' ? <AlertCircle size={20}/> : <CheckCircle2 size={20} className="text-emerald-400"/>}
            <span>{appToast.message}</span>
            <button onClick={() => setAppToast(null)} className="ml-auto"><X size={16} className="opacity-50 hover:opacity-100"/></button>
          </div>
        )}
      </div>
    );
  }

  // --- BOUNCERS: BLOCK PENDING & BLOCKED ACCOUNTS ---
  if (session && profile && profile.status === 'BLOCKED') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
        <Lock size={64} className="text-rose-500 mb-6" />
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Account Suspended</h1>
        <p className="text-slate-400 text-[10px] font-bold max-w-sm mb-8 uppercase tracking-widest leading-relaxed">Your access has been blocked by an administrator. Please contact your Department Head.</p>
        <button onClick={() => supabase.auth.signOut()} className="bg-white/10 hover:bg-rose-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl active:scale-95">Sign Out</button>
      </div>
    );
  }

  if (session && profile && profile.status === 'PENDING') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
        <Clock size={64} className="text-amber-500 mb-6 animate-pulse" />
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Awaiting Approval</h1>
        <p className="text-slate-400 text-[10px] font-bold max-w-sm mb-8 uppercase tracking-widest leading-relaxed">Your registration request has been sent. You will gain access once an Administrator approves your account.</p>
        <button onClick={() => supabase.auth.signOut()} className="bg-white/10 hover:bg-amber-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl active:scale-95">Sign Out</button>
      </div>
    );
  }

 // --- SECURE ACCESS DENIED SCREEN ---
  if (!profile && !loading) {
    return (
       <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 md:p-6 text-center animate-in fade-in zoom-in duration-500">
          <AlertOctagon className="mx-auto text-rose-500 mb-6" size={64} />
          <h2 className="text-3xl md:text-4xl font-black uppercase text-white tracking-tighter mb-2">Access Denied</h2>
          <p className="text-[10px] md:text-xs text-slate-400 mb-8 font-bold leading-relaxed max-w-md uppercase tracking-widest">
            Your account profile could not be found or has been deleted from the system. If you believe this is an error, please contact your Head Administrator.
          </p>
          <button onClick={handleHardReset} className="bg-rose-600 hover:bg-rose-500 text-white px-10 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95">
            Return to Login
          </button>
       </div>
    );
  }

   if (viewingProctor) {
    return (
      <>
        {/* --- GLOBAL OVERLAYS RE-ATTACHED --- */}
        {showNotifications && <NotificationPanel notifications={notifications} onClose={() => setShowNotifications(false)} onNotificationClick={handleNotificationClick} />}
        {showHelp && <HelpCenter role={safeRole} onClose={() => setShowHelp(false)} />}
        {showChat && <ChatPanel profile={profile} onClose={() => setShowChat(false)} onViewProctor={(p) => { setShowChat(false); setViewingProctor(p); }} />}

        <ProctorDashboard
   
          profile={viewingProctor} 
          globalSchedule={globalSchedule} 
          allExamDates={allExamDates} 
          globalAvailability={globalAvailability} 
          isViewMode={true}
          onCloseView={() => setViewingProctor(null)}
          onEditProfile={(p) => setEditStaffModal({ isOpen: true, id: p.id, name: p.full_name || p.name, role: p.role, dept: p.assigned_dept || '' })}
          highlightTarget={targetHighlight}
        />
        
        {/* --- INJECTED EDIT STAFF MODAL --- */}
        {editStaffModal.isOpen && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-white w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl">
              <div className="flex items-center gap-4 text-indigo-600 mb-6">
                <Edit2 size={32} />
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none">Edit Staff</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Update profile details</p>
                </div>
              </div>
              <form onSubmit={executeEditStaff} className="space-y-4 mb-2">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Full Name</label>
                  <input required type="text" value={editStaffModal.name} onChange={e=>setEditStaffModal({...editStaffModal, name: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 transition-all"/>
                </div>
                <select value={editStaffModal.role} onChange={e=>setEditStaffModal({...editStaffModal, role: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-xs border-2 border-slate-100 outline-none focus:border-indigo-500 transition-all cursor-pointer appearance-none">
                  <option value="PROCTOR">Proctor</option>
                  <option value="DEPT_ADMIN">Department Head</option>
                  <option value="HEAD_ADMIN">Global Head Admin</option>
                </select>
                 {editStaffModal.role !== 'HEAD_ADMIN' && (
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Department Code</label>
                    <input required type="text" value={editStaffModal.dept} onChange={e=>setEditStaffModal({...editStaffModal, dept: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 transition-all uppercase"/>
                  </div>
                )}
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setEditStaffModal({ isOpen: false, id: '', name: '', role: '', dept: '' })} className="flex-1 p-4 rounded-xl font-black text-[10px] uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                  <button type="submit" className="flex-[2] p-4 rounded-xl font-black text-[10px] uppercase text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg transition-colors">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }
  

 if (isProctor) {
    return (
      <>
        {/* --- GLOBAL OVERLAYS RE-ATTACHED --- */}
        {showNotifications && <NotificationPanel notifications={notifications} onClose={() => setShowNotifications(false)} onNotificationClick={handleNotificationClick} />}
        {showHelp && <HelpCenter role={safeRole} onClose={() => setShowHelp(false)} />}
        {showChat && <ChatPanel profile={profile} onClose={() => setShowChat(false)} onViewProctor={(p) => { setShowChat(false); setViewingProctor(p); }} />}

      <ProctorDashboard
          profile={profile} 
          globalSchedule={globalSchedule} 
          allExamDates={allExamDates} 
          globalAvailability={globalAvailability} 
          onAddAvailability={handleAddAvailability} 
          onBulkAddAvailability={handleBulkAddAvailability}
          onDeleteAvailability={handleDeleteAvailability} 
          notifications={notifications}
          onShowNotify={() => setShowNotifications(true)}
          onShowHelp={() => setShowHelp(true)}
          onShowChat={handleOpenChat}
          unreadMessageCount={unreadMessageCount}
          onFlagIssue={handleFlagIssue}
          onDeclineAssignment={handleDeclineAssignment}
          onAcceptAssignment={handleAcceptAssignment}
          onEditProfile={(p) => setEditStaffModal({ isOpen: true, id: p.id, name: p.full_name || p.name, role: p.role, dept: p.assigned_dept || '' })}
          allProfiles={allProfiles}
          onViewProctor={(p) => setViewingProctor(p)}
          highlightTarget={targetHighlight}
        />

        
        {/* --- INJECTED EDIT STAFF MODAL --- */}
        {editStaffModal.isOpen && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-white w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl">
              <div className="flex items-center gap-4 text-indigo-600 mb-6">
                <Edit2 size={32} />
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none">Edit Staff</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Update profile details</p>
                </div>
              </div>
              <form onSubmit={executeEditStaff} className="space-y-4 mb-2">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Full Name</label>
                  <input required type="text" value={editStaffModal.name} onChange={e=>setEditStaffModal({...editStaffModal, name: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 transition-all"/>
                </div>
                <select value={editStaffModal.role} onChange={e=>setEditStaffModal({...editStaffModal, role: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-xs border-2 border-slate-100 outline-none focus:border-indigo-500 transition-all cursor-pointer appearance-none">
                  <option value="PROCTOR">Proctor</option>
                  <option value="DEPT_ADMIN">Department Head</option>
                  <option value="HEAD_ADMIN">Global Head Admin</option>
                </select>
                 {editStaffModal.role !== 'HEAD_ADMIN' && (
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Department Code</label>
                    <input required type="text" value={editStaffModal.dept} onChange={e=>setEditStaffModal({...editStaffModal, dept: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 transition-all uppercase"/>
                  </div>
                )}
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setEditStaffModal({ isOpen: false, id: '', name: '', role: '', dept: '' })} className="flex-1 p-4 rounded-xl font-black text-[10px] uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                  <button type="submit" className="flex-[2] p-4 rounded-xl font-black text-[10px] uppercase text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg transition-colors">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- GLOBAL APP TOAST (For Save Confirmation) --- */}
        {appToast && (
          <div className={`fixed bottom-4 md:bottom-10 right-4 md:right-10 z-[600] p-4 md:p-6 rounded-2xl shadow-2xl flex items-center gap-3 md:gap-4 text-white font-black text-[10px] md:text-xs uppercase tracking-widest animate-in slide-in-from-bottom-10 md:slide-in-from-right-10 ${appToast.type === 'error' ? 'bg-rose-600' : 'bg-slate-900 border border-blue-500/50'}`}>
            {appToast.type === 'error' ? <AlertCircle size={20}/> : <CheckCircle2 size={20} className="text-emerald-400"/>}
            <span>{appToast.message}</span>
            <button onClick={() => setAppToast(null)} className="ml-auto"><X size={16} className="opacity-50 hover:opacity-100"/></button>
          </div>
        )}
      </>
    );
  }
  
  

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
      
    {/* GLOBAL OVERLAYS */}
      {showNotifications && <NotificationPanel notifications={notifications} onClose={() => setShowNotifications(false)} onNotificationClick={handleNotificationClick} />}
      {showHelp && <HelpCenter role={safeRole} onClose={() => setShowHelp(false)} />}
      {showChat && <ChatPanel profile={profile} onClose={() => setShowChat(false)} onViewProctor={(p) => { setShowChat(false); setViewingProctor(p); }} />}

      {/* RESPONSIVE SIDEBAR / BOTTOM NAV */}
      <aside className="w-full md:w-24 bg-slate-900 flex flex-row md:flex-col items-center justify-around md:justify-start py-2 md:py-10 fixed bottom-0 md:sticky md:top-0 h-20 md:h-screen shadow-[0_-10px_40px_rgba(0,0,0,0.3)] md:shadow-2xl border-t-4 md:border-t-0 md:border-r-8 border-blue-600 z-[100] md:z-50">
        <div className="hidden md:flex justify-center items-center mb-12 hover:scale-105 transition-transform cursor-pointer">
          {/* Removed the blue background, padding, and shadow. Made the logo slightly larger to compensate! */}
          <img src={accordLogo} alt="Accord Logo" className="w-12 h-12 object-contain brightness-0 invert opacity-90" />
        </div>
        
        <button 
          onClick={() => setActiveTab("dashboard")}
          className={`p-3 md:p-5 md:mb-6 rounded-2xl transition-all active:scale-90 ${activeTab === 'dashboard' ? 'bg-white text-slate-900 shadow-2xl' : 'text-slate-500 hover:bg-white/10'}`}
        >
          <LayoutDashboard size={24} className="md:w-7 md:h-7" />
        </button>

        <button 
          onClick={() => setActiveTab("users")}
          className={`p-3 md:p-5 md:mb-6 rounded-2xl transition-all active:scale-90 ${activeTab === 'users' ? 'bg-white text-slate-900 shadow-2xl' : 'text-slate-500 hover:bg-white/10'}`}
        >
          <Users size={24} className="md:w-7 md:h-7" />
        </button>

      {/* GLOBAL CHAT ICON */}
        <button 
          onClick={handleOpenChat}
          className={`p-3 md:p-5 md:mb-6 rounded-2xl transition-all active:scale-90 relative ${showChat ? 'bg-indigo-500 text-white shadow-2xl' : 'text-slate-500 hover:bg-white/10'}`}
        >
          <MessageSquare size={24} className="md:w-7 md:h-7" />
          {unreadMessageCount > 0 && (
            <span className="absolute top-1 right-1 md:top-3 md:right-3 flex h-4 w-4 md:h-5 md:w-5 items-center justify-center rounded-full bg-rose-500 border-2 border-slate-900 text-[8px] md:text-[10px] font-black text-white shadow-lg animate-bounce">
              {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
            </span>
          )}
        </button>

        {/* ADMIN NOTIFICATION BELL */}
        <button 
          onClick={() => setShowNotifications(true)}
          className={`p-3 md:p-5 md:mb-6 rounded-2xl transition-all active:scale-90 relative ${showNotifications ? 'bg-white text-slate-900 shadow-2xl' : 'text-slate-500 hover:bg-white/10'}`}
        >
          <Bell size={24} className="md:w-7 md:h-7" />
          {notifications?.filter(n => !n.is_read).length > 0 && <span className="absolute top-2 right-2 md:top-4 md:right-4 w-3 h-3 bg-rose-500 rounded-full animate-pulse border-2 border-slate-900"/>}
        </button>

        {/* SMART HELP CENTER ICON */}
        <button 
          onClick={() => setShowHelp(true)}
          className={`p-3 md:p-5 md:mb-6 rounded-2xl transition-all active:scale-90 ${showHelp ? 'bg-emerald-500 text-white shadow-2xl' : 'text-slate-500 hover:bg-white/10'}`}
        >
          <HelpCircle size={24} className="md:w-7 md:h-7" />
        </button>
        
        <div className="md:mt-auto">
          <button onClick={handleHardReset} className="p-3 md:p-5 text-rose-500 hover:bg-rose-500/20 rounded-2xl transition-all">
            <LogOut size={24} className="md:w-7 md:h-7" />
          </button>
        </div>
      </aside>

    <main className="flex-1 p-3 md:p-16 pb-32 md:pb-16 max-w-[90rem] mx-auto w-full relative">
        
       {/* TRUTH REVEALER BADGE */}
        <div className="flex flex-col items-start md:items-end z-40 relative md:absolute md:top-10 md:right-16 mb-6 md:mb-0 text-left md:text-right">
           <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{session?.user?.email}</p>
           <p className="text-sm font-black text-slate-900 uppercase">{profile?.full_name || 'Missing Profile Data'}</p>
           {profile?.assigned_dept ? (
             <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">
               {profile.assigned_dept} DEPARTMENT
             </p>
           ) : (
             <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">
               {profile?.role === 'HEAD_ADMIN' ? 'GLOBAL HEAD ADMIN' : ''}
             </p>
           )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 md:py-60">
            <RefreshCw size={48} className="md:w-16 md:h-16 text-blue-600 animate-spin mb-6" />
            <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Syncing Cloud Database...</p>
          </div>
        ) : syncError ? (
          <div className="flex flex-col items-center justify-center py-40 md:py-60 text-center animate-in fade-in duration-500 px-4">
            <Zap size={48} className="md:w-16 md:h-16 text-rose-500 mb-6" />
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter">Database Sync Failed</h3>
            <div className="bg-rose-50 border-2 border-rose-100 p-4 md:p-6 rounded-2xl mt-4 md:mt-6 w-full max-w-2xl overflow-x-auto">
              <p className="text-rose-600 font-bold font-mono text-[10px] md:text-sm">{syncError}</p>
            </div>
            <p className="text-slate-400 text-[10px] md:text-xs mt-6 font-bold uppercase tracking-widest">Read the error above and fix it in Supabase</p>
            <button onClick={() => window.location.reload()} className="mt-6 bg-slate-900 text-white px-8 md:px-10 py-4 md:py-5 rounded-3xl md:rounded-[2.5rem] font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-2xl hover:bg-blue-600 transition-all active:scale-95">
              Reload Application
            </button>
          </div>
        ) : (
          <>
           {activeTab === "dashboard" ? (
              <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 mt-6 md:mt-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 md:mb-16 md:px-6 gap-4 md:gap-0">
                  <div>
                    <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-1">{profile?.university || 'University System'}</p>
                    <h2 className="text-3xl md:text-7xl font-black text-slate-900 tracking-tighter uppercase italic">Control <span className="text-blue-600">Center</span></h2>
                    <div className={`mt-3 md:mt-4 inline-flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2 rounded-full border-2 text-[9px] md:text-[10px] font-black uppercase ${conflictCount > 0 ? 'bg-rose-500/10 border-rose-500/50 text-rose-500' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500'}`}>
                      <Activity size={12} className={`md:w-3.5 md:h-3.5 ${conflictCount > 0 ? 'animate-pulse' : ''}`} />
                      {conflictCount > 0 ? `${conflictCount} Conflicts Detected` : 'Global System Optimized'}
                    </div>
                  </div>
                  {isHeadAdmin && (
                    <button onClick={() => setDeptModal({ isOpen: true, name: '', code: '', campus: 'Main' })} className="w-full md:w-auto bg-slate-900 text-white px-6 md:px-10 py-3 md:py-6 rounded-xl md:rounded-[2.5rem] font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-2xl hover:bg-blue-600 transition-all active:scale-95">
                      + Add Department
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-8 md:gap-12 mb-16 md:mb-20">
                  <ConflictTable schedule={globalSchedule} />
                  <GlobalResourceMonitor 
                    allDepartments={departments} 
                    globalSchedule={globalSchedule} 
                    allProfiles={allProfiles}
                    onViewProctor={(p) => setViewingProctor(p)}
                  />
                </div>

                 {/* --- SMART WORKSPACE ROUTER --- */}
                {visibleDepartments.length === 0 ? (
                  <div className="text-center py-32 bg-white rounded-[3rem] border-4 border-dashed border-slate-200 mt-8 shadow-sm animate-in fade-in duration-500">
                    <Layers size={64} className="mx-auto text-slate-300 mb-6" />
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">No Workspaces Found</h3>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2 max-w-md mx-auto leading-relaxed">
                      {isHeadAdmin 
                         ? "Click '+ Add Department' above to initialize your university campus." 
                         : "You are not assigned to any active department workspace. Please contact your Head Administrator."}
                    </p>
                  </div>
               ) : !activeDeptId && visibleDepartments.length > 1 ? (
                  <div className="space-y-12">
                    {Object.entries(
                      visibleDepartments.reduce((acc, dept) => {
                        const camp = dept.campus_location || 'Main';
                        if (!acc[camp]) acc[camp] = [];
                        acc[camp].push(dept);
                        return acc;
                      }, {})
                    ).sort(([a], [b]) => a.localeCompare(b)).map(([campusName, depts]) => (
                      <div key={campusName} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        
                        {/* --- CAMPUS HEADER --- */}
                        <div className="flex items-center gap-3 mb-6">
                           <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md"><Layers size={20}/></div>
                           <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{campusName}</h3>
                           <div className="h-1 flex-1 bg-slate-200 rounded-full ml-4 opacity-50"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {depts.map(dept => (
                            <div key={dept.id} onClick={() => setActiveDeptId(dept.id)} className="bg-white p-8 rounded-[2rem] border border-slate-200 hover:border-blue-500 shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col">
                              <div className="flex justify-between items-start mb-6">
                                <div>
                                  <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900 group-hover:text-blue-600 transition-colors">{dept.code}</h3>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{dept.name}</p>
                                </div>
                                <div className="text-right">
                                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Invite Code</span>
                                  <span className="bg-slate-100 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-black tracking-widest border border-slate-200">{dept.invite_code || 'N/A'}</span>
                                </div>
                              </div>
                              
                              <div className="flex gap-4 mt-auto">
                                <div className="bg-slate-50 px-4 py-3 rounded-2xl flex-1 text-center border border-slate-100">
                                  <span className="block text-[9px] font-black text-slate-400 uppercase mb-1">Proctors</span>
                                  <span className="text-xl font-black text-slate-800">{allProfiles.filter(p => p.assigned_dept === dept.code && p.role === 'PROCTOR').length}</span>
                                </div>
                                <div className="bg-slate-50 px-4 py-3 rounded-2xl flex-1 text-center border border-slate-100">
                                  <span className="block text-[9px] font-black text-slate-400 uppercase mb-1">Rooms</span>
                                  <span className="text-xl font-black text-slate-800">{dept.rooms?.length || 0}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                    {/* Only show the Back button for Head Admins who have multiple departments */}
                    {visibleDepartments.length > 1 && (
                      <button onClick={() => setActiveDeptId(null)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200 w-max transition-all active:scale-95">
                        <ArrowLeft size={14} /> Back to Department Grid
                      </button>
                    )}
                    
                    {visibleDepartments.filter(d => d.id === activeDeptId).map((dept) => (
                      <DepartmentCard
                        key={dept.id} dept={dept} role={safeRole} 
                        allProfiles={allProfiles}
                        allDepartments={departments} onUpdate={handleDepartmentUpdate}
                        onDeleteDept={deleteDepartment} globalAvailability={globalAvailability}
                        onEditDept={(id, name, code) => setEditDeptModal({ isOpen: true, id, name, code })}
                        onEditProctor={(p) => setEditStaffModal({ isOpen: true, id: p.id, name: p.full_name || p.name, role: p.role, dept: p.assigned_dept || '' })}
                        onClearSchedule={(dCode, yLevel) => {
                          setConfirmModal({
                            isOpen: true,
                            title: `Wipe Year ${yLevel} Draft?`,
                            text: `This will permanently delete all generated schedules for Year ${yLevel}.`,
                            action: async () => {
                              await supabase.from('schedules').delete().eq('dept_code', dCode).eq('year_level', String(yLevel));
                              await fetchAllData(false);
                              setAppToast({ message: `Year ${yLevel} draft cleared.`, type: "success" });
                            }
                          });
                        }}
                        globalSchedule={globalSchedule}
                        onGenerate={(schedule, dates) => handleScheduleGenerated(schedule, dates, dept.code)}
                        onNotify={sendNotification} 
                        highlightTarget={targetHighlight}
                      />
                    ))}
                  </div>
                )}                     
                       

                {/* --- COLLAPSIBLE MASTER TIMELINE --- */}
                <div className="mt-10 md:mt-16 pt-8 md:pt-10 border-t border-slate-200">
                  <div 
                    onClick={() => setShowMasterTimeline(!showMasterTimeline)}
                    className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200 hover:border-blue-500 shadow-sm hover:shadow-xl transition-all cursor-pointer flex justify-between items-center group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none"></div>
                    <div className="relative z-10">
                      <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Master <span className="text-blue-600">Timeline</span></h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Click to {showMasterTimeline ? 'collapse' : 'expand'} university-wide schedule</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors relative z-10">
                      {showMasterTimeline ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>
                  </div>

                  {showMasterTimeline && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-500 mt-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 px-2 md:px-6 gap-4 md:gap-0">
                        <button onClick={exportGlobalPDF} className="w-full md:w-auto bg-slate-900 text-white px-6 md:px-10 py-3 md:py-4 rounded-xl md:rounded-[2rem] font-black text-[9px] md:text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 md:gap-3 shadow-xl hover:bg-blue-600 active:scale-95 transition-all ml-auto">
                          <Printer size={16} className="md:w-5 md:h-5" /> Export Global PDF
                        </button>
                      </div>
                      
                      {globalSchedule.length > 0 && (
                        <div className="md:hidden flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 px-2 animate-pulse">
                          <ArrowRight size={12} /> Swipe calendar to view more
                        </div>
                      )}

                      <div className="bg-white p-2 md:p-6 rounded-2xl md:rounded-[3rem] shadow-xl border border-slate-200 overflow-x-auto custom-scrollbar">
                        {globalSchedule.length > 0 ? (
                          <div className="min-w-[800px] pr-4">
                            <ScheduleCalendar scheduleData={globalSchedule} examDates={allExamDates} />
                          </div>
                        ) : (
                          <div className="py-20 md:py-32 text-center text-slate-300 font-black uppercase tracking-[0.4em] md:tracking-[0.8em]">
                            <Zap size={48} className="md:w-16 md:h-16 mx-auto mb-4 md:mb-6 opacity-10" /> Timeline Offline
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
             
             <div className="mt-6 md:mt-10">
                <UserRegistry
                  profiles={[
                    ...allProfiles, 
                    ...Array.from(new Set(
                      globalSchedule
                        .filter(s => {
                          if (!s.proctor || s.proctor === 'TBA') return false;
                          const isVerified = allProfiles.some(p => (p.full_name || '').toLowerCase() === s.proctor.toLowerCase());
                          if (isVerified) return false;

                          // Auto-wipe check: only show if the session has NOT ended yet
                          const now = new Date();
                          const todayStr = now.toISOString().split('T')[0];
                          const currentTimeStr = now.toTimeString().substring(0, 5);
                          const isSessionPast = s.exam_date < todayStr || (s.exam_date === todayStr && s.end_time < currentTimeStr);

                          return !isSessionPast;
                        })
                        .map(s => s.proctor)
                    )).map(guestName => ({
                       id: `guest-${guestName}`,
                       full_name: guestName,
                       email: 'External Resource',
                       role: 'GUEST PROCTOR',
                       assigned_dept: 'EXTERNAL',
                       status: 'ACTIVE'
                    }))
                  ]} 
                  onCreate={handleCreateAccount}
                  onBlock={handleBlockUser}
                  onDelete={handleDeleteUser}
                  onApprove={handleApproveUser}
                  onEdit={(p) => setEditStaffModal({ isOpen: true, id: p.id, name: p.full_name || p.name, role: p.role, dept: p.assigned_dept || '' })}
                  currentRole={safeRole}
                  currentUserDept={profile?.assigned_dept}
                  onView={(proctorData) => setViewingProctor(proctorData)}
                />
              </div>
            )}
          </>
        )}

        {/* --- STAFF REGISTRATION MODAL --- */}
        {createModal.isOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-white w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl">
              <div className="flex items-center gap-4 text-blue-600 mb-6">
                <UserPlus size={32} />
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none">Register Staff</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                    {isHeadAdmin ? 'Create Dept Head Account' : 'Create Proctor Account'}
                  </p>
                </div>
              </div>
              
              <form onSubmit={executeCreateAccount} className="space-y-4 mb-2">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Full Name</label>
                  <input required type="text" value={createModal.name} onChange={e=>setCreateModal({...createModal, name: e.target.value})} placeholder="e.g. Jane Doe" className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 transition-all"/>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Email Address</label>
                  <input required type="email" value={createModal.email} onChange={e=>setCreateModal({...createModal, email: e.target.value})} placeholder="staff@accord.edu" className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 transition-all"/>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Temporary Password</label>
                  <input required type="password" value={createModal.pass} onChange={e=>setCreateModal({...createModal, pass: e.target.value})} placeholder="Min. 6 characters" className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 transition-all"/>
                </div>
                
                 {isHeadAdmin && (
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Assign Department Code</label>
                    <input required type="text" value={createModal.dept} onChange={e=>setCreateModal({...createModal, dept: e.target.value.toUpperCase()})} placeholder="e.g. CS (or type 'GLOBAL' for Part-Timers)" className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 transition-all uppercase"/>
                  </div>
                )}
                
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setCreateModal({ isOpen: false, name: '', email: '', pass: '', dept: '' })} className="flex-1 p-4 rounded-xl font-black text-[10px] uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                  <button type="submit" className="flex-[2] p-4 rounded-xl font-black text-[10px] uppercase text-white bg-blue-600 hover:bg-blue-500 shadow-lg transition-colors">Create Account</button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* --- GLOBAL TOAST NOTIFICATION --- */}
        {appToast && (
          <div className={`fixed bottom-4 md:bottom-10 right-4 md:right-10 z-[400] p-4 md:p-6 rounded-2xl shadow-2xl flex items-center gap-3 md:gap-4 text-white font-black text-[10px] md:text-xs uppercase tracking-widest animate-in slide-in-from-bottom-10 md:slide-in-from-right-10 ${appToast.type === 'error' ? 'bg-rose-600' : 'bg-slate-900 border border-blue-500/50'}`}>
            {appToast.type === 'error' ? <AlertCircle size={20}/> : <CheckCircle2 size={20} className="text-emerald-400"/>}
            <span>{appToast.message}</span>
            <button onClick={() => setAppToast(null)} className="ml-auto"><X size={16} className="opacity-50 hover:opacity-100"/></button>
          </div>
        )}

        {/* --- GLOBAL CONFIRMATION MODAL --- */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-white w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl text-center">
              <AlertTriangle className="mx-auto text-rose-500 mb-6" size={48} />
              <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-2">{confirmModal.title}</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-8 leading-relaxed">{confirmModal.text}</p>
              <div className="flex gap-4">
                <button onClick={() => setConfirmModal({ isOpen: false, title: '', text: '', action: null })} className="flex-1 p-4 rounded-xl font-black text-[10px] uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                <button onClick={() => { confirmModal.action(); setConfirmModal({ isOpen: false, title: '', text: '', action: null }); }} className="flex-1 p-4 rounded-xl font-black text-[10px] uppercase text-white bg-rose-500 hover:bg-rose-600 shadow-lg transition-colors">Confirm</button>
              </div>
            </div>
          </div>
        )}
        
{/* --- PENDING APPROVAL MODAL --- */}
        {approvalModal.isOpen && approvalModal.profile && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-white w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                 <UserPlus size={32} />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-2">Staff Request</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 leading-relaxed">
                 <strong className="text-slate-800 text-sm block">{approvalModal.profile.full_name}</strong>
                 Requested to join as {approvalModal.profile.role} {approvalModal.profile.assigned_dept ? `(${approvalModal.profile.assigned_dept})` : ''}
              </p>
              <div className="flex gap-4">
                <button onClick={() => {
                   handleDeclineUser(approvalModal.profile.id);
                   setApprovalModal({ isOpen: false, profile: null });
                }} className="flex-1 p-4 rounded-xl font-black text-[10px] uppercase text-rose-600 bg-rose-50 hover:bg-rose-500 hover:text-white transition-colors">Decline & Remove</button>
                <button onClick={() => {
                   handleApproveUser(approvalModal.profile.id);
                   setApprovalModal({ isOpen: false, profile: null });
                }} className="flex-1 p-4 rounded-xl font-black text-[10px] uppercase text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg transition-colors">Approve Access</button>
              </div>
              <button onClick={() => setApprovalModal({ isOpen: false, profile: null })} className="mt-4 w-full p-4 rounded-xl font-black text-[10px] uppercase text-slate-400 hover:bg-slate-50 transition-colors">Close</button>
            </div>
          </div>
        )}

        {/* --- ADD DEPARTMENT MODAL --- */}
        {deptModal.isOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-white w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl">
              <div className="flex items-center gap-4 text-blue-600 mb-6">
                <Layers size={32} />
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none">Add Department</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                    Initialize a new system workspace
                  </p>
                </div>
              </div>
              
            <form onSubmit={executeAddDepartment} className="space-y-4 mb-2">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Department Name</label>
                  <input required type="text" value={deptModal.name} onChange={e=>setDeptModal({...deptModal, name: e.target.value})} placeholder="e.g. Computer Science" className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 transition-all"/>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Unique Department Code</label>
                  <input required type="text" value={deptModal.code} onChange={e=>setDeptModal({...deptModal, code: e.target.value.toUpperCase()})} placeholder="e.g. CS" className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 transition-all uppercase"/>
                </div>
                
               {/* --- NEW BRANCH INPUT GOES HERE --- */}
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Branch / Location</label>
                  <input required type="text" value={deptModal.campus} onChange={e=>setDeptModal({...deptModal, campus: e.target.value})} placeholder="e.g. Muzon" className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 transition-all"/>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setDeptModal({ isOpen: false, name: '', code: '', campus: 'Main' })} className="flex-1 p-4 rounded-xl font-black text-[10px] uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                  <button type="submit" className="flex-[2] p-4 rounded-xl font-black text-[10px] uppercase text-white bg-blue-600 hover:bg-blue-500 shadow-lg transition-colors">Create Workspace</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- EDIT STAFF MODAL --- */}
        {editStaffModal.isOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-white w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl">
              <div className="flex items-center gap-4 text-indigo-600 mb-6">
                <Edit2 size={32} />
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none">Edit Staff</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Update profile details</p>
                </div>
              </div>
              <form onSubmit={executeEditStaff} className="space-y-4 mb-2">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Full Name</label>
                  <input required type="text" value={editStaffModal.name} onChange={e=>setEditStaffModal({...editStaffModal, name: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 transition-all"/>
                </div>
                <select value={editStaffModal.role} onChange={e=>setEditStaffModal({...editStaffModal, role: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-xs border-2 border-slate-100 outline-none focus:border-indigo-500 transition-all cursor-pointer appearance-none">
                  <option value="PROCTOR">Proctor</option>
                  <option value="DEPT_ADMIN">Department Head</option>
                  <option value="HEAD_ADMIN">Global Head Admin</option>
                </select>
                 {editStaffModal.role !== 'HEAD_ADMIN' && (
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Department Code</label>
                    <input required type="text" value={editStaffModal.dept} onChange={e=>setEditStaffModal({...editStaffModal, dept: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 transition-all uppercase"/>
                  </div>
                )}
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setEditStaffModal({ isOpen: false, id: '', name: '', role: '', dept: '' })} className="flex-1 p-4 rounded-xl font-black text-[10px] uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                  <button type="submit" className="flex-[2] p-4 rounded-xl font-black text-[10px] uppercase text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg transition-colors">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- EDIT DEPARTMENT MODAL --- */}
        {editDeptModal.isOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-white w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl">
              <div className="flex items-center gap-4 text-blue-600 mb-6">
                <Layers size={32} />
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none">Edit Workspace</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Update department details</p>
                </div>
              </div>
              <form onSubmit={executeEditDept} className="space-y-4 mb-2">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Department Name</label>
                  <input required type="text" value={editDeptModal.name} onChange={e=>setEditDeptModal({...editDeptModal, name: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 transition-all"/>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Unique Department Code</label>
                  <input required type="text" value={editDeptModal.code} onChange={e=>setEditDeptModal({...editDeptModal, code: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 transition-all uppercase"/>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setEditDeptModal({ isOpen: false, id: '', name: '', code: '' })} className="flex-1 p-4 rounded-xl font-black text-[10px] uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                  <button type="submit" className="flex-[2] p-4 rounded-xl font-black text-[10px] uppercase text-white bg-blue-600 hover:bg-blue-500 shadow-lg transition-colors">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
