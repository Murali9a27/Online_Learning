const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const { ensureAuthenticated, ensureInstructor, ensureStudent } = require('../config/auth');

// Profile page route
router.get('/', ensureAuthenticated, (req, res) => {
    const userId = req.user.id;

    // Fetch user information
    db.query('SELECT * FROM users WHERE id = ?', [userId], (err, userResult) => {
        if (err) throw err;

        const user = userResult[0];

        if (user.role === 'student') {
            // Fetch the courses the student is enrolled in
            db.query(`SELECT c.id, c.title, c.description 
                      FROM enrollments e
                      JOIN courses c ON e.course_id = c.id
                      WHERE e.user_id = ?`, [userId], (err, enrolledCourses) => {
                if (err) throw err;

                res.render('profile', {
                    user,
                    courses: enrolledCourses,
                    role: 'student'
                });
            });
        } else if (user.role === 'instructor') {
            // Fetch the courses the instructor has created
            db.query(`SELECT id, title, description 
                      FROM courses 
                      WHERE created_by = ?`, [userId], (err, createdCourses) => {
                if (err) throw err;

                res.render('profile', {
                    user,
                    courses: createdCourses,
                    role: 'instructor'
                });
            });
        }
    });
});


module.exports= router;