import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, AlertCircle, Clock, CheckCircle2, 
  MessageSquare, RefreshCw, Users, Edit3, ChevronDown, ChevronUp, Zap
} from 'lucide-react';

const ConflictTable = ({ schedule = [], allProfiles = [], globalAvailability = [], onOpenChat, onGoToSchedule, onAutoResolve, onBatchNudge }) => {
  const [expandedId, setExpandedId] = useState(null);

  // --- SMART CONFLICT & RESOLUTION ENGINE ---
  const { detectedIssues, pendingProctors } = useMemo(() => {
    const issues = [];
    const pendingMap = new Map();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentTimeStr = now.toTimeString().substring(0, 5);
    
    schedule.forEach(s => {
       // Skip past sessions
       if (s.exam_date < todayStr || (s.exam_date === todayStr && s.end_time < currentTimeStr)) return;

       let suggestion = null;

       // AUTO-RESOLVE SCANNER: Find someone available!
       if (s.hasConflict || s.flagged || !s.proctor || s.proctor === 'TBA') {
           const availableProf = allProfiles.filter(p => p.role === 'PROCTOR').find(p => {
               if (p.full_name === s.proctor || p.name === s.proctor) return false; // Don't suggest the person causing the problem
               
               const hasLog = globalAvailability.some(a => 
                   a.proctor_id === p.id && a.exam_date === s.exam_date && 
                   s.start_time < a.end_time && s.end_time > a.start_time
               );
               if (!hasLog) return false;

               const isBooked = schedule.some(otherS => 
                   otherS.proctor === (p.full_name||p.name) && 
                   otherS.exam_date === s.exam_date && 
                   s.start_time < otherS.end_time && s.end_time > otherS.start_time
               );
               return !isBooked;
           });

           if (availableProf) suggestion = availableProf.full_name || availableProf.name;
       }

       // 1. Double Booking
       if (s.hasConflict) {
           issues.push({
               id: `conflict-${s.id}`, scheduleId: s.id, deptCode: s.dept_code, oldProctor: s.proctor, section: s.section, subjectCode: s.subject_code, severity: 'critical',
               icon: <AlertCircle size={16} className="text-white" />, bgClass: 'bg-rose-500', textClass: 'text-rose-600', borderClass: 'border-rose-200 hover:border-rose-400',
               title: `${s.conflictType === 'ROOM' ? 'Room' : 'Proctor'} Overlap Detected`,
               desc: `Section ${s.section} has a double-booked ${s.conflictType?.toLowerCase()} (${s.conflictType === 'ROOM' ? s.room : s.proctor}) on ${s.exam_date} @ ${s.start_time}.`,
               suggestion: s.conflictType === 'PROCTOR' ? suggestion : null,
               actions: [{ label: 'Manual Fix', icon: <Edit3 size={14}/>, primary: true, onClick: () => onGoToSchedule(s.dept_code, s.id) }]
           });
       }
       
       // 2. Emergency Flag
       if (s.flagged && !s.hasConflict) {
           issues.push({
               id: `flag-${s.id}`, scheduleId: s.id, deptCode: s.dept_code, oldProctor: s.proctor, section: s.section, subjectCode: s.subject_code, severity: 'urgent',
               icon: <AlertTriangle size={16} className="text-white" />, bgClass: 'bg-orange-500', textClass: 'text-orange-600', borderClass: 'border-orange-200 hover:border-orange-400',
               title: `Emergency Flag: ${s.proctor}`,
               desc: `Proctor note: "${s.flagNote}". A replacement is required for ${s.subject_code} on ${s.exam_date}.`,
               suggestion: suggestion,
               actions: [{ label: 'Manual Switch', icon: <Users size={14}/>, primary: true, onClick: () => onGoToSchedule(s.dept_code, s.id) }]
           });
       }

       // 3. Unverified / Pending
       if (s.proctor && s.proctor !== 'TBA' && !s.flagged && !s.hasConflict) {
           const pName = s.proctor.toLowerCase();
           const proctorProfile = allProfiles.find(p => (p.full_name||'').toLowerCase() === pName || (p.name||'').toLowerCase() === pName);
           
           if (proctorProfile && proctorProfile.role === 'PROCTOR') {
               const hasAvail = globalAvailability.some(a => a.proctor_id === proctorProfile.id && a.exam_date === s.exam_date && s.start_time < a.end_time && s.end_time > a.start_time);
               if (!hasAvail) {
                   pendingMap.set(proctorProfile.id, proctorProfile);
                   issues.push({
                       id: `unverified-${s.id}`, scheduleId: s.id, deptCode: s.dept_code, oldProctor: s.proctor, section: s.section, subjectCode: s.subject_code, severity: 'warning',
                       icon: <Clock size={16} className="text-white" />, bgClass: 'bg-amber-500', textClass: 'text-amber-600', borderClass: 'border-amber-200 hover:border-amber-400',
                       title: `Pending Proctor Acceptance`,
                       desc: `${s.proctor} has not accepted the assignment or logged availability for ${s.subject_code} on ${s.exam_date}.`,
                       suggestion: null, // Nudging is better here than auto-swapping
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
           issues.push({
               id: `tba-${s.id}`, scheduleId: s.id, deptCode: s.dept_code, oldProctor: s.proctor, section: s.section, subjectCode: s.subject_code, severity: 'warning',
               icon: <Users size={16} className="text-white" />, bgClass: 'bg-amber-500', textClass: 'text-amber-600', borderClass: 'border-amber-200 hover:border-amber-400',
               title: `Missing Proctor (TBA)`,
               desc: `Section ${s.section} (${s.subject_code}) is completely missing a proctor for ${s.exam_date}.`,
               suggestion: suggestion,
               actions: [{ label: 'Manual Assign', icon: <Users size={14}/>, primary: true, onClick: () => onGoToSchedule(s.dept_code, s.id) }]
           });
       }
    });

    const severityMap = { 'critical': 1, 'urgent': 2, 'warning': 3 };
    return { detectedIssues: issues.sort((a, b) => severityMap[a.severity] - severityMap[b.severity]), pendingProctors: Array.from(pendingMap.values()) };
  }, [schedule, allProfiles, globalAvailability]);

  if (detectedIssues.length === 0) {
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Action <span className="text-rose-600 italic">Center</span></h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Smart Resolution Hub</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
           {pendingProctors.length > 0 && (
             <button onClick={() => onBatchNudge(pendingProctors)} className="bg-amber-100 text-amber-700 hover:bg-amber-200 hover:border-amber-300 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border border-amber-200 shadow-sm active:scale-95">
                <MessageSquare size={14}/> Nudge {pendingProctors.length} Unverified
             </button>
           )}
           <div className="bg-rose-100 text-rose-600 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border border-rose-200">
             {detectedIssues.length} Issue{detectedIssues.length !== 1 ? 's' : ''}
           </div>
        </div>
      </div>

      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {detectedIssues.map(issue => {
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
                    <h4 className={`text-sm font-black uppercase tracking-tight ${issue.textClass} flex items-center gap-2`}>
                      {issue.title}
                      {issue.suggestion && !isExpanded && <Zap size={12} className="text-emerald-500 fill-emerald-500 animate-pulse" title="Auto-Fix Available"/>}
                    </h4>
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
                  
                  {/* INLINE AUTO-RESOLVE SUGGESTION */}
                  {issue.suggestion && (
                      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-4 flex justify-between items-center animate-in zoom-in-95">
                          <div>
                             <span className="text-[9px] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1.5 mb-1"><Zap size={12} className="text-emerald-600 fill-emerald-600"/> System Auto-Resolve</span>
                             <span className="text-xs font-bold text-emerald-700">Assign to available proctor: <strong>{issue.suggestion}</strong></span>
                          </div>
                          <button 
                              onClick={(e) => { e.stopPropagation(); onAutoResolve(issue.scheduleId, issue.suggestion, issue.deptCode, issue.oldProctor, issue.section, issue.subjectCode); }} 
                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95 border border-emerald-700"
                          >
                              Apply Fix
                          </button>
                      </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    {issue.actions.map((action, idx) => (
                      <button 
                        key={idx}
                        onClick={(e) => { e.stopPropagation(); action.onClick(); }}
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
