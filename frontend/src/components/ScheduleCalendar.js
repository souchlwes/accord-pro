import React, { useState, useMemo, useEffect } from 'react';
import { Search, Clock, MapPin, User, Calendar as CalendarIcon, ShieldAlert, X, Layers, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';

const ScheduleCalendar = ({ scheduleData = [], examDates = [] }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState([1, 2, 3, 4, 5]);
  const [selectedExam, setSelectedExam] = useState(null); 
  
  // --- PAGINATION STATES ---
  const [viewMode, setViewMode] = useState('DAY'); // 'DAY' or 'WEEK'
  const [currentPage, setCurrentPage] = useState(0); 
  
  // --- LIVE TIME TRACKER ---
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const rowHeight = 120; 

  // Update current time every minute for the live red indicator line
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}-${String(currentTime.getDate()).padStart(2, '0')}`;

  const sortedDates = useMemo(() => {
    return [...new Set(examDates)].filter(Boolean).sort();
  }, [examDates]);

  useEffect(() => {
    setCurrentPage(0);
  }, [sortedDates.length]);

  // --- PAGINATION LOGIC ---
  const visibleDates = useMemo(() => {
    if (sortedDates.length === 0) return [];
    if (viewMode === 'DAY') {
      return [sortedDates[currentPage]] || [];
    } else {
      return sortedDates.slice(currentPage, currentPage + 5);
    }
  }, [sortedDates, viewMode, currentPage]);

  const handlePrev = () => {
    if (viewMode === 'DAY') setCurrentPage(p => Math.max(0, p - 1));
    else setCurrentPage(p => Math.max(0, p - 5));
  };

  const handleNext = () => {
    if (viewMode === 'DAY') setCurrentPage(p => Math.min(sortedDates.length - 1, p + 1));
    else setCurrentPage(p => Math.min(sortedDates.length - 1, p + 5));
  };

  // --- COLLISION & LAYOUT ENGINE ---
  const processedSchedules = useMemo(() => {
    const dailyGroups = {};
    
    const filtered = scheduleData.filter(item => {
      const sTerm = (searchTerm || "").toLowerCase();
      const matchesSearch = 
        (item.subject_code || "").toLowerCase().includes(sTerm) ||
        (item.room || "").toLowerCase().includes(sTerm) ||
        (item.proctor || "").toLowerCase().includes(sTerm) ||
        (item.dept_code || "").toLowerCase().includes(sTerm); 
        
      const matchesYear = activeFilters.includes(Number(item.year_level));
      return matchesSearch && matchesYear;
    });

    filtered.forEach(item => {
      if (!dailyGroups[item.exam_date]) dailyGroups[item.exam_date] = [];
      dailyGroups[item.exam_date].push({ ...item });
    });

    Object.keys(dailyGroups).forEach(date => {
      const dayExams = dailyGroups[date].sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
      const columns = []; 

      dayExams.forEach(exam => {
        let placed = false;
        for (let i = 0; i < columns.length; i++) {
          const lastInCol = columns[i][columns[i].length - 1];
          if (exam.start_time >= lastInCol.end_time) {
            columns[i].push(exam);
            exam.colIndex = i;
            placed = true;
            break;
          }
        }
        if (!placed) {
          exam.colIndex = columns.length;
          columns.push([exam]);
        }
      });

      dayExams.forEach(exam => {
        const overlapping = dayExams.filter(other => 
          (exam.start_time < other.end_time && exam.end_time > other.start_time)
        );
        const maxCols = Math.max(...overlapping.map(o => o.colIndex)) + 1;
        exam.visualWidth = 100 / maxCols;
        exam.visualLeft = exam.colIndex * (100 / maxCols);
      });
    });

    return dailyGroups;
  }, [searchTerm, activeFilters, scheduleData]);

  // Apple Calendar-style translucent pastel colors
  const yearStyles = {
    1: "bg-blue-500/10 border-blue-500/50 text-blue-900 shadow-sm",
    2: "bg-emerald-500/10 border-emerald-500/50 text-emerald-900 shadow-sm",
    3: "bg-amber-500/10 border-amber-500/50 text-amber-900 shadow-sm",
    4: "bg-purple-500/10 border-purple-500/50 text-purple-900 shadow-sm",
    5: "bg-rose-500/10 border-rose-500/50 text-rose-900 shadow-sm",
  };

  const getTopOffset = (timeStr) => {
    if (!timeStr) return 0;
    const [hrs, mins] = timeStr.split(':').map(Number);
    return ((hrs - 8) * rowHeight) + (mins * (rowHeight / 60));
  };

  const getHeight = (start, end) => {
    if(!start || !end) return 80;
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    const totalMinutes = (eH * 60 + eM) - (sH * 60 + sM);
    return Math.max(totalMinutes * (rowHeight / 60), 60);
  };

  return (
    <div className="flex flex-col w-full h-[95vh] bg-white rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-slate-200/60 overflow-hidden mt-8 relative font-sans antialiased">
      
      {/* PREMIUM FROSTED TOOLBAR */}
      <div className="bg-slate-900/95 backdrop-blur-2xl px-6 py-5 md:px-8 md:py-6 flex flex-wrap items-center justify-between gap-6 text-white relative z-50 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 w-10 h-10 md:w-12 md:h-12 rounded-[1rem] shadow-lg shadow-blue-500/30 flex items-center justify-center border border-white/10">
            <Layers size={22} className="text-white"/>
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-black uppercase tracking-tight leading-none text-slate-50">Master Timeline</h2>
            <p className="text-[9px] md:text-[10px] text-blue-400 font-semibold tracking-widest uppercase mt-1">Global System View</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          
          {/* iOS STYLE SEGMENTED CONTROL */}
          <div className="flex bg-black/40 p-1 rounded-[1rem] border border-white/5 shadow-inner">
            <button onClick={() => { setViewMode('DAY'); setCurrentPage(0); }} className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all uppercase ${viewMode === 'DAY' ? 'bg-white/10 text-white shadow-sm border border-white/10' : 'text-slate-400 hover:text-slate-200'}`}>
              Day
            </button>
            <button onClick={() => { setViewMode('WEEK'); setCurrentPage(0); }} className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all uppercase ${viewMode === 'WEEK' ? 'bg-white/10 text-white shadow-sm border border-white/10' : 'text-slate-400 hover:text-slate-200'}`}>
              Week
            </button>
          </div>

          {/* DATE NAVIGATION PILL */}
          <div className="flex items-center bg-black/40 p-1 rounded-[1rem] border border-white/5 shadow-inner">
            <button onClick={handlePrev} disabled={currentPage === 0 || sortedDates.length === 0} className="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition-all rounded-xl hover:bg-white/5">
              <ChevronLeft size={16} strokeWidth={2.5}/>
            </button>
            <div className="px-4 text-[10px] font-black text-white uppercase tracking-widest text-center min-w-[140px]">
              {sortedDates.length === 0 ? 'NO DATES' : 
                viewMode === 'DAY' ? new Date(sortedDates[currentPage]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
                : `BLOCK ${Math.floor(currentPage / 5) + 1}`
              }
            </div>
            <button onClick={handleNext} disabled={sortedDates.length === 0 || (viewMode === 'DAY' ? currentPage >= sortedDates.length - 1 : currentPage + 5 >= sortedDates.length)} className="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition-all rounded-xl hover:bg-white/5">
              <ChevronRight size={16} strokeWidth={2.5}/>
            </button>
          </div>

          {/* MAC OS STYLE YEAR FILTERS */}
          <div className="hidden md:flex bg-black/40 p-1 rounded-[1rem] border border-white/5 shadow-inner">
            {[1, 2, 3, 4, 5].map(y => (
              <button 
                key={y}
                onClick={() => setActiveFilters(prev => prev.includes(y) ? prev.filter(x => x!==y) : [...prev, y])}
                className={`w-10 h-8 rounded-xl text-[10px] font-black transition-all flex items-center justify-center ${activeFilters.includes(y) ? 'bg-white/10 text-white shadow-sm border border-white/10' : 'text-slate-500 hover:text-slate-300'}`}
                title={`Toggle Year ${y}`}
              >
                Y{y}
              </button>
            ))}
          </div>

          {/* SLEEK SEARCH BAR */}
          <div className="relative w-full md:w-56">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={14}/>
            <input 
              placeholder="Search timeline..." 
              className="w-full pl-9 pr-4 py-2.5 bg-black/40 border border-white/5 rounded-[1rem] text-[11px] font-medium text-white placeholder:text-slate-500 outline-none focus:border-blue-500/50 transition-all shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* DATE HEADER ALIGNMENT */}
      <div className="flex bg-slate-50/80 backdrop-blur-xl border-b border-slate-200 z-40 shrink-0 sticky top-0">
        <div className="w-20 md:w-24 border-r border-slate-200 flex items-center justify-center">
          <Clock size={16} className="text-slate-300" strokeWidth={2} />
        </div>
        {visibleDates.length === 0 ? (
          <div className="flex-1 py-6 text-center"><p className="text-slate-400 text-xs font-black uppercase tracking-widest">No active sessions</p></div>
        ) : visibleDates.map((date, idx) => {
          const isToday = date === todayStr;
          return (
            <div key={idx} className="flex-1 py-4 text-center border-r border-slate-200 last:border-0 relative">
              <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isToday ? 'text-rose-500' : 'text-slate-400'}`}>
                {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
              </p>
              <div className={`mx-auto w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full text-lg md:text-xl font-black tracking-tight ${isToday ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'text-slate-800'}`}>
                {new Date(date).toLocaleDateString('en-US', { day: 'numeric' })}
              </div>
            </div>
          );
        })}
      </div>

      {/* CALENDAR GRID */}
      <div className="flex-1 overflow-y-auto relative flex scroll-smooth custom-scrollbar bg-white">
        
        {/* TIME LABELS (Y-AXIS) */}
        <div className="w-20 md:w-24 sticky left-0 z-30 bg-white/90 backdrop-blur-xl border-r border-slate-200 shrink-0">
          {Array.from({ length: 14 }, (_, i) => i + 8).map(hr => (
            <div key={hr} style={{ height: rowHeight }} className="relative border-b border-slate-100 flex items-start justify-center pt-2">
              <span className="text-[10px] md:text-xs font-semibold text-slate-400">{String(hr % 12 || 12)} {hr >= 12 ? 'PM' : 'AM'}</span>
            </div>
          ))}
        </div>

        {/* COLUMNS (X-AXIS) */}
        <div className={`flex flex-1 relative ${viewMode === 'WEEK' ? 'min-w-[1000px]' : 'min-w-full'}`}>
          
          {/* BACKGROUND GRID LINES */}
          <div className="absolute inset-0 pointer-events-none flex flex-col z-0">
            {Array.from({ length: 14 }).map((_, hr) => (
              <div key={hr} style={{ height: rowHeight }} className="border-b border-slate-100 w-full" />
            ))}
          </div>

          {/* LIVE CURRENT TIME INDICATOR */}
          {(() => {
            const currentHr = currentTime.getHours();
            const currentMin = currentTime.getMinutes();
            if (currentHr >= 8 && currentHr < 22) {
              const topOffset = getTopOffset(`${currentHr}:${currentMin}`);
              return (
                <div 
                  className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                  style={{ top: topOffset, transform: 'translateY(-50%)' }}
                >
                  <div className="w-2 h-2 rounded-full bg-rose-500 ml-[-4px] shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                  <div className="h-[2px] bg-rose-500/80 w-full shadow-[0_1px_4px_rgba(244,63,94,0.3)]" />
                </div>
              );
            }
            return null;
          })()}

          {visibleDates.map((date) => (
            <div key={date} className="flex-1 border-r border-slate-100 relative group z-10">
              
              {/* DYNAMIC TRANSLUCENT CARDS */}
              {(processedSchedules[date] || []).map((exam, i) => {
                const isConflict = exam.hasConflict;
                return (
                  <div
                    key={exam.id || i}
                    onClick={() => setSelectedExam(exam)}
                    className={`absolute rounded-[1rem] p-2.5 md:p-3 shadow-sm z-10 transition-all duration-200 hover:z-50 hover:shadow-lg hover:scale-[1.02] cursor-pointer group/card border-l-[4px] backdrop-blur-md overflow-hidden ${isConflict ? 'bg-rose-500/10 border-rose-500 text-rose-950 animate-pulse' : yearStyles[exam.year_level]}`}
                    style={{
                      top: getTopOffset(exam.start_time) + 1,
                      height: getHeight(exam.start_time, exam.end_time) - 2,
                      left: `calc(${exam.visualLeft}% + 2px)`,
                      width: `calc(${exam.visualWidth}% - 4px)`,
                    }}
                  >
                    <div className="flex justify-between items-start mb-0.5 md:mb-1 opacity-90">
                        <span className="text-[8px] md:text-[9px] font-black uppercase tracking-wider truncate">
                          {exam.dept_code} {exam.year_level}{exam.section}
                        </span>
                        <Maximize2 size={10} className="opacity-0 group-hover/card:opacity-50 transition-opacity shrink-0" />
                    </div>
                    
                    <h4 className="text-[10px] md:text-[11px] font-black leading-tight uppercase truncate mb-1">
                        {exam.subject_code}
                    </h4>
                    
                    {/* Hide extra details if the card is extremely short (e.g. 30 min block) */}
                    {getHeight(exam.start_time, exam.end_time) > 50 && (
                      <div className="space-y-0.5 md:space-y-1 opacity-70 group-hover/card:opacity-100 transition-opacity">
                          <div className="flex items-center gap-1.5 text-[8px] md:text-[9px] font-semibold truncate">
                              <MapPin size={9} strokeWidth={2.5}/>
                              {exam.room}
                          </div>
                          <div className="flex items-center gap-1.5 text-[8px] md:text-[9px] font-semibold truncate uppercase">
                              <User size={9} strokeWidth={2.5}/>
                              {exam.proctor}
                          </div>
                      </div>
                    )}

                    {isConflict && <ShieldAlert size={14} className="absolute bottom-2 right-2 text-rose-600 drop-shadow-sm"/>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* APPLE-STYLE DETAIL MODAL */}
      {selectedExam && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-200">
            <div className="bg-white/90 backdrop-blur-3xl w-full max-w-sm md:max-w-md rounded-[2.5rem] shadow-[0_30px_80px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
                
                {/* Modal Header */}
                <div className="px-8 pt-8 pb-6 relative">
                    <button onClick={() => setSelectedExam(null)} className="absolute top-6 right-6 p-2 bg-slate-200/50 hover:bg-slate-300/50 rounded-full text-slate-500 transition-all">
                        <X size={16} strokeWidth={3} />
                    </button>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500 mb-1 block">Event Details</span>
                    <h3 className="text-3xl font-black tracking-tight text-slate-900 leading-none mb-1">
                      {selectedExam.dept_code} {selectedExam.year_level}{selectedExam.section}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{selectedExam.subject_name}</p>
                </div>
                
                {/* Modal Body */}
                <div className="px-8 pb-8 space-y-5">
                    <div className="bg-slate-100/50 rounded-2xl p-1 divide-y divide-slate-200/50 border border-slate-200/50">
                      
                      <div className="flex items-center gap-4 p-4">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><Clock size={14} strokeWidth={2.5}/></div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Time & Date</p>
                          <p className="text-xs font-bold text-slate-800">{selectedExam.start_time} - {selectedExam.end_time} • {selectedExam.exam_date}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 p-4">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><MapPin size={14} strokeWidth={2.5}/></div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Location</p>
                          <p className="text-xs font-bold text-slate-800">Room {selectedExam.room}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 p-4">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0"><User size={14} strokeWidth={2.5}/></div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Invigilator</p>
                          <p className="text-xs font-bold text-slate-800 uppercase">{selectedExam.proctor}</p>
                        </div>
                      </div>

                    </div>

                    {selectedExam.hasConflict && (
                        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start gap-4 text-rose-700 shadow-sm">
                            <ShieldAlert size={20} className="shrink-0 mt-0.5" />
                            <div>
                                <p className="font-black uppercase text-[10px] tracking-wide mb-0.5">Double-Booking Detected</p>
                                <p className="text-[11px] font-medium leading-relaxed">Resource clash detected with {selectedExam.conflictWith || "another schedule in the Global Timeline"}.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleCalendar;
