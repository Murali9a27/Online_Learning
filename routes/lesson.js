const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const { ensureAuthenticated, ensureInstructor, ensureStudent } = require('../config/auth');





// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/'); // Save uploads in this directory
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const ext = path.extname(file.originalname); // Get file extension
        cb(null, file.fieldname + '-' + uniqueSuffix + ext); // Create a unique filename
    }
});

// Initialize upload with file filter
const upload = multer({
    storage: storage,
    limits: { fileSize: 100000000 }, // Limit file size to 100MB
    fileFilter: (req, file, cb) => {
        const filetypes = /mp4|avi|mov|pdf/; // Allowed file types
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb('Error: Videos and PDFs Only!'); // Error if file type is invalid
        }
    }
});



router.get('/:courseId', (req, res) => {
    const courseId = req.params.courseId;

    // Query the database to get all lessons related to the given courseId
    db.query('SELECT * FROM lessons WHERE course_id = ?', [courseId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server Error');
        }

        // If lessons are found, pass them to the view
        res.render('course_lessons', { lessons: results, courseId });
    });
});

// Route to get the lesson creation form for a specific course
router.get('/:courseId/add-lesson', (req, res) => {
    const courseId = req.params.courseId;
    res.render('add_lesson', { courseId });
});


// Add lesson to a course
router.post('/:courseId/add-lesson', upload.single('file'), (req, res) => {
    const courseId = req.params.courseId;
    const { title } = req.body;
    const file_url = req.file.path.replace(/\\/g, '/'); // Normalize the file path
    const file_type = req.file.mimetype.startsWith('video/') ? 'video' : 'pdf'; // Determine file type

    db.query('INSERT INTO lessons (course_id, title, file_url, file_type) VALUES (?, ?, ?, ?)', 
    [courseId, title, file_url, file_type], (err) => {
        if (err) throw err;
        req.flash('success_msg', 'Lesson added successfully');
        res.redirect('/dashboard/instructor'); // Redirect back to course page
    });
});


module.exports = router;