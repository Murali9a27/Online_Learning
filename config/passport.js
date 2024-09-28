// config/passport.js
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const db = require('./db');
const passport = require('passport');

// Local Strategy
passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
    // Match User
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) throw err;
        
        if (results.length === 0) {
            return done(null, false, { message: 'That email is not registered' });
        }

        const user = results[0];

        // Match Password
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) throw err;

            if (isMatch) {
                return done(null, user);
            } else {
                return done(null, false, { message: 'Password incorrect' });
            }
        });
    });
}));

// Serialize User
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize User
passport.deserializeUser((id, done) => {
    db.query('SELECT * FROM users WHERE id = ?', [id], (err, results) => {
        done(err, results[0]);
    });
});

module.exports = passport;
