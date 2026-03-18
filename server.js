const express = require('express');
const multer = require('multer');
const cookieSession = require('cookie-session');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3311;

// ── Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.set('trust proxy', 1);
app.use(cookieSession({
    name: 'ilascu-session',
    keys: ['ilascu-memorial-admin-secret-2026'],
    maxAge: 24 * 60 * 60 * 1000 // 24h
}));

require('dotenv').config();
const { Client } = require('pg');

const dbClient = new Client({
    connectionString: process.env.DATABASE_URL
});
dbClient.connect().then(() => console.log('Connected to Neon DB')).catch(console.error);

// ── Data helpers ───────────────────────────────────────
async function readContent() {
    try {
        const result = await dbClient.query('SELECT data FROM site_content WHERE id = 1');
        if (result.rows.length > 0) return result.rows[0].data;
        return {};
    } catch (e) {
        console.error('DB read error:', e);
        return {};
    }
}

async function writeContent(data) {
    try {
        await dbClient.query('UPDATE site_content SET data = $1 WHERE id = 1', [JSON.stringify(data)]);
    } catch (e) {
        console.error('DB write error:', e);
    }
}

// ── Auth middleware ────────────────────────────────────
function requireAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) return next();
    res.status(401).json({ error: 'Unauthorized' });
}

// ── Auth endpoints ────────────────────────────────────
app.post('/api/admin/login', async (req, res) => {
    const { email, password } = req.body;
    const content = await readContent();
    const adminEmails = content.adminEmails || ['admin@ilieilascu.ro'];
    const storedPassword = content.adminPassword || 'admin123'; // Default pass if none set
    
    if (adminEmails.includes(email)) {
        console.log(`Login attempt for ${email}`);
        if (password === storedPassword) {
            req.session.isAdmin = true;
            req.session.adminEmail = email;
            console.log(`Login successful for ${email}`);
            res.json({ success: true, email });
        } else {
            console.warn(`Login failed for ${email}: Incorrect password`);
            res.status(403).json({ error: 'Parolă incorectă' });
        }
    } else {
        console.warn(`Login failed: Unauthorized email ${email}`);
        res.status(403).json({ error: 'Email neautorizat' });
    }
});

app.post('/api/admin/logout', (req, res) => {
    req.session = null;
    res.json({ success: true });
});

app.get('/api/admin/check', (req, res) => {
    res.json({ 
        isAdmin: !!(req.session && req.session.isAdmin),
        email: req.session?.adminEmail || null
    });
});

app.post('/api/admin/password', requireAdmin, async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ error: 'Parola prea scurtă' });
    }
    
    const content = await readContent();
    content.adminPassword = newPassword;
    await writeContent(content);
    
    res.json({ success: true });
});

// ── Content API (public read, admin write) ────────────
app.get('/api/content', async (req, res) => {
    const content = await readContent();
    // Don't expose admin emails to public
    const { adminEmails, ...publicContent } = content;
    res.json(publicContent);
});

app.put('/api/content', requireAdmin, async (req, res) => {
    const currentContent = await readContent();
    const newContent = { ...req.body, adminEmails: currentContent.adminEmails };
    await writeContent(newContent);
    res.json({ success: true });
});

// Update a single section
app.patch('/api/content/:section', requireAdmin, async (req, res) => {
    const content = await readContent();
    content[req.params.section] = req.body;
    await writeContent(content);
    res.json({ success: true });
});

