const db = require('../config/db');
const moment = require('moment');

class ExamScheduler {
    /**
     * @param {number} deptId - The ID of the department
     * @param {Array} examDates - Array of dates ['YYYY-MM-DD', ...]
     * @param {string} windowStart - User-defined start (e.g., "00:00")
     * @param {string} windowEnd - User-defined end (e.g., "23:59")
     */
    constructor(deptId, examDates, windowStart, windowEnd) {
        this.deptId = deptId;
        this.examDates = examDates;
        this.windowStart = windowStart;
        this.windowEnd = windowEnd;
        this.generatedSchedule = [];
    }

    async generate() {
        // 1. FETCH RESOURCES
        // Get subjects with their individual durations from the DB
        const [subjects] = await db.execute(
            'SELECT id, subject_code, subject_name, year_level, duration_mins FROM subjects WHERE dept_id = ? ORDER BY year_level ASC', 
            [this.deptId]
        );
        
        const [rooms] = await db.execute('SELECT id, room_number FROM global_room_pool');
        const [proctors] = await db.execute('SELECT * FROM global_proctor_pool');

        // 2. YEAR-BASED INDEPENDENT TRACKING
        // We initialize a "Next Available Time" pointer for each year level
        const yearPointers = {
            1: moment(`${this.examDates[0]} ${this.windowStart}`, "YYYY-MM-DD HH:mm"),
            2: moment(`${this.examDates[0]} ${this.windowStart}`, "YYYY-MM-DD HH:mm"),
            3: moment(`${this.examDates[0]} ${this.windowStart}`, "YYYY-MM-DD HH:mm"),
            4: moment(`${this.examDates[0]} ${this.windowStart}`, "YYYY-MM-DD HH:mm"),
            5: moment(`${this.examDates[0]} ${this.windowStart}`, "YYYY-MM-DD HH:mm")
        };

        // 3. THE INDEPENDENT SCHEDULING LOGIC
        // We loop through year levels separately so they don't have to start at the same time
        for (let y = 1; y <= 5; y++) {
            const yearSubjects = subjects.filter(s => s.year_level === y);
            let dayIdx = 0;

            for (const subject of yearSubjects) {
                let scheduled = false;

                while (!scheduled && dayIdx < this.examDates.length) {
                    const currentDate = this.examDates[dayIdx];
                    const duration = subject.duration_mins || 90; // Fallback to 90 if null
                    const startTime = yearPointers[y].clone();
                    const endTime = startTime.clone().add(duration, 'minutes');
                    const dayLimit = moment(`${currentDate} ${this.windowEnd}`, "YYYY-MM-DD HH:mm");

                    // Check if this specific exam exceeds the user-defined day window
                    if (endTime.isAfter(dayLimit)) {
                        dayIdx++; // Move this Year Level to the next available exam day
                        if (dayIdx < this.examDates.length) {
                            yearPointers[y] = moment(`${this.examDates[dayIdx]} ${this.windowStart}`, "YYYY-MM-DD HH:mm");
                        }
                        continue; 
                    }

                    // RESOURCE CHECK: Find Room and Proctor free for this specific time window
                    const room = rooms.find(r => !this.isBusy('room', r.id, currentDate, startTime, endTime));
                    
                    const proctor = proctors.find(p => 
                        p.avail_date === currentDate &&
                        moment(p.start_time, "HH:mm").isSameOrBefore(startTime) &&
                        moment(p.end_time, "HH:mm").isSameOrAfter(endTime) &&
                        !this.isBusy('proctor', p.proctor_id, currentDate, startTime, endTime)
                    );

                    if (room && proctor) {
                        this.generatedSchedule.push({
                            subject_code: subject.subject_code,
                            subject_name: subject.subject_name,
                            year_level: y,
                            date: currentDate,
                            start: startTime.format("HH:mm"),
                            end: endTime.format("HH:mm"),
                            room_number: room.room_number,
                            room_id: room.id,
                            proctor_name: proctor.name,
                            proctor_id: proctor.proctor_id
                        });

                        // BACK-TO-BACK: The next exam for this year starts exactly when this one ends
                        yearPointers[y] = endTime.clone();
                        scheduled = true;
                    } else {
                        // If room/proctor is busy, shift the pointer by 15 mins to find the next gap
                        yearPointers[y].add(15, 'minutes');
                    }
                }
            }
        }

        return this.generatedSchedule;
    }

    /**
     * Standard Overlap Logic: (StartA < EndB) AND (EndA > StartB)
     */
    isBusy(type, id, date, start, end) {
        return this.generatedSchedule.some(s => {
            const sStart = moment(`${s.date} ${s.start}`, "YYYY-MM-DD HH:mm");
            const sEnd = moment(`${s.date} ${s.end}`, "YYYY-MM-DD HH:mm");
            
            const matchesId = (type === 'room') ? s.room_id === id : s.proctor_id === id;
            const overlaps = start.isBefore(sEnd) && end.isAfter(sStart);

            return s.date === date && matchesId && overlaps;
        });
    }
}

module.exports = ExamScheduler;