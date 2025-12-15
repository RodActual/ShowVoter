// src/WatchTogether.jsx
import React, { useState, useEffect } from 'react';
<<<<<<< HEAD
import { Plus, User, ArrowUpDown, RefreshCw } from 'lucide-react';
import { db } from './services/firebase';
import tmdbService from './services/tmdbService';
=======
import { Star, Plus, Check, X, ChevronDown, ChevronUp, Trash2, Edit2, Search, User, CheckSquare, Square, ArrowUpDown, RefreshCw } from 'lucide-react';
import { db } from './firebase';
import tmdbService from './tmdbService';
>>>>>>> dbd24868c7538724587d40bd2c17f8347df96689
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

const COUPLE_ID = 'pamrod';

const WatchTogether = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [showUserSelect, setShowUserSelect] = useState(false);
  const [activeTab, setActiveTab] = useState('toWatch');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [sortMethod, setSortMethod] = useState('priority');
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  
<<<<<<< HEAD
  // Card States
  const [expandedShow, setExpandedShow] = useState(null);
  const [editingWatchedId, setEditingWatchedId] = useState(null);
  const [editingToWatchId, setEditingToWatchId] = useState(null);
=======
  // Sorting State
  const [sortMethod, setSortMethod] = useState('priority'); // 'priority', 'title', 'service'

  // Updates State
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);

  // State for expanded accordions
  const [expandedShow, setExpandedShow] = useState(null);
  
  // State for editing episodes
  const [editingWatchedId, setEditingWatchedId] = useState(null);
  const [editingToWatchId, setEditingToWatchId] = useState(null);

