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
 * Dual Ratings: Both users rate every episode/movie individually (1-10 stars).
 * Average Rating: Automatically calculates and displays the couple's average rating.
 * Detailed History: Expand shows to see season-by-season breakdowns of ratings.
Smart Features
 * TMDB Integration: Fetches metadata, posters, episode lists, and streaming availability automatically.
 * Streaming Info: Shows which service (Netflix, Hulu, Disney+, etc.) a title is available on.
 * Batch Editing: Modify ratings or priorities locally before saving changes to the database.
 * Sorting: Sort lists by Priority/Rating, Title, or Streaming Service.

Architecture
This app is fully self-hosted — there's no third-party backend (no Firebase, no SaaS accounts required):
 * `src/` — React frontend (Vite). Talks to the server over REST + WebSocket via `src/services/api.js`.
 * `server/` — A small Node/Express server. Stores data in a local SQLite file (`server/data.sqlite`), pushes live updates to connected clients over WebSocket, and proxies TMDB API calls so your TMDB key never reaches the browser.

"Users" are just a local profile picker (e.g. "Anthony" / "Pam", configurable in Settings) stored in the browser's `localStorage` — there are no real accounts or passwords. Everyone connecting to your server shares the same list, like a household whiteboard.

Getting Started
Prerequisites
 * Node.js v18 or higher
 * A TMDB (The Movie Database) API key — get one free at https://www.themoviedb.org/settings/api

Installation
 * Clone the repository:
   ```
   git clone https://github.com/yourusername/watch-together.git
   cd watch-together
   ```

 * Install frontend dependencies:
   ```
   npm install
   ```

 * Install server dependencies:
   ```
   npm install --prefix server
   ```

Configuration
 * Server: copy `server/.env.example` to `server/.env` and fill in your TMDB key:
   ```
   PORT=4000
   TMDB_API_KEY=your_tmdb_api_key
   APP_PASSWORD=             # shared sign-in password, see "Securing it" below
   ```

Running the App (development)
In one terminal, start the server:
```
npm run server:dev
```
In another, start the frontend:
```
npm run dev
```
Open http://localhost:5173 — Vite proxies `/api` and `/ws` to the server on port 4000.

Running in Production
Build the frontend, then start the server — it serves the built frontend and the API from a single process:
```
npm run build
npm run server
```
Open http://localhost:4000 (or whatever `PORT` you configured).

To keep it running, use a process manager like `pm2` or a systemd service, or put it behind a reverse proxy (e.g. Caddy or nginx) for HTTPS.

Securing it
Set `APP_PASSWORD` in `server/.env` before exposing the server to the internet. The app then shows a sign-in screen; a correct password sets an HttpOnly session cookie that lasts a year on that device. Every API and WebSocket request needs that cookie and must come from the app's own origin. Changing `APP_PASSWORD` signs every device out. Wrong passwords are limited to 5 per minute per IP.

Leaving `APP_PASSWORD` blank disables sign-in; only do that if the server is reachable from your home network alone. Serve it over HTTPS (for example behind Caddy) so the password and cookie aren't sent in clear text.

Data & Backups
All shared list data lives in `server/data.sqlite`. Make a consistent copy any time, even while the server runs:
```
npm --prefix server run backup                   # writes server/backups/data-<timestamp>.sqlite
npm --prefix server run backup -- /mnt/usb/wt.sqlite
```
Schedule it (cron, Task Scheduler) and keep copies off the machine. To restore, stop the server and copy a backup over `server/data.sqlite`. Deleting a title in the app can be undone for a few seconds from the toast.

Checks
```
npm run lint      # ESLint for src/ and server/
npm test          # server API tests (starts the real server on a random port)
```

Project Structure
```
server/
├── index.js           # Express API, WebSocket broadcast, TMDB proxy
├── auth.js            # Password login, session cookie, same-origin checks
├── db.js              # SQLite setup
└── data.sqlite        # Created automatically on first run
src/
├── components/
│   ├── cards/           # Display cards for items
│   │   ├── ToWatchCard.jsx
│   │   └── WatchedCard.jsx
│   ├── common/          # Reusable UI elements
│   │   ├── PriorityRating.jsx
│   │   └── StarRating.jsx
│   └── modals/          # Popups for actions
│       ├── AddModal.jsx
│       ├── LoginScreen.jsx
│       ├── RatingModal.jsx
│       ├── SettingsModal.jsx
│       ├── StatsModal.jsx
│       ├── TrailerModal.jsx
│       └── UserSelectModal.jsx
├── services/            # API & data logic
│   ├── api.js           # REST + WebSocket client for the self-hosted server
│   └── tmdbService.js
├── users.js             # Stable user keys (user1/user2), names, rating fields
└── WatchTogether.jsx    # Main Controller
```

User Roles
The app has two users with stable ids (`user1`, `user2`). Names and colors are set in the in-app Settings panel and shared across devices through the server. The "Who's watching?" picker is a profile switcher on top of the shared password, not a per-person login.

Contributing
 * Fork the Project
 * Create your Feature Branch (git checkout -b feature/AmazingFeature)
 * Commit your Changes (git commit -m 'Add some AmazingFeature')
 * Push to the Branch (git push origin feature/AmazingFeature)
 * Open a Pull Request
License
Distributed under the MIT License. See LICENSE for more information.
