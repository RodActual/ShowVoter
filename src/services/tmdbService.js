// src/services/tmdbService.js

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const APP_TOKEN = import.meta.env.VITE_APP_TOKEN || '';

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

async function tmdbProxy(path, params = {}) {
  const url = new URL(`/api/tmdb/${path}`, location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, value);
  });

  const res = await fetch(url, {
    headers: APP_TOKEN ? { Authorization: `Bearer ${APP_TOKEN}` } : {}
  });
  if (!res.ok) throw new Error(`TMDB proxy error (${res.status})`);
  return res.json();
}

export const tmdbService = {
  async search(query) {
    if (!query.trim()) return [];

    try {
      const data = await tmdbProxy('search/multi', { query, include_adult: false });

      return data.results
        .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
        .slice(0, 10)
        .map(item => ({
          id: item.id,
          tmdbId: item.id,
          title: item.media_type === 'movie' ? item.title : item.name,
          type: item.media_type === 'movie' ? 'Movie' : 'TV Show',
          // Feature 10 Requirement: Store full date for countdowns
          releaseDate: item.media_type === 'movie' ? item.release_date : item.first_air_date,
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
        numberOfEpisodes: data.number_of_episodes
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
