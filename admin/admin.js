// ── Admin Panel Logic — macOS Tahoe Edition ───────────
let contentData = {};
let currentSection = 'hero';
let selectedVideoIds = new Set();
let selectedPhotoIds = new Set();

// ── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const savedEmail = localStorage.getItem('adminSavedEmail');
    const savedPass = localStorage.getItem('adminSavedPass');
    if (savedEmail) document.getElementById('loginEmail').value = savedEmail;
    if (savedPass) {
        document.getElementById('loginPassword').value = atob(savedPass);
        const rememberCheckbox = document.getElementById('rememberPassword');
        if (rememberCheckbox) rememberCheckbox.checked = true;
    }
    
    const res = await fetch('/api/admin/check');
    const auth = await res.json();
    
    if (auth.isAdmin) {
        showDashboard(auth.email);
    }
    
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchSection(item.dataset.section);
        });
    });
});

// ── Helpers ───────────────────────────────────────────
function getYouTubeId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function autoFetchThumb(url) {
    const ytId = getYouTubeId(url);
    if (ytId) {
        const thumbInput = document.getElementById('modal-vid-thumb');
        if (thumbInput && !thumbInput.value) {
            thumbInput.value = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        }
    }
}

// ── Auth ──────────────────────────────────────────────
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const errorEl = document.getElementById('loginError');
    
    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        if (res.ok) {
            const remember = document.getElementById('rememberPassword');
            if (remember && remember.checked) {
                localStorage.setItem('adminSavedEmail', email);
                localStorage.setItem('adminSavedPass', btoa(password));
            } else {
                localStorage.removeItem('adminSavedEmail');
                localStorage.removeItem('adminSavedPass');
            }
            showDashboard(email);
        } else {
            const data = await res.json();
            errorEl.textContent = data.error || 'Eroare la autentificare';
            errorEl.style.display = 'block';
        }
    } catch (err) {
        errorEl.textContent = 'Eroare de conexiune la server';
        errorEl.style.display = 'block';
    }
}

async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminDashboard').style.display = 'none';
}

async function showDashboard(email) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'flex';
    document.getElementById('adminEmailDisplay').textContent = email;
    
    await loadContent();
    renderSection(currentSection);
}

// ── Content Loading ───────────────────────────────────
async function loadContent() {
    try {
        const res = await fetch('/api/content');
        contentData = await res.json();
    } catch (err) {
        showToast('Eroare la încărcarea conținutului', 'error');
    }
}

async function saveAllContent() {
    try {
        collectCurrentSectionData();
        
        const res = await fetch('/api/content', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(contentData)
        });
        
        if (res.ok) {
            showToast('✓ Salvat cu succes', 'success');
        } else {
            showToast('Eroare la salvare', 'error');
        }
    } catch (err) {
        showToast('Eroare de conexiune', 'error');
    }
}

// ── Section Switching ─────────────────────────────────
function switchSection(section) {
    collectCurrentSectionData();
    currentSection = section;
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
    });
    
    const titles = {
        hero: 'Hero', biography: 'Biografie', activities: 'Activități Patriotice',
        photos: 'Galerie Foto', videos: 'Galerie Video',
        contact: 'Contact', links: 'Linkuri Externe', background: 'Fundal Pagină', settings: 'Setări'
    };
    document.getElementById('sectionTitle').textContent = titles[section] || section;
    
    renderSection(section);
}

// ── Render Sections ───────────────────────────────────
function renderSection(section) {
    const area = document.getElementById('contentArea');
    
    switch(section) {
        case 'hero': area.innerHTML = renderHero(); break;
        case 'biography': area.innerHTML = renderBiography(); break;
        case 'activities': area.innerHTML = renderActivities(); break;
        case 'photos': area.innerHTML = renderPhotos(); break;
        case 'videos': area.innerHTML = renderVideos(); break;
        case 'contact': area.innerHTML = renderContact(); break;
        case 'links': area.innerHTML = renderExternalLinks(); break;
        case 'background': area.innerHTML = renderBackground(); break;
        case 'settings': area.innerHTML = renderSettings(); break;
    }
    
    initDragAndDrop();
}

// ── Helpers ──────────────────────────────────────────
function esc(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function renderBilingualField(label, idBase, values = {}, isTextarea = false) {
    const valRo = values.ro || '';
    const valEn = values.en || '';
    
    return `
        <div class="bilingual-field-group">
            <label>${label}</label>
            <div class="bilingual-inputs">
                <div class="lang-input ro">
                    <span class="lang-tag">RO</span>
                    ${isTextarea 
                        ? `<textarea id="${idBase}-ro" rows="3">${esc(valRo)}</textarea>` 
                        : `<input type="text" id="${idBase}-ro" value="${esc(valRo)}" />`}
                    <button class="btn-magic" title="Tradu în Engleză" onclick="autoTranslate('${idBase}-ro', '${idBase}-en')">🪄</button>
                </div>
                <div class="lang-input en">
                    <span class="lang-tag">EN</span>
                    ${isTextarea 
                        ? `<textarea id="${idBase}-en" rows="3">${esc(valEn)}</textarea>` 
                        : `<input type="text" id="${idBase}-en" value="${esc(valEn)}" />`}
                </div>
            </div>
        </div>
    `;
}

async function autoTranslate(sourceId, targetId) {
    const sourceEl = document.getElementById(sourceId);
    const targetEl = document.getElementById(targetId);
    if (!sourceEl || !targetEl || !sourceEl.value.trim()) return;
    
    const btn = sourceEl.nextElementSibling;
    if (btn) btn.classList.add('loading');
    
    try {
        const res = await fetch('/api/admin/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: sourceEl.value })
        });
        const data = await res.json();
        if (data.success) {
            targetEl.value = data.translatedText;
            targetEl.classList.add('success-highlight');
            showToast('✓ Traducere generată (verificați textul)', 'info');
            setTimeout(() => targetEl.classList.remove('success-highlight'), 1000);
        }
    } catch (err) {
        showToast('Eroare la traducere', 'error');
    } finally {
        if (btn) btn.classList.remove('loading');
    }
}

// ── Hero Section ──────────────────────────────────────
function renderHero() {
    const h = contentData.hero || {};
    return `
        <div class="edit-card">
            <h3>📝 Conținut Hero</h3>
            ${renderBilingualField('Titlu', 'hero-title', h.title)}
            ${renderBilingualField('Subtitlu', 'hero-subtitle', h.subtitle)}
            <div class="edit-card-row">
                ${renderBilingualField('Date', 'hero-dates', h.dates)}
                ${renderBilingualField('Citat', 'hero-quote', h.quote)}
            </div>
        </div>
        <div class="edit-card">
            <h3>🖼️ Imagine Hero</h3>
            <div class="image-preview-container">
                ${h.image ? `<img class="image-preview" src="/${h.image}" onerror="this.style.display='none'">` : `<div class="image-preview-placeholder">Fără imagine</div>`}
                <div>
                    <label class="btn-primary-sm" style="cursor:pointer;">
                        📁 Încarcă imagine
                        <input type="file" accept="image/*" onchange="uploadHeroImage(this)" style="display:none">
                    </label>
                </div>
            </div>
        </div>
    `;
}

