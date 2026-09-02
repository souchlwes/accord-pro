import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, Globe, BookOpen, Clock, CheckCircle2, 
  Plus, Trash2, Info, LayoutGrid, User, Layers,
  Settings, LogOut // <-- Added these two icons
} from 'lucide-react';
import ScheduleCalendar from './ScheduleCalendar';

// <-- Added onShowPassword and onLogout to the props list
const ProctorDashboard = ({ profile, globalSchedule, allExamDates, onUpdateAvailability, highlightTarget, onShowPassword, onLogout }) => {
  const [activeTab, setActiveTab] = useState("my_schedule");
  const [logBook, setLogBook] = useState([]);

  useEffect(() => {
    if (highlightTarget === 'availability-log') {
      setTimeout(() => {
        document.getElementById('availability-log-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400);
    }
  }, [highlightTarget]);
  
  const myAssignments = useMemo(() => {
    return globalSchedule.filter(s => s.proctor === profile.full_name);
  }, [globalSchedule, profile.full_name]);

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
        
        {/* TAB BUTTONS & ACTION BUTTONS */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          
          {/* The Tabs */}
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

          {/* NEW: Settings and Log Out Buttons */}
          <div className="flex bg-white p-2 rounded-3xl shadow-xl border border-slate-100 gap-1">
            <button 
              onClick={onShowPassword}
              className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all active:scale-95"
              title="Settings & Privacy"
            >
              <Settings size={18} />
            </button>
            <button 
              onClick={onLogout}
              className="p-3 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all active:scale-95"
              title="Log Out"
            >
              <LogOut size={18} />
            </button>
          </div>

        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden">
