import accordLogo from '../accord.png';
import React, { useState, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Trash2, Plus, Play, Clock, Calendar, Download,
  ShieldCheck, Globe, Home, BookOpen, ChevronRight,
  Settings2, Users, RefreshCw, CheckCircle2, AlertCircle,
  LayoutGrid, AlertTriangle, Edit3, ArrowUp, ArrowDown, Lock, X, Info, Layers, DoorOpen
} from 'lucide-react';

// --- HELPER FUNCTIONS ---
const formatTime = (timeStr) => {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${suffix}`;
};

const addHours = (time, hours) => {
  const [h, m] = time.split(':').map(Number);
  const totalH = h + hours;
  return `${String(totalH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// --- NEW: SMART NAME NORMALIZER ---
const normalizeName = (name) => {
  if (!name) return "";
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // Replaces commas, periods, etc. with spaces
    .split(/\s+/) // Splits the name into individual words
    .filter(word => word && !['prof', 'dr', 'mr', 'ms', 'mrs'].includes(word)) // Removes empty spaces and titles
    .sort() // Alphabetizes the words (so "James Chua" matches "Chua James")
    .join(' ');
};
// --- NEW: ADVANCED PARTIAL NAME MATCHER ---
const normalizeNameToArray = (name) => {
  if (!name) return [];
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word && !['prof', 'dr', 'mr', 'ms', 'mrs'].includes(word));
};
// --- NEW: SMART PREFIX ENGINE ---
// Allows "J. Smith" to perfectly match "John Smith"
const checkNameMatch = (typedName, systemName) => {
   const typedArr = normalizeNameToArray(typedName);
   const systemArr = normalizeNameToArray(systemName);
   
   if (typedArr.length === 0 || systemArr.length === 0) return false;
   
   // Every word/initial typed by the Admin must match OR be the starting letter of the System Name
   return typedArr.every(searchWord => 
       systemArr.some(sysWord => sysWord === searchWord || sysWord.startsWith(searchWord))
   );
};
// --- NEW: SMART SECTION PARSER ---
// Reads strings like "Kelly (C,D), Smith (A)" and outputs an array of objects
const parseSubjectProfs = (profString) => {
  if (!profString) return [];
  // Split by comma, but ignore commas inside parentheses
  const parts = profString.split(/,(?![^\(\)]*\))/g);
  return parts.map(part => {
     let p = part.trim();
     // Bulletproof extraction (ignores trailing spaces completely)
     if (p.includes('(') && p.includes(')')) {
        const start = p.indexOf('(');
        const end = p.indexOf(')');
        const name = p.substring(0, start).trim();
        const sections = p.substring(start + 1, end).split(',').map(s => s.trim().toUpperCase());
        return { name, sections };
     }
     return { name: p, sections: [] };
  });
};

const DepartmentCard = ({
  dept,
  onUpdate,
  onGenerate,
  onDeleteDept,
  onEditDept,
  onClearSchedule,
  globalSchedule = [],
  allDepartments = [],
  allProfiles = [],
  globalAvailability = [], 
  role,
  onNotify,
  onEditProctor,
  highlightTarget
}) => {
  const [activeTab, setActiveTab] = useState("subjects");
  const [generationErrors, setGenerationErrors] = useState([]);
  const [proctorSearchTerm, setProctorSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [tempProfs, setTempProfs] = useState([{ name: '', sections: '' }]);
  // Destructure from the 'dept' prop directly for logic
  const { subjects, proctors, rooms, name: deptName, code: deptCode, id: deptId } = dept;
  
  // --- AUTOMATION: Dynamically find all Proctors assigned to this Dept from Profiles ---
  const activeDeptProctors = useMemo(() => {
    return allProfiles.filter(p => 
      p.assigned_dept === deptCode && p.role?.toUpperCase() === 'PROCTOR'
    );
  }, [allProfiles, deptCode]);

  // --- MANUAL POWER LAYER STATES ---
  const [localSchedule, setLocalSchedule] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [toast, setToast] = useState(null);
  const [previousScheduleState, setPreviousScheduleState] = useState([]); // For Undo

  // Modals
  const [flagModal, setFlagModal] = useState({ isOpen: false, targetId: null, note: "" });
  const [proctorModal, setProctorModal] = useState({ isOpen: false, targetSub: null, pool: 'Department' });
  const [roomModal, setRoomModal] = useState({ isOpen: false, targetBlock: null, pool: 'Department' });
  const [summaryModalIsOpen, setSummaryModalIsOpen] = useState(false);
  const [unverifiedModal, setUnverifiedModal] = useState({ isOpen: false, assignments: [], reason: '' });
  const [proctorWarningModal, setProctorWarningModal] = useState({ isOpen: false, resolve: null, sectionID: '', dayDate: '', source: '', hasFallback: false, fallbackPoolName: '', teachers: [] });
  const [manualProctorInput, setManualProctorInput] = useState("");
  const [roomWarningModal, setRoomWarningModal] = useState({ isOpen: false, resolve: null, sectionID: '', targetHeadcount: 0, nextRoom: null, nextCap: 0, fallbackRoom: null, fallbackCap: 0, fitsAnywhere: false });
  const [editSubjectModal, setEditSubjectModal] = useState({ isOpen: false, originalCode: '', year: '', code: '', name: '', tempProfs: [] });
  const [editRoomModal, setEditRoomModal] = useState({ isOpen: false, id: null, number: '', type: 'Department' });
  const [exportConfig, setExportConfig] = useState({ isOpen: false, format: 'pdf', type: 'ALL', targetValue: '' });

  // --- NEW: DECISION ENGINE MODAL ---
  const [decisionModal, setDecisionModal] = useState({ isOpen: false, title: '', message: '', type: 'info', action: null });

  const confirmProctorSwitch = (pName, scope) => {
     const isGlobal = !activeDeptProctors.some(p => (p.full_name || p.name) === pName);
     if (isGlobal) {
        setDecisionModal({
           isOpen: true,
           title: "Cross-Department Assignment",
           message: `You are about to assign ${pName}, who belongs to a different department (Global Pool). This will lock their schedule university-wide. Proceed?`,
           type: 'amber',
           action: () => { handleProctorSwitch(pName, scope); setDecisionModal({ isOpen: false }); }
        });
     } else {
        handleProctorSwitch(pName, scope);
     }
  };

  const confirmRoomSwitch = (rNum) => {
     const isGlobal = !rooms.some(r => r.number === rNum);
     if (isGlobal) {
        setDecisionModal({
           isOpen: true,
           title: "Global Room Assignment",
           message: `You are about to assign Room ${rNum} from the Global Pool. This will claim a shared university resource for this time block. Proceed?`,
           type: 'amber',
           action: () => { handleRoomSwitch(rNum); setDecisionModal({ isOpen: false }); }
        });
     } else {
        handleRoomSwitch(rNum);
     }
  };

  const toggleProctorSource = () => {
    const nextSource = proctorSource === "Department" ? "Global" : "Department";
    setDecisionModal({
      isOpen: true,
      title: `Switch to ${nextSource} Proctors?`,
      message: nextSource === 'Global' 
        ? "You are about to allow the generator to pull available proctors from other departments. Proceed?"
        : "You are restricting the generator to ONLY use your internal department proctors. Proceed?",
      type: 'blue',
      action: () => { setProctorSource(nextSource); setDecisionModal({ isOpen: false }); showToast(`Proctor Source set to ${nextSource}`); }
    });
  };

  const toggleRoomSource = () => {
    const nextSource = roomSource === "Department" ? "Global" : "Department";
    setDecisionModal({
      isOpen: true,
      title: `Switch to ${nextSource} Rooms?`,
      message: nextSource === 'Global' 
        ? "You are about to allow the generator to pull unassigned rooms from the entire university pool. This helps resolve shortages but uses shared resources. Proceed?"
        : "You are restricting the generator to ONLY use your department's internal rooms. Proceed?",
      type: 'blue',
      action: () => { setRoomSource(nextSource); setDecisionModal({ isOpen: false }); showToast(`Room Source set to ${nextSource}`); }
    });
  };

  // ENHANCEMENT: Sync initial preview AND respond to external updates safely
  useEffect(() => {
    const serverData = globalSchedule.filter(s => s.dept_code === deptCode);
    
    setLocalSchedule(prevLocal => {
      // SAFETY LOCK: Check if local items are missing DB IDs, but the server data has them
      const needsIdSync = prevLocal.length > 0 && !prevLocal[0].id && serverData.length > 0 && serverData[0].id;
      
      if (prevLocal.length === 0 || serverData.length !== prevLocal.length || needsIdSync) {
        return serverData.map(item => ({
          ...item,
          flagged: Boolean(item.flagged ?? false),
          flagNote: item.flagNote ?? "",
          isManualProctor: Boolean(item.isManualProctor ?? false)
        }));
      }
      return prevLocal;
    });
  }, [globalSchedule, deptCode]);

  const showToast = (message, type = 'success', undoable = false) => {
    setToast({ message, type, undoable });
    if (!undoable) setTimeout(() => setToast(null), 4000);
  };

  const undoLastChange = () => {
    if (previousScheduleState.length > 0) {
      setLocalSchedule(previousScheduleState);
      setAuditLog(prev => [...prev, "Reverted last change."]);
      setToast(null);
    }
  };

 // 9.5 RE-VALIDATION ENGINE - OVERRIDE ENABLED (NON-BLOCKING)
  const validateAndApplyChange = (newSchedule, logMessage, externalOverrides = []) => {
    let externalSchedule = globalSchedule.filter(s => s.dept_code !== deptCode);

    if (externalOverrides.length > 0) {
      const overrideIds = new Set(externalOverrides.map(o => o.id));
      externalSchedule = externalSchedule.filter(s => !overrideIds.has(s.id));
      externalSchedule = [...externalSchedule, ...externalOverrides];
    }

    const combined = [...externalSchedule, ...newSchedule];
    const conflicts = [];
    const conflictIds = new Set(); // Track conflicting rows to flag them visually

    for (let i = 0; i < combined.length; i++) {
      for (let j = i + 1; j < combined.length; j++) {
        const a = combined[i]; 
        const b = combined[j];

        if (a.exam_date === b.exam_date && a.section !== b.section) {
          const hasTimeOverlap = a.start_time < b.end_time && a.end_time > b.start_time;

          if (hasTimeOverlap) {
            if (a.proctor && b.proctor && a.proctor === b.proctor && a.proctor !== "TBA") {
              conflicts.push(`Proctor ${a.proctor} double-booked: ${a.section} vs ${b.section}`);
              conflictIds.add(a.id);
              conflictIds.add(b.id);
            }
            if (a.room && b.room && a.room === b.room && a.room !== "TBA") {
              conflicts.push(`Room ${a.room} double-booked: ${a.section} vs ${b.section}`);
              conflictIds.add(a.id);
              conflictIds.add(b.id);
            }
          }
        }
      }
    }

    if (conflicts.length > 0) {
      showToast(`Warning: Override applied but resulted in ${conflicts.length} conflict(s).`, 'error', true);
    }

    const normalizedSchedule = newSchedule.map(item => {
      const hasConflict = conflictIds.has(item.id);
      return {
        ...item,
        id: item.id, 
        dept_code: deptCode,
        flagged: hasConflict || Boolean(item.flagged ?? false),
        flagNote: hasConflict ? "Overridden Conflict" : (item.flagNote ?? ""),
        isManualProctor: Boolean(item.isManualProctor ?? false),
        subject_code: item.subject_code || item.code,
        original_proctor: item.original_proctor || item.proctor,
        original_room: item.original_room || item.room
      };
    });

    const normalizedOverrides = externalOverrides.map(item => {
      const hasConflict = conflictIds.has(item.id);
      return {
        ...item,
        flagged: hasConflict || Boolean(item.flagged ?? false),
        flagNote: hasConflict ? "Overridden Conflict" : (item.flagNote ?? "")
      };
    });

    setLocalSchedule(normalizedSchedule);
    setAuditLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${logMessage}`]);

    if (onUpdate) {
      onUpdate('manual_override', [...normalizedSchedule, ...normalizedOverrides]);
    }
    
    if (conflicts.length === 0) {
      showToast(`${logMessage}`);
    }
    return true;
  };

  // --- ENHANCED PREVIEW ENGINE ---
  const consolidatedPreview = useMemo(() => {
    const deptData = localSchedule;
    const groups = {};
    const today = new Date().toISOString().split('T')[0];

    deptData.forEach(item => {
      const groupKey = `${item.section}-${item.exam_date}-${item.room}`;
      if (!groups[groupKey]) {
        let currentStatus = item.status || 'COMMITTED';
        if (item.exam_date < today) currentStatus = 'DONE';
        groups[groupKey] = {
          section: item.section,
          date: item.exam_date,
          year: item.year_level,
          room: item.room,
          status: currentStatus,
          startTime: item.start_time,
          endTime: item.end_time,
          subs: []
        };
      }
      groups[groupKey].subs.push({
        id: item.id,
        code: item.subject_code,
        name: item.subject_name,
        slot: `${formatTime(item.start_time)} - ${formatTime(item.end_time)}`,
        startTime: item.start_time,
        endTime: item.end_time,
        proctor: item.proctor,
        flagged: item.flagged,
        flagNote: item.flagNote,
        isManualProctor: item.isManualProctor,
        year_level: item.year_level,
        original_proctor: item.original_proctor,
        original_room: item.original_room,
        original_subject_code: item.original_subject_code
      });

      if (item.start_time < groups[groupKey].startTime) groups[groupKey].startTime = item.start_time;
      if (item.end_time > groups[groupKey].endTime) groups[groupKey].endTime = item.end_time;
    });

    return Object.values(groups).map(g => ({
      ...g,
      subs: g.subs.sort((a, b) => a.startTime.localeCompare(b.startTime))
    })).sort((a, b) => new Date(a.date) - new Date(b.date) || a.section.localeCompare(b.section));
  }, [localSchedule, deptCode]);

  const tablesByYearAndDay = useMemo(() => {
    const data = {};
    consolidatedPreview.forEach(item => {
      if (!data[item.year]) data[item.year] = {};
      if (!data[item.year][item.date]) data[item.year][item.date] = [];
      data[item.year][item.date].push(item);
    });
    return data;
  }, [consolidatedPreview]);

  // --- GENERATOR UI STATES ---
  const [examDays, setExamDays] = useState(0);
  const [examDates, setExamDates] = useState([]);
  const [startTime, setStartTime] = useState("08:00");
  const [selectedYear, setSelectedYear] = useState("1");
 const [sectionCount, setSectionCount] = useState(0);
  const [sectionSizes, setSectionSizes] = useState({}); // Upgraded to an object for dynamic boxes
  const [proctorSource, setProctorSource] = useState("Department");
  const [roomSource, setRoomSource] = useState("Department");

  const [pName, setPName] = useState("");

  const [pDayStart, setPDayStart] = useState("");
  const [pDayEnd, setPDayEnd] = useState("");
  const [pTimeStart, setPTimeStart] = useState("08:00");
  const [pTimeEnd, setPTimeEnd] = useState("17:00");

  const [roomNum, setRoomNum] = useState("");
  const [roomType, setRoomType] = useState("Department");
  const [roomCap, setRoomCap] = useState("");
  
  const now = new Date();
  const todayString = now.toISOString().split('T')[0];
  const currentTimeStr = now.toTimeString().substring(0, 5);

  const isPast = (d, eTime) => {
    if (!d) return false;
    if (d < todayString) return true;
    if (d === todayString && eTime < currentTimeStr) return true;
    return false;
  };
  const globalProctorPool = useMemo(() => allProfiles.filter(p => p.role?.toUpperCase() === 'PROCTOR'), [allProfiles]);
  const globalRoomPool = useMemo(() => allDepartments.flatMap(d => d.rooms), [allDepartments]);

  const handleExamDayChange = (val) => {
    const num = parseInt(val) || 0;
    setExamDays(num);
    setExamDates(new Array(num).fill(''));
  };

  
  const handleGenerateClick = async () => {
    setGenerationErrors([]);
    const errors = [];
    const warningLogs = [];
    const yearSubs = subjects[selectedYear] || [];

    if (yearSubs.length === 0) errors.push({ 
      issue: "No Subjects", 
      resolution: `Add subjects for Year ${selectedYear} in the 'Subjects' tab first.` 
    });
    if (examDays === 0 || sectionCount === 0) errors.push({ 
      issue: "Configuration Error", 
      resolution: "Set Total Exam Days and Total Sections to at least 1." 
    });
    if (examDates.some(d => !d)) errors.push({ 
      issue: "Timeline Incomplete", 
      resolution: "Please assign a specific date to every exam day in the list." 
    });

    if (errors.length > 0) {
      setGenerationErrors(errors);
      showToast("Generation Halted: Setup incomplete.", "error");
      return;
    }

    const shuffled = [...yearSubs].sort(() => Math.random() - 0.5);
    const dailySubs = Array.from({ length: examDays }, () => []);
    shuffled.forEach((s, i) => dailySubs[i % examDays].push(s));

    const finalGeneratedData = [];
    let generationFailed = false; 

for (let d = 0; d < examDays; d++) {
      if (generationFailed) break; 

      const dayDate = examDates[d];
      const daySubjects = dailySubs[d];
      if (daySubjects.length === 0) continue;

      const duration = daySubjects.length;
      const endTime = addHours(startTime, duration);

      const isRoomFree = (rNum) => !globalSchedule.some(gs => 
        gs.room === rNum && 
        gs.exam_date === dayDate && 
        (startTime < gs.end_time && endTime > gs.start_time)
      );

      const localRooms = rooms.filter(r => isRoomFree(r.number));
      const otherRooms = globalRoomPool.filter(r => !rooms.find(dr => dr.number === r.number) && isRoomFree(r.number));
      const uniqueOtherRooms = otherRooms.filter((v, i, a) => a.findIndex(t => (t.number === v.number)) === i);
      let availableRooms = roomSource === "Department" ? [...localRooms, ...uniqueOtherRooms] : [...uniqueOtherRooms, ...localRooms];

      const primaryPool = proctorSource === "Department" ? activeDeptProctors : globalProctorPool.filter(p => p.assigned_dept !== deptCode);
      const fallbackPool = proctorSource === "Department" ? globalProctorPool.filter(p => p.assigned_dept !== deptCode) : activeDeptProctors;

      for (let s = 0; s < sectionCount; s++) {
        const sectionLetter = String.fromCharCode(65 + s);
        const sectionID = `${deptCode}${selectedYear}${sectionLetter}`;

        // --- REUSABLE POOL EVALUATOR ---
        const evaluatePool = (pool, enforceRules = true) => {
          let available = [];
          let tConflicts = [];
          let aConflicts = [];
          let dConflicts = [];

          pool.forEach(p => {
            const pArr = normalizeNameToArray(p.full_name || p.name);
            
           // 1. Check Conflict of Interest (SMART PREFIX MATCHING - ENTIRE CURRICULUM)
            const isTeacher = yearSubs.some(sub => {
                const profList = parseSubjectProfs(sub.prof);
                return profList.some(profObj => {
                    const appliesToThisSection = profObj.sections.length === 0 || profObj.sections.includes(sectionLetter);
                    const nameMatch = checkNameMatch(profObj.name, p.full_name || p.name);
                    return appliesToThisSection && nameMatch;
                });
            });

            if (enforceRules && isTeacher) {
              tConflicts.push(p.full_name || p.name);
              return; 
            }

            // 2. Check Diversity Rule
            const hasProctoredThisSectionBefore = finalGeneratedData.some(assign => 
               assign.proctor === (p.full_name || p.name) && assign.section === sectionID
            );

            if (enforceRules && hasProctoredThisSectionBefore) {
               dConflicts.push(p.full_name || p.name);
               return; 
            }

            // 3. Check Logged Availability
            const pLogs = globalAvailability.filter(a => a.proctor_id === p.id && a.exam_date === dayDate);
            const pAssignments = [...globalSchedule, ...finalGeneratedData].filter(assign => 
              assign.proctor === (p.full_name || p.name) && assign.exam_date === dayDate
            );

            const hasValidLog = pLogs.some(log => {
              const safeLogStart = log.start_time.substring(0, 5);
              const safeLogEnd = log.end_time.substring(0, 5);
              const coversExam = startTime >= safeLogStart && endTime <= safeLogEnd;

              const isBurnt = pAssignments.some(assign => {
                const assignStart = assign.start_time.substring(0, 5);
                const assignEnd = assign.end_time.substring(0, 5);
                return safeLogStart < assignEnd && safeLogEnd > assignStart; 
              });

              return coversExam && !isBurnt;
            });

            if (hasValidLog) available.push(p);
            else aConflicts.push(p.full_name || p.name);
          });

          return { available, tConflicts, aConflicts, dConflicts };
        };

        let evalResult = evaluatePool(primaryPool, true);

     // --- INTERACTIVE PROCTOR FALLBACK & EMERGENCY OVERRIDE ---
        if (evalResult.available.length === 0) {
           const fallbackResult = evaluatePool(fallbackPool, true);
           const hasFallback = fallbackResult.available.length > 0;
           
           const desperatePrimary = evaluatePool(primaryPool, false);
           const desperateFallback = evaluatePool(fallbackPool, false);
           const allDesperate = [...desperatePrimary.available, ...desperateFallback.available];
           
           const combinedTConflicts = [...evalResult.tConflicts, ...fallbackResult.tConflicts];
           const availableTeachers = allDesperate.filter(p => combinedTConflicts.includes(p.full_name || p.name));

           // PAUSE AND ASK ADMIN
           const userChoice = await new Promise((resolve) => {
              setProctorWarningModal({
                 isOpen: true,
                 resolve: resolve,
                 sectionID: sectionID,
                 dayDate: dayDate,
                 source: proctorSource,
                 fallbackPoolName: proctorSource === 'Department' ? 'Global Pool' : 'Internal Department',
                 hasFallback: hasFallback,
                 teachers: availableTeachers
              });
           });

           if (!userChoice || userChoice.type === 'halt') {
              generationFailed = true;
              errors.push({ issue: `Proctor Shortage Halted (Day ${d+1})`, resolution: `Generation aborted because no proctors were assigned for Section ${sectionID}.` });
           } else if (userChoice.type === 'fallback') {
              evalResult = fallbackResult;
              warningLogs.push(`Section ${sectionLetter} on Day ${d+1} pulled a proctor from the ${proctorSource === 'Department' ? 'Global' : 'Internal'} pool.`);
           } else if (userChoice.type === 'teacher') {
              evalResult.available = [userChoice.proctor];
              warningLogs.push(`Section ${sectionLetter} on Day ${d+1} forced a Subject Teacher conflict (${userChoice.proctor.full_name || userChoice.proctor.name}).`);
           } else if (userChoice.type === 'manual') {
              evalResult.available = [{ full_name: userChoice.name, name: userChoice.name }];
              warningLogs.push(`Section ${sectionLetter} on Day ${d+1} assigned to manual/guest proctor: ${userChoice.name}.`);
           }
        }  

      // --- NEW: CHRONOLOGICAL & CAPACITY ROOM ASSIGNMENT ---
        availableRooms.sort((a, b) => a.number.localeCompare(b.number, undefined, {numeric: true}));

        // Read directly from the dynamic box for this specific letter
        let targetHeadcount = parseInt(sectionSizes[sectionLetter]) || 0;

        let selectedRoomIndex = -1;
        for (let i = 0; i < availableRooms.length; i++) {
           // N/A or empty now defaults to 0, forcing you to define room capacities properly!
           let maxCap = parseInt(String(availableRooms[i].capacity || '0').split('-').pop().trim()) || 0;
           if (targetHeadcount === 0 || maxCap >= targetHeadcount) {
              selectedRoomIndex = i;
              break;
           }
        }

        let finalSelectedRoom = null;

        if (availableRooms.length === 0) {
          errors.push({ 
            issue: `Room Shortage (Day ${d+1})`, 
            resolution: `No available rooms for Section ${sectionID} on ${dayDate}. Add more rooms or check global overlaps.` 
          });
          generationFailed = true;
        } else if (selectedRoomIndex === 0 || targetHeadcount === 0) {
            // Perfect fit chronologically, or user chose to bypass capacity checks
            finalSelectedRoom = availableRooms.splice(0, 1)[0];
        } else {
            // Conflict! We either skipped rooms or no room fits at all.
            let nextChronologicalRoom = availableRooms[0];
            let nextChronologicalCap = parseInt(String(nextChronologicalRoom?.capacity || '0').split('-').pop().trim()) || 0;
            
            let fallbackRoom = selectedRoomIndex > 0 ? availableRooms[selectedRoomIndex] : null;
            let fallbackCap = fallbackRoom ? parseInt(String(fallbackRoom.capacity || '0').split('-').pop().trim()) || 0 : 0;
            let fitsAnywhere = true;

            if (!fallbackRoom) {
                fitsAnywhere = false;
                // Find the LARGEST room if none fit perfectly
                let maxFound = -1;
                let maxIdx = 0;
                availableRooms.forEach((r, i) => {
                   let c = parseInt(String(r.capacity || '0').split('-').pop().trim()) || 0;
                   if(c > maxFound) { maxFound = c; maxIdx = i; }
                });
                fallbackRoom = availableRooms[maxIdx];
                fallbackCap = maxFound;
                selectedRoomIndex = maxIdx;
            }

            // --- PAUSE ALGORITHM & ASK ADMIN ---
            const userChoice = await new Promise((resolve) => {
                setRoomWarningModal({
                    isOpen: true,
                    resolve: resolve,
                    sectionID: sectionID,
                    targetHeadcount: targetHeadcount,
                    nextRoom: nextChronologicalRoom,
                    nextCap: nextChronologicalCap,
                    fallbackRoom: fallbackRoom,
                    fallbackCap: fallbackCap,
                    fitsAnywhere: fitsAnywhere
                });
            });

            if (!userChoice || userChoice === 'halt') {
                generationFailed = true;
                errors.push({
                   issue: `Capacity Halted (Day ${d+1})`,
                   resolution: `Generation aborted due to strict capacity constraints for Section ${sectionID} (${targetHeadcount} students).`
                });
            } else if (userChoice === 'force') {
                finalSelectedRoom = availableRooms.splice(0, 1)[0];
                warningLogs.push(`Section ${sectionLetter} forced into Room ${finalSelectedRoom.number} (${nextChronologicalCap} cap) despite having ${targetHeadcount} students.`);
            } else if (userChoice === 'skip') {
                finalSelectedRoom = availableRooms.splice(selectedRoomIndex, 1)[0];
                warningLogs.push(`Section ${sectionLetter} skipped to Room ${finalSelectedRoom.number} to accommodate ${targetHeadcount} students.`);
            }
        }

        if (generationFailed) break;

        if (evalResult.available.length === 0 && !generationFailed) {
          let issueTitle = `Proctor Shortage (Day ${d+1})`;
          let resolutionText = `No proctors available for Section ${sectionID} on ${dayDate}.`;

          if (evalResult.tConflicts.length > 0 && evalResult.aConflicts.length === 0 && evalResult.dConflicts.length === 0) {
            issueTitle = `Conflict of Interest (Day ${d+1})`;
            resolutionText = `The only available proctors (${evalResult.tConflicts.join(', ')}) are teaching subjects in this section block. Please assign external proctors.`;
          } else if (evalResult.dConflicts.length > 0 && evalResult.aConflicts.length === 0 && evalResult.tConflicts.length === 0) {
            issueTitle = `Section Rotation Rule (Day ${d+1})`;
            resolutionText = `Available proctors (${evalResult.dConflicts.join(', ')}) have already guarded Section ${sectionID} on a previous day. Add more proctors to allow rotation.`;
          } else if (evalResult.tConflicts.length > 0 || evalResult.dConflicts.length > 0) {
            issueTitle = `Resource Blocked (Day ${d+1})`;
            resolutionText = `Some proctors were excluded due to Conflict of Interest or the Section Rotation rule. The rest lacked logged hours. Add more proctors.`;
          } else {
            resolutionText = `All assigned proctors either lack logged availability for this timeframe or are already assigned to another room.`;
          }

          errors.push({ issue: issueTitle, resolution: resolutionText });
          generationFailed = true;
        }

      if (!generationFailed) {
          // --- NEW: EQUAL WORKLOAD DISTRIBUTION ALGORITHM ---
          // Sorts the available proctors so the person with the LEAST assignments gets picked first!
          evalResult.available.sort((a, b) => {
             const aName = a.full_name || a.name;
             const bName = b.full_name || b.name;
             const aCount = finalGeneratedData.filter(s => s.proctor === aName).length;
             const bCount = finalGeneratedData.filter(s => s.proctor === bName).length;
             return aCount - bCount; 
          });

const selectedRoom = finalSelectedRoom;
          const selectedProctor = evalResult.available.shift();

          daySubjects.forEach((sub, idx) => {
            finalGeneratedData.push({
              subject_code: sub.code,
              subject_name: sub.name,
              section: sectionID,
              year_level: selectedYear,
              dept_code: deptCode,
              exam_date: dayDate,
              start_time: addHours(startTime, idx),
              end_time: addHours(startTime, idx + 1),
              room: selectedRoom.number,
              proctor: selectedProctor.full_name || selectedProctor.name,
              original_proctor: selectedProctor.full_name || selectedProctor.name,
              original_room: selectedRoom.number,
              original_subject_code: sub.code,
              status: 'ACTIVE',
              flagged: false,
              flagNote: '',
              isManualProctor: false
            });
          });
        } else {
          break; 
        }
      }
    }
  

   if (errors.length > 0) {
      setGenerationErrors(errors);
      showToast("Generation Blocked: Resource conflicts found.", "error");
      return; 
    }

    // --- NEW: Instantly push the draft to Supabase so items receive valid IDs ---
    if (onGenerate) {
       onGenerate(finalGeneratedData, examDates);
    }

    setLocalSchedule(finalGeneratedData);
    if (warningLogs.length > 0) {
       setAuditLog([...warningLogs.map(w => `[SYSTEM WARNING] ${w}`), "Automated Generation Completed."]);
       showToast("Schedule Generated with Sequence Warnings!", "error");
    } else {
       setAuditLog(["Automated Generation Completed."]);
       showToast("Schedule Generated Successfully!");
    }
    setActiveTab("preview");
  };


  const handleFlagSubmit = () => {
    const updated = localSchedule.map(s =>
      s.id === flagModal.targetId
        ? { ...s, flagged: true, flagNote: flagModal.note }
        : s
    );
    const targetSub = updated.find(s => s.id === flagModal.targetId);
    const success = validateAndApplyChange(updated, `Flagged emergency for ${targetSub.subject_code}.`);
    if (success) {
      setFlagModal({ isOpen: false, targetId: null, note: "" });
    }
  };

const handleProctorSwitch = (newProctorName, scope = 'session') => {
    const t = proctorModal.targetSub;
    if (!t) return;

    const oldProctorName = t.proctor || "TBA";
    const targetDate = t.date || t.exam_date;
    const getSafeId = (item) => item.id || item.tempId || item.subject_code + item.section;
    const clickedId = getSafeId(t);

    let targetIds = new Set();
    let opponentIds = new Set();
    let externalSwaps = [];

    if (scope === 'session') {
      const targetSection = t.section;
      let sessionStart = t.startTime || t.start_time;
      let sessionEnd = t.endTime || t.end_time;
      let targetRoom = t.room;

      localSchedule.forEach(item => {
         const itemStart = item.start_time || item.startTime;
         const itemEnd = item.end_time || item.endTime;
         if ((item.date || item.exam_date) === targetDate && item.section === targetSection && item.room === targetRoom && itemStart >= sessionStart && itemEnd <= sessionEnd) {
             targetIds.add(getSafeId(item));
         }
      });

      const overlappingConflicts = globalSchedule.filter(s => {
        const sStart = s.start_time || s.startTime;
        const sEnd = s.end_time || s.endTime;
        return s.proctor === newProctorName && 
               (s.date || s.exam_date) === targetDate &&
               !s.isManualProctor && 
               (sessionStart < sEnd && sessionEnd > sStart);
      });

      const opponentBlocks = new Set(overlappingConflicts.map(c => `${c.section}-${c.room}`));

      globalSchedule.forEach(item => {
         const itemStart = item.start_time || item.startTime;
         const itemEnd = item.end_time || item.endTime;
         if ((item.date || item.exam_date) === targetDate && itemStart >= sessionStart && itemEnd <= sessionEnd) {
             if (opponentBlocks.has(`${item.section}-${item.room}`) && !item.isManualProctor) {
                 opponentIds.add(getSafeId(item));
             }
         }
      });

    } else {
      targetIds.add(clickedId);

      const subStart = t.start_time || t.startTime;
      const subEnd = t.end_time || t.endTime;

      globalSchedule.forEach(item => {
        const itemId = getSafeId(item);
        const itemStart = item.start_time || item.startTime;
        const itemEnd = item.end_time || item.endTime;

        if (itemId !== clickedId && 
            item.proctor === newProctorName && 
            (item.date || item.exam_date) === targetDate &&
            !item.isManualProctor && 
            (subStart < itemEnd && subEnd > itemStart)) {
            opponentIds.add(itemId);
        }
      });
    }

    const updatedLocal = localSchedule.map(item => {
      const itemId = getSafeId(item);
      
      if (targetIds.has(itemId)) {
        return { ...item, proctor: newProctorName, original_proctor: newProctorName, isManualProctor: true, flagged: false };
      }
      if (opponentIds.has(itemId)) {
        return { ...item, proctor: oldProctorName, original_proctor: oldProctorName, isManualProctor: true, flagged: false };
      }
      return item;
    });

    globalSchedule.forEach(item => {
      if (item.dept_code !== deptCode) {
        const itemId = getSafeId(item);
        if (opponentIds.has(itemId) && !item.isManualProctor) {
          externalSwaps.push({ ...item, proctor: oldProctorName, original_proctor: oldProctorName, isManualProctor: true });
        }
      }
    });

    validateAndApplyChange(updatedLocal, `Proctor Update (${scope})`, externalSwaps);
    setProctorModal({ isOpen: false, targetSub: null, pool: 'Department' });
  };
  
  const handleRoomSwitch = (newRoomNumber) => {
    const target = roomModal.targetBlock;
    const occupiedByGlobal = globalSchedule.some(gs =>
      gs.dept_code !== deptCode &&
      gs.room === newRoomNumber &&
      gs.exam_date === target.date &&
      (target.startTime < gs.end_time && target.endTime > gs.start_time)
    );

    if (occupiedByGlobal) {
      showToast(`Room ${newRoomNumber} is reserved by another department.`, 'error');
      return;
    }

    const occupantInDraft = localSchedule.find(s =>
      s.room === newRoomNumber &&
      s.exam_date === target.date &&
      s.section !== target.section &&
      (target.startTime < s.end_time && target.endTime > s.start_time)
    );

    let updated;
    let logMsg;
    if (occupantInDraft) {
      const oldRoom = localSchedule.find(s => s.section === target.section && s.exam_date === target.date).room;
      updated = localSchedule.map(s => {
        if (s.section === target.section && s.exam_date === target.date) return { ...s, room: newRoomNumber };
        if (s.section === occupantInDraft.section && s.exam_date === target.date) return { ...s, room: oldRoom };
        return s;
      });
      logMsg = `Swapped Room ${newRoomNumber} (${occupantInDraft.section}) with Room ${oldRoom} (${target.section}).`;
    } else {
      updated = localSchedule.map(s =>
        (s.section === target.section && s.exam_date === target.date) ? { ...s, room: newRoomNumber } : s
      );
      logMsg = `Moved Section ${target.section} to Room ${newRoomNumber}.`;
    }

    const success = validateAndApplyChange(updated, logMsg);
    if (success) setRoomModal({ isOpen: false, targetBlock: null });
  };

  const handleSubjectSwitch = (id, newSubCode) => {
    const targetItem = localSchedule.find(s => s.id === id);
    if (!targetItem) return;

    const yearSubs = subjects[targetItem.year_level] || [];
    const fullSub = yearSubs.find(s => s.code === newSubCode);
    if (!fullSub) return;

    const updated = localSchedule.map(s =>
      s.id === id
        ? { ...s, subject_code: fullSub.code, subject_name: fullSub.name }
        : s
    );
    validateAndApplyChange(updated, `Switched subject to ${fullSub.code}.`);
  };

  const handleMoveSubject = (block, idx, direction) => {
    if (idx + direction < 0 || idx + direction >= block.subs.length) return;
    const subA = block.subs[idx];
    const subB = block.subs[idx + direction];

    const updated = localSchedule.map(s => {
      if (s.id === subA.id) return { ...s, start_time: subB.startTime, end_time: subB.endTime };
      if (s.id === subB.id) return { ...s, start_time: subA.startTime, end_time: subA.endTime };
      return s;
    });
    validateAndApplyChange(updated, `Reordered subjects in section ${block.section}.`);
  };

  const executeExport = () => {
    try {
      if (!localSchedule || localSchedule.length === 0) {
        alert("ERROR: No schedule data found to export!"); 
        return;
      }
      
      let filtered = [...localSchedule];
      let titleSuffix = "Master";

      if (exportConfig.type === 'YEAR') {
        filtered = filtered.filter(s => String(s.year_level) === String(exportConfig.targetValue));
        titleSuffix = `Year_${exportConfig.targetValue}`;
      } else if (exportConfig.type === 'DATE') {
        filtered = filtered.filter(s => s.exam_date === exportConfig.targetValue);
        titleSuffix = `Date_${exportConfig.targetValue}`;
      } else if (exportConfig.type === 'SECTION') {
        filtered = filtered.filter(s => s.section === exportConfig.targetValue);
        titleSuffix = `Section_${exportConfig.targetValue}`;
      }

      if (filtered.length === 0) {
        alert("ERROR: No data matches your current filter selection.");
        return;
      }

      const sorted = filtered.sort((a, b) => {
        const dateA = new Date(a.exam_date || 0);
        const dateB = new Date(b.exam_date || 0);
        return dateA - dateB || (a.start_time || "").localeCompare(b.start_time || "");
      });

       if (exportConfig.format === 'pdf') {
        const doc = new jsPDF({ orientation: 'landscape' });
        
        const titleText = `${deptName || 'Department'} Schedule: ${titleSuffix.replace(/_/g, ' ')}`;
        
        // 1. UPDATED LETTERHEAD FUNCTION
        const drawLetterhead = (data) => {
          if (!doc.headerPrintedPages) doc.headerPrintedPages = new Set();
          if (doc.headerPrintedPages.has(data.pageNumber)) return;
          doc.headerPrintedPages.add(data.pageNumber);

          doc.addImage(accordLogo, 'PNG', 14, 12, 12, 12);

          // "ACCORD PRO" Branding
          doc.setFont("helvetica", "bolditalic");
          doc.setFontSize(22);
          doc.setTextColor(15, 23, 42); 
          doc.text("ACCORD", 30, 20);
          
          const accordWidth = doc.getTextWidth("ACCORD ");
          doc.setTextColor(37, 99, 235); 
          doc.text("PRO", 30 + accordWidth, 20);

          // Clean Subtitle
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(100, 116, 139); 
          doc.text(titleText.toUpperCase(), 30, 26);

          doc.setDrawColor(37, 99, 235); 
          doc.setLineWidth(0.5);
          doc.line(14, 32, doc.internal.pageSize.getWidth() - 14, 32);
        };

        let currentY = 40; 

        const groupedData = {};
        sorted.forEach(item => {
          const sec = item.section || "N/A";
          const date = item.exam_date || "N/A";
          if (!groupedData[sec]) groupedData[sec] = {};
          if (!groupedData[sec][date]) groupedData[sec][date] = [];
          groupedData[sec][date].push(item);
        });

        Object.keys(groupedData).sort().forEach(section => {
          Object.keys(groupedData[section]).sort().forEach(date => {
            const items = groupedData[section][date];

            const tableRows = items.map(item => [
              `${formatTime(item.start_time)} - ${formatTime(item.end_time)}`,
              item.year_level || "N/A",
              `${item.subject_code || ""} - ${item.subject_name || ""}`,
              item.room || "N/A",
              item.proctor || "TBA"
            ]);

            autoTable(doc, { 
              head: [
                [
                  { content: `SECTION: ${section}   |   EXAM DATE: ${date}`, colSpan: 5, styles: { halign: 'center', fillColor: [37, 99, 235], fontStyle: 'bold', fontSize: 11 } }
                ],
                ["Time", "Year", "Subject", "Room", "Proctor"]
              ],
              body: tableRows, 
              startY: currentY, 
              theme: 'grid', 
              styles: { font: 'helvetica', fontSize: 10, cellPadding: 5 }, 
              headStyles: { font: 'helvetica', fillColor: [15, 23, 42], textColor: [255, 255, 255] },
              // 2. THE FIX FOR MISSING HEADERS
              margin: { top: 40, bottom: 20 }, 
              pageBreak: 'avoid',
              didDrawPage: drawLetterhead 
            });

            currentY = doc.lastAutoTable.finalY + 15; 
          });
        });

        doc.save(`Accord_${deptCode || 'DEPT'}_${titleSuffix}.pdf`);
        showToast("PDF Downloaded!");
        
      } else {
        
        
        
    
        const headers = ["Date,Start Time,End Time,Year Level,Section,Subject Code,Subject Name,Room,Proctor"];
        const rows = sorted.map(item => `${item.exam_date || ""},${formatTime(item.start_time)},${formatTime(item.end_time)},${item.year_level || ""},${item.section || ""},${item.subject_code || ""},"${item.subject_name || ""}",${item.room || ""},"${item.proctor || ""}"`);
        const csvContent = headers.concat(rows).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Accord_${deptCode || 'DEPT'}_${titleSuffix}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Excel Downloaded!");
      }
      
      setExportConfig({ ...exportConfig, isOpen: false });
      
    } catch (err) {
      console.error("Export Error Detail:", err);
      alert("SYSTEM ERROR during export: " + err.message);
    }
  };
  
  const handleApproveAndLock = async () => {
    // 1. Identify unverified assignments in the current local draft
    const unverifiedAssignments = localSchedule.filter(item => {
      const isInternal = allProfiles.some(p => 
        (p.full_name === item.proctor || p.name === item.proctor) && 
        p.role?.toUpperCase() === 'PROCTOR'
      );
      if (!isInternal) return false;
      
      return !globalAvailability?.some(entry => 
        entry.proctor_name === item.proctor && 
        entry.exam_date === item.exam_date &&
        (item.start_time < entry.end_time && item.end_time > entry.start_time)
      );
    });

    // 2. If there are unverified proctors, trigger the new Reliever Request Modal
    if (unverifiedAssignments.length > 0) {
      setSummaryModalIsOpen(false);
      setUnverifiedModal({ isOpen: true, assignments: unverifiedAssignments, reason: '' });
      return;
    }

    // 3. If everything is clean, proceed to save normally
    executeSave();
  };

  // --- NEW: Universal Save Engine (Handles normal saves AND Reliever Requests) ---
  const executeSave = async (overrideReason = null, unverifiedToNotify = []) => {
    if (isProcessing) return; // Prevent double-clicks!
    setIsProcessing(true);

    if (overrideReason) {
      setAuditLog(prev => [...prev, `[OVERRIDE] ${overrideReason}`]);
    }

    const dataToSave = localSchedule.map(item => ({
      ...item,
      flagged: item.flagged || false,
      flagNote: item.flagNote || "",
      isManualProctor: item.isManualProctor || false,
      original_proctor: item.original_proctor || item.proctor,
      original_room: item.original_room || item.room,
      original_subject_code: item.original_subject_code || item.subject_code
    }));

    try {
      await onUpdate('lock_and_save', dataToSave);
      setSummaryModalIsOpen(false);
      setUnverifiedModal({ isOpen: false, assignments: [], reason: '' });

      // If we bypassed the lock, instantly send notifications to those specific proctors!
      if (unverifiedToNotify.length > 0) {
        const proctorsToNotify = new Set(unverifiedToNotify.map(a => a.proctor));
        proctorsToNotify.forEach(pName => {
           const proctorProfile = allProfiles.find(p => p.full_name === pName || p.name === pName);
           if (proctorProfile && onNotify) {
             onNotify(null, null, proctorProfile.id, 'Proctor Assignment Request', 'You have been assigned to an exam slot without logged availability. Please Accept or Decline on your dashboard.', 'urgent');
           }
        });
      }
      
      showToast("Schedule locked and saved globally!", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to save schedule!", "error");
    } finally {
      setIsProcessing(false); // Unlock the buttons when done
    }
  };

  const renderStatusBadge = (status) => {
    switch(status) {
      case 'ACTIVE':
        return <span className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg animate-pulse"><Play size={10} fill="white"/> ACTIVE</span>;
      case 'DONE':
        return <span className="flex items-center gap-2 bg-slate-800 text-slate-400 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-700"><CheckCircle2 size={10}/> DONE</span>;
      default:
        return <span className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-200"><ShieldCheck size={10}/> COMMITTED</span>;
    }
  };

  return (
    <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden mb-16 transition-all hover:shadow-blue-500/5 relative">
      {/* TOAST NOTIFICATION SYSTEM */}
      {toast && (
        <div className={`fixed bottom-10 right-10 z-[200] p-6 rounded-2xl shadow-2xl flex items-center gap-4 text-white font-black text-xs uppercase tracking-widest animate-in slide-in-from-right-10 ${toast.type === 'error' ? 'bg-rose-600' : 'bg-slate-900 border border-blue-500/50'}`}>
          {toast.type === 'error' ? <AlertCircle size={20}/> : <CheckCircle2 size={20} className="text-emerald-400"/>}
          <span>{toast.message}</span>
          {toast.undoable && (
            <button onClick={undoLastChange} className="ml-4 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-all flex items-center gap-2">
              <RefreshCw size={14} /> UNDO
            </button>
          )}
          {!toast.undoable && <button onClick={() => setToast(null)}><X size={16} className="opacity-50 hover:opacity-100"/></button>}
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="bg-slate-900 p-10 text-white flex justify-between items-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-emerald-500 to-amber-500"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4">      
            <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none">{deptName}</h2>
            <button onClick={() => onEditDept(deptId, deptName, deptCode)} className="bg-white/10 hover:bg-blue-500 text-white p-2 rounded-xl transition-all shadow-sm" title="Edit Workspace">
              <Edit3 size={20} />
            </button>
            <button onClick={() => { onDeleteDept(deptId, deptCode); showToast("Department Removed."); }} className="bg-rose-500/20 hover:bg-rose-500 text-rose-500 hover:text-white p-2 rounded-xl transition-all">
              <Trash2 size={20} />
            </button>
          </div>
          <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.4em] mt-3 flex items-center gap-2">
            <Settings2 size={12}/> Departmental Workspace Engine
          </p>
        </div>
        <div className="flex gap-4 relative z-10">
          <div className="bg-white/5 backdrop-blur-md px-6 py-3 rounded-[1.5rem] border border-white/10 text-center min-w-[80px]">
            <span className="block text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Proctor</span>
            <span className="text-2xl font-black">{activeDeptProctors.length}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-md px-6 py-3 rounded-[1.5rem] border border-white/10 text-center min-w-[80px]">
            <span className="block text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Rooms</span>
            <span className="text-2xl font-black">{rooms.length}</span>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex bg-slate-50/50 p-3 gap-2 border-b border-slate-100">
        {['subjects', 'proctors', 'rooms', 'generate', 'preview'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all duration-300 ${activeTab === t ? 'bg-white shadow-xl text-blue-600 scale-[1.02] border border-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
            {t} {t === 'preview' && consolidatedPreview.length > 0 && `(${consolidatedPreview.length})`}
          </button>
        ))}
      </div>

     <div className="p-12">
       {/* SUBJECTS TAB */}
        {activeTab === 'subjects' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2">
            
            {/* --- UPGRADED DYNAMIC SUBJECT FORM --- */}
            <div className="flex flex-col gap-6 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Year Level</label>
                  <select className="w-full p-4 rounded-2xl text-xs font-black bg-white border-2 border-slate-100 outline-none focus:border-blue-500 appearance-none" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                    {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year Level {y}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Subject Code</label>
                  <input id={`sC-${deptId}`} placeholder="e.g. CS101" className="w-full p-4 rounded-2xl text-xs font-black bg-white border-2 border-slate-100 outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Description</label>
                  <input id={`sN-${deptId}`} placeholder="Full Name" className="w-full p-4 rounded-2xl text-xs font-black bg-white border-2 border-slate-100 outline-none focus:border-blue-500" />
                </div>
              </div>

              {/* --- NEW: DYNAMIC PROCTOR BOXES --- */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
                 <div className="flex justify-between items-center">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Assigned Professor(s) & Sections</label>
                 </div>
                 
                {tempProfs.map((p, idx) => {
                    const typedName = p.name.trim();
                    let matches = [];
                    // LIVE SEARCH: Use our Smart Engine to find matches as they type
                    if (typedName.length > 1) {
                       matches = globalProctorPool.filter(proc => checkNameMatch(typedName, proc.full_name || proc.name));
                    }

                    return (
                    <div key={idx} className="flex flex-col bg-slate-50 p-4 rounded-3xl border border-slate-100 transition-all hover:shadow-sm">
                       <div className="flex flex-col md:flex-row gap-3 items-center w-full">
                         <input
                           placeholder="Prof Name (e.g. Jane Doe)"
                           value={p.name}
                           onChange={(e) => { const newP = [...tempProfs]; newP[idx].name = e.target.value; setTempProfs(newP); }}
                           className="flex-1 w-full bg-white p-3 rounded-xl text-xs font-black border-2 border-slate-100 outline-none focus:border-blue-500"
                         />
                         <input
                           placeholder="Sections (e.g. A,B) - Leave blank for ALL"
                           value={p.sections}
                           onChange={(e) => { const newP = [...tempProfs]; newP[idx].sections = e.target.value; setTempProfs(newP); }}
                           className="flex-1 w-full bg-white p-3 rounded-xl text-xs font-black border-2 border-slate-100 outline-none focus:border-blue-500 uppercase"
                         />
                         {tempProfs.length > 1 && (
                           <button onClick={() => setTempProfs(tempProfs.filter((_, i) => i !== idx))} className="p-3 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Remove Professor">
                             <Trash2 size={18}/>
                           </button>
                         )}
                       </div>
                       
                       {/* --- NEW: LIVE NAME VALIDATOR UI --- */}
                       {typedName.length > 1 && (
                         <div className="mt-3 px-2 flex items-center">
                            {matches.length === 0 ? (
                               <span className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">
                                 <Info size={12}/> External Teacher (No system account found)
                               </span>
                            ) : matches.length === 1 ? (
                               <span className="text-[9px] font-black text-emerald-600 uppercase flex items-center gap-1">
                                 <CheckCircle2 size={12}/> Identified System Account: {matches[0].full_name || matches[0].name}
                               </span>
                            ) : (
                               <span className="text-[9px] font-black text-rose-500 uppercase flex items-center gap-1">
                                 <AlertTriangle size={12}/> Ambiguous! Matches {matches.length} staff ({matches.map(m=>m.full_name||m.name).join(', ')}). Add an initial!
                               </span>
                            )}
                         </div>
                       )}
                    </div>
                 )})}
                 
                 <button onClick={() => setTempProfs([...tempProfs, { name: '', sections: '' }])} className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-2 mt-2 px-2 hover:text-blue-800 transition-colors w-max">
                    <Plus size={14}/> Add Co-Teacher
                 </button>
              </div>

              <div className="pt-2">
                <button onClick={() => {
                  const c = document.getElementById(`sC-${deptId}`).value;
                  const n = document.getElementById(`sN-${deptId}`).value;
                  
                  const validProfs = tempProfs.filter(p => p.name.trim() !== '');
                  if (validProfs.length === 0) {
                     showToast("Please add at least one professor.", "error");
                     return;
                  }

                  // Background Compiler: Turns the dynamic boxes into the perfect string for the Smart Parser
                  const compiledProfString = validProfs.map(p => {
                     const secs = p.sections.trim();
                     return secs ? `${p.name.trim()} (${secs.toUpperCase()})` : p.name.trim();
                  }).join(', ');

                  if (c && n) {
                    onUpdate('subjects', { ...dept, subjects: { ...subjects, [selectedYear]: [...(subjects[selectedYear] || []), { code: c.toUpperCase(), name: n, prof: compiledProfString }] } });
                    document.getElementById(`sC-${deptId}`).value = '';
                    document.getElementById(`sN-${deptId}`).value = '';
                    setTempProfs([{ name: '', sections: '' }]); // Reset boxes back to 1
                    showToast(`Subject ${c.toUpperCase()} added.`);
                  } else {
                    showToast("Please fill all subject details.", "error");
                  }
                }} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 flex items-center justify-center gap-2 transition-all">
                  <Plus size={16}/> Add Subject to Curriculum
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
              {(subjects[selectedYear] || []).map((s, i) => (
                <div key={i} className="group flex justify-between p-6 bg-white border-2 border-slate-50 rounded-3xl items-center transition-all hover:border-blue-100 hover:shadow-lg">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-50 p-3 rounded-xl text-blue-600 font-black text-xs">{s.code}</div>
                    <div className="flex flex-col">
                      <span className="text-slate-600 font-black text-xs uppercase tracking-tight">{s.name}</span>
                      <span className="text-slate-400 font-bold text-[9px] uppercase tracking-widest flex items-center gap-1 mt-1"><Users size={10}/> Prof. {s.prof}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => {
                        const parsedProfs = parseSubjectProfs(s.prof).map(p => ({ name: p.name, sections: p.sections.join(',') }));
                        if (parsedProfs.length === 0) parsedProfs.push({name: '', sections: ''});
                        setEditSubjectModal({ isOpen: true, originalCode: s.code, year: selectedYear, code: s.code, name: s.name, tempProfs: parsedProfs });
                    }} className="p-2 bg-white border border-slate-100 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors shadow-sm" title="Edit Subject & Teachers">
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => {
                      onUpdate('subjects', { ...dept, subjects: { ...subjects, [selectedYear]: subjects[selectedYear].filter((_, idx) => idx !== i) } });
                      showToast(`Removed ${s.code}`);
                    }} className="p-2 bg-white border border-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition-colors shadow-sm" title="Delete Subject">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROCTORS TAB */}
        {activeTab === 'proctors' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2">
            <div className="bg-emerald-50/50 p-6 rounded-[2.5rem] border border-emerald-100">
               <p className="text-[10px] font-black uppercase text-emerald-600 mb-2">Automated Roster Information</p>
               <p className="text-[9px] text-slate-500 leading-relaxed font-bold">Proctors appear here automatically when they link their account to "{deptCode}". They must manually log availability on their own dashboard to be used in the generator.</p>
            </div>
            
            <div className="grid grid-cols-1 gap-6 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
              {activeDeptProctors.map(p => {
                const logs = globalAvailability.filter(a => a.proctor_id === p.id);
                // --- NEW: Filters out logs that are in the past ---
                const activeLogs = logs.filter(a => !isPast(a.exam_date, a.end_time));

                return (
                  <div key={p.id} className="p-8 border-2 border-slate-50 rounded-[3rem] bg-white hover:border-emerald-100 shadow-sm transition-all group">
                  <div className="flex justify-between items-start mb-6">
                      <div>
                        <p className="font-black text-sm uppercase text-slate-800 flex items-center gap-2">
                          <Users size={16} className="text-emerald-500"/> {p.full_name}
                        </p>
                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest mt-1 block">Account Verified</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <button onClick={() => onEditProctor && onEditProctor(p)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-emerald-100" title="Edit Proctor Details">
                          <Edit3 size={16}/>
                        </button>
                        <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${activeLogs.length > 0 ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                          {activeLogs.length > 0 ? `${activeLogs.length} Slots Available` : 'Waiting for Logs'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {activeLogs.length > 0 ? activeLogs.map((log, idx) => (
                        <div key={idx} className="bg-slate-50/50 p-4 rounded-2xl flex justify-between items-center border border-slate-100 hover:bg-white transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="bg-white p-2 rounded-xl shadow-sm text-emerald-600">
                              <Calendar size={14}/>
                            </div>
                            <span className="text-[11px] font-black text-slate-700 uppercase tracking-tighter">{log.exam_date}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="bg-white p-2 rounded-xl shadow-sm text-emerald-600">
                              <Clock size={14}/>
                            </div>
                            <span className="text-[11px] font-bold text-slate-500">
                              {formatTime(log.start_time)} - {formatTime(log.end_time)}
                            </span>
                          </div>
                        </div>
                      )) : (
                        <div className="py-4 text-center border-2 border-dashed border-slate-50 rounded-2xl">
                          <p className="text-[10px] font-black text-slate-300 uppercase italic tracking-widest">
                            No active hours logged
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

     {/* ROOMS TAB */}
        {activeTab === 'rooms' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2">
            <div className="flex flex-col md:flex-row gap-4 bg-amber-50/50 p-8 rounded-[3rem] border border-amber-100 shadow-inner">
              <input value={roomNum} onChange={e => setRoomNum(e.target.value)} placeholder="ROOM NO. OR HALL" className="flex-[2] p-5 rounded-3xl text-xs font-black border-2 border-amber-50 outline-none focus:border-amber-500" />
              <input value={roomCap} onChange={e => setRoomCap(e.target.value)} placeholder="CAPACITY (e.g. 40-50)" className="flex-1 p-5 rounded-3xl text-xs font-black border-2 border-amber-50 outline-none focus:border-amber-500" />
              <select value={roomType} onChange={e => setRoomType(e.target.value)} className="bg-white px-8 rounded-3xl font-black text-[10px] uppercase outline-none shadow-sm border-2 border-amber-50 appearance-none">
                <option value="Department">Internal Resource</option>
                <option value="Global">Global Pool</option>
              </select>
              <button onClick={() => {
                if (roomNum && roomCap) {
                  onUpdate('rooms', { ...dept, rooms: [...rooms, { id: Date.now(), number: roomNum.toUpperCase(), type: roomType, capacity: roomCap }] });
                  showToast(`Room ${roomNum.toUpperCase()} added.`);
                  setRoomNum("");
                  setRoomCap("");
                } else {
                  showToast("Room number and capacity are required.", "error");
                }
              }} className="bg-amber-600 text-white px-10 py-5 rounded-3xl font-black uppercase text-[10px] shadow-lg active:scale-95">
                Add Room
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {rooms.map(r => (
                <div key={r.id} className="p-8 bg-white border-2 border-slate-50 rounded-[3rem] text-center relative group shadow-sm hover:border-amber-200 transition-all">
                  <span className="font-black text-2xl text-slate-800 tracking-tighter">{r.number}</span>
                  <span className={`block text-[8px] font-black uppercase mt-2 tracking-widest ${r.type === 'Global' ? 'text-blue-500' : 'text-amber-500'}`}>{r.type} Source</span>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase mt-1">Cap: {r.capacity || 'N/A'}</span>
                  
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                    <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" onClick={() => setEditRoomModal({ isOpen: true, id: r.id, number: r.number, type: r.type, capacity: r.capacity || '' })}>
                      <Edit3 size={14}/>
                    </button>
                    <button className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" onClick={() => {
                      onUpdate('rooms', { ...dept, rooms: rooms.filter(item => item.id !== r.id) });
                      showToast(`Room ${r.number} removed.`);
                    }}>
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GENERATE TAB */}
        {activeTab === 'generate' && (
          <div className="space-y-8 animate-in zoom-in-95 duration-300">
            {generationErrors.length > 0 && (
              <div className="bg-rose-50 border-2 border-rose-200 rounded-[2.5rem] p-8">
                <div className="flex items-center gap-4 mb-6 text-rose-600">
                  <AlertCircle size={32} />
                  <div>
                    <h5 className="font-black uppercase tracking-tighter text-xl">Schedule Halted</h5>
                    <p className="text-[9px] font-bold opacity-70 uppercase tracking-widest">Pre-flight Conflict Report</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {generationErrors.map((err, i) => (
                    <div key={i} className="bg-white/60 p-4 rounded-2xl flex justify-between items-center border border-rose-100 shadow-sm">
                      <div>
                        <span className="text-[8px] font-black text-rose-600 uppercase block">Issue</span>
                        <p className="text-xs font-black text-slate-800">{err.issue}</p>
                      </div>
                      <div className="text-right max-w-[60%]">
                        <span className="text-[8px] font-black text-emerald-600 uppercase block">Resolution</span>
                        <p className="text-[10px] font-bold text-slate-600 leading-tight">{err.resolution}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-slate-900 rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16 relative z-10">
                <div className="space-y-10">
                  <h4 className="flex items-center gap-3 text-blue-400 font-black text-[10px] uppercase tracking-[0.4em]">
                    <div className="w-10 h-1 bg-blue-400 rounded-full"/> Timeline Config
                  </h4>
                  <div className="space-y-6">
                    <div className="group">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-4 mb-2 block">Total Exam Days</label>
                      <input type="number" value={examDays || ''} onChange={e => handleExamDayChange(e.target.value)} placeholder="0" className="w-full bg-slate-800/50 p-6 rounded-[2rem] text-3xl font-black text-blue-400 border-2 border-slate-700 focus:border-blue-500 outline-none" />
                    </div>
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-4 custom-scrollbar">
                      {examDates.map((d, i) => (
                        <div key={i} className="flex items-center bg-slate-800 p-4 rounded-2xl border border-slate-700 group hover:border-blue-500/50 transition-all">
                          <span className="text-blue-500 font-black text-[10px] w-14">DAY {String(i+1).padStart(2, '0')}</span>
                          <input type="date" min={todayString} value={d} onChange={e => { const updated = [...examDates]; updated[i] = e.target.value; setExamDates(updated); }} className="w-full bg-transparent text-xs font-black outline-none text-white cursor-pointer" />
                        </div>
                      ))}
                    </div>
                    <div className="group">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-4 mb-2 block">Starting Window</label>
                      <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-slate-800/50 p-5 rounded-2xl font-black text-blue-400 border-2 border-slate-700 outline-none" />
                    </div>
                  </div>
                </div>
                <div className="space-y-10 flex flex-col">
                  <h4 className="flex items-center gap-3 text-emerald-400 font-black text-[10px] uppercase tracking-[0.4em]">
                    <div className="w-10 h-1 bg-emerald-400 rounded-full"/> Logic Parameters
                  </h4>
                  <div className="space-y-4 flex-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase ml-4">Target Year</label>
                        <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="w-full bg-slate-800/50 p-5 rounded-2xl font-black text-xs text-blue-400 border-2 border-slate-700 outline-none appearance-none">
                          {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year Level {y}</option>)}
                        </select>
                      </div>
                     
<div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase ml-4">Total Sections</label>
                        <input type="number" min="0" max="26" value={sectionCount || ''} onChange={e => setSectionCount(parseInt(e.target.value) || 0)} placeholder="0" className="w-full bg-slate-800/50 p-5 rounded-2xl font-black text-emerald-400 border-2 border-slate-700 outline-none focus:border-emerald-500 transition-colors" />
                      </div>
                    </div>
                    
                    {/* --- DYNAMIC SECTION HEADCOUNT BOXES --- */}
                    {sectionCount > 0 && (
                      <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase ml-4">Enrolled Students Per Section</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {Array.from({ length: Math.min(sectionCount, 26) }).map((_, idx) => {
                            const letter = String.fromCharCode(65 + idx);
                            return (
                              <div key={letter} className="flex items-center bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden focus-within:border-emerald-500 transition-colors shadow-inner">
                                <span className="bg-slate-700 text-emerald-400 font-black text-[10px] px-3 py-4 w-10 text-center">{letter}</span>
                                <input 
                                  type="number" 
                                  value={sectionSizes[letter] || ''} 
                                  onChange={e => setSectionSizes({...sectionSizes, [letter]: e.target.value})} 
                                  placeholder="Capacity" 
                                  className="w-full bg-transparent p-3 text-xs font-black text-emerald-400 outline-none" 
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                   <div className="grid grid-cols-1 gap-3 pt-4">
                      <button onClick={toggleProctorSource} className="bg-slate-800 hover:bg-slate-700 p-5 rounded-2xl text-[10px] font-black uppercase flex justify-between items-center border border-slate-700 transition-all group">
                        <span className="flex items-center gap-3">
                          {proctorSource === "Department" ? <Home size={16} className="text-blue-500"/> : <Globe size={16} className="text-blue-500"/>}
                          Staff Source: {proctorSource}
                        </span>
                        <ChevronRight size={14}/>
                      </button>
                      <button onClick={toggleRoomSource} className="bg-slate-800 hover:bg-slate-700 p-5 rounded-2xl text-[10px] font-black uppercase flex justify-between items-center border border-slate-700 transition-all group">
                        <span className="flex items-center gap-3">
                          {roomSource === "Department" ? <Home size={16} className="text-emerald-500"/> : <Globe size={16} className="text-emerald-500"/>}
                          Room Source: {roomSource}
                        </span>
                        <ChevronRight size={14}/>
                      </button>
                      <button
  onClick={() => onClearSchedule(deptCode, selectedYear)}

className="w-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 p-5 rounded-2xl text-[10px] font-black uppercase flex justify-between items-center text-rose-500 transition-all group mt-2"
                      >
                        <span className="flex items-center gap-3"><RefreshCw size={16} /> Wipe Current Year Draft</span>
                        <span className="opacity-40 tracking-widest text-[8px]">RESET</span>
                      </button>
                    </div>
                  </div>
                  <button onClick={handleGenerateClick} className="w-full bg-blue-600 py-10 rounded-[3rem] font-black uppercase tracking-[0.4em] text-xl shadow-lg hover:bg-blue-500 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-4 group">
                    <Play size={32} fill="currentColor" className="group-hover:scale-110 transition-transform"/> Start Calculation
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

       {/* PREVIEW TAB */}
        {activeTab === 'preview' && (
          <div className="space-y-10 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-slate-100 pb-8 px-4 gap-6">
              <div>
                <h3 className="text-4xl font-black uppercase text-slate-900 tracking-tighter flex items-center gap-4">
                  Master <span className="text-blue-600">Draft</span>
                  {auditLog.length > 0 && <span className="text-[10px] bg-slate-900 text-white px-4 py-2 rounded-xl flex items-center gap-2"><Edit3 size={12}/> {auditLog.length - 1} Manual Edits • 0 Conflicts</span>}
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Consolidated View for {deptCode}</p>
              </div>
             <div className="flex gap-3">
                 <button onClick={() => setExportConfig({ isOpen: true, format: 'excel', type: 'ALL', targetValue: '' })} className="flex items-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-200 px-6 py-4 rounded-[1.5rem] font-black text-[10px] uppercase hover:bg-emerald-100 transition-all active:scale-95 shadow-sm">
                    <Download size={16} /> Excel
                 </button>
                 <button onClick={() => setExportConfig({ isOpen: true, format: 'pdf', type: 'ALL', targetValue: '' })} className="flex items-center gap-2 bg-rose-50 text-rose-600 border border-rose-200 px-6 py-4 rounded-[1.5rem] font-black text-[10px] uppercase hover:bg-rose-100 transition-all active:scale-95 shadow-sm">
                    <Download size={16} /> PDF
                 </button>
                 <button onClick={() => setSummaryModalIsOpen(true)} className="flex items-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-[1.5rem] font-black text-[10px] uppercase hover:bg-blue-500 transition-all active:scale-95 shadow-xl ml-2">
                    <Lock size={18} /> Approve & Lock
                 </button>
              </div>
            </div>

            {Object.keys(tablesByYearAndDay).sort().map(year => (
              <div key={year} className="space-y-6">
                <div className="flex justify-between items-center px-4">
                  <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Year Level {year}</h4>
                  <button 
                    onClick={() => onClearSchedule(deptCode, year)}
                    className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 px-4 py-2 rounded-xl transition-all"
                  >
                    <Trash2 size={14}/> Discard Year {year}
                  </button>
                </div>

                {Object.keys(tablesByYearAndDay[year]).sort().map(date => (
                  <div key={date} className="bg-slate-50 border-2 border-slate-100 rounded-[3rem] p-8 mb-8 shadow-sm">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg"><Calendar size={20}/></div>
                      <div>
                        <h5 className="font-black text-slate-900 uppercase tracking-tighter">Exam Day: {date}</h5>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Section Grid Summary</p>
                      </div>
                    </div>
             <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                      {/* Desktop Header (Hidden on Mobile) */}
                      <div className="hidden md:grid grid-cols-[15%_25%_60%] bg-slate-900 text-white">
                        <div className="p-5 text-[9px] font-black uppercase">Section</div>
                        <div className="p-5 text-[9px] font-black uppercase">Room</div>
                        <div className="p-5 text-[9px] font-black uppercase">Subjects & Proctors</div>
                      </div>
                      
                      <div className="flex flex-col">
                        {tablesByYearAndDay[year][date].map((row, idx) => (
                          <div key={idx} className="flex flex-col md:grid md:grid-cols-[15%_25%_60%] border-b border-slate-100 hover:bg-blue-50/50 transition-colors p-4 md:p-0">
                            
                            {/* Mobile Label & Section */}
                            <div className="md:p-5 flex justify-between md:block items-center mb-2 md:mb-0">
                               <span className="md:hidden text-[9px] font-black text-slate-400 uppercase">Section</span>
                               <span className="font-black text-sm md:text-xs text-blue-600">{row.section}</span>
                            </div>
                            
                            {/* Mobile Label & Room */}
                            <div className="md:p-5 flex justify-between md:block items-center mb-4 md:mb-0 pb-4 md:pb-0 border-b md:border-none border-slate-100">
                               <span className="md:hidden text-[9px] font-black text-slate-400 uppercase">Assigned Room</span>
                               <span className="font-black text-[10px] text-slate-800 uppercase italic bg-slate-100 md:bg-transparent px-3 py-1 md:p-0 rounded-lg">{row.room}</span>
                            </div>
                            
                            {/* Subjects List */}
                            <div className="md:p-5">
                              {row.subs.map((s, si) => (
                                <div key={si} className={`mb-2 last:mb-0 flex justify-between items-center bg-slate-50 p-3 md:p-2 rounded-xl ${s.flagged ? 'border border-orange-300 bg-orange-50' : ''}`}>
                                  <div>
                                    <span className="text-[10px] font-black text-slate-900 uppercase mr-2">{s.code}</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase italic leading-none block md:inline mt-1 md:mt-0">{s.slot}</span>
                                  </div>
                                  <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${s.isManualProctor ? 'bg-blue-100 text-blue-700' : 'text-slate-600'}`}>{s.proctor}</span>
                                </div>
                              ))}
                            </div>

                          </div>
                        ))}
                      </div>
                    </div>     
                  </div>
                ))}
              </div>
            ))}

            <div className="grid grid-cols-1 gap-10 mt-16">
              {consolidatedPreview.length > 0 ? consolidatedPreview.map((row, i) => (
                <div key={i} className="bg-white border-2 border-slate-100 rounded-[3rem] overflow-hidden flex flex-col md:flex-row hover:border-blue-300 transition-all hover:shadow-2xl group relative">
                  <div className="absolute top-6 right-10 flex gap-4 z-20 items-center">
                    {renderStatusBadge(row.status)}
                  </div>
                  <div className={`p-10 md:w-80 flex flex-col justify-between text-white border-r-8 transition-all duration-500 ${row.status === 'ACTIVE' ? 'bg-slate-900 border-emerald-500' : 'bg-slate-800 border-blue-600'}`}>
                    <div>
                      <span className="text-blue-400 font-black text-[10px] uppercase tracking-[0.3em]">Year {row.year} Block</span>
                      <h5 className="text-5xl font-black tracking-tighter mt-2">{row.section}</h5>
                    </div>
                    <div className="mt-8 space-y-4">
                      <div className="flex items-center gap-3 text-[11px] font-black uppercase"><Calendar size={16} className="text-blue-400"/> {row.date}</div>
                      <div className="flex items-center gap-3 text-[11px] font-black uppercase"><Clock size={16} className="text-blue-400"/> {formatTime(row.startTime)} - {formatTime(row.endTime)}</div>
                    </div>
                    <div className="mt-10 pt-8 border-t border-white/10 space-y-3">
                      <div onClick={() => setRoomModal({ isOpen: true, targetBlock: { section: row.section, date: row.date, startTime: row.startTime, endTime: row.endTime, dept: deptCode }, pool: 'Draft' })} className="bg-blue-600 hover:bg-blue-500 cursor-pointer px-4 py-3 rounded-xl text-[10px] font-black flex justify-between items-center shadow-md transition-colors">
                        <span>ROOM</span><span className="flex items-center gap-2">{row.room} <Edit3 size={12}/></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 p-10 bg-slate-50/30">
                    <div className="mb-8 flex items-center gap-3">
                      <BookOpen size={20} className="text-blue-600" />
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Scheduled Subjects ({row.subs.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {row.subs.map((s, idx) => (

<div 
  id={`block-${s.code}`}
  className={`bg-white p-6 rounded-3xl border-2 transition-all duration-300 flex flex-col justify-between ${
    highlightTarget === s.code ? 'ring-[4px] ring-rose-500 border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.4)] scale-105 z-10' : 
    s.flagged ? 'border-orange-400 bg-orange-50' : 'border-slate-100 hover:border-blue-100 hover:shadow-md'
  }`}
>
<div className="flex justify-between items-start">
                            <div className="flex-1 mr-2">
                              <select 
                                value={s.code} 
                                onChange={(e) => handleSubjectSwitch(s.id, e.target.value)}
                                className="bg-transparent border-none text-sm font-black text-blue-600 outline-none cursor-pointer appearance-none hover:underline"
                              >
                                {subjects[s.year_level]?.map(sub => (
                                  <option key={sub.code} value={sub.code}>{sub.code}</option>
                                ))}
                              </select>
                              <span className="block text-[9px] font-black text-slate-400 uppercase italic tracking-tighter mt-1">{s.slot}</span>
                            </div>
                            <div className="flex flex-col gap-1 bg-slate-50 p-1 rounded-lg">
                              <button onClick={() => handleMoveSubject(row, idx, -1)} className="text-slate-300 hover:text-blue-600"><ArrowUp size={14}/></button>
                              <button onClick={() => handleMoveSubject(row, idx, 1)} className="text-slate-300 hover:text-blue-600"><ArrowDown size={14}/></button>
                            </div>
                          </div>
                          <p className="text-[11px] font-black text-slate-800 uppercase mt-4 leading-snug">{s.name}</p>
                          <div className={`mt-4 pt-4 border-t flex justify-between items-center ${s.flagged ? 'border-orange-200' : 'border-slate-100'}`}>
                       <button onClick={() => setProctorModal({ isOpen: true, targetSub: { ...s, date: row.date, section: row.section, room: row.room, startTime: row.startTime, endTime: row.endTime }, pool: 'Department' })} className={`text-[9px] font-black uppercase flex items-center gap-1.5 transition-colors ${s.isManualProctor ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}>       <Users size={12}/> <span className="truncate max-w-[80px]">{s.proctor}</span> <Edit3 size={10}/>
                            </button>
                            <button onClick={() => setFlagModal({ isOpen: true, targetId: s.id, note: s.flagNote })} className={`p-1.5 rounded-lg transition-colors ${s.flagged ? 'bg-orange-100 text-orange-600' : 'hover:bg-slate-100 text-slate-300 hover:text-orange-500'}`}>
                              <AlertTriangle size={14}/>
                            </button>
                          </div>
                          {s.flagNote && <div className="mt-3 bg-orange-100 text-orange-800 text-[8px] font-bold p-2 rounded-lg italic break-words">NOTE: {s.flagNote}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-32 bg-slate-50 rounded-[4rem] border-4 border-dashed border-slate-100">
                  <RefreshCw size={48} className="text-slate-200 mx-auto mb-6 animate-spin-slow" />
                  <p className="text-slate-300 font-black uppercase tracking-[0.8em] text-xs">No active draft found</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      {/* EXPORT CONFIG MODAL */}
      {exportConfig.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md p-10 rounded-[3.5rem] shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 flex items-center gap-3">
                  <Download size={24} className={exportConfig.format === 'pdf' ? 'text-rose-500' : 'text-emerald-500'} />
                  Export {exportConfig.format.toUpperCase()}
                </h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Select Data Scope</p>
              </div>
              <button onClick={() => setExportConfig({ ...exportConfig, isOpen: false })} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} className="text-slate-400" /></button>
            </div>

            <div className="space-y-4 mb-8">
              <label className="flex items-center gap-3 p-4 border-2 border-slate-100 rounded-2xl cursor-pointer hover:bg-slate-50">
                <input type="radio" name="exportScope" checked={exportConfig.type === 'ALL'} onChange={() => setExportConfig({ ...exportConfig, type: 'ALL', targetValue: '' })} className="w-4 h-4 accent-blue-600"/>
                <span className="text-xs font-black uppercase text-slate-700">Whole Department (All)</span>
              </label>

              <label className="flex items-center gap-3 p-4 border-2 border-slate-100 rounded-2xl cursor-pointer hover:bg-slate-50">
                <input type="radio" name="exportScope" checked={exportConfig.type === 'YEAR'} onChange={() => setExportConfig({ ...exportConfig, type: 'YEAR', targetValue: [...new Set(localSchedule.map(s => s.year_level))][0] || '' })} className="w-4 h-4 accent-blue-600"/>
                <span className="text-xs font-black uppercase text-slate-700">By Year Level</span>
              </label>
              {exportConfig.type === 'YEAR' && (
                <select className="w-full p-4 ml-8 w-[calc(100%-2rem)] bg-slate-50 rounded-xl text-xs font-bold outline-none" value={exportConfig.targetValue} onChange={e => setExportConfig({ ...exportConfig, targetValue: e.target.value })}>
                  {[...new Set(localSchedule.map(s => s.year_level))].sort().map(y => <option key={y} value={y}>Year Level {y}</option>)}
                </select>
              )}

              <label className="flex items-center gap-3 p-4 border-2 border-slate-100 rounded-2xl cursor-pointer hover:bg-slate-50">
                <input type="radio" name="exportScope" checked={exportConfig.type === 'DATE'} onChange={() => setExportConfig({ ...exportConfig, type: 'DATE', targetValue: [...new Set(localSchedule.map(s => s.exam_date))][0] || '' })} className="w-4 h-4 accent-blue-600"/>
                <span className="text-xs font-black uppercase text-slate-700">By Exam Day</span>
              </label>
              {exportConfig.type === 'DATE' && (
                <select className="w-full p-4 ml-8 w-[calc(100%-2rem)] bg-slate-50 rounded-xl text-xs font-bold outline-none" value={exportConfig.targetValue} onChange={e => setExportConfig({ ...exportConfig, targetValue: e.target.value })}>
                  {[...new Set(localSchedule.map(s => s.exam_date))].sort().map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              )}

              <label className="flex items-center gap-3 p-4 border-2 border-slate-100 rounded-2xl cursor-pointer hover:bg-slate-50">
                <input type="radio" name="exportScope" checked={exportConfig.type === 'SECTION'} onChange={() => setExportConfig({ ...exportConfig, type: 'SECTION', targetValue: [...new Set(localSchedule.map(s => s.section))][0] || '' })} className="w-4 h-4 accent-blue-600"/>
                <span className="text-xs font-black uppercase text-slate-700">By Section Block</span>
              </label>
              {exportConfig.type === 'SECTION' && (
                <select className="w-full p-4 ml-8 w-[calc(100%-2rem)] bg-slate-50 rounded-xl text-xs font-bold outline-none" value={exportConfig.targetValue} onChange={e => setExportConfig({ ...exportConfig, targetValue: e.target.value })}>
                  {[...new Set(localSchedule.map(s => s.section))].sort().map(sec => <option key={sec} value={sec}>Section {sec}</option>)}
                </select>
              )}
            </div>

            <button onClick={executeExport} className={`w-full py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-white shadow-xl hover:-translate-y-1 transition-all ${exportConfig.format === 'pdf' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
              Generate Document
            </button>
          </div>
        </div>
      )}
      
      {flagModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-4 text-orange-500 mb-6">
              <AlertTriangle size={32} />
              <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900">Flag Emergency</h3>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">A replacement proctor will be required before final lock.</p>
            <textarea 
              value={flagModal.note} onChange={(e) => setFlagModal({...flagModal, note: e.target.value})}
              placeholder="e.g. Proctor John Lee - family emergency..."
              className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-orange-500 h-32 resize-none mb-6"
            />
            <div className="flex gap-4">
              <button onClick={() => setFlagModal({ isOpen: false, targetId: null, note: "" })} className="flex-1 p-4 rounded-xl font-black text-[10px] uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={handleFlagSubmit} disabled={!flagModal.note} className="flex-1 p-4 rounded-xl font-black text-[10px] uppercase text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition-colors">Apply Flag</button>
            </div>
          </div>
        </div>
      )}

    {proctorModal.isOpen && proctorModal.targetSub && (() => {
        const t = proctorModal.targetSub;
        
        // --- SMART GLOBAL AUTO-SEARCH ---
        // If they type anything, auto-expand to search the entire Global Pool
        const isSearching = proctorSearchTerm.trim().length > 0;
        const targetProctors = (isSearching || proctorModal.pool === 'Global') ? globalProctorPool : activeDeptProctors;
        
        const filteredList = targetProctors.filter(p => 
          (p.full_name || p.name || "").toLowerCase().includes(proctorSearchTerm.toLowerCase()) && 
          (p.full_name || p.name || "") !== t.proctor
        );

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg p-8 rounded-[3.5rem] shadow-2xl border border-slate-100">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Switch Proctor</h3>
                  <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-1 italic">
                    Target: {t.section} | {t.subject_code || 'Manual Entry'}
                  </p>
                </div>
                <button onClick={() => { setProctorSearchTerm(""); setProctorModal({ isOpen: false, targetSub: null, pool: 'Department' }); }} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="relative mb-4">
                <input autoFocus type="text" placeholder="Search Proctor Name or Type New..." value={proctorSearchTerm} onChange={(e) => setProctorSearchTerm(e.target.value)} className="w-full p-5 pl-12 rounded-3xl text-xs font-black border-2 border-slate-100 focus:border-blue-500 outline-none transition-all" />
                <Users className="absolute left-5 top-5 text-slate-400" size={16} />
              </div>
              
              {/* --- NEW POOL TOGGLE UI --- */}
              <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                <button onClick={() => { setProctorSearchTerm(""); setProctorModal({...proctorModal, pool: 'Department'}) }} className={`flex-1 py-3 text-[9px] font-black uppercase rounded-lg transition-all ${!isSearching && proctorModal.pool === 'Department' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>Internal Dept</button>
                <button onClick={() => setProctorModal({...proctorModal, pool: 'Global'})} className={`flex-1 py-3 text-[9px] font-black uppercase rounded-lg transition-all ${isSearching || proctorModal.pool === 'Global' ? 'bg-white shadow text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}>Global System</button>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {proctorSearchTerm.trim().length > 0 && !filteredList.some(p => (p.full_name || p.name || "").toLowerCase() === proctorSearchTerm.trim().toLowerCase()) && (
                  <div className="p-4 rounded-3xl border-2 border-dashed border-blue-300 bg-blue-50/50">
                    <div className="flex justify-between items-center mb-3 px-1">
                      <div className="flex flex-col">
                        <span className="font-black text-xs text-blue-800 uppercase">{proctorSearchTerm.trim()}</span>
                        <div className="flex items-center gap-1 mt-1 text-blue-500">
                          <Info size={10} />
                          <span className="text-[7px] font-black uppercase tracking-widest">
                            External / Manual Entry
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleProctorSwitch(proctorSearchTerm.trim(), 'subject')} className="flex-1 py-3 rounded-xl bg-white border border-blue-200 text-[8px] font-black uppercase text-blue-600 hover:bg-blue-600 hover:text-white transition-colors">Subject Only</button>
                      <button onClick={() => handleProctorSwitch(proctorSearchTerm.trim(), 'session')} className="flex-1 py-3 rounded-xl bg-blue-600 text-[8px] font-black uppercase text-white shadow-sm hover:bg-blue-700 transition-all">Whole Session</button>
                    </div>
                  </div>
                )}

               {filteredList.map((p, idx) => {
                  const pName = p.full_name || p.name;
                  const pArr = normalizeNameToArray(pName); // <-- UPGRADED!
                  
                // NEW: Checks the entire year level curriculum for the ban!
                  const yearSubs = subjects[t.year_level] || [];
                  const isTeacherForSection = yearSubs.some(sub => {
                     const profList = parseSubjectProfs(sub.prof);
                     const sectionLetter = t.section.slice(-1);
                     return profList.some(profObj => {
                         const appliesToThisSection = profObj.sections.length === 0 || profObj.sections.includes(sectionLetter);
                         // --- UPGRADED: Now uses the Smart Prefix Engine! ---
                         const nameMatch = checkNameMatch(profObj.name, pName);
                         return appliesToThisSection && nameMatch;
                     });
                  });

                  const hasLoggedAvailability = globalAvailability?.some(entry => {
                    const safeLogStart = entry.start_time.substring(0, 5);
                    const safeLogEnd = entry.end_time.substring(0, 5);
                    const subStart = t.start_time || t.startTime;
                    const subEnd = t.end_time || t.endTime;
                    return entry.proctor_id === p.id && entry.exam_date === (t.date || t.exam_date) && (subStart >= safeLogStart && subEnd <= safeLogEnd);
                  });

                  return (
                    <div key={idx} className={`p-4 rounded-3xl border-2 transition-all ${
                      isTeacherForSection ? 'border-rose-100 bg-rose-50/30' :
                      hasLoggedAvailability ? 'border-slate-50 bg-white hover:border-blue-100' : 'border-slate-100 bg-slate-50/50 opacity-80'
                    }`}>
                      <div className="flex justify-between items-center mb-3 px-1">
                        <div className="flex flex-col">
                          {/* Removed the line-through so the name is readable */}
                          <span className={`font-black text-xs uppercase flex items-center gap-2 ${isTeacherForSection ? 'text-rose-600' : 'text-slate-800'}`}>
                            {pName}
                            {p.assigned_dept && p.assigned_dept !== deptCode && (
                               <span className="text-[8px] font-black tracking-widest text-amber-600 bg-amber-100 px-2 py-0.5 rounded-md">
                                 {p.assigned_dept}
                               </span>
                            )}
                          </span>
                          <div className={`flex items-center gap-1 mt-1 ${isTeacherForSection ? 'text-rose-500' : hasLoggedAvailability ? 'text-emerald-500' : 'text-slate-400'}`}>
                            {isTeacherForSection ? <AlertTriangle size={10} /> : <ShieldCheck size={10} />}
                            <span className="text-[7px] font-black uppercase tracking-widest">
                              {isTeacherForSection ? "Conflict: Subject Teacher (Override Allowed)" : hasLoggedAvailability ? "Verified Availability" : "No Logged Time"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {/* REMOVED disabled={isTeacherForBlock} so admins can force the assignment! */}
                       <button onClick={() => confirmProctorSwitch(pName, 'subject')} className="flex-1 py-3 rounded-xl bg-slate-100 text-[8px] font-black uppercase text-slate-600 hover:text-blue-600 transition-colors">Subject Only</button>
                        <button onClick={() => confirmProctorSwitch(pName, 'session')} className={`flex-1 py-3 rounded-xl text-[8px] font-black uppercase text-white shadow-sm transition-all ${hasLoggedAvailability && !isTeacherForSection ? 'bg-blue-600 hover:bg-blue-700' : isTeacherForSection ? 'bg-rose-500 hover:bg-rose-600' : 'bg-slate-900 hover:bg-slate-800'}`}>Whole Session</button>
                      </div>
                    </div>
                  );
       
            
                })}                 
              </div>
            </div>
          </div>
        );
      })()}

      {roomModal.isOpen && roomModal.targetBlock && (() => {
        const tb = roomModal.targetBlock;
        let targetRooms = [];
        if (roomModal.pool === 'Department') targetRooms = rooms.map(r => r.number);
        else if (roomModal.pool === 'Global') targetRooms = [...new Set(globalSchedule.map(r => r.room))];
        else if (roomModal.pool === 'Draft') targetRooms = [...new Set(localSchedule.map(s => s.room))];

        const availableList = targetRooms.filter(rNum => 
          !globalSchedule.some(gs => gs.room === rNum && gs.exam_date === tb.date && (tb.startTime < gs.end_time && tb.endTime > gs.start_time) && gs.dept_code !== deptCode)
        );

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md p-8 rounded-[3rem] shadow-2xl animate-in zoom-in-95">
              <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-2">Switch Block Room</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 border-b-2 border-slate-50 pb-6 flex items-center gap-2"><Home size={12}/> Section {tb.section} • {formatTime(tb.startTime)} - {formatTime(tb.endTime)}</p>
              <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                <button onClick={() => setRoomModal({...roomModal, pool: 'Draft'})} className={`flex-1 py-3 text-[9px] font-black uppercase rounded-lg transition-all ${roomModal.pool === 'Draft' ? 'bg-white shadow text-emerald-600' : 'text-slate-400'}`}>Active Draft</button>
                <button onClick={() => setRoomModal({...roomModal, pool: 'Department'})} className={`flex-1 py-3 text-[9px] font-black uppercase rounded-lg transition-all ${roomModal.pool === 'Department' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>Internal</button>
                <button onClick={() => setRoomModal({...roomModal, pool: 'Global'})} className={`flex-1 py-3 text-[9px] font-black uppercase rounded-lg transition-all ${roomModal.pool === 'Global' ? 'bg-white shadow text-amber-600' : 'text-slate-400'}`}>Global</button>
              </div>
              <div className="grid grid-cols-3 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {availableList.length === 0 && <p className="col-span-3 text-center text-[10px] font-bold text-slate-400 py-8 uppercase">No rooms available in this pool.</p>}
                {availableList.map((rNum, idx) => (
                  <div key={idx} onClick={() => confirmRoomSwitch(rNum)} className={`text-center p-4 rounded-2xl border-2 transition-all font-black text-lg cursor-pointer ${rNum === tb.room ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-50 hover:border-blue-500 hover:bg-slate-50 text-slate-800'}`}>{rNum}</div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t-2 border-slate-50">
                <button onClick={() => setRoomModal({ isOpen: false, targetBlock: null })} className="w-full p-4 rounded-2xl font-black text-[10px] uppercase text-slate-500 hover:bg-slate-50 transition-colors">Cancel Override</button>
              </div>
            </div>
          </div>
        );
      })()}

      {summaryModalIsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl p-12 rounded-[3.5rem] shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-4 text-emerald-500 mb-2">
              <Lock size={32} />
              <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Approve & Lock Schedule</h3>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-8">Pre-flight Validation & Audit Summary</p>
            <div className="bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 mb-8">
              <div className="flex items-center gap-3 text-[10px] font-black uppercase text-emerald-600 mb-4 pb-4 border-b border-slate-200">
                <CheckCircle2 size={16}/> Global Validation Passed - 0 Conflicts Detected
              </div>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {auditLog.length === 0 ? <p className="text-[10px] text-slate-400 font-bold uppercase italic">No manual overrides were applied.</p> : auditLog.map((log, idx) => (
                  <div key={idx} className="text-[10px] font-bold text-slate-700 bg-white p-3 rounded-xl border border-slate-100 flex items-start gap-2"><Info size={12} className="text-blue-500 mt-0.5 shrink-0"/> {log}</div>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setSummaryModalIsOpen(false)} className="flex-1 p-5 rounded-2xl font-black text-[10px] uppercase text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Back to Editing</button>
<button onClick={handleApproveAndLock} disabled={isProcessing} className="flex-1 p-5 rounded-2xl font-black text-[10px] uppercase text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 shadow-lg transition-colors">
  {isProcessing ? 'Processing...' : 'I Confirm - Lock Schedule'}
</button>
            </div>
          </div>
        </div>
      )}
      {unverifiedModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
          <div className="bg-white w-full max-w-lg p-10 rounded-[3.5rem] shadow-2xl">
            <div className="flex items-center gap-4 text-amber-500 mb-6">
              <Users size={32} />
              <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Reliever Override</h3>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 leading-relaxed">
              {unverifiedModal.assignments.length} assignments involve proctors who have not logged availability for their assigned times.
            </p>
            <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-4 mb-8">
               <p className="text-amber-800 text-xs font-bold leading-relaxed">
                 Proceeding will lock the schedule and automatically send a <strong className="font-black">Reliever Request</strong> to these proctors, asking them to Accept or Decline the assignment.
               </p>
            </div>
            
            {/* Optional Reason for the Audit Log */}
            <input
              type="text"
              placeholder="Admin Override Reason (Optional)"
              value={unverifiedModal.reason}
              onChange={e => setUnverifiedModal({...unverifiedModal, reason: e.target.value})}
              className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-amber-500 mb-8 transition-all"
            />
            
            <div className="flex gap-4">
              <button onClick={() => setUnverifiedModal({ isOpen: false, assignments: [], reason: '' })} className="flex-1 p-4 rounded-xl font-black text-[10px] uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
<button onClick={() => { executeSave(unverifiedModal.reason, unverifiedModal.assignments); }} className="flex-1 p-4 rounded-xl font-black text-[10px] uppercase text-white bg-amber-500 hover:bg-amber-600 shadow-lg transition-colors">Send Requests & Lock</button>
            </div>
          </div>
        </div>
      )}
     
    {/* --- NEW: PROCTOR WARNING & OVERRIDE MODAL --- */}
      {proctorWarningModal.isOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
          <div className="bg-white w-full max-w-lg p-10 rounded-[3.5rem] shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-4 text-amber-500 mb-6">
              <AlertTriangle size={32} />
              <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Proctor Shortage</h3>
            </div>
            
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 leading-relaxed">
              All eligible <strong className="text-slate-800">{proctorWarningModal.source}</strong> proctors are exhausted for <strong className="text-slate-800">Section {proctorWarningModal.sectionID}</strong> on <strong className="text-slate-800">{proctorWarningModal.dayDate}</strong>.
            </p>
            
            <div className="space-y-4">
               {proctorWarningModal.hasFallback && (
                  <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl">
                     <p className="text-[10px] font-black text-blue-800 uppercase mb-2">Cross-Pool Assignment Available</p>
                     <p className="text-[9px] font-bold text-blue-600 mb-3">There are available proctors in the {proctorWarningModal.fallbackPoolName}. Do you want to pull from there?</p>
                     <button onClick={() => {
                        proctorWarningModal.resolve({ type: 'fallback' });
                        setProctorWarningModal({ ...proctorWarningModal, isOpen: false });
                     }} className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase shadow-sm hover:bg-blue-500 transition-all">Use {proctorWarningModal.fallbackPoolName}</button>
                  </div>
               )}

               <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl">
                  <p className="text-[10px] font-black text-amber-800 uppercase mb-2">Manual / Guest Assignment</p>
                  <p className="text-[9px] font-bold text-amber-600 mb-3">Type any name. If they are a verified system user, they will receive a Reliever Request to accept/decline.</p>
                  <div className="flex gap-2">
                     <input value={manualProctorInput} onChange={e => setManualProctorInput(e.target.value)} placeholder="Type name..." className="flex-1 bg-white border border-amber-100 p-3 rounded-xl text-xs font-black outline-none focus:border-amber-500" />
                     <button onClick={() => {
                        if(manualProctorInput.trim()) {
                           proctorWarningModal.resolve({ type: 'manual', name: manualProctorInput.trim() });
                           setManualProctorInput("");
                           setProctorWarningModal({ ...proctorWarningModal, isOpen: false });
                        }
                     }} className="bg-amber-500 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase shadow-sm hover:bg-amber-600 transition-all">Force Assign</button>
                  </div>
               </div>

               {proctorWarningModal.teachers.length > 0 && (
                  <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl">
                     <p className="text-[10px] font-black text-rose-800 uppercase mb-2">Subject Teacher Conflict Override</p>
                     <p className="text-[9px] font-bold text-rose-600 mb-3">The following teachers are available but are teaching subjects in this block.</p>
                     <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                       {proctorWarningModal.teachers.map((t, idx) => (
                          <div key={idx} onClick={() => {
                             proctorWarningModal.resolve({ type: 'teacher', proctor: t });
                             setProctorWarningModal({ ...proctorWarningModal, isOpen: false });
                          }} className="p-3 bg-white border border-rose-100 rounded-xl hover:border-rose-400 cursor-pointer flex justify-between items-center group transition-all">
                             <span className="font-black text-[10px] uppercase text-slate-800 group-hover:text-rose-600">{t.full_name || t.name}</span>
                             <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded text-[8px] font-black uppercase group-hover:bg-rose-500 group-hover:text-white transition-all">Override</span>
                          </div>
                       ))}
                     </div>
                  </div>
               )}
            </div>
            
            <button onClick={() => {
               proctorWarningModal.resolve({ type: 'halt' });
               setProctorWarningModal({ ...proctorWarningModal, isOpen: false });
            }} className="w-full mt-6 p-4 rounded-2xl font-black text-[10px] uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">
              Halt Generation
            </button>
          </div>
        </div>
      )}

      {/* --- NEW: ROOM CAPACITY WARNING MODAL --- */}
      {roomWarningModal.isOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
          <div className="bg-white w-full max-w-lg p-10 rounded-[3.5rem] shadow-2xl">
            <div className="flex items-center gap-4 text-amber-500 mb-6">
              <AlertTriangle size={32} />
              <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Capacity Conflict</h3>
            </div>
            
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 leading-relaxed">
              <strong className="text-slate-800">Section {roomWarningModal.sectionID}</strong> has <strong className="text-rose-500">{roomWarningModal.targetHeadcount} students</strong>, but the next room in alphanumeric sequence (<strong className="text-slate-800">Room {roomWarningModal.nextRoom?.number}</strong>) only holds <strong className="text-rose-500">{roomWarningModal.nextCap}</strong>.
            </p>

            <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-4 mb-6 shadow-inner">
               <p className="text-amber-800 text-[10px] font-bold leading-relaxed uppercase tracking-widest">
                 {roomWarningModal.fitsAnywhere 
                   ? `Room ${roomWarningModal.fallbackRoom?.number} can hold ${roomWarningModal.fallbackCap} students. Do you want to skip sequence and use this room, or force them into Room ${roomWarningModal.nextRoom?.number}?`
                   : `No available rooms can hold ${roomWarningModal.targetHeadcount} students. The largest available is Room ${roomWarningModal.fallbackRoom?.number} (${roomWarningModal.fallbackCap} cap). Do you want to force them into a smaller room or halt generation?`
                 }
               </p>
            </div>
            
            <div className="flex flex-col gap-3">
              {roomWarningModal.fitsAnywhere && (
                <button onClick={() => {
                   roomWarningModal.resolve('skip');
                   setRoomWarningModal({ ...roomWarningModal, isOpen: false });
                }} className="w-full bg-emerald-100 text-emerald-600 px-4 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-500 hover:text-white transition-all shadow-sm">
                  Skip to Room {roomWarningModal.fallbackRoom?.number} (Meets Capacity)
                </button>
              )}
              <button onClick={() => {
                 roomWarningModal.resolve('force');
                 setRoomWarningModal({ ...roomWarningModal, isOpen: false });
              }} className="w-full bg-amber-100 text-amber-600 px-4 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-amber-500 hover:text-white transition-all shadow-sm">
                 Force into Room {roomWarningModal.nextRoom?.number} (Ignore Limit)
              </button>
              <button onClick={() => {
                 roomWarningModal.resolve('halt');
                 setRoomWarningModal({ ...roomWarningModal, isOpen: false });
              }} className="w-full px-4 py-3 rounded-xl text-[10px] font-black uppercase text-slate-500 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-sm">
                 Halt Generation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT ROOM MODAL --- */}
      {editRoomModal.isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
          <div className="bg-white w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl">
            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 mb-6 flex items-center gap-3"><DoorOpen className="text-amber-500"/> Edit Room</h3>
           <div className="space-y-4 mb-6">
              <input value={editRoomModal.number} onChange={e => setEditRoomModal({...editRoomModal, number: e.target.value})} placeholder="Room Number" className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-amber-500 transition-all uppercase" />
              <input value={editRoomModal.capacity || ''} onChange={e => setEditRoomModal({...editRoomModal, capacity: e.target.value})} placeholder="Capacity (e.g. 40-50)" className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-amber-500 transition-all" />
              <select value={editRoomModal.type} onChange={e => setEditRoomModal({...editRoomModal, type: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-xs border-2 border-slate-100 outline-none focus:border-amber-500 transition-all cursor-pointer appearance-none uppercase">
                <option value="Department">Internal Resource</option>
                <option value="Global">Global Pool</option>
              </select>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setEditRoomModal({ isOpen: false, id: null, number: '', type: 'Department', capacity: '' })} className="flex-1 p-4 rounded-xl font-black text-[10px] uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={() => {
                 if (editRoomModal.number && editRoomModal.capacity) {
                    const updatedRooms = rooms.map(r => r.id === editRoomModal.id ? { ...r, number: editRoomModal.number.toUpperCase(), type: editRoomModal.type, capacity: editRoomModal.capacity } : r);
                    onUpdate('rooms', { ...dept, rooms: updatedRooms });
                    showToast(`Room updated successfully.`);
                    setEditRoomModal({ isOpen: false, id: null, number: '', type: 'Department', capacity: '' });
                 } else {
                    showToast(`Room number and capacity required.`, "error");
                 }
              }} className="flex-[2] p-4 rounded-xl font-black text-[10px] uppercase text-white bg-amber-500 hover:bg-amber-600 shadow-lg transition-colors">Save Changes</button> 
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT SUBJECT MODAL --- */}
      {editSubjectModal.isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
          <div className="bg-white w-full max-w-xl p-8 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 mb-2 flex items-center gap-3"><BookOpen className="text-blue-600"/> Edit Subject (Year {editSubjectModal.year})</h3>
            
            <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 mb-6 space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Subject Code</label>
                    <input value={editSubjectModal.code} onChange={e => setEditSubjectModal({...editSubjectModal, code: e.target.value})} placeholder="e.g. CS101" className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 transition-all uppercase" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Description</label>
                    <input value={editSubjectModal.name} onChange={e => setEditSubjectModal({...editSubjectModal, name: e.target.value})} placeholder="Full Name" className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 transition-all" />
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Assigned Professor(s) & Sections</label>
                 {editSubjectModal.tempProfs.map((p, idx) => {
                      const typedName = p.name.trim();
                      let matches = [];
                      // LIVE SEARCH: Use our Smart Engine to find matches as they type
                      if (typedName.length > 1) {
                         matches = globalProctorPool.filter(proc => checkNameMatch(typedName, proc.full_name || proc.name));
                      }

                      return (
                      <div key={idx} className="flex flex-col bg-white p-4 rounded-3xl border border-slate-100 transition-all hover:shadow-sm">
                         <div className="flex flex-col md:flex-row gap-3 items-center w-full">
                           <input
                             placeholder="Prof Name (e.g. Jane Doe)"
                             value={p.name}
                             onChange={(e) => { const newP = [...editSubjectModal.tempProfs]; newP[idx].name = e.target.value; setEditSubjectModal({...editSubjectModal, tempProfs: newP}); }}
                             className="flex-1 w-full bg-slate-50 p-3 rounded-xl text-xs font-black border-2 border-slate-100 outline-none focus:border-blue-500"
                           />
                           <input
                             placeholder="Sections (e.g. A,B) - Leave blank for ALL"
                             value={p.sections}
                             onChange={(e) => { const newP = [...editSubjectModal.tempProfs]; newP[idx].sections = e.target.value; setEditSubjectModal({...editSubjectModal, tempProfs: newP}); }}
                             className="flex-1 w-full bg-slate-50 p-3 rounded-xl text-xs font-black border-2 border-slate-100 outline-none focus:border-blue-500 uppercase"
                           />
                           {editSubjectModal.tempProfs.length > 1 && (
                             <button onClick={() => setEditSubjectModal({...editSubjectModal, tempProfs: editSubjectModal.tempProfs.filter((_, i) => i !== idx)})} className="p-3 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Remove Professor">
                               <Trash2 size={18}/>
                             </button>
                           )}
                         </div>
                         
                         {/* --- NEW: LIVE NAME VALIDATOR UI FOR EDIT MODAL --- */}
                         {typedName.length > 1 && (
                           <div className="mt-3 px-2 flex items-center">
                              {matches.length === 0 ? (
                                 <span className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">
                                   <Info size={12}/> External Teacher (No system account found)
                                 </span>
                              ) : matches.length === 1 ? (
                                 <span className="text-[9px] font-black text-emerald-600 uppercase flex items-center gap-1">
                                   <CheckCircle2 size={12}/> Identified System Account: {matches[0].full_name || matches[0].name}
                                 </span>
                              ) : (
                                 <span className="text-[9px] font-black text-rose-500 uppercase flex items-center gap-1">
                                   <AlertTriangle size={12}/> Ambiguous! Matches {matches.length} staff ({matches.map(m=>m.full_name||m.name).join(', ')}). Add an initial!
                                 </span>
                              )}
                           </div>
                         )}
                      </div>
                  )})}
                  <button onClick={() => setEditSubjectModal({...editSubjectModal, tempProfs: [...editSubjectModal.tempProfs, { name: '', sections: '' }]})} className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-2 mt-2 px-2 hover:text-blue-800 transition-colors w-max">
                      <Plus size={14}/> Add Co-Teacher
                  </button>
                </div>
            </div>

            <div className="flex gap-4 pt-4 border-t-2 border-slate-50">
              <button onClick={() => setEditSubjectModal({ isOpen: false, originalCode: '', year: '', code: '', name: '', tempProfs: [] })} className="flex-1 p-4 rounded-xl font-black text-[10px] uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={() => {
                  const validProfs = editSubjectModal.tempProfs.filter(p => p.name.trim() !== '');
                  if (validProfs.length === 0) return showToast("Add at least one professor.", "error");
                  if (!editSubjectModal.code || !editSubjectModal.name) return showToast("Fill all details.", "error");

                  const compiledProfString = validProfs.map(p => p.sections.trim() ? `${p.name.trim()} (${p.sections.trim().toUpperCase()})` : p.name.trim()).join(', ');
                  const yearSubs = [...(subjects[editSubjectModal.year] || [])];
                  const subIndex = yearSubs.findIndex(s => s.code === editSubjectModal.originalCode);
                  
                  if (subIndex !== -1) {
                      yearSubs[subIndex] = { code: editSubjectModal.code.toUpperCase(), name: editSubjectModal.name, prof: compiledProfString };
                      onUpdate('subjects', { ...dept, subjects: { ...subjects, [editSubjectModal.year]: yearSubs } });
                      showToast(`Subject updated successfully.`);
                      setEditSubjectModal({ isOpen: false, originalCode: '', year: '', code: '', name: '', tempProfs: [] });
                  }
              }} className="flex-[2] p-4 rounded-xl font-black text-[10px] uppercase text-white bg-blue-600 hover:bg-blue-500 shadow-lg transition-colors">Save Subject</button>
            </div>
          </div>
        </div>
      )}
      {/* --- NEW: DECISION ENGINE MODAL --- */}
      {decisionModal.isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
          <div className="bg-white w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl text-center">
            <Info className={`mx-auto mb-6 ${decisionModal.type === 'amber' ? 'text-amber-500' : 'text-blue-500'}`} size={48} />
            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-2">{decisionModal.title}</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-8 leading-relaxed">{decisionModal.message}</p>
            <div className="flex gap-4">
              <button onClick={() => setDecisionModal({ isOpen: false, title: '', message: '', type: 'info', action: null })} className="flex-1 p-4 rounded-xl font-black text-[10px] uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={decisionModal.action} className={`flex-1 p-4 rounded-xl font-black text-[10px] uppercase text-white shadow-lg transition-colors ${decisionModal.type === 'amber' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-500'}`}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentCard;
