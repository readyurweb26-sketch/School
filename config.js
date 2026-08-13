// config.js — public configuration, bundled with the static frontend.
// Every value here is readable via View Source and must never be treated
// as a secret. See README.md for the full deployment steps.

// Apps Script Web App "/exec" endpoint (code.gs).
const API_URL = 'https://script.google.com/macros/s/AKfycbzBvrKKy9oR1Ai22V-RKskrNRt6pm1yXfrikOS4gc7uNUujpffs-UxF12yzvXP6TeJj/exec';

// Public bot-friction token — not a secret, not an identity check.
// Must match the FRONTEND_TOKEN Script Property in code.gs exactly.
const FRONTEND_TOKEN = '1e3bf385-3fc2-4e41-89f0-771797b1da2c5f1f508c-893a-4769-a212-906659698bba';

// Homepage slider autoplay interval, in milliseconds.
const SLIDER_INTERVAL_MS = 2800;