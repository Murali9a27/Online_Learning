// app.js
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('./config/passport');
const db = require('./config/db');
const authRoutes = require('./routes/auth');


const app = express();

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use('/uploads', express.static('public/uploads'));


app.set('view engine', 'ejs');


// Session and Flash Messages
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Global Variables for Flash Messages
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});

// Routes
app.use('/', authRoutes);
app.use('/courses', require('./routes/course'));
app.use('/lessons', require('./routes/lesson'));
app.use('/profile', require('./routes/profile'))




// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
