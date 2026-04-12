import React, { useState, useMemo, useEffect } from 'react';
import { Search, Clock, MapPin, User, Calendar as CalendarIcon, ShieldAlert, X, Layers, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';

const ScheduleCalendar = ({ scheduleData = [], examDates = [] }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState([1, 2, 3, 4, 5]);
  const [selectedExam, setSelectedExam] = useState(null); 
  
  // --- PAGINATION STATES ---
  const [viewMode, setViewMode] = useState('DAY'); // 'DAY' or 'WEEK'
  const [currentPage, setCurrentPage] = useState(0); 
  
  const rowHeight = 120; 

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
    if (viewMode === 'DAY') {
      setCurrentPage(p => Math.max(0, p - 1));
    } else {
      setCurrentPage(p => Math.max(0, p - 5));
    }
  };

  const handleNext = () => {
    if (viewMode === 'DAY') {
      setCurrentPage(p => Math.min(sortedDates.length - 1, p + 1));
    } else {
      setCurrentPage(p => Math.min(sortedDates.length - 1, p + 5));
    }
  };

  // --- COLLISION & LAYOUT ENGINE ---
  const processedSchedules = useMemo(() => {
    const dailyGroups = {};
    
    const filtered = scheduleData.filter(item => {
      // FIX: Safely inline the search term so the variable can't be lost
      const sTerm = (searchTerm || "").toLowerCase();
      const matchesSearch = 
        (item.subject_code || "").toLowerCase().includes(sTerm) ||
        (item.room || "").toLowerCase().includes(sTerm) ||
        (item.proctor || "").toLowerCase().includes(sTerm) ||
        (item.dept_code || "").toLowerCase().includes(sTerm); // Now searches by Department too!
        
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
    1: "bg-blue-50 border-blue-500 text-blue-900 shadow-blue-100",
    2: "bg-emerald-50 border-emerald-400 text-emerald-900 shadow-emerald-100",
    3: "bg-amber-50 border-amber-400 text-amber-900 shadow-amber-100",
    4: "bg-purple-50 border-purple-400 text-purple-900 shadow-purple-100",
    5: "bg-rose-50 border-rose-500 text-rose-900 shadow-rose-100",
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
    <div className="flex flex-col w-full h-[95vh] bg-slate-50 rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden mt-8 relative">
      
      {/* TOOLBAR */}
      <div className="bg-slate-950 p-8 flex flex-wrap items-center justify-between gap-6 text-white relative z-50">
        <div className="flex items-center gap-6">
          <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-500/20"><Layers size={28}/></div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter">Global Examination Masterlist</h2>
            <p className="text-[10px] text-slate-500 font-black tracking-[0.3em] uppercase mt-1 italic">Multi-Block Visualizer</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          
          {/* iOS STYLE VIEW TOGGLE */}
          <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
            <button onClick={() => { setViewMode('DAY'); setCurrentPage(0); }} className={`px-5 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase ${viewMode === 'DAY' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
              Day
            </button>
            <button onClick={() => { setViewMode('WEEK'); setCurrentPage(0); }} className={`px-5 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase ${viewMode === 'WEEK' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
              Week
            </button>
          </div>

          {/* iOS STYLE PAGINATION CONTROLS */}
          <div className="flex items-center bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
            <button 
              onClick={handlePrev} 
              disabled={currentPage === 0 || sortedDates.length === 0} 
              className="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
            >
              <ChevronLeft size={16}/>
            </button>
            <div className="px-4 text-[10px] font-black text-blue-400 uppercase tracking-widest text-center min-w-[140px]">
              {sortedDates.length === 0 ? 'NO DATES' : 
                viewMode === 'DAY' ? new Date(sortedDates[currentPage]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
                : `BLOCK ${Math.floor(currentPage / 5) + 1}`
              }
            </div>
            <button 
              onClick={handleNext} 
              disabled={sortedDates.length === 0 || (viewMode === 'DAY' ? currentPage >= sortedDates.length - 1 : currentPage + 5 >= sortedDates.length)} 
              className="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
            >
              <ChevronRight size={16}/>
            </button>
          </div>

          {/* YEAR FILTERS */}
          <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
            {[1, 2, 3, 4, 5].map(y => (
              <button 
                key={y}
                onClick={() => setActiveFilters(prev => prev.includes(y) ? prev.filter(x => x!==y) : [...prev, y])}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black transition-all ${activeFilters.includes(y) ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                YR {y}
              </button>
            ))}
          </div>

          {/* SEARCH BAR */}
          <div className="relative w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18}/>
            <input 
              placeholder="Search resource or dept..." 
              className="w-full pl-12 pr-6 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:ring-2 ring-blue-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* DATE HEADER */}
      <div className="flex bg-white border-b border-slate-200 z-40">
        <div className="w-24 border-r border-slate-200 flex items-center justify-center font-black text-[9px] text-slate-300 uppercase [writing-mode:vertical-lr] rotate-180 bg-slate-50/50">TIMELINE GRID</div>
        {visibleDates.length === 0 ? (
          <div className="flex-1 py-8 text-center"><p className="text-slate-400 text-sm font-black uppercase tracking-widest">No Dates Available</p></div>
        ) : visibleDates.map((date, idx) => (
          <div key={idx} className="flex-1 py-8 text-center border-r border-slate-100 last:border-0 relative group">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.25em] mb-1">{new Date(date).toLocaleDateString('en-US', { weekday: 'long' })}</p>
            <p className="text-4xl font-black text-slate-900 tracking-tighter italic">{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
          </div>
        ))}
      </div>

      {/* CALENDAR GRID */}
      <div className="flex-1 overflow-y-auto relative flex scroll-smooth custom-scrollbar">
        {/* TIME LABELS */}
        <div className="w-24 sticky left-0 z-30 bg-white/90 backdrop-blur-xl border-r border-slate-200">
          {Array.from({ length: 14 }, (_, i) => i + 8).map(hr => (
            <div key={hr} style={{ height: rowHeight }} className="relative border-b border-slate-50 flex items-start justify-center pt-4">
              <span className="text-[12px] font-black text-slate-400 font-mono">{String(hr).padStart(2, '0')}:00</span>
            </div>
          ))}
        </div>

        {/* COLUMNS */}
        <div className={`flex flex-1 relative ${viewMode === 'WEEK' ? 'min-w-[1200px]' : 'min-w-full'}`}>
          {visibleDates.map((date) => (
            <div key={date} className="flex-1 border-r border-slate-100 relative group bg-white">
              {Array.from({ length: 14 }).map((_, hr) => (
                <div key={hr} style={{ height: rowHeight }} className="border-b border-slate-50 w-full" />
              ))}

              {/* DYNAMIC CARDS */}
              {(processedSchedules[date] || []).map((exam, i) => {
                const isConflict = exam.hasConflict;
                return (
                  <div
                    key={exam.id || i}
                    onClick={() => setSelectedExam(exam)}
                    className={`absolute border-l-[5px] rounded-[1.2rem] p-3 shadow-md z-10 transition-all hover:z-50 hover:scale-[1.02] cursor-pointer group/card ${isConflict ? 'bg-rose-50 border-rose-600 text-rose-950 animate-pulse' : yearStyles[exam.year_level]}`}
                    style={{
                      top: getTopOffset(exam.start_time),
                      height: getHeight(exam.start_time, exam.end_time) - 4,
                      left: `${exam.visualLeft}%`,
                      width: `calc(${exam.visualWidth}% - 10px)`,
                      marginLeft: '5px'
                    }}
                  >
                    <div className="flex justify-between items-start mb-1 overflow-hidden">
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-white/90 truncate max-w-[80%]">
                          {exam.dept_code} {exam.year_level}{exam.section}
                        </span>
                        <Maximize2 size={12} className="opacity-0 group-hover/card:opacity-40 transition-opacity" />
                    </div>
                    
                    <h4 className="text-[10px] font-black leading-tight uppercase truncate mb-2">
                        {exam.subject_code}
                    </h4>
                    
                    <div className="space-y-1 opacity-80 group-hover/card:opacity-100 transition-opacity">
                        <div className="flex items-center gap-1.5 text-[8px] font-black">
                            <MapPin size={10} className="text-slate-400"/>
                            {exam.room}
                        </div>
                        <div className="flex items-center gap-1.5 text-[8px] font-black truncate uppercase">
                            <User size={10} className="text-slate-400"/>
                            {exam.proctor}
                        </div>
                    </div>

                    {isConflict && <ShieldAlert size={16} className="absolute bottom-2 right-2 text-rose-600"/>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedExam && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md">
            <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className={`p-10 text-white relative bg-slate-900`}>
                    <button onClick={() => setSelectedExam(null)} className="absolute top-8 right-8 hover:rotate-90 transition-all">
                        <X size={24} />
                    </button>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Examination Record</span>
                    <h3 className="text-5xl font-black mt-4 italic tracking-tighter">
                      {selectedExam.dept_code} {selectedExam.year_level}{selectedExam.section}
                    </h3>
                    <p className="text-xl font-bold mt-2 uppercase text-blue-400">{selectedExam.subject_name}</p>
                </div>
                
                <div className="p-10 space-y-8 bg-white">
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Time Window</span>
                            <p className="font-black text-slate-900"><Clock size={16} className="inline mr-2 text-blue-500"/>{selectedExam.start_time} - {selectedExam.end_time}</p>
                        </div>
                        <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Schedule Date</span>
                            <p className="font-black text-slate-900"><CalendarIcon size={16} className="inline mr-2 text-blue-500"/>{selectedExam.exam_date}</p>
                        </div>
                        <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Assigned Room</span>
                            <p className="font-black text-xl text-slate-900"><MapPin size={16} className="inline mr-2 text-emerald-500"/>{selectedExam.room}</p>
                        </div>
                        <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Assigned Proctor</span>
                            <p className="font-black text-slate-900 uppercase"><User size={16} className="inline mr-2 text-amber-500"/>{selectedExam.proctor}</p>
                        </div>
                    </div>

                    {selectedExam.hasConflict && (
                        <div className="bg-rose-50 border-2 border-rose-100 p-6 rounded-3xl flex items-center gap-6 text-rose-700">
                            <ShieldAlert size={32} />
                            <div>
                                <p className="font-black uppercase text-xs">Conflict Alert</p>
                                <p className="text-[11px] italic mt-1">Resource clash detected with {selectedExam.conflictWith || "Global Schedule"}</p>
                            </div>
                        </div>
                    )}

                    <button 
                        onClick={() => setSelectedExam(null)}
                        className="w-full bg-slate-950 text-white py-6 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all"
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

export default ScheduleCalendar;