const express = require('express');
const multer = require('multer');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3311;

// ── Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(session({
    secret: 'ilascu-memorial-admin-secret-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24h
}));

// ── Data helpers ───────────────────────────────────────
const DATA_FILE = path.join(__dirname, 'data', 'content.json');

function readContent() {
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
        return {};
    }
}

function writeContent(data) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ── Auth middleware ────────────────────────────────────
function requireAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) return next();
    res.status(401).json({ error: 'Unauthorized' });
}

// ── Auth endpoints ────────────────────────────────────
app.post('/api/admin/login', (req, res) => {
    const { email, password } = req.body;
    const content = readContent();
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
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/admin/check', (req, res) => {
    res.json({ 
        isAdmin: !!(req.session && req.session.isAdmin),
        email: req.session?.adminEmail || null
    });
});

app.post('/api/admin/password', requireAdmin, (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ error: 'Parola prea scurtă' });
    }
    
    const content = readContent();
    content.adminPassword = newPassword;
    writeContent(content);
    
    res.json({ success: true });
});

// ── Content API (public read, admin write) ────────────
app.get('/api/content', (req, res) => {
    const content = readContent();
    // Don't expose admin emails to public
    const { adminEmails, ...publicContent } = content;
    res.json(publicContent);
});

app.put('/api/content', requireAdmin, (req, res) => {
    const currentContent = readContent();
    const newContent = { ...req.body, adminEmails: currentContent.adminEmails };
    writeContent(newContent);
    res.json({ success: true });
});

// Update a single section
app.patch('/api/content/:section', requireAdmin, (req, res) => {
    const content = readContent();
    content[req.params.section] = req.body;
    writeContent(content);
    res.json({ success: true });
});

// ── Translation API ──────────────────────────────────
app.post('/api/admin/translate', requireAdmin, async (req, res) => {
    const { text, from = 'ro', to = 'en' } = req.body;
    
    if (!text) return res.status(400).json({ error: 'No text provided' });

    try {
        // MOCK TRANSLATION LOGIC
        // In a real production environment, you would use:
        // - Google Cloud Translation API
        // - DeepL API
        // - LibreTranslate
        
        const words = {
            "politician": "politician",
            "disident": "dissident",
            "simbol": "symbol",
            "rezistenței": "resistance",
            "împotriva": "against",
            "separatismului": "separatism",
            "transnistrean": "Transnistrian",
            "Născut": "Born",
            "în": "in",
            "satul": "village",
            "fondatorii": "founders",
            "Mișcării": "Movement",
            "Eliberare": "Liberation",
            "Națională": "National",
            "președinte": "president",
            "Frontului": "Front",
            "Popular": "Popular",
            "deputat": "deputy",
            "Parlamentul": "Parliament",
            "Republicii": "Republic",
            "Moldova": "Moldova",
            "senator": "senator",
            "României": "Romania",
            "membru": "member",
            "Adunării": "Assembly",
            "Parlamentare": "Parliamentary",
            "Consiliului": "Council",
            "Europei": "Europe",
            "decorat": "decorated",
            "Ordinul": "Order",
            "Steaua": "Star",
            "luptă": "struggle",
            "libertate": "freedom",
            "unitate": "unity",
            "patriot": "patriot",
            "eroi": "heroes",
            "erou": "hero",
            "activitate": "activity",
            "viața": "life",
            "biografie": "biography",
            "interviu": "interview",
            "discurs": "speech",
            "public": "public",
            "Buna ziua": "Hello",
            "Buna": "Hello",
            "ziua": "day",
            "numele": "name",
            "ma numesc": "my name is",
            "numesc": "name",
            "sunt": "am",
            "putin": "a bit",
            "debil": "weak/idiot",
            "Andrei": "Andrei",
            "istorie": "history",
            "pace": "peace",
            "familie": "family",
            "Romania": "Romania",
            "Basarabia": "Bessarabia",
            "Tiraspol": "Tiraspol"
        };

        let translatedText = text;
        
        // Sort keys by length descending to match longer phrases first (e.g. "ma numesc" before "numesc")
        const sortedWords = Object.entries(words).sort((a, b) => b[0].length - a[0].length);
        
        for (const [ro, en] of sortedWords) {
            const regex = new RegExp(`\\b${ro}\\b`, 'gi');
            translatedText = translatedText.replace(regex, en);
        }

        // If it was already in the paragraphs mock, keep those specific replacements
        if (text.includes("politician și disident")) {
            translatedText = translatedText.replace("politician și disident", "politician and dissident")
                                .replace("simbol al rezistenței", "symbol of resistance")
                                .replace("Născut în", "Born in");
        }
        
        // Simulating network delay for effect
        setTimeout(() => {
            res.json({ success: true, translatedText });
        }, 800);
        
    } catch (err) {
        res.status(500).json({ error: 'Translation service failed' });
    }
});

