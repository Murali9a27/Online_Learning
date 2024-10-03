// config/passport.js
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
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

passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback",
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
    db.query('SELECT * FROM users WHERE google_id = ?', [profile.id], (err, results) => {
        if (err) return done(err);
        
        if (results.length > 0) {
          // If the user exists, update their google_id if necessary
          db.query('UPDATE users SET google_id = ? WHERE email = ?', [profile.id, profile.emails[0].value], (err, user) => {
            if (err) return done(err);
            return done(null, results[0]); // Log the user in
          });
        }
        else {
          // If user does not exist, create a new user
          const user = {
            name: profile.displayName,
            email: profile.emails[0].value,
            google_id: profile.id
          };
          
          db.query('INSERT INTO users (name, email, google_id) VALUES (?, ?, ?)', 
            [user.name, user.email, user.google_id], 
            (err, results) => {
              if (err) return done(err);
              user.id = results.insertId;
              return done(null, user);
            }
          );
        }
      });
  }
));

passport.use(new FacebookStrategy({
  clientID:     process.env.FACEBOOK_CLIENT_ID,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/facebook/callback",
  profileFields: ['id', 'displayName', 'emails'],
  passReqToCallback   : true
},
function(request, accessToken, refreshToken, profile, done) {
  const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;

  if (!email) {
    console.log("No email associated with this Facebook account");
    // You can handle this case according to your business logic
    return done(null, false, { message: "No email available from Facebook" });
  }

  db.query('SELECT * FROM users WHERE facebook_id = ?', [profile.id], (err, results) => {
      if (err) return done(err);
      
      if (results.length > 0) {
        // If the user exists, update their google_id if necessary
        console.log(profile.emails[0].value)
        db.query('UPDATE users SET facebook_id = ? WHERE email = ?', [profile.id, profile.emails[0].value], (err, result) => {
          if (err) return done(err);
          console.log(result)
          return done(null, results[0]); // Log the user in
        });
      } 
      else {
        // If user does not exist, create a new user
        const user = {
          name: profile.displayName,
          email: profile.emails[0].value,
          facebook_id: profile.id
        };
        console.log("2");
        db.query('INSERT INTO users (name, email, facebook_id) VALUES (?, ?, ?)', 
          [user.name, user.email, user.facebook_id], 
          (err, results) => {
            if (err) return done(err);
            user.id = results.insertId;
            return done(null, user);
          }
        );
      }
    });
}
));

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
