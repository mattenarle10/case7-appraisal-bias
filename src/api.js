/**
 * Abacus counter API client.
 * Thin wrapper with timeout + retry — the rest of the app uses only these exports.
 */
const BASE = 'https://abacus.jasoncameron.dev';
const NAMESPACE = 'mattenarle10-case7-v4';
const TIMEOUT_MS = 5000;

export const POLL_OPTIONS = ['redesign', 'retrain'];

async function fetchWithTimeout(url, ms = TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
        return await fetch(url, { signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

export async function readCount(key) {
    const r = await fetchWithTimeout(`${BASE}/get/${NAMESPACE}/${key}`);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const { value } = await r.json();
    return value || 0;
}

export async function incrementCount(key, retry = true) {
    try {
        const r = await fetchWithTimeout(`${BASE}/hit/${NAMESPACE}/${key}`);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const { value } = await r.json();
        return value;
    } catch (e) {
        if (retry) {
            await new Promise(res => setTimeout(res, 400));
            return incrementCount(key, false);
        }
        throw e;
    }
}

export async function readAllCounts() {
    const values = await Promise.all(POLL_OPTIONS.map(readCount));
    return POLL_OPTIONS.reduce((acc, key, i) => (acc[key] = values[i], acc), {});
}
