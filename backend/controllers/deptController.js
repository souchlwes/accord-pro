const db = require('../config/db');

// --- 1. DEPARTMENT MANAGEMENT ---

exports.getAllDepartments = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM departments');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Database error: " + err.message });
    }
};

// --- 2. SUBJECT MANAGEMENT (A) ---

exports.addSubject = async (req, res) => {
    const { yearLevel, code, name } = req.body;
    const deptId = req.params.id;

    try {
        // STRICT RULE: Check if this year level already has 30 subjects
        const [countRow] = await db.execute(
            'SELECT COUNT(*) as total FROM subjects WHERE dept_id = ? AND year_level = ?',
            [deptId, yearLevel]
        );

        if (countRow[0].total >= 30) {
            return res.status(400).json({ error: `Year Level ${yearLevel} has reached the 30-subject limit.` });
        }

        const [result] = await db.execute(
            'INSERT INTO subjects (dept_id, year_level, subject_code, subject_name) VALUES (?, ?, ?, ?)',
            [deptId, yearLevel, code, name]
        );

        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: "Could not add subject: " + err.message });
    }
};

exports.deleteSubject = async (req, res) => {
    try {
        await db.execute('DELETE FROM subjects WHERE id = ?', [req.params.subjectId]);
        res.json({ success: true, message: "Subject deleted." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- 3. PROCTOR MANAGEMENT (B) ---

exports.addProctor = async (req, res) => {
    const { name } = req.body;
    const deptId = req.params.id;
    try {
        const [result] = await db.execute(
            'INSERT INTO proctors (dept_id, name) VALUES (?, ?)',
            [deptId, name]
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.saveProctorAvailability = async (req, res) => {
    const { proctorId, date, start, end } = req.body;
    try {
        // The UNIQUE constraint in MySQL will automatically block duplicate dates
        await db.execute(
            'INSERT INTO proctor_availability (proctor_id, avail_date, start_time, end_time) VALUES (?, ?, ?, ?)',
            [proctorId, date, start, end]
        );
        res.json({ success: true, message: "Availability saved." });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "This proctor is already assigned to an exam on this date." });
        }
        res.status(500).json({ error: err.message });
    }
};

// --- 4. ROOM MANAGEMENT (C) ---

exports.addRoom = async (req, res) => {
    const { roomNumber } = req.body;
    const deptId = req.params.id;
    try {
        const [result] = await db.execute(
            'INSERT INTO rooms (dept_id, room_number) VALUES (?, ?)',
            [deptId, roomNumber]
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteRoom = async (req, res) => {
    try {
        await db.execute('DELETE FROM rooms WHERE id = ?', [req.params.roomId]);
        res.json({ success: true, message: "Room deleted." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};