// ── File Upload ───────────────────────────────────────
const photoStorage = multer.diskStorage({
    destination: path.join(__dirname, 'images'),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '-');
        cb(null, uniqueName);
    }
});

const videoStorage = multer.diskStorage({
    destination: path.join(__dirname, 'videos'),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '-');
        cb(null, uniqueName);
    }
});

const uploadPhoto = multer({ 
    storage: photoStorage, 
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp|svg/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = allowed.test(file.mimetype);
        cb(null, ext || mime);
    }
});

const uploadVideo = multer({ 
    storage: videoStorage, 
    limits: { fileSize: 200 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /mp4|webm|ogg|avi|mov/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        cb(null, ext);
    }
});

app.post('/api/upload/photo', requireAdmin, uploadPhoto.array('files', 20), (req, res) => {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });
    const results = req.files.map(file => ({
        success: true, 
        filename: file.filename,
        path: 'images/' + file.filename
    }));
    res.json(results);
});

app.post('/api/upload/video', requireAdmin, (req, res, next) => {
    uploadVideo.array('files', 10)(req, res, (err) => {
        if (err) {
            console.error('Multer Video Upload Error:', err);
            return res.status(500).json({ error: 'Upload failed: ' + err.message });
        }
        next();
    });
}, (req, res) => {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });
    try {
        const results = req.files.map(file => ({
            success: true, 
            filename: file.filename,
            path: 'videos/' + file.filename
        }));
        res.json(results);
    } catch (e) {
        console.error('Video Upload Process Error:', e);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/upload/:type/:filename', requireAdmin, (req, res) => {
    const dir = req.params.type === 'photo' ? 'images' : 'videos';
    const filepath = path.join(__dirname, dir, req.params.filename);
    
    if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

// List uploaded files
app.get('/api/files/:type', requireAdmin, (req, res) => {
    const dir = req.params.type === 'photos' ? 'images' : 'videos';
    const dirPath = path.join(__dirname, dir);
    
    try {
        const files = fs.readdirSync(dirPath)
            .filter(f => !f.startsWith('.'))
            .map(f => ({
                filename: f,
                path: dir + '/' + f,
                size: fs.statSync(path.join(dirPath, f)).size
            }));
        res.json(files);
    } catch (e) {
        res.json([]);
    }
});

// ── Admin emails management ───────────────────────────
app.get('/api/admin/emails', requireAdmin, (req, res) => {
    const content = readContent();
    res.json(content.adminEmails || []);
});

app.put('/api/admin/emails', requireAdmin, (req, res) => {
    const content = readContent();
    content.adminEmails = req.body.emails;
    writeContent(content);
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
app.listen(PORT, () => {
    console.log(`\n🏛️  Ilascu Memorial Server`);
    console.log(`   Public:  http://localhost:${PORT}`);
    console.log(`   Admin:   http://localhost:${PORT}/admin`);
    console.log(`   Ready!\n`);
});
