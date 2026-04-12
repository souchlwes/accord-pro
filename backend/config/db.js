const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'yourpassword',
    database: process.env.DB_NAME || 'university_exam_scheduler',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Convert to promises so we can use async/await
const db = pool.promise();

module.exports = db;