// ── Biography Section ─────────────────────────────────
function renderBiography() {
    const b = contentData.biography || {};
    const paragraphs = b.paragraphs || [];
    
    let html = `
        <div class="edit-card">
            <h3>🖼️ Imagine Biografie</h3>
            <div class="image-preview-container">
                ${b.image ? `<img class="image-preview" src="/${b.image}" onerror="this.style.display='none'">` : `<div class="image-preview-placeholder">Fără imagine</div>`}
                <div>
                    <label class="btn-primary-sm" style="cursor:pointer;">
                        📁 Încarcă imagine
                        <input type="file" accept="image/*" onchange="uploadBioImage(this)" style="display:none">
                    </label>
                </div>
            </div>
        </div>
        <div class="edit-card">
            <h3>📝 Paragrafe Biografie</h3>
    `;
    
    paragraphs.forEach((p, i) => {
        html += `
            <div class="bilingual-paragraph-group" style="position:relative; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid var(--glass-border);">
                <span class="remove-para-btn" onclick="removeBioParagraph(${i})">✕ Șterge Paragraf</span>
                ${renderBilingualField(`Paragraf ${i + 1}`, `bio-para-${i}`, p, true)}
            </div>
        `;
    });
    
    html += `<button class="btn-add" onclick="addBioParagraph()">+ Adaugă paragraf</button></div>`;
    return html;
}

// ── Activities Section ────────────────────────────────
function renderActivities() {
    const acts = (contentData.activities || []).sort((a, b) => a.order - b.order);
    
    let html = `<div class="edit-card">
        <h3>📋 Activități Patriotice <span style="font-weight:400;color:var(--text-muted);font-size:0.7rem;margin-left:0.5rem">Trage pentru reordonare</span></h3>
        <div class="items-list" id="activitiesList">`;
    
    acts.forEach((act, i) => {
        const title = typeof act.title === 'object' ? act.title.ro : act.title;
        const text = typeof act.text === 'object' ? act.text.ro : act.text;
        
        html += `
            <div class="sortable-item" draggable="true" data-index="${i}" data-id="${act.id}">
                <span class="drag-handle">⠿</span>
                ${act.image ? `<img class="item-thumb" src="${act.image.startsWith('http') ? act.image : '/' + act.image}" onerror="this.style.display='none'">` : ''}
                <div class="item-content">
                    <div class="item-title">${esc(title)}</div>
                    <div class="item-subtitle">${esc(text).substring(0, 80)}...</div>
                </div>
                <div class="item-actions">
                    <button class="btn-icon" onclick="editActivity(${i})" title="Editează">✏️</button>
                    <button class="btn-icon danger" onclick="deleteActivity(${i})" title="Șterge">🗑️</button>
                </div>
            </div>`;
    });
    
    html += `</div><button class="btn-add" onclick="addActivity()">+ Adaugă activitate</button></div>`;
    return html;
}

// ── Photos Section ────────────────────────────────────
function renderPhotos() {
    // Asigura-te ca vechile fotografii au id-uri pentru selectie in masa
    (contentData.photos || []).forEach((p, i) => { if (!p.id) p.id = 'p-' + i + '-' + Date.now(); });
    const photos = (contentData.photos || []).sort((a, b) => a.order - b.order);
    
    let html = `
        <div class="edit-card">
            <h3>📤 Încarcă Fotografii</h3>
            <div class="upload-zone" id="photoUploadZone" onclick="document.getElementById('photoFileInput').click()">
                <div class="upload-zone-icon">📷</div>
                <p>Click sau trage fotografii aici</p>
                <input type="file" id="photoFileInput" accept="image/*" multiple onchange="uploadPhotos(this.files)" style="display:none">
            </div>
        </div>
        <div class="edit-card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <h3>🖼️ Fotografii (${photos.length})</h3>
                <div class="bulk-actions-toggle">
                    <label style="font-size:0.85rem; cursor:pointer;">
                        <input type="checkbox" id="selectAllPhotos" ${selectedPhotoIds.size === photos.length && photos.length > 0 ? 'checked' : ''} onchange="toggleSelectAllPhotos(this.checked)"> 
                        Selectează Tot
                    </label>
                </div>
            </div>
            <div class="admin-gallery-grid" id="photosGrid">`;
    
    photos.forEach((photo, i) => {
        const isSelected = selectedPhotoIds.has(photo.id);
        html += `
            <div class="admin-gallery-item ${isSelected ? 'selected' : ''}" draggable="true" data-index="${i}" data-id="${photo.id}">
                <div class="item-selector" style="position:absolute;top:5px;left:5px;z-index:10;background:rgba(0,0,0,0.5);border-radius:4px;padding:2px">
                    <input type="checkbox" class="photo-checkbox" data-id="${photo.id}" ${isSelected ? 'checked' : ''} onchange="togglePhotoSelection('${photo.id}', this.checked)">
                </div>
                <img src="${photo.src.startsWith('http') ? photo.src : '/' + photo.src}" alt="${esc(photo.caption)}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 200%22><rect fill=%22%23232734%22 width=%22300%22 height=%22200%22/><text x=%22150%22 y=%22100%22 fill=%22%235c6078%22 text-anchor=%22middle%22 font-size=%2214%22>Eroare</text></svg>'">
                <div class="item-overlay">
                    <button class="btn-icon" onclick="editPhoto(${i})" title="Editează">✏️</button>
                    <button class="btn-icon danger" onclick="deletePhoto(${i})" title="Șterge">🗑️</button>
                </div>
                <div class="admin-gallery-caption">${esc(photo.caption && photo.caption.ro ? photo.caption.ro : photo.caption)}</div>
            </div>`;
    });
    
    html += `</div>
        <div id="bulkActionsBarPhotos" class="bulk-actions-bar ${selectedPhotoIds.size > 0 ? 'active' : ''}">
            <span>${selectedPhotoIds.size} selectate</span>
            <div class="bulk-buttons">
                <button class="btn-small danger" onclick="bulkDeletePhotos()">🗑️ Ștergere în masă</button>
            </div>
        </div>
    </div>`;
    return html;
}

// ── Photo Bulk Actions ───────────────────────────────
function toggleSelectAllPhotos(checked) {
    selectedPhotoIds.clear();
    if (checked) {
        (contentData.photos || []).forEach(p => selectedPhotoIds.add(p.id));
    }
    renderSection('photos');
}

function togglePhotoSelection(id, checked) {
    if (checked) selectedPhotoIds.add(id);
    else selectedPhotoIds.delete(id);
    renderSection('photos');
}

