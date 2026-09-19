import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, AlertCircle, Clock, CheckCircle2, 
  MessageSquare, RefreshCw, Users, Edit3, ChevronDown, ChevronUp 
} from 'lucide-react';

const ConflictTable = ({ schedule = [], allProfiles = [], globalAvailability = [], onOpenChat, onGoToSchedule }) => {
  const [expandedId, setExpandedId] = useState(null);

  // --- SMART CONFLICT ENGINE ---
  const issues = useMemo(() => {
    const detectedIssues = [];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentTimeStr = now.toTimeString().substring(0, 5);
    
    schedule.forEach(s => {
       // Skip past sessions (we only care about active/future issues)
       if (s.exam_date < todayStr || (s.exam_date === todayStr && s.end_time < currentTimeStr)) return;

       // 1. Double Booking (System Engine detected overlap)
       if (s.hasConflict) {
           detectedIssues.push({
               id: `conflict-${s.id}`,
               severity: 'critical',
               icon: <AlertCircle size={16} className="text-white" />,
               bgClass: 'bg-rose-500',
               textClass: 'text-rose-600',
               borderClass: 'border-rose-200 hover:border-rose-400',
               title: `${s.conflictType === 'ROOM' ? 'Room' : 'Proctor'} Overlap Detected`,
               desc: `Section ${s.section} has a double-booked ${s.conflictType?.toLowerCase()} (${s.conflictType === 'ROOM' ? s.room : s.proctor}) on ${s.exam_date} @ ${s.start_time}.`,
               actions: [
                   { label: 'Fix Schedule', icon: <Edit3 size={14}/>, primary: true, onClick: () => onGoToSchedule(s.dept_code, s.id) }
               ]
           });
       }
       
       // 2. Emergency Flag (Proctor flagged an issue)
       if (s.flagged && !s.hasConflict) {
           detectedIssues.push({
               id: `flag-${s.id}`,
               severity: 'urgent',
               icon: <AlertTriangle size={16} className="text-white" />,
               bgClass: 'bg-orange-500',
               textClass: 'text-orange-600',
               borderClass: 'border-orange-200 hover:border-orange-400',
               title: `Emergency Flag: ${s.proctor}`,
               desc: `Proctor note: "${s.flagNote}". A replacement is required for ${s.subject_code} on ${s.exam_date}.`,
               actions: [
                   { label: 'Switch Proctor', icon: <Users size={14}/>, primary: true, onClick: () => onGoToSchedule(s.dept_code, s.id) }
               ]
           });
       }

       // 3. Unverified / Pending Reliever Request
       if (s.proctor && s.proctor !== 'TBA' && !s.flagged && !s.hasConflict) {
           const pName = s.proctor.toLowerCase();
           const proctorProfile = allProfiles.find(p => (p.full_name||'').toLowerCase() === pName || (p.name||'').toLowerCase() === pName);
           
           if (proctorProfile && proctorProfile.role === 'PROCTOR') {
               const hasAvail = globalAvailability.some(a => 
                  a.proctor_id === proctorProfile.id && 
                  a.exam_date === s.exam_date && 
                  s.start_time < a.end_time && s.end_time > a.start_time
               );
               
               if (!hasAvail) {
                   detectedIssues.push({
                       id: `unverified-${s.id}`,
                       severity: 'warning',
                       icon: <Clock size={16} className="text-white" />,
                       bgClass: 'bg-amber-500',
                       textClass: 'text-amber-600',
                       borderClass: 'border-amber-200 hover:border-amber-400',
                       title: `Pending Proctor Acceptance`,
                       desc: `${s.proctor} has not accepted the assignment or logged availability for ${s.subject_code} on ${s.exam_date}.`,
                       actions: [
                           { label: 'Message Proctor', icon: <MessageSquare size={14}/>, primary: false, onClick: () => onOpenChat(proctorProfile) },
                           { label: 'Change Proctor', icon: <RefreshCw size={14}/>, primary: true, onClick: () => onGoToSchedule(s.dept_code, s.id) }
                       ]
                   });
               }
           }
       }
       
       // 4. Missing Resource (TBA)
       if (!s.proctor || s.proctor === 'TBA') {
           detectedIssues.push({
               id: `tba-${s.id}`,
               severity: 'warning',
               icon: <Users size={16} className="text-white" />,
               bgClass: 'bg-amber-500',
               textClass: 'text-amber-600',
               borderClass: 'border-amber-200 hover:border-amber-400',
               title: `Missing Proctor (TBA)`,
               desc: `Section ${s.section} (${s.subject_code}) is completely missing a proctor for ${s.exam_date}.`,
               actions: [
                   { label: 'Assign Now', icon: <Users size={14}/>, primary: true, onClick: () => onGoToSchedule(s.dept_code, s.id) }
               ]
           });
       }
    });

    // Sort by severity (Critical -> Urgent -> Warning)
    const severityMap = { 'critical': 1, 'urgent': 2, 'warning': 3 };
    return detectedIssues.sort((a, b) => severityMap[a.severity] - severityMap[b.severity]);
  }, [schedule, allProfiles, globalAvailability]);

  if (issues.length === 0) {
    return (
      <div className="text-center py-12 bg-emerald-50/50 rounded-[2rem] border-2 border-dashed border-emerald-200">
        <CheckCircle2 size={48} className="mx-auto text-emerald-400 mb-4" />
        <h3 className="text-xl font-black text-emerald-700 uppercase tracking-tighter">System Healthy</h3>
        <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mt-1">0 Action Items Detected</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Action <span className="text-rose-600 italic">Center</span></h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Smart Resolution Hub</p>
        </div>
        <div className="bg-rose-100 text-rose-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
          {issues.length} Issue{issues.length !== 1 ? 's' : ''} Found
        </div>
      </div>

      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {issues.map(issue => {
          const isExpanded = expandedId === issue.id;

          return (
            <div key={issue.id} className={`bg-white rounded-[1.5rem] border-2 transition-all duration-300 shadow-sm overflow-hidden ${issue.borderClass} ${isExpanded ? 'shadow-lg' : ''}`}>
              
              {/* COMPACT HEADER (Click to expand) */}
              <div 
                onClick={() => setExpandedId(isExpanded ? null : issue.id)}
                className="p-5 flex justify-between items-center cursor-pointer select-none group"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl shadow-sm ${issue.bgClass}`}>
                    {issue.icon}
                  </div>
                  <div>
                    <h4 className={`text-sm font-black uppercase tracking-tight ${issue.textClass}`}>
                      {issue.title}
                    </h4>
                    {/* Preview text when collapsed */}
                    {!isExpanded && (
                      <p className="text-[10px] font-bold text-slate-500 truncate max-w-[200px] md:max-w-[400px] mt-0.5">
                        {issue.desc}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-slate-400 group-hover:text-slate-700 bg-slate-50 p-2 rounded-full transition-colors">
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {/* EXPANDED CONTENT & ACTION BUTTONS */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-slate-50 animate-in fade-in slide-in-from-top-2">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
                    <p className="text-xs font-bold text-slate-700 leading-relaxed">
                      {issue.desc}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    {issue.actions.map((action, idx) => (
                      <button 
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          action.onClick();
                        }}
                        className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                          action.primary 
                            ? `${issue.bgClass} text-white shadow-md hover:-translate-y-0.5` 
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm'
                        }`}
                      >
                        {action.icon} {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConflictTable;
