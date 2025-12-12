// src/tmdbService.js

// Import necessary Firebase SDK components (assuming your firebase.js exports the functions instance)
import { functions } from './firebase'; 

// Base URLs are generally safe to keep on the client
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Define a single callable function for all TMDB requests
// This function will be called 'tmdbProxy' in the backend
const tmdbProxy = functions.httpsCallable('tmdbProxy');


// Service provider mapping (TMDB provider IDs to readable names)
const SERVICE_MAPPING = {
  8: 'Netflix',
  15: 'Hulu',
  337: 'Disney+',
  384: 'Max',
  9: 'Prime Video',
  350: 'Apple TV+',
  531: 'Paramount+',
  387: 'Peacock',
  Apple: 'Apple TV+',
  HBO: 'Max'
};

export const tmdbService = {
  // Search for movies and TV shows
  async search(query) {
    if (!query.trim()) return [];

    try {
      // 1. Call the secure backend function with the endpoint path and query data
      const response = await tmdbProxy({ 
        path: 'search/multi', 
        params: { query, include_adult: false } 
      });
      
      const data = response.data; // The data returned from the backend is already the TMDB response
      
      // Filter to only movies and TV shows, map to our format
      return data.results
        .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
        .slice(0, 10) // Limit to 10 results
        .map(item => ({
          id: item.id,
          tmdbId: item.id,
          title: item.media_type === 'movie' ? item.title : item.name,
          type: item.media_type === 'movie' ? 'Movie' : 'TV Show',
          year: item.media_type === 'movie' 
            ? item.release_date?.split('-')[0] 
            : item.first_air_date?.split('-')[0],
          overview: item.overview,
          posterPath: item.poster_path ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}` : null,
          backdropPath: item.backdrop_path ? `${TMDB_IMAGE_BASE_URL}${item.backdrop_path}` : null,
          rating: item.vote_average ? item.vote_average.toFixed(1) : null,
          mediaType: item.media_type
        }));
    } catch (error) {
      console.error('TMDB search error:', error);
      return [];
    }
  },

  // Get streaming availability for a movie or TV show (US region)
  async getStreamingProviders(tmdbId, mediaType) {
    try {
      // 1. Call the secure backend function
      const response = await tmdbProxy({ 
        path: `${mediaType}/${tmdbId}/watch/providers` 
      });

      const data = response.data;

      // Get US providers (you can change 'US' to your country code)
      const usProviders = data.results?.US;

      if (!usProviders) return [];

      // Combine all provider types (flatrate = subscription, rent, buy)
      const allProviders = [
        ...(usProviders.flatrate || []),
        ...(usProviders.rent || []),
        ...(usProviders.buy || [])
      ];

      // Remove duplicates and map to readable names
      const uniqueProviders = [...new Map(allProviders.map(p => [p.provider_id, p])).values()];

      return uniqueProviders.map(provider => ({
        id: provider.provider_id,
        name: SERVICE_MAPPING[provider.provider_id] || provider.provider_name,
        logo: `${TMDB_IMAGE_BASE_URL}${provider.logo_path}`
      }));
    } catch (error) {
      console.error('Error fetching streaming providers:', error);
      return [];
    }
  },

  // Get details for a specific movie or TV show
  async getDetails(tmdbId, mediaType) {
    try {
      // 1. Call the secure backend function
      const response = await tmdbProxy({ 
        path: `${mediaType}/${tmdbId}`, 
        params: { append_to_response: 'credits' } 
      });
      
      const data = response.data;

      return {
        id: data.id,
        title: mediaType === 'movie' ? data.title : data.name,
        type: mediaType === 'movie' ? 'Movie' : 'TV Show',
        overview: data.overview,
        posterPath: data.poster_path ? `${TMDB_IMAGE_BASE_URL}${data.poster_path}` : null,
        backdropPath: data.backdrop_path ? `${TMDB_IMAGE_BASE_URL}${data.backdrop_path}` : null,
        rating: data.vote_average ? data.vote_average.toFixed(1) : null,
        releaseDate: data.release_date || data.first_air_date,
        runtime: data.runtime || (data.episode_run_time ? data.episode_run_time[0] : null),
        genres: data.genres?.map(g => g.name).join(', '),
        numberOfSeasons: data.number_of_seasons,
        numberOfEpisodes: data.number_of_episodes
      };
    } catch (error) {
      console.error('Error fetching details:', error);
      return null;
    }
  },

  // Get season details with episodes (for TV shows)
  async getSeasonDetails(tmdbId, seasonNumber) {
    try {
      // 1. Call the secure backend function
      const response = await tmdbProxy({ 
        path: `tv/${tmdbId}/season/${seasonNumber}` 
      });
      
      const data = response.data;

      return {
        seasonNumber: data.season_number,
        episodes: data.episodes?.map(ep => ({
          num: ep.episode_number,
          title: ep.name,
          overview: ep.overview,
          airDate: ep.air_date,
          stillPath: ep.still_path ? `${TMDB_IMAGE_BASE_URL}${ep.still_path}` : null,
          yourRating: 5, // These are placeholder ratings
          spouseRating: 5 // These are placeholder ratings
        })) || []
      };
    } catch (error) {
      console.error('Error fetching season details:', error);
      return null;
    }
  }
};

export default tmdbService;
