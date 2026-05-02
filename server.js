const express = require('express');
const { google } = require('googleapis');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// PENTING: Route buat nampilin halaman utama
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/index.html'))
})

// Route buat OAuth callback - WAJIB ADA
app.get('/oauth2callback', (req, res) => {
  res.send('Login berhasil! Kamu bisa tutup tab ini.')
})

const upload = multer({ dest: 'uploads/' });

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Taruh logic upload YouTube kamu di sini
app.post('/upload', upload.single('video'), async (req, res) => {
  try {
    oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    
    const response = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title: req.body.title || 'Upload dari AL Uploader',
          description: req.body.desc || ''
        },
        status: {
          privacyStatus: 'private'
        }
      },
      media: {
        body: fs.createReadStream(req.file.path)
      }
    });
    
    fs.unlinkSync(req.file.path);
    res.json({ sukses: true, link: `https://youtu.be/${response.data.id}` });
  } catch (e) {
    console.log(e);
    res.json({ sukses: false, error: e.message });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server jalan di port ${port}`)
});