function bulkDeletePhotos() {
    if (selectedPhotoIds.size === 0) return;
    if (confirm(`Sigur vrei să ștergi ${selectedPhotoIds.size} fotografii?`)) {
        contentData.photos = contentData.photos.filter(p => !selectedPhotoIds.has(p.id));
        selectedPhotoIds.clear();
        contentData.photos.forEach((p, i) => p.order = i); // Normalize order
        renderSection('photos');
        showToast('✓ Fotografiile au fost șterse local. Salvează pentru confirmare permanentă.', 'success');
    }
}

// ── Videos Section ────────────────────────────────────
function renderVideos() {
    const vids = (contentData.videos || []).sort((a, b) => a.order - b.order);
    
    let html = `<div class="edit-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
            <h3>🎬 Videoclipuri (${vids.length})</h3>
            <div class="bulk-actions-toggle">
                <label style="font-size:0.85rem; cursor:pointer;">
                    <input type="checkbox" id="selectAllVideos" ${selectedVideoIds.size === vids.length && vids.length > 0 ? 'checked' : ''} onchange="toggleSelectAllVideos(this.checked)"> 
                    Selectează Tot
                </label>
            </div>
        </div>
        
        <div class="items-list" id="videosList">`;
    
    vids.forEach((vid, i) => {
        const ytId = getYouTubeId(vid.url);
        const thumbUrl = ytId ? `https://img.youtube.com/vi/${ytId}/default.jpg` : (vid.thumbnail || '');
        const isSelected = selectedVideoIds.has(vid.id);
        
        html += `
            <div class="sortable-item ${isSelected ? 'selected' : ''}" draggable="true" data-index="${i}" data-id="${vid.id}">
                <div class="item-selector">
                    <input type="checkbox" class="video-checkbox" data-id="${vid.id}" ${isSelected ? 'checked' : ''} onchange="toggleVideoSelection('${vid.id}', this.checked)">
                </div>
                <span class="drag-handle">⠿</span>
                <div class="item-thumb-mini" style="width:40px;height:30px;background:#eee;border-radius:4px;overflow:hidden;margin-right:1rem;display:flex;align-items:center;justify-content:center;">
                    ${ytId || vid.thumbnail ? 
                        `<img src="${thumbUrl}" style="width:100%;height:100%;object-fit:cover;">` :
                        (vid.type === 'file' ? `<video src="/${vid.url}" muted preload="metadata" style="width:100%;height:100%;object-fit:cover;"></video>` : '🎬')
                    }
                </div>
                <div class="item-content">
                    <div class="item-title">${esc(vid.title && vid.title.ro ? vid.title.ro : (typeof vid.title === 'object' ? '' : vid.title))}</div>
                    <div class="item-subtitle">${vid.type === 'youtube' ? '▶ YouTube' : vid.type === 'file' ? '📁 Fișier' : '🔗 Link'}: ${esc(vid.url || 'Fără URL')}</div>
                </div>
                <div class="item-actions">
                    <button class="btn-icon" onclick="editVideo(${i})" title="Editează">✏️</button>
                    <button class="btn-icon danger" onclick="deleteVideo(${i})" title="Șterge">🗑️</button>
                </div>
            </div>`;
    });
    
    html += `</div>
        <div id="bulkActionsBar" class="bulk-actions-bar ${selectedVideoIds.size > 0 ? 'active' : ''}">
            <span>${selectedVideoIds.size} selectate</span>
            <div class="bulk-buttons">
                <button class="btn-small" onclick="bulkEditVideos()">📝 Editare în masă</button>
                <button class="btn-small danger" onclick="bulkDeleteVideos()">🗑️ Ștergere în masă</button>
            </div>
        </div>
        <button class="btn-add" onclick="addVideo()">+ Adaugă videoclip</button>
    </div>
    <div class="edit-card">
        <h3>📤 Încarcă Video Local</h3>
        <div class="upload-zone" onclick="document.getElementById('videoFileInput').click()">
            <div class="upload-zone-icon">🎬</div>
            <p>Click pentru a încărca fișiere video (max 200MB/fiecare)</p>
            <input type="file" id="videoFileInput" accept="video/*" multiple onchange="uploadVideoFiles(this.files)" style="display:none">
        </div>
    </div>`;
    return html;
}

// ── Bulk Actions Logic ────────────────────────────────
function toggleVideoSelection(id, checked) {
    if (checked) selectedVideoIds.add(id);
    else selectedVideoIds.delete(id);
    renderSection('videos');
}

function toggleSelectAllVideos(checked) {
    if (checked) {
        contentData.videos.forEach(v => selectedVideoIds.add(v.id));
    } else {
        selectedVideoIds.clear();
    }
    renderSection('videos');
}

async function bulkDeleteVideos() {
    if (selectedVideoIds.size === 0) return;
    if (confirm(`Sigur vrei să ștergi ${selectedVideoIds.size} videoclipuri?`)) {
        contentData.videos = contentData.videos.filter(v => !selectedVideoIds.has(v.id));
        selectedVideoIds.clear();
        contentData.videos.forEach((v, i) => v.order = i); // Normalize order
        renderSection('videos');
        showToast('✓ Videoclipurile au fost șterse local. Salvează pentru confirmare permanentă.', 'success');
    }
}

function bulkEditVideos() {
    if (selectedVideoIds.size === 0) return;
    showModal('Editare în masă', `
        <p>Schimbă setările pentru cele ${selectedVideoIds.size} videoclipuri selectate.</p>
        <div class="form-field">
            <label>Tip Video (pentru toate)</label>
            <select id="bulk-vid-type">
                <option value="">-- Nicio schimbare --</option>
                <option value="youtube">YouTube</option>
                <option value="file">Fișier local</option>
            </select>
        </div>
        <div class="form-field">
            <label>Șterge URL/Thumbnail?</label>
            <div style="display:flex; gap:1rem; margin-top:0.5rem;">
                <label><input type="checkbox" id="bulk-clear-thumb"> Șterge Thumbnails</label>
            </div>
        </div>
    `, () => {
        const newType = document.getElementById('bulk-vid-type').value;
        const clearThumb = document.getElementById('bulk-clear-thumb').checked;

        contentData.videos.forEach(v => {
            if (selectedVideoIds.has(v.id)) {
                if (newType) v.type = newType;
                if (clearThumb) v.thumbnail = '';
            }
        });

        renderSection('videos');
        showToast(`✓ Actualizat ${selectedVideoIds.size} videoclipuri`, 'success');
    });
}

// ── Contact Section ───────────────────────────────────
function renderContact() {
    const c = contentData.contact || {};
    return `
        <div class="edit-card">
            <h3>📧 Informații Contact</h3>
            <div class="form-field">
                <label>Email</label>
                <input type="email" id="contact-email" value="${esc(c.email || '')}" />
            </div>
            <div class="form-field">
                <label>Telefon</label>
                <input type="text" id="contact-phone" value="${esc(c.phone || '')}" />
            </div>
            ${renderBilingualField('Adresă', 'contact-address', c.address)}
        </div>
    `;
}

