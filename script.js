let cachedContent = null;
let currentPhotoPage = 1;
const photosPerPage = 9;

// Global Content Protection
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('dragstart', e => e.preventDefault());

async function loadDynamicContent() {
    try {
        const res = await fetch('/api/content');
        if (!res.ok) return;
        cachedContent = await res.json();
        
        renderBilingualContent();
        
    } catch (err) {
        console.log('Content API not available, using static content');
    }
}

function renderBilingualContent() {
    if (!cachedContent) return;
    const data = cachedContent;
    const lang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'ro';

    // Helper for bilingual strings
    const t = (obj, fallback = '') => {
        if (!obj) return fallback;
        if (typeof obj === 'string') return obj;
        return obj[lang] || obj['ro'] || fallback;
    };
    window.t = t; // Make it accessible globally for pagination

    // Background & Favicon & Colors
    if (data.settings && data.settings.favicon) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = data.settings.favicon.startsWith('http') ? data.settings.favicon : '/' + data.settings.favicon;
    }

    if (data.background) {
        const bg = data.background;
        const hero = document.querySelector('.hero');
        if (hero) {
            if (bg.heroBackgroundImage) {
                hero.style.background = `linear-gradient(rgba(0,0,0,${bg.heroOverlayOpacity ?? 0.5}), rgba(0,0,0,${bg.heroOverlayOpacity ?? 0.5})), url('/${bg.heroBackgroundImage}') center/cover no-repeat`;
            } else if (bg.heroGradient) {
                hero.style.background = bg.heroGradient;
            }
        }
        
        if (bg.sectionAltBg) {
            document.querySelectorAll('.activities, .gallery:nth-of-type(odd)').forEach(el => {
                el.style.backgroundColor = bg.sectionAltBg;
            });
        }
        
        if (bg.footerBg) {
            const footer = document.querySelector('footer');
            if (footer) footer.style.backgroundColor = bg.footerBg;
        }
    }

    // Hero
    if (data.hero) {
        const heroTitle = document.querySelector('.hero-title');
        const heroSubtitle = document.querySelector('.hero-subtitle');
        const heroDates = document.querySelector('.hero-dates');
        const heroQuote = document.querySelector('.hero-quote');
        const heroImg = document.querySelector('.hero-image img');
        
        if (heroTitle) heroTitle.textContent = t(data.hero.title);
        if (heroSubtitle) heroSubtitle.textContent = t(data.hero.subtitle);
        if (heroDates) heroDates.textContent = t(data.hero.dates);
        if (heroQuote) heroQuote.textContent = t(data.hero.quote);
        if (heroImg && data.hero.image) heroImg.src = data.hero.image;
    }
    
    // Biography
    if (data.biography) {
        const bioImg = document.querySelector('.bio-photo');
        const bioText = document.querySelector('.bio-text');
        
        if (bioImg && data.biography.image) bioImg.src = data.biography.image;
        if (bioText && data.biography.paragraphs) {
            // Preservation logic: keep the links container if it exists
            const linksHtml = document.getElementById('externalLinks') ? document.getElementById('externalLinks').outerHTML : '';
            bioText.innerHTML = data.biography.paragraphs.map(p => `<p>${t(p)}</p>`).join('') + linksHtml;
        }
        
        // External Links (Re-link the references since we might have overwritten them)
        const linksList = document.getElementById('externalLinksList');
        const linksContainer = document.getElementById('externalLinks');
        if (linksList && data.externalLinks && data.externalLinks.length > 0) {
            if (linksContainer) linksContainer.style.display = 'block';
            const sortedLinks = [...data.externalLinks].sort((a, b) => a.order - b.order);
            linksList.innerHTML = sortedLinks.map(link => `
                <li><a href="${escHtml(link.url)}" target="_blank" rel="noopener noreferrer">🔗 ${escHtml(t(link.title))}</a></li>
            `).join('');
        } else if (linksContainer) {
            linksContainer.style.display = 'none';
        }
    }
    
    // Activities
    if (data.activities && data.activities.length > 0) {
        const grid = document.querySelector('.activities-grid');
        if (grid) {
            const sorted = [...data.activities].sort((a, b) => a.order - b.order);
            grid.innerHTML = sorted.map(act => `
                <div class="activity-card" style="${act.link ? 'cursor:pointer' : ''}" ${act.link ? `onclick="window.open('${escHtml(act.link)}', '_blank')"` : ''}>
                    <div class="activity-image">
                        <img src="${act.image ? (act.image.startsWith('http') ? act.image : '/' + act.image) : ''}" alt="${escHtml(t(act.title))}" onerror="this.parentElement.style.display='none'">
                    </div>
                    <h3>${escHtml(t(act.title))}</h3>
                    <p>${escHtml(t(act.text))}</p>
                    ${act.link ? `<div style="margin-top:1rem;color:var(--primary-color);font-weight:600;display:flex;align-items:center;gap:0.4rem">${lang === 'ro' ? '🔗 Deschide sursa' : '🔗 Open Source'} <span style="font-size:1.2em">→</span></div>` : ''}
                </div>
            `).join('');
            
            // Re-apply animations
            grid.querySelectorAll('.activity-card').forEach((el, index) => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            });
        }
    }
    
    // Photo Gallery
    const photoSection = document.getElementById('gallery');
    const photoGrid = document.querySelector('.gallery-grid');
    if (data.photos && data.photos.length > 0) {
        if (photoSection) photoSection.style.display = 'block';
        renderPhotoGallery();
    } else {
        if (photoGrid) photoGrid.innerHTML = '';
        if (photoSection) photoSection.style.display = 'none';
    }
    
    // Videos
    const videoSection = document.getElementById('videos');
    const videoGrid = document.getElementById('videoGallery');
    if (data.videos && data.videos.length > 0) {
        if (videoSection) videoSection.style.display = 'block';
        if (videoGrid) {
            const sorted = [...data.videos].sort((a, b) => a.order - b.order);
            videoData.length = 0;
            sorted.forEach(v => videoData.push(v));
            
            videoGrid.innerHTML = sorted.map((vid, i) => {
                const ytId = getYouTubeId(vid.url);
                const thumbUrl = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : (vid.thumbnail || '');
                
                return `
                    <div class="video-item" data-index="${i}">
                        <div class="video-thumbnail-container">
                            ${ytId || vid.thumbnail ? 
                                `<img src="${thumbUrl}" alt="${escHtml(t(vid.title))}" class="video-thumbnail">` :
                                (vid.type === 'file' ? `<video src="/${vid.url}" muted preload="metadata" class="video-thumbnail"></video>` : `<div class="video-placeholder-fallback"></div>`)
                            }
                            <div class="play-button-overlay">
                                <div class="play-icon">▶</div>
                            </div>
                        </div>
                        <h3 class="video-title">${escHtml(t(vid.title))}</h3>
                    </div>
                `;
            }).join('');
            
            videoGrid.querySelectorAll('.video-item').forEach((item, index) => {
                item.addEventListener('click', () => openVideoModal(index));
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            });
        }
    } else {
        if (videoGrid) videoGrid.innerHTML = '';
        if (videoSection) videoSection.style.display = 'none';
        videoData.length = 0;
    }
    
    // Contact
    if (data.contact) {
        const contactItems = document.querySelectorAll('.contact-item');
        if (contactItems[0]) contactItems[0].querySelector('span').textContent = data.contact.email;
        if (contactItems[1]) contactItems[1].querySelector('span').textContent = data.contact.phone;
        if (contactItems[2]) contactItems[2].querySelector('span').textContent = t(data.contact.address);
    }
}

