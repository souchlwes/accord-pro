import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, Search, Calendar, Clock, Home, BookOpen, 
  BellRing, CheckCircle2, Lock, Mail, Loader2, AlertCircle, Sparkles
} from 'lucide-react';
import { supabase } from './supabaseClient';
import accordLogo from './accord.png'; 

const formatTime = (timeStr) => {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${suffix}`;
};

const StudentPortal = ({ onBack }) => {
  const [accessCode, setAccessCode] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [unlockedDept, setUnlockedDept] = useState(null);
  const [publicSchedule, setPublicSchedule] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState('ALL');
  const [viewMode, setViewMode] = useState('upcoming');

  const [subEmail, setSubEmail] = useState('');
  const [subYear, setSubYear] = useState('');
  const [subSection, setSubSection] = useState('');
  const [subLoading, setSubLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!accessCode.trim()) return;
    
    setIsUnlocking(true);
    setUnlockError('');

    try {
      const code = accessCode.trim().toUpperCase();
      
      const { data: deptData, error: deptError } = await supabase
         .from('departments')
         .select('*')
         .eq('student_code', code)
         .maybeSingle();

      if (deptError || !deptData) throw new Error("Invalid Access PIN. Please verify with your department.");

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

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!subEmail || !subYear || !subSection) return;

    setSubLoading(true);
    
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

  const processedSchedule = useMemo(() => {
    let data = [...publicSchedule];

    const todayStr = new Date().toISOString().split('T')[0];
    const currentTimeStr = new Date().toTimeString().substring(0, 5);
    
    data = data.filter(s => {
       const isPast = s.exam_date < todayStr || (s.exam_date === todayStr && s.end_time < currentTimeStr);
       return viewMode === 'upcoming' ? !isPast : isPast;
    });

    if (filterYear !== 'ALL') {
       data = data.filter(s => String(s.year_level) === String(filterYear));
    }

    if (searchQuery.trim()) {
       const q = searchQuery.toLowerCase();
       data = data.filter(s => 
         (s.subject_name || '').toLowerCase().includes(q) ||
         (s.subject_code || '').toLowerCase().includes(q) ||
         (s.section || '').toLowerCase().includes(q) ||
         (String(s.room) || '').toLowerCase().includes(q)
       );
    }

    const grouped = {};
    data.forEach(item => {
      if (!grouped[item.exam_date]) grouped[item.exam_date] = [];
      grouped[item.exam_date].push(item);
    });

    return grouped;
  }, [publicSchedule, viewMode, filterYear, searchQuery]);

  // --- LOCK SCREEN ---
  if (!unlockedDept) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative font-sans overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-blue-600/5 blur-[120px] pointer-events-none"></div>
        <button onClick={onBack} className="absolute top-6 left-6 md:top-10 md:left-10 text-slate-400 hover:text-white flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors z-50 bg-white/5 hover:bg-white/10 px-5 py-3.5 rounded-2xl border border-white/5">
          <ArrowLeft size={16} /> Back to Home
        </button>

        <div className="bg-white/5 backdrop-blur-2xl p-10 md:p-14 rounded-[3rem] w-full max-w-md shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-white/10 text-center animate-in zoom-in-95 duration-500 relative z-10">
          <img src={accordLogo} alt="Accord Pro Logo" className="w-20 h-20 mx-auto mb-6 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] brightness-0 invert" />
          <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter mb-2 text-white">Student <span className="text-emerald-400">Portal</span></h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-10">Secure Read-Only Access</p>
          
          <form onSubmit={handleUnlock}>
            {unlockError && (
              <div className="bg-rose-500/20 border border-rose-500/50 text-rose-300 text-[10px] font-bold uppercase p-4 rounded-xl mb-6 flex items-center justify-center gap-2">
                <AlertCircle size={16} /> {unlockError}
              </div>
            )}
            
            <div className="relative mb-8">
              <Lock size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                required
                maxLength="6"
                placeholder="6-Digit PIN" 
                value={accessCode} 
                onChange={e => setAccessCode(e.target.value)} 
                className="w-full bg-black/40 text-white px-6 py-5 pl-14 rounded-2xl font-black text-xl text-center tracking-[0.4em] uppercase border-2 border-white/10 focus:border-emerald-500 outline-none transition-all shadow-inner placeholder:text-slate-600 placeholder:tracking-normal"
              />
            </div>

            <button type="submit" disabled={isUnlocking || accessCode.length < 5} className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/5 disabled:text-slate-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 text-xs flex items-center justify-center gap-2 border border-emerald-400/50">
              {isUnlocking ? <Loader2 size={20} className="animate-spin" /> : 'Unlock Board'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- UNLOCKED BOARD ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-32 relative">
      <nav className="bg-slate-900 px-6 md:px-10 py-6 md:py-8 flex flex-wrap items-center justify-between sticky top-0 z-50 shadow-2xl gap-4 border-b border-blue-900/50">
        <div className="flex items-center gap-5">
          <img src={unlockedDept.logo_url || accordLogo} alt="Crest" className="w-12 h-12 md:w-14 md:h-14 object-contain bg-white/5 p-2 rounded-2xl border border-white/10 shadow-inner" />
          <div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white leading-none">
              {unlockedDept.code} <span className="text-blue-500 italic">Board</span>
            </h1>
            <p className="text-[9px] md:text-[10px] font-black tracking-[0.2em] text-emerald-400 uppercase mt-2">Live Campus Timeline</p>
          </div>
        </div>
        <button onClick={onBack} className="bg-white/5 hover:bg-rose-500 text-white px-5 py-3 rounded-xl transition-all border border-white/10 hover:border-rose-400 flex items-center gap-2 shadow-sm">
          <Lock size={16} />
          <span className="hidden md:block text-[10px] font-black uppercase tracking-widest">Lock & Exit</span>
        </button>
      </nav>

      <main className="container mx-auto px-4 md:px-8 max-w-7xl mt-10 space-y-10">
        
        {/* PREMIUM SUBSCRIPTION BOX */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-10 border border-blue-400/50">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20"></div>
          
          <div className="w-full lg:w-auto text-center lg:text-left relative z-10">
            <h3 className="text-2xl md:text-3xl font-black uppercase text-white tracking-tighter flex items-center justify-center lg:justify-start gap-3 mb-2 drop-shadow-md">
              <Sparkles size={28} className="text-amber-300"/> Get Live Alerts
            </h3>
            <p className="text-xs font-bold text-blue-200 uppercase tracking-widest max-w-md mx-auto lg:mx-0 leading-relaxed">
              We'll instantly email you if the room or schedule for your section is published or changed.
            </p>
          </div>

          <div className="w-full lg:max-w-2xl relative z-10 bg-black/20 p-4 md:p-6 rounded-[2rem] border border-white/10 backdrop-blur-md">
            {isSubscribed ? (
              <div className="bg-emerald-400 text-emerald-950 p-6 rounded-2xl flex items-center justify-center gap-3 font-black text-sm uppercase tracking-widest w-full shadow-lg border border-emerald-300">
                <CheckCircle2 size={24}/> You're Subscribed!
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="grid grid-cols-1 md:grid-cols-12 gap-3 w-full">
                <div className="md:col-span-6 relative">
                  <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input 
                    type="email" required placeholder="Student Email Address" value={subEmail} onChange={e => setSubEmail(e.target.value)}
                    className="w-full bg-white border-0 p-5 pl-14 rounded-2xl font-bold text-xs outline-none focus:ring-4 focus:ring-blue-400/50 shadow-inner text-slate-900"
                  />
                </div>
                <div className="md:col-span-3 flex gap-2">
                   <input 
                     type="number" required min="1" max="5" placeholder="Year" value={subYear} onChange={e => setSubYear(e.target.value)}
                     className="w-full bg-white border-0 p-5 rounded-2xl font-bold text-xs outline-none focus:ring-4 focus:ring-blue-400/50 shadow-inner text-center text-slate-900"
                   />
                   <input 
                     type="text" required maxLength="2" placeholder="Sec" value={subSection} onChange={e => setSubSection(e.target.value)}
                     className="w-full bg-white border-0 p-5 rounded-2xl font-bold text-xs outline-none focus:ring-4 focus:ring-blue-400/50 shadow-inner text-center uppercase text-slate-900"
                   />
                </div>
                <button type="submit" disabled={subLoading} className="md:col-span-3 bg-amber-400 hover:bg-amber-300 text-amber-950 py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center">
                  {subLoading ? <Loader2 size={18} className="animate-spin" /> : 'Notify Me'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="bg-white p-5 md:p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col lg:flex-row items-center gap-5 sticky top-[90px] md:top-[110px] z-40">
           <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full lg:w-auto shrink-0 border border-slate-200/50">
              <button onClick={() => setViewMode('upcoming')} className={`flex-1 px-6 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${viewMode === 'upcoming' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>Upcoming</button>
              <button onClick={() => setViewMode('history')} className={`flex-1 px-6 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${viewMode === 'history' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>History</button>
           </div>
           
           <div className="relative w-full lg:flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search subject, section, or room..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 p-4 pl-12 rounded-2xl font-black text-xs border-2 border-slate-100 outline-none focus:border-blue-500 transition-all text-slate-900"
              />
           </div>
           
           <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full lg:w-auto overflow-x-auto custom-scrollbar shrink-0 border border-slate-200/50">
              <button onClick={() => setFilterYear('ALL')} className={`px-5 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${filterYear === 'ALL' ? 'bg-white shadow-md text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>All Yrs</button>
              {[1, 2, 3, 4, 5].map(y => (
                <button key={y} onClick={() => setFilterYear(String(y))} className={`px-5 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${String(filterYear) === String(y) ? 'bg-white shadow-md text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>Y{y}</button>
              ))}
           </div>
        </div>

        {/* TIMELINE */}
        {Object.keys(processedSchedule).length > 0 ? (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-500 pt-6">
            {Object.keys(processedSchedule).sort().map(date => (
              <div key={date} className="relative pl-8 md:pl-12 border-l-[6px] border-slate-200">
                <div className="absolute -left-[27px] top-0 w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center shadow-xl border-4 border-slate-50">
                  <Calendar size={18} className="text-white"/>
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase mb-8 pt-1">{date}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                  {processedSchedule[date].map((s, idx) => (
                    <div key={idx} className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-2 border-slate-100 shadow-sm hover:border-blue-300 hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-blue-500 opacity-20 group-hover:opacity-100 transition-opacity"></div>
                      
                      <div>
                        <div className="flex justify-between items-start mb-4">
                           <span className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg border border-slate-200 shadow-sm">
                             Yr {s.year_level} - Sec {s.section}
                           </span>
                           <span className="text-[11px] font-black uppercase text-blue-600 tracking-widest">{s.subject_code}</span>
                        </div>
                        <h4 className="text-base md:text-lg font-bold text-slate-900 leading-snug mb-8">{s.subject_name}</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 border-t-2 border-slate-50 pt-5 mt-auto">
                        <div className="flex flex-col bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5"><Clock size={12}/> Time</span>
                          <span className="text-xs font-black text-slate-800">{formatTime(s.start_time)}</span>
                          <span className="text-xs font-black text-slate-800">{formatTime(s.end_time)}</span>
                        </div>
                        <div className="flex flex-col bg-blue-50 p-4 rounded-2xl border border-blue-100 relative overflow-hidden">
                          <Home size={40} className="absolute -right-2 -bottom-2 text-blue-200/50 pointer-events-none"/>
                          <span className="text-[9px] font-black uppercase tracking-widest text-blue-500 mb-2 flex items-center gap-1.5 relative z-10"><Home size={12}/> Room</span>
                          <span className="text-sm font-black text-blue-900 relative z-10">{s.room}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-32 bg-white rounded-[3rem] border-4 border-dashed border-slate-200 animate-in fade-in shadow-sm mt-8">
            <BookOpen size={64} className="mx-auto text-slate-300 mb-6"/>
            <p className="text-2xl font-black uppercase text-slate-800 tracking-tighter mb-2">No Schedule Found</p>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest max-w-lg mx-auto leading-relaxed">
              The schedule for this filter has not been published yet. Subscribe above to be notified instantly when it drops.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentPortal;