// ── Background Section ────────────────────────────────
const GRADIENT_PRESETS = [
    { name: 'Original', value: 'linear-gradient(135deg, #002B7F 0%, #FCD116 50%, #CE1126 100%)' },
    { name: 'România Clasic', value: 'linear-gradient(135deg, #002B7F 0%, #002B7F 33%, #FCD116 33%, #FCD116 66%, #CE1126 66%, #CE1126 100%)' },
    { name: 'Noapte Albastră', value: 'linear-gradient(135deg, #0c0c1d 0%, #1a2a6c 50%, #2a4a8c 100%)' },
    { name: 'Elegant Auriu', value: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #c9a961 100%)' },
    { name: 'Regal', value: 'linear-gradient(135deg, #1a0533 0%, #3b1261 40%, #6b21a8 100%)' },
    { name: 'Patriotic Moale', value: 'linear-gradient(135deg, #1a2744 0%, #2c4a7c 33%, #b8952e 66%, #8b2232 100%)' },
    { name: 'Sobru', value: 'linear-gradient(135deg, #1a1a1a 0%, #2c3e50 50%, #34495e 100%)' },
    { name: 'Amurg', value: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
    { name: 'Aurora', value: 'linear-gradient(135deg, #0f2027 0%, #203a43 33%, #2c5364 66%, #0f2027 100%)' },
    { name: 'Negru Pur', value: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #000000 100%)' },
];

function renderBackground() {
    const bg = contentData.background || {};
    const currentGradient = bg.heroGradient || GRADIENT_PRESETS[0].value;
    const currentOverlay = bg.heroOverlayOpacity ?? 0.3;
    const currentNavBg = bg.navBackground || 'rgba(255, 255, 255, 0.98)';
    const currentSectionBg = bg.sectionAltBg || '#f8f9fa';
    const currentFooterBg = bg.footerBg || '#2c3e50';
    const bgImage = bg.heroBackgroundImage || '';
    
    let html = `
        <div class="edit-card">
            <h3>🎨 Fundal Hero</h3>
            <p style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:1rem">Alege un gradient sau personalizează fundalul secțiunii Hero.</p>
            <div class="bg-preview" id="bgPreview" style="background: ${currentGradient};">
                <span class="bg-preview-label">Preview Hero</span>
            </div>
            <div class="gradient-presets" id="gradientPresets">`;
    
    GRADIENT_PRESETS.forEach((preset, i) => {
        const isActive = currentGradient === preset.value;
        html += `<div class="gradient-preset ${isActive ? 'active' : ''}" 
                      style="background: ${preset.value}" 
                      title="${preset.name}"
                      onclick="selectGradient(${i})"></div>`;
    });
    
    html += `</div>
            <div class="form-field" style="margin-top:1rem">
                <label>Gradient CSS personalizat</label>
                <input type="text" id="bg-hero-gradient" value="${esc(currentGradient)}" oninput="previewGradient(this.value)" />
            </div>
        </div>
        
        <div class="edit-card">
            <h3>🖼️ Imagine fundal Hero (opțional)</h3>
            <p style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.75rem">Dacă adaugi o imagine, aceasta se va afișa peste gradient.</p>
            <div class="image-preview-container">
                ${bgImage ? `<img class="image-preview" src="/${bgImage}" onerror="this.style.display='none'" style="width:160px;height:90px">` : `<div class="image-preview-placeholder" style="width:160px;height:90px">Fără imagine</div>`}
                <div>
                    <label class="btn-primary-sm" style="cursor:pointer;">
                        📁 Încarcă imagine fundal
                        <input type="file" accept="image/*" onchange="uploadBgImage(this)" style="display:none">
                    </label>
                    ${bgImage ? `<button class="btn-icon danger" onclick="removeBgImage()" style="margin-top:0.4rem;width:auto;padding:0.3rem 0.6rem;font-size:0.7rem">✕ Elimină</button>` : ''}
                </div>
            </div>
        </div>

        <div class="edit-card">
            <h3>🔧 Overlay & Culori Pagină</h3>
            <div class="form-field">
                <label>Opacitate overlay Hero (0 = transparent, 1 = opac)</label>
                <input type="range" id="bg-overlay-opacity" min="0" max="1" step="0.05" value="${currentOverlay}" 
                    style="width:100%;accent-color:var(--accent)" oninput="document.getElementById('overlayVal').textContent = this.value">
                <span id="overlayVal" style="font-size:0.75rem;color:var(--text-secondary)">${currentOverlay}</span>
            </div>
            <div class="edit-card-row">
                <div class="form-field">
                    <label>Culoare fundal secțiuni alternante</label>
                    <div class="color-picker-row">
                        <div class="color-swatch"><input type="color" id="bg-section-alt" value="${currentSectionBg}" oninput="syncColor(this, 'bg-section-alt-text')"></div>
                        <input type="text" id="bg-section-alt-text" value="${esc(currentSectionBg)}" style="flex:1" oninput="syncColorText(this, 'bg-section-alt')" />
                    </div>
                </div>
                <div class="form-field">
                    <label>Culoare fundal footer</label>
                    <div class="color-picker-row">
                        <div class="color-swatch"><input type="color" id="bg-footer" value="${currentFooterBg}" oninput="syncColor(this, 'bg-footer-text')"></div>
                        <input type="text" id="bg-footer-text" value="${esc(currentFooterBg)}" style="flex:1" oninput="syncColorText(this, 'bg-footer')" />
                    </div>
                </div>
            </div>
        </div>`;
    
    return html;
}

function selectGradient(index) {
    const preset = GRADIENT_PRESETS[index];
    document.getElementById('bg-hero-gradient').value = preset.value;
    previewGradient(preset.value);
    
    document.querySelectorAll('.gradient-preset').forEach((el, i) => {
        el.classList.toggle('active', i === index);
    });
}

function previewGradient(value) {
    const preview = document.getElementById('bgPreview');
    if (preview) {
        try { preview.style.background = value; } catch(e) {}
    }
}

function syncColor(picker, textId) {
    document.getElementById(textId).value = picker.value.toUpperCase();
}

function syncColorText(text, pickerId) {
    const val = text.value;
    if (/^#[0-9A-F]{6}$/i.test(val)) {
        document.getElementById(pickerId).value = val;
    }
}

async function uploadBgImage(input) {
    const file = input.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
        const res = await fetch('/api/upload/photo', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            contentData.background = contentData.background || {};
            contentData.background.heroBackgroundImage = data.path;
            renderSection('background');
            showToast('✓ Imagine fundal încărcată', 'success');
        }
    } catch (err) {
        showToast('Eroare la încărcare', 'error');
    }
}

function removeBgImage() {
    contentData.background = contentData.background || {};
    contentData.background.heroBackgroundImage = '';
    renderSection('background');
    showToast('✓ Imagine fundal eliminată', 'info');
}

// ── Settings Section ──────────────────────────────────
function renderSettings() {
    const s = contentData.settings || {};
    return `
        <div class="edit-card">
            <h3>🌐 Setări Site (Favicon)</h3>
            <p style="color:var(--text-secondary);font-size:0.75rem;margin-bottom:0.75rem">Favicon este mica iconiță ce apare în tab-ul browserului.</p>
            <div class="image-preview-container">
                ${s.favicon ? `<img class="image-preview" src="${s.favicon.startsWith('http') ? s.favicon : '/' + s.favicon}" onerror="this.style.display='none'" style="width:48px;height:48px;border-radius:8px">` : `<div class="image-preview-placeholder" style="width:48px;height:48px;border-radius:8px">❌</div>`}
                <div>
                    <label class="btn-primary-sm" style="cursor:pointer;display:inline-block">
                        📁 Încarcă Favicon (PNG/ICO)
                        <input type="file" accept=".png,.ico,image/png,image/x-icon" onchange="uploadFavicon(this)" style="display:none">
                    </label>
                </div>
            </div>
        </div>
        <div class="edit-card">
            <h3>👥 Email-uri Administrator</h3>
            <p style="color:var(--text-secondary);font-size:0.75rem;margin-bottom:0.75rem">Email-urile care au acces la panoul de administrare.</p>
            <div id="adminEmailsList"></div>
            <div style="display:flex;gap:0.4rem;margin-top:0.75rem">
                <input type="email" id="newAdminEmail" placeholder="email@exemplu.ro" style="flex:1;padding:0.55rem 0.85rem;background:rgba(255,255,255,0.06);border:1px solid var(--glass-border);border-radius:8px;color:var(--text-primary);font-family:inherit;font-size:0.85rem;outline:none">
                <button class="btn-primary-sm" onclick="addAdminEmail()">+ Adaugă</button>
            </div>
        </div>
        <div class="edit-card">
            <h3>📝 Text Subsol (Footer)</h3>
            <p style="color:var(--text-secondary);font-size:0.75rem;margin-bottom:0.75rem">Textul de copyright de la baza site-ului.</p>
            <div class="form-field">
                <input type="text" id="settingFooterText" value="${String(s.footerText || '© ' + new Date().getFullYear() + ' Memorial Ilie Ilașcu (1952-2025). Toate drepturile rezervate.').replace(/\"/g, '&quot;')}" style="width:100%;padding:0.65rem;background:rgba(255,255,255,0.06);border:1px solid var(--glass-border);border-radius:8px;color:var(--text-primary);outline:none">
                <button class="btn-primary-sm" onclick="saveFooterText()" style="margin-top:0.5rem">Actualizează Footer</button>
            </div>
        </div>
        <div class="edit-card">
            <h3>🔒 Securitate (Schimbă Parola)</h3>
            <p style="color:var(--text-secondary);font-size:0.75rem;margin-bottom:1rem">Schimbă parola de acces pentru panoul de administrare.</p>
            <div class="form-field">
                <label>Parolă Nouă</label>
                <input type="password" id="newAdminPassword" placeholder="Minim 4 caractere" />
            </div>
            <div class="form-field">
                <label>Confirmă Parola</label>
                <input type="password" id="confirmAdminPassword" placeholder="••••••••" />
            </div>
            <button class="btn-primary-sm" onclick="changePassword()">Actualizează Parola</button>
        </div>
    `;
}

async function changePassword() {
    const newPass = document.getElementById('newAdminPassword').value;
    const confirmPass = document.getElementById('confirmAdminPassword').value;
    
    if (!newPass || newPass.length < 4) {
        showToast('Parola este prea scurtă!', 'error');
        return;
    }
    
    if (newPass !== confirmPass) {
        showToast('Parolele nu se potrivesc!', 'error');
        return;
    }
    
    try {
        const res = await fetch('/api/admin/password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newPassword: newPass })
        });
        
        if (res.ok) {
            showToast('✓ Parola a fost actualizată', 'success');
            document.getElementById('newAdminPassword').value = '';
            document.getElementById('confirmAdminPassword').value = '';
        } else {
            const data = await res.json();
            showToast(data.error || 'Eroare la schimbarea parolei', 'error');
        }
    } catch (err) {
        showToast('Eroare de conexiune', 'error');
    }
}

async function saveFooterText() {
    const text = document.getElementById('settingFooterText').value;
    contentData.settings = contentData.settings || {};
    contentData.settings.footerText = text;
    await saveAllContent();
    showToast('✓ Footer actualizat și salvat online', 'success');
}

async function uploadFavicon(input) {
    const file = input.files[0];
    if (!file) return;
    showToast('Se încarcă favicon...', 'info');
    const formData = new FormData();
    formData.append('files', file); // backend expects 'files' array
    try {
        const res = await fetch('/api/upload/photo', { method: 'POST', body: formData });
        const data = await res.json();
        // The backend returns an array of results
        if (data && data[0] && data[0].success) {
            contentData.settings = contentData.settings || {};
            contentData.settings.favicon = data[0].path;
            renderSection('settings');
            
            // Actualizează favicon-ul în admin instantaneu
            let link = document.querySelector("link[rel~='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
            }
            link.href = data[0].path;
            
            await saveAllContent();
            // showToast is already handled inside saveAllContent, but we can add a specific message if needed
        } else {
            showToast('Eroare la procesarea fișierului', 'error');
        }
    } catch (err) { 
        console.error(err);
        showToast('Eroare la încărcare favicon', 'error'); 
    }
}

// ── Collect Form Data ─────────────────────────────────
function collectCurrentSectionData() {
    switch(currentSection) {
        case 'hero':
            if (document.getElementById('hero-title-ro')) {
                contentData.hero = contentData.hero || {};
                contentData.hero.title = { ro: document.getElementById('hero-title-ro').value, en: document.getElementById('hero-title-en').value };
                contentData.hero.subtitle = { ro: document.getElementById('hero-subtitle-ro').value, en: document.getElementById('hero-subtitle-en').value };
                contentData.hero.dates = { ro: document.getElementById('hero-dates-ro').value, en: document.getElementById('hero-dates-en').value };
                contentData.hero.quote = { ro: document.getElementById('hero-quote-ro').value, en: document.getElementById('hero-quote-en').value };
            }
            break;
        case 'biography':
            const paraGroups = document.querySelectorAll('.bilingual-paragraph-group');
            if (paraGroups.length) {
                contentData.biography = contentData.biography || {};
                contentData.biography.paragraphs = Array.from(paraGroups).map((group, i) => {
                    return {
                        ro: document.getElementById(`bio-para-${i}-ro`).value,
                        en: document.getElementById(`bio-para-${i}-en`).value
                    };
                });
            }
            break;
        case 'contact':
            if (document.getElementById('contact-email')) {
                contentData.contact = contentData.contact || {};
                contentData.contact.email = document.getElementById('contact-email').value;
                contentData.contact.phone = document.getElementById('contact-phone').value;
                contentData.contact.address = { 
                    ro: document.getElementById('contact-address-ro').value, 
                    en: document.getElementById('contact-address-en').value 
                };
            }
            break;
        case 'background':
            if (document.getElementById('bg-hero-gradient')) {
                contentData.background = contentData.background || {};
                contentData.background.heroGradient = document.getElementById('bg-hero-gradient').value;
                contentData.background.heroOverlayOpacity = parseFloat(document.getElementById('bg-overlay-opacity').value);
                
                const sectionText = document.getElementById('bg-section-alt-text');
                contentData.background.sectionAltBg = sectionText ? sectionText.value : '#f8f9fa';
                
                const footerText = document.getElementById('bg-footer-text');
                contentData.background.footerBg = footerText ? footerText.value : '#2c3e50';
            }
            break;
        case 'links':
            // Managed via modals
            break;
    }
}

// ── Upload Functions ──────────────────────────────────
async function uploadHeroImage(input) {
    const file = input.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
        const res = await fetch('/api/upload/photo', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            contentData.hero.image = data.path;
            renderSection('hero');
            showToast('✓ Imagine hero încărcată', 'success');
        }
    } catch (err) { showToast('Eroare la încărcare', 'error'); }
}