function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

function renderPhotoGallery() {
    if (!cachedContent || !cachedContent.photos) return;
    const galleryGrid = document.getElementById('photoGallery');
    if (!galleryGrid) return;

    const data = cachedContent;
    const lang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'ro';
    const sorted = [...data.photos].sort((a, b) => a.order - b.order);
    photoData = sorted;

    const startIndex = (currentPhotoPage - 1) * photosPerPage;
    const endIndex = startIndex + photosPerPage;
    const pagePhotos = sorted.slice(startIndex, endIndex);
    const totalPages = Math.ceil(sorted.length / photosPerPage);

    galleryGrid.innerHTML = pagePhotos.map((photo, i) => {
        const globalIndex = startIndex + i;
        const caption = typeof window.t === 'function' ? window.t(photo.caption) : (photo.caption.ro || '');
        return `
            <div class="gallery-item" data-index="${globalIndex}">
                <img src="${photo.src}" alt="${escHtml(caption)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" oncontextmenu="return false;" ondragstart="return false;">
                <div class="gallery-overlay">
                    <button class="gallery-view-btn">${lang === 'ro' ? 'Vezi' : 'View'}</button>
                </div>
            </div>
        `;
    }).join('');

    // Pagination Controls
    let paginationHtml = '';
    if (totalPages > 1) {
        paginationHtml = `
            <div class="pagination-container" id="galleryPagination">
                <button class="pagination-btn" onclick="changePhotoPage(-1)" ${currentPhotoPage === 1 ? 'disabled' : ''} title="${lang === 'ro' ? 'Pagina anterioară' : 'Previous page'}">❮</button>
                <div class="pagination-info">${currentPhotoPage} / ${totalPages}</div>
                <button class="pagination-btn" onclick="changePhotoPage(1)" ${currentPhotoPage === totalPages ? 'disabled' : ''} title="${lang === 'ro' ? 'Pagina următoare' : 'Next page'}">❯</button>
            </div>
        `;
    }

    // Clean up old pagination if exists
    const oldPagination = document.getElementById('galleryPagination');
    if (oldPagination) oldPagination.remove();
    if (paginationHtml) galleryGrid.insertAdjacentHTML('afterend', paginationHtml);

    galleryGrid.querySelectorAll('.gallery-item').forEach(item => {
        const index = parseInt(item.dataset.index);
        item.addEventListener('click', () => openPhotoModal(index));
        item.style.opacity = '1';
        item.style.transform = 'translateY(0)';
    });
    photoItems = galleryGrid.querySelectorAll('.gallery-item');
}

