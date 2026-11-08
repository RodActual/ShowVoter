// Vercel function: GET /api/tmdb/<tmdb path>?<params>. Needs TMDB_API_KEY in the Vercel project.
import { handleTmdbRequest } from '../../lib/tmdbProxy.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { status, body } = await handleTmdbRequest({
    url: req.url,
    authorization: req.headers.authorization,
    env: process.env
  });
  // TMDB data is the same for everyone; let the browser reuse it briefly.
  if (status === 200) res.setHeader('Cache-Control', 'private, max-age=300');
  res.status(status).json(body);
}
