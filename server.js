require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');

const app = express();

// Middleware
app.use(express.static(__dirname));
app.use(express.json());
app.use(session({
  secret: 'al-uploader-secret-123',
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

// Google OAuth Strategy - INI YANG BENERIN ERROR REDIRECT_URI
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.REDIRECT_URI, // INI WAJIB ADA
    scope: [
      'profile',
      'email',
      'https://www.googleapis.com/auth/youtube.upload'
    ],
    accessType: 'offline',
    prompt: 'consent'
  },
  function(accessToken, refreshToken, profile, done) {
    profile.accessToken = accessToken;
    profile.refreshToken = refreshToken;
    return done(null, profile);
  }
));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Tombol Login
app.get('/auth/google', passport.authenticate('google'));

// Callback dari Google - WAJIB SAMA DENGAN DI GOOGLE CLOUD
app.get('/oauth2callback',
  passport.authenticate('google', { failureRedirect: '/?error=gagal' }),
  (req, res) => res.redirect('/')
);

// Cek user udah login apa belum
app.get('/api/user', (req, res) => {
  if (req.user) {
    res.json({
      loggedIn: true,
      name: req.user.displayName,
      email: req.user.emails[0].value
    });
  } else {
    res.json({ loggedIn: false });
  }
});

app.get('/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server jalan di port ${PORT}`));
