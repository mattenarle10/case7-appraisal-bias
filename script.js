/* ===========================================
   SLIDE LOADER + PRESENTATION CONTROLLER
   Each slide lives in its own HTML file under
   ./slides/ — loaded in order at runtime.
   =========================================== */
const SLIDE_MANIFEST = [
    'slides/01-title.html',
    'slides/02-brief.html',
    'slides/03-situation.html',
    'slides/04-dilemma.html',
    'slides/05-perspectives.html',
    'slides/06-analysis.html',
    'slides/07-recommendation.html',
    'slides/08-rollout.html',
    'slides/09-insight.html',
    'slides/10-references.html',
    'slides/11-closing.html',
];

async function loadSlides() {
    const container = document.getElementById('slides');
    const fragments = await Promise.all(
        SLIDE_MANIFEST.map(url =>
            fetch(url).then(r => {
                if (!r.ok) throw new Error('Failed to load ' + url);
                return r.text();
            })
        )
    );
    container.innerHTML = fragments.join('\n');
    renderQR();
    new SlidePresentation();
}

function renderQR() {
    const canvas = document.getElementById('qrCanvas');
    if (!canvas || typeof QRCode === 'undefined') return;
    QRCode.toCanvas(canvas, window.location.href, {
        width: 120,
        margin: 1,
        color: { dark: '#1a1a1a', light: '#f5f3ee' },
    }, (err) => { if (err) console.error(err); });
}

class SlidePresentation {
    constructor() {
        this.slides = Array.from(document.querySelectorAll('.slide'));
        this.currentSlide = 0;
        this.navDotsContainer = document.getElementById('navDots');
        this.progressBar = document.getElementById('progressBar');

        this.setupIntersectionObserver();
        this.setupKeyboardNav();
        this.setupTouchNav();
        this.setupProgressBar();
        this.setupNavDots();
        this.setupCounter();
    }

    setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
                    if (entry.target.dataset.slideTitle === 'The Situation') {
                        this.animateCounter();
                    }
                }
                if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                    entry.target.classList.add('visible');
                    this.currentSlide = this.slides.indexOf(entry.target);
                    this.updateNavDots();
                }
            });
        }, { threshold: [0.3, 0.5] });
        this.slides.forEach(slide => observer.observe(slide));
        this.slides[0].classList.add('visible');
    }

    setupKeyboardNav() {
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowDown':
                case 'ArrowRight':
                case 'PageDown':
                case ' ':
                    e.preventDefault();
                    this.goToSlide(this.currentSlide + 1);
                    break;
                case 'ArrowUp':
                case 'ArrowLeft':
                case 'PageUp':
                    e.preventDefault();
                    this.goToSlide(this.currentSlide - 1);
                    break;
                case 'Home':
                    e.preventDefault();
                    this.goToSlide(0);
                    break;
                case 'End':
                    e.preventDefault();
                    this.goToSlide(this.slides.length - 1);
                    break;
            }
        });
    }

    setupTouchNav() {
        let touchStartY = 0;
        document.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        document.addEventListener('touchend', (e) => {
            const touchEndY = e.changedTouches[0].clientY;
            const diff = touchStartY - touchEndY;
            if (Math.abs(diff) > 50) {
                if (diff > 0) this.goToSlide(this.currentSlide + 1);
                else this.goToSlide(this.currentSlide - 1);
            }
        }, { passive: true });
    }

    setupProgressBar() {
        window.addEventListener('scroll', () => {
            const scrolled = window.scrollY;
            const max = document.documentElement.scrollHeight - window.innerHeight;
            const pct = max > 0 ? (scrolled / max) * 100 : 0;
            this.progressBar.style.width = pct + '%';
        }, { passive: true });
    }

    setupNavDots() {
        this.navDotsContainer.innerHTML = '';
        this.slides.forEach((slide, i) => {
            const dot = document.createElement('button');
            dot.className = 'nav-dot' + (i === 0 ? ' active' : '');
            dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
            dot.addEventListener('click', () => this.goToSlide(i));
            this.navDotsContainer.appendChild(dot);
        });
    }

    updateNavDots() {
        const dots = this.navDotsContainer.querySelectorAll('.nav-dot');
        dots.forEach((dot, i) => dot.classList.toggle('active', i === this.currentSlide));
    }

    goToSlide(index) {
        if (index < 0 || index >= this.slides.length) return;
        this.slides[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    setupCounter() {
        this.counterEl = document.getElementById('statCounter');
        this.counterAnimated = false;
    }

    animateCounter() {
        if (this.counterAnimated || !this.counterEl) return;
        this.counterAnimated = true;
        const target = 70;
        const duration = 1600;
        const start = performance.now();
        const tick = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const value = Math.round(target * eased);
            this.counterEl.innerHTML = value + '<span class="percent">%</span>';
            if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }
}

document.addEventListener('DOMContentLoaded', loadSlides);
