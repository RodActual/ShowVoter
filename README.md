Watch Together
A collaborative movie and TV show tracking application designed for couples or friends. Watch Together allows two users to build a shared "To Watch" list, vote on priorities, and track their watch history with individual and combined ratings.

Features
To Watch List
 * Shared Backlog: Add movies and TV shows to a common list.
 * Priority System: Each user sets a priority level (Low/Medium/High).
 * Combined Priority Score: Items are automatically sorted by the combined urgency of both users.
 * "Up Next" Preview: Automatically suggests the next episode to watch based on your history.
 * New Episode Detection: Checks for new seasons or episodes of finished shows and moves them back to "To Watch".
Watched History
 * Episode Tracking: Track individual episodes or entire seasons.
 * Dual Ratings: Both users rate every episode/movie individually (1–10).
 * Average Rating: Automatically calculates and displays the couple's average rating.
 * Detailed History: Expand shows to see season-by-season breakdowns of ratings.
Smart Features
 * TMDB Integration: Fetches metadata, posters, episode lists, and streaming availability automatically.
 * Streaming Info: Shows which service (Netflix, Hulu, Disney+, etc.) a title is available on.
 * One-Tap Edits: Your priority saves on one tap; your rating on one pick.
 * Live Sync: Both phones update instantly, and edits made offline sync when you're back online.
 * Sorting: Sort lists by Priority/Rating, Title, or Streaming Service.

Architecture
 * Hosting: Vercel builds and serves the Vite frontend from `main` (production) and every branch (previews).
 * Data: Firestore at `couples/{VITE_COUPLE_ID}/{toWatch|watched|settings}`, with live updates and an offline cache (`src/services/api.js`).
 * Sign-in: one shared Firebase Auth account (Email/Password). The app shows a password screen; Firestore rules (`firestore.rules`) only allow that account.
 * TMDB: the Vercel function `api/tmdb/[...path].js` holds `TMDB_API_KEY` and only answers requests with that account's Firebase ID token (`lib/tmdbProxy.js`).
 * Users: two fixed ids (`user1`, `user2`). Names and colors are set in Settings and shared by both phones; "Who's watching?" picks your profile on each device.

Setup (one time)
1. Firebase console → your project → Authentication → Sign-in method: enable **Email/Password**, disable **Anonymous**.
2. Authentication → Users → Add user: the shared account's email and a long password. Both of you use this password to sign in.
3. Firestore Database → Rules: paste `firestore.rules`, replace `REPLACE_WITH_LOGIN_EMAIL` with that email, Publish.
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
api/tmdb/[...path].js   # Vercel function: TMDB proxy
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
