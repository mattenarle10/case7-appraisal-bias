/**
 * Entry point — load slides, wire the poll, start the presentation controller.
 */
import { loadSlidesInto } from './loader.js';
import { setupPoll } from './poll.js';
import { SlidePresentation } from './presentation.js';

async function bootstrap() {
    await loadSlidesInto('slides');
    setupPoll();
    new SlidePresentation();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}