async function uploadBioImage(input) {
    const file = input.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
        const res = await fetch('/api/upload/photo', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            contentData.biography = contentData.biography || {};
            contentData.biography.image = data.path;
            renderSection('biography');
            showToast('✓ Imagine biografie încărcată', 'success');
        }
    } catch (err) { showToast('Eroare la încărcare', 'error'); }
}

async function uploadPhotos(files) {
    if (!files || files.length === 0) return;
    
    const formData = new FormData();
    for (const file of files) {
        formData.append('files', file);
    }
    
    try {
        showToast(`📤 Se încarcă ${files.length} fotografi${files.length > 1 ? 'i' : 'e'}...`, 'info');
        const res = await fetch('/api/upload/photo', { method: 'POST', body: formData });
        const results = await res.json(); // Added this line
        if (res.ok && Array.isArray(results)) {
            results.forEach((data, index) => {
                if (data.success) {
                    const file = files[index];
                    contentData.photos = contentData.photos || [];
                    contentData.photos.push({
                        id: 'photo-' + Date.now() + Math.random().toString(36).substr(2,4),
                        src: data.path,
                        caption: { 
                            ro: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
                            en: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
                        },
                        order: contentData.photos.length
                    });
                }
            });
            renderSection('photos');
            showToast(`✓ Încărcare finalizată`, 'success');
        } else {
            showToast(results.error || 'Eroare la încărcare', 'error');
        }
    } catch (err) { 
        showToast('Eroare la încărcarea fotografiilor', 'error'); 
    }
}

