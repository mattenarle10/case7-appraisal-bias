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
    'slides/05-poll.html',
    'slides/06-perspectives.html',
    'slides/07-analysis.html',
    'slides/08-poll-results.html',
    'slides/09-recommendation.html',
    'slides/10-rollout.html',
    'slides/11-insight.html',
    'slides/12-references.html',
    'slides/13-closing.html',
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
    setupPoll();
    new SlidePresentation();
}

/* ===========================================
   LIVE POLL — Redesign vs Retrain
   Uses abacus.jasoncameron.dev public counter API.
   =========================================== */
const POLL_API = 'https://abacus.jasoncameron.dev';
const POLL_NS = 'mattenarle10-case7-v3';
const POLL_OPTIONS = ['redesign', 'retrain'];
const POLL_STORAGE_KEY = 'case7-vote-v3';
const POLL_INTERVAL_MS = 3000;
const POLL_FETCH_TIMEOUT_MS = 5000;
let pollInterval = null;
let voteInFlight = false;

function animateNumber(el, to, suffix = '') {
    const from = parseInt((el.textContent || '0').replace(/\D/g, ''), 10) || 0;
    if (from === to) { el.textContent = to + suffix; return; }
    const duration = 600;
    const start = performance.now();
    const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(from + (to - from) * eased);
        el.textContent = value + suffix;
        if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}

async function fetchWithTimeout(url, ms = POLL_FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
        const r = await fetch(url, { signal: controller.signal });
        return r;
    } finally {
        clearTimeout(timer);
    }
}

async function pollGet(key) {
    try {
        const r = await fetchWithTimeout(`${POLL_API}/get/${POLL_NS}/${key}`);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        return j.value || 0;
    } catch (e) {
        throw e;
    }
}

async function pollHit(key, retry = true) {
    try {
        const r = await fetchWithTimeout(`${POLL_API}/hit/${POLL_NS}/${key}`);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        return j.value;
    } catch (e) {
        if (retry) {
            await new Promise(res => setTimeout(res, 400));
            return pollHit(key, false);
        }
        throw e;
    }
}

function updateOptionDisplay(key, value, total) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    document.querySelectorAll(`[data-count="${key}"]`).forEach(el => animateNumber(el, value));
    document.querySelectorAll(`[data-pct="${key}"]`).forEach(el => animateNumber(el, pct, '%'));
    document.querySelectorAll(`[data-for="${key}"]`).forEach(el => el.style.width = pct + '%');
    return pct;
}

async function refreshPoll() {
    try {
        const values = await Promise.all(POLL_OPTIONS.map(k => pollGet(k)));
        const total = values.reduce((a, b) => a + b, 0);
        POLL_OPTIONS.forEach((key, i) => updateOptionDisplay(key, values[i], total));
        const totalEl = document.getElementById('resultsTotal');
        if (totalEl) animateNumber(totalEl, total);
        setLiveState('live');
    } catch (e) {
        setLiveState('offline');
    }
}

function setLiveState(state) {
    document.querySelectorAll('.poll-live').forEach(el => {
        el.classList.remove('is-live', 'is-offline', 'is-idle');
        el.classList.add('is-' + state);
        const label = el.querySelector('.poll-live-label');
        if (label) {
            label.textContent =
                state === 'live' ? 'LIVE' :
                state === 'offline' ? 'OFFLINE' : 'PAUSED';
        }
    });
}

function setPollStatus(text, variant = '') {
    const el = document.getElementById('pollStatus');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('is-error', 'is-success', 'is-voting');
    if (variant) el.classList.add('is-' + variant);
}

function startPolling() {
    if (pollInterval) return;
    refreshPoll();
    pollInterval = setInterval(() => {
        if (!document.hidden) refreshPoll();
    }, POLL_INTERVAL_MS);
}

function stopPolling() {
    if (!pollInterval) return;
    clearInterval(pollInterval);
    pollInterval = null;
    setLiveState('idle');
}

function watchPollVisibility() {
    const pollSlide = document.querySelector('.poll-slide');
    const resultsSlide = document.querySelector('.results-slide');
    if (!pollSlide && !resultsSlide) return;
    const visible = new Set();
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
                visible.add(entry.target);
            } else {
                visible.delete(entry.target);
            }
        });
        if (visible.size > 0) startPolling(); else stopPolling();
    }, { threshold: [0.3, 0.6] });
    if (pollSlide) observer.observe(pollSlide);
    if (resultsSlide) observer.observe(resultsSlide);
}

function setupPoll() {
    const buttons = document.querySelectorAll('.poll-option');
    if (!buttons.length) return;

    // Test-mode reset: ?reset=1 clears local vote so Matt can rehearse.
    if (new URLSearchParams(location.search).has('reset')) {
        localStorage.removeItem(POLL_STORAGE_KEY);
    }

    const voted = localStorage.getItem(POLL_STORAGE_KEY);

    buttons.forEach(btn => {
        const opt = btn.dataset.option;
        if (voted) {
            btn.disabled = true;
            if (voted === opt) btn.classList.add('voted');
        }
        btn.addEventListener('click', async () => {
            if (voteInFlight) return;
            if (localStorage.getItem(POLL_STORAGE_KEY)) return;
            voteInFlight = true;
            setPollStatus('Voting…', 'voting');
            buttons.forEach(b => b.disabled = true);
            try {
                const newValue = await pollHit(opt);
                // Commit locally only after server confirmed.
                localStorage.setItem(POLL_STORAGE_KEY, opt);
                btn.classList.add('voted');
                setPollStatus(`You voted: ${opt.toUpperCase()}`, 'success');
                // Instant optimistic update using /hit's returned value for this option.
                // refreshPoll() then fills in the other option + percentages.
                const otherKey = POLL_OPTIONS.find(k => k !== opt);
                let otherValue = 0;
                try { otherValue = await pollGet(otherKey); } catch (_) {}
                const total = newValue + otherValue;
                updateOptionDisplay(opt, newValue, total);
                updateOptionDisplay(otherKey, otherValue, total);
                const totalEl = document.getElementById('resultsTotal');
                if (totalEl) animateNumber(totalEl, total);
                setLiveState('live');
            } catch (e) {
                // Don't mark voted. Re-enable unvoted buttons so they can retry.
                setPollStatus("Vote didn't register — tap again", 'error');
                buttons.forEach(b => {
                    if (!localStorage.getItem(POLL_STORAGE_KEY)) b.disabled = false;
                });
                setLiveState('offline');
            } finally {
                voteInFlight = false;
            }
        });
    });

    if (voted) setPollStatus(`You voted: ${voted.toUpperCase()}`, 'success');

    watchPollVisibility();
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
