/**
 * Live poll feature — composed from store + hooks + api.
 * Single source of truth is `pollStore`. Renderers subscribe to the store.
 * Vote clicks mutate the store; polling updates it on an interval.
 */
import { POLL_OPTIONS, readAllCounts, incrementCount } from './api.js';
import { createStore } from './store.js';
import { createManagedInterval } from './hooks/useInterval.js';
import { observeIntersection } from './hooks/useIntersection.js';
import { createLocalStorageKey } from './hooks/useLocalStorage.js';
import { animateNumber } from './animations.js';

const STORAGE_KEY = 'case7-vote-v4';
const POLL_INTERVAL_MS = 3000;
const storage = createLocalStorageKey(STORAGE_KEY);

export const pollStore = createStore({
    counts: POLL_OPTIONS.reduce((acc, k) => (acc[k] = 0, acc), {}),
    status: 'idle',       // 'idle' | 'live' | 'offline' | 'error'
    voted: storage.get(), // null | one of POLL_OPTIONS
    voteInFlight: false,
});

const totalOf = (counts) => POLL_OPTIONS.reduce((s, k) => s + (counts[k] || 0), 0);

function renderCounts(state) {
    const t = totalOf(state.counts);
    POLL_OPTIONS.forEach((key) => {
        const value = state.counts[key] || 0;
        const pct = t > 0 ? Math.round((value / t) * 100) : 0;
        document.querySelectorAll(`[data-count="${key}"]`).forEach(el => animateNumber(el, value));
        document.querySelectorAll(`[data-pct="${key}"]`).forEach(el => animateNumber(el, pct, '%'));
        document.querySelectorAll(`[data-for="${key}"]`).forEach(el => { el.style.width = pct + '%'; });
    });
    const totalEl = document.getElementById('resultsTotal');
    if (totalEl) animateNumber(totalEl, t);
}

function renderLiveBadge(state) {
    const cls = ['live', 'offline', 'idle'].includes(state.status) ? state.status : 'live';
    const label = cls === 'live' ? 'LIVE' : cls === 'offline' ? 'OFFLINE' : 'PAUSED';
    document.querySelectorAll('.poll-live').forEach(el => {
        el.classList.remove('is-live', 'is-offline', 'is-idle');
        el.classList.add('is-' + cls);
        const labelEl = el.querySelector('.poll-live-label');
        if (labelEl) labelEl.textContent = label;
    });
}

function renderStatusLine(state) {
    const el = document.getElementById('pollStatus');
    if (!el) return;
    el.classList.remove('is-error', 'is-success', 'is-voting');
    if (state.voteInFlight) {
        el.textContent = 'Voting…';
        el.classList.add('is-voting');
    } else if (state.status === 'error') {
        el.textContent = "Vote didn't register — tap again";
        el.classList.add('is-error');
    } else if (state.voted) {
        el.textContent = `You voted: ${state.voted.toUpperCase()}`;
        el.classList.add('is-success');
    } else {
        el.textContent = 'Tap a card to vote';
    }
}

function renderButtons(state) {
    document.querySelectorAll('.poll-option').forEach(btn => {
        const opt = btn.dataset.option;
        btn.classList.toggle('voted', state.voted === opt);
        btn.disabled = Boolean(state.voted) || state.voteInFlight;
    });
}

async function refreshCounts() {
    try {
        const counts = await readAllCounts();
        pollStore.set({ counts, status: 'live' });
    } catch (e) {
        pollStore.set({ status: 'offline' });
    }
}

async function submitVote(opt) {
    const { voted, voteInFlight, counts } = pollStore.get();
    if (voted || voteInFlight) return;
    pollStore.set({ voteInFlight: true, status: 'live' });
    try {
        const newValue = await incrementCount(opt);
        storage.set(opt);
        const otherKey = POLL_OPTIONS.find(k => k !== opt);
        let otherValue = counts[otherKey] || 0;
        try { otherValue = (await readAllCounts())[otherKey]; } catch (_) { /* keep prior */ }
        pollStore.set({
            voted: opt,
            voteInFlight: false,
            status: 'live',
            counts: { ...counts, [opt]: newValue, [otherKey]: otherValue },
        });
    } catch (e) {
        pollStore.set({ voteInFlight: false, status: 'error' });
    }
}

export function setupPoll() {
    const buttons = document.querySelectorAll('.poll-option');
    if (!buttons.length) return;

    // ?reset=1 — clear localStorage before initial render so test voting works.
    if (new URLSearchParams(location.search).has('reset')) {
        storage.remove();
        pollStore.set({ voted: null });
    }

    buttons.forEach(btn => {
        btn.addEventListener('click', () => submitVote(btn.dataset.option));
    });

    pollStore.subscribe((state) => {
        renderCounts(state);
        renderLiveBadge(state);
        renderStatusLine(state);
        renderButtons(state);
    });

    // Visibility-gated polling: only run when a poll slide is in view.
    const timer = createManagedInterval(refreshCounts, POLL_INTERVAL_MS);
    const visible = new Set();
    const onEntry = (entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.3) visible.add(entry.target);
        else visible.delete(entry.target);
        if (visible.size > 0) {
            timer.start();
        } else {
            timer.stop();
            pollStore.set({ status: 'idle' });
        }
    };
    document.querySelectorAll('.poll-slide, .results-slide').forEach(slide => {
        observeIntersection(slide, onEntry, { threshold: [0.3, 0.6] });
    });
}
