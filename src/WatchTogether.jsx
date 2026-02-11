// src/WatchTogether.jsx
import React, { useState, useEffect } from 'react';
import { Plus, User, ArrowUpDown, RefreshCw, Dice5, BarChart2, Settings } from 'lucide-react'; // Added Settings Icon
import { db } from './services/firebase'; 
import tmdbService from './services/tmdbService'; 
import { 
  collection, doc, setDoc, getDoc, onSnapshot, serverTimestamp, deleteDoc 
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { auth } from './services/firebase';

// Component Imports
import ToWatchCard from './components/cards/ToWatchCard';
import WatchedCard from './components/cards/WatchedCard';
import AddModal from './components/modals/AddModal';
import RatingModal from './components/modals/RatingModal';
import UserSelectModal from './components/modals/UserSelectModal';
import TrailerModal from './components/modals/TrailerModal';
import StatsModal from './components/modals/StatsModal';
import SettingsModal from './components/modals/SettingsModal'; // NEW IMPORT

const COUPLE_ID = 'pamrod';

const WatchTogether = () => {
  // --- Settings State (New Feature) ---
  const [appSettings, setAppSettings] = useState(() => {
    const saved = localStorage.getItem('watchTogetherSettings');
    return saved ? JSON.parse(saved) : {
      user1Name: 'Anthony',
      user1Color: '#2563EB', // Default Blue
      user2Name: 'Pam',
      user2Color: '#DB2777'  // Default Pink
    };
  });

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
    const savedUser = localStorage.getItem('watchTogetherUser');
    if (savedUser) setCurrentUser(savedUser);
    else setShowUserSelect(true);
    signInAnonymously(auth).catch(err => console.error('Auth error:', err));
  }, []);

  // Save settings whenever they change
  useEffect(() => {
    localStorage.setItem('watchTogetherSettings', JSON.stringify(appSettings));
  }, [appSettings]);

  useEffect(() => {
    if (!currentUser) return;
    const unsubToWatch = onSnapshot(collection(db, 'couples', COUPLE_ID, 'toWatch'), (snap) => 
      setToWatch(snap.docs.map(doc => ({ ...doc.data(), id: doc.id }))));
    const unsubWatched = onSnapshot(collection(db, 'couples', COUPLE_ID, 'watched'), (snap) => 
      setWatched(snap.docs.map(doc => ({ ...doc.data(), id: doc.id }))));
    return () => { unsubToWatch(); unsubWatched(); };
  }, [currentUser]);

  const handleSaveSettings = (newSettings) => {
    setAppSettings(newSettings);
    setShowSettingsModal(false);
    
    // If current user name changed, update current session
    if (currentUser === appSettings.user1Name && newSettings.user1Name !== appSettings.user1Name) {
      setCurrentUser(newSettings.user1Name);
      localStorage.setItem('watchTogetherUser', newSettings.user1Name);
    }
    if (currentUser === appSettings.user2Name && newSettings.user2Name !== appSettings.user2Name) {
      setCurrentUser(newSettings.user2Name);
      localStorage.setItem('watchTogetherUser', newSettings.user2Name);
    }
  };

  const handleUserSelect = (user) => {
    setCurrentUser(user);
    localStorage.setItem('watchTogetherUser', user);
    setShowUserSelect(false);
  };

  const handleSwitchUser = () => {
    setShowUserSelect(true);
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
      createdAt: serverTimestamp()
    };
    await setDoc(doc(collection(db, 'couples', COUPLE_ID, 'toWatch')), item);
    setShowAddModal(false);
  };

  const handleMarkWatched = (item) => {
    setItemToRate(item);
    setShowRatingModal(true);
  };

  const handleSubmitRating = async (anthonyRating, pamRating, episodes = [], isDNF = false) => {
    const { id, ...itemData } = itemToRate;
    const newSelectedEpisodes = episodes.filter(ep => ep.isSelected);
    const cleanNewEpisodes = newSelectedEpisodes.map(({ isSelected, ...ep }) => ep);

    const existingShow = watched.find(w => w.tmdbId === itemToRate.tmdbId && w.mediaType === itemToRate.mediaType);
    let finalEpisodes = cleanNewEpisodes;
    let targetDocRef;

    if (existingShow) {
      targetDocRef = doc(db, 'couples', COUPLE_ID, 'watched', existingShow.id);
      const existingEps = existingShow.episodes || [];
      const episodeMap = new Map();
      existingEps.forEach(ep => episodeMap.set(`${ep.season}-${ep.num}`, ep));
      cleanNewEpisodes.forEach(ep => episodeMap.set(`${ep.season}-${ep.num}`, ep));
      finalEpisodes = Array.from(episodeMap.values());
    } else {
      targetDocRef = doc(collection(db, 'couples', COUPLE_ID, 'watched'));
    }

    let finalAnthony = anthonyRating, finalPam = pamRating;
    if (finalEpisodes.length > 0 && !isDNF) {
      const antEps = finalEpisodes.filter(e => (e.anthonyRating || 0) > 0);
      if (antEps.length) finalAnthony = Math.round(antEps.reduce((acc, e) => acc + e.anthonyRating, 0) / antEps.length);
      const pamEps = finalEpisodes.filter(e => (e.pamRating || 0) > 0);
      if (pamEps.length) finalPam = Math.round(pamEps.reduce((acc, e) => acc + e.pamRating, 0) / pamEps.length);
    }

    await setDoc(targetDocRef, {
      ...itemData,
      anthonyRating: finalAnthony,
      pamRating: finalPam,
      watchedDate: new Date().toISOString().split('T')[0],
      episodes: finalEpisodes.length > 0 ? finalEpisodes : null,
      ratedBy: currentUser,
      status: isDNF ? 'DNF' : 'Completed',
      updatedAt: serverTimestamp()
    }, { merge: true });

    const isMovie = itemToRate.type === 'Movie' || itemToRate.mediaType === 'movie';
    const allFinished = episodes.length === 0 || episodes.every(ep => ep.isSelected);
    if (isMovie || allFinished || isDNF) {
      await deleteDoc(doc(db, 'couples', COUPLE_ID, 'toWatch', itemToRate.id));
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
          await setDoc(doc(collection(db, 'couples', COUPLE_ID, 'toWatch')), {
            title: show.title,
            type: 'TV Show',
            service: show.service || 'Unknown',
            anthonyPriority: 3, pamPriority: 3,
            tmdbId: show.tmdbId, mediaType: 'tv',
            posterPath: show.posterPath, overview: show.overview,
            rating: show.rating, year: show.year,
            addedDate: new Date().toISOString().split('T')[0],
            addedBy: 'System', createdAt: serverTimestamp(),
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

  const handleDeleteItem = (id) => deleteDoc(doc(db, 'couples', COUPLE_ID, 'toWatch', id));
  const handleDeleteWatched = (id) => deleteDoc(doc(db, 'couples', COUPLE_ID, 'watched', id));
  const handleSaveToWatch = async (id, data) => {
    await setDoc(doc(db, 'couples', COUPLE_ID, 'toWatch', id), data, { merge: true });
    setEditingToWatchId(null);
  };
  const handleSaveWatched = async (id, data) => {
    await setDoc(doc(db, 'couples', COUPLE_ID, 'watched', id), data, { merge: true });
    setEditingWatchedId(null);
  };

  const handleUpdateEpisodeRating = async (showId, episodeNum, user, newRating) => {
    const showRef = doc(db, 'couples', COUPLE_ID, 'watched', showId);
    const showDoc = await getDoc(showRef);
    if (showDoc.exists()) {
      const data = showDoc.data();
      const updatedEpisodes = data.episodes.map(ep => {
        const isMatch = (ep.season === episodeNum.season && ep.num === episodeNum.num) || (!ep.season && ep.num === episodeNum.num);
        return isMatch ? { ...ep, [user === 'Anthony' ? 'anthonyRating' : 'pamRating']: newRating } : ep;
      });
      const userField = user === 'Anthony' ? 'anthonyRating' : 'pamRating';
      const ratedEps = updatedEpisodes.filter(ep => (ep[userField] || 0) > 0);
      const newAvg = ratedEps.length > 0 ? Math.round(ratedEps.reduce((acc, e) => acc + (e[userField] || 0), 0) / ratedEps.length) : data[userField];
      await setDoc(showRef, { episodes: updatedEpisodes, [userField]: newAvg }, { merge: true });
    }
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
      const calcRating = (i) => {
        const ant = i.anthonyRating || 0, pam = i.pamRating || 0;
        return pam > 0 ? (ant + pam) / 2 : ant;
      };
      
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
          <div><h1 className="text-2xl font-bold">Watch Together</h1><p className="text-sm opacity-80">Current: {currentUser}</p></div>
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
                  settings={appSettings} // PASS SETTINGS HERE
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
                settings={appSettings} // PASS SETTINGS HERE
                isEditing={editingWatchedId === item.id}
                onToggleEdit={() => setEditingWatchedId(editingWatchedId === item.id ? null : item.id)}
                onDelete={handleDeleteWatched}
                expandedShow={expandedShow}
                setExpandedShow={setExpandedShow}
                onSave={handleSaveWatched}
                onUpdateEpisodeRating={handleUpdateEpisodeRating}
              />
            ))
          )
        )}
      </div>

      {showAddModal && <AddModal onClose={() => setShowAddModal(false)} onAdd={handleAddItem} />}
      
      {showRatingModal && <RatingModal 
        item={itemToRate} 
        currentUser={currentUser} 
        settings={appSettings} // PASS SETTINGS HERE
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