const db = require('../config/db');

exports.getGlobalResources = async (req, res) => {
    try {
        // 1. Get total counts for the Dashboard
        const [proctors] = await db.execute('SELECT COUNT(DISTINCT proctor_id) as total FROM global_proctor_pool');
        const [rooms] = await db.execute('SELECT COUNT(*) as total FROM global_room_pool');
        
        // 2. Get availability for a specific date (useful for the Generator)
        const targetDate = req.query.date || new Date().toISOString().split('T')[0];
        
        const [availableProctors] = await db.execute(
            'SELECT name, home_dept FROM global_proctor_pool WHERE avail_date = ?',
            [targetDate]
        );

        res.json({
            summary: {
                total_proctors: proctors[0].total,
                total_rooms: rooms[0].total
            },
            available_today: availableProctors
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};