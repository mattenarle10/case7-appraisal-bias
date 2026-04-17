/**
 * observeIntersection — IntersectionObserver wrapped as a disposable hook.
 *
 *   const dispose = observeIntersection(el, (entry) => { ... }, { threshold: 0.5 });
 *   dispose(); // stop observing, disconnect
 */
export function observeIntersection(element, onEntry, options = {}) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(onEntry);
    }, options);
    observer.observe(element);
    return () => observer.disconnect();
}