function changePhotoPage(delta) {
    const totalPages = Math.ceil(photoData.length / photosPerPage);
    const newPage = currentPhotoPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPhotoPage = newPage;
        renderPhotoGallery();
        document.getElementById('gallery').scrollIntoView({ behavior: 'smooth' });
    }
}

// ── Mobile Menu Toggle ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
        });
    }
    
    // Close mobile menu when clicking on a link
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            mobileMenuToggle.classList.remove('active');
        });
    });
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const offsetTop = target.offsetTop - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
});

// Photo Gallery Modal
let currentPhotoIndex = 0;
let photoItems = [];
let photoData = [];

// Photo data - fallback
photoData = [
    { 
        src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Ilie_Ila%C8%99cu_2009.jpg/800px-Ilie_Ila%C8%99cu_2009.jpg', 
        caption: 'Ilie Ilascu în Parcul Cișmigiu, București (2009) - Fotografie personală' 
    },
    { 
        src: 'images/ilie-ilascu-biography.jpg', 
        caption: 'Ilie Ilascu - Portret biografic' 
    },
    { 
        src: 'images/ilie-ilascu-hero.jpg', 
        caption: 'Ilie Ilascu - Portret oficial' 
    },
    { 
        src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Palace_of_the_Parliament_Bucharest_Romania.jpg/800px-Palace_of_the_Parliament_Bucharest_Romania.jpg', 
        caption: 'Palatul Parlamentului din București - Clădirea istorică' 
    },
    { 
        src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Arcul_de_Triumf_Bucuresti.jpg/800px-Arcul_de_Triumf_Bucuresti.jpg', 
        caption: 'Arcul de Triumf din București - Monument istoric' 
    },
    { 
        src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Flag_of_Romania.svg/800px-Flag_of_Romania.svg.png', 
        caption: 'Steagul României - Tricolorul național' 
    }
];