async function uploadVideoFiles(files) {
    if (!files || files.length === 0) return;
    
    const formData = new FormData();
    for (const file of files) {
        formData.append('files', file);
    }
    
    try {
        showToast(`📤 Se încarcă ${files.length} videoclipuri...`, 'info');
        const res = await fetch('/api/upload/video', { method: 'POST', body: formData });
        const results = await res.json();
        
        results.forEach((data, index) => {
            if (data.success) {
                const file = files[index];
                contentData.videos = contentData.videos || [];
                contentData.videos.push({
                    id: 'video-' + Date.now() + index,
                    url: data.path,
                    title: {
                        ro: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
                        en: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
                    },
                    type: 'file',
                    order: contentData.videos.length
                });
            }
        });
        
        renderSection('videos');
        showToast(`✓ Încărcare finalizată`, 'success');
    } catch (err) { 
        showToast('Eroare la încărcarea videoclipurilor', 'error'); 
    }
}

// ── CRUD: Activities ──────────────────────────────────
function addActivity() {
    showModal('Adaugă Activitate', `
        ${renderBilingualField('Titlu', 'modal-act-title')}
        ${renderBilingualField('Descriere (Scurtă prezentare)', 'modal-act-text', {}, true)}
        <div class="form-field"><label>🔗 Sursă Web (Wikipedia, Știri, etc. - Opțional)</label><input type="text" id="modal-act-link" placeholder="https://..." /></div>
        
        <div style="margin-top:1.5rem;padding:1rem;background:rgba(255,255,255,0.03);border:1px dashed var(--glass-border);border-radius:8px">
            <h4 style="font-size:0.8rem;margin-bottom:0.75rem;color:var(--text-secondary)">Imagine (URL sau Upload)</h4>
            <div class="form-field">
                <label>🌐 URL Imagine web</label>
                <div style="display:flex;gap:0.5rem">
                    <input type="text" id="modal-act-image" placeholder="https://..." style="flex:1" />
                    <label class="btn-primary-sm" style="cursor:pointer;white-space:nowrap">
                        📁 Încarcă 
                        <input type="file" accept="image/*" onchange="uploadActivityImage(this)" style="display:none">
                    </label>
                </div>
            </div>
        </div>
    `, () => {
        contentData.activities = contentData.activities || [];
        contentData.activities.push({
            id: 'act-' + Date.now(), 
            title: { ro: document.getElementById('modal-act-title-ro').value, en: document.getElementById('modal-act-title-en').value },
            text: { ro: document.getElementById('modal-act-text-ro').value, en: document.getElementById('modal-act-text-en').value }, 
            link: document.getElementById('modal-act-link').value,
            image: document.getElementById('modal-act-image').value,
            order: contentData.activities.length
        });
        renderSection('activities');
        showToast('✓ Activitate adăugată', 'success');
    });
}

function editActivity(index) {
    const act = contentData.activities[index];
    showModal('Editează Activitate', `
        ${renderBilingualField('Titlu', 'modal-act-title', act.title)}
        ${renderBilingualField('Descriere', 'modal-act-text', act.text, true)}
        <div class="form-field"><label>🔗 Sursă Web (Wikipedia, Știri, etc. - Opțional)</label><input type="text" id="modal-act-link" value="${esc(act.link || '')}" placeholder="https://..." /></div>
        
        <div style="margin-top:1.5rem;padding:1rem;background:rgba(255,255,255,0.03);border:1px dashed var(--glass-border);border-radius:8px">
            <h4 style="font-size:0.8rem;margin-bottom:0.75rem;color:var(--text-secondary)">Actualizează imaginea</h4>
            <div class="form-field">
                <label>🌐 URL Imagine web</label>
                <div style="display:flex;gap:0.5rem">
                    <input type="text" id="modal-act-image" value="${esc(act.image || '')}" style="flex:1" />
                    <label class="btn-primary-sm" style="cursor:pointer;white-space:nowrap">
                        📁 Încarcă 
                        <input type="file" accept="image/*" onchange="uploadActivityImage(this)" style="display:none">
                    </label>
                </div>
            </div>
        </div>
    `, () => {
        contentData.activities[index].title = { ro: document.getElementById('modal-act-title-ro').value, en: document.getElementById('modal-act-title-en').value };
        contentData.activities[index].text = { ro: document.getElementById('modal-act-text-ro').value, en: document.getElementById('modal-act-text-en').value };
        contentData.activities[index].link = document.getElementById('modal-act-link').value;
        contentData.activities[index].image = document.getElementById('modal-act-image').value;
        renderSection('activities');
        showToast('✓ Activitate actualizată', 'success');
    });
}

