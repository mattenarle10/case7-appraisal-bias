/**
 * Tiny observable store — createStore(initial) gives { get, set, subscribe }.
 * Think "React context + useReducer" but without React.
 *
 *   const store = createStore({ count: 0 });
 *   const unsubscribe = store.subscribe(s => render(s));
 *   store.set({ count: 1 });           // shallow merge
 *   store.set(s => ({ count: s.count + 1 })); // functional update
 */
export function createStore(initial) {
    let state = initial;
    const listeners = new Set();

    return {
        get: () => state,
        set(next) {
            const incoming = typeof next === 'function' ? next(state) : next;
            const merged = (incoming && typeof incoming === 'object' && !Array.isArray(incoming))
                ? { ...state, ...incoming }
                : incoming;
            if (shallowEqual(state, merged)) return;
            state = merged;
            listeners.forEach(fn => fn(state));
        },
        subscribe(fn) {
            listeners.add(fn);
            fn(state);
            return () => listeners.delete(fn);
        },
    };
}

function shallowEqual(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    for (const k of ak) if (a[k] !== b[k]) return false;
    return true;
}
