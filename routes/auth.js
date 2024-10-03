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


// Google Login Route
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'],prompt: 'select_account' }));

// Google Callback Route
router.get('/auth/google/callback', 
    passport.authenticate('google', {
        failureRedirect: '/auth/google/failure'
    }), 
    (req, res) => {
        
        // Store Google profile in session after successful authentication
        req.session.googleProfile = req.user;
        const user = req.user;
        console.log(user.role)
        if(!user.role){
            return res.redirect('/choose-role');
        }
        else if (user.role === 'instructor') {
                return res.redirect('/dashboard/instructor');
            }
        else {
                return res.redirect('/dashboard/student');
            }
        
          // Redirect to role selection page
    }
);

// Facebook Login Route
router.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'], prompt: 'select_account' }));
  
router.get('/auth/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    function(req, res) {
      // Successful authentication, redirect home.
    //   res.redirect('/');
      req.session.facebookProfile = req.user;
        const user = req.user;
        console.log(user.role)
        if(!user.role){
            return res.redirect('/choose-role');
        }
        else if (user.role === 'instructor') {
                return res.redirect('/dashboard/instructor');
            }
        else {
                return res.redirect('/dashboard/student');
            }
    });

// // Facebook Login ends

// Role Selection Page
router.get('/choose-role', (req, res) => {
    if (!req.session.googleProfile) {
        return res.redirect('/auth/google');  // Redirect if no Google profile is found in session
    }
    
    res.render('chooseRole', { googleProfile: req.session.googleProfile });
});

// Route To Handle Role Selection
router.post('/choose-role', (req, res) => {
    const { role } = req.body;
    const googleProfile = req.session.googleProfile;

    if (!googleProfile) {
        return res.redirect('/auth/google');  // Redirect if session has expired
    }
    

    // Save the user with the selected role
    db.query(
        'UPDATE users SET role = ? WHERE email = ?', 
        [role, googleProfile.email], 
        (err) => {
            if (err) {
                console.error(err);
                req.flash('error_msg', 'An error occurred while updating your details.');
                return res.redirect('/choose-role');
            }
            console.log(googleProfile.email)
            req.flash('success_msg', 'Your role has been updated.');
            db.query('SELECT * FROM users WHERE email =?',[googleProfile.email],(err, user)=>{
                if(!user[0].role){
                    return res.redirect('/choose-role');
                }
                else if (user[0].role === 'instructor') {
                        return res.redirect('/dashboard/instructor');
                    }
                else {
                        return res.redirect('/dashboard/student');
                    }
            });
            
        }
    );

    

});



// route to logout
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