function deleteActivity(index) {
    if (confirm('Sigur vrei să ștergi această activitate?')) {
        contentData.activities.splice(index, 1);
        contentData.activities.forEach((a, i) => a.order = i);
        renderSection('activities');
        showToast('✓ Activitate ștearsă', 'info');
    }
}

async function uploadActivityImage(input) {
    const file = input.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
        const res = await fetch('/api/upload/photo', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            document.getElementById('modal-act-image').value = data.path;
            showToast('✓ Imagine încărcată', 'success');
        }
    } catch (err) { showToast('Eroare', 'error'); }
}

// ── CRUD: Photos ──────────────────────────────────────
function editPhoto(index) {
    const photo = contentData.photos[index];
    showModal('Editează Fotografie', `
        <div class="image-preview-container" style="margin-bottom:1rem">
            <img class="image-preview" src="${photo.src.startsWith('http') ? photo.src : '/' + photo.src}" onerror="this.style.display='none'" style="width:180px;height:135px;">
        </div>
        ${renderBilingualField('Descriere', 'modal-photo-caption', photo.caption)}
        <div class="form-field"><label>Sursă imagine</label><input type="text" id="modal-photo-src" value="${esc(photo.src)}" /></div>
    `, () => {
        contentData.photos[index].caption = { ro: document.getElementById('modal-photo-caption-ro').value, en: document.getElementById('modal-photo-caption-en').value };
        contentData.photos[index].src = document.getElementById('modal-photo-src').value;
        renderSection('photos');
        showToast('✓ Fotografie actualizată', 'success');
    });
}

function deletePhoto(index) {
    if (confirm('Sigur vrei să ștergi această fotografie?')) {
        contentData.photos.splice(index, 1);
        contentData.photos.forEach((p, i) => p.order = i);
        renderSection('photos');
        showToast('✓ Fotografie ștearsă', 'info');
    }
}

// ── CRUD: Videos ──────────────────────────────────────
function addVideo() {
        showModal('Adaugă Videoclip', `
        ${renderBilingualField('Titlu', 'modal-vid-title')}
        <div class="form-field"><label>Tip</label>
            <select id="modal-vid-type"><option value="youtube">YouTube</option><option value="file">Fișier local</option><option value="link">Link extern</option></select>
        </div>
        <div class="form-field"><label>URL</label><input type="text" id="modal-vid-url" placeholder="https://www.youtube.com/embed/..." oninput="autoFetchThumb(this.value)" /></div>
        <div class="form-field"><label>Thumbnail URL (opțional)</label><input type="text" id="modal-vid-thumb" placeholder="https://... sau cale locală" /></div>
    `, () => {
        contentData.videos = contentData.videos || [];
        contentData.videos.push({
            id: 'video-' + Date.now(), 
            title: { ro: document.getElementById('modal-vid-title-ro').value, en: document.getElementById('modal-vid-title-en').value },
            type: document.getElementById('modal-vid-type').value, 
            url: document.getElementById('modal-vid-url').value,
            thumbnail: document.getElementById('modal-vid-thumb').value,
            order: contentData.videos.length
        });
        renderSection('videos');
        showToast('✓ Videoclip adăugat', 'success');
    });
}

function editVideo(index) {
    const vid = contentData.videos[index];
    showModal('Editează Videoclip', `
        ${renderBilingualField('Titlu', 'modal-vid-title', vid.title)}
        <div class="form-field"><label>Tip</label>
            <select id="modal-vid-type">
                <option value="youtube" ${vid.type==='youtube'?'selected':''}>YouTube</option>
                <option value="file" ${vid.type==='file'?'selected':''}>Fișier local</option>
                <option value="link" ${vid.type==='link'?'selected':''}>Link extern</option>
            </select>
        </div>
        <div class="form-field"><label>URL</label><input type="text" id="modal-vid-url" value="${esc(vid.url || '')}" oninput="autoFetchThumb(this.value)" /></div>
        <div class="form-field"><label>Thumbnail URL</label><input type="text" id="modal-vid-thumb" value="${esc(vid.thumbnail || '')}" /></div>
    `, () => {
        contentData.videos[index].title = { ro: document.getElementById('modal-vid-title-ro').value, en: document.getElementById('modal-vid-title-en').value };
        contentData.videos[index].type = document.getElementById('modal-vid-type').value;
        contentData.videos[index].url = document.getElementById('modal-vid-url').value;
        contentData.videos[index].thumbnail = document.getElementById('modal-vid-thumb').value;
        renderSection('videos');
        showToast('✓ Videoclip actualizat', 'success');
    });
}

function deleteVideo(index) {
    if (confirm('Sigur vrei să ștergi acest videoclip?')) {
        const vids = (contentData.videos || []).sort((a, b) => a.order - b.order);
        const vidToDelete = vids[index];
        if (vidToDelete) {
            selectedVideoIds.delete(vidToDelete.id);
            contentData.videos = contentData.videos.filter(v => v.id !== vidToDelete.id);
            contentData.videos.forEach((v, i) => v.order = i); // Normalize order
        }
        renderSection('videos');
        showToast('✓ Videoclip șters local. Apasă "Salvează" pentru permanentizare.', 'info');
    }
}

// ── CRUD: Biography ───────────────────────────────────
function addBioParagraph() {
    collectCurrentSectionData();
    contentData.biography = contentData.biography || {};
    contentData.biography.paragraphs = contentData.biography.paragraphs || [];
    contentData.biography.paragraphs.push('');
    renderSection('biography');
}

function removeBioParagraph(index) {
    collectCurrentSectionData();
    contentData.biography.paragraphs.splice(index, 1);
    renderSection('biography');
}

// ── Settings: Admin Emails ────────────────────────────
async function addAdminEmail() {
    const email = document.getElementById('newAdminEmail').value.trim();
    if (!email) return;
    try {
        const res = await fetch('/api/admin/emails');
        const emails = await res.json();
        if (!emails.includes(email)) {
            emails.push(email);
            await fetch('/api/admin/emails', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emails })
            });
            showToast('✓ Admin adăugat: ' + email, 'success');
            document.getElementById('newAdminEmail').value = '';
            loadAdminEmails();
        }
    } catch (err) { showToast('Eroare', 'error'); }
}

