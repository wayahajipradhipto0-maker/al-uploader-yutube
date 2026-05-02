const express = require('express');
const { google } = require('googleapis');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Kalo udah ada refresh_token di .env, langsung pake
if (process.env.REFRESH_TOKEN) {
  oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/index.html'))
});

// Route buat mulai login
app.get('/auth', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube.upload'],
    prompt: 'consent'
  });
  res.redirect(url);
});

// Route callback dari Google
app.get('/oauth2callback', async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // Kirim refresh_token ke logs Railway biar bisa dicopy ke Variables
    console.log('REFRESH_TOKEN:', tokens.refresh_token);
    
    res.cookie('logged_in', 'true', { maxAge: 900000 });
    res.send(`
      <h1>Login berhasil!</h1>
      <p><b>REFRESH_TOKEN:</b> ${tokens.refresh_token}</p>
      <p>Copy token di atas, masukin ke Railway Variables dengan nama REFRESH_TOKEN</p>
      <a href="/">Balik ke App</a>
    `);
  } catch (e) {
    res.status(500).send('Login gagal: ' + e.message);
  }
});

// Route cek status login
app.get('/status', (req, res) => {
  res.json({ logged_in: !!req.cookies.logged_in });
});

// Route upload
const upload = multer({ dest: 'uploads/' });
app.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ sukses: false, error: 'Pilih video dulu' });
    
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    
    const response = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title: req.body.title || 'Upload dari AL Uploader',
          description: req.body.desc || ''
        },
        status: {
          privacyStatus: 'private' // ganti 'public' kalo mau langsung public
        }
      },
      media: {
        body: fs.createReadStream(req.file.path)
      }
    });
    
    fs.unlinkSync(req.file.path); // hapus file abis upload
    res.json({ sukses: true, link: `https://youtu.be/${response.data.id}` });
  } catch (e) {
    console.log(e);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ sukses: false, error: e.message });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server jalan di port ${port}`)
});
