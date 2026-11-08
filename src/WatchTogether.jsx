// src/WatchTogether.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, RefreshCw, Settings } from 'lucide-react';
import api from './services/api';
import tmdbService from './services/tmdbService';

import TabBar from './components/layout/TabBar';
import FilterBar from './components/lists/FilterBar';
import SwipeRow from './components/lists/SwipeRow';
import TitleRow from './components/lists/TitleRow';
import TonightsPick from './components/lists/TonightsPick';
import TitleSheet from './components/sheets/TitleSheet';
import StatsView from './components/views/StatsView';
import MatchView from './components/views/MatchView';
import AddModal from './components/modals/AddModal';
import RatingModal from './components/modals/RatingModal';
import UserSelectModal from './components/modals/UserSelectModal';
import TrailerModal from './components/modals/TrailerModal';
import SettingsModal from './components/modals/SettingsModal';
import TitlePreview from './components/modals/TitlePreview';
import { useToast } from './components/common/Toast';
import { DEFAULT_SETTINGS, USER_KEYS, averageRating, priorityField, ratingField, resolveUserKey, userName } from './users';
import { isMovie, lastWatchedEpisode, localDateString, mediaTypeOf, sameTitle } from './titles';
import { isCaughtUp, mergeEpisode, nextAfter, removeEpisode } from './progress';
import { matchProviders } from './streaming';
import { filterItems, groupByMonth, hasActiveFilters, nextPick, pickPool, servicesOf, sortItems } from './lists';

const NO_FILTERS = { query: '', kind: 'all', services: [], ours: false };
const SORT_OPTIONS = {
  toWatch: [['priority', 'Priority'], ['title', 'Title'], ['service', 'Service']],
  watched: [['recent', 'Recent'], ['rating', 'Rating'], ['title', 'Title']]
};

const SETTINGS_CACHE_KEY = 'watchTogetherSettings';
const CURRENT_USER_KEY = 'watchTogetherUser';
const today = () => new Date().toISOString().split('T')[0];

function readCachedSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_CACHE_KEY));
    return saved && typeof saved === 'object' ? { ...DEFAULT_SETTINGS, ...saved } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function readSavedUser() {
  try {
    return resolveUserKey(localStorage.getItem(CURRENT_USER_KEY), readCachedSettings());
  } catch {
    return null;
  }
}

// Live Firestore collection; Firestore handles reconnects and offline edits.
function useLiveCollection(collection, enabled) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    if (!enabled) return undefined;
    return api.watchCollection(collection, {
      onItems: (list) => { setItems(list); setStatus('ready'); },
      onError: (err) => { console.error(err); setStatus('error'); }
    });
  }, [collection, enabled]);

  return { items, status };
}

