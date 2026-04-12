import React from 'react';
import { AlertTriangle, MapPin, Users, Clock, ArrowRight } from 'lucide-react';

const ConflictTable = ({ schedule = [] }) => {
  const conflicts = schedule.filter(s => s.hasConflict);

  if (conflicts.length === 0) return null;

  return (
    <div className="mb-12 animate-in slide-in-from-top-10 duration-700">
      <div className="bg-rose-50 border-2 border-rose-200 rounded-[2.5rem] overflow-hidden shadow-xl shadow-rose-500/5">
        <div className="bg-rose-600 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className="animate-pulse" />
            <h3 className="text-sm font-black uppercase tracking-[0.3em]">Critical Resource Overlaps</h3>
          </div>
          <span className="bg-white text-rose-600 px-4 py-1 rounded-full text-[10px] font-black uppercase">
            {conflicts.length} Issues Detected
          </span>
        </div>

        <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-rose-100">
                <th className="p-4 text-[9px] font-black text-rose-400 uppercase tracking-widest">Resource</th>
                <th className="p-4 text-[9px] font-black text-rose-400 uppercase tracking-widest">Time Slot</th>
                <th className="p-4 text-[9px] font-black text-rose-400 uppercase tracking-widest">Conflict Parties</th>
                <th className="p-4 text-[9px] font-black text-rose-400 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-100">
              {conflicts.map((c, i) => (
                <tr key={c.id || i} className="hover:bg-rose-100/50 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {c.conflictType === 'ROOM' ? (
                        <div className="bg-rose-100 p-2 rounded-lg text-rose-600"><MapPin size={16}/></div>
                      ) : (
                        <div className="bg-rose-100 p-2 rounded-lg text-rose-600"><Users size={16}/></div>
                      )}
                      <div>
                        <p className="text-xs font-black text-slate-800 uppercase">
                            {c.conflictType === 'ROOM' ? `Room ${c.room}` : c.proctor}
                        </p>
                        <p className="text-[8px] font-bold text-rose-400 uppercase tracking-tighter">Double Booked</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-600 flex items-center gap-1">
                        <Clock size={10}/> {c.start_time} - {c.end_time}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">{c.exam_date}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-800 text-white text-[9px] font-black px-2 py-1 rounded-md">{c.dept_code}</span>
                      <ArrowRight size={12} className="text-rose-400"/>
                      <span className="bg-rose-600 text-white text-[9px] font-black px-2 py-1 rounded-md">{c.conflictWith || "OTHER"}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-[8px] font-black text-rose-600 uppercase underline decoration-2 underline-offset-4">Resolution Required</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ConflictTable;