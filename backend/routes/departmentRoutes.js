const express = require('express');
const router = express.Router();
const deptController = require('../controllers/deptController');
const globalController = require('../controllers/globalController');

router.get('/global-pool', globalController.getGlobalResources);

// @route   GET /api/departments
// @desc    Get all departments (for the dashboard)
router.get('/', deptController.getAllDepartments);

// @route   POST /api/departments/:id/subjects
// @desc    Add a subject to a specific year level
router.post('/:id/subjects', deptController.addSubject);

// @route   POST /api/departments/:id/proctors
// @desc    Add a proctor with availability
router.post('/:id/proctors', deptController.addProctor);

// @route   POST /api/departments/:id/rooms
// @desc    Add a department-preferred room
router.post('/:id/rooms', deptController.addRoom);

module.exports = router;