async function loadAdminEmails() {
    try {
        const res = await fetch('/api/admin/emails');
        const emails = await res.json();
        const container = document.getElementById('adminEmailsList');
        if (!container) return;
        container.innerHTML = emails.map(email => `
            <div style="display:flex;align-items:center;gap:0.6rem;padding:0.45rem 0.65rem;background:rgba(255,255,255,0.05);border:1px solid var(--glass-border);border-radius:8px;margin-bottom:0.35rem;">
                <span style="flex:1;font-size:0.82rem;font-weight:500">${esc(email)}</span>
                <button class="btn-icon danger" onclick="removeAdminEmail('${esc(email)}')" title="Elimină">🗑️</button>
            </div>
        `).join('');
    } catch (err) {}
}

async function removeAdminEmail(email) {
    if (!confirm('Elimini admin: ' + email + '?')) return;
    try {
        const res = await fetch('/api/admin/emails');
        const emails = await res.json();
        const filtered = emails.filter(e => e !== email);
        if (filtered.length === 0) { showToast('Trebuie cel puțin un admin!', 'error'); return; }
        await fetch('/api/admin/emails', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emails: filtered })
        });
        showToast('✓ Admin eliminat', 'info');
        loadAdminEmails();
    } catch (err) { showToast('Eroare', 'error'); }
}

// ── Drag & Drop ───────────────────────────────────────
function initDragAndDrop() {
    const containers = document.querySelectorAll('.items-list, .admin-gallery-grid');
    
    containers.forEach(container => {
        const items = container.querySelectorAll('[draggable="true"]');
        items.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                item.classList.add('dragging');
                e.dataTransfer.setData('text/plain', item.dataset.index);
                e.dataTransfer.effectAllowed = 'move';
            });
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            });
            item.addEventListener('dragover', (e) => { e.preventDefault(); item.classList.add('drag-over'); });
            item.addEventListener('dragleave', () => { item.classList.remove('drag-over'); });
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('drag-over');
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const toIndex = parseInt(item.dataset.index);
                if (fromIndex === toIndex) return;
                
                if (currentSection === 'activities') {
                    reorderArray(contentData.activities, fromIndex, toIndex);
                    contentData.activities.forEach((a, i) => a.order = i);
                    renderSection('activities');
                } else if (currentSection === 'photos') {
                    reorderArray(contentData.photos, fromIndex, toIndex);
                    contentData.photos.forEach((p, i) => p.order = i);
                    renderSection('photos');
                } else if (currentSection === 'videos') {
                    reorderArray(contentData.videos, fromIndex, toIndex);
                    contentData.videos.forEach((v, i) => v.order = i);
                    renderSection('videos');
                }
                showToast('✓ Ordine actualizată', 'success');
            });
        });
    });

    if (currentSection === 'settings') loadAdminEmails();
    
    // Upload zone drag
    const uploadZone = document.getElementById('photoUploadZone');
    if (uploadZone) {
        uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
        uploadZone.addEventListener('dragleave', () => { uploadZone.classList.remove('dragover'); });
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault(); uploadZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) uploadPhotos(e.dataTransfer.files);
        });
    }
}

function reorderArray(arr, from, to) {
    const item = arr.splice(from, 1)[0];
    arr.splice(to, 0, item);
}

// ── Links Section ─────────────────────────────────────
function renderExternalLinks() {
    const links = (contentData.externalLinks || []).sort((a, b) => a.order - b.order);
    
    let html = `
        <div class="edit-card">
            <h3>🔗 Resurse & Linkuri Externe</h3>
            <p style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:1rem">Gestionează linkurile către Wikipedia, știri sau alte documentare.</p>
            <div class="sortable-list" id="linksList">`;
            
    links.forEach((link, i) => {
        html += `
            <div class="sortable-item" draggable="true" data-index="${i}" data-id="${link.id}">
                <span class="drag-handle">⠿</span>
                <div class="item-content">
                    <div class="item-title">${esc(link.title && link.title.ro ? link.title.ro : link.title)}</div>
                    <div class="item-subtitle">${esc(link.url)}</div>
                </div>
                <div class="item-actions">
                    <button class="btn-icon" onclick="editLink(${i})" title="Editează">✏️</button>
                    <button class="btn-icon danger" onclick="deleteLink(${i})" title="Șterge">🗑️</button>
                </div>
            </div>`;
    });
    
    html += `</div><button class="btn-add" onclick="addLink()">+ Adaugă Link</button></div>`;
    return html;
}

function addLink() {
    showModal('Adaugă Link Extern', `
        ${renderBilingualField('Titlu Link', 'modal-link-title')}
        <div class="form-field"><label>URL (Link)</label><input type="text" id="modal-link-url" placeholder="https://..." /></div>
    `, () => {
        contentData.externalLinks = contentData.externalLinks || [];
        contentData.externalLinks.push({
            id: 'link-' + Date.now(), 
            title: { ro: document.getElementById('modal-link-title-ro').value, en: document.getElementById('modal-link-title-en').value },
            url: document.getElementById('modal-link-url').value,
            order: contentData.externalLinks.length
        });
        renderSection('links');
        showToast('✓ Link adăugat', 'success');
    });
}

function editLink(index) {
    const link = contentData.externalLinks[index];
    showModal('Editează Link Extern', `
        ${renderBilingualField('Titlu Link', 'modal-link-title', link.title)}
        <div class="form-field"><label>URL (Link)</label><input type="text" id="modal-link-url" value="${esc(link.url)}" /></div>
    `, () => {
        contentData.externalLinks[index].title = { ro: document.getElementById('modal-link-title-ro').value, en: document.getElementById('modal-link-title-en').value };
        contentData.externalLinks[index].url = document.getElementById('modal-link-url').value;
        renderSection('links');
        showToast('✓ Link actualizat', 'success');
    });
}

function deleteLink(index) {
    if (confirm('Sigur vrei să ștergi acest link?')) {
        contentData.externalLinks.splice(index, 1);
        contentData.externalLinks.forEach((l, i) => l.order = i);
        renderSection('links');
        showToast('✓ Link șters', 'info');
    }
}

// ── Modal Dialog ──────────────────────────────────────
function showModal(title, bodyHtml, onSave) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-dialog">
            <h2>${title}</h2>
            ${bodyHtml}
            <div class="modal-actions">
                <button class="btn-cancel" id="modalCancel">Anulează</button>
                <button class="btn-save" id="modalSave">Salvează</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#modalCancel').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#modalSave').addEventListener('click', () => { onSave(); overlay.remove(); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

// ── Toast ─────────────────────────────────────────────
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type + ' show';
    setTimeout(() => { toast.classList.remove('show'); }, 2500);
}

// ── Utility ───────────────────────────────────────────
function esc(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}
