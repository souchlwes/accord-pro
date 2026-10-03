import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, Search, Calendar, Clock, Home, BookOpen, 
  BellRing, CheckCircle2, Lock, Mail, Loader2, AlertCircle, DownloadCloud, Layers
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

  // Subscriptions & Export States
  const [subEmail, setSubEmail] = useState('');
  const [subYear, setSubYear] = useState('');
  const [subSection, setSubSection] = useState('');
  const [subLoading, setSubLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

    const grouped = {};
    data.forEach(item => {
      if (!grouped[item.exam_date]) grouped[item.exam_date] = {};
      const secKey = `Year ${item.year_level} - Section ${item.section}`;
      if (!grouped[item.exam_date][secKey]) grouped[item.exam_date][secKey] = [];
      grouped[item.exam_date][secKey].push(item);
    });

    return grouped;
  }, [publicSchedule, viewMode, filterYear, searchQuery]);

  // --- PREMIUM EXECUTIVE PDF EXPORT ENGINE ---
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait' });
      const deptName = unlockedDept.name || 'Department';
      const deptCode = unlockedDept.code || 'DEPT';
      const uniName = unlockedDept.university || 'University';
      const campusName = unlockedDept.campus_location || 'Main';

      // Bulletproof Image Loader to bypass CORS issues
      const getBase64ImageFromUrl = (imageUrl) => {
        return new Promise((resolve) => {
          if (!imageUrl) { resolve(null); return; }
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          };
          img.onerror = () => resolve(null); 
          img.src = imageUrl;
        });
      };

      // Smart Logo Logic: Prevents Duplicate Logos
      let uniLogoData = await getBase64ImageFromUrl(unlockedDept.university_logo_url);
      let deptLogoData = await getBase64ImageFromUrl(unlockedDept.logo_url);

      if (!uniLogoData && !deptLogoData) {
        uniLogoData = accordLogo; 
      } else if (uniLogoData && deptLogoData && unlockedDept.university_logo_url === unlockedDept.logo_url) {
        deptLogoData = null; 
      } else if (!uniLogoData && deptLogoData) {
        uniLogoData = deptLogoData; 
        deptLogoData = null;
      }

      let isFirstPage = true;

      Object.keys(processedSchedule).sort().forEach(date => {
        Object.keys(processedSchedule[date]).sort().forEach(section => {
          
          if (!isFirstPage) doc.addPage();
          isFirstPage = false;
          
          const pageWidth = doc.internal.pageSize.getWidth();
          
          if (uniLogoData) doc.addImage(uniLogoData, 'PNG', 14, 14, 24, 24);
          if (deptLogoData) doc.addImage(deptLogoData, 'PNG', pageWidth - 38, 14, 24, 24);

          // PREMIUM MODERN IDENTITY: Pure Helvetica, clean hierarchy
          doc.setFont("helvetica", "bold");
          doc.setFontSize(16);
          doc.setTextColor(15, 23, 42); 
          doc.text(uniName.toUpperCase(), pageWidth / 2, 20, { align: 'center' });
          
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(100, 116, 139); 
          doc.text(`${deptName.toUpperCase()} (${deptCode}) • ${campusName.toUpperCase()} CAMPUS`, pageWidth / 2, 26, { align: 'center' });

          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(37, 99, 235); 
          doc.text(`OFFICIAL SECTION ITINERARY`, pageWidth / 2, 31, { align: 'center' });

          // Modern Border Divides
          doc.setDrawColor(15, 23, 42); 
          doc.setLineWidth(0.8);
          doc.line(14, 40, pageWidth - 14, 40);
          
          doc.setDrawColor(226, 232, 240); 
          doc.setLineWidth(0.2);
          doc.line(14, 41.5, pageWidth - 14, 41.5);

          let currentY = 50;
          
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(15, 23, 42);
          doc.text(`EXAM DATE:`, 14, currentY);
          
          doc.setFont("helvetica", "normal");
          doc.text(date.toUpperCase(), 40, currentY);
          currentY += 6;
          
          doc.setFont("helvetica", "bold");
          doc.text(`SECTION:`, 14, currentY);
          
          doc.setFont("helvetica", "normal");
          doc.text(section.toUpperCase(), 35, currentY);
          currentY += 10;

          const items = processedSchedule[date][section];
          const tableRows = items.map(item => [
            `${formatTime(item.start_time)}\n${formatTime(item.end_time)}`,
            item.subject_code,
            item.subject_name,
            item.room
          ]);

          autoTable(doc, {
            head: [["TIME", "CODE", "SUBJECT", "ROOM"]],
            body: tableRows,
            startY: currentY,
            theme: 'grid', 
            styles: { 
              font: 'helvetica', 
              fontSize: 9, 
              cellPadding: 6,
              textColor: [30, 41, 59], 
              lineColor: [203, 213, 225], 
              lineWidth: 0.1,
              valign: 'middle'
            },
            headStyles: { 
              font: 'helvetica', 
              fillColor: [15, 23, 42], 
              textColor: [255, 255, 255], 
              fontSize: 8, 
              fontStyle: 'bold', 
              halign: 'center',
              lineColor: [15, 23, 42],
              lineWidth: 0.1
            },
            columnStyles: {
              0: { halign: 'center', fontStyle: 'bold', cellWidth: 28 }, // Perfect fit for stacked time
              1: { halign: 'center', fontStyle: 'bold', cellWidth: 32 },
              2: { halign: 'left' },
              3: { halign: 'center', fontStyle: 'bold', cellWidth: 28, textColor: [37, 99, 235] } // Expanded width so ROOM never wraps
            },
            alternateRowStyles: { fillColor: [248, 250, 252] }, 
            margin: { bottom: 30, left: 14, right: 14 },
            didDrawPage: () => {
              const printDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
              doc.setFont("helvetica", "italic");
              doc.setFontSize(8);
              doc.setTextColor(148, 163, 184); 
              
              doc.setDrawColor(226, 232, 240);
              doc.setLineWidth(0.5);
              doc.line(14, doc.internal.pageSize.getHeight() - 15, pageWidth - 14, doc.internal.pageSize.getHeight() - 15);

              doc.text(`Generated securely by Accord Pro System: ${printDate}`, 14, doc.internal.pageSize.getHeight() - 10);
              doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
            }
          });
        });
      });

      const fileNameTag = filterYear !== 'ALL' ? `Yr${filterYear}` : 'Master';
      doc.save(`Accord_${deptCode}_${fileNameTag}_Schedule.pdf`);
      
    } catch (err) {
      alert("PDF Export Failed. Please check your connection.");
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  // --- LOCK SCREEN ---
  if (!unlockedDept) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative font-sans overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-blue-600/10 blur-[120px] pointer-events-none"></div>
        <button onClick={onBack} className="absolute top-6 left-6 md:top-10 md:left-10 text-slate-400 hover:text-white flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors z-50 bg-white/5 hover:bg-white/10 px-5 py-3.5 rounded-[1rem] border border-white/5 shadow-sm backdrop-blur-md">
          <ArrowLeft size={16} /> Back to Auth
        </button>

        <div className="bg-slate-900/50 backdrop-blur-3xl p-10 md:p-14 rounded-[3rem] w-full max-w-md shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-white/10 text-center animate-in zoom-in-95 duration-500 relative z-10">
          <img src={accordLogo} alt="Accord Pro Logo" className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-6 object-contain brightness-0 invert opacity-90 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]" />
          <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter mb-2 text-white">Student <span className="text-emerald-500">Portal</span></h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-10">Secure Master View</p>
          
          <form onSubmit={handleUnlock}>
            {unlockError && (
              <div className="bg-rose-500/20 border border-rose-500/50 text-rose-300 text-[10px] font-black uppercase p-4 rounded-xl mb-6 flex items-center justify-center gap-2 backdrop-blur-sm">
                <AlertCircle size={16} /> {unlockError}
              </div>
            )}
            
            <div className="relative mb-8">
              <Lock size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                required
                maxLength="6"
                placeholder="6-Digit PIN" 
                value={accessCode} 
                onChange={e => setAccessCode(e.target.value)} 
                className="w-full bg-black/40 text-white px-6 py-5 pl-14 rounded-2xl font-bold text-xl md:text-2xl text-center tracking-[0.4em] uppercase border-2 border-white/10 focus:border-blue-500 outline-none transition-all shadow-inner placeholder:text-slate-500 placeholder:tracking-normal"
              />
            </div>

            <button type="submit" disabled={isUnlocking || accessCode.length < 5} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-white/5 disabled:text-slate-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 text-xs flex items-center justify-center gap-2 border border-emerald-500/50">
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
      
      {/* --- ACCORD PRO DARK HEADER HERO --- */}
      <div className="bg-slate-950 pt-6 pb-24 md:pt-10 md:pb-32 px-4 md:px-8 relative overflow-hidden rounded-b-[3rem] md:rounded-b-[4rem] shadow-2xl">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none -mr-40 -mt-40 mix-blend-screen"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none -ml-40 -mb-40 mix-blend-screen"></div>

        {/* Minimal Nav */}
        <nav className="max-w-7xl mx-auto flex items-center justify-between relative z-50 mb-8 md:mb-16">
          <div className="flex items-center gap-3 text-white">
            <img src={accordLogo} alt="Accord Pro" className="w-8 h-8 object-contain brightness-0 invert" />
            <span className="text-base font-black uppercase tracking-tighter italic">Accord <span className="text-blue-500">Pro</span></span>
          </div>
          <button onClick={onBack} className="text-slate-400 hover:text-white bg-white/5 hover:bg-rose-500 px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border border-white/10 shadow-sm">
            <Lock size={14} /> Exit Board
          </button>
        </nav>

        {/* Hero Content with FLAT WHITE EMBEDDED CREST */}
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 relative z-20">
          
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-10 text-center md:text-left">
            <div className="relative shrink-0 flex items-center justify-center">
               <div className="absolute inset-0 bg-white/5 blur-[30px] rounded-full mix-blend-screen"></div>
               <img 
                 src={unlockedDept.logo_url || accordLogo} 
                 alt="Dept Crest" 
                 className="w-24 h-24 md:w-32 md:h-32 object-contain relative z-10 brightness-0 invert opacity-90 drop-shadow-[0_10px_20px_rgba(255,255,255,0.2)]" 
               />
            </div>
            <div>
               <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-emerald-400 mb-3 drop-shadow-md">Master Public Timeline</p>
               <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white mb-3 leading-none drop-shadow-lg">
                 {unlockedDept.code} <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500">Board</span>
               </h2>
               <p className="text-xs md:text-sm font-bold text-slate-400 tracking-widest uppercase">{unlockedDept.name} • {new Date().getFullYear()}</p>
            </div>
          </div>

          {/* Integrated Subscribe Box inside the Dark Hero */}
          <div className="w-full lg:max-w-md bg-white/5 backdrop-blur-2xl p-6 md:p-8 rounded-[2.5rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2 mb-2">
              <BellRing size={20} className="text-blue-400"/> Auto-Alerts
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
              Get an email instantly when your schedule drops.
            </p>
            
            {isSubscribed ? (
              <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 p-4 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-inner">
                <CheckCircle2 size={18}/> Subscribed Successfully
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-3">
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
                  <input 
                    type="email" required placeholder="Student Email" value={subEmail} onChange={e => setSubEmail(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 p-3.5 pl-12 rounded-xl font-bold text-xs outline-none focus:border-blue-500 text-white placeholder:text-slate-500 transition-all"
                  />
                </div>
                <div className="flex gap-3">
                   <input 
                     type="number" required min="1" max="5" placeholder="Year" value={subYear} onChange={e => setSubYear(e.target.value)}
                     className="w-full bg-black/40 border border-white/10 p-3.5 rounded-xl font-bold text-xs outline-none focus:border-blue-500 text-white text-center placeholder:text-slate-500 transition-all"
                   />
                   <input 
                     type="text" required maxLength="2" placeholder="Sec" value={subSection} onChange={e => setSubSection(e.target.value)}
                     className="w-full bg-black/40 border border-white/10 p-3.5 rounded-xl font-bold text-xs outline-none focus:border-blue-500 text-white text-center uppercase placeholder:text-slate-500 transition-all"
                   />
                </div>
                <button type="submit" disabled={subLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center border border-blue-500/50 mt-2">
                  {subLoading ? <Loader2 size={16} className="animate-spin" /> : 'Notify Me'}
                </button>
              </form>
            )}
          </div>

        </div>
      </div>

      <main className="container mx-auto px-4 md:px-8 max-w-6xl -mt-10 md:-mt-16 relative z-30">
        
        {/* PREMIUM FLOATING TOOLBAR (Natural scrolling, no sticky annoyance) */}
        <div className="bg-white/90 backdrop-blur-xl p-4 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col lg:flex-row items-center gap-4 relative z-30 mb-8 mt-6">
           
           <div className="flex bg-slate-100 p-1 rounded-xl w-full lg:w-auto shrink-0 shadow-inner">
              <button onClick={() => setViewMode('upcoming')} className={`flex-1 px-5 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'upcoming' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>Upcoming</button>
              <button onClick={() => setViewMode('history')} className={`flex-1 px-5 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'history' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>History</button>
           </div>
           
           <div className="relative w-full lg:flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search subject or room..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 p-3 pl-11 rounded-xl font-bold text-xs border border-slate-200 outline-none focus:border-blue-500 transition-all text-slate-900"
              />
           </div>
           
           <div className="flex bg-slate-100 p-1 rounded-xl w-full lg:w-auto overflow-x-auto custom-scrollbar shrink-0 shadow-inner">
              <button onClick={() => setFilterYear('ALL')} className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${filterYear === 'ALL' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>All Yrs</button>
              {[1, 2, 3, 4, 5].map(y => (
                <button key={y} onClick={() => setFilterYear(String(y))} className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${String(filterYear) === String(y) ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>Yr {y}</button>
              ))}
           </div>

           <button 
             onClick={handleExportPDF} 
             disabled={isExporting}
             className="w-full lg:w-auto bg-slate-900 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 disabled:opacity-75 disabled:hover:bg-slate-900 transition-colors shrink-0 shadow-md active:scale-95"
           >
             {isExporting ? <Loader2 size={14} className="animate-spin" /> : <DownloadCloud size={14} />}
             {isExporting ? 'Generating...' : 'Save PDF'}
           </button>
        </div>

        {/* --- GROUPED TIMELINE RENDERER (Compact & Premium) --- */}
        {Object.keys(processedSchedule).length > 0 ? (
          <div className="space-y-12 pt-2">
            {Object.keys(processedSchedule).sort().map(date => (
              <div key={date} className="relative pl-6 md:pl-10 border-l-[4px] border-slate-200">
                
                {/* Date Anchor */}
                <div className="absolute -left-[20px] top-0 w-9 h-9 bg-slate-900 rounded-full flex items-center justify-center shadow-lg border-4 border-slate-50">
                  <Calendar size={14} className="text-white"/>
                </div>
                <h3 className="text-2xl md:text-3xl font-black tracking-tighter text-slate-900 mb-8 pt-0.5 uppercase">{date}</h3>
                
                {/* SECTION GROUPS WITHIN DATE */}
                <div className="space-y-6">
                  {Object.keys(processedSchedule[date]).sort().map(sectionTitle => (
                    <div key={sectionTitle} className="bg-white p-5 md:p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                      
                      {/* Section Header */}
                      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                         <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-md">
                           <Layers size={16} />
                         </div>
                         <h4 className="text-lg font-black uppercase tracking-tight text-slate-900">{sectionTitle}</h4>
                      </div>

                      {/* Compact Cards for this Section */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {processedSchedule[date][sectionTitle].map((s, idx) => (
                          <div key={idx} className="bg-slate-50 p-4 md:p-5 rounded-[1.5rem] border border-slate-100 hover:border-blue-300 hover:shadow-md transition-all group flex flex-col justify-between relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500 opacity-20 group-hover:opacity-100 transition-opacity"></div>

                            <div>
                              <span className="text-[9px] font-black uppercase text-blue-600 tracking-[0.2em] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 inline-block mb-3 shadow-sm">{s.subject_code}</span>
                              <h5 className="text-sm font-bold text-slate-900 leading-snug mb-5 line-clamp-2">{s.subject_name}</h5>
                            </div>
                            
                            <div className="flex items-center gap-2 border-t border-slate-200/60 pt-3 mt-auto">
                              <div className="flex-1 bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Time block</span>
                                <span className="text-[10px] font-bold text-slate-800">{formatTime(s.start_time)} - {formatTime(s.end_time)}</span>
                              </div>
                              <div className="flex-1 bg-blue-50 p-2.5 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden">
                                <Home size={24} className="absolute -right-2 -bottom-2 text-blue-200/50 pointer-events-none"/>
                                <span className="text-[8px] font-black uppercase tracking-widest text-blue-500 block mb-0.5 relative z-10">Room</span>
                                <span className="text-[10px] font-bold text-blue-900 relative z-10">{s.room}</span>
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
          <div className="text-center py-20 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm mt-8">
            <BookOpen size={48} className="mx-auto text-slate-300 mb-4"/>
            <p className="text-2xl font-black uppercase text-slate-800 tracking-tighter mb-2">No Schedule Found</p>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
              Adjust your filters or subscribe above to be notified instantly when it drops.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentPortal;
