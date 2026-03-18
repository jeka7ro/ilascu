# Ilie Ilascu - Website

A bilingual (Romanian/English) website showcasing the life and patriotic activities of Ilie Ilascu, featuring photo and video galleries.

## Features

- 🌐 **Bilingual Support**: Full Romanian and English translations with easy language switching
- 📸 **Photo Gallery**: Interactive photo gallery with lightbox modal
- 🎥 **Video Gallery**: Embedded video player with modal support
- 📱 **Responsive Design**: Fully responsive, works on all devices
- 🎨 **Modern UI**: Professional, elegant design with smooth animations
- ⚡ **Fast & Lightweight**: Optimized for performance

## File Structure

```
ilascu/
├── index.html          # Main HTML file
├── styles.css          # All styling
├── script.js           # JavaScript functionality
├── translations.js     # Language translations
├── README.md          # This file
└── images/            # Photo gallery images (create this folder)
    ├── photo1.jpg
    ├── photo2.jpg
    └── ...
```

## Setup Instructions

### 1. Basic Setup

1. Open `index.html` in a web browser
2. The website will work immediately with placeholder content

### 2. Adding Photos

1. Create an `images` folder in the project root
2. Add your photos (JPG, PNG, or WebP format)
3. Update the `photoData` array in `script.js` with your actual image paths:

```javascript
const photoData = [
    { src: 'images/your-photo1.jpg', caption: 'Your Caption' },
    { src: 'images/your-photo2.jpg', caption: 'Your Caption' },
    // ... add more photos
];
```

4. Update the HTML gallery items in `index.html` if you need more or fewer gallery items

### 3. Adding Videos

1. Upload videos to YouTube, Vimeo, or host them directly
2. Update the `videoData` array in `script.js`:

```javascript
const videoData = [
    { 
        url: 'https://www.youtube.com/embed/YOUR_VIDEO_ID', 
        title: 'Video Title',
        type: 'youtube'
    },
    // ... add more videos
];
```

**For YouTube videos:**
- Get the video ID from the YouTube URL
- Use format: `https://www.youtube.com/embed/VIDEO_ID`

**For Vimeo videos:**
- Use format: `https://player.vimeo.com/video/VIDEO_ID`

**For direct video files:**
- Use HTML5 video tag in the modal instead of iframe

### 4. Customizing Content

#### Biography Section
Edit the biography text in `index.html` (look for `data-i18n="bio-text-1"`, etc.) and update translations in `translations.js`

#### Activities Section
Modify activity cards in `index.html` and their translations in `translations.js`

#### Contact Information
Update contact details in `index.html` (email, phone, address)

### 5. Contact Form

The contact form currently shows an alert. To make it functional:

1. Set up a backend service (PHP, Node.js, etc.)
2. Update the form submission handler in `script.js`:

```javascript
contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(contactForm);
    
    // Send to your backend
    const response = await fetch('your-backend-endpoint', {
        method: 'POST',
        body: formData
    });
    
    // Handle response
});
```

Or use a service like Formspree, Netlify Forms, etc.

## Customization

### Colors

Edit CSS variables in `styles.css`:

```css
:root {
    --primary-color: #1a4d7a;      /* Main blue */
    --secondary-color: #c9a961;    /* Gold accent */
    --accent-color: #d32f2f;       /* Red accent */
    /* ... */
}
```

### Fonts

The website uses Google Fonts (Playfair Display & Inter). To change:
1. Update the font link in `index.html`
2. Update font-family in `styles.css`

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Deployment

### Option 1: Static Hosting
Upload all files to any static hosting service:
- GitHub Pages
- Netlify
- Vercel
- AWS S3 + CloudFront

### Option 2: Traditional Web Hosting
Upload files via FTP to your web hosting provider

### Option 3: Local Server
For development, use a local server:
```bash
# Python
python -m http.server 8000

# Node.js
npx http-server

# PHP
php -S localhost:8000
```

Then visit `http://localhost:8000`

## Notes

- Replace placeholder images with actual photos
- Update video URLs with real content
- Customize contact information
- Add actual biography content
- Consider adding SEO meta tags
- Add favicon for better branding

## License

This website template is created for Ilie Ilascu.

## Support

For questions or issues, please contact the development team.