const WatchTogether = () => {
  const toast = useToast();
  const [appSettings, setAppSettings] = useState(readCachedSettings);
  const [currentUser, setCurrentUser] = useState(readSavedUser); // 'user1' | 'user2'
  const [showUserSelect, setShowUserSelect] = useState(() => !readSavedUser());
  const [activeTab, setActiveTab] = useState('toWatch');
  const [modal, setModal] = useState(null); // 'add' | 'rate' | 'settings' | 'trailer'
  const [sheet, setSheet] = useState(null); // { id, mode } of the title whose detail sheet is open
  const [filters, setFilters] = useState({ toWatch: NO_FILTERS, watched: NO_FILTERS });
  const [sorts, setSorts] = useState({ toWatch: 'priority', watched: 'recent' });
  const [tonightId, setTonightId] = useState(null);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [itemToRate, setItemToRate] = useState(null);
  const [trailer, setTrailer] = useState(null);
  const [preview, setPreview] = useState(null); // { title, because } for a title not on your lists

  const { items: toWatch, status: toWatchStatus } = useLiveCollection('toWatch', Boolean(currentUser));
  const { items: watched, status: watchedStatus } = useLiveCollection('watched', Boolean(currentUser));
  const { items: votes, status: votesStatus } = useLiveCollection('votes', Boolean(currentUser));

  // "It's a match" toast on both phones: announce matches that appear after the first snapshot.
  const seenMatches = useRef(null);
  useEffect(() => {
    if (votesStatus !== 'ready') return;
    const matched = votes.filter((v) => v.matchedAt);
    if (seenMatches.current === null) {
      seenMatches.current = new Set(matched.map((v) => v.id)); // existing matches are old news
      return;
    }
    matched.filter((v) => !seenMatches.current.has(v.id)).forEach((v) => {
      seenMatches.current.add(v.id);
      toast({
        message: `It's a match! ${v.title} is on To Watch.`,
        tone: 'success',
        action: { label: 'View', onClick: () => { setActiveTab('toWatch'); setSheet({ id: `match-${v.id}`, mode: 'toWatch' }); } },
        duration: 8000
      });
    });
  }, [votes, votesStatus, toast]);

  const closeModal = () => setModal(null);

  // Runs a write; on failure shows an error toast. Returns true on success.
  const attempt = useCallback(async (fn, failMessage) => {
    try {
      await fn();
      return true;
    } catch (err) {
      console.error(err);
      toast({ message: failMessage, tone: 'error' });
      return false;
    }
  }, [toast]);

  // Shared settings (names/colors) live on the server; localStorage only speeds up first paint.
  useEffect(() => {
    try { localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(appSettings)); } catch { /* storage blocked */ }
  }, [appSettings]);

  useEffect(() => {
    const applySettings = (doc) => {
      if (!doc) return;
      const { id, ...rest } = doc;
      setAppSettings({ ...DEFAULT_SETTINGS, ...rest });
    };
    return api.watchDoc('settings', 'app', { onDoc: applySettings, onError: (err) => console.error(err) });
  }, []);

  const handleSaveSettings = async (newSettings) => {
    setAppSettings(newSettings);
    closeModal();
    if (await attempt(() => api.setDoc('settings', 'app', newSettings), "Couldn't save settings.")) {
      toast({ message: 'Settings saved', tone: 'success' });
    }
  };

  // Backup: downloads everything as JSON (Firestore's scheduled exports need the paid plan).
  const handleExport = () => {
    const data = { exportedAt: new Date().toISOString(), settings: appSettings, toWatch, watched };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `watch-together-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ message: `Exported ${toWatch.length + watched.length} titles`, tone: 'success' });
  };

  const handleSignOut = () => attempt(() => api.logout(), "Couldn't sign out.");

  const handleUserSelect = (userKey) => {
    if (!USER_KEYS.includes(userKey)) return;
    setCurrentUser(userKey);
    try { localStorage.setItem(CURRENT_USER_KEY, userKey); } catch { /* storage blocked */ }
    setShowUserSelect(false);
  };

  const handleAddItem = async (selectedShow, selectedService) => {
    if (!selectedShow) return;
    if (toWatch.some((t) => sameTitle(t, selectedShow))) {
      toast({ message: `${selectedShow.title} is already on your list.` });
      closeModal();
      return;
    }
    const ok = await attempt(() => api.setDoc('toWatch', api.newId(), {
      title: selectedShow.title,
      type: selectedShow.type,
      service: selectedService,
      anthonyPriority: 0,
      pamPriority: 0,
      tmdbId: selectedShow.tmdbId,
      mediaType: selectedShow.mediaType,
      posterPath: selectedShow.posterPath,
      overview: selectedShow.overview,
      rating: selectedShow.rating,
      year: selectedShow.year,
      releaseDate: selectedShow.releaseDate,
      addedDate: today(),
      addedBy: currentUser,
      createdAt: new Date().toISOString()
    }), "Couldn't add the title.");
    if (!ok) return;
    closeModal();
    toast({ message: `Added ${selectedShow.title}`, tone: 'success' });
  };

  const handleMarkWatched = (item) => {
    setSheet(null);
    setItemToRate(item);
    setModal('rate');
  };

  const handleSubmitRating = async (myOverall, episodes = [], isDNF = false) => {
    const { id, ...itemData } = itemToRate;
    const myField = ratingField(currentUser);
    const otherField = ratingField(currentUser === 'user1' ? 'user2' : 'user1');

    const cleanNewEpisodes = episodes.filter((ep) => ep.isSelected).map(({ isSelected, ...ep }) => ep);
    const existingShow = watched.find((w) => sameTitle(w, itemToRate));

    let finalEpisodes = cleanNewEpisodes;
    if (existingShow) {
      const episodeMap = new Map();
      (existingShow.episodes || []).forEach((ep) => episodeMap.set(`${ep.season}-${ep.num}`, ep));
      cleanNewEpisodes.forEach((ep) => episodeMap.set(`${ep.season}-${ep.num}`, ep));
      finalEpisodes = Array.from(episodeMap.values());
    }

    // My overall rating: what I picked, else my episode average, else what was already saved.
    let myRating = myOverall || 0;
    if (!myRating && !isDNF) myRating = Math.round(averageRating(...finalEpisodes.map((e) => e[myField])));
    if (!myRating && existingShow) myRating = existingShow[myField] || 0;

    const doc = {
      ...itemData,
      [myField]: myRating,
      watchedDate: today(),
      episodes: finalEpisodes.length > 0 ? finalEpisodes : null,
      ratedBy: currentUser,
      status: isDNF ? 'DNF' : 'Completed',
      updatedAt: new Date().toISOString()
    };
    delete doc.isNewEpisodes;
    if (!existingShow) doc[otherField] = 0; // never overwrite the partner's saved rating

    const saved = await attempt(() => api.setDoc('watched', existingShow ? existingShow.id : api.newId(), doc), "Couldn't save the rating.");
    if (!saved) return; // keep the modal open so nothing is lost

    const allFinished = episodes.length === 0 || episodes.every((ep) => ep.isSelected);
    if (isMovie(itemToRate) || allFinished || isDNF) {
      await attempt(() => api.deleteDoc('toWatch', itemToRate.id), "Saved, but couldn't remove it from To Watch.");
    }
    closeModal();
    setItemToRate(null);
    toast({ message: isDNF ? `${itemToRate.title} marked as abandoned` : `${itemToRate.title} moved to Watched`, tone: 'success' });
  };

  const handlePlayTrailer = async (item) => {
    const videoKey = await tmdbService.getVideos(item.tmdbId, mediaTypeOf(item));
    if (videoKey) {
      setTrailer({ key: videoKey, title: item.title });
      setModal('trailer');
    } else {
      toast({ message: `No trailer found for ${item.title}.` });
    }
  };

  // Re-adds watched shows whose latest aired episode is newer than the last one you logged.
  const handleCheckForUpdates = async () => {
    setIsCheckingUpdates(true);
    let added = 0;
    let failed = 0;
    const shows = watched.filter((item) => !isMovie(item) && item.status !== 'DNF' && item.tmdbId && !toWatch.some((t) => sameTitle(t, item)));
    for (const show of shows) {
      const details = await tmdbService.getDetails(show.tmdbId, 'tv');
      if (!details) { failed++; continue; }
      const aired = details.lastEpisodeToAir;
      const last = lastWatchedEpisode(show.episodes || []);
      const hasNew = aired && (!last || aired.season > last.season || (aired.season === last.season && aired.num > last.num));
      if (!hasNew) continue;
      try {
        await api.setDoc('toWatch', api.newId(), {
          title: show.title,
          type: 'TV Show',
          service: show.service || 'Unknown',
          anthonyPriority: 0,
          pamPriority: 0,
          tmdbId: show.tmdbId,
          mediaType: 'tv',
          posterPath: show.posterPath,
          overview: show.overview,
          rating: show.rating,
          year: show.year,
          addedDate: today(),
          addedBy: 'System',
          createdAt: new Date().toISOString(),
          isNewEpisodes: true
        });
        added++;
      } catch {
        failed++;
      }
    }
    setIsCheckingUpdates(false);
    if (failed) toast({ message: `Couldn't check ${failed} show${failed > 1 ? 's' : ''}. Try again later.`, tone: 'error' });
    toast({ message: added ? `Found new episodes for ${added} show${added > 1 ? 's' : ''}.` : 'No new episodes.', tone: added ? 'success' : 'info' });
    if (added) setActiveTab('toWatch');
  };

  // Delete right away, with Undo that puts the same document back.
  const handleDelete = async (collection, item) => {
    const { id, ...data } = item;
    setSheet(null);
    if (!(await attempt(() => api.deleteDoc(collection, id), `Couldn't delete ${item.title}.`))) return;
    toast({
      message: `Deleted ${item.title}`,
      action: { label: 'Undo', onClick: () => attempt(() => api.setDoc(collection, id, data), "Couldn't restore it.") },
      duration: 7000
    });
  };

  // Match mode vote. Returns true on a match, false otherwise, null on failure.
  const handleVote = async (card, value) => {
    try {
      const matched = await api.castVote(card, currentUser, value);
      if (matched) {
        // Fill in where to stream it (best effort; the match is already saved).
        tmdbService.getStreamingProviders(card.tmdbId, card.mediaType).then((providers) => {
          const service = matchProviders(providers, appSettings.services || []).best || providers[0]?.name;
          if (service) api.setDoc('toWatch', `match-${card.key}`, { service }).catch(() => {});
        });
      }
      return matched;
    } catch (err) {
      console.error(err);
      toast({ message: navigator.onLine ? "Couldn't save your vote." : 'Voting needs a connection.', tone: 'error' });
      return null;
    }
  };

  const handleUndoVote = (key) =>
    attempt(() => api.setDoc('votes', key, { [currentUser]: null }), "Couldn't undo the vote.");

  const handleSetPriority = (item, value) =>
    attempt(() => api.setDoc('toWatch', item.id, { [priorityField(currentUser)]: value }), "Couldn't save your priority.");

  const handleSetRating = (item, value) =>
    attempt(() => api.setDoc('watched', item.id, { [ratingField(currentUser)]: value }), "Couldn't save your rating.");

  // Changing an episode rating also updates your overall rating to your episode average.
  const handleSetEpisodeRating = (item, episode, value) => {
    const field = ratingField(currentUser);
    const episodes = (item.episodes || []).map((ep) => (ep.season === episode.season && ep.num === episode.num ? { ...ep, [field]: value } : ep));
    const avg = Math.round(averageRating(...episodes.map((e) => e[field])));
    return attempt(() => api.setDoc('watched', item.id, { episodes, [field]: avg || item[field] || 0 }), "Couldn't save the episode rating.");
  };

  // --- Episode progress (#38) -------------------------------------------------
  // The Watched entry that holds a show's logged episodes (TV shows in progress live on both lists).
  const progressEntry = (item) => watched.find((w) => w.id === item.id) || watched.find((w) => sameTitle(w, item));

  // Works out the next episode to log from TMDB season lengths. Returns { season, num, title } or null.
  const findNextEpisode = async (item) => {
    const last = lastWatchedEpisode(progressEntry(item)?.episodes || []);
    let target;
    if (!last) {
      target = { season: 1, num: 1 };
    } else {
      const season = await tmdbService.getSeasonDetails(item.tmdbId, last.season);
      const nextSeason = season?.episodes && last.num >= season.episodes.length
        ? await tmdbService.getSeasonDetails(item.tmdbId, last.season + 1)
        : null;
      target = nextAfter(last, season?.episodes?.length || last.num + 1, Boolean(nextSeason?.episodes?.length));
    }
    if (!target) return null;
    const info = (await tmdbService.getSeasonDetails(item.tmdbId, target.season))?.episodes?.find((e) => e.num === target.num);
    return { ...target, title: info?.title || `Episode ${target.num}`, airDate: info?.airDate || null };
  };

  // Logs one episode as watched (ratings can be added later), with Undo, and offers Finish when caught up.
  const handleLogEpisode = async (item, ep) => {
    const entry = progressEntry(item);
    const before = entry?.episodes || [];
    const record = { season: ep.season, num: ep.num, title: ep.title || `Episode ${ep.num}`, anthonyRating: 0, pamRating: 0 };
    const episodes = mergeEpisode(before, record);
    const id = entry?.id || api.newId();
    const doc = entry
      ? { episodes, watchedDate: today() }
      : {
        title: item.title, type: item.type || 'TV Show', mediaType: 'tv', tmdbId: item.tmdbId, service: item.service || 'Other',
        posterPath: item.posterPath || null, overview: item.overview || '', rating: item.rating || null, year: item.year || null,
        anthonyRating: 0, pamRating: 0, status: 'In progress', watchedDate: today(), episodes
      };
    if (!(await attempt(() => api.setDoc('watched', id, doc), "Couldn't log the episode."))) return;

    const undo = () => attempt(
      () => (entry ? api.setDoc('watched', id, { episodes: removeEpisode(episodes, record) }) : api.deleteDoc('watched', id)),
      "Couldn't undo."
    );
    const details = await tmdbService.getDetails(item.tmdbId, 'tv');
    const toWatchItem = toWatch.find((t) => sameTitle(t, item));
    if (toWatchItem && isCaughtUp(record, details?.lastEpisodeToAir)) {
      toast({
        message: `S${record.season} E${record.num} logged. You're caught up on ${item.title}!`,
        tone: 'success',
        action: { label: 'Finish', onClick: () => handleMarkWatched(toWatchItem) },
        duration: 9000
      });
    } else {
      toast({ message: `Logged S${record.season} E${record.num} of ${item.title}`, tone: 'success', action: { label: 'Undo', onClick: undo }, duration: 7000 });
    }
  };

  const handleLogNextEpisode = async (item) => {
    const next = await findNextEpisode(item);
    if (!next) {
      toast({ message: `You're caught up on ${item.title}.` });
      return;
    }
    if (next.airDate && next.airDate > localDateString()) {
      toast({ message: `S${next.season} E${next.num} hasn't aired yet (${next.airDate}).` });
      return;
    }
    await handleLogEpisode(item, next);
  };

  // Rating an episode from a To Watch sheet edits the show's Watched entry.
  const handleRateEpisode = (item, episode, value) => {
    const entry = progressEntry(item);
    return entry ? handleSetEpisodeRating(entry, episode, value) : undefined;
  };

  // Tonight's pick: keep the current pick while it's still a candidate, else the best one.
  const { pool: tonightPool, shared: tonightShared } = useMemo(() => pickPool(toWatch), [toWatch]);
  const tonight = tonightPool.find((i) => i.id === tonightId) || tonightPool[0] || null;

  const isListed = useCallback((t) => toWatch.some((x) => sameTitle(x, t)) || watched.some((x) => sameTitle(x, t)), [toWatch, watched]);
  const openPreview = useCallback((title, because) => setPreview({ title, because }), []);
  const handleAddFromPreview = async (title, service) => {
    await handleAddItem(title, service);
    setPreview(null);
  };

  const watchedFor = useCallback((item) => watched.find((w) => sameTitle(w, item))?.episodes, [watched]);

  if (showUserSelect || !currentUser) return <UserSelectModal settings={appSettings} onSelectUser={handleUserSelect} />;

  const isList = activeTab === 'toWatch' || activeTab === 'watched';
  const isToWatch = activeTab === 'toWatch';
  const list = isToWatch ? toWatch : watched;
  const listStatus = isToWatch ? toWatchStatus : watchedStatus;
  const tabFilters = isList ? filters[activeTab] : NO_FILTERS;
  const tabSort = isList ? sorts[activeTab] : null;
  const visible = isList ? sortItems(filterItems(list, tabFilters, appSettings.services || []), tabSort) : [];
  const filtering = hasActiveFilters(tabFilters);
  const groups = !isToWatch && tabSort === 'recent' ? groupByMonth(visible) : [{ key: 'all', label: null, items: visible }];
  const sheetItem = sheet && (sheet.mode === 'toWatch' ? toWatch : watched).find((i) => i.id === sheet.id);
  const iconButton = 'min-w-11 min-h-11 flex items-center justify-center rounded-lg text-white hover:bg-white/10';

  const renderRow = (item) => (
    <li key={item.id}>
      <SwipeRow
        onSwipeLeft={() => handleDelete(activeTab, item)}
        onSwipeRight={isToWatch ? () => (isMovie(item) ? handleMarkWatched(item) : handleLogNextEpisode(item)) : undefined}
        rightLabel={isToWatch && !isMovie(item) ? 'Next episode' : 'Watched'}
      >
        <TitleRow
          item={item}
          mode={activeTab}
          currentUser={currentUser}
          settings={appSettings}
          watchedEpisodes={isToWatch ? watchedFor(item) : undefined}
          onOpen={(i) => setSheet({ id: i.id, mode: activeTab })}
        />
      </SwipeRow>
    </li>
  );

  return (
    <div className="bg-gray-900 min-h-[100dvh]">
      <header className="sticky top-0 z-30 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-safe pt-[env(safe-area-inset-top)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 min-h-14">
          <h1 className="text-lg font-bold text-white">
            {{ toWatch: 'To Watch', watched: 'Watched', match: 'Match', stats: 'Stats' }[activeTab]}
            {isList && <span className="ml-2 text-sm font-normal text-gray-300">{list.length}</span>}
          </h1>
          <div className="flex items-center gap-1">
            {isToWatch && (
              <button
                type="button"
                onClick={handleCheckForUpdates}
                disabled={isCheckingUpdates}
                aria-label="Check watched shows for new episodes"
                title="Check for new episodes"
                className={`${iconButton} disabled:opacity-50`}
              >
                <RefreshCw size={20} aria-hidden="true" className={isCheckingUpdates ? 'animate-spin' : ''} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowUserSelect(true)}
              aria-label={`Signed in as ${userName(appSettings, currentUser)}. Switch profile`}
              className="min-h-11 px-3 rounded-full bg-gray-800 border border-gray-700 text-sm text-white flex items-center gap-2"
            >
              <span aria-hidden="true" className="w-6 h-6 -ml-1 rounded-full bg-blue-600 text-xs font-bold flex items-center justify-center">
                {userName(appSettings, currentUser).slice(0, 1).toUpperCase()}
              </span>
              {userName(appSettings, currentUser)}
            </button>
            <button type="button" onClick={() => setModal('settings')} aria-label="Settings" className={iconButton}>
              <Settings size={22} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main className={`px-safe pt-3 max-w-5xl mx-auto ${isToWatch ? 'pb-44' : 'pb-24'}`}>
        {activeTab === 'stats' ? (
          <StatsView watched={watched} toWatchCount={toWatch.length} settings={appSettings} />
        ) : activeTab === 'match' ? (
          <MatchView
            currentUser={currentUser}
            settings={appSettings}
            votes={votes}
            toWatch={toWatch}
            watched={watched}
            onVote={handleVote}
            onUndo={handleUndoVote}
            onTrailer={handlePlayTrailer}
            onPreview={openPreview}
          />
        ) : (
          <>
            {isToWatch && !filtering && listStatus === 'ready' && (
              <TonightsPick
                pick={tonight}
                shared={tonightShared}
                poolSize={tonightPool.length}
                onAnother={() => setTonightId(nextPick(tonightPool, tonight?.id)?.id ?? null)}
                onWatched={handleMarkWatched}
                onOpen={(i) => setSheet({ id: i.id, mode: 'toWatch' })}
              />
            )}

            {list.length > 0 && (
              <FilterBar
                filters={tabFilters}
                onChange={(f) => setFilters((prev) => ({ ...prev, [activeTab]: f }))}
                services={servicesOf(list)}
                sort={tabSort}
                sortOptions={SORT_OPTIONS[activeTab]}
                onSortChange={(v) => setSorts((prev) => ({ ...prev, [activeTab]: v }))}
                listLabel={isToWatch ? 'To Watch' : 'Watched'}
                showOurs={isToWatch && (appSettings.services || []).length > 0}
              />
            )}

            {listStatus === 'loading' ? (
              <ul role="status" aria-label="Loading" className="grid gap-2 md:grid-cols-2">
                {[0, 1, 2, 3, 4].map((i) => <li key={i} className="h-[88px] bg-gray-800 rounded-xl animate-pulse" />)}
              </ul>
            ) : listStatus === 'error' ? (
              <p className="text-center text-red-200 py-8">Couldn't load your list. Try signing out and back in from Settings.</p>
            ) : list.length === 0 ? (
              <p className="text-center text-gray-200 py-10">
                {isToWatch ? 'Nothing to watch yet. Tap Add to find something.' : 'Nothing watched yet.'}
              </p>
            ) : visible.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-200 mb-3">No titles match these filters.</p>
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, [activeTab]: NO_FILTERS }))}
                  className="min-h-11 px-4 rounded-lg bg-gray-700 text-white font-semibold"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                {filtering && <p className="text-xs text-gray-200 mb-2" role="status">{visible.length} of {list.length} titles</p>}
                {groups.map((g) => (
                  <section key={g.key} aria-label={g.label || undefined} className="mb-4">
                    {g.label && <h2 className="text-xs font-bold uppercase tracking-wider text-gray-200 mb-2 mt-1">{g.label}</h2>}
                    <ul className="grid gap-2 md:grid-cols-2">{g.items.map(renderRow)}</ul>
                  </section>
                ))}
                <p className="text-center text-xs text-gray-300 mt-2">
                  Tip: swipe a row left to delete{isToWatch ? ', right to mark watched' : ''}.
                </p>
              </>
            )}
          </>
        )}
      </main>

      {isToWatch && (
        <button
          type="button"
          onClick={() => setModal('add')}
          aria-label="Add a title"
          title="Add a title"
          className="fixed right-[max(1rem,env(safe-area-inset-right))] z-40 bottom-[calc(5rem+env(safe-area-inset-bottom))] bg-blue-600 text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center hover:bg-blue-700"
        >
          <Plus size={26} aria-hidden="true" />
        </button>
      )}

      <TabBar
        active={activeTab}
        counts={{ toWatch: toWatch.length, watched: watched.length }}
        onChange={(tab) => { setActiveTab(tab); window.scrollTo({ top: 0 }); }}
      />

      {sheetItem && (
        <TitleSheet
          item={sheetItem}
          mode={sheet.mode}
          currentUser={currentUser}
          settings={appSettings}
          watchedEpisodes={sheet.mode === 'toWatch' ? watchedFor(sheetItem) : undefined}
          onClose={() => setSheet(null)}
          onSetPriority={handleSetPriority}
          onMarkWatched={handleMarkWatched}
          onSetRating={handleSetRating}
          onSetEpisodeRating={sheet.mode === 'toWatch' ? handleRateEpisode : handleSetEpisodeRating}
          onLogEpisode={handleLogEpisode}
          onLogNextEpisode={handleLogNextEpisode}
          onDelete={(i) => handleDelete(sheet.mode, i)}
          onPlayTrailer={handlePlayTrailer}
          isListed={isListed}
          onPreview={(t) => openPreview(t)}
          onUpdateService={(i, service) => attempt(() => api.setDoc('toWatch', i.id, { service }), "Couldn't update the service.")}
        />
      )}
      {preview && (
        <TitlePreview
          title={preview.title}
          because={preview.because}
          listed={isListed(preview.title)}
          ourServices={appSettings.services || []}
          onClose={() => setPreview(null)}
          onAdd={handleAddFromPreview}
          onTrailer={handlePlayTrailer}
        />
      )}
      {modal === 'add' && <AddModal onClose={closeModal} onAdd={handleAddItem} />}
      {modal === 'rate' && itemToRate && (
        <RatingModal
          item={itemToRate}
          currentUser={currentUser}
          settings={appSettings}
          watchedHistory={watched}
          onClose={closeModal}
          onSubmit={handleSubmitRating}
        />
      )}
      {modal === 'trailer' && trailer && <TrailerModal videoKey={trailer.key} title={trailer.title} onClose={closeModal} />}
      {modal === 'settings' && (
        <SettingsModal
          currentSettings={appSettings}
          onClose={closeModal}
          onSave={handleSaveSettings}
          onExport={handleExport}
          onSignOut={handleSignOut}
        />
      )}
    </div>
  );
};

export default WatchTogether;
