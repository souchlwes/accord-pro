import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, Search, Calendar, Clock, Home, BookOpen, 
  BellRing, CheckCircle2, Layers, ChevronRight, Mail 
} from 'lucide-react';
import accordLogo from '../accord.png'; // Adjust path to your logo if needed

const formatTime = (timeStr) => {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${suffix}`;
};

const StudentPortal = ({ globalSchedule, onBack, onSubscribe }) => {
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Derive unique options dynamically from the locked global schedule
  const availableDepts = useMemo(() => {
    return [...new Set(globalSchedule.map(s => s.dept_code))].sort();
  }, [globalSchedule]);

  const availableYears = useMemo(() => {
    if (!selectedDept) return [];
    return [...new Set(globalSchedule.filter(s => s.dept_code === selectedDept).map(s => s.year_level))].sort();
  }, [globalSchedule, selectedDept]);

  const availableSections = useMemo(() => {
    if (!selectedDept || !selectedYear) return [];
    return [...new Set(globalSchedule.filter(s => s.dept_code === selectedDept && String(s.year_level) === String(selectedYear)).map(s => s.section))].sort();
  }, [globalSchedule, selectedDept, selectedYear]);

  // Filter schedule based on selections
  const mySchedule = useMemo(() => {
    if (!selectedDept || !selectedYear || !selectedSection) return [];
    
    const filtered = globalSchedule.filter(s => 
      s.dept_code === selectedDept && 
      String(s.year_level) === String(selectedYear) && 
      s.section === selectedSection
    );

    // Group by Date for a beautiful timeline
    const grouped = {};
    filtered.forEach(item => {
      if (!grouped[item.exam_date]) grouped[item.exam_date] = [];
      grouped[item.exam_date].push(item);
    });

    // Sort times within each date
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => a.start_time.localeCompare(b.start_time));
    });

    return grouped;
  }, [globalSchedule, selectedDept, selectedYear, selectedSection]);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email) return;
    
    // Pass this up to App.js to save to Supabase
    if (onSubscribe) {
      onSubscribe({ email, deptCode: selectedDept, year: selectedYear, section: selectedSection });
    }
    
    setIsSubscribed(true);
    setTimeout(() => {
      setIsSubscribed(false);
      setEmail('');
    }, 5000);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 relative">
      
      {/* PREMIUM HEADER */}
      <nav className="bg-slate-900 px-6 pt-8 pb-6 flex items-center justify-between sticky top-0 z-50 shadow-2xl">
        <div className="flex items-center gap-3">
          <img src={accordLogo} alt="Accord" className="w-10 h-10 object-contain brightness-0 invert opacity-90" />
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter text-white leading-none">Accord <span className="text-blue-500 italic">Portal</span></h1>
            <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mt-1">Student Schedule Viewer</p>
          </div>
        </div>
        <button onClick={onBack} className="bg-white/10 hover:bg-rose-500 text-white p-3 rounded-xl transition-all border border-transparent hover:border-rose-400 flex items-center gap-2">
          <ArrowLeft size={16} />
          <span className="hidden md:block text-[10px] font-black uppercase tracking-widest">Exit</span>
        </button>
      </nav>

      <main className="container mx-auto px-4 md:px-6 max-w-4xl mt-8 space-y-6">
        
        {/* STEP-BY-STEP FILTER HERO */}
        <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-xl border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none"></div>
          
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-6 flex items-center gap-3">
            <Search className="text-blue-600"/> Find Your Schedule
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
            {/* Step 1: Dept */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">1. Department</label>
              <select 
                value={selectedDept} 
                onChange={(e) => { setSelectedDept(e.target.value); setSelectedYear(''); setSelectedSection(''); }}
                className="w-full bg-slate-50 p-4 rounded-2xl text-xs font-black text-slate-700 border-2 border-slate-100 outline-none focus:border-blue-500 appearance-none cursor-pointer uppercase"
              >
                <option value="">Select Dept...</option>
                {availableDepts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Step 2: Year */}
            <div className={`space-y-2 transition-all ${!selectedDept ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">2. Year Level</label>
              <select 
                value={selectedYear} 
                onChange={(e) => { setSelectedYear(e.target.value); setSelectedSection(''); }}
                className="w-full bg-slate-50 p-4 rounded-2xl text-xs font-black text-slate-700 border-2 border-slate-100 outline-none focus:border-blue-500 appearance-none cursor-pointer uppercase"
              >
                <option value="">Select Year...</option>
                {availableYears.map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>

            {/* Step 3: Section */}
            <div className={`space-y-2 transition-all ${!selectedYear ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">3. Section</label>
              <select 
                value={selectedSection} 
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full bg-slate-50 p-4 rounded-2xl text-xs font-black text-slate-700 border-2 border-slate-100 outline-none focus:border-blue-500 appearance-none cursor-pointer uppercase"
              >
                <option value="">Select Section...</option>
                {availableSections.map(s => <option key={s} value={s}>Section {s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* NOTIFY ME OPT-IN BOX (Only shows when a section is selected) */}
        {selectedSection && (
          <div className="bg-blue-50 border-2 border-blue-100 p-6 md:p-8 rounded-[2rem] flex flex-col md:flex-row gap-6 items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4">
            <div className="w-full md:w-auto text-center md:text-left">
              <h3 className="text-lg font-black uppercase text-blue-900 tracking-tight flex items-center justify-center md:justify-start gap-2 mb-1">
                <BellRing size={20} className="text-blue-600"/> Get Live Alerts
              </h3>
              <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">
                We'll email you if Room {selectedSection} changes.
              </p>
            </div>

            <div className="w-full md:flex-1 max-w-md">
              {isSubscribed ? (
                <div className="bg-emerald-100 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest w-full h-[52px]">
                  <CheckCircle2 size={16}/> You're Subscribed!
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400"/>
                    <input 
                      type="email" 
                      required
                      placeholder="Enter your student email..." 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-white border border-blue-200 p-4 pl-11 rounded-2xl text-[11px] font-bold outline-none focus:border-blue-500 transition-all shadow-sm"
                    />
                  </div>
                  <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-md transition-all active:scale-95 flex items-center gap-2 shrink-0">
                    Notify Me
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* TIMELINE RENDERER */}
        {selectedSection && Object.keys(mySchedule).length > 0 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 pt-4">
            {Object.keys(mySchedule).sort().map(date => (
              <div key={date} className="relative pl-6 md:pl-8 border-l-4 border-slate-200">
                <div className="absolute -left-[18px] top-0 w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center shadow-lg border-4 border-slate-50">
                  <Calendar size={12} className="text-white"/>
                </div>
                
                <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase mb-4 pt-1">{date}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mySchedule[date].map((s, idx) => (
                    <div key={idx} className="bg-white p-5 md:p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm hover:border-blue-200 hover:shadow-xl transition-all group relative overflow-hidden">
                      {/* Accent strip */}
                      <div className="absolute left-0 top-0 bottom-0 w-2 bg-blue-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                      
                      <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-1">{s.subject_code}</p>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug mb-4">{s.subject_name}</h4>
                      
                      <div className="grid grid-cols-2 gap-3 border-t border-slate-50 pt-4">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1"><Clock size={10}/> Time</span>
                          <span className="text-[10px] font-black text-slate-800">{formatTime(s.start_time)} - {formatTime(s.end_time)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1"><Home size={10}/> Room</span>
                          <span className="text-[11px] font-black text-slate-900 bg-slate-100 w-max px-2 py-0.5 rounded-md">{s.room}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* EMPTY STATE */}
        {selectedSection && Object.keys(mySchedule).length === 0 && (
          <div className="text-center py-20 bg-white rounded-[3rem] border-4 border-dashed border-slate-200 animate-in fade-in">
            <BookOpen size={48} className="mx-auto text-slate-300 mb-4"/>
            <p className="text-lg font-black uppercase text-slate-800 tracking-tighter">No Schedule Found</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">The schedule for this section has not been published yet.</p>
          </div>
        )}

      </main>
    </div>
  );
};

export default StudentPortal;
