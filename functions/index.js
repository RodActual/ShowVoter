// functions/index.js (Requires firebase-functions and axios or node-fetch)
const functions = require('firebase-functions');
const axios = require('axios'); // A standard HTTP client

// --- Configuration ---
// Load TMDB_API_KEY from the environment variable set via 'firebase functions:config' or .env
const TMDB_API_KEY = process.env.TMDB_API_KEY; 
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Cloud Function to proxy the search request
exports.searchTmdb = functions.https.onCall(async (data, context) => {
    // 1. (Security Check): Ensure the user is authenticated 
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The request requires authentication.');
    }

    const { query } = data; // Get the query from the client data
    if (!query) {
        throw new functions.https.HttpsError('invalid-argument', 'The search query is missing.');
    }

    try {
        // 2. Make the secure server-side call using the secret key
        const url = `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false`;

        const response = await axios.get(url);

        // 3. Process/filter data and return
        return response.data.results
            .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
            .slice(0, 10)
            .map(item => ({
                // Map items as you did in your original service file
                id: item.id,
                title: item.media_type === 'movie' ? item.title : item.name,
                // ... (Include other fields you need)
                mediaType: item.media_type
            }));

    } catch (error) {
        console.error('TMDB API Error:', error.message);
        throw new functions.https.HttpsError('internal', 'Failed to fetch data from TMDB.');
    }
});
