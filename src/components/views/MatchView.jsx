import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, X, Play, Star, RefreshCw, Sparkles, Undo2 } from 'lucide-react';
import tmdbService from '../../services/tmdbService';
import { userName } from '../../users';
import { buildQueue } from '../../match';
import { becauseText } from '../../recommend';
import useForYou from '../../useForYou';

const THRESHOLD = 110;

// Loads TMDB trending, a page at a time (personal picks come from useForYou).
function useTrending() {
  const [candidates, setCandidates] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    tmdbService.trending(page)
      .then((list) => { if (!cancelled) { setCandidates((prev) => [...prev, ...list]); setStatus('ready'); } })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [page, attempt]);

  return {
    candidates,
    status,
    loadMore: () => setPage((p) => p + 1),
    retry: () => { setStatus('loading'); setAttempt((a) => a + 1); }
  };
}

// "For you" list: ranked recommendations with the reason; tap to preview and add.
const ForYouList = ({ items, status, onPreview }) => {
  if (status === 'loading') {
    return (
      <ul role="status" aria-label="Loading recommendations" className="space-y-2">
        {[0, 1, 2, 3].map((i) => <li key={i} className="h-[88px] rounded-xl bg-gray-800 animate-pulse" />)}
      </ul>
    );
  }
  if (status === 'empty') return <p className="text-gray-200 py-8 text-center">Rate a few shows 7+ or set priorities on To Watch, and recommendations show up here.</p>;
  if (status === 'error') return <p className="text-red-200 py-8 text-center">Couldn't load recommendations.</p>;
  if (items.length === 0) return <p className="text-gray-200 py-8 text-center">Nothing new to suggest right now.</p>;
  return (
    <ul className="grid gap-2 md:grid-cols-2">
      {items.slice(0, 40).map((r) => (
        <li key={r.key}>
          <button
            type="button"
            onClick={() => onPreview(r, becauseText(r.because))}
            className="w-full text-left flex items-center gap-3 p-1.5 pr-3 rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-700"
          >
            <img src={r.posterPath} alt="" loading="lazy" className="w-10 h-[60px] object-cover rounded-md shrink-0 bg-gray-700" />
            <span className="flex-1 min-w-0">
              <span className="font-semibold text-white leading-snug line-clamp-1">{r.title}</span>
              <span className="block text-xs text-gray-200 truncate">{[r.type, r.year].filter(Boolean).join(' · ')}</span>
              <span className="block text-xs text-purple-100 truncate">{becauseText(r.because)}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
};

const MatchCard = ({ card, partnerName, onVote, onTrailer }) => {
  const [dx, setDx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const start = useRef(null);
  const mode = useRef(null);

  const onPointerDown = (e) => { start.current = { x: e.clientX, y: e.clientY }; mode.current = null; setAnimating(false); };
  const onPointerMove = (e) => {
    if (!start.current) return;
    const ddx = e.clientX - start.current.x;
    const ddy = e.clientY - start.current.y;
    if (!mode.current) {
      if (Math.abs(ddx) < 10 && Math.abs(ddy) < 10) return;
      mode.current = Math.abs(ddx) > Math.abs(ddy) ? 'h' : 'v';
      if (mode.current === 'h') e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    if (mode.current === 'h') setDx(ddx);
  };
  const onPointerUp = () => {
    if (!start.current) return;
    start.current = null;
    setAnimating(true);
    if (dx >= THRESHOLD) onVote('yes');
    else if (dx <= -THRESHOLD) onVote('no');
    setDx(0);
  };

  const hint = dx >= 40 ? 'yes' : dx <= -40 ? 'no' : null;

  return (
    <article
      aria-labelledby="match-title"
      className={`relative h-[52dvh] min-h-[320px] w-full rounded-2xl overflow-hidden border border-gray-700 bg-gray-800 touch-pan-y select-none ${animating ? 'transition-transform duration-200' : ''}`}
      style={{ transform: `translateX(${dx}px) rotate(${dx / 25}deg)` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {card.posterPath
        ? <img src={card.posterPath} alt="" draggable="false" className="absolute inset-0 w-full h-full object-cover bg-gray-700" />
        : <div aria-hidden="true" className="absolute inset-0 bg-gray-700" />}

      <div className="absolute top-3 inset-x-3 flex justify-between items-start gap-2">
        {card.partnerYes
          ? (
            <span className="bg-pink-700 text-white text-sm font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow">
              <Sparkles size={14} aria-hidden="true" /> {partnerName} said yes
            </span>
            )
          : <span />}
        <button
          type="button"
          onClick={() => onTrailer(card)}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={`Play trailer for ${card.title}`}
          className="min-w-11 min-h-11 rounded-full bg-gray-900/70 text-white flex items-center justify-center"
        >
          <Play size={18} aria-hidden="true" />
        </button>
      </div>

      {hint && (
        <span
          aria-hidden="true"
          className={`absolute top-20 ${hint === 'yes' ? 'right-6 border-green-400 text-green-300' : 'left-6 border-red-400 text-red-300'} border-4 rounded-xl px-3 py-1 text-2xl font-black uppercase rotate-[-8deg] bg-gray-900/60`}
        >
          {hint === 'yes' ? 'Yes' : 'Nope'}
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 p-4 pt-16 bg-gradient-to-t from-gray-950 via-gray-950/85 to-transparent">
        <h2 id="match-title" className="text-xl font-bold text-white leading-snug line-clamp-2">{card.title}</h2>
        <p className="text-sm text-gray-100 mt-1 flex items-center gap-2 flex-wrap">
          <span>{[card.type, card.year].filter(Boolean).join(' · ')}</span>
          {card.rating && (
            <span className="flex items-center gap-1">
              <Star size={14} aria-hidden="true" className="fill-yellow-400 text-yellow-400" /> {card.rating}
            </span>
          )}
        </p>
        {card.because?.length ? <p className="text-xs text-purple-100 mt-1 truncate">{becauseText(card.because)}</p> : null}
        {card.overview && <p className="text-sm text-gray-100 mt-1 line-clamp-2">{card.overview}</p>}
      </div>
    </article>
  );
};

// Match tab: each person votes on their own phone; titles you both say Yes to land on To Watch.
const MatchView = ({ currentUser, settings, votes, toWatch, watched, onVote, onUndo, onTrailer, onPreview }) => {
  const [view, setView] = useState('swipe'); // swipe | forYou
  const forYou = useForYou({ toWatch, watched, votes });
  const trending = useTrending();
  const status = trending.status === 'ready' || forYou.status === 'ready' ? 'ready' : trending.status;
  const { loadMore, retry } = trending;
  // Personal picks first, then trending.
  const candidates = useMemo(() => [...forYou.items, ...trending.candidates], [forYou.items, trending.candidates]);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(null); // last non-match vote, for Undo
  const partner = currentUser === 'user1' ? 'user2' : 'user1';
  const queue = useMemo(
    () => buildQueue({ candidates, votes, toWatch, watched, me: currentUser }),
    [candidates, votes, toWatch, watched, currentUser]
  );
  const card = queue[0];
  const matches = votes.filter((v) => v.matchedAt).length;

  // Keep a few cards ahead.
  useEffect(() => {
    if (status === 'ready' && queue.length < 5) loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, queue.length]);

  const vote = async (value) => {
    if (!card || busy) return;
    setBusy(true);
    try {
      const matched = await onVote(card, value);
      setLast(matched === false ? { key: card.key, title: card.title } : null);
    } finally {
      setBusy(false);
    }
  };

  const bigButton = 'w-16 h-16 rounded-full flex items-center justify-center shadow-xl disabled:opacity-50';

  const tabButton = (key, label) => (
    <button
      type="button"
      aria-pressed={view === key}
      onClick={() => setView(key)}
      className={`flex-1 min-h-11 rounded-lg text-sm font-semibold ${view === key ? 'bg-gray-700 text-white' : 'text-gray-200'}`}
    >
      {label}
    </button>
  );

  if (view === 'forYou') {
    return (
      <section aria-labelledby="foryou-heading" className="max-w-3xl mx-auto">
        <div role="group" aria-label="Match view" className="flex gap-1 p-1 mb-3 rounded-xl bg-gray-800 max-w-md mx-auto">
          {tabButton('swipe', 'Swipe')}
          {tabButton('forYou', 'For you')}
        </div>
        <h2 id="foryou-heading" className="text-sm text-gray-200 mb-3">Picked from what you both loved and what you're planning to watch.</h2>
        <ForYouList items={forYou.items} status={forYou.status} onPreview={onPreview} />
      </section>
    );
  }

  return (
    <section aria-labelledby="match-heading" className="max-w-md mx-auto">
      <div role="group" aria-label="Match view" className="flex gap-1 p-1 mb-3 rounded-xl bg-gray-800">
        {tabButton('swipe', 'Swipe')}
        {tabButton('forYou', 'For you')}
      </div>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 id="match-heading" className="text-sm text-gray-200">
          Both say yes and it goes to To Watch.
          <span className="sr-only"> Swipe right or tap the heart for yes, swipe left or tap X for no. You're voting with {userName(settings, partner)}.</span>
        </h2>
        {matches > 0 && <p className="text-xs text-pink-200 shrink-0">{matches} match{matches === 1 ? '' : 'es'}</p>}
      </div>

      {status === 'loading' && !card ? (
        <div role="status" aria-label="Loading suggestions" className="rounded-2xl bg-gray-800 h-[52dvh] min-h-[320px] animate-pulse" />
      ) : status === 'error' && !card ? (
        <div className="text-center py-10">
          <p className="text-red-200 mb-3">Couldn't load suggestions.</p>
          <button type="button" onClick={retry} className="min-h-11 px-4 rounded-lg bg-gray-700 text-white font-semibold inline-flex items-center gap-2">
            <RefreshCw size={16} aria-hidden="true" /> Try again
          </button>
        </div>
      ) : !card ? (
        <div className="text-center py-10">
          <p className="text-gray-200 mb-3">You're all caught up.</p>
          <button type="button" onClick={loadMore} className="min-h-11 px-4 rounded-lg bg-gray-700 text-white font-semibold inline-flex items-center gap-2">
            <RefreshCw size={16} aria-hidden="true" /> Load more
          </button>
        </div>
      ) : (
        <>
          <MatchCard key={card.key} card={card} partnerName={userName(settings, partner)} onVote={vote} onTrailer={onTrailer} />
          <div className="flex justify-center gap-10 mt-4">
            <button type="button" onClick={() => vote('no')} disabled={busy} aria-label={`No to ${card.title}`} className={`${bigButton} bg-gray-800 border-2 border-red-400 text-red-300`}>
              <X size={30} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => vote('yes')} disabled={busy} aria-label={`Yes to ${card.title}`} className={`${bigButton} bg-green-700 text-white`}>
              <Heart size={28} aria-hidden="true" className="fill-white" />
            </button>
          </div>
        </>
      )}

      {last && (
        <div className="flex justify-center mt-2">
          <button
            type="button"
            onClick={() => { onUndo(last.key); setLast(null); }}
            className="min-h-11 px-4 rounded-lg text-gray-100 hover:bg-gray-800 inline-flex items-center gap-2 text-sm"
          >
            <Undo2 size={16} aria-hidden="true" /> Undo vote on {last.title}
          </button>
        </div>
      )}
    </section>
  );
};

export default MatchView;
