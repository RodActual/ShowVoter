// functions/index.js

const functions = require("firebase-functions/v1"); // Use V1 for 'functions.region(...)'
const admin = require("firebase-admin");
const axios = require("axios");

// Initialize Firebase Admin SDK once
admin.initializeApp();

// Set the region explicitly (matching the client-side fix)
const region = "us-central1"; 

// The secure proxy function exposed to the client
exports.tmdbProxy = functions.region(region).https.onCall(async (data, context) => {
    
    // 1. Check Authentication (Essential for security)
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated', 
            'Authentication required to use this service.'
        );
    }
    
    // 2. Access the secure TMDB key (from functions/.env, accessed automatically by the runtime)
    // NOTE: This key must be set in your functions environment, NOT .env.local
const TMDB_API_KEY = functions.config().tmdb?.api_key || process.env.TMDB_API_KEY;
    
    // 3. Extract path and params from the client data
    const { path, params } = data;
    
    // 4. Make the secure server-side API call
    try {
        const response = await axios.get(`https://api.themoviedb.org/3/${path}`, {
            params: {
                ...params,
                api_key: TMDB_API_KEY // Inject the secure key here
            }
        });
        
        // 5. Return data back to the client
        return response.data;
        
    } catch (error) {
        // Log the error detail for debugging
        console.error("TMDB API Error:", error.response.data); 
        
        throw new functions.https.HttpsError(
            'internal', 
            'TMDB API failed to retrieve data.',
            error.response.data // Pass error detail for client-side debugging
        );
    }
});