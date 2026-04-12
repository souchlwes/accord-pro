import moment from 'moment';

export const validateAndSchedule = (groups, resources) => {
  let masterTimeline = []; // Global set of all occupied (Room, Proctor, Time)
  let failedGroups = [];

  // 1. Sort by Block Size (Greedy Heuristic)
  const sortedGroups = groups.sort((a, b) => b.subjects.length - a.subjects.length);

  for (let group of sortedGroups) {
    let assigned = false;
    
    // 2. Scan Time Slots (30-min increments)
    for (let time = windowStart; time < windowEnd; time += 30) {
      const blockEnd = calculateEnd(time, group.subjects.length);
      
      // 3. Find Room (Dept Preferred -> Global Fallback)
      const room = findAvailableRoom(resources.rooms, time, blockEnd, masterTimeline);
      
      // 4. Find Proctor (Check Availability Window + Conflict)
      const proctor = findAvailableProctor(resources.proctors, time, blockEnd, masterTimeline);

      if (room && proctor) {
        const newEntry = { group, room, proctor, start: time, end: blockEnd };
        masterTimeline.push(newEntry);
        assigned = true;
        break; 
      }
    }

    if (!assigned) failedGroups.push(group);
  }

  return { success: failedGroups.length === 0, schedule: masterTimeline, errors: failedGroups };
};