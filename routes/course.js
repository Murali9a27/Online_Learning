const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const { ensureAuthenticated, ensureInstructor, ensureStudent } = require('../config/auth');


// List all courses
router.get('/', ensureStudent, (req, res) => {
    db.query('SELECT * FROM courses', (err, courses) => {
        if (err) throw err;
        res.render('courses', { courses, user: req.user });
    });
});

// Display course creation form
router.get('/add', ensureInstructor, (req, res) => {
    res.render('add_course'); // Render a form to create a course
});

router.get('/:id', ensureInstructor, (req, res) => {
    const course_id= req.params.id;
    db.query('SELECT * FROM courses WHERE id= ?',[course_id], (err, courses) => {
        if (err) throw err;
        res.render('ins_courses', { courses, user: req.user });
    });
});



// Handle course creation

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/'); // Directory to save uploaded images
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const ext = path.extname(file.originalname); // Get file extension
        cb(null, file.fieldname + '-' + uniqueSuffix + ext); // Create a unique filename
    }
});

// Initialize upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 1000000 }, // Limit file size to 1MB
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/; // Allowed file types
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb('Error: Images Only!'); // Error if file type is invalid
        }
    }
})


// Handle course creation
router.post('/add', ensureInstructor, upload.single('image'), (req, res) => {
    const { title, description, category, tags } = req.body;
    const created_by = req.user.id; // Assuming the user ID is stored in req.user after authentication
    const image_url = req.file.path.replace('public\\', '').replace(/\\/g, '/'); // Get the path of the uploaded image
    

    // Insert the new course into the database
    db.query(
        'INSERT INTO courses (title, description, category, tags, image_url, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [title, description, category, tags, image_url, created_by],
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Server Error'); // Handle errors
            }
            req.flash('success_msg', 'Course added successfully');
            res.redirect('/dashboard/instructor'); // Redirect to courses page
        }
    );
});



// Display course edit form (optional)
router.get('/edit/:id', ensureInstructor, (req, res) => {
    const courseId = req.params.id;
    db.query('SELECT * FROM courses WHERE id = ?', [courseId], (err, course) => {
        if (err) throw err;
        res.render('edit', { course: course[0] });
    });
});

// Handle course updates
router.post('/edit/:id', ensureInstructor, (req, res) => {
    const { title, description, category, tags } = req.body;
    const courseId = req.params.id;

    db.query('UPDATE courses SET title = ?, description = ?, category = ?, tags = ? WHERE id = ?', 
    [title, description, category, tags, courseId], (err) => {
        if (err) throw err;
        req.flash('success_msg', 'Course updated successfully');
        res.redirect('/dashboard/instructor');
    });
});

// Delete a course

router.get('/delete/:id', ensureInstructor, (req, res) => {
    const courseId = req.params.id;

    // Fetch the course details from the DB
    db.query('SELECT * FROM courses WHERE id = ?', [courseId], (err, course) => {
        if (err) throw err;

        res.render('delete', {user:req.user, message:req.flash(), course: course[0] });
    });
});


router.post('/delete/:id', ensureInstructor, (req, res) => {
    const courseId = req.params.id;
    // check if any user enroll to that course
    
    db.query('select * from enrollments where course_id = ?',[courseId], (err, result)=>{
        if (err) throw err;
        if(result.length == 0){
            db.query('DELETE FROM courses WHERE id = ?', [courseId], (err) => {
                if (err) throw err;
                req.flash('success_msg', 'Course deleted successfully');
                return res.redirect('/dashboard/instructor');
            });
        }
        else{
            req.flash('error_msg','Course cannot be deleted Students are enrolled in this course');
            return res.redirect('/dashboard/instructor');
        }
        


    });
    
});




// Course Enrollment Route
router.post('/enroll/:courseId', (req, res) => {
    const userId = req.user.id; // Get the user ID from the authenticated user
    const courseId = req.params.courseId; // Get the course ID from the route parameters

    // Check if the user is already enrolled in the course
    db.query('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', [userId, courseId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server Error');
        }

        // If the user is already enrolled, redirect with a message
        if (results.length > 0) {
            req.flash('error_msg', 'You are already enrolled in this course.');
            return res.redirect('/dashboard/student'); // Redirect to the student dashboard
        }

        // Enroll the user in the course
        db.query('INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)', [userId, courseId], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Server Error');
            }

            req.flash('success_msg', 'You have successfully enrolled in the course.');
            res.redirect('/dashboard/student'); // Redirect to the student dashboard
        });
    });
});










module.exports = router;
 