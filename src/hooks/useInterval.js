/**
 * createManagedInterval — start/stop an interval that auto-pauses when the tab is hidden.
 * Returns { start, stop, isRunning }.
 *
 *   const timer = createManagedInterval(() => refresh(), 3000);
 *   timer.start();  // fires once immediately, then every 3s
 *   timer.stop();
 */
export function createManagedInterval(fn, ms) {
    let id = null;
    return {
        start() {
            if (id !== null) return;
            fn();
            id = setInterval(() => { if (!document.hidden) fn(); }, ms);
        },
        stop() {
            if (id === null) return;
            clearInterval(id);
            id = null;
        },
        isRunning: () => id !== null,
    };
}
