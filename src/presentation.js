/**
 * SlidePresentation — keyboard + touch + scroll nav, progress bar, nav dots,
 * and the "70%" counter animation on the Situation slide.
 */
import { animateNumber } from './animations.js';

export class SlidePresentation {
    constructor() {
        this.slides = Array.from(document.querySelectorAll('.slide'));
        this.currentSlide = 0;
        this.navDotsContainer = document.getElementById('navDots');
        this.progressBar = document.getElementById('progressBar');
        this.statCounterEl = document.getElementById('statCounter');
        this.statCounterAnimated = false;

        this._wireObserver();
        this._wireKeyboard();
        this._wireTouch();
        this._wireScroll();
        this._wireNavDots();
    }

    _wireObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio > 0.3
                    && entry.target.dataset.slideTitle === 'The Situation') {
                    this._animateStatCounter();
                }
                if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                    entry.target.classList.add('visible');
                    this.currentSlide = this.slides.indexOf(entry.target);
                    this._updateNavDots();
                }
            });
        }, { threshold: [0.3, 0.5] });
        this.slides.forEach(slide => observer.observe(slide));
        if (this.slides[0]) this.slides[0].classList.add('visible');
    }

    _wireKeyboard() {
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowDown':
                case 'ArrowRight':
                case 'PageDown':
                case ' ':
                    e.preventDefault();
                    this.goToSlide(this.currentSlide + 1); break;
                case 'ArrowUp':
                case 'ArrowLeft':
                case 'PageUp':
                    e.preventDefault();
                    this.goToSlide(this.currentSlide - 1); break;
                case 'Home':
                    e.preventDefault(); this.goToSlide(0); break;
                case 'End':
                    e.preventDefault(); this.goToSlide(this.slides.length - 1); break;
            }
        });
    }

    _wireTouch() {
        let startY = 0;
        let startTarget = null;
        document.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            startTarget = e.target;
        }, { passive: true });
        document.addEventListener('touchend', (e) => {
            const diff = startY - e.changedTouches[0].clientY;
            // Don't hijack swipes that start on an interactive element (button, anchor).
            if (startTarget && startTarget.closest('button, a, input, textarea, select')) return;
            if (Math.abs(diff) > 50) {
                this.goToSlide(this.currentSlide + (diff > 0 ? 1 : -1));
            }
        }, { passive: true });
    }

    _wireScroll() {
        window.addEventListener('scroll', () => {
            const scrolled = window.scrollY;
            const max = document.documentElement.scrollHeight - window.innerHeight;
            const pct = max > 0 ? (scrolled / max) * 100 : 0;
            if (this.progressBar) this.progressBar.style.width = pct + '%';
        }, { passive: true });
    }

    _wireNavDots() {
        if (!this.navDotsContainer) return;
        this.navDotsContainer.innerHTML = '';
        this.slides.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.className = 'nav-dot' + (i === 0 ? ' active' : '');
            dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
            dot.addEventListener('click', () => this.goToSlide(i));
            this.navDotsContainer.appendChild(dot);
        });
    }

    _updateNavDots() {
        if (!this.navDotsContainer) return;
        this.navDotsContainer.querySelectorAll('.nav-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === this.currentSlide);
        });
    }

    goToSlide(index) {
        if (index < 0 || index >= this.slides.length) return;
        this.slides[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    _animateStatCounter() {
        if (this.statCounterAnimated || !this.statCounterEl) return;
        this.statCounterAnimated = true;
        // Preserve the <span class="percent"> suffix structure.
        const el = this.statCounterEl;
        const target = 70;
        const duration = 1600;
        const start = performance.now();
        const tick = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const value = Math.round(target * eased);
            el.innerHTML = value + '<span class="percent">%</span>';
            if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }
}
