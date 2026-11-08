// Streaming services the app knows by name (TMDB provider names are mapped to these in tmdbService).
export const STREAMING_SERVICES = ['Netflix', 'Hulu', 'Disney+', 'Max', 'Prime Video', 'Apple TV+', 'Paramount+', 'Peacock'];

// True when the title's saved service is one you subscribe to. With no services chosen, everything counts.
export const onOurServices = (item, ours = []) => ours.length === 0 || ours.includes(item.service);

// From live TMDB providers: the subscription ones that are yours, and the best service to save for the title.
export function matchProviders(providers = [], ours = []) {
  const subscription = providers.filter((p) => p.kind === 'flatrate');
  const mine = subscription.filter((p) => ours.includes(p.name));
  return { subscription, mine, best: (mine[0] || subscription[0] || null)?.name || null };
}
