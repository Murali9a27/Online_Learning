const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const db = require('../config/db');
const { ensureAuthenticated, ensureInstructor, ensureStudent } = require('../config/auth');



// Dashboard for Students
router.get('/dashboard/student', ensureStudent, (req, res) => {
    const enrolledCoursesQuery = `
        SELECT c.id, c.title, c.description, c.image_url, ec.enrolled_at
        FROM enrollments ec
        JOIN courses c ON ec.course_id = c.id
        WHERE ec.user_id = ?
    `;
    
    
    // New query to get the latest courses
    
    const latestCoursesQuery = `
        SELECT id, title, description, image_url, created_at
        FROM courses  
        ORDER BY created_at DESC
        LIMIT 6
    `;

   
    db.query(enrolledCoursesQuery, [req.user.id], (err, enrolledCourses) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server Error');
        }

        db.query(latestCoursesQuery, (err, latestCourses) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Server Error');
            }
            
            
              
            // Pass user object along with courses data
            res.render('dashboard/studentDashboard', { 
                user: req.user, 
                enrolledCourses, 
                latestCourses,
                    
                
            });
            
        });
    });
});
 


// Dashboard for Instructors
router.get('/dashboard/instructor', ensureInstructor, (req, res) => {
    const instructorCoursesQuery = `
        SELECT c.id, c.title, c.description, c.image_url, COUNT(ec.user_id) AS student_count
        FROM courses c
        LEFT JOIN enrollments ec ON c.id = ec.course_id
        WHERE c.created_by = ?
        GROUP BY c.id
    `;
    
    db.query(instructorCoursesQuery, [req.user.id], (err, instructorCourses) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server Error');
        }

        // Pass user object along with courses data
        res.render('dashboard/instructorDashboard', { 
            user: req.user,
            message: req.flash(), 
            instructorCourses 
        });
    });
});


router.get('/register', (req, res) => {
    res.render('register', { errors: [], name: '', email: '' });
});

// Register User
router.post('/register', (req, res) => {
    let errors = [];  // Declare errors inside the route handler to reset for each request
    const { name, email, password, password2, role } = req.body;

    // Validation
    if (!name || !email || !password || !password2) {
        errors.push({ msg: 'Please fill in all fields' });
    }

    if (password !== password2) {
        errors.push({ msg: 'Passwords do not match' });
    }

    if (password.length < 6) {
        errors.push({ msg: 'Password must be at least 6 characters' });
    }

    if (errors.length > 0) {
        // Don't pass back passwords for security reasons
        res.render('register', { errors, name, email });
    } else {
        // Check if user already exists
        db.query('SELECT email FROM users WHERE email = ?', [email], (err, results) => {
            if (err) throw err;

            if (results.length > 0) {
                errors.push({ msg: 'Email is already registered' });
                res.render('register', { errors, name, email });
            } else {
                // Hash password
                bcrypt.hash(password, 10, (err, hash) => {
                    if (err) throw err;

                    // Insert user into DB
                    db.query(
                        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                        [name, email, hash, role],
                        (err, results) => {
                            if (err) throw err;

                            req.flash('success_msg', 'You are now registered and can log in');
                            res.redirect('/login');
                        }
                    );
                });
            }
        });
    }
});

// Login Page
router.get('/login', (req, res) => res.render('login',{message: req.flash()}));


// Login User (using Passport.js)
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        if (!user) {
            req.flash('error_msg',"User doesn't exist.")
            return res.redirect('/login'); // Authentication failed, redirect to login
        }
        
        req.logIn(user, (err) => {
            if (err) return next(err);
            // Redirect based on user role after login
            if (user.role === 'instructor') {
                return res.redirect('/dashboard/instructor');
            } else {
                return res.redirect('/dashboard/student');
            }
        });
    })(req, res, next);
});


router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash('success_msg', 'You are logged out');
        res.redirect('/login');
    });
});

module.exports = router;