>>>>>>> dbd24868c7538724587d40bd2c17f8347df96689
  const [itemToRate, setItemToRate] = useState(null);

  // Data States
  const [toWatch, setToWatch] = useState([]);
  const [watched, setWatched] = useState([]);

  // --- Auth & Data Fetching ---
  useEffect(() => {
    const savedUser = localStorage.getItem('watchTogetherUser');
    if (savedUser) setCurrentUser(savedUser);
    else setShowUserSelect(true);
    signInAnonymously(auth).catch(err => console.error('Auth error:', err));
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const unsubToWatch = onSnapshot(collection(db, 'couples', COUPLE_ID, 'toWatch'), (snap) => 
      setToWatch(snap.docs.map(doc => ({ ...doc.data(), id: doc.id }))));
    const unsubWatched = onSnapshot(collection(db, 'couples', COUPLE_ID, 'watched'), (snap) => 
      setWatched(snap.docs.map(doc => ({ ...doc.data(), id: doc.id }))));
    return () => { unsubToWatch(); unsubWatched(); };
  }, [currentUser]);

  // --- Actions ---
  const handleUserSelect = (user) => {
    setCurrentUser(user);
    localStorage.setItem('watchTogetherUser', user);
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
      addedDate: new Date().toISOString().split('T')[0],
      addedBy: currentUser,
      createdAt: serverTimestamp()
    };
    await setDoc(doc(collection(db, 'couples', COUPLE_ID, 'toWatch')), item);
    setShowAddModal(false);
  };

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdates(true);
    let updatesCount = 0;

    try {
      // Check all watched TV shows to see if new episodes exist
      const tvShows = watched.filter(item => item.type === 'TV Show' || item.mediaType === 'tv');

      for (const show of tvShows) {
        if (!show.tmdbId) continue;

        // Skip if already in To Watch
        const alreadyInToWatch = toWatch.some(t => t.tmdbId === show.tmdbId);
        if (alreadyInToWatch) continue;

        const details = await tmdbService.getDetails(show.tmdbId, 'tv');
        
        if (details) {
          const totalEpisodesRemote = details.numberOfEpisodes || 0;
          const watchedEpisodesLocal = show.episodes ? show.episodes.length : 0;

          if (totalEpisodesRemote > watchedEpisodesLocal) {
            
            const item = {
              title: show.title,
              type: 'TV Show',
              service: show.service || 'Unknown',
              anthonyPriority: 3, // High priority for new episodes
              pamPriority: 3,
              tmdbId: show.tmdbId,
              mediaType: 'tv',
              posterPath: show.posterPath,
              overview: show.overview,
              rating: show.rating,
              year: show.year,
              addedDate: new Date().toISOString().split('T')[0],
              addedBy: 'System', 
              createdAt: serverTimestamp(),
              isNewEpisodes: true // Flag for badge
            };

            const itemRef = doc(collection(db, 'couples', COUPLE_ID, 'toWatch'));
            await setDoc(itemRef, item);
            updatesCount++;
          }
        }
      }
      
      if (updatesCount > 0) {
        alert(`Found ${updatesCount} shows with new episodes!`);
      } else {
        alert("You are up to date! No new episodes found.");
      }

    } catch (error) {
      console.error("Error checking for updates:", error);
      alert("Failed to check for updates. Try again later.");
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const handleMarkWatched = (item) => {
    setItemToRate(item);
    setShowRatingModal(true);
  };

  const handleSubmitRating = async (anthonyRating, pamRating, episodes = []) => {
    const { id, ...itemData } = itemToRate;
    const newSelectedEpisodes = episodes.filter(ep => ep.isSelected);
    const cleanNewEpisodes = newSelectedEpisodes.map(({ isSelected, ...ep }) => ep);

<<<<<<< HEAD
    // Merge Logic
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

    // Average Calc
    let finalAnthony = anthonyRating, finalPam = pamRating;
    if (finalEpisodes.length > 0) {
      const antEps = finalEpisodes.filter(e => (e.anthonyRating || 0) > 0);
      if (antEps.length) finalAnthony = Math.round(antEps.reduce((acc, e) => acc + e.anthonyRating, 0) / antEps.length);
      const pamEps = finalEpisodes.filter(e => (e.pamRating || 0) > 0);
      if (pamEps.length) finalPam = Math.round(pamEps.reduce((acc, e) => acc + e.pamRating, 0) / pamEps.length);
    }

    await setDoc(targetDocRef, {
=======
    const newSelectedEpisodes = episodes.filter(ep => ep.isSelected);
    
    const cleanNewEpisodes = newSelectedEpisodes.map(({ isSelected, ...ep }) => ep);

    const existingShow = watched.find(
      w => w.tmdbId === itemToRate.tmdbId && w.mediaType === itemToRate.mediaType
    );

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

    let finalAnthony = anthonyRating;
    let finalPam = pamRating;

    if (finalEpisodes.length > 0) {
      const anthonyEps = finalEpisodes.filter(e => (e.anthonyRating || 0) > 0);
      if (anthonyEps.length > 0) {
        finalAnthony = Math.round(anthonyEps.reduce((acc, e) => acc + e.anthonyRating, 0) / anthonyEps.length);
      }
      
      const pamEps = finalEpisodes.filter(e => (e.pamRating || 0) > 0);
      if (pamEps.length > 0) {
        finalPam = Math.round(pamEps.reduce((acc, e) => acc + e.pamRating, 0) / pamEps.length);
      }
    }

    const watchedItem = {
>>>>>>> dbd24868c7538724587d40bd2c17f8347df96689
      ...itemData,
      anthonyRating: finalAnthony,
      pamRating: finalPam,
      watchedDate: new Date().toISOString().split('T')[0],
      episodes: finalEpisodes.length > 0 ? finalEpisodes : null,
      ratedBy: currentUser,
      updatedAt: serverTimestamp()
<<<<<<< HEAD
    }, { merge: true });

    // Removal Logic
    const isMovie = itemToRate.type === 'Movie' || itemToRate.mediaType === 'movie';
    const allFinished = episodes.length === 0 || episodes.every(ep => ep.isSelected);
    if (isMovie || allFinished) {
=======
    };
    
    await setDoc(targetDocRef, watchedItem, { merge: true });
    
    const isMovie = itemToRate.type === 'Movie' || itemToRate.mediaType === 'movie';
    const allAvailableFinished = episodes.length === 0 || episodes.every(ep => ep.isSelected);

    if (isMovie || allAvailableFinished) {
>>>>>>> dbd24868c7538724587d40bd2c17f8347df96689
      await deleteDoc(doc(db, 'couples', COUPLE_ID, 'toWatch', itemToRate.id));
    }
    
    setShowRatingModal(false);
    setItemToRate(null);
  };

  // --- Updates & Utils ---
  const handleCheckForUpdates = async () => {
    setIsCheckingUpdates(true);
    let updatesCount = 0;
    try {
      const tvShows = watched.filter(item => item.type === 'TV Show' || item.mediaType === 'tv');
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
  const handleUpdateField = async (collectionName, id, field, value) => {
    await setDoc(doc(db, 'couples', COUPLE_ID, collectionName, id), { [field]: value }, { merge: true });
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

<<<<<<< HEAD
  // --- Render ---
  if (showUserSelect) return <UserSelectModal onSelectUser={handleUserSelect} />;
  if (!currentUser) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;

  const sortedItems = getSortedItems(activeTab === 'toWatch' ? toWatch : watched, activeTab);
=======
  const ToWatchCard = ({ item, isEditing, onToggleEdit }) => {
    const avgNum = ((item.anthonyPriority || 0) + (item.pamPriority || 0)) / 2;
    const roundedAvg = Math.round(avgNum);
    
    return (
      <div className="bg-gray-800 rounded-lg shadow-lg p-4 mb-3 border border-gray-700 overflow-hidden">
        {item.posterPath && (
          <div className="flex gap-3 mb-3">
            <img 
              src={item.posterPath} 
              alt={item.title}
              className="w-20 h-28 object-cover rounded"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-white">{item.title}</h3>
              {item.year && <p className="text-sm text-gray-400">{item.year}</p>}
              {item.rating && (
                <div className="flex items-center gap-1 mt-1">
                  <Star size={14} className="fill-yellow-400 text-yellow-400" />
                  <span className="text-sm text-gray-300">{item.rating}/10 TMDB</span>
                </div>
              )}
              {item.isNewEpisodes && (
                <span className="bg-green-600 text-white text-xs px-2 py-1 rounded mt-2 inline-block font-bold shadow-sm">
                  New Episodes
                </span>
              )}
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            {!item.posterPath && <h3 className="font-semibold text-lg text-white">{item.title}</h3>}
            <div className="flex gap-2 text-sm mt-1 flex-wrap">
              <span className="bg-blue-900 text-blue-300 px-2 py-0.5 rounded">{item.type}</span>
              <span className="bg-purple-900 text-purple-300 px-2 py-0.5 rounded">{item.service}</span>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <div className="flex flex-col items-end">
              <PriorityRating rating={roundedAvg} editable={false} />
              <div className="text-xs text-gray-400 mt-1">avg priority</div>
            </div>
            
            <button 
              onClick={() => handleDeleteItem(item.id)}
              className="text-red-400 hover:text-red-300 p-1 ml-2"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-700">
          <div>
            <div className="text-xs text-gray-400 mb-1">Anthony's Priority</div>
            <PriorityRating 
              rating={item.anthonyPriority || 0} 
              editable={isEditing && currentUser === 'Anthony'} 
              onRate={(rating) => handleUpdatePriority(item.id, 'anthonyPriority', rating)}
            />
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Pam's Priority</div>
            <PriorityRating 
              rating={item.pamPriority || 0} 
              editable={isEditing && currentUser === 'Pam'} 
              onRate={(rating) => handleUpdatePriority(item.id, 'pamPriority', rating)}
            />
          </div>
        </div>
        
        <div className="flex gap-2 mt-3">
          <button 
            onClick={onToggleEdit}
            className="flex-1 bg-gray-700 text-gray-200 py-2 rounded hover:bg-gray-600 flex items-center justify-center gap-2"
          >
            <Edit2 size={16} />
            {isEditing ? 'Done' : 'Edit Priority'}
          </button>
          <button 
            onClick={() => handleMarkWatched(item)}
            className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <Check size={16} />
            Mark Watched
          </button>
        </div>
      </div>
    );
  };

  const WatchedCard = ({ item, isEditing, onToggleEdit }) => {
    const isExpanded = expandedShow === item.id;
    const anthony = item.anthonyRating || 0;
    const pam = item.pamRating || 0;
    const avgRating = pam ? ((anthony + pam) / 2).toFixed(1) : anthony;
    
    const episodesBySeason = item.episodes ? item.episodes.reduce((acc, ep) => {
      const s = ep.season || 1;
      if (!acc[s]) acc[s] = [];
      acc[s].push(ep);
      return acc;
    }, {}) : {};

    return (
      <div className="bg-gray-800 rounded-lg shadow-lg p-4 mb-3 border border-gray-700">
        {item.posterPath && (
          <div className="flex gap-3 mb-3">
            <img 
              src={item.posterPath} 
              alt={item.title}
              className="w-20 h-28 object-cover rounded"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-white">{item.title}</h3>
              {item.year && <p className="text-sm text-gray-400">{item.year}</p>}
              <div className="flex gap-2 text-sm mt-1 flex-wrap">
                <span className="bg-blue-900 text-blue-300 px-2 py-0.5 rounded">{item.type}</span>
                <span className="bg-purple-900 text-purple-300 px-2 py-0.5 rounded">{item.service}</span>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-start mb-3 pt-3 border-t border-gray-700">
          <div>
            {!item.posterPath && (
              <>
                <h3 className="font-semibold text-lg text-white">{item.title}</h3>
                <div className="flex gap-2 text-sm mt-1 flex-wrap">
                  <span className="bg-blue-900 text-blue-300 px-2 py-0.5 rounded">{item.type}</span>
                  <span className="bg-purple-900 text-purple-300 px-2 py-0.5 rounded">{item.service}</span>
                </div>
              </>
            )}
            <span className="text-gray-400 text-sm">Watched {item.watchedDate}</span>
          </div>
          
          <div className="flex items-start gap-2">
            <div className="flex flex-col items-end">
              <div className="text-lg font-bold text-green-400 mb-1">{avgRating}/10</div>
              <StarRating rating={Math.round(Number(avgRating))} size={16} />
              <div className="text-xs text-gray-400 mt-1">avg rating</div>
            </div>
            
            <button 
              onClick={() => handleDeleteWatchedItem(item.id)}
              className="text-red-400 hover:text-red-300 p-1 ml-2"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-700">
          <div>
            <div className="text-xs text-gray-400 mb-1">Anthony's Rating</div>
            <StarRating 
              rating={anthony} 
              editable={isEditing && currentUser === 'Anthony'} 
              onRate={(rating) => handleUpdateShowRating(item.id, 'anthonyRating', rating)}
            />
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Pam's Rating</div>
            <StarRating 
              rating={pam} 
              editable={isEditing && currentUser === 'Pam'} 
              onRate={(rating) => handleUpdateShowRating(item.id, 'pamRating', rating)}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button 
            onClick={onToggleEdit}
            className="flex-1 bg-gray-700 text-gray-200 py-2 rounded hover:bg-gray-600 flex items-center justify-center gap-2"
          >
            <Edit2 size={16} />
            {isEditing ? 'Done' : 'Edit Rating'}
          </button>
        </div>

        {item.episodes && (
          <div className="mt-3 border-t border-gray-700 pt-2">
            <div className="flex justify-between items-center">
              <button 
                onClick={() => setExpandedShow(isExpanded ? null : item.id)}
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 w-full justify-center py-2"
              >
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {isExpanded ? 'Hide' : 'Show'} Episodes ({item.episodes.length})
              </button>
            </div>
            
            {isExpanded && (
              <div className="mt-3 space-y-4">
                {Object.keys(episodesBySeason).map(seasonNum => (
                  <div key={seasonNum}>
                    <h4 className="text-xs uppercase font-bold text-gray-500 mb-2 border-b border-gray-700 pb-1">
                      Season {seasonNum}
                    </h4>
                    <div className="space-y-2">
                      {episodesBySeason[seasonNum].map(ep => (
                        <div key={`${ep.season}-${ep.num}`} className="bg-gray-700 p-3 rounded">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="font-medium text-white">
                                {ep.season ? `E${ep.num}` : `Episode ${ep.num}`}: {ep.title}
                              </span>
                              <div className="text-sm text-gray-400">{ep.title}</div>
                            </div>
                            <div className="text-sm font-semibold text-gray-300">
                              {(((ep.anthonyRating || 0) + (ep.pamRating || 0)) / 2).toFixed(1)}/10
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <div className="text-gray-400 mb-1">Anthony: {ep.anthonyRating}/10</div>
                              <StarRating 
                                rating={ep.anthonyRating} 
                                maxStars={10}
                                size={16}
                                editable={isEditing && currentUser === 'Anthony'} 
                                onRate={(rating) => handleUpdateEpisodeRating(item.id, {num: ep.num, season: ep.season}, 'Anthony', rating)}
                              />
                            </div>
                            <div>
                              <div className="text-gray-400 mb-1">Pam: {ep.pamRating}/10</div>
                              <StarRating 
                                rating={ep.pamRating} 
                                maxStars={10}
                                size={16}
                                editable={isEditing && currentUser === 'Pam'}
                                onRate={(rating) => handleUpdateEpisodeRating(item.id, {num: ep.num, season: ep.season}, 'Pam', rating)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const RatingModal = () => {
    const [anthonyRating, setAnthonyRating] = useState(3);
    const [pamRating, setPamRating] = useState(3);
    const [numEpisodes, setNumEpisodes] = useState(0);
    const [episodes, setEpisodes] = useState([]);
    const [loadingEpisodes, setLoadingEpisodes] = useState(false);
    const [expandedSeason, setExpandedSeason] = useState(1);

    // Auto-fetch episodes when modal opens
    useEffect(() => {
      if (itemToRate?.tmdbId && (itemToRate?.type === 'TV Show' || itemToRate?.mediaType === 'tv')) {
        handleLoadEpisodesFromTMDB();
      }
    }, [itemToRate]);

    const handleLoadEpisodesFromTMDB = async () => {
      setLoadingEpisodes(true);
      
      try {
        const details = await tmdbService.getDetails(itemToRate.tmdbId, 'tv');
        
        let totalSeasons = 1;
        if (details && details.numberOfSeasons) {
          totalSeasons = details.numberOfSeasons;
        }

        // Get previously watched episodes from Firestore
        const existingShow = watched.find(
          w => w.tmdbId === itemToRate.tmdbId && w.mediaType === itemToRate.mediaType
        );
        const watchedSet = new Set();
        if (existingShow && existingShow.episodes) {
          existingShow.episodes.forEach(ep => {
            watchedSet.add(`${ep.season}-${ep.num}`);
          });
        }

        let allEpisodes = [];
        // Loop exact number of seasons
        for (let i = 1; i <= totalSeasons; i++) {
          const seasonData = await tmdbService.getSeasonDetails(itemToRate.tmdbId, i);
          
          if (seasonData && seasonData.episodes) {
            const currentSeasonEps = seasonData.episodes
              // FILTER: Exclude already watched episodes
              .filter(ep => {
                const epNum = ep.num || ep.episode_number; 
                return !watchedSet.has(`${i}-${epNum}`);
              })
              .map((ep, index) => ({
                season: i,
                num: ep.num || ep.episode_number || (index + 1), 
                title: ep.title || ep.name || `Episode ${index + 1}`,
                anthonyRating: 5,
                pamRating: 5,
                isSelected: true
              }));
            allEpisodes = [...allEpisodes, ...currentSeasonEps];
          }
        }

        if (allEpisodes.length > 0) {
          setEpisodes(allEpisodes);
          setExpandedSeason(allEpisodes[0].season);
        } else {
          // Only fallback to manual if we genuinely found nothing AND have no history
          if (watchedSet.size === 0) {
             handleAddEpisodesManually();
          }
        }

      } catch (error) {
        console.error('Error loading episodes:', error);
        handleAddEpisodesManually();
      }
      setLoadingEpisodes(false);
    };

    const handleAddEpisodesManually = () => {
      const newEps = Array.from({ length: numEpisodes }, (_, i) => ({
        num: i + 1,
        title: `Episode ${i + 1}`,
        anthonyRating: 5,
        pamRating: 5,
        isSelected: true
      }));
      setEpisodes(newEps);
    };

    const handleEpisodeRatingChange = (epNum, seasonNum, user, rating) => {
      setEpisodes(episodes.map(ep =>
        (ep.num === epNum && (ep.season === seasonNum || !ep.season))
          ? { ...ep, [user === 'Anthony' ? 'anthonyRating' : 'pamRating']: rating }
          : ep
      ));
    };

    const toggleEpisodeSelection = (epNum, seasonNum) => {
      setEpisodes(episodes.map(ep => 
        (ep.num === epNum && (ep.season === seasonNum || !ep.season))
          ? { ...ep, isSelected: !ep.isSelected }
          : ep
      ));
    };

    const toggleSeasonSelection = (seasonNum, select) => {
      setEpisodes(episodes.map(ep => 
        ep.season === seasonNum ? { ...ep, isSelected: select } : ep
      ));
    };

    const toggleAllSelection = (select) => {
      setEpisodes(episodes.map(ep => ({ ...ep, isSelected: select })));
    };

    const episodesBySeason = episodes.length > 0 ? episodes.reduce((acc, ep) => {
      const s = ep.season || 1;
      if (!acc[s]) acc[s] = [];
      acc[s].push(ep);
      return acc;
    }, {}) : {};

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Rate: {itemToRate?.title}</h2>
            <button onClick={() => {
              setShowRatingModal(false);
              setItemToRate(null);
            }} className="text-gray-400 hover:text-gray-200">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-700 p-4 rounded">
              <h3 className="font-semibold mb-3 text-white">Overall Rating (1-10 stars)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-300 mb-2">Anthony's Rating</div>
                  <StarRating 
                    rating={anthonyRating} 
                    editable={currentUser === 'Anthony'} 
                    onRate={setAnthonyRating} 
                    size={28} 
                  />
                </div>
                <div>
                  <div className="text-sm text-gray-300 mb-2">Pam's Rating</div>
                  <StarRating 
                    rating={pamRating} 
                    editable={currentUser === 'Pam'} 
                    onRate={setPamRating} 
                    size={28} 
                  />
                </div>
              </div>
            </div>

            {(itemToRate?.type === 'TV Show' || itemToRate?.mediaType === 'tv') && (
              <div className="bg-blue-900 bg-opacity-40 p-4 rounded border border-blue-800">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-white">Episodes (Unwatched)</h3>
                  <div className="flex gap-2 text-xs">
                    <button 
                      onClick={() => toggleAllSelection(true)}
                      className="text-blue-300 hover:text-blue-200 underline"
                    >
                      Select All
                    </button>
                    <span className="text-gray-500">|</span>
                    <button 
                      onClick={() => toggleAllSelection(false)}
                      className="text-blue-300 hover:text-blue-200 underline"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                
                {loadingEpisodes ? (
                  <div className="text-center text-gray-300 py-4">
                    Loading seasons and episodes...
                  </div>
                ) : episodes.length === 0 ? (
                  <div>
                    <label className="text-sm text-gray-300 block mb-2">
                      No new episodes found.
                    </label>
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-600">
                       <p className="text-xs text-gray-400 self-center">Add manually?</p>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={numEpisodes}
                        onChange={(e) => setNumEpisodes(parseInt(e.target.value) || 0)}
                        className="border border-gray-600 rounded px-3 py-2 w-24 bg-gray-700 text-white"
                      />
                      <button
                        onClick={handleAddEpisodesManually}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      >
                        Add Manual
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {Object.keys(episodesBySeason).map(seasonNum => {
                      const seasonInt = parseInt(seasonNum);
                      const allSelected = episodesBySeason[seasonNum].every(ep => ep.isSelected);
                      
                      return (
                        <div key={seasonNum} className="border border-gray-600 rounded overflow-hidden">
                          <div className="w-full flex justify-between items-center p-3 bg-gray-700 hover:bg-gray-600 transition">
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSeasonSelection(seasonInt, !allSelected);
                                }}
                                className="text-white hover:text-blue-300"
                              >
                                {allSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                              </button>
                              
                              <button 
                                onClick={() => setExpandedSeason(expandedSeason === seasonInt ? null : seasonInt)}
                                className="font-bold text-white flex-1 text-left"
                              >
                                Season {seasonNum}
                              </button>
                            </div>
                            
                            <button onClick={() => setExpandedSeason(expandedSeason === seasonInt ? null : seasonInt)}>
                              {expandedSeason === seasonInt ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>
                          
                          {expandedSeason === seasonInt && (
                            <div className="p-3 space-y-3 bg-gray-800">
                              {episodesBySeason[seasonNum].map(ep => (
                                <div key={`${ep.season}-${ep.num}`} className={`p-3 rounded border ${ep.isSelected ? 'bg-gray-700 border-gray-600' : 'bg-gray-800 border-gray-700 opacity-60'}`}>
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-start gap-3">
                                      <button 
                                        onClick={() => toggleEpisodeSelection(ep.num, ep.season)}
                                        className="mt-1 text-white hover:text-blue-300"
                                      >
                                        {ep.isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                                      </button>
                                      <div>
                                        <span className="font-medium text-white">
                                          {ep.season ? `E${ep.num}` : `Episode ${ep.num}`}: {ep.title}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {ep.isSelected && (
                                    <div className="grid grid-cols-2 gap-3 text-xs pl-7">
                                      <div>
                                        <div className="text-gray-300 mb-1">Anthony: {ep.anthonyRating}/10</div>
                                        <StarRating
                                          rating={ep.anthonyRating}
                                          maxStars={10}
                                          size={18}
                                          editable={currentUser === 'Anthony'}
                                          onRate={(rating) => handleEpisodeRatingChange(ep.num, ep.season, 'Anthony', rating)}
                                        />
                                      </div>
                                      <div>
                                        <div className="text-gray-300 mb-1">Pam: {ep.pamRating}/10</div>
                                        <StarRating
                                          rating={ep.pamRating}
                                          maxStars={10}
                                          size={18}
                                          editable={currentUser === 'Pam'}
                                          onRate={(rating) => handleEpisodeRatingChange(ep.num, ep.season, 'Pam', rating)}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    <button
                      onClick={() => setEpisodes([])}
                      className="text-sm text-red-400 hover:text-red-300 mt-2"
                    >
                      Clear Episodes
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => handleSubmitRating(anthonyRating, pamRating, episodes)}
            className="w-full mt-6 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium"
          >
            Save & Mark as Watched
          </button>
        </div>
      </div>
    );
  };

  const UserSelectModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full border border-gray-700 text-center">
        <User size={64} className="mx-auto mb-4 text-blue-400" />
        <h2 className="text-3xl font-bold text-white mb-2">Who's watching?</h2>
        <p className="text-gray-400 mb-8">Select your profile to continue</p>
        
        <div className="space-y-3">
          <button
            onClick={() => handleUserSelect('Anthony')}
            className="w-full bg-gradient-to-r from-blue-600 to-green-700 text-white py-4 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold text-lg transition"
          >
            Anthony
          </button>
          <button
            onClick={() => handleUserSelect('Pam')}
            className="w-full bg-gradient-to-r from-yellow-600 to-pink-700 text-white py-4 px-6 rounded-lg hover:from-purple-700 hover:to-purple-800 font-semibold text-lg transition"
          >
            Pam
          </button>
        </div>
      </div>
    </div>
  );

  if (showUserSelect) {
    return <UserSelectModal />;
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white">Loading...</p>
        <UserSelectModal />
      </div>
    );
  }

  const activeList = activeTab === 'toWatch' ? toWatch : watched;
  const sortedItems = getSortedItems(activeList, activeTab);
>>>>>>> dbd24868c7538724587d40bd2c17f8347df96689

  return (
    <div className="max-w-2xl mx-auto bg-gray-900 min-h-screen pb-20">
      {/* Header */}
      <div className={`${currentUser === 'Pam' ? 'bg-gradient-to-r from-yellow-600 to-pink-700' : 'bg-gradient-to-r from-blue-700 to-green-700'} text-white p-6 shadow-lg`}>
        <div className="flex justify-between items-center mb-2">
          <div><h1 className="text-2xl font-bold">Watch Together</h1><p className="text-sm opacity-80">Current: {currentUser}</p></div>
          <button onClick={() => setShowUserSelect(true)} className="text-white hover:text-gray-200 flex items-center gap-2"><User size={20} /> Switch</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 bg-gray-800">
        <button onClick={() => setActiveTab('toWatch')} className={`flex-1 py-3 font-medium ${activeTab === 'toWatch' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400'}`}>To Watch ({toWatch.length})</button>
        <button onClick={() => setActiveTab('watched')} className={`flex-1 py-3 font-medium ${activeTab === 'watched' ? 'border-b-2 border-green-500 text-green-400' : 'text-gray-400'}`}>Watched ({watched.length})</button>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <ArrowUpDown size={16} className="text-gray-400" />
            <select value={sortMethod} onChange={(e) => setSortMethod(e.target.value)} className="bg-gray-800 text-white text-sm border border-gray-600 rounded px-2 py-1">
              <option value="priority">{activeTab === 'toWatch' ? 'Priority' : 'Rating'}</option>
              <option value="title">Title</option>
              <option value="service">Service</option>
            </select>
          </div>
<<<<<<< HEAD
          <div className="flex items-center gap-2">
            {activeTab === 'toWatch' && (
              <button onClick={handleCheckForUpdates} disabled={isCheckingUpdates} className="bg-gray-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-600 disabled:opacity-50 text-sm">
                <RefreshCw size={14} className={isCheckingUpdates ? 'animate-spin' : ''} /> Updates
              </button>
            )}
            {activeTab === 'toWatch' && (
              <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"><Plus size={16} /> Add</button>
=======
          
          <div className="flex items-center gap-2">
            {/* UPDATED: Check Updates Button is now always visible on To Watch Tab */}
            {activeTab === 'toWatch' && (
              <button
                onClick={handleCheckForUpdates}
                disabled={isCheckingUpdates}
                className="bg-gray-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-600 disabled:opacity-50 text-sm"
              >
                <RefreshCw size={14} className={isCheckingUpdates ? 'animate-spin' : ''} />
                {isCheckingUpdates ? 'Checking...' : 'Updates'}
              </button>
            )}

            {activeTab === 'toWatch' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
              >
                <Plus size={16} />
                Add
              </button>
>>>>>>> dbd24868c7538724587d40bd2c17f8347df96689
            )}
          </div>
        </div>

        {sortedItems.length === 0 ? (
          <p className="text-center text-gray-500 py-8">List is empty.</p>
        ) : (
          activeTab === 'toWatch' ? (
            sortedItems.map(item => (
              <ToWatchCard 
                key={item.id} 
                item={item} 
<<<<<<< HEAD
                currentUser={currentUser}
                isEditing={editingToWatchId === item.id}
                onToggleEdit={() => setEditingToWatchId(editingToWatchId === item.id ? null : item.id)}
                onDelete={handleDeleteItem}
                onMarkWatched={handleMarkWatched}
                onUpdatePriority={(id, field, val) => handleUpdateField('toWatch', id, field, val)}
=======
                isEditing={editingToWatchId === item.id}
                onToggleEdit={() => setEditingToWatchId(editingToWatchId === item.id ? null : item.id)}
>>>>>>> dbd24868c7538724587d40bd2c17f8347df96689
              />
            ))
          ) : (
            sortedItems.map(item => (
              <WatchedCard 
                key={item.id} 
                item={item} 
<<<<<<< HEAD
                currentUser={currentUser}
                isEditing={editingWatchedId === item.id}
                onToggleEdit={() => setEditingWatchedId(editingWatchedId === item.id ? null : item.id)}
                onDelete={handleDeleteWatched}
                expandedShow={expandedShow}
                setExpandedShow={setExpandedShow}
                onUpdateShowRating={(id, field, val) => handleUpdateField('watched', id, field, val)}
                onUpdateEpisodeRating={handleUpdateEpisodeRating}
=======
                isEditing={editingWatchedId === item.id}
                onToggleEdit={() => setEditingWatchedId(editingWatchedId === item.id ? null : item.id)}
>>>>>>> dbd24868c7538724587d40bd2c17f8347df96689
              />
            ))
          )
        )}
      </div>

      {showAddModal && <AddModal onClose={() => setShowAddModal(false)} onAdd={handleAddItem} />}
      {showRatingModal && <RatingModal 
        item={itemToRate} 
        currentUser={currentUser} 
        watchedHistory={watched}
        onClose={() => setShowRatingModal(false)} 
        onSubmit={handleSubmitRating} 
      />}
    </div>
  );
};

export default WatchTogether;
