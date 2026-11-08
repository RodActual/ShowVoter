Watch Together
A collaborative movie and TV show tracking application designed for couples or friends. Watch Together allows two users to build a shared "To Watch" list, vote on priorities, and track their watch history with individual and combined ratings.

Features
To Watch
 * Shared Backlog: Add movies and TV shows from TMDB to a common list.
 * Compact List: One row per title with both people's priority; tap a row for details, trailer and actions.
 * Tonight's Pick: Suggests a title you both rated Med or High, with Another and Watched buttons.
 * Search & Filters: Search, Movie/TV and streaming-service chips, and sorting on both lists.
 * Swipe Actions: Swipe left to delete (with Undo), right to mark watched.
 * "Up Next" and New Episode Detection: Suggests the next episode and re-adds shows when new episodes air.
Watched
 * Grouped by Month: Newest first under month headings.
 * Episode Tracking and Dual Ratings: Each person rates titles and episodes 1–10; the couple average is shown.
 * Stats Tab: Averages, the nicest and the toughest critic, finished vs abandoned.
Everywhere
 * Bottom tab bar (To Watch, Watched, Stats), live sync between phones, offline edits, accessible on phones and with a keyboard.

Architecture
 * Hosting: Vercel builds and serves the Vite frontend from `main` (production) and every branch (previews).
 * Data: Firestore at `couples/{VITE_COUPLE_ID}/{toWatch|watched|settings}`, with live updates and an offline cache (`src/services/api.js`).
 * Sign-in: one shared Firebase Auth account (Email/Password). The app shows a password screen; Firestore rules (`firestore.rules`) only allow that account.
 * TMDB: the Vercel function `api/tmdb.js` holds `TMDB_API_KEY` and only answers requests with that account's Firebase ID token (`lib/tmdbProxy.js`).
 * Users: two fixed ids (`user1`, `user2`). Names and colors are set in Settings and shared by both phones; "Who's watching?" picks your profile on each device.

Setup (one time)
1. Firebase console → your project → Authentication → Sign-in method: enable **Email/Password**, disable **Anonymous**.
2. Authentication → Users → Add user: the shared account's email and a long password. Both of you use this password to sign in.
3. Firestore Database → Rules: paste `firestore.rules` (its email must match `VITE_LOGIN_EMAIL`, lowercase), Publish.
4. Vercel → project → Settings → Environment Variables (all environments):
   * `VITE_FIREBASE_*` — already set.
   * `VITE_LOGIN_EMAIL` — the shared account's email.
   * `TMDB_API_KEY` — from https://www.themoviedb.org/settings/api (server-only; never prefix with `VITE_`).
5. Redeploy (Vercel → Deployments → latest → Redeploy) so the build picks up the new variables.

Local development
```
npm install
cp .env.example .env.local     # fill in the values
npm run dev                    # frontend only; TMDB calls need `npx vercel dev` instead
```
To develop without touching production data, run `npx firebase-tools emulators:start --only auth,firestore` and set `VITE_USE_EMULATORS=true` in `.env.local`.

Checks
```
npm run lint
npm test        # TMDB function tests
npm run build
```
CI runs all three plus `npm audit` on every PR.

Backups
Settings → Export data downloads both lists and settings as JSON. Firestore's scheduled exports need the paid Blaze plan; the export button works on the free plan.

Project Structure
```
api/tmdb.js             # Vercel function: TMDB proxy (vercel.json rewrites /api/tmdb/*)
lib/tmdbProxy.js        # Proxy + Firebase token check (unit-tested)
firestore.rules         # Firestore security rules
vercel.json             # Build output and security headers (CSP)
src/
├── components/
│   ├── cards/          # ToWatchCard, WatchedCard
│   ├── common/         # Modal, Toast, RatingPicker, PriorityRating, StarRating
│   └── modals/         # Add, Rating, Settings, Stats, Trailer, UserSelect, LoginScreen
├── services/           # firebase.js, api.js (Firestore), tmdbService.js
├── users.js            # user1/user2 keys, names, rating fields
├── titles.js           # TMDB title helpers (movie/TV ids, dates)
└── WatchTogether.jsx   # Main screen
```

License
Distributed under the MIT License. See LICENSE for more information.
