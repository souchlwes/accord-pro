import React, { useState, useMemo, useEffect } from 'react';
import { Search, Clock, MapPin, User, Calendar as CalendarIcon, ShieldAlert, X, Layers, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';

const ScheduleCalendar = ({ scheduleData = [], examDates = [] }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState([1, 2, 3, 4, 5]);
  const [selectedExam, setSelectedExam] = useState(null); 
  const [viewMode, setViewMode] = useState('DAY'); 
  const [currentPage, setCurrentPage] = useState(0); 
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const rowHeight = 120; 

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

  const visibleDates = useMemo(() => {
    if (sortedDates.length === 0) return [];
    if (viewMode === 'DAY') return [sortedDates[currentPage]] || [];
    return sortedDates.slice(currentPage, currentPage + 5);
  }, [sortedDates, viewMode, currentPage]);

  const handlePrev = () => {
    if (viewMode === 'DAY') setCurrentPage(p => Math.max(0, p - 1));
    else setCurrentPage(p => Math.max(0, p - 5));
  };

  const handleNext = () => {
    if (viewMode === 'DAY') setCurrentPage(p => Math.min(sortedDates.length - 1, p + 1));
    else setCurrentPage(p => Math.min(sortedDates.length - 1, p + 5));
  };

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
    <div className="flex flex-col w-full h-[85vh] md:h-[95vh] bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-slate-200/60 overflow-hidden mt-4 md:mt-8 relative font-sans antialiased">
      
      {/* PREMIUM FROSTED TOOLBAR (MOBILE-AWARE) */}
      <div className="bg-slate-900/95 backdrop-blur-2xl p-5 md:px-8 md:py-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4 md:gap-6 text-white relative z-50 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 w-10 h-10 md:w-12 md:h-12 rounded-[1rem] shadow-lg shadow-blue-500/30 flex items-center justify-center border border-white/10 shrink-0">
            <Layers size={20} className="text-white"/>
          </div>
          <div>
            <h2 className="text-base md:text-xl font-black uppercase tracking-tight leading-none text-slate-50">Master Timeline</h2>
            <p className="text-[9px] md:text-[10px] text-blue-400 font-semibold tracking-widest uppercase mt-1">Global System View</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full xl:w-auto">
          
          <div className="flex bg-black/40 p-1 rounded-xl md:rounded-[1rem] border border-white/5 shadow-inner flex-1 md:flex-none">
            <button onClick={() => { setViewMode('DAY'); setCurrentPage(0); }} className={`flex-1 md:flex-none px-3 md:px-5 py-2 rounded-lg md:rounded-xl text-[10px] font-black transition-all uppercase ${viewMode === 'DAY' ? 'bg-white/10 text-white shadow-sm border border-white/10' : 'text-slate-400 hover:text-slate-200'}`}>
              Day
            </button>
            <button onClick={() => { setViewMode('WEEK'); setCurrentPage(0); }} className={`flex-1 md:flex-none px-3 md:px-5 py-2 rounded-lg md:rounded-xl text-[10px] font-black transition-all uppercase ${viewMode === 'WEEK' ? 'bg-white/10 text-white shadow-sm border border-white/10' : 'text-slate-400 hover:text-slate-200'}`}>
              Week
            </button>
          </div>

          <div className="flex items-center bg-black/40 p-1 rounded-xl md:rounded-[1rem] border border-white/5 shadow-inner flex-1 md:flex-none justify-between">
            <button onClick={handlePrev} disabled={currentPage === 0 || sortedDates.length === 0} className="p-1.5 md:p-2 text-slate-400 hover:text-white disabled:opacity-30 transition-all rounded-lg md:rounded-xl hover:bg-white/5">
              <ChevronLeft size={16} strokeWidth={2.5}/>
            </button>
            <div className="px-2 md:px-4 text-[9px] md:text-[10px] font-black text-white uppercase tracking-widest text-center min-w-[100px] md:min-w-[140px] truncate">
              {sortedDates.length === 0 ? 'NO DATES' : 
                viewMode === 'DAY' ? new Date(sortedDates[currentPage]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) 
                : `BLOCK ${Math.floor(currentPage / 5) + 1}`
              }
            </div>
            <button onClick={handleNext} disabled={sortedDates.length === 0 || (viewMode === 'DAY' ? currentPage >= sortedDates.length - 1 : currentPage + 5 >= sortedDates.length)} className="p-1.5 md:p-2 text-slate-400 hover:text-white disabled:opacity-30 transition-all rounded-lg md:rounded-xl hover:bg-white/5">
              <ChevronRight size={16} strokeWidth={2.5}/>
            </button>
          </div>

          <div className="hidden lg:flex bg-black/40 p-1 rounded-[1rem] border border-white/5 shadow-inner">
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

          <div className="relative w-full lg:w-56 mt-2 lg:mt-0">
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
        <div className="w-14 md:w-20 lg:w-24 border-r border-slate-200 flex items-center justify-center shrink-0">
          <Clock size={14} className="text-slate-300 md:w-4 md:h-4" strokeWidth={2} />
        </div>
        {visibleDates.length === 0 ? (
          <div className="flex-1 py-4 md:py-6 text-center"><p className="text-slate-400 text-[10px] md:text-xs font-black uppercase tracking-widest">No active sessions</p></div>
        ) : visibleDates.map((date, idx) => {
          const isToday = date === todayStr;
          return (
            <div key={idx} className="flex-1 py-3 md:py-4 text-center border-r border-slate-200 last:border-0 relative min-w-[120px] md:min-w-0">
              <p className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-0.5 ${isToday ? 'text-rose-500' : 'text-slate-400'}`}>
                {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
              </p>
              <div className={`mx-auto w-7 h-7 md:w-10 md:h-10 flex items-center justify-center rounded-full text-base md:text-xl font-black tracking-tight ${isToday ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'text-slate-800'}`}>
                {new Date(date).toLocaleDateString('en-US', { day: 'numeric' })}
              </div>
            </div>
          );
        })}
      </div>

      {/* CALENDAR GRID WITH HORIZONTAL SCROLL ON MOBILE */}
      <div className="flex-1 overflow-y-auto overflow-x-auto relative flex scroll-smooth custom-scrollbar bg-white">
        
        {/* TIME LABELS (Y-AXIS) */}
        <div className="w-14 md:w-20 lg:w-24 sticky left-0 z-30 bg-white/95 backdrop-blur-xl border-r border-slate-200 shrink-0">
          {Array.from({ length: 14 }, (_, i) => i + 8).map(hr => (
            <div key={hr} style={{ height: rowHeight }} className="relative border-b border-slate-100 flex items-start justify-center pt-2">
              <span className="text-[9px] md:text-[10px] lg:text-xs font-semibold text-slate-400">{String(hr % 12 || 12)} {hr >= 12 ? 'PM' : 'AM'}</span>
            </div>
          ))}
        </div>

        {/* COLUMNS (X-AXIS) */}
        <div className={`flex flex-1 relative ${viewMode === 'WEEK' ? 'min-w-[800px] md:min-w-[1000px]' : 'min-w-full'}`}>
          
          <div className="absolute inset-0 pointer-events-none flex flex-col z-0">
            {Array.from({ length: 14 }).map((_, hr) => (
              <div key={hr} style={{ height: rowHeight }} className="border-b border-slate-100 w-full" />
            ))}
          </div>

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
            <div key={date} className="flex-1 border-r border-slate-100 relative group z-10 min-w-[120px] md:min-w-0">
              
              {(processedSchedules[date] || []).map((exam, i) => {
                const isConflict = exam.hasConflict;
                return (
                  <div
                    key={exam.id || i}
                    onClick={() => setSelectedExam(exam)}
                    className={`absolute rounded-xl md:rounded-[1rem] p-2 md:p-3 shadow-sm z-10 transition-all duration-200 hover:z-50 hover:shadow-lg hover:scale-[1.02] cursor-pointer group/card border-l-[3px] md:border-l-[4px] backdrop-blur-md overflow-hidden ${isConflict ? 'bg-rose-500/10 border-rose-500 text-rose-950 animate-pulse' : yearStyles[exam.year_level]}`}
                    style={{
                      top: getTopOffset(exam.start_time) + 1,
                      height: getHeight(exam.start_time, exam.end_time) - 2,
                      left: `calc(${exam.visualLeft}% + 2px)`,
                      width: `calc(${exam.visualWidth}% - 4px)`,
                    }}
                  >
                    <div className="flex justify-between items-start mb-0.5 opacity-90">
                        <span className="text-[7px] md:text-[9px] font-black uppercase tracking-wider truncate">
                          {exam.dept_code} {exam.year_level}{exam.section}
                        </span>
                        <Maximize2 size={10} className="hidden md:block opacity-0 group-hover/card:opacity-50 transition-opacity shrink-0" />
                    </div>
                    
                    <h4 className="text-[9px] md:text-[11px] font-black leading-tight uppercase truncate mb-1">
                        {exam.subject_code}
                    </h4>
                    
                    {getHeight(exam.start_time, exam.end_time) > 50 && (
                      <div className="space-y-0.5 md:space-y-1 opacity-70 group-hover/card:opacity-100 transition-opacity hidden sm:block">
                          <div className="flex items-center gap-1 text-[8px] md:text-[9px] font-semibold truncate">
                              <MapPin size={8} strokeWidth={2.5} className="md:w-[9px] md:h-[9px]"/>
                              {exam.room}
                          </div>
                          <div className="flex items-center gap-1 text-[8px] md:text-[9px] font-semibold truncate uppercase">
                              <User size={8} strokeWidth={2.5} className="md:w-[9px] md:h-[9px]"/>
                              {exam.proctor}
                          </div>
                      </div>
                    )}

                    {isConflict && <ShieldAlert size={12} className="absolute bottom-1.5 right-1.5 md:bottom-2 md:right-2 md:w-3.5 md:h-3.5 text-rose-600 drop-shadow-sm"/>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

     {/* RESTORED PREMIUM DETAIL MODAL (FOOLPROOF CLICK FIX) */}
      {selectedExam && (
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md"
            onMouseDown={(e) => {
              // Using onMouseDown instead of onClick prevents drag-clicking bugs
              if (e.target === e.currentTarget) setSelectedExam(null);
            }} 
        >
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative pointer-events-auto">
                
                {/* Dark Header */}
                <div className="p-8 md:p-10 text-white relative bg-slate-900">
                    <button 
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedExam(null);
                        }} 
                        className="absolute top-6 right-6 md:top-8 md:right-8 hover:rotate-90 transition-all text-slate-400 hover:text-white z-[100] p-2 cursor-pointer"
                    >
                        <X size={24} />
                    </button>
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Examination Record</span>
                    <h3 className="text-3xl md:text-5xl font-black mt-3 md:mt-4 italic tracking-tighter leading-none pr-8">
                      {selectedExam.dept_code} {selectedExam.year_level}{selectedExam.section}
                    </h3>
                    <p className="text-sm md:text-xl font-bold mt-2 md:mt-3 uppercase text-blue-400 truncate pr-6">{selectedExam.subject_name}</p>
                </div>
                
                {/* Solid White Body */}
                <div className="p-8 md:p-10 space-y-6 md:space-y-8 bg-white">
                    <div className="grid grid-cols-2 gap-6 md:gap-8">
                        <div>
                            <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase block mb-1">Time Window</span>
                            <p className="font-black text-xs md:text-sm text-slate-900"><Clock size={14} className="inline mr-1.5 md:mr-2 text-blue-500"/>{selectedExam.start_time} - {selectedExam.end_time}</p>
                        </div>
                        <div>
                            <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase block mb-1">Schedule Date</span>
                            <p className="font-black text-xs md:text-sm text-slate-900"><CalendarIcon size={14} className="inline mr-1.5 md:mr-2 text-blue-500"/>{selectedExam.exam_date}</p>
                        </div>
                        <div>
                            <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase block mb-1">Assigned Room</span>
                            <p className="font-black text-base md:text-xl text-slate-900"><MapPin size={14} className="inline mr-1.5 md:mr-2 text-emerald-500"/>{selectedExam.room}</p>
                        </div>
                        <div>
                            <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase block mb-1">Assigned Proctor</span>
                            <p className="font-black text-xs md:text-sm text-slate-900 uppercase truncate pr-2"><User size={14} className="inline mr-1.5 md:mr-2 text-amber-500"/>{selectedExam.proctor}</p>
                        </div>
                    </div>

                    {selectedExam.hasConflict && (
                        <div className="bg-rose-50 border-2 border-rose-100 p-4 md:p-6 rounded-2xl md:rounded-3xl flex items-center gap-4 md:gap-6 text-rose-700">
                            <ShieldAlert size={28} className="md:w-8 md:h-8 shrink-0" />
                            <div>
                                <p className="font-black uppercase text-[10px] md:text-xs">Conflict Alert</p>
                                <p className="text-[9px] md:text-[11px] italic mt-1 leading-relaxed">Resource clash detected with {selectedExam.conflictWith || "Global Schedule"}</p>
                            </div>
                        </div>
                    )}

                    <button 
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedExam(null);
                        }}
                        className="w-full bg-slate-950 text-white py-4 md:py-6 rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest hover:bg-blue-600 transition-all active:scale-95 cursor-pointer z-50 relative"
                    >
                        Close Details
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(ScheduleCalendar);
