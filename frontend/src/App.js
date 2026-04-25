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
  RefreshCw, Globe, Calendar, List, Users, Shield, UserPlus, Trash2, Archive, CheckCircle, Plus, Clock, AlertOctagon, Download, Bell, BellRing, AlertTriangle, X, Upload, CheckCircle2, AlertCircle, HelpCircle, ArrowRight, MessageSquare, Send, Search, ArrowLeft, Reply, Edit2, MoreVertical
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
        .order('created_at', { ascending: true }); // Newest at bottom
      if (msgData) setMessages(msgData);

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
            setMessages(prev => [...prev, m]); // Append to bottom
            
            // Notify if it's not from me
            if (m.sender_id !== profile.id) {
              setLocalToast(`New message from ${m.sender_name}`);
              setTimeout(() => setLocalToast(null), 4000);

              // Track unread DMs if we aren't currently chatting with them
              if (m.receiver_id === profile.id) {
                 setUnreadDMs(prev => {
                    if (chatMode !== 'dm' || dmTarget?.id !== m.sender_id) {
                       return { ...prev, [m.sender_id]: (prev[m.sender_id] || 0) + 1 };
                    }
                    return prev;
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

        const createPayload = (u, titleMsg, customMessage = text) => {
          if (u.role === 'HEAD_ADMIN') return { target_role: 'HEAD_ADMIN', title: titleMsg, message: customMessage, type: 'info' };
          if (u.role === 'DEPT_ADMIN') return { target_dept: u.assigned_dept, title: titleMsg, message: customMessage, type: 'info' };
          return { target_user_id: u.id, title: titleMsg, message: customMessage, type: 'info' };
        };

        if (chatMode === 'dm' && dmTarget) {
          payloads.push({ target_user_id: dmTarget.id, title: `New DM from ${profile.full_name}`, message: "You have a new private message.", type: 'info' });
        } else if (activeThread) {
          if (activeThread.sender_id !== profile.id) {
            payloads.push({ target_user_id: activeThread.sender_id, title: `New Reply from ${profile.full_name}`, message: text, type: 'info' });
          }
        } else if (chatMode === 'global' && isAdmin && !activeThread) {
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
             {Object.values(unreadDMs).some(count => count > 0) && <span className="absolute top-3 right-8 w-2 h-2 bg-rose-500 rounded-full animate-pulse"/>}
          </button>
        </div>
      )}

      {activeThread && (
        <div className="bg-indigo-50 p-4 border-b-2 border-indigo-100 flex items-center gap-3 shadow-sm z-10 cursor-pointer hover:bg-indigo-100 transition-colors" onClick={() => setActiveThread(null)}>
          <button className="p-2 bg-white text-indigo-500 rounded-xl"><ArrowLeft size={16}/></button>
          <div><h4 className="text-sm font-black text-indigo-900 uppercase">Thread View</h4><span className="text-[9px] font-black uppercase text-indigo-500">Back to main feed</span></div>
        </div>
      )}

      {!activeThread && chatMode === 'dm' && dmTarget && (
        <div className="bg-white p-4 border-b-2 flex items-center gap-3 shadow-sm z-10">
          <button onClick={() => { setChatMode('directory'); setDmTarget(null); }} className="p-2 bg-slate-100 text-slate-500 rounded-xl"><ArrowLeft size={16}/></button>
          <div><h4 className="text-sm font-black text-slate-900 uppercase">{dmTarget.full_name}</h4><span className="text-[9px] font-black uppercase text-indigo-500">{dmTarget.role}</span></div>
        </div>
      )}
      
      {(chatMode === 'global' || chatMode === 'dm') && (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar bg-slate-50">
          
          {activeThread && (
            <div className="bg-white p-4 rounded-3xl border-2 border-indigo-200 shadow-md mb-6">
               <span className="text-[10px] font-black text-indigo-700 uppercase mb-1 block">{activeThread.sender_name}</span>
               <p className="text-sm font-bold text-slate-800">{activeThread.text}</p>
               <span className="text-[8px] font-black text-slate-400 uppercase mt-2 block border-t pt-2">Original Post</span>
            </div>
          )}

          {displayedMessages.length === 0 && <div className="text-center py-20 text-slate-400 uppercase text-xs font-black tracking-widest">No Messages</div>}
          
          {displayedMessages.map(m => {
            const isMe = m.sender_id === profile.id;
            const replyCount = messages.filter(r => r.parent_id === m.id).length;

            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative`}>
                {!isMe && <span className="text-[10px] font-black text-slate-700 uppercase mb-1 ml-1">{m.sender_name} <span className="text-[8px] text-slate-400 ml-1 font-bold">({m.sender_role})</span></span>}
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
          {systemUsers.filter(u => u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())).map(u => (
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
const NotificationPanel = ({ notifications, onClose, onMarkRead }) => {
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
          <div key={n.id} onClick={() => onMarkRead(n.id)} className={`p-5 md:p-6 rounded-[2rem] border-2 cursor-pointer transition-all ${n.is_read ? 'bg-white border-slate-100 opacity-60' : n.type === 'urgent' ? 'bg-rose-50 border-rose-200 shadow-md hover:border-rose-400 hover:shadow-lg' : 'bg-white border-blue-200 shadow-lg hover:border-blue-400'}`}>
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
const UserRegistry = ({ profiles, onBlock, onDelete, onCreate, onApprove, currentRole, currentUserDept, onView }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const isHead = currentRole === 'HEAD_ADMIN';

  const filteredProfiles = profiles.filter(p => 
    (p.full_name || p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div className="mb-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search staff globally by name or email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 p-4 pl-12 rounded-2xl font-black text-[10px] md:text-xs border-2 border-slate-100 outline-none focus:border-blue-500"
          />
        </div>

        <div className="md:hidden flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 animate-pulse">
          <ArrowRight size={12} /> Swipe table to view actions
        </div>

        <div className="overflow-x-auto custom-scrollbar">
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
                  </td>
                  <td className="bg-slate-50 p-6 border-y-2 border-slate-100">
                    <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg border-2 ${p.role?.trim().toUpperCase() === 'HEAD_ADMIN' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-900 border-slate-200'}`}>
                      {p.role}
                    </span>
                  </td>
                  <td className="bg-slate-50 p-6 border-y-2 border-slate-100 font-black text-[10px] text-blue-600 uppercase italic">
                    {p.assigned_dept || "Global Access"}
                  </td>
                  <td className="bg-slate-50 p-6 border-y-2 border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${p.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : p.status === 'PENDING' ? 'bg-amber-500 animate-bounce' : 'bg-rose-500'}`} />
                      <span className="text-[10px] font-black uppercase">{p.status}</span>
                    </div>
                  </td>
                  <td className="bg-slate-50 p-6 rounded-r-[2rem] border-y-2 border-r-2 border-slate-100 text-right">
                    <div className="flex justify-end gap-2">
                      
                      {/* NEW: Approve Button for Pending Users */}
                      {p.status === 'PENDING' && (isHead || p.assigned_dept === currentUserDept) && (
                        <button onClick={() => onApprove(p.id)} className="p-3 bg-white hover:bg-emerald-500 hover:text-white rounded-xl border-2 border-emerald-100 transition-all text-emerald-500 shadow-sm" title="Approve Request">
                          <CheckCircle2 size={16} />
                        </button>
                      )}

                      {p.role?.trim().toUpperCase() === 'PROCTOR' && p.status === 'ACTIVE' && (
                        <button onClick={() => onView(p)} className="p-3 bg-white hover:bg-blue-600 hover:text-white rounded-xl border-2 border-slate-100 transition-all text-slate-400" title="View Dashboard">
                          <LayoutDashboard size={16} />
                        </button>
                      )}
                      
                      {(isHead || p.assigned_dept === currentUserDept) && (
                        <>
                          <button onClick={() => onBlock(p.id, p.status)} className="p-3 bg-white hover:bg-orange-500 hover:text-white rounded-xl border-2 border-slate-100 transition-all text-slate-400" title={p.status === 'ACTIVE' ? 'Block User' : 'Unblock User'}>
                            <Lock size={16} />
                          </button>
                          <button onClick={() => onDelete(p.id)} className="p-3 bg-white hover:bg-rose-600 hover:text-white rounded-xl border-2 border-slate-100 transition-all text-slate-400" title="Delete User">
                            <Trash2 size={16} />
                          </button>
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
const AvailabilityLogBook = ({ profile, globalAvailability, onAdd, onBulkAdd, onDelete, readOnly = false, showToast }) => {
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const fileInputRef = useRef(null);

  const myAvails = globalAvailability.filter(a => a.proctor_id === profile.id);

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
      note: "Standard Log"            
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
                  note: "Bulk Excel Import" 
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
    <div className="bg-white rounded-3xl md:rounded-[3rem] p-6 md:p-8 border-2 border-slate-100 shadow-xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 mb-6">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <List size={16} className="text-blue-600"/> {readOnly ? 'Logged Availability' : 'Availability Log Book'}
        </h2>
        
        {!readOnly && (
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
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full bg-white p-4 rounded-2xl font-black text-xs border border-slate-200 outline-none focus:border-blue-500" />
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
        {myAvails.length === 0 ? (
           <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-3xl">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Availability Logged</p>
           </div>
        ) : myAvails.map(avail => (
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
const ProctorDashboard = ({ profile, globalSchedule, allExamDates, globalAvailability, onAddAvailability, onBulkAddAvailability, onDeleteAvailability, isViewMode, onCloseView, notifications, onShowNotify, onFlagIssue, onShowHelp, onShowChat, allProfiles, onViewProctor }) => {
  const mySchedule = globalSchedule.filter(s => s.proctor === profile.full_name);
  
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
      if (!mySchedule || mySchedule.length === 0) {
        showToast("You have no assignments to export!", "error");
        return;
      }
      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(16);
      doc.text(`Official Proctor Itinerary: ${profile?.full_name || 'Staff'}`, 14, 20);

      const tableColumn = ["Date", "Time", "Dept", "Subject", "Section", "Room"];
      const tableRows = [];

      const sorted = [...mySchedule].sort((a, b) => new Date(a.exam_date || 0) - new Date(b.exam_date || 0) || (a.start_time || "").localeCompare(b.start_time || ""));

      sorted.forEach(item => {
        tableRows.push([
          item.exam_date || "N/A",
          `${item.start_time ? formatTime(item.start_time) : "--:--"} - ${item.end_time ? formatTime(item.end_time) : "--:--"}`,
          item.dept_code || "N/A",
          `${item.subject_code || "N/A"} - ${item.subject_name || "N/A"}`,
          item.section || "N/A",
          item.room || "N/A"
        ]);
      });

      autoTable(doc, { head: [tableColumn], body: tableRows, startY: 30, theme: 'grid', styles: { fontSize: 10, cellPadding: 5 }, headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] } });
      doc.save(`Accord_Itinerary_${(profile?.full_name || 'Proctor').replace(/\s+/g, '_')}.pdf`);
      showToast("PDF Itinerary Downloaded!");
    } catch (err) { showToast("SYSTEM ERROR: " + err.message, "error"); }
  };

  const handleExportExcel = () => {
    try {
      if (!mySchedule || mySchedule.length === 0) return showToast("No assignments to export!", "error");
      const headers = ["Date,Time,Department,Subject Code,Subject Name,Section,Room"];
      const sorted = [...mySchedule].sort((a, b) => new Date(a.exam_date || 0) - new Date(b.exam_date || 0) || (a.start_time || "").localeCompare(b.start_time || ""));
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
      
      {toast && (
        <div className={`fixed bottom-4 md:bottom-10 right-4 md:right-10 z-[200] p-4 md:p-6 rounded-2xl shadow-2xl flex items-center gap-3 md:gap-4 text-white font-black text-[10px] md:text-xs uppercase tracking-widest animate-in slide-in-from-bottom-10 md:slide-in-from-right-10 ${toast.type === 'error' ? 'bg-rose-600' : 'bg-slate-900 border border-blue-500/50'}`}>
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
            <p className="text-xs font-bold text-blue-400 uppercase">{profile?.full_name}</p>
            {profile?.assigned_dept && <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mt-1">{profile.assigned_dept} DEPARTMENT</p>}
          </div>
          
          <div className="flex gap-2">
            {!isViewMode && (
              <>
                <button onClick={onShowChat} className="bg-white/10 hover:bg-indigo-500 text-white p-2.5 rounded-xl transition-all relative"><MessageSquare size={18} /></button>
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
              {searchQuery && filteredDirectory.length > 0 && (
                <div className="absolute top-full mt-2 left-0 w-full bg-white border-2 border-slate-100 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar z-50">
                  {filteredDirectory.map(p => (
                    <div key={p.id} onClick={() => { onViewProctor(p); setSearchQuery(""); }} className="p-4 border-b border-slate-50 hover:bg-blue-50 cursor-pointer flex justify-between items-center group transition-all">
                       <div><p className="text-xs font-black text-slate-900 uppercase group-hover:text-blue-600 transition-colors">{p.full_name}</p><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{p.assigned_dept || 'Global System'}</p></div>
                       <button className="bg-blue-100 text-blue-600 p-3 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm"><LayoutDashboard size={14} /></button>
                    </div>
                  ))}
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
          <div className="lg:col-span-1 bg-slate-900 rounded-3xl md:rounded-[3rem] p-6 md:p-8 text-white shadow-2xl flex flex-col h-[500px] md:h-auto">
            <div className="mb-6"><h2 className="text-xs md:text-sm font-black uppercase tracking-widest text-blue-400 flex items-center gap-2"><Calendar size={16}/> {isViewMode ? "Their Assignments" : "My Assignments"}</h2></div>
            
            <div className="space-y-4 flex-1 overflow-y-auto pr-2 mb-6 custom-scrollbar">
              {mySchedule.length === 0 ? (
                <p className="text-slate-500 text-xs italic text-center py-10 border-2 border-dashed border-white/10 rounded-2xl">No assignments found.</p>
              ) : mySchedule.map((s, i) => {
                const isVerified = globalAvailability.some(a => a.proctor_id === profile.id && a.exam_date === s.exam_date && (s.start_time < a.end_time && s.end_time > a.start_time));
                const isPendingRequest = !isVerified && !s.flagged && !isViewMode;

                return (
                  <div key={i} className={`p-4 rounded-2xl border transition-all ${s.flagged ? 'bg-rose-500/10 border-rose-500/30' : 'bg-white/5 border-white/10 hover:border-blue-500/50'}`}>
                    {isPendingRequest && (
                      <div className="mb-4 bg-amber-500/20 border border-amber-500/50 p-4 rounded-xl">
                        <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Users size={14} className="animate-pulse"/> Reliever Request</p>
                        <p className="text-[10px] font-bold text-amber-100 mb-4 leading-relaxed">You have not logged availability for this slot. Do you accept this emergency assignment?</p>
                        <div className="flex gap-2">
                          <button onClick={() => {
                            const fStart = s.start_time.length === 5 ? `${s.start_time}:00` : s.start_time;
                            const fEnd = s.end_time.length === 5 ? `${s.end_time}:00` : s.end_time;
                            onAddAvailability({ proctor_id: profile.id, proctor_name: profile.full_name, dept_code: profile.assigned_dept, exam_date: s.exam_date, start_time: fStart, end_time: fEnd, is_emergency_flag: false, note: "Accepted Reliever Request" });
                            showToast("Request Accepted! Schedule verified.", "success");
                          }} className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black text-[9px] uppercase py-2.5 rounded-lg transition-all active:scale-95 shadow-lg">Accept</button>
                          <button onClick={() => setDeclineModal({ isOpen: true, scheduleId: s.id, subjectCode: s.subject_code, deptCode: s.dept_code, note: '' })} className="flex-1 bg-slate-800 hover:bg-rose-500 text-white font-black text-[9px] uppercase py-2.5 rounded-lg transition-all active:scale-95 border border-slate-700">Decline</button>
                        </div>
                      </div>
                    )}
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
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-auto pt-6 border-t border-white/10">
              <button onClick={handleExportExcel} className="w-full sm:flex-1 p-3 md:p-4 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-2xl font-black text-[9px] md:text-[10px] uppercase transition-all flex justify-center items-center gap-2"><Download size={16} /> <span className="sm:hidden">Export Excel</span></button>
              <button onClick={handleExportPDF} className="w-full sm:flex-[3] p-3 md:p-4 bg-blue-600 text-white hover:bg-blue-500 rounded-2xl font-black text-[9px] md:text-[10px] uppercase shadow-lg transition-all flex justify-center items-center gap-2"><Printer size={16} /> PDF Itinerary</button>
            </div>
          </div>
          
          <div className="lg:col-span-2">
             <AvailabilityLogBook profile={profile} globalAvailability={globalAvailability} onAdd={onAddAvailability} onBulkAdd={onBulkAddAvailability} onDelete={onDeleteAvailability} readOnly={isViewMode} showToast={showToast} />
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
            <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Please provide a reason. This instantly alerts your Dept Head.</p>
            <textarea value={declineModal.note} onChange={(e) => setDeclineModal({...declineModal, note: e.target.value})} placeholder="e.g. Schedule conflict, out of town..." className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-rose-500 h-24 md:h-32 resize-none mb-6 transition-all" />
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <button onClick={() => setDeclineModal({ isOpen: false, scheduleId: null, subjectCode: '', deptCode: '', note: '' })} className="w-full sm:flex-1 p-4 rounded-xl font-black text-[10px] uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={() => { onFlagIssue(declineModal.scheduleId, `DECLINED RELIEVER REQUEST: ${declineModal.note}`, declineModal.deptCode, declineModal.subjectCode); setDeclineModal({ isOpen: false, scheduleId: null, subjectCode: '', deptCode: '', note: '' }); showToast("Assignment Declined. Admins have been notified.", "success"); }} disabled={!declineModal.note} className="w-full sm:flex-1 p-4 rounded-xl font-black text-[10px] uppercase text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-50 transition-colors shadow-lg">Submit Decline</button>
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
  const [authMode, setAuthMode] = useState('login');

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
  const [createModal, setCreateModal] = useState({ isOpen: false, name: '', email: '', pass: '', dept: '' });
  const [appToast, setAppToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', text: '', action: null });

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

  const fetchNotifications = async () => {
    if (!profile) return;
    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });
    if (isHeadAdmin) query = query.or(`target_role.eq.HEAD_ADMIN,target_user_id.eq.${profile.id}`);
    else if (isDeptAdmin) query = query.or(`target_dept.eq.${profile.assigned_dept},target_user_id.eq.${profile.id}`);
    else query = query.eq('target_user_id', profile.id);

    const { data } = await query;
    if (data) setNotifications(data);
  };

  const fetchAllData = async (showSpinner = true) => {
    if (showSpinner) { setLoading(true); setSyncError(null); }
    try {
      const fetchPromise = Promise.all([
        supabase.from('departments').select('*').order('name', { ascending: true }),
        supabase.from('schedules').select('*'),
        supabase.from('proctor_availability').select('*'),
        supabase.from('profiles').select('*')
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
    const { data } = await supabase.from('profiles').select('*');
    setAllProfiles(data || []);
  };

  // --- BULLETPROOF AUTHENTICATION ENGINE ---
  useEffect(() => {
    let isMounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted) return;
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (!currentSession) {
          setSession(null); setProfile(null); setLoading(false); return;
        }
        setSession(currentSession); setLoading(true);

        let fetchedProfile = null;
        for (let i = 0; i < 4; i++) {
           const { data: pData } = await supabase.from('profiles').select('*').eq('id', currentSession.user.id).maybeSingle();
           if (pData) { fetchedProfile = pData; break; }
           await new Promise(res => setTimeout(res, 1000));
        }

        if (fetchedProfile) {
           setProfile(fetchedProfile);
           await fetchAllData(false); 
        } else {
           console.error("Profile completely disconnected from database.");
        }
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setSession(null); setProfile(null); setDepartments([]); setGlobalSchedule([]); setGlobalAvailability([]); setLoading(false);
      }
    });
    return () => { isMounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => { if (profile) fetchProfiles(); fetchNotifications(); }, [profile]);

  useEffect(() => {
    if (!session) return;
    const dbChannel = supabase.channel('system-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, () => fetchAllData(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, () => fetchAllData(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proctor_availability' }, () => fetchAllData(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchProfiles())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(dbChannel); };
  }, [session, profile]);

  const conflictCount = useMemo(() => globalSchedule.filter(s => s.hasConflict).length, [globalSchedule]);
  const visibleDepartments = useMemo(() => {
    if (isHeadAdmin) return departments;
    return departments.filter(d => d.code === profile?.assigned_dept);
  }, [departments, profile, isHeadAdmin]);

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
        id: data.user.id, full_name: name, role: isHeadAdmin ? 'DEPT_ADMIN' : 'PROCTOR', assigned_dept: d, status: 'ACTIVE' 
      }]);
      sendNotification(null, 'HEAD_ADMIN', null, 'Account Created', `Created account for ${name}.`);
      setAppToast({ message: "Account successfully created!", type: 'success' });
      setCreateModal({ isOpen: false, name: '', email: '', pass: '', dept: '' });
      fetchProfiles();
    }
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
        const targetProfile = allProfiles.find(p => p.id === id);
        await supabase.from('profiles').delete().eq('id', id);
        await supabase.from('proctor_availability').delete().eq('proctor_id', id);

        if (targetProfile && targetProfile.assigned_dept) {
          const targetDept = departments.find(d => d.code === targetProfile.assigned_dept);
          if (targetDept && targetDept.proctors) {
            const updatedProctors = targetDept.proctors.filter(p => p.name !== targetProfile.full_name?.trim().toUpperCase());
            await supabase.from('departments').update({ proctors: updatedProctors }).eq('id', targetDept.id);
          }
        }
        await sendNotification(null, 'HEAD_ADMIN', null, 'Account Deleted', `A system account was permanently deleted.`, 'urgent');
        await fetchAllData(false);
        setAppToast({ message: "Account permanently deleted.", type: "success" });
      }
    });
  };

  const executeRegistration = async () => {
    setLoading(true);
    try {
      if (regRole !== 'HEAD_ADMIN' && !regDept.trim()) throw new Error("Department Code is required.");
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
      if (error) throw error;
      
      if (data?.user) {
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'HEAD_ADMIN');
        if (count === 0) {
          await supabase.from('profiles').upsert([{ id: data.user.id, full_name: fullName, role: 'HEAD_ADMIN', status: 'ACTIVE' }]);
          setAppToast({ message: "First user auto-promoted to Head Admin!", type: "success" });
          setTimeout(() => window.location.reload(), 2000);
        } else {
          await supabase.from('profiles').upsert([{ 
            id: data.user.id, full_name: fullName, role: regRole, assigned_dept: regRole === 'HEAD_ADMIN' ? null : regDept.toUpperCase(), status: 'PENDING' 
          }]);
          
          if (regRole === 'PROCTOR') await sendNotification(regDept.toUpperCase(), 'DEPT_ADMIN', null, 'New Proctor Request', `${fullName} requested to join ${regDept.toUpperCase()}.`, 'info');
          else await sendNotification(null, 'HEAD_ADMIN', null, 'New Admin Request', `${fullName} requested access as a ${regRole}.`, 'info');
          
          await supabase.auth.signOut();
          setAuthMode('success'); 
          setEmail(''); setPassword(''); setFullName(''); setRegDept('');
        }
      }
    } catch (err) { setAppToast({ message: err.message, type: "error" }); } finally { setLoading(false); }
  };

  const handleApproveUser = async (id) => {
    await supabase.from('profiles').update({ status: 'ACTIVE' }).eq('id', id);
    await sendNotification(null, null, id, 'Account Approved', 'Your account has been approved. You can now access the system.');
    setAppToast({ message: "Account approved successfully.", type: "success" });
    fetchProfiles();
  };

  async function handleDepartmentUpdate(actionType, payload) {
    if (['manual_override', 'lock_and_save', 'schedule_sync'].includes(actionType)) {
      if (!Array.isArray(payload) || payload.length === 0) return false;
      const dataToSync = payload.map(item => {
        const { hasConflict, conflictType, ...validData } = item;
        if (validData.id && String(validData.id).includes('temp')) delete validData.id;
        if (validData.tempId) delete validData.tempId;
        return { ...validData, year_level: String(validData.year_level), flagged: Boolean(validData.flagged ?? false), isManualProctor: Boolean(validData.isManualProctor ?? false), original_proctor: validData.original_proctor || validData.proctor };
      });
      await supabase.from('schedules').upsert(dataToSync, { onConflict: 'id' });
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
      const formattedData = newAssignments.map(item => ({
        dept_code: deptCode, year_level: String(item.year_level), section: item.section || 'A', subject_code: item.subject_code || 'N/A',
        subject_name: item.subject_name || 'N/A', proctor: item.proctor, room: item.room, exam_date: item.exam_date,
        start_time: item.start_time, end_time: item.end_time, flagged: false, flagNote: "", isManualProctor: false
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

  const addDepartment = async () => {
    const name = window.prompt("Enter Department Name:");
    const code = window.prompt("Enter UNIQUE Dept Code:");
    if (!name || !code) return;
    const { error } = await supabase.from('departments').insert([{ name, code: code.toUpperCase() }]);
    if (error) alert(error.message); 
    else {
      await sendNotification(null, 'HEAD_ADMIN', null, 'New Department', `Created department ${code.toUpperCase()}.`, 'info');
      await fetchAllData(false);
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
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Staff Registration</p>
              
              <div className="space-y-3 mb-6">
                <input type="text" placeholder="Full Name (e.g. Juan Dela Cruz)" value={fullName} onChange={e=>setFullName(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-xs border-2 border-transparent focus:border-blue-500 outline-none transition-all"/>
                <input type="email" placeholder="Work Email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-xs border-2 border-transparent focus:border-blue-500 outline-none transition-all"/>
                <input type="password" placeholder="Create Password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-xs border-2 border-transparent focus:border-blue-500 outline-none transition-all"/>
                
                <select value={regRole} onChange={e=>setRegRole(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-xs border-2 border-transparent focus:border-blue-500 outline-none transition-all cursor-pointer appearance-none">
                  <option value="PROCTOR">Proctor</option>
                  <option value="DEPT_ADMIN">Department Head</option>
                  <option value="HEAD_ADMIN">Global Head Admin</option>
                </select>
                
                {regRole !== 'HEAD_ADMIN' && (
                  <input type="text" placeholder="Department Code (e.g. CS)" value={regDept} onChange={e=>setRegDept(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-xs border-2 border-transparent focus:border-blue-500 outline-none transition-all uppercase"/>
                )}
              </div>
              
              <button onClick={executeRegistration} disabled={loading} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-500 disabled:opacity-50 transition-all mb-6 shadow-xl active:scale-95">
                {loading ? "Processing..." : "Submit Request"}
              </button>
              
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

  // --- EMERGENCY REPAIR SCREEN ---
  if (!profile && !loading) {
    const forceRepairProfile = async (role, deptCode) => {
       const { error } = await supabase.from('profiles').upsert([{
          id: session.user.id,
          full_name: session.user.email.split('@')[0].toUpperCase(),
          role: role,
          assigned_dept: role === 'HEAD_ADMIN' ? null : deptCode?.toUpperCase(),
          status: 'ACTIVE'
       }]);
       
       if (error) {
          alert("CRITICAL ERROR: Supabase is blocking this write. Go to Supabase -> Table Editor -> profiles -> Disable RLS.");
       } else {
          window.location.reload();
       }
    };

    return (
       <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 md:p-6 flex-col">
          <div className="bg-white p-8 md:p-12 rounded-3xl md:rounded-[3rem] max-w-[90%] md:max-w-md w-full shadow-2xl text-center animate-in fade-in zoom-in duration-500">
             <AlertOctagon className="mx-auto text-rose-500 mb-6" size={48} />
             <h2 className="text-xl md:text-2xl font-black uppercase text-slate-900 mb-2">Profile Disconnected</h2>
             <p className="text-[10px] md:text-xs text-slate-500 mb-8 font-bold leading-relaxed">Your database lost the link to your role. Use this emergency override to force your account back into the system.</p>
             
             <select id="repairRole" className="w-full bg-slate-50 p-4 md:p-5 rounded-2xl mb-4 text-xs font-black uppercase border-2 border-slate-100 outline-none focus:border-blue-500">
               <option value="HEAD_ADMIN">Head Admin</option>
               <option value="DEPT_ADMIN">Department Head</option>
               <option value="PROCTOR">Proctor</option>
             </select>
             
             <input id="repairDept" placeholder="Dept Code (Leave blank if Head Admin)" className="w-full bg-slate-50 p-4 md:p-5 rounded-2xl mb-6 md:mb-8 text-xs font-black uppercase border-2 border-slate-100 outline-none focus:border-blue-500" />
             
             <button onClick={() => {
                const r = document.getElementById('repairRole').value;
                const d = document.getElementById('repairDept').value;
                forceRepairProfile(r, d);
             }} className="w-full bg-blue-600 hover:bg-blue-500 text-white p-4 md:p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95">
               Force Connection
             </button>
             <button onClick={handleHardReset} className="w-full mt-4 md:mt-6 text-slate-400 p-2 font-black uppercase text-[9px] hover:text-rose-500 transition-all">Log Out</button>
          </div>
       </div>
    );
  }

  if (viewingProctor) {
    return (
      <ProctorDashboard 
        profile={viewingProctor} 
        globalSchedule={globalSchedule} 
        allExamDates={allExamDates} 
        globalAvailability={globalAvailability} 
        isViewMode={true}
        onCloseView={() => setViewingProctor(null)}
      />
    );
  }

  if (isProctor) {
    return (
      <>
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
          onShowChat={() => setShowChat(true)}
          onFlagIssue={handleFlagIssue}
          
          // --- NEW PROPS PASSED HERE ---
          allProfiles={allProfiles}
          onViewProctor={(p) => setViewingProctor(p)}
          // -----------------------------
        />
        {showNotifications && <NotificationPanel notifications={notifications} onClose={() => setShowNotifications(false)} onMarkRead={markNotificationRead} />}
        {showHelp && <HelpCenter role={safeRole} onClose={() => setShowHelp(false)} />}
        {showChat && <ChatPanel profile={profile} onClose={() => setShowChat(false)} onViewProctor={(p) => { setShowChat(false); setViewingProctor(p); }} />}
      </>
    );
  }
  

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
      
     {/* GLOBAL OVERLAYS */}
      {showNotifications && <NotificationPanel notifications={notifications} onClose={() => setShowNotifications(false)} onMarkRead={markNotificationRead} />}
      {showHelp && <HelpCenter role={safeRole} onClose={() => setShowHelp(false)} />}
      {showChat && <ChatPanel profile={profile} onClose={() => setShowChat(false)} />}

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
          onClick={() => setShowChat(true)}
          className={`p-3 md:p-5 md:mb-6 rounded-2xl transition-all active:scale-90 ${showChat ? 'bg-indigo-500 text-white shadow-2xl' : 'text-slate-500 hover:bg-white/10'}`}
        >
          <MessageSquare size={24} className="md:w-7 md:h-7" />
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
                    <h2 className="text-3xl md:text-7xl font-black text-slate-900 tracking-tighter uppercase italic">Control <span className="text-blue-600">Center</span></h2>
                    <div className={`mt-3 md:mt-4 inline-flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2 rounded-full border-2 text-[9px] md:text-[10px] font-black uppercase ${conflictCount > 0 ? 'bg-rose-500/10 border-rose-500/50 text-rose-500' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500'}`}>
                      <Activity size={12} className={`md:w-3.5 md:h-3.5 ${conflictCount > 0 ? 'animate-pulse' : ''}`} />
                      {conflictCount > 0 ? `${conflictCount} Conflicts Detected` : 'Global System Optimized'}
                    </div>
                  </div>
                  {isHeadAdmin && (
                    <button onClick={addDepartment} className="w-full md:w-auto bg-slate-900 text-white px-6 md:px-10 py-3 md:py-6 rounded-xl md:rounded-[2.5rem] font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-2xl hover:bg-blue-600 transition-all active:scale-95">
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

                <div className="space-y-16 md:space-y-24">
                  {visibleDepartments.map((dept) => (
                    <DepartmentCard
                      key={dept.id} dept={dept} role={safeRole} 
                      allProfiles={allProfiles}
                      allDepartments={departments} onUpdate={handleDepartmentUpdate}
                      onDeleteDept={deleteDepartment} globalAvailability={globalAvailability}
                      onClearSchedule={async (dCode, yLevel) => {
                        if (window.confirm(`Clear schedules?`)) {
                          await supabase.from('schedules').delete().eq('dept_code', dCode).eq('year_level', String(yLevel));
                          await fetchAllData(false);
                        }
                      }}
                      globalSchedule={globalSchedule}
                      onGenerate={(schedule, dates) => handleScheduleGenerated(schedule, dates, dept.code)}
                      onNotify={sendNotification} 
                    />
                  ))}
                </div>

                <div className="mt-12 md:mt-40 pt-8 md:pt-24 border-t-8 border-slate-900/5">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 md:mb-12 px-2 md:px-10 gap-4 md:gap-0">
                    <h2 className="text-3xl md:text-7xl font-black text-slate-900 tracking-tighter uppercase italic">Master <span className="text-blue-600">Timeline</span></h2>
                    <button onClick={() => window.print()} className="w-full md:w-auto bg-slate-900 text-white px-6 md:px-12 py-3 md:py-6 rounded-xl md:rounded-[2.5rem] font-black text-[9px] md:text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 md:gap-4 shadow-2xl active:scale-95 transition-all">
                      <Printer size={16} className="md:w-6 md:h-6" /> Export Global PDF
                    </button>
                  </div>
                  
                  {globalSchedule.length > 0 && (
                    <div className="md:hidden flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 px-2 animate-pulse">
                      <ArrowRight size={12} /> Swipe calendar to view more
                    </div>
                  )}

                  <div className="bg-white p-2 md:p-6 rounded-2xl md:rounded-[4rem] shadow-2xl border border-slate-100 overflow-x-auto relative custom-scrollbar">
                    {globalSchedule.length > 0 ? (
                      <div className="min-w-[800px] pr-4">
                        <ScheduleCalendar scheduleData={globalSchedule} examDates={allExamDates} />
                      </div>
                    ) : (
                      <div className="py-20 md:py-40 text-center text-slate-300 font-black uppercase tracking-[0.4em] md:tracking-[0.8em]">
                        <Zap size={48} className="md:w-16 md:h-16 mx-auto mb-4 md:mb-6 opacity-10" /> Timeline Offline
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
             <div className="mt-6 md:mt-10">
                <UserRegistry 
                  profiles={allProfiles} 
                  onCreate={handleCreateAccount}
                  onBlock={handleBlockUser}
                  onDelete={handleDeleteUser}
                  onApprove={handleApproveUser}
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
                  <input required type="text" value={createModal.dept} onChange={e=>setCreateModal({...createModal, dept: e.target.value.toUpperCase()})} placeholder="e.g. CS" className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 transition-all uppercase"/>
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
      
      </main>
    </div>
  );
}

export default App;
     
