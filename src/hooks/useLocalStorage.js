/**
 * createLocalStorageKey — null-safe wrapper around a single localStorage slot.
 * Works even when storage is disabled (incognito on some browsers).
 */
export function createLocalStorageKey(key) {
    return {
        get() {
            try { return localStorage.getItem(key); } catch (e) { return null; }
        },
        set(value) {
            try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
        },
        remove() {
            try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
        },
    };
}
