/**
 * Slide loader — fetches each slide fragment and splices them into the shell.
 */
export const SLIDE_MANIFEST = [
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

export async function loadSlidesInto(containerId) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Missing container #${containerId}`);
    const fragments = await Promise.all(
        SLIDE_MANIFEST.map(url =>
            fetch(url).then(r => {
                if (!r.ok) throw new Error('Failed to load ' + url);
                return r.text();
            })
        )
    );
    container.innerHTML = fragments.join('\n');
}
