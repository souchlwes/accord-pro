import React, { useState, useMemo } from 'react';
import { 
  Calendar, Globe, BookOpen, Clock, CheckCircle2, 
  Plus, Trash2, Info, LayoutGrid, User, Layers 
} from 'lucide-react';
import ScheduleCalendar from './ScheduleCalendar';

const ProctorDashboard = ({ profile, globalSchedule, allExamDates, onUpdateAvailability }) => {
  const [activeTab, setActiveTab] = useState("my_schedule");
  const [logBook, setLogBook] = useState([]); // Local state for the log book form

  useEffect(() => {
    if (highlightTarget === 'availability-log') {
      setTimeout(() => {
        document.getElementById('availability-log-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400);
    }
  }, [highlightTarget]);
  
  // Filter schedules where this proctor is assigned
  const myAssignments = useMemo(() => {
    return globalSchedule.filter(s => s.proctor === profile.full_name);
  }, [globalSchedule, profile.full_name]);

  // Tab Definitions (Mirroring DeptCard style)
  const tabs = [
    { id: 'my_schedule', label: 'My Assignments', icon: Calendar },
    { id: 'master_view', label: 'Global Monitor', icon: Globe },
    { id: 'log_book', label: 'Log Book', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12 font-sans">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 px-6">
        <div>
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-2">
            <User size={14}/> Proctor Portal
          </div>
          <h1 className="text-5xl lg:text-7xl font-black text-slate-900 tracking-tighter">
            Hello, <span className="text-blue-600 italic">{profile.full_name.split(' ')[0]}</span>
          </h1>
        </div>
        
        <div className="flex bg-white p-2 rounded-3xl shadow-xl border border-slate-100">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden">
          
          {/* TAB 1: MY ASSIGNMENTS */}
          {activeTab === 'my_schedule' && (
            <div className="p-12">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-3xl font-black tracking-tighter uppercase italic">Current <span className="text-blue-600">Assignments</span></h2>
                <div className="bg-blue-50 text-blue-600 px-6 py-2 rounded-full font-black text-[10px] uppercase">
                  {myAssignments.length} Sessions Total
                </div>
              </div>

              {myAssignments.length === 0 ? (
                <div className="py-32 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                  <Calendar size={48} className="mx-auto mb-4 text-slate-300 opacity-50" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No exam sessions assigned yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {myAssignments.map((session, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 hover:border-blue-200 transition-all group">
                      <div className="flex justify-between items-start mb-6">
                        <div className="bg-white px-4 py-2 rounded-xl text-[10px] font-black text-slate-900 shadow-sm">
                          YEAR {session.year_level}
                        </div>
                        <div className="flex items-center gap-2 text-rose-500 font-black text-[10px] uppercase">
                          <Clock size={14}/> {session.start_time} - {session.end_time}
                        </div>
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 mb-2 leading-tight">{session.subject_name}</h3>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-6">{session.subject_code} • SEC {session.section}</p>
                      
                      <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-200">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase">Room</p>
                          <p className="font-bold text-slate-700">{session.room}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase">Date</p>
                          <p className="font-bold text-slate-700">{session.exam_date}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MASTER VIEW (Read-Only Global Monitor) */}
          {activeTab === 'master_view' && (
            <div className="p-8">
              <div className="bg-blue-600 text-white p-10 rounded-[2.5rem] mb-8 flex justify-between items-center shadow-xl shadow-blue-200">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter uppercase italic">Global <span className="opacity-60">Monitor</span></h2>
                  <p className="text-[10px] font-black uppercase tracking-widest mt-2 text-blue-100">Full University Resource Visibility</p>
                </div>
                <Globe size={48} className="opacity-20" />
              </div>
              <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100">
                <ScheduleCalendar scheduleData={globalSchedule} examDates={allExamDates} readOnly={true} />
              </div>
            </div>
          )}

          {/* TAB 3: LOG BOOK (Availability Entry) */}
          {activeTab === 'log_book' && (
            <div className="p-12">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-1">
                  <h2 className="text-3xl font-black tracking-tighter uppercase italic mb-6">Self-Service <span className="text-blue-600">Log</span></h2>
                  <p className="text-xs font-bold text-slate-500 leading-relaxed mb-8">
                    Maintain your availability windows here. Once saved, the system synchronizes this data with the Head Admin's generation engine.
                  </p>
                  
                  {/* FORM TO ADD AVAILABILITY */}
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase px-2">Exam Date</label>
                      <input type="date" className="w-full p-4 rounded-2xl border-2 border-white font-bold text-sm focus:border-blue-500 outline-none transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase px-2">Start</label>
                        <input type="time" className="w-full p-4 rounded-2xl border-2 border-white font-bold text-sm focus:border-blue-500 outline-none transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase px-2">End</label>
                        <input type="time" className="w-full p-4 rounded-2xl border-2 border-white font-bold text-sm focus:border-blue-500 outline-none transition-all" />
                      </div>
                    </div>
                    <button className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 mt-4">
                      <Plus size={16}/> Sync Entry
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] mb-6 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest">Active Availability Logs</span>
                    <CheckCircle2 className="text-emerald-400" />
                  </div>
                  
                  <div className="space-y-4">
                    {/* Placeholder for list of entries */}
                    {[1, 2].map((i) => (
                      <div key={i} className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm group hover:border-blue-200 transition-all">
                        <div className="flex items-center gap-6">
                          <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl font-black text-xs">04/1{i}/26</div>
                          <div>
                            <p className="text-xs font-black text-slate-900 uppercase">Available Window</p>
                            <p className="text-[10px] font-bold text-slate-400 italic">09:00 AM — 01:00 PM</p>
                          </div>
                        </div>
                        <button className="text-slate-300 hover:text-rose-500 p-3 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ProctorDashboard;