// Initialize photo gallery when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    photoItems = document.querySelectorAll('.gallery-item');
    
    photoItems.forEach((item, index) => {
        // Load actual images into gallery items
        if (photoData[index]) {
            const img = document.createElement('img');
            img.src = photoData[index].src;
            img.alt = photoData[index].caption;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '8px';
            
            // Replace placeholder with actual image
            const placeholder = item.querySelector('.gallery-placeholder');
            if (placeholder) {
                placeholder.style.display = 'none';
                item.insertBefore(img, placeholder);
            }
        }
        
        item.addEventListener('click', () => {
            openPhotoModal(index);
        });
    });
    
    // Load dynamic content from API
    loadDynamicContent();
});

function openPhotoModal(index) {
    currentPhotoIndex = index;
    const modal = document.getElementById('photoModal');
    const modalImg = document.getElementById('modalImage');
    const modalCaption = document.getElementById('modalCaption');
    
    // Helper for bilingual strings
    const t = (obj, fallback = '') => {
        if (!obj) return fallback;
        if (typeof obj === 'string') return obj;
        const lang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'ro';
        return obj[lang] || obj['ro'] || fallback;
    };

    const photo = photoData[index];
    modalImg.src = photo?.src || '';
    modalCaption.textContent = t(photo?.caption) || (currentLanguage === 'ro' ? 'Foto ' : 'Photo ') + (index + 1);
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closePhotoModal() {
    const modal = document.getElementById('photoModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function changePhoto(direction) {
    currentPhotoIndex += direction;
    
    if (currentPhotoIndex < 0) {
        currentPhotoIndex = photoData.length - 1;
    } else if (currentPhotoIndex >= photoData.length) {
        currentPhotoIndex = 0;
    }
    
    const modalImg = document.getElementById('modalImage');
    const modalCaption = document.getElementById('modalCaption');
    
    // Helper for bilingual strings
    const t = (obj, fallback = '') => {
        if (!obj) return fallback;
        if (typeof obj === 'string') return obj;
        const lang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'ro';
        return obj[lang] || obj['ro'] || fallback;
    };

    const photo = photoData[currentPhotoIndex];
    modalImg.src = photo?.src || '';
    modalCaption.textContent = t(photo?.caption) || (currentLanguage === 'ro' ? 'Foto ' : 'Photo ') + (currentPhotoIndex + 1);
}

// Photo Modal Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const photoModal = document.getElementById('photoModal');
    const closeBtn = photoModal?.querySelector('.modal-close');
    const prevBtn = photoModal?.querySelector('.modal-prev');
    const nextBtn = photoModal?.querySelector('.modal-next');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closePhotoModal);
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => changePhoto(-1));
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => changePhoto(1));
    }
    
    // Close modal when clicking outside the image
    photoModal?.addEventListener('click', (e) => {
        if (e.target === photoModal) {
            closePhotoModal();
        }
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (photoModal?.style.display === 'block') {
            if (e.key === 'Escape') {
                closePhotoModal();
            } else if (e.key === 'ArrowLeft') {
                changePhoto(-1);
            } else if (e.key === 'ArrowRight') {
                changePhoto(1);
            }
        }
    });
});

// Video Gallery Modal
let videoData = [];

