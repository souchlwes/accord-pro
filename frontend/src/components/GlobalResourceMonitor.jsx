import React, { useState, useMemo } from 'react';
import { 
  Users, DoorOpen, ChevronDown, ChevronUp, Search, 
  Calendar, Clock, BookOpen, AlertTriangle, History, 
  ShieldAlert, Tag, RotateCcw, LayoutDashboard, ChevronLeft, ChevronRight
} from 'lucide-react';

const ITEMS_PER_PAGE = 8; 

const GlobalResourceMonitor = ({ allDepartments, globalSchedule, allProfiles, onViewProctor }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [showHistory, setShowHistory] = useState({});
  
  // Pagination States
  const [proctorPage, setProctorPage] = useState(1);
  const [roomPage, setRoomPage] = useState(1);

  // Sorting States
  const [sortMode, setSortMode] = useState("A-Z");
  const [isSortOpen, setIsSortOpen] = useState(false);

  const sortOptions = [
    { id: 'A-Z', label: 'A-Z / 1-9 (Ascend)' },
    { id: 'Z-A', label: 'Z-A / 9-1 (Descend)' },
    { id: 'NEWEST', label: 'Newest First' },
    { id: 'OLDEST', label: 'Oldest First' }
  ];

  // --- DATA PREPARATION ---
  const allProctors = useMemo(() => {
    return (allProfiles || [])
      .filter(p => p.role?.toUpperCase() === 'PROCTOR' && p.status === 'ACTIVE')
      .map(p => ({
        id: p.id,
        name: p.full_name || p.name,
        deptCode: p.assigned_dept || 'GLOBAL',
        created_at: p.created_at // Needed for newest/oldest sort
      }));
  }, [allProfiles]);

  const allRooms = useMemo(() => {
    return allDepartments.flatMap(d => d.rooms.map(r => ({ ...r, deptCode: d.code })));
  }, [allDepartments]);

  // --- SEARCH & SORT ENGINE ---
  const filteredProctors = useMemo(() => {
    let filtered = allProctors;
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toUpperCase().includes(searchTerm) || 
        p.deptCode.toUpperCase().includes(searchTerm)
      );
    }
    return [...filtered].sort((a, b) => {
       if (sortMode === 'A-Z') return a.name.localeCompare(b.name);
       if (sortMode === 'Z-A') return b.name.localeCompare(a.name);
       
       const dateA = new Date(a.created_at || 0).getTime();
       const dateB = new Date(b.created_at || 0).getTime();
       if (sortMode === 'NEWEST') return dateB - dateA;
       if (sortMode === 'OLDEST') return dateA - dateB;
       return 0;
    });
  }, [allProctors, searchTerm, sortMode]);

  const filteredRooms = useMemo(() => {
    let filtered = allRooms;
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.number.toUpperCase().includes(searchTerm) || 
        r.deptCode.toUpperCase().includes(searchTerm)
      );
    }
    return [...filtered].sort((a, b) => {
       if (sortMode === 'A-Z') return String(a.number).localeCompare(String(b.number), undefined, {numeric: true});
       if (sortMode === 'Z-A') return String(b.number).localeCompare(String(a.number), undefined, {numeric: true});
       
       if (sortMode === 'NEWEST') return b.id - a.id;
       if (sortMode === 'OLDEST') return a.id - b.id;
       return 0;
    });
  }, [allRooms, searchTerm, sortMode]);

  // Reset pagination when search or filters change
  React.useEffect(() => {
    setProctorPage(1);
    setRoomPage(1);
  }, [searchTerm, sortMode]);

  // --- PAGINATION LOGIC ---
  const paginatedProctors = filteredProctors.slice((proctorPage - 1) * ITEMS_PER_PAGE, proctorPage * ITEMS_PER_PAGE);
  const totalProctorPages = Math.ceil(filteredProctors.length / ITEMS_PER_PAGE);

  const paginatedRooms = filteredRooms.slice((roomPage - 1) * ITEMS_PER_PAGE, roomPage * ITEMS_PER_PAGE);
  const totalRoomPages = Math.ceil(filteredRooms.length / ITEMS_PER_PAGE);

  // --- HELPERS ---
  const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id);
  const toggleHistoryMode = (asgnId) => setShowHistory(prev => ({ ...prev, [asgnId]: !prev[asgnId] }));

  const getAssignments = (nameOrNumber, type) => {
    return globalSchedule.filter(item => 
      type === 'proctor' 
        ? String(item.proctor || "").toUpperCase() === String(nameOrNumber || "").toUpperCase()
        : String(item.room || "").toUpperCase() === String(nameOrNumber || "").toUpperCase()
    );
  };

  const checkIsModified = (asgn) => {
    return (
      asgn.proctor !== asgn.original_proctor || 
      asgn.room !== asgn.original_room || 
      asgn.subject_code !== asgn.original_subject_code
    );
  };

  // --- REUSABLE PAGINATION COMPONENT ---
  const PaginationControls = ({ currentPage, totalPages, setPage }) => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between bg-slate-50 p-4 border-t-2 border-slate-100 shrink-0">
        <button 
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="p-2 bg-white text-slate-500 rounded-xl shadow-sm border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:text-blue-600 transition-colors"
        >
          <ChevronLeft size={16}/>
        </button>
        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">
          Page {currentPage} of {totalPages}
        </span>
        <button 
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="p-2 bg-white text-slate-500 rounded-xl shadow-sm border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:text-blue-600 transition-colors"
        >
          <ChevronRight size={16}/>
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end px-6 gap-4">
        <div>
            <h2 className="text-3xl font-black uppercase italic text-slate-900 tracking-tighter">Global <span className="text-blue-600">Resource</span> Monitor</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Live Deployment & Dashboard Launcher</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          {/* SEARCH BAR */}
          <div className="relative w-full md:w-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
              <input 
                  type="text" 
                  placeholder="Search to locate & view..." 
                  className="pl-10 pr-8 py-3 bg-white border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase w-full md:w-64 focus:border-blue-500 outline-none transition-all shadow-sm"
                  onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                  value={searchTerm}
              />
              {searchTerm && (
                 <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors">
                    <RotateCcw size={12}/>
                 </button>
              )}
          </div>
          
          {/* SORT DROPDOWN */}
          <div className="relative w-full md:w-auto z-20">
            <button 
              onClick={() => setIsSortOpen(!isSortOpen)} 
              className={`flex items-center justify-between gap-3 bg-white border-2 rounded-2xl p-3 min-w-[160px] w-full md:w-auto transition-all active:scale-95 h-full shadow-sm ${isSortOpen ? 'border-blue-500 text-blue-600' : 'border-slate-100 text-slate-600 hover:border-slate-200'}`}
            >
              <span className="text-[9px] font-black uppercase tracking-widest mt-0.5">
                {sortOptions.find(o => o.id === sortMode)?.label}
              </span>
              <ChevronDown size={14} className={`transition-transform duration-300 ${isSortOpen ? 'rotate-180 text-blue-500' : 'text-slate-400'}`} />
            </button>

            {isSortOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)}></div>
                <div className="absolute top-full right-0 mt-2 w-full min-w-[160px] bg-white border-2 border-slate-100 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* --- GLOBAL PROCTORS SECTION --- */}
        <section className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col h-[700px]">
            <div className="bg-slate-900 p-6 text-white flex items-center justify-between shrink-0 rounded-t-[2.5rem]">
                <div className="flex items-center gap-3">
                    <Users size={18} className="text-emerald-400" />
                    <h3 className="font-black uppercase tracking-widest text-[10px]">Proctor Directory</h3>
                </div>
                <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[9px] font-black">{filteredProctors.length} Match{filteredProctors.length !== 1 ? 'es' : ''}</span>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                {paginatedProctors.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-full text-slate-300">
                      <Search size={32} className="mb-4 opacity-50"/>
                      <p className="text-[10px] font-black uppercase tracking-widest">No proctors found</p>
                   </div>
                ) : paginatedProctors.map((proctor) => {
                    const assignments = getAssignments(proctor.name, 'proctor');
                    const isAssigned = assignments.length > 0;
                    const isOpen = expandedId === `p-${proctor.id}`;
                    const hasFlags = assignments.some(a => a.flagged);
                    
                    const profileData = (allProfiles || []).find(p => (p.full_name || p.name || "").toUpperCase() === proctor.name.toUpperCase());

                    return (
                        <div key={`p-${proctor.id}`} className={`border-2 rounded-[2rem] transition-all ${hasFlags ? 'border-rose-200 bg-rose-50/10' : isOpen ? 'border-blue-100 shadow-md' : 'border-slate-50'}`}>
                            <div className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 rounded-[2rem]">
                                <div className="flex items-center gap-4" onClick={() => toggleExpand(`p-${proctor.id}`)}>
                                    <div className={`w-3 h-3 rounded-full shrink-0 ${hasFlags ? 'bg-rose-500 animate-pulse' : isAssigned ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                    <div>
                                        <p className="text-xs font-black text-slate-800 uppercase leading-none mb-1">{proctor.name}</p>
                                        <div className="flex items-center gap-1.5 mt-1.5">
                                            <span className="bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest shadow-sm">
                                                {proctor.deptCode}
                                            </span>
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Pool</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {profileData && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); onViewProctor(profileData); }}
                                        className="p-2 bg-white hover:bg-blue-600 hover:text-white border text-slate-400 rounded-xl transition-all shadow-sm"
                                        title="Launch Full Dashboard"
                                      >
                                        <LayoutDashboard size={14}/>
                                      </button>
                                    )}
                                    {hasFlags && <ShieldAlert size={14} className="text-rose-500" />}
                                    <div onClick={() => toggleExpand(`p-${proctor.id}`)} className="flex items-center gap-2">
                                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${isAssigned ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                          {isAssigned ? `${assignments.length} SESSIONS` : 'IDLE'}
                                      </span>
                                      {isOpen ? <ChevronUp size={14} className="text-slate-400"/> : <ChevronDown size={14} className="text-slate-400"/>}
                                    </div>
                                </div>
                            </div>

                            {isOpen && (
                                <div className="p-5 bg-slate-50/50 border-t-2 border-slate-100 space-y-4">
                                    {isAssigned ? assignments.map((asgn) => {
                                        const modified = checkIsModified(asgn);
                                        const viewingHistory = showHistory[asgn.id];

                                        return (
                                            <div key={asgn.id} className={`bg-white p-5 rounded-3xl shadow-sm border-l-4 transition-all ${asgn.flagged ? 'border-rose-500' : modified ? 'border-amber-400' : 'border-blue-500'}`}>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[10px] font-black text-slate-900 uppercase">SEC {asgn.section}</span>
                                                            {modified && (
                                                                <span className="bg-amber-100 text-amber-700 text-[7px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                                                                    <History size={8}/> Edited
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1"><Calendar size={10}/> {asgn.exam_date}</p>
                                                    </div>
                                                    {modified && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); toggleHistoryMode(asgn.id); }}
                                                            className={`p-2 rounded-xl transition-all ${viewingHistory ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-amber-100 hover:text-amber-600'}`}
                                                            title="Toggle History View"
                                                        >
                                                            <RotateCcw size={14} />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className={`p-4 rounded-2xl border-2 transition-all ${viewingHistory ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-transparent'}`}>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <BookOpen size={12} className={viewingHistory ? 'text-blue-500' : 'text-slate-400'}/>
                                                        <span className={`text-[9px] font-black uppercase ${viewingHistory ? 'text-blue-700' : ''}`}>
                                                            {viewingHistory ? `ORIGINAL: ${asgn.original_subject_code || asgn.subject_code}` : asgn.subject_name}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-[7px] font-black text-slate-400 uppercase">Room Allocation</span>
                                                            <span className={`text-[10px] font-black uppercase ${viewingHistory && asgn.room !== asgn.original_room ? 'text-blue-600' : 'text-slate-700'}`}>
                                                                {viewingHistory ? asgn.original_room : asgn.room}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col text-right">
                                                            <span className="text-[7px] font-black text-slate-400 uppercase">Proctor Assignment</span>
                                                            <span className={`text-[10px] font-black uppercase ${viewingHistory && asgn.proctor !== asgn.original_proctor ? 'text-blue-600' : 'text-slate-700'}`}>
                                                                {viewingHistory ? asgn.original_proctor : asgn.proctor}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {asgn.flagged && !viewingHistory && (
                                                    <div className="mt-3 bg-rose-50 p-3 rounded-xl border border-rose-100 flex items-start gap-2">
                                                        <AlertTriangle size={14} className="text-rose-500 shrink-0 mt-0.5"/>
                                                        <div>
                                                            <span className="text-[8px] font-black text-rose-600 uppercase block">Issue Logged</span>
                                                            <p className="text-[10px] font-bold text-rose-800 uppercase italic leading-tight">{asgn.flagNote || "No details provided."}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }) : (
                                        <p className="text-center py-6 text-[10px] font-black text-slate-300 uppercase italic tracking-widest">Available for Duty</p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <PaginationControls currentPage={proctorPage} totalPages={totalProctorPages} setPage={setProctorPage} />
        </section>

        {/* --- GLOBAL ROOMS SECTION --- */}
        <section className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col h-[700px]">
            <div className="bg-slate-900 p-6 text-white flex items-center justify-between shrink-0 rounded-t-[2.5rem]">
                <div className="flex items-center gap-3">
                    <DoorOpen size={18} className="text-amber-400" />
                    <h3 className="font-black uppercase tracking-widest text-[10px]">Room Allocation</h3>
                </div>
                <span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-[9px] font-black">{filteredRooms.length} Match{filteredRooms.length !== 1 ? 'es' : ''}</span>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                {paginatedRooms.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-full text-slate-300">
                      <Search size={32} className="mb-4 opacity-50"/>
                      <p className="text-[10px] font-black uppercase tracking-widest">No rooms found</p>
                   </div>
                ) : paginatedRooms.map((room) => {
                    const assignments = getAssignments(room.number, 'room');
                    const isOccupied = assignments.length > 0;
                    const isOpen = expandedId === `r-${room.id}`;
                    const hasFlags = assignments.some(a => a.flagged);

                    return (
                        <div key={`r-${room.id}`} className={`border-2 rounded-[2rem] transition-all ${hasFlags ? 'border-rose-200 bg-rose-50/10' : isOpen ? 'border-amber-100 bg-amber-50/5' : 'border-slate-50'}`}>
                            <div onClick={() => toggleExpand(`r-${room.id}`)} className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 rounded-[2rem]">
                                <div className="flex items-center gap-4">
                                    <div className={`w-3 h-3 rounded-full ${hasFlags ? 'bg-rose-500 animate-pulse' : isOccupied ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                    <div>
                                        <p className="text-xs font-black text-slate-800 uppercase leading-none mb-1">ROOM {room.number}</p>
                                        <div className="flex items-center gap-1.5 mt-1.5">
                                            <span className="bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest shadow-sm">
                                                {room.deptCode}
                                            </span>
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{room.type} Resource</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {hasFlags && <ShieldAlert size={14} className="text-rose-500" />}
                                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${isOccupied ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {isOccupied ? 'OCCUPIED' : 'VACANT'}
                                    </span>
                                    {isOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                </div>
                            </div>

                            {isOpen && (
                                <div className="p-5 bg-slate-50/50 border-t-2 border-slate-100 space-y-4">
                                    {isOccupied ? assignments.map((asgn) => {
                                        const modified = checkIsModified(asgn);
                                        const viewingHistory = showHistory[asgn.id];

                                        return (
                                            <div key={asgn.id} className={`bg-white p-5 rounded-3xl shadow-sm border-l-4 transition-all ${asgn.flagged ? 'border-rose-500' : modified ? 'border-amber-400' : 'border-blue-500'}`}>
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <span className="text-[9px] font-black text-slate-900 uppercase flex items-center gap-1"><Clock size={10} className="text-blue-500"/> {asgn.start_time} - {asgn.end_time}</span>
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{asgn.exam_date}</p>
                                                    </div>
                                                    {modified && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); toggleHistoryMode(asgn.id); }} 
                                                            className={`p-1.5 rounded-lg transition-all ${viewingHistory ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-600'}`}
                                                        >
                                                            <RotateCcw size={12}/>
                                                        </button>
                                                    )}
                                                </div>

                                                <div className={`p-4 rounded-2xl border transition-all ${viewingHistory ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-[8px] font-black text-slate-400 uppercase">Assigned Proctor</span>
                                                        {viewingHistory && asgn.proctor !== asgn.original_proctor && (
                                                            <span className="text-[7px] font-black text-blue-600 uppercase bg-blue-100 px-1.5 rounded">ORIGINAL</span>
                                                        )}
                                                    </div>
                                                    <p className={`text-[10px] font-black uppercase ${viewingHistory && asgn.proctor !== asgn.original_proctor ? 'text-blue-600' : 'text-slate-800'}`}>
                                                        {viewingHistory ? asgn.original_proctor : asgn.proctor}
                                                    </p>
                                                    
                                                    <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                                                        <span className={`text-[9px] font-black uppercase flex items-center gap-1 ${viewingHistory && asgn.subject_code !== asgn.original_subject_code ? 'text-blue-600' : 'text-slate-600'}`}>
                                                            <Tag size={10}/> {viewingHistory ? asgn.original_subject_code : asgn.subject_code}
                                                        </span>
                                                        <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">SEC {asgn.section}</span>
                                                    </div>
                                                </div>

                                                {asgn.flagged && !viewingHistory && (
                                                    <div className="mt-3 bg-rose-50 p-3 rounded-xl border border-rose-100 flex items-start gap-2">
                                                        <AlertTriangle size={14} className="text-rose-500 shrink-0 mt-0.5"/>
                                                        <div>
                                                            <span className="text-[8px] font-black text-rose-600 uppercase block">Issue Logged</span>
                                                            <p className="text-[10px] font-bold text-rose-800 uppercase italic leading-tight">{asgn.flagNote || "No details provided."}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }) : (
                                        <p className="text-center py-6 text-[10px] font-black text-slate-300 uppercase italic">No active bookings</p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <PaginationControls currentPage={roomPage} totalPages={totalRoomPages} setPage={setRoomPage} />
        </section>
      </div>
    </div>
  );
};

export default GlobalResourceMonitor;
