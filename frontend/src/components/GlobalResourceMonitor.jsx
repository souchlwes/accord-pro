import React, { useState } from 'react';
import { 
  Users, DoorOpen, ChevronDown, ChevronUp, Search, 
  Calendar, Clock, BookOpen, AlertTriangle, History, 
  ShieldAlert, Tag, RotateCcw
} from 'lucide-react';

const GlobalResourceMonitor = ({ allDepartments, globalSchedule }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [showHistory, setShowHistory] = useState({});

  // 1. Aggregate resources
  const allProctors = allDepartments.flatMap(d => d.proctors.map(p => ({ ...p, deptCode: d.code })));
  const allRooms = allDepartments.flatMap(d => d.rooms.map(r => ({ ...r, deptCode: d.code })));

  const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id);
  
  const toggleHistoryMode = (asgnId) => {
    setShowHistory(prev => ({ ...prev, [asgnId]: !prev[asgnId] }));
  };

  const getAssignments = (nameOrNumber, type) => {
    return globalSchedule.filter(item => 
      type === 'proctor' ? item.proctor === nameOrNumber : item.room === nameOrNumber
    );
  };

  // Check if any part of the assignment was modified from auto-gen
  const checkIsModified = (asgn) => {
    return (
      asgn.proctor !== asgn.original_proctor || 
      asgn.room !== asgn.original_room || 
      asgn.subject_code !== asgn.original_subject_code
    );
  };

  return (
    <div className="space-y-6">
      {/* --- HEADER --- */}
      <div className="flex justify-between items-end px-6">
        <div>
            <h2 className="text-3xl font-black uppercase italic text-slate-900 tracking-tighter">Global <span className="text-blue-600">Resource</span> Monitor</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Live Deployment & Change History</p>
        </div>
        <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
            <input 
                type="text" 
                placeholder="Filter proctors or rooms..." 
                className="pl-10 pr-6 py-3 bg-white border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase w-64 focus:border-blue-500 outline-none transition-all shadow-sm"
                onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
            />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* --- GLOBAL PROCTORS SECTION --- */}
        <section className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Users size={18} className="text-emerald-400" />
                    <h3 className="font-black uppercase tracking-widest text-[10px]">Proctor Assignments</h3>
                </div>
                <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[9px] font-black">{allProctors.length} Total</span>
            </div>
            
            <div className="p-4 max-h-[600px] overflow-y-auto space-y-3 custom-scrollbar">
                {allProctors.filter(p => p.name.includes(searchTerm)).map((proctor) => {
                    const assignments = getAssignments(proctor.name, 'proctor');
                    const isAssigned = assignments.length > 0;
                    const isOpen = expandedId === `p-${proctor.id}`;
                    const hasFlags = assignments.some(a => a.flagged);

                    return (
                        <div key={`p-${proctor.id}`} className={`border-2 rounded-[2rem] transition-all ${hasFlags ? 'border-rose-200 bg-rose-50/10' : isOpen ? 'border-blue-100 shadow-md' : 'border-slate-50'}`}>
                            <div onClick={() => toggleExpand(`p-${proctor.id}`)} className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 rounded-[2rem]">
                                <div className="flex items-center gap-4">
                                    <div className={`w-3 h-3 rounded-full ${hasFlags ? 'bg-rose-500 animate-pulse' : isAssigned ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                    <div>
                                        <p className="text-xs font-black text-slate-800 uppercase leading-none mb-1">{proctor.name}</p>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{proctor.deptCode} DEPARTMENT</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {hasFlags && <ShieldAlert size={14} className="text-rose-500" />}
                                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${isAssigned ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {isAssigned ? `${assignments.length} SESSIONS` : 'IDLE'}
                                    </span>
                                    {isOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
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
        </section>

        {/* --- GLOBAL ROOMS SECTION --- */}
        <section className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <DoorOpen size={18} className="text-amber-400" />
                    <h3 className="font-black uppercase tracking-widest text-[10px]">Room Allocation</h3>
                </div>
                <span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-[9px] font-black">{allRooms.length} Total</span>
            </div>

            <div className="p-4 max-h-[600px] overflow-y-auto space-y-3 custom-scrollbar">
                {allRooms.filter(r => r.number.includes(searchTerm)).map((room) => {
                    const assignments = getAssignments(room.number, 'room');
                    const isOccupied = assignments.length > 0;
                    const isOpen = expandedId === `r-${room.id}`;

                    return (
                        <div key={`r-${room.id}`} className={`border-2 rounded-[2rem] transition-all ${isOpen ? 'border-amber-100 bg-amber-50/5' : 'border-slate-50'}`}>
                            <div onClick={() => toggleExpand(`r-${room.id}`)} className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 rounded-[2rem]">
                                <div className="flex items-center gap-4">
                                    <div className={`w-3 h-3 rounded-full ${isOccupied ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                                    <div>
                                        <p className="text-xs font-black text-slate-800 uppercase leading-none mb-1">ROOM {room.number}</p>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{room.type}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
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
                                            <div key={asgn.id} className={`bg-white p-5 rounded-3xl shadow-sm border-l-4 transition-all ${modified ? 'border-amber-400' : 'border-blue-500'}`}>
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
        </section>
      </div>
    </div>
  );
};

export default GlobalResourceMonitor;