function openVideoModal(index) {
    const modal = document.getElementById('videoModal');
    const modalVideo = document.getElementById('modalVideo');
    
    const video = videoData[index];
    if (video) {
        let url = video.url || '';
        
        // Ensure YouTube URLs are in embed format
        if (video.type === 'youtube' && url.includes('youtube.com/watch?v=')) {
            const videoId = url.split('v=')[1].split('&')[0];
            url = `https://www.youtube.com/embed/${videoId}`;
        } else if (video.type === 'youtube' && url.includes('youtu.be/')) {
            const videoId = url.split('youtu.be/')[1].split('?')[0];
            url = `https://www.youtube.com/embed/${videoId}`;
        }

        if (video.type === 'youtube' && url) {
            const separator = url.includes('?') ? '&' : '?';
            modalVideo.innerHTML = `<iframe src="${url}${separator}autoplay=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen oncontextmenu="return false;"></iframe>`;
        } else if (video.type === 'file' && url) {
            modalVideo.innerHTML = `<video controls autoplay controlsList="nodownload" oncontextmenu="return false;" style="width:100%;height:100%;"><source src="/${url}" type="video/mp4">Browserul nu suportă video.</video>`;
        } else if (video.type === 'link' && url) {
             modalVideo.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:white;text-align:center;padding:2rem;" oncontextmenu="return false;">
                <p style="margin-bottom:1rem;font-size:1.2rem;">${currentLanguage === 'ro' ? 'Acest video este extern.' : 'This is an external video.'}</p>
                <a href="${url}" target="_blank" class="btn-primary" style="text-decoration:none;">${currentLanguage === 'ro' ? 'Vezi pe Sursă' : 'View on Source'}</a>
             </div>`;
        } else {
            modalVideo.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:white;font-size:1.2rem;" oncontextmenu="return false;">${currentLanguage === 'ro' ? 'Video nedisponibil' : 'Video unavailable'}</div>`;
        }
    }
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeVideoModal() {
    const modal = document.getElementById('videoModal');
    const modalVideo = document.getElementById('modalVideo');
    
    modal.style.display = 'none';
    modalVideo.innerHTML = ''; // Clear video to stop playback
    document.body.style.overflow = 'auto';
}

// Video Modal Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const videoModal = document.getElementById('videoModal');
    const closeBtn = videoModal?.querySelector('.modal-close');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeVideoModal);
    }
    
    // Close modal when clicking outside
    videoModal?.addEventListener('click', (e) => {
        if (e.target === videoModal) {
            closeVideoModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (videoModal?.style.display === 'block' && e.key === 'Escape') {
            closeVideoModal();
        }
    });
});

// CAPTCHA Logic
async function refreshCaptcha() {
    const display = document.getElementById('captcha-display');
    if (display) {
        display.textContent = '...';
        try {
            const res = await fetch('/api/contact/captcha');
            const data = await res.json();
            display.textContent = data.code;
        } catch (e) {
            display.textContent = 'Error';
        }
    }
}

// Contact Form Handler
document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    
    // Initialize captcha
    refreshCaptcha();
    
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(contactForm);
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                message: formData.get('message'),
                captcha: formData.get('captcha')
            };
            
            try {
                const res = await fetch('/api/contact/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const result = await res.json();
                
                if (res.ok) {
                    alert(currentLanguage === 'ro' ? 
                        `Mulțumim, ${data.name}! Mesajul a fost trimis.` : 
                        `Thank you, ${data.name}! Your message has been sent.`);
                    contactForm.reset();
                    refreshCaptcha();
                } else {
                    alert(result.error || 'Error');
                    if (result.error.includes('cod')) refreshCaptcha();
                }
            } catch (err) {
                alert('Connection error');
            }
        });
    }
});

// Navbar scroll effect
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.15)';
    } else {
        navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    }
    
    lastScroll = currentScroll;
});

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for animation
document.addEventListener('DOMContentLoaded', () => {
    const animateElements = document.querySelectorAll('.activity-card, .gallery-item, .video-item');
    
    animateElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        observer.observe(el);
    });
});
function getYouTubeId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}
