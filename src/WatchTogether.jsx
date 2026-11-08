// src/WatchTogether.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, User, RefreshCw, Dice5, BarChart2, Settings } from 'lucide-react';
import api from './services/api';
import tmdbService from './services/tmdbService';

import ToWatchCard from './components/cards/ToWatchCard';
import WatchedCard from './components/cards/WatchedCard';
import AddModal from './components/modals/AddModal';
import RatingModal from './components/modals/RatingModal';
import UserSelectModal from './components/modals/UserSelectModal';
import TrailerModal from './components/modals/TrailerModal';
import StatsModal from './components/modals/StatsModal';
import SettingsModal from './components/modals/SettingsModal';
import { useToast } from './components/common/Toast';
import { DEFAULT_SETTINGS, USER_KEYS, averageRating, priorityField, ratingField, resolveUserKey, userName } from './users';
import { isMovie, lastWatchedEpisode, mediaTypeOf, sameTitle } from './titles';

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
  const [modal, setModal] = useState(null); // 'add' | 'rate' | 'stats' | 'settings' | 'trailer'
  const [sortMethod, setSortMethod] = useState('priority');
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [expandedShow, setExpandedShow] = useState(null);
  const [itemToRate, setItemToRate] = useState(null);
  const [trailer, setTrailer] = useState(null);
  const [highlightId, setHighlightId] = useState(null);

  const { items: toWatch, status: toWatchStatus } = useLiveCollection('toWatch', Boolean(currentUser));
  const { items: watched, status: watchedStatus } = useLiveCollection('watched', Boolean(currentUser));

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

  useEffect(() => {
    if (!highlightId) return undefined;
    const t = setTimeout(() => setHighlightId(null), 4000);
    return () => clearTimeout(t);
  }, [highlightId]);

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

  const handleRandomPick = () => {
    const highPriority = toWatch.filter((item) => (item.anthonyPriority || 0) > 1 && (item.pamPriority || 0) > 1);
    const pool = highPriority.length > 1 ? highPriority : toWatch;
    if (pool.length === 0) {
      toast({ message: 'Add some shows first.' });
      return;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const show = () => {
      setHighlightId(pick.id);
      document.getElementById(`card-${pick.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    show();
    toast({
      message: `🎲 ${pick.title} (from ${pool === highPriority ? 'your shared Med/High picks' : 'the full list'})`,
      action: { label: 'Watched', onClick: () => handleMarkWatched(pick) },
      duration: 7000
    });
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
    if (!(await attempt(() => api.deleteDoc(collection, id), `Couldn't delete ${item.title}.`))) return;
    toast({
      message: `Deleted ${item.title}`,
      action: { label: 'Undo', onClick: () => attempt(() => api.setDoc(collection, id, data), "Couldn't restore it.") },
      duration: 7000
    });
  };

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

  const getSortedItems = (items, type) => [...items].sort((a, b) => {
    if (sortMethod === 'status') {
      const diff = (b.status === 'DNF') - (a.status === 'DNF');
      return diff || a.title.localeCompare(b.title);
    }
    if (sortMethod === 'title') return a.title.localeCompare(b.title);
    if (sortMethod === 'service') return (a.service || '').localeCompare(b.service || '');
    const prio = (i) => (i.anthonyPriority || 0) + (i.pamPriority || 0);
    const rating = (i) => averageRating(i.anthonyRating, i.pamRating);
    return type === 'toWatch' ? prio(b) - prio(a) : rating(b) - rating(a);
  });

  if (showUserSelect || !currentUser) return <UserSelectModal settings={appSettings} onSelectUser={handleUserSelect} />;

  const isToWatch = activeTab === 'toWatch';
  const list = isToWatch ? toWatch : watched;
  const listStatus = isToWatch ? toWatchStatus : watchedStatus;
  const sortedItems = getSortedItems(list, activeTab);
  const iconButton = 'min-w-11 min-h-11 flex items-center justify-center rounded-lg text-white';
  const headerStyle = { background: `linear-gradient(to right, ${appSettings.user1Color}, ${appSettings.user2Color})` };

  return (
    <div className="max-w-2xl mx-auto bg-gray-900 min-h-screen pb-24">
      <header style={headerStyle} className="text-white px-4 py-3 shadow-lg">
        <div className="flex justify-between items-center gap-2 [text-shadow:0_1px_2px_rgb(0_0_0/50%)]">
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight">Watch Together</h1>
            <p className="text-sm">Signed in as {userName(appSettings, currentUser)}</p>
          </div>
          <div className="flex gap-1 shrink-0">
            <button type="button" onClick={() => setModal('settings')} aria-label="Settings" className={`${iconButton} hover:bg-black/20`}>
              <Settings size={22} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setShowUserSelect(true)} aria-label="Switch profile" className={`${iconButton} hover:bg-black/20`}>
              <User size={22} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <nav aria-label="Lists" className="bg-gray-800 border-b border-gray-700">
        <div role="tablist" className="flex">
        {[['toWatch', 'To Watch', toWatch.length, 'border-blue-400 text-blue-300'], ['watched', 'Watched', watched.length, 'border-green-400 text-green-300']].map(([key, label, count, activeClass]) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`tab-${key}`}
            aria-selected={activeTab === key}
            aria-controls="list-panel"
            onClick={() => setActiveTab(key)}
            className={`flex-1 min-h-12 font-medium border-b-2 ${activeTab === key ? activeClass : 'border-transparent text-gray-300'}`}
          >
            {label} ({count})
          </button>
        ))}
        </div>
      </nav>

      <main className="p-4">
        <div id="list-panel" role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-200">
            Sort
            <select
              value={sortMethod}
              onChange={(e) => setSortMethod(e.target.value)}
              className="bg-gray-800 text-white border border-gray-500 rounded-lg px-2 min-h-11"
            >
              <option value="priority">{isToWatch ? 'Priority' : 'Rating'}</option>
              {!isToWatch && <option value="status">Abandoned first</option>}
              <option value="title">Title</option>
              <option value="service">Service</option>
            </select>
          </label>
          <div className="flex items-center gap-2">
            {isToWatch && (
              <button type="button" onClick={handleRandomPick} aria-label="Pick something for us" title="Pick for us" className={`${iconButton} bg-purple-700 hover:bg-purple-600`}>
                <Dice5 size={20} aria-hidden="true" />
              </button>
            )}
            <button type="button" onClick={() => setModal('stats')} aria-label="Stats" title="Stats" className={`${iconButton} bg-gray-700 hover:bg-gray-600`}>
              <BarChart2 size={20} aria-hidden="true" />
            </button>
            {isToWatch && (
              <button
                type="button"
                onClick={handleCheckForUpdates}
                disabled={isCheckingUpdates}
                aria-label="Check watched shows for new episodes"
                title="Check for new episodes"
                className={`${iconButton} bg-gray-700 hover:bg-gray-600 disabled:opacity-50`}
              >
                <RefreshCw size={20} aria-hidden="true" className={isCheckingUpdates ? 'animate-spin' : ''} />
              </button>
            )}
          </div>
        </div>

        {listStatus === 'loading' ? (
          <div role="status" aria-label="Loading" className="space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-40 bg-gray-800 rounded-lg animate-pulse" />)}
          </div>
        ) : listStatus === 'error' ? (
          <p className="text-center text-red-200 py-8">Couldn't load your list. Try signing out and back in from Settings.</p>
        ) : sortedItems.length === 0 ? (
          <p className="text-center text-gray-300 py-8">
            {isToWatch ? 'Nothing to watch yet. Tap Add to find something.' : 'Nothing watched yet.'}
          </p>
        ) : isToWatch ? (
          sortedItems.map((item) => (
            <ToWatchCard
              key={item.id}
              item={item}
              currentUser={currentUser}
              settings={appSettings}
              highlighted={highlightId === item.id}
              onDelete={(i) => handleDelete('toWatch', i)}
              onMarkWatched={handleMarkWatched}
              onSetPriority={handleSetPriority}
              watchedEpisodes={watched.find((w) => sameTitle(w, item))?.episodes}
              onPlayTrailer={handlePlayTrailer}
            />
          ))
        ) : (
          sortedItems.map((item) => (
            <WatchedCard
              key={item.id}
              item={item}
              currentUser={currentUser}
              settings={appSettings}
              isExpanded={expandedShow === item.id}
              onToggleExpanded={() => setExpandedShow(expandedShow === item.id ? null : item.id)}
              onDelete={(i) => handleDelete('watched', i)}
              onSetRating={handleSetRating}
              onSetEpisodeRating={handleSetEpisodeRating}
            />
          ))
        )}
        </div>
      </main>

      {isToWatch && (
        <button
          type="button"
          onClick={() => setModal('add')}
          className="fixed bottom-5 right-5 z-40 bg-blue-600 text-white pl-4 pr-5 min-h-14 rounded-full shadow-xl flex items-center gap-2 font-semibold hover:bg-blue-700"
        >
          <Plus size={22} aria-hidden="true" /> Add
        </button>
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
      {modal === 'stats' && <StatsModal watched={watched} settings={appSettings} onClose={closeModal} />}
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
