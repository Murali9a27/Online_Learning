// /config/auth.js
module.exports = {
    ensureAuthenticated: function(req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        req.flash('error_msg', 'Please log in to view this resource');
        res.redirect('/login');
    },

    ensureInstructor: function(req, res, next) {
        if (req.isAuthenticated() && req.user.role === 'instructor') {
            return next();
        }
        req.flash('error_msg', 'You are not authorized to access this resource');
        res.redirect('/login');
    },

    ensureStudent: function(req, res, next) {
        if (req.isAuthenticated() && req.user.role === 'student') {
            return next();
        }
        req.flash('error_msg', 'You are not authorized to access this resource');
        res.redirect('/login');
    }
};