// ── Translation API ──────────────────────────────────
app.post('/api/admin/translate', requireAdmin, async (req, res) => {
    const { text, from = 'ro', to = 'en' } = req.body;
    
    if (!text) return res.status(400).json({ error: 'No text provided' });

    try {
        // Query the free Google Translate extension endpoint
        const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`);
        const data = await response.json();
        
        let translatedText = '';
        if (data && data[0]) {
            data[0].forEach(part => {
                if (part[0]) translatedText += part[0];
            });
        }
        
        if (translatedText) {
            res.json({ success: true, translatedText });
        } else {
            throw new Error("Invalid response format");
        }
    } catch (err) {
        console.error('Translation error:', err);
        res.status(500).json({ error: 'Translation service failed' });
    }
});

// ── File Upload (Cloudinary) ──────────────────────────
const cloudinary = require('cloudinary').v2;
const os = require('os');
const tempDir = os.tmpdir();

const photoStorage = multer.diskStorage({
    destination: tempDir,
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'))
});

const videoStorage = multer.diskStorage({
    destination: tempDir,
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'))
});

const uploadPhoto = multer({ 
    storage: photoStorage, 
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp|svg|ico|icon/;
        cb(null, allowed.test(path.extname(file.originalname).toLowerCase()) || allowed.test(file.mimetype));
    }
});

const uploadVideo = multer({ 
    storage: videoStorage, 
    limits: { fileSize: 200 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /mp4|webm|ogg|avi|mov/;
        cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
    }
});

app.post('/api/upload/photo', requireAdmin, uploadPhoto.any(), async (req, res) => {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });
    try {
        const results = [];
        for (const file of req.files) {
            const uploadRes = await cloudinary.uploader.upload(file.path, { folder: 'ilascu_photos' });
            results.push({ success: true, filename: uploadRes.original_filename, path: uploadRes.secure_url });
            if(fs.existsSync(file.path)) fs.unlinkSync(file.path);
        }
        
        // Backward-compatibility: if the frontend sent a classic singular 'file' payload, return an object directly
        if (req.files.length === 1 && req.files[0].fieldname === 'file') {
            return res.json(results[0]);
        }
        res.json(results);
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Cloudinary upload failed' });
    }
});

app.post('/api/upload/video', requireAdmin, (req, res, next) => {
    uploadVideo.any()(req, res, (err) => {
        if (err) return res.status(500).json({ error: 'Upload failed: ' + err.message });
        next();
    });
}, async (req, res) => {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });
    try {
        const results = [];
        for (const file of req.files) {
            const uploadRes = await cloudinary.uploader.upload(file.path, { resource_type: 'video', folder: 'ilascu_videos' });
            results.push({ success: true, filename: uploadRes.original_filename, path: uploadRes.secure_url });
            if(fs.existsSync(file.path)) fs.unlinkSync(file.path);
        }
        
        if (req.files.length === 1 && req.files[0].fieldname === 'file') {
            return res.json(results[0]);
        }
        res.json(results);
    } catch (e) {
        console.error('Video Upload Process Error:', e);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/upload/:type/:filename', requireAdmin, (req, res) => {
    // În arhitectura Cloudinary, linkurile stau în DB. Putem ignora ștergerea fizică pentru Free Tier, 
    // sau poți implementa destroy bazat pe extras public_id din url. Pentru simplitate, returnăm succes.
    res.json({ success: true });
});

// List uploaded files din Cloudinary
app.get('/api/files/:type', requireAdmin, async (req, res) => {
    try {
        const folder = req.params.type === 'photos' ? 'ilascu_photos' : 'ilascu_videos';
        const result = await cloudinary.search.expression(`folder:${folder}`).sort_by('created_at','desc').max_results(30).execute();
        const files = result.resources.map(f => ({
            filename: f.filename,
            path: f.secure_url,
            size: f.bytes
        }));
        res.json(files);
    } catch (e) {
        console.error('Cloudinary fetch error', e);
        res.json([]);
    }
});

// ── Admin emails management ───────────────────────────
app.get('/api/admin/emails', requireAdmin, async (req, res) => {
    const content = await readContent();
    res.json(content.adminEmails || []);
});

app.put('/api/admin/emails', requireAdmin, async (req, res) => {
    const content = await readContent();
    content.adminEmails = req.body.emails;
    await writeContent(content);
    res.json({ success: true });
});
// ── Contact Form & CAPTCHA ──────────────────────────
app.get('/api/contact/captcha', (req, res) => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    req.session.captcha = code;
    res.json({ code }); // In real app, render as image, but simple numeric code for now
});

app.post('/api/contact/submit', (req, res) => {
    const { name, email, message, captcha } = req.body;
    
    if (!req.session.captcha || captcha !== req.session.captcha) {
        return res.status(400).json({ error: 'Cod de securitate incorect' });
    }
    
    // In real app, send email or save to DB here. 
    // For now, we simulate success and clear captcha.
    req.session.captcha = null;
    console.log(`Contact form submission from ${name} (${email}): ${message}`);
    res.json({ success: true, message: 'Mesaj trimis cu succes!' });
});

// ── Static files ──────────────────────────────────────
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use(express.static(__dirname));

// SPA fallback for admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// ── Start ─────────────────────────────────────────────
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`\n🏛️  Ilascu Memorial Server`);
        console.log(`   Public:  http://localhost:${PORT}`);
        console.log(`   Admin:   http://localhost:${PORT}/admin`);
        console.log(`   Ready!\n`);
    });
}
module.exports = app;
