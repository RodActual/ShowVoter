// src/services/tmdbService.js
// TMDB calls go through the Vercel function in api/tmdb, which holds the API key and
// only answers requests carrying the signed-in user's Firebase ID token.
import api from './api';

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const SERVICE_MAPPING = {
  8: 'Netflix',
  15: 'Hulu',
  337: 'Disney+',
  384: 'Max',
  9: 'Prime Video',
  350: 'Apple TV+',
  531: 'Paramount+',
  387: 'Peacock'
};

// In-memory cache of successful GETs for this session (TMDB data changes slowly). Failures aren't cached.
const cache = new Map();

async function tmdbProxy(path, params = {}) {
  const cacheKey = `${path}?${new URLSearchParams(Object.entries(params).filter(([, v]) => v != null)).toString()}`;
  if (!cache.has(cacheKey)) {
    cache.set(cacheKey, fetchTmdb(path, params).catch((err) => { cache.delete(cacheKey); throw err; }));
  }
  return cache.get(cacheKey);
}

async function fetchTmdb(path, params) {
  const url = new URL(`/api/tmdb/${path}`, location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, value);
  });

  const token = await api.getIdToken();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`TMDB proxy error (${res.status})`);
  return res.json();
}

// TMDB list item -> app title. `fallbackType` covers endpoints whose items lack media_type.
function toTitle(item, fallbackType) {
  const mediaType = item.media_type || fallbackType;
  const isMovieType = mediaType === 'movie';
  const date = isMovieType ? item.release_date : item.first_air_date;
  return {
    id: `${mediaType}-${item.id}`, // TMDB movie and TV ids overlap
    tmdbId: item.id,
    title: isMovieType ? item.title : item.name,
    type: isMovieType ? 'Movie' : 'TV Show',
    releaseDate: date,
    year: date?.split('-')[0],
    overview: item.overview,
    posterPath: item.poster_path ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}` : null,
    backdropPath: item.backdrop_path ? `${TMDB_IMAGE_BASE_URL}${item.backdrop_path}` : null,
    rating: item.vote_average ? item.vote_average.toFixed(1) : null,
    mediaType
  };
}

const isTitle = (mediaType) => mediaType === 'movie' || mediaType === 'tv';

export const tmdbService = {
  // Throws on failure so the caller can tell "no matches" from "search failed".
  async search(query) {
    if (!query.trim()) return [];
    const data = await tmdbProxy('search/multi', { query, include_adult: false });
    return (data.results || []).filter((item) => isTitle(item.media_type)).slice(0, 10).map((item) => toTitle(item));
  },

  // Match mode feeds. Both throw on failure.
  async trending(page = 1) {
    const data = await tmdbProxy('trending/all/week', { page });
    return (data.results || []).filter((item) => isTitle(item.media_type) && item.poster_path).map((item) => toTitle(item));
  },

  // "More like this": TMDB recommendations, falling back to similar titles when there are none.
  async recommendations(tmdbId, mediaType) {
    const data = await tmdbProxy(`${mediaType}/${tmdbId}/recommendations`);
    let results = data.results || [];
    if (results.length === 0) results = (await tmdbProxy(`${mediaType}/${tmdbId}/similar`)).results || [];
    return results.filter((item) => item.poster_path).map((item) => toTitle(item, mediaType));
  },

  async getStreamingProviders(tmdbId, mediaType) {
    try {
      const data = await tmdbProxy(`${mediaType}/${tmdbId}/watch/providers`);
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

  async getDetails(tmdbId, mediaType) {
    try {
      const data = await tmdbProxy(`${mediaType}/${tmdbId}`, { append_to_response: 'credits' });

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
        numberOfEpisodes: data.number_of_episodes,
        lastEpisodeToAir: data.last_episode_to_air
          ? { season: data.last_episode_to_air.season_number, num: data.last_episode_to_air.episode_number }
          : null
      };
    } catch (error) {
      console.error('Error fetching details:', error);
      return null;
    }
  },

  async getSeasonDetails(tmdbId, seasonNumber) {
    try {
      const data = await tmdbProxy(`tv/${tmdbId}/season/${seasonNumber}`, { language: 'en-US' });

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
  },

  // Feature 7: New Method for Trailers
  async getVideos(tmdbId, mediaType) {
    try {
      const data = await tmdbProxy(`${mediaType}/${tmdbId}/videos`, { language: 'en-US' });

      // Look for official Trailer on YouTube
      const trailer = data.results.find(v => v.site === 'YouTube' && v.type === 'Trailer') ||
                      data.results.find(v => v.site === 'YouTube');

      return trailer ? trailer.key : null;
    } catch (error) {
      console.error('Error fetching videos:', error);
      return null;
    }
  }
};

export default tmdbService;
