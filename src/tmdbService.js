// src/tmdbService.js

import { functions } from './firebase';
import { httpsCallable } from 'firebase/functions';

// Base URLs are generally safe to keep on the client
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Define a single callable function for all TMDB requests
const tmdbProxy = httpsCallable(functions, 'tmdbProxy');

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
      const response = await tmdbProxy({ 
        path: 'search/multi', 
        params: { query, include_adult: false } 
      });
      
      const data = response.data;
      
      return data.results
        .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
        .slice(0, 10)
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
      const response = await tmdbProxy({ 
        path: `${mediaType}/${tmdbId}/watch/providers` 
      });

      const data = response.data;
      const usProviders = data.results?.US;

      if (!usProviders) return [];

      const allProviders = [
        ...(usProviders.flatrate || []),
        ...(usProviders.rent || []),
        ...(usProviders.buy || [])
      ];

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
      // FIX: Added 'language: en-US' to ensure params are never empty, preventing 500 errors
      const response = await tmdbProxy({ 
        path: `tv/${tmdbId}/season/${seasonNumber}`,
        params: { language: 'en-US' } 
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
          yourRating: 0, 
          spouseRating: 0 
        })) || []
      };
    } catch (error) {
      console.error(`Error fetching season ${seasonNumber}:`, error);
      return null;
    }
  }
};

export default tmdbService;