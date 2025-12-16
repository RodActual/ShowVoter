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
Getting Started
Prerequisites
 * Node.js (v14 or higher)
 * A Firebase Project (Firestore & Authentication enabled)
 * A TMDB (The Movie Database) API Key
Installation
 * Clone the repository:
   git clone https://github.com/yourusername/watch-together.git
cd watch-together

 * Install dependencies:
   npm install

 * Install required icons and services:
   npm install lucide-react firebase

Configuration
 * Firebase Setup:
   * Create a src/services/firebase.js file.
   * Paste your Firebase configuration keys:
     import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);

 * Cloud Functions (Backend Proxy):
   * Since TMDB requires an API key, it is best practice to proxy requests through a Firebase Cloud Function to keep your key hidden.
   * Deploy a function named tmdbProxy that forwards requests to https://api.themoviedb.org/3/.
Running the App
npm run dev

Open http://localhost:5173 to view it in the browser.
Project Structure
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
│       ├── RatingModal.jsx
│       └── UserSelectModal.jsx
├── services/            # API & Database logic
│   ├── firebase.js
│   └── tmdbService.js
└── WatchTogether.jsx    # Main Controller

User Roles
The app is currently hardcoded for two users (e.g., "Anthony" and "Pam"). You can modify the UserSelectModal and the COUPLE_ID constant in WatchTogether.jsx to customize this for different users.
Contributing
 * Fork the Project
 * Create your Feature Branch (git checkout -b feature/AmazingFeature)
 * Commit your Changes (git commit -m 'Add some AmazingFeature')
 * Push to the Branch (git push origin feature/AmazingFeature)
 * Open a Pull Request
License
Distributed under the MIT License. See LICENSE for more information.
