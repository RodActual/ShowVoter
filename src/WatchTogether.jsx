// src/WatchTogether.jsx
import React, { useState, useEffect } from 'react';
import { Plus, User, ArrowUpDown, RefreshCw, Dice5, BarChart2, Settings } from 'lucide-react'; // Added Settings Icon
import api from './services/api';
import tmdbService from './services/tmdbService';

// Component Imports
import ToWatchCard from './components/cards/ToWatchCard';
import WatchedCard from './components/cards/WatchedCard';
import AddModal from './components/modals/AddModal';
import RatingModal from './components/modals/RatingModal';
import UserSelectModal from './components/modals/UserSelectModal';
import TrailerModal from './components/modals/TrailerModal';
import StatsModal from './components/modals/StatsModal';
import SettingsModal from './components/modals/SettingsModal';
import { DEFAULT_SETTINGS, USER_KEYS, averageRating, ratingField, resolveUserKey, userName } from './users';

const SETTINGS_CACHE_KEY = 'watchTogetherSettings';
const CURRENT_USER_KEY = 'watchTogetherUser';

function readCachedSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_CACHE_KEY));
    return saved && typeof saved === 'object' ? { ...DEFAULT_SETTINGS, ...saved } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const WatchTogether = () => {
  // Settings are shared through the server ('settings/app'); localStorage is only a cache for first paint.
  const [appSettings, setAppSettings] = useState(readCachedSettings);

  // currentUser is a stable key: 'user1' | 'user2'
  const [currentUser, setCurrentUser] = useState(null);
  const [showUserSelect, setShowUserSelect] = useState(false);
  const [activeTab, setActiveTab] = useState('toWatch');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false); // NEW
  const [sortMethod, setSortMethod] = useState('priority');
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  
  // Card States
  const [expandedShow, setExpandedShow] = useState(null);
  const [editingWatchedId, setEditingWatchedId] = useState(null);
  const [editingToWatchId, setEditingToWatchId] = useState(null);
  const [itemToRate, setItemToRate] = useState(null);
  const [currentTrailer, setCurrentTrailer] = useState(null);

  // Data States
  const [toWatch, setToWatch] = useState([]);
  const [watched, setWatched] = useState([]);

  useEffect(() => {
    // Older versions saved the display name here; migrate it to a key.
    const savedUser = resolveUserKey(localStorage.getItem(CURRENT_USER_KEY), readCachedSettings());
    if (savedUser) {
      setCurrentUser(savedUser);
      localStorage.setItem(CURRENT_USER_KEY, savedUser);
    } else {
      setShowUserSelect(true);
    }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(appSettings)); } catch { /* storage full or blocked */ }
  }, [appSettings]);

  useEffect(() => {
    const applySettings = (doc) => {
      if (!doc) return;
      const { id, ...rest } = doc;
      setAppSettings({ ...DEFAULT_SETTINGS, ...rest });
    };
    api.getDoc('settings', 'app').then(applySettings).catch(() => { /* not saved yet: keep cache/defaults */ });
    return api.subscribe('settings', { onPut: applySettings, onDelete: () => setAppSettings(DEFAULT_SETTINGS) });
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    let active = true;
    const applyPut = (setter) => (item) => setter(prev => {
      const idx = prev.findIndex(i => i.id === item.id);
      if (idx === -1) return [...prev, item];
      const next = [...prev];
      next[idx] = item;
      return next;
    });
    const applyDelete = (setter) => (id) => setter(prev => prev.filter(i => i.id !== id));

    api.getCollection('toWatch').then(items => { if (active) setToWatch(items); });
    api.getCollection('watched').then(items => { if (active) setWatched(items); });

    const unsubToWatch = api.subscribe('toWatch', {
      onPut: applyPut(setToWatch),
      onDelete: applyDelete(setToWatch)
    });
    const unsubWatched = api.subscribe('watched', {
      onPut: applyPut(setWatched),
      onDelete: applyDelete(setWatched)
    });

    return () => { active = false; unsubToWatch(); unsubWatched(); };
  }, [currentUser]);

  const handleSaveSettings = async (newSettings) => {
    setAppSettings(newSettings);
    setShowSettingsModal(false);
    await api.setDoc('settings', 'app', newSettings);
  };

  const handleUserSelect = (userKey) => {
    if (!USER_KEYS.includes(userKey)) return;
    setCurrentUser(userKey);
    localStorage.setItem(CURRENT_USER_KEY, userKey);
    setShowUserSelect(false);
  };

  const handleAddItem = async (selectedShow, selectedService) => {
    if (!selectedShow) return;
    const item = {
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
      addedDate: new Date().toISOString().split('T')[0],
      addedBy: currentUser,
      createdAt: new Date().toISOString()
    };
    await api.setDoc('toWatch', api.newId(), item);
    setShowAddModal(false);
  };

  const handleMarkWatched = (item) => {
    setItemToRate(item);
    setShowRatingModal(true);
  };

  const handleSubmitRating = async (anthonyRating, pamRating, episodes = [], isDNF = false) => {
    const { id, ...itemData } = itemToRate;
    const myField = ratingField(currentUser);
    const otherField = ratingField(currentUser === 'user1' ? 'user2' : 'user1');
    const myOverall = (currentUser === 'user1' ? anthonyRating : pamRating) || 0;

    const cleanNewEpisodes = episodes.filter(ep => ep.isSelected).map(({ isSelected, ...ep }) => ep);
    const existingShow = watched.find(w => w.tmdbId === itemToRate.tmdbId && w.mediaType === itemToRate.mediaType);

    let finalEpisodes = cleanNewEpisodes;
    if (existingShow) {
      const episodeMap = new Map();
      (existingShow.episodes || []).forEach(ep => episodeMap.set(`${ep.season}-${ep.num}`, ep));
      cleanNewEpisodes.forEach(ep => episodeMap.set(`${ep.season}-${ep.num}`, ep));
      finalEpisodes = Array.from(episodeMap.values());
    }

    // My overall rating: what I picked, else my episode average, else what was already saved.
    let myRating = myOverall;
    if (!myRating && !isDNF) myRating = Math.round(averageRating(...finalEpisodes.map(e => e[myField])));
    if (!myRating && existingShow) myRating = existingShow[myField] || 0;

    const doc = {
      ...itemData,
      [myField]: myRating,
      watchedDate: new Date().toISOString().split('T')[0],
      episodes: finalEpisodes.length > 0 ? finalEpisodes : null,
      ratedBy: currentUser,
      status: isDNF ? 'DNF' : 'Completed',
      updatedAt: new Date().toISOString()
    };
    // Never overwrite the partner's saved rating; start it unrated on a new entry.
    if (!existingShow) doc[otherField] = 0;

    await api.setDoc('watched', existingShow ? existingShow.id : api.newId(), doc);

    const isMovie = itemToRate.type === 'Movie' || itemToRate.mediaType === 'movie';
    const allFinished = episodes.length === 0 || episodes.every(ep => ep.isSelected);
    if (isMovie || allFinished || isDNF) {
      await api.deleteDoc('toWatch', itemToRate.id);
    }

    setShowRatingModal(false);
    setItemToRate(null);
  };

  const handleRandomPick = () => {
    const highPriorityItems = toWatch.filter(
      item => (item.anthonyPriority || 0) > 1 && (item.pamPriority || 0) > 1
    );
    const pool = highPriorityItems.length > 1 ? highPriorityItems : toWatch;
    
    if (pool.length === 0) {
      alert("Add some shows first!");
      return;
    }
    const randomItem = pool[Math.floor(Math.random() * pool.length)];
    const sourceText = pool === highPriorityItems ? "your High Priority favorites" : "the full list";
    alert(`🎲 Fate chose: ${randomItem.title}!\n(Picked from ${sourceText})`);
  };

  const handlePlayTrailer = async (item) => {
    const videoKey = await tmdbService.getVideos(item.tmdbId, item.mediaType || (item.type === 'Movie' ? 'movie' : 'tv'));
    if (videoKey) {
      setCurrentTrailer(videoKey);
    } else {
      alert("No trailer found for this title.");
    }
  };

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdates(true);
    let updatesCount = 0;
    try {
      const tvShows = watched.filter(item => (item.type === 'TV Show' || item.mediaType === 'tv') && item.status !== 'DNF');
      for (const show of tvShows) {
        if (!show.tmdbId) continue;
        if (toWatch.some(t => t.tmdbId === show.tmdbId)) continue;

        const details = await tmdbService.getDetails(show.tmdbId, 'tv');
        if (details && details.numberOfEpisodes > (show.episodes ? show.episodes.length : 0)) {
          await api.setDoc('toWatch', api.newId(), {
            title: show.title,
            type: 'TV Show',
            service: show.service || 'Unknown',
            anthonyPriority: 3, pamPriority: 3,
            tmdbId: show.tmdbId, mediaType: 'tv',
            posterPath: show.posterPath, overview: show.overview,
            rating: show.rating, year: show.year,
            addedDate: new Date().toISOString().split('T')[0],
            addedBy: 'System', createdAt: new Date().toISOString(),
            isNewEpisodes: true
          });
          updatesCount++;
        }
      }
      alert(updatesCount > 0 ? `Found ${updatesCount} shows with new episodes!` : "You are up to date!");
      if (updatesCount > 0) setActiveTab('toWatch');
    } catch (err) { console.error(err); alert("Update check failed."); }
    setIsCheckingUpdates(false);
  };

  const handleDeleteItem = (id) => api.deleteDoc('toWatch', id);
  const handleDeleteWatched = (id) => api.deleteDoc('watched', id);
  const handleSaveToWatch = async (id, data) => {
    await api.setDoc('toWatch', id, data);
    setEditingToWatchId(null);
  };
  const handleSaveWatched = async (id, data) => {
    await api.setDoc('watched', id, data);
    setEditingWatchedId(null);
  };

  const getSortedItems = (items, type) => {
    return [...items].sort((a, b) => {
      if (sortMethod === 'status') {
        const aDNF = a.status === 'DNF' ? 1 : 0;
        const bDNF = b.status === 'DNF' ? 1 : 0;
        if (aDNF !== bDNF) return bDNF - aDNF;
        return a.title.localeCompare(b.title);
      }
      if (sortMethod === 'title') return a.title.localeCompare(b.title);
      if (sortMethod === 'service') return (a.service || '').localeCompare(b.service || '');
      
      const calcPrio = (i) => (i.anthonyPriority || 0) + (i.pamPriority || 0);
      const calcRating = (i) => averageRating(i.anthonyRating, i.pamRating);
      
      return type === 'toWatch' ? calcPrio(b) - calcPrio(a) : calcRating(b) - calcRating(a);
    });
  };

  if (showUserSelect) return <UserSelectModal settings={appSettings} onSelectUser={handleUserSelect} />;
  if (!currentUser) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;

  const sortedItems = getSortedItems(activeTab === 'toWatch' ? toWatch : watched, activeTab);

  // Dynamic Header Style
  const headerStyle = {
    background: `linear-gradient(to right, ${appSettings.user1Color}, ${appSettings.user2Color})`
  };

  return (
    <div className="max-w-2xl mx-auto bg-gray-900 min-h-screen pb-20">
      {/* Dynamic Header */}
      <div style={headerStyle} className="text-white p-6 shadow-lg">
        <div className="flex justify-between items-center mb-2">
          <div><h1 className="text-2xl font-bold">Watch Together</h1><p className="text-sm opacity-80">Current: {userName(appSettings, currentUser)}</p></div>
          <div className="flex gap-2">
            <button onClick={() => setShowSettingsModal(true)} className="text-white hover:text-gray-200 p-2"><Settings size={20} /></button>
            <button onClick={() => setShowUserSelect(true)} className="text-white hover:text-gray-200 p-2"><User size={20} /></button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 bg-gray-800">
        <button onClick={() => setActiveTab('toWatch')} className={`flex-1 py-3 font-medium ${activeTab === 'toWatch' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400'}`}>To Watch ({toWatch.length})</button>
        <button onClick={() => setActiveTab('watched')} className={`flex-1 py-3 font-medium ${activeTab === 'watched' ? 'border-b-2 border-green-500 text-green-400' : 'text-gray-400'}`}>Watched ({watched.length})</button>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <ArrowUpDown size={16} className="text-gray-400" />
            <select value={sortMethod} onChange={(e) => setSortMethod(e.target.value)} className="bg-gray-800 text-white text-sm border border-gray-600 rounded px-2 py-1">
              <option value="priority">{activeTab === 'toWatch' ? 'Priority' : 'Rating'}</option>
              {activeTab === 'watched' && <option value="status">Status (DNF)</option>}
              <option value="title">Title</option>
              <option value="service">Service</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'toWatch' && (
              <button onClick={handleRandomPick} className="bg-purple-700 text-white p-2 rounded-lg hover:bg-purple-600" title="Pick for me">
                <Dice5 size={20} />
              </button>
            )}
            
            <button onClick={() => setShowStatsModal(true)} className="bg-gray-700 text-white p-2 rounded-lg hover:bg-gray-600" title="Stats">
              <BarChart2 size={20} />
            </button>

            {activeTab === 'toWatch' && (
              <button onClick={handleCheckForUpdates} disabled={isCheckingUpdates} className="bg-gray-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-600 disabled:opacity-50 text-sm">
                <RefreshCw size={14} className={isCheckingUpdates ? 'animate-spin' : ''} />
              </button>
            )}
            {activeTab === 'toWatch' && (
              <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"><Plus size={16} /> Add</button>
            )}
          </div>
        </div>

        {sortedItems.length === 0 ? (
          <p className="text-center text-gray-500 py-8">List is empty.</p>
        ) : (
          activeTab === 'toWatch' ? (
            sortedItems.map(item => {
              const watchedEntry = watched.find(w => w.tmdbId === item.tmdbId);
              return (
                <ToWatchCard 
                  key={item.id} 
                  item={item} 
                  currentUser={currentUser}
                  settings={appSettings}
                  isEditing={editingToWatchId === item.id}
                  onToggleEdit={() => setEditingToWatchId(editingToWatchId === item.id ? null : item.id)}
                  onDelete={handleDeleteItem}
                  onMarkWatched={handleMarkWatched}
                  onSave={handleSaveToWatch}
                  watchedEpisodes={watchedEntry?.episodes}
                  onPlayTrailer={handlePlayTrailer}
                />
              );
            })
          ) : (
            sortedItems.map(item => (
              <WatchedCard 
                key={item.id} 
                item={item} 
                currentUser={currentUser}
                settings={appSettings}
                isEditing={editingWatchedId === item.id}
                onToggleEdit={() => setEditingWatchedId(editingWatchedId === item.id ? null : item.id)}
                onDelete={handleDeleteWatched}
                expandedShow={expandedShow}
                setExpandedShow={setExpandedShow}
                onSave={handleSaveWatched}
              />
            ))
          )
        )}
      </div>

      {showAddModal && <AddModal onClose={() => setShowAddModal(false)} onAdd={handleAddItem} />}
      
      {showRatingModal && <RatingModal 
        item={itemToRate} 
        currentUser={currentUser} 
        settings={appSettings}
        watchedHistory={watched}
        onClose={() => setShowRatingModal(false)} 
        onSubmit={handleSubmitRating} 
      />}

      {currentTrailer && <TrailerModal videoKey={currentTrailer} onClose={() => setCurrentTrailer(null)} />}
      
      {showStatsModal && <StatsModal watched={watched} settings={appSettings} onClose={() => setShowStatsModal(false)} />}

      {showSettingsModal && <SettingsModal currentSettings={appSettings} onClose={() => setShowSettingsModal(false)} onSave={handleSaveSettings} />}
    </div>
  );
};

export default WatchTogether;