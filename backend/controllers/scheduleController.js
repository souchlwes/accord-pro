const db = require('../db'); // Your MySQL connection
const moment = require('moment');

const generateGlobalSchedule = async (req, res) => {
    const { deptId, yearLevel, examDates, startTime, endTime, sectionCount, prefs } = req.body;

    try {
        // 1. PREPARATION: Load all Subjects for this Year Level
        const [subjects] = await db.query(
            "SELECT * FROM subjects WHERE dept_id = ? AND year_level = ? AND status = 'active'",
            [deptId, yearLevel]
        );

        if (subjects.length === 0) return res.status(400).json({ error: "No active subjects found." });

        // 2. SUBJECT SPLITTING (Section 4 Logic: Deterministic & Even)
        // Shuffles subjects and splits them into the number of exam dates provided
        const shuffled = subjects.sort(() => 0.5 - Math.random());
        const daysCount = examDates.length;
        const subjectsPerDay = Math.ceil(shuffled.length / daysCount);
        
        const daySplits = examDates.map((date, i) => ({
            date,
            subjects: shuffled.slice(i * subjectsPerDay, (i + 1) * subjectsPerDay)
        }));

        const finalSchedule = [];

        // 3. GLOBAL ASSIGNMENT LOOP (Section 5: Per Exam Day)
        for (const day of daySplits) {
            const requiredBlockMins = day.subjects.reduce((sum, s) => sum + s.duration_mins, 0);
            
            // Generate Section Labels (A, B, C...)
            const sections = Array.from({ length: sectionCount }, (_, i) => String.fromCharCode(65 + i));

            // Logic: All sections of same Year/Dept must have IDENTICAL time blocks (Anti-Leakage)
            let successfulTimeSlot = null;

            // Scan start times in 30-min increments
            let currentTry = moment(startTime, "HH:mm");
            const endLimit = moment(endTime, "HH:mm");

            while (currentTry.clone().add(requiredBlockMins, 'minutes').isBefore(endLimit)) {
                const blockStart = currentTry.format("HH:mm:ss");
                const blockEnd = currentTry.clone().add(requiredBlockMins, 'minutes').format("HH:mm:ss");

                let possibleAssignments = [];
                let allSectionsFit = true;

                for (const section of sections) {
                    // a. Find Room (Dept Preferred -> Global Fallback)
                    const room = await findAvailableRoom(day.date, blockStart, blockEnd, deptId, prefs.room);
                    
                    // b. Find Proctor (Availability + No Overlap + Reactivation)
                    const proctor = await findAvailableProctor(day.date, blockStart, blockEnd, deptId, prefs.proctor);

                    if (room && proctor) {
                        possibleAssignments.push({
                            section,
                            room_id: room.id,
                            proctor_id: proctor.id,
                            start: blockStart,
                            end: blockEnd
                        });
                    } else {
                        allSectionsFit = false;
                        break;
                    }
                }

                if (allSectionsFit) {
                    successfulTimeSlot = possibleAssignments;
                    break; // Found a valid block for all sections!
                }
                currentTry.add(30, 'minutes');
            }

            if (!successfulTimeSlot) {
                return res.status(409).json({ 
                    error: `Impossible to schedule ${day.date}. Exhausted rooms/proctors for a ${requiredBlockMins} min block.` 
                });
            }

            // 4. SAVE TO DATABASE (Transaction highly recommended here)
            for (const assign of successfulTimeSlot) {
                // We map each subject in the day's split to a 1-hour sub-slot within the block
                let subStart = moment(assign.start, "HH:mm");
                for (const sub of day.subjects) {
                    const subEnd = subStart.clone().add(sub.duration_mins, 'minutes');
                    
                    await db.query(
                        `INSERT INTO schedules (dept_id, year_level, section_label, subject_id, room_id, proctor_id, exam_date, start_time, end_time) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [deptId, yearLevel, assign.section, sub.id, assign.room_id, assign.proctor_id, day.date, subStart.format("HH:mm"), subEnd.format("HH:mm")]
                    );
                    subStart = subEnd;
                }
                finalSchedule.push(...successfulTimeSlot);
            }
        }

        res.json({ message: "Conflict-free schedule generated and saved.", schedule: finalSchedule });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Engine Error" });
    }
};

// --- HELPER: ROOM FINDER (With Consecutive Preference) ---
async function findAvailableRoom(date, start, end, deptId, preference) {
    const query = `
        SELECT r.* FROM rooms r
        WHERE r.status = 'active'
        AND r.id NOT IN (
            SELECT room_id FROM schedules 
            WHERE exam_date = ? AND NOT (end_time <= ? OR start_time >= ?)
        )
        ORDER BY (r.dept_id = ?) DESC, r.room_number ASC 
        LIMIT 1`;
    const [rooms] = await db.query(query, [date, start, end, deptId]);
    return rooms[0];
}

// --- HELPER: PROCTOR FINDER (With Availability Window Check) ---
async function findAvailableProctor(date, start, end, deptId, preference) {
    const query = `
        SELECT p.* FROM proctors p
        JOIN proctor_availability pa ON p.id = pa.proctor_id
        WHERE p.status = 'active'
        AND pa.avail_date = ?
        AND pa.start_time <= ? AND pa.end_time >= ?
        AND p.id NOT IN (
            SELECT proctor_id FROM schedules 
            WHERE exam_date = ? AND NOT (end_time <= ? OR start_time >= ?)
            AND is_reactivated = FALSE
        )
        ORDER BY (p.dept_id = ?) DESC
        LIMIT 1`;
    const [proctors] = await db.query(query, [date, start, start, date, start, end, deptId]);
    return proctors[0];
}