import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, Search, Calendar, Clock, Home, BookOpen, 
  BellRing, CheckCircle2, Lock, Mail, Loader2, AlertCircle, Sparkles, DownloadCloud, Layers
} from 'lucide-react';
import { supabase } from './supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState('ALL');
  const [viewMode, setViewMode] = useState('upcoming');

  // Subscriptions
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
          setSubEmail(''); setSubYear(''); setSubSection(''); 
        }, 5000);
    } else {
        alert("Failed to subscribe: " + error.message);
    }
  };

  // --- SMART iOS-STYLE GROUPING ENGINE ---
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

    // Group by Date FIRST, then by Section SECOND
    const grouped = {};
    data.forEach(item => {
      if (!grouped[item.exam_date]) grouped[item.exam_date] = {};
      const secKey = `Year ${item.year_level} - Section ${item.section}`;
      if (!grouped[item.exam_date][secKey]) grouped[item.exam_date][secKey] = [];
      
      grouped[item.exam_date][secKey].push(item);
    });

    return grouped;
  }, [publicSchedule, viewMode, filterYear, searchQuery]);

  // --- PDF EXPORT ENGINE ---
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait' });
      const deptName = unlockedDept.code || 'Department';
      
      doc.addImage(accordLogo, 'PNG', 14, 12, 10, 10);
      doc.setFont("helvetica", "bolditalic");
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text("ACCORD", 26, 19);
      const accordWidth = doc.getTextWidth("ACCORD ");
      doc.setTextColor(37, 99, 235);
      doc.text("PRO", 26 + accordWidth, 19);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`${deptName.toUpperCase()} STUDENT EXAM SCHEDULE`, 14, 30);

      let currentY = 38;

      Object.keys(processedSchedule).sort().forEach(date => {
        Object.keys(processedSchedule[date]).sort().forEach(section => {
          const items = processedSchedule[date][section];
          const tableRows = items.map(item => [
            `${formatTime(item.start_time)} - ${formatTime(item.end_time)}`,
            item.subject_code,
            item.subject_name,
            item.room
          ]);

          autoTable(doc, { 
            head: [
              [{ content: `DATE: ${date}   |   ${section.toUpperCase()}`, colSpan: 4, styles: { halign: 'center', fillColor: [37, 99, 235], fontStyle: 'bold', fontSize: 10 } }],
              ["Time", "Code", "Subject", "Room"]
            ],
            body: tableRows, 
            startY: currentY, 
            theme: 'grid', 
            styles: { font: 'helvetica', fontSize: 9, cellPadding: 4 }, 
            headStyles: { font: 'helvetica', fillColor: [15, 23, 42], textColor: [255, 255, 255] },
            margin: { top: 20, bottom: 20 }, 
            pageBreak: 'avoid',
          });

          currentY = doc.lastAutoTable.finalY + 10;
        });
      });

      doc.save(`${deptName}_Student_Schedule.pdf`);
    } catch (err) {
      alert("PDF Export Failed: " + err.message);
    }
  };

  // --- LOCK SCREEN ---
  if (!unlockedDept) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative font-sans overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-blue-600/10 blur-[120px] pointer-events-none"></div>
        <button onClick={onBack} className="absolute top-6 left-6 md:top-10 md:left-10 text-slate-400 hover:text-white flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors z-50 bg-white/5 hover:bg-white/10 px-5 py-3.5 rounded-[1rem] border border-white/5 shadow-sm backdrop-blur-md">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="bg-white/5 backdrop-blur-2xl p-10 md:p-12 rounded-[2.5rem] w-full max-w-md shadow-2xl border border-white/10 text-center animate-in zoom-in-95 duration-500 relative z-10">
          <img src={accordLogo} alt="Accord Pro Logo" className="w-16 h-16 mx-auto mb-6 object-contain brightness-0 invert opacity-90" />
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-2 text-white">Student Portal</h1>
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-10">Access Your Schedule</p>
          
          <form onSubmit={handleUnlock}>
            {unlockError && (
              <div className="bg-rose-500/20 border border-rose-500/50 text-rose-200 text-[10px] font-semibold uppercase p-4 rounded-xl mb-6 flex items-center justify-center gap-2 backdrop-blur-sm">
                <AlertCircle size={16} /> {unlockError}
              </div>
            )}
            
            <div className="relative mb-6">
              <Lock size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                required
                maxLength="6"
                placeholder="6-Digit PIN" 
                value={accessCode} 
                onChange={e => setAccessCode(e.target.value)} 
                className="w-full bg-black/40 text-white px-6 py-5 pl-14 rounded-2xl font-bold text-xl text-center tracking-[0.4em] uppercase border border-white/10 focus:border-emerald-500 outline-none transition-all shadow-inner placeholder:text-slate-500 placeholder:tracking-normal placeholder:font-medium"
              />
            </div>

            <button type="submit" disabled={isUnlocking || accessCode.length < 5} className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/5 disabled:text-slate-600 text-white py-5 rounded-2xl font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95 text-xs flex items-center justify-center gap-2">
              {isUnlocking ? <Loader2 size={18} className="animate-spin" /> : 'Unlock Schedule'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- UNLOCKED BOARD ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-32 relative">
      {/* iOS-Style Clean Navbar */}
      <nav className="bg-white/80 backdrop-blur-xl px-6 md:px-10 py-4 flex items-center justify-between sticky top-0 z-50 border-b border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2 text-slate-900">
          <img src={accordLogo} alt="Accord Pro" className="w-6 h-6 object-contain" />
          <span className="text-sm font-semibold tracking-tight">Accord <span className="text-blue-600 font-medium italic">Portal</span></span>
        </div>
        <button onClick={onBack} className="text-slate-500 hover:text-rose-500 bg-slate-100 hover:bg-rose-50 px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
          <Lock size={14} /> Exit
        </button>
      </nav>

      <main className="container mx-auto px-4 md:px-8 max-w-5xl mt-8 space-y-10">
        
        {/* PREMIUM GREETING HERO (With Embedded White Crest) */}
        <div className="flex flex-col md:flex-row items-center justify-between bg-slate-900 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none -mr-20 -mt-20"></div>
          
          <div className="relative z-10 text-center md:text-left flex flex-col md:flex-row items-center gap-6 md:gap-8">
            
            {/* The Embedded White Crest Fix */}
            <div className="bg-white w-20 h-20 md:w-28 md:h-28 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] shrink-0 flex items-center justify-center">
               <img src={unlockedDept.logo_url || accordLogo} alt="Dept Crest" className="w-14 h-14 md:w-20 md:h-20 object-contain drop-shadow-md" />
            </div>

            <div>
               <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">Official Schedule Board</p>
               <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white mb-2 leading-none">
                 {unlockedDept.code} Department
               </h2>
               <p className="text-sm font-medium text-slate-400">Live Campus Timeline • {new Date().getFullYear()}</p>
            </div>
            
          </div>
        </div>

        {/* NOTIFY ME SUBSCRIPTION BOX */}
        <div className="bg-blue-600 p-8 md:p-10 rounded-[2.5rem] shadow-xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8 border border-blue-500">
          <div className="w-full lg:w-auto text-center lg:text-left relative z-10">
            <h3 className="text-2xl font-semibold text-white tracking-tight flex items-center justify-center lg:justify-start gap-2 mb-2">
              <BellRing size={24} className="text-amber-300"/> Never miss an update
            </h3>
            <p className="text-[11px] font-medium text-blue-200 uppercase tracking-widest max-w-md mx-auto lg:mx-0">
              Subscribe to receive instant emails if your section's room or schedule is updated.
            </p>
          </div>

          <div className="w-full lg:max-w-xl relative z-10 bg-black/20 p-4 md:p-6 rounded-[2rem] border border-white/10 backdrop-blur-md">
            {isSubscribed ? (
              <div className="bg-emerald-400 text-emerald-950 p-6 rounded-2xl flex items-center justify-center gap-3 font-bold text-sm uppercase tracking-widest w-full shadow-lg border border-emerald-300">
                <CheckCircle2 size={24}/> You're Subscribed!
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="grid grid-cols-1 md:grid-cols-12 gap-3 w-full">
                <div className="md:col-span-6 relative">
                  <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input 
                    type="email" required placeholder="Student Email Address" value={subEmail} onChange={e => setSubEmail(e.target.value)}
                    className="w-full bg-white border-0 p-5 pl-14 rounded-2xl font-medium text-sm outline-none focus:ring-4 focus:ring-blue-400/50 shadow-inner text-slate-900"
                  />
                </div>
                <div className="md:col-span-3 flex gap-2">
                   <input 
                     type="number" required min="1" max="5" placeholder="Year" value={subYear} onChange={e => setSubYear(e.target.value)}
                     className="w-full bg-white border-0 p-5 rounded-2xl font-medium text-sm outline-none focus:ring-4 focus:ring-blue-400/50 shadow-inner text-center text-slate-900"
                   />
                   <input 
                     type="text" required maxLength="2" placeholder="Sec" value={subSection} onChange={e => setSubSection(e.target.value)}
                     className="w-full bg-white border-0 p-5 rounded-2xl font-medium text-sm outline-none focus:ring-4 focus:ring-blue-400/50 shadow-inner text-center uppercase text-slate-900"
                   />
                </div>
                <button type="submit" disabled={subLoading} className="md:col-span-3 bg-amber-400 hover:bg-amber-300 text-amber-950 py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center">
                  {subLoading ? <Loader2 size={18} className="animate-spin" /> : 'Notify Me'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* iOS-STYLE CONTROL BAR */}
        <div className="bg-white p-4 md:p-5 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col lg:flex-row items-center gap-4 sticky top-[80px] z-40">
           
           <div className="flex bg-slate-100 p-1 rounded-xl w-full lg:w-auto shrink-0">
              <button onClick={() => setViewMode('upcoming')} className={`flex-1 px-6 py-3 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${viewMode === 'upcoming' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>Upcoming</button>
              <button onClick={() => setViewMode('history')} className={`flex-1 px-6 py-3 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${viewMode === 'history' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>History</button>
           </div>
           
           <div className="relative w-full lg:flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search subject or room..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 p-3.5 pl-10 rounded-xl font-medium text-sm border border-slate-100 outline-none focus:border-blue-500 transition-all text-slate-900"
              />
           </div>
           
           <div className="flex bg-slate-100 p-1 rounded-xl w-full lg:w-auto overflow-x-auto custom-scrollbar shrink-0">
              <button onClick={() => setFilterYear('ALL')} className={`px-5 py-3 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${filterYear === 'ALL' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>All Yrs</button>
              {[1, 2, 3, 4, 5].map(y => (
                <button key={y} onClick={() => setFilterYear(String(y))} className={`px-5 py-3 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${String(filterYear) === String(y) ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>Yr {y}</button>
              ))}
           </div>

           {/* DOWNLOAD BUTTON */}
           <button onClick={handleExportPDF} className="w-full lg:w-auto bg-slate-900 text-white px-5 py-3.5 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors shrink-0">
             <DownloadCloud size={16} /> Save PDF
           </button>
        </div>

        {/* --- GROUPED TIMELINE RENDERER --- */}
        {Object.keys(processedSchedule).length > 0 ? (
          <div className="space-y-16 pt-4">
            {Object.keys(processedSchedule).sort().map(date => (
              <div key={date} className="relative pl-6 md:pl-10 border-l-[4px] border-slate-200">
                
                {/* Date Anchor */}
                <div className="absolute -left-[20px] top-0 w-9 h-9 bg-slate-900 rounded-full flex items-center justify-center shadow-lg border-4 border-slate-50">
                  <Calendar size={14} className="text-white"/>
                </div>
                <h3 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 mb-8 pt-1">{date}</h3>
                
                {/* SECTION GROUPS WITHIN DATE */}
                <div className="space-y-8">
                  {Object.keys(processedSchedule[date]).sort().map(sectionTitle => (
                    <div key={sectionTitle} className="bg-slate-100/50 p-6 md:p-8 rounded-[2rem] border border-slate-200">
                      
                      {/* Section Header */}
                      <div className="flex items-center gap-3 mb-6">
                         <div className="bg-blue-600 text-white p-2 rounded-lg shadow-sm">
                           <Layers size={16} />
                         </div>
                         <h4 className="text-lg font-bold text-slate-800 tracking-tight">{sectionTitle}</h4>
                      </div>

                      {/* Cards for this Section */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {processedSchedule[date][sectionTitle].map((s, idx) => (
                          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all group flex flex-col justify-between">
                            
                            <div>
                              <span className="text-[10px] font-bold uppercase text-blue-600 tracking-widest block mb-2">{s.subject_code}</span>
                              <h5 className="text-base font-semibold text-slate-900 leading-snug mb-6">{s.subject_name}</h5>
                            </div>
                            
                            <div className="flex items-center gap-3 border-t border-slate-100 pt-4 mt-auto">
                              <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Time</span>
                                <span className="text-xs font-semibold text-slate-800">{formatTime(s.start_time)} - {formatTime(s.end_time)}</span>
                              </div>
                              <div className="flex-1 bg-blue-50 p-3 rounded-xl border border-blue-100">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-blue-500 block mb-1">Room</span>
                                <span className="text-xs font-bold text-blue-900">{s.room}</span>
                              </div>
                            </div>
                            
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm mt-8">
            <BookOpen size={48} className="mx-auto text-slate-300 mb-4"/>
            <p className="text-xl font-semibold text-slate-800 tracking-tight mb-2">No Schedule Found</p>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
              Adjust your filters or subscribe above to be notified instantly when it drops.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentPortal;
