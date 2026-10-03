import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, Search, Calendar, Clock, Home, BookOpen, 
  BellRing, CheckCircle2, Lock, ChevronRight, Mail, Users, Loader2, AlertCircle
} from 'lucide-react';
import { supabase } from './supabaseClient'; // Connects directly to DB
import accordLogo from './accord.png'; 

const formatTime = (timeStr) => {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${suffix}`;
};

const StudentPortal = ({ onBack }) => {
  // Authentication & Data States
  const [accessCode, setAccessCode] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [unlockedDept, setUnlockedDept] = useState(null);
  const [publicSchedule, setPublicSchedule] = useState([]);

  // UI Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState('ALL');
  const [viewMode, setViewMode] = useState('upcoming');

  // Subscription States
  const [subEmail, setSubEmail] = useState('');
  const [subYear, setSubYear] = useState('');
  const [subSection, setSubSection] = useState('');
  const [subLoading, setSubLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // --- 1. SECURE DATABASE UNLOCK ENGINE ---
  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!accessCode.trim()) return;
    
    setIsUnlocking(true);
    setUnlockError('');

    try {
      const code = accessCode.trim().toUpperCase();
      
      // Step A: Verify the Department Code
      const { data: deptData, error: deptError } = await supabase
         .from('departments')
         .select('*')
         .eq('invite_code', code)
         .maybeSingle();

      if (deptError || !deptData) throw new Error("Invalid Access Code. Please verify with your department.");

      // Step B: Fetch the Locked Public Schedule for this specific department
      const { data: schedData, error: schedError } = await supabase
         .from('schedules')
         .select('*')
         .eq('dept_code', deptData.code)
         .order('exam_date', { ascending: true })
         .order('start_time', { ascending: true });

      if (schedError) throw schedError;

      setUnlockedDept(deptData);
      setPublicSchedule(schedData || []);
    } catch (err) {
      setUnlockError(err.message);
    } finally {
      setIsUnlocking(false);
    }
  };

  // --- 2. LIVE NOTIFICATION SUBSCRIPTION ---
  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!subEmail || !subYear || !subSection) return;

    setSubLoading(true);
    
    // Silently save the student's email to Supabase for the Auto-Blaster
    const { error } = await supabase.from('student_subscriptions').insert([{
        email: subEmail,
        dept_code: unlockedDept.code,
        year_level: String(subYear),
        section: subSection.trim().toUpperCase()
    }]);

    setSubLoading(false);
    
    if (!error) {
        setIsSubscribed(true);
        setTimeout(() => { 
          setIsSubscribed(false); 
          setSubEmail(''); 
          setSubYear(''); 
          setSubSection(''); 
        }, 5000);
    } else {
        alert("Failed to subscribe: " + error.message);
    }
  };

  // --- 3. SMART SEARCH & FILTER ENGINE ---
  const processedSchedule = useMemo(() => {
    let data = [...publicSchedule];

    // Filter A: Upcoming vs History
    const todayStr = new Date().toISOString().split('T')[0];
    const currentTimeStr = new Date().toTimeString().substring(0, 5);
    
    data = data.filter(s => {
       const isPast = s.exam_date < todayStr || (s.exam_date === todayStr && s.end_time < currentTimeStr);
       return viewMode === 'upcoming' ? !isPast : isPast;
    });

    // Filter B: Year Level Pill Selection
    if (filterYear !== 'ALL') {
       data = data.filter(s => String(s.year_level) === String(filterYear));
    }

    // Filter C: Search Bar (Checks subject, code, section, and room)
    if (searchQuery.trim()) {
       const q = searchQuery.toLowerCase();
       data = data.filter(s => 
         (s.subject_name || '').toLowerCase().includes(q) ||
         (s.subject_code || '').toLowerCase().includes(q) ||
         (s.section || '').toLowerCase().includes(q) ||
         (String(s.room) || '').toLowerCase().includes(q)
       );
    }

    // Group the final results by Date for the Timeline UI
    const grouped = {};
    data.forEach(item => {
      if (!grouped[item.exam_date]) grouped[item.exam_date] = [];
      grouped[item.exam_date].push(item);
    });

    return grouped;
  }, [publicSchedule, viewMode, filterYear, searchQuery]);

  // --- UI STATE A: THE LOCK SCREEN ---
  if (!unlockedDept) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative font-sans">
        <button onClick={onBack} className="absolute top-6 left-6 md:top-10 md:left-10 text-slate-400 hover:text-white flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors z-50 bg-white/5 hover:bg-white/10 px-4 py-3 rounded-2xl">
          <ArrowLeft size={16} /> Back to Home
        </button>

        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] w-full max-w-md shadow-[0_0_100px_rgba(0,0,0,0.5)] text-center animate-in zoom-in-95 duration-500">
          <img src={accordLogo} alt="Accord Pro Logo" className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 object-contain drop-shadow-xl brightness-0" />
          <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter mb-1">Student <span className="text-emerald-500">Portal</span></h1>
          <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Secure Read-Only Access</p>
          
          <form onSubmit={handleUnlock}>
            {unlockError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 text-[10px] font-bold uppercase p-3 rounded-xl mb-4 flex items-center justify-center gap-2">
                <AlertCircle size={14} /> {unlockError}
              </div>
            )}
            
            <div className="relative mb-6">
              <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                required
                maxLength="6"
                placeholder="6-Digit Dept Code" 
                value={accessCode} 
                onChange={e => setAccessCode(e.target.value)} 
                className="w-full bg-slate-50 px-4 py-4 pl-12 rounded-2xl font-black text-lg md:text-xl text-center tracking-[0.3em] uppercase border-2 border-transparent focus:border-emerald-500 outline-none transition-all"
              />
            </div>

            <button type="submit" disabled={isUnlocking || accessCode.length < 5} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white py-4 md:py-5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 text-[10px] md:text-xs flex items-center justify-center gap-2">
              {isUnlocking ? <Loader2 size={18} className="animate-spin" /> : 'Unlock Board'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- UI STATE B: THE UNLOCKED MASTER BOARD ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 relative">
      
      {/* Premium Header */}
      <nav className="bg-slate-900 px-4 md:px-8 py-4 md:py-6 flex flex-wrap items-center justify-between sticky top-0 z-50 shadow-2xl gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <img src={unlockedDept.logo_url || accordLogo} alt="Crest" className="w-10 h-10 md:w-12 md:h-12 object-contain bg-white/10 p-1.5 rounded-xl border border-white/5" />
          <div>
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-white leading-none">
              {unlockedDept.code} <span className="text-blue-500 italic">Board</span>
            </h1>
            <p className="text-[8px] md:text-[9px] font-black tracking-widest text-emerald-400 uppercase mt-1">Live Campus Timeline</p>
          </div>
        </div>
        <button onClick={onBack} className="bg-white/10 hover:bg-rose-500 text-white p-3 rounded-xl transition-all border border-transparent hover:border-rose-400 flex items-center gap-2">
          <ArrowLeft size={16} />
          <span className="hidden md:block text-[9px] font-black uppercase tracking-widest">Lock & Exit</span>
        </button>
      </nav>

      <main className="container mx-auto px-4 md:px-6 max-w-6xl mt-6 md:mt-10 space-y-6 md:space-y-8">
        
        {/* --- PREMIUM NOTIFY ME SUBSCRIPTION BOX --- */}
        <div className="bg-blue-600 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 border border-blue-500">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none"></div>
          
          <div className="w-full md:w-auto text-center md:text-left relative z-10">
            <h3 className="text-xl md:text-2xl font-black uppercase text-white tracking-tighter flex items-center justify-center md:justify-start gap-2 mb-1">
              <BellRing size={24} className="text-blue-200"/> Get Live Alerts
            </h3>
            <p className="text-[10px] md:text-xs font-bold text-blue-200 uppercase tracking-widest">
              Receive instant emails if your room or proctor changes.
            </p>
          </div>

          <div className="w-full md:max-w-xl relative z-10">
            {isSubscribed ? (
              <div className="bg-emerald-400 text-emerald-950 p-4 rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest w-full h-[52px] md:h-[60px] shadow-lg">
                <CheckCircle2 size={20}/> Subscribed Successfully!
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="grid grid-cols-1 md:grid-cols-5 gap-3 w-full">
                <div className="md:col-span-2 relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input 
                    type="email" required placeholder="Student Email" value={subEmail} onChange={e => setSubEmail(e.target.value)}
                    className="w-full bg-white border-0 p-3.5 md:p-4 pl-11 rounded-xl font-bold text-xs outline-none focus:ring-4 focus:ring-blue-400/50 shadow-sm"
                  />
                </div>
                <div className="md:col-span-2 flex gap-2">
                   <input 
                     type="number" required min="1" max="5" placeholder="Year" value={subYear} onChange={e => setSubYear(e.target.value)}
                     className="w-full bg-white border-0 p-3.5 md:p-4 rounded-xl font-bold text-xs outline-none focus:ring-4 focus:ring-blue-400/50 shadow-sm text-center"
                   />
                   <input 
                     type="text" required maxLength="2" placeholder="Sec" value={subSection} onChange={e => setSubSection(e.target.value)}
                     className="w-full bg-white border-0 p-3.5 md:p-4 rounded-xl font-bold text-xs outline-none focus:ring-4 focus:ring-blue-400/50 shadow-sm text-center uppercase"
                   />
                </div>
                <button type="submit" disabled={subLoading} className="md:col-span-1 bg-slate-900 hover:bg-slate-800 text-white p-3.5 md:p-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center">
                  {subLoading ? <Loader2 size={16} className="animate-spin" /> : 'Notify Me'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* --- SMART TOOLBAR (NO DROPDOWNS) --- */}
        <div className="bg-white p-4 md:p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col lg:flex-row items-center gap-4 sticky top-[80px] md:top-[100px] z-40">
           
           {/* Status Toggle */}
           <div className="flex bg-slate-100 p-1 rounded-2xl w-full lg:w-auto shrink-0">
              <button onClick={() => setViewMode('upcoming')} className={`flex-1 px-5 py-3 text-[9px] md:text-[10px] font-black uppercase rounded-xl transition-all ${viewMode === 'upcoming' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>Upcoming</button>
              <button onClick={() => setViewMode('history')} className={`flex-1 px-5 py-3 text-[9px] md:text-[10px] font-black uppercase rounded-xl transition-all ${viewMode === 'history' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>History</button>
           </div>

           {/* Search Bar */}
           <div className="relative w-full lg:flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search subject, section, or room..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 p-3.5 md:p-4 pl-11 rounded-2xl font-black text-[10px] md:text-xs border-2 border-slate-100 outline-none focus:border-blue-500 transition-all"
              />
           </div>

           {/* Horizontal Year Level Pills */}
           <div className="flex bg-slate-100 p-1 rounded-2xl w-full lg:w-auto overflow-x-auto custom-scrollbar shrink-0">
              <button onClick={() => setFilterYear('ALL')} className={`px-4 py-3 md:py-3.5 text-[9px] md:text-[10px] font-black uppercase rounded-xl transition-all whitespace-nowrap ${filterYear === 'ALL' ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>All Yrs</button>
              {[1, 2, 3, 4, 5].map(y => (
                <button key={y} onClick={() => setFilterYear(String(y))} className={`px-4 py-3 md:py-3.5 text-[9px] md:text-[10px] font-black uppercase rounded-xl transition-all whitespace-nowrap ${String(filterYear) === String(y) ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>Y{y}</button>
              ))}
           </div>
        </div>

        {/* --- SCHEDULE GRID RENDERER --- */}
        {Object.keys(processedSchedule).length > 0 ? (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-500 pt-4">
            {Object.keys(processedSchedule).sort().map(date => (
              <div key={date} className="relative pl-6 md:pl-8 border-l-4 border-slate-200">
                <div className="absolute -left-[18px] top-0 w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center shadow-lg border-4 border-slate-50">
                  <Calendar size={12} className="text-white"/>
                </div>
                
                <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase mb-6 pt-1">{date}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {processedSchedule[date].map((s, idx) => (
                    <div key={idx} className="bg-white p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border-2 border-slate-100 shadow-sm hover:border-blue-200 hover:shadow-xl transition-all group relative overflow-hidden flex flex-col justify-between">
                      {/* Accent strip */}
                      <div className="absolute left-0 top-0 bottom-0 w-2 bg-blue-500 opacity-30 group-hover:opacity-100 transition-opacity"></div>
                      
                      <div>
                        <div className="flex justify-between items-start mb-3">
                           <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                             Yr {s.year_level} - Sec {s.section}
                           </span>
                           <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">{s.subject_code}</span>
                        </div>
                        <h4 className="text-sm md:text-base font-bold text-slate-900 leading-snug mb-5">{s.subject_name}</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 border-t border-slate-50 pt-4 mt-auto">
                        <div className="flex flex-col bg-slate-50 p-2.5 rounded-xl">
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1"><Clock size={10}/> Time</span>
                          <span className="text-[10px] font-black text-slate-800">{formatTime(s.start_time)} - {formatTime(s.end_time)}</span>
                        </div>
                        <div className="flex flex-col bg-blue-50 p-2.5 rounded-xl border border-blue-100">
                          <span className="text-[8px] font-black uppercase tracking-widest text-blue-400 mb-1 flex items-center gap-1"><Home size={10}/> Room</span>
                          <span className="text-[11px] font-black text-blue-900">{s.room}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-white rounded-[3rem] border-4 border-dashed border-slate-200 animate-in fade-in shadow-sm">
            <BookOpen size={48} className="mx-auto text-slate-300 mb-4"/>
            <p className="text-xl font-black uppercase text-slate-800 tracking-tighter">No Active Schedule Found</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2 max-w-md mx-auto leading-relaxed">
              If your exams are approaching, the department administrator may still be finalizing the draft.
            </p>
          </div>
        )}

      </main>
    </div>
  );
};

export default StudentPortal;
