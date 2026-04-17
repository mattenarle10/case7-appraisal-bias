/**
 * animateNumber — tween textContent from its current parsed integer to `to`.
 * Reads previous value from the element itself, so it's stateless across calls.
 */
export function animateNumber(el, to, suffix = '', duration = 600) {
    const from = parseInt((el.textContent || '0').replace(/\D/g, ''), 10) || 0;
    if (from === to) { el.textContent = to + suffix; return; }
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
