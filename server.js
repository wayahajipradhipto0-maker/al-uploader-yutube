const express = require('express');
const { google } = require('googleapis');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();
const app = express();
app.use(cors());
const upload = multer({ dest: 'uploads/' });
const oauth2Client = new google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET, process.env.REDIRECT_URL);
oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });
app.post('/upload', upload.single('video'), async (req, res) => {
    try {
        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
        const response = await youtube.videos.insert({
            part: 'snippet,status',
            requestBody: { snippet: { title: req.body.judul || 'AL Upload', description: req.body.deskripsi || '' }, status: { privacyStatus: 'unlisted' }},
            media: { body: fs.createReadStream(req.file.path) }
        });
        fs.unlinkSync(req.file.path);
        res.json({ sukses: true, link: `https://youtu.be/${response.data.id}` });
    } catch (e) { res.json({ sukses: false, error: e.message }); }
});
app.listen(process.env.PORT || 3000);
