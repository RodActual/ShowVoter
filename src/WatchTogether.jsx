// src/WatchTogether.jsx
import React, { useState, useEffect } from 'react';
import { Star, Plus, Check, X, ChevronDown, ChevronUp, Trash2, Edit2, Search, User, CheckSquare, Square, ArrowUpDown } from 'lucide-react';
import { db } from './firebase';
import tmdbService from './tmdbService';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  onSnapshot,
  serverTimestamp,
  deleteDoc 
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { auth } from './firebase';

const COUPLE_ID = 'pamrod'; // Single shared couple ID

const WatchTogether = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [showUserSelect, setShowUserSelect] = useState(false);
  
  // App state
  const [activeTab, setActiveTab] = useState('toWatch');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  
  // Sorting State
  const [sortMethod, setSortMethod] = useState('priority'); // 'priority', 'title', 'service'

  // State for expanded accordions
  const [expandedShow, setExpandedShow] = useState(null);
  
  // State for editing episodes
  const [editingEpisodesId, setEditingEpisodesId] = useState(null);

  const [itemToRate, setItemToRate] = useState(null);
  
  // TMDB search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedShow, setSelectedShow] = useState(null);
  const [availableServices, setAvailableServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  
  const [toWatch, setToWatch] = useState([]);
  const [watched, setWatched] = useState([]);

  // Check for saved user preference
  useEffect(() => {
    const savedUser = localStorage.getItem('watchTogetherUser');
    if (savedUser) {
      setCurrentUser(savedUser);
    } else {
      setShowUserSelect(true);
    }
      signInAnonymously(auth).catch(error => {
    console.error('Auth error:', error);
  });
  }, []);

  // Listen to Firestore data
  useEffect(() => {
    if (!currentUser) return;

    const toWatchRef = collection(db, 'couples', COUPLE_ID, 'toWatch');
    const watchedRef = collection(db, 'couples', COUPLE_ID, 'watched');

    const unsubscribeToWatch = onSnapshot(toWatchRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setToWatch(items);
    });

    const unsubscribeWatched = onSnapshot(watchedRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setWatched(items);
    });

    return () => {
      unsubscribeToWatch();
      unsubscribeWatched();
    };
  }, [currentUser]);

  // TMDB search with debouncing
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setSearching(true);
        const results = await tmdbService.search(searchQuery);
        setSearchResults(results);
        setSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery]);

  const handleUserSelect = (user) => {
    setCurrentUser(user);
    localStorage.setItem('watchTogetherUser', user);
    setShowUserSelect(false);
  };

  const handleSwitchUser = () => {
    setShowUserSelect(true);
  };

  const handleSelectShow = async (show) => {
    setSelectedShow(show);
    setLoadingServices(true);
    
    const providers = await tmdbService.getStreamingProviders(
      show.tmdbId, 
      show.mediaType
    );
    setAvailableServices(providers);
    setLoadingServices(false);
  };

  const handleAddItem = async (selectedService) => {
    if (!selectedShow) return;
    
    const item = {
      title: selectedShow.title,
      type: selectedShow.type,
      service: selectedService,
      anthonyPriority: currentUser === 'Anthony' ? 2 : 0,
      pamPriority: currentUser === 'Pam' ? 2 : 0,
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
    
    const itemRef = doc(collection(db, 'couples', COUPLE_ID, 'toWatch'));
    await setDoc(itemRef, item);
    
    setShowAddModal(false);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedShow(null);
    setAvailableServices([]);
  };

  const handleMarkWatched = (item) => {
    setItemToRate(item);
    setShowRatingModal(true);
  };

  const handleSubmitRating = async (anthonyRating, pamRating, episodes = []) => {
    const { id, ...itemData } = itemToRate;

    // 1. Filter out only the NEWLY selected episodes
    const newSelectedEpisodes = episodes.filter(ep => ep.isSelected);
    
    // 2. Remove the 'isSelected' flag before saving
    const cleanNewEpisodes = newSelectedEpisodes.map(({ isSelected, ...ep }) => ep);

    // 3. Check if this show already exists in the "watched" list
    const existingShow = watched.find(
      w => w.tmdbId === itemToRate.tmdbId && w.mediaType === itemToRate.mediaType
    );

    let finalEpisodes = cleanNewEpisodes;
    let targetDocRef;

    // MERGE LOGIC:
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

    // 4. Recalculate averages
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
      ...itemData,
      anthonyRating: finalAnthony,
      pamRating: finalPam,
      watchedDate: new Date().toISOString().split('T')[0],
      episodes: finalEpisodes.length > 0 ? finalEpisodes : null,
      ratedBy: currentUser,
      updatedAt: serverTimestamp()
    };
    
    await setDoc(targetDocRef, watchedItem, { merge: true });
    
    // 5. Delete from "To Watch" ONLY if ALL episodes (including previously watched) are done
    const isMovie = itemToRate.type === 'Movie' || itemToRate.mediaType === 'movie';
    // If episodes array is empty in modal, it means either manual entry or no new episodes found
    const noNewEpisodesAvailable = episodes.length === 0;
    // Check if user selected everything available in the modal
    const allAvailableSelected = episodes.every(ep => ep.isSelected);

    if (isMovie || (noNewEpisodesAvailable && allAvailableSelected)) {
      await deleteDoc(doc(db, 'couples', COUPLE_ID, 'toWatch', itemToRate.id));
    }
    
    setShowRatingModal(false);
    setItemToRate(null);
  };

  const handleUpdatePriority = async (itemId, field, newPriority) => {
    const itemRef = doc(db, 'couples', COUPLE_ID, 'toWatch', itemId);
    await setDoc(itemRef, { [field]: newPriority }, { merge: true });
  };

  const handleDeleteItem = async (itemId) => {
    await deleteDoc(doc(db, 'couples', COUPLE_ID, 'toWatch', itemId));
  };

  const handleDeleteWatchedItem = async (itemId) => {
    await deleteDoc(doc(db, 'couples', COUPLE_ID, 'watched', itemId));
  };

  const handleUpdateShowRating = async (itemId, field, newRating) => {
    const showRef = doc(db, 'couples', COUPLE_ID, 'watched', itemId);
    await setDoc(showRef, { [field]: newRating }, { merge: true });
  };

  const handleUpdateEpisodeRating = async (showId, episodeNum, user, newRating) => {
    const showRef = doc(db, 'couples', COUPLE_ID, 'watched', showId);
    const showDoc = await getDoc(showRef);
    
    if (showDoc.exists()) {
      const showData = showDoc.data();
      
      const updatedEpisodes = showData.episodes.map(ep => {
        const isMatch = (ep.season === episodeNum.season && ep.num === episodeNum.num) || 
                        (!ep.season && ep.num === episodeNum.num);
        
        if (isMatch) {
          return { ...ep, [user === 'Anthony' ? 'anthonyRating' : 'pamRating']: newRating };
        }
        return ep;
      });
      
      const userField = user === 'Anthony' ? 'anthonyRating' : 'pamRating';
      const ratedEpisodes = updatedEpisodes.filter(ep => (ep[userField] || 0) > 0);
      
      let newAverage = 0;
      if (ratedEpisodes.length > 0) {
        const sum = ratedEpisodes.reduce((acc, ep) => acc + (ep[userField] || 0), 0);
        newAverage = Math.round(sum / ratedEpisodes.length);
      } else {
        newAverage = showData[userField] || 0;
      }

      await setDoc(showRef, { 
        episodes: updatedEpisodes,
        [userField]: newAverage
      }, { merge: true });
    }
  };

  const StarRating = ({ rating, maxStars = 10, onRate, editable = false, size = 20 }) => {
    const [hoverRating, setHoverRating] = useState(0);
    const isInteractive = editable;
    
    return (
      <div className={`flex gap-1 ${!isInteractive ? 'opacity-90' : ''}`}>
        {[...Array(maxStars)].map((_, i) => (
          <Star
            key={i}
            size={size}
            className={`${i < (isInteractive && hoverRating ? hoverRating : rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'} ${isInteractive ? 'cursor-pointer hover:fill-yellow-300 transition-all' : 'cursor-default'}`}
            onClick={() => isInteractive && onRate && onRate(i + 1)}
            onMouseEnter={() => isInteractive && setHoverRating(i + 1)}
            onMouseLeave={() => isInteractive && setHoverRating(0)}
          />
        ))}
      </div>
    );
  };

  const PriorityRating = ({ rating, editable, onRate }) => {
    const levels = [1, 2, 3];
    
    const getColor = (level) => {
        if (rating < level) return "bg-gray-700";
        if (rating === 1) return "bg-blue-500";
        if (rating === 2) return "bg-yellow-500";
        return "bg-red-500";
    };

    const getLabel = () => {
        if (rating === 1) return "Low";
        if (rating === 2) return "Med";
        if (rating === 3) return "High";
        return "None";
    };

    return (
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
            {levels.map((level) => (
            <div
                key={level}
                onClick={() => editable && onRate(level)}
                className={`
                h-3 w-6 rounded-sm transition-all
                ${getColor(level)}
                ${editable ? 'cursor-pointer hover:opacity-80' : 'opacity-90'}
                `}
            />
            ))}
        </div>
        <span className={`text-xs font-medium ${
            rating === 1 ? 'text-blue-400' : 
            rating === 2 ? 'text-yellow-400' : 
            rating === 3 ? 'text-red-400' : 'text-gray-500'
        }`}>
            {getLabel()}
        </span>
      </div>
    );
  };

  const calculateTotalPriority = (item) => {
    return (item.anthonyPriority || 0) + (item.pamPriority || 0);
  };

  const calculateAverageRating = (item) => {
    const ant = item.anthonyRating || 0;
    const pam = item.pamRating || 0;
    return pam > 0 ? (ant + pam) / 2 : ant;
  };

  const getSortedItems = (items, type) => {
    return [...items].sort((a, b) => {
      if (sortMethod === 'title') {
        return a.title.localeCompare(b.title);
      }
      
      if (sortMethod === 'service') {
        return (a.service || '').localeCompare(b.service || '');
      }

      if (type === 'toWatch') {
        return calculateTotalPriority(b) - calculateTotalPriority(a);
      } else {
        return calculateAverageRating(b) - calculateAverageRating(a);
      }
    });
  };

  const ToWatchCard = ({ item }) => {
    const [editMode, setEditMode] = useState(false);
    
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
              editable={editMode && currentUser === 'Anthony'} 
              onRate={(rating) => handleUpdatePriority(item.id, 'anthonyPriority', rating)}
            />
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Pam's Priority</div>
            <PriorityRating 
              rating={item.pamPriority || 0} 
              editable={editMode && currentUser === 'Pam'} 
              onRate={(rating) => handleUpdatePriority(item.id, 'pamPriority', rating)}
            />
          </div>
        </div>
        
        <div className="flex gap-2 mt-3">
          <button 
            onClick={() => setEditMode(!editMode)}
            className="flex-1 bg-gray-700 text-gray-200 py-2 rounded hover:bg-gray-600 flex items-center justify-center gap-2"
          >
            <Edit2 size={16} />
            {editMode ? 'Done' : 'Edit Priority'}
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
    
    // Group episodes by season for rendering
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
                const epNum = ep.num || ep.episode_number; // Handle data inconsistency if any
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
          setExpandedSeason(allEpisodes[0].season); // Expand the first season that has unwatched eps
        } else {
          // If no episodes remain (all watched), specific message or handle logic
          if (watchedSet.size > 0) {
             // User has watched everything. We could show a "All Caught Up" message, 
             // but strictly following the instruction: if fetching returns 0 because of filtering, 
             // we show empty or handle as "nothing new".
             // For now, let's just let it be empty or default manual.
             console.log("All episodes watched.");
          }
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
                      {/* Logic to show correct message if all are watched */}
                      No new episodes found.
                    </label>
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-600">
                       <p className="text-xs text-gray-400">Add manually?</p>
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

  const AddModal = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Add to Watch List</h2>
            <button 
              onClick={() => {
                setShowAddModal(false);
                setSearchQuery('');
                setSearchResults([]);
                setSelectedShow(null);
                setAvailableServices([]);
              }} 
              className="text-gray-400 hover:text-gray-200"
            >
              <X size={24} />
            </button>
          </div>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a movie or TV show..."
                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>
          </div>

          {searching && (
            <div className="text-center py-4 text-gray-400">Searching...</div>
          )}

          {!selectedShow && searchResults.length > 0 && (
            <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
              {searchResults.map(result => (
                <div
                  key={result.id}
                  onClick={() => handleSelectShow(result)}
                  className="flex gap-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition"
                >
                  {result.posterPath ? (
                    <img 
                      src={result.posterPath} 
                      alt={result.title}
                      className="w-16 h-24 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-24 bg-gray-600 rounded flex items-center justify-center">
                      <span className="text-gray-400 text-xs">No image</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{result.title}</h3>
                    <p className="text-sm text-gray-400">{result.year} • {result.type}</p>
                    {result.rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star size={12} className="fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-gray-300">{result.rating}/10</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{result.overview}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchResults.length === 0 && searchQuery.length >= 2 && !searching && (
            <div className="text-center py-8 text-gray-400">
              No results found. Try a different search.
            </div>
          )}

          {selectedShow && (
            <div className="space-y-4">
              <div className="flex gap-3 p-3 bg-gray-700 rounded-lg">
                {selectedShow.posterPath && (
                  <img 
                    src={selectedShow.posterPath} 
                    alt={selectedShow.title}
                    className="w-20 h-28 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-white text-lg">{selectedShow.title}</h3>
                  <p className="text-sm text-gray-400">{selectedShow.year} • {selectedShow.type}</p>
                  {selectedShow.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={14} className="fill-yellow-400 text-yellow-400" />
                      <span className="text-sm text-gray-300">{selectedShow.rating}/10</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedShow(null);
                    setAvailableServices([]);
                  }}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <X size={20} />
                </button>
              </div>

              {selectedShow.overview && (
                <p className="text-sm text-gray-300 bg-gray-700 p-3 rounded-lg">
                  {selectedShow.overview}
                </p>
              )}

              <div>
                <h3 className="text-white font-semibold mb-2">Where will you watch it?</h3>
                
                {loadingServices ? (
                  <div className="text-center py-4 text-gray-400">Loading streaming services...</div>
                ) : availableServices.length > 0 ? (
                  <>
                    <p className="text-xs text-gray-400 mb-3">Available on:</p>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {availableServices.map(service => (
                        <button
                          key={service.id}
                          onClick={() => handleAddItem(service.name)}
                          className="flex items-center gap-2 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                        >
                          {service.logo && (
                            <img src={service.logo} alt={service.name} className="w-8 h-8 rounded" />
                          )}
                          <span className="text-white text-sm">{service.name}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 text-center mb-2">or select manually:</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 mb-3">Select a streaming service:</p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {['Netflix', 'Hulu', 'Disney+', 'Max', 'Prime Video', 'Apple TV+', 'Paramount+', 'Other'].map(service => (
                    <button
                      key={service}
                      onClick={() => handleAddItem(service)}
                      className="p-3 bg-blue-900 bg-opacity-40 hover:bg-opacity-60 text-blue-300 rounded-lg transition border border-blue-800"
                    >
                      {service}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!selectedShow && searchQuery.length < 2 && (
            <div className="text-center py-8 text-gray-400">
              <Search size={48} className="mx-auto mb-3 opacity-50" />
              <p>Search for a movie or TV show to add to your watch list</p>
              <p className="text-sm mt-2">Try searching for "Breaking Bad" or "Inception"</p>
            </div>
          )}
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

  return (
    <div className="max-w-2xl mx-auto bg-gray-900 min-h-screen pb-20">
      <div className={`${currentUser === 'Pam' ? 'bg-gradient-to-r from-yellow-600 to-pink-700' : 'bg-gradient-to-r from-blue-700 to-green-700'} text-white p-6 shadow-lg`}>
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-2xl font-bold">Watch Together</h1>
            <p className={`${currentUser === 'Pam' ? 'text-amber-200' : 'text-blue-200'} text-sm`}>Currently: {currentUser}</p>
          </div>
          <button
            onClick={handleSwitchUser}
            className="text-white hover:text-gray-200 p-2 flex items-center gap-2"
          >
            <User size={20} />
            <span className="text-sm">Switch</span>
          </button>
        </div>
      </div>

      <div className="flex border-b border-gray-700 bg-gray-800">
        <button
          onClick={() => setActiveTab('toWatch')}
          className={`flex-1 py-3 font-medium ${activeTab === 'toWatch' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400'}`}
        >
          To Watch ({toWatch.length})
        </button>
        <button
          onClick={() => setActiveTab('watched')}
          className={`flex-1 py-3 font-medium ${activeTab === 'watched' ? 'border-b-2 border-green-500 text-green-400' : 'text-gray-400'}`}
        >
          Watched ({watched.length})
        </button>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <ArrowUpDown size={16} className="text-gray-400" />
            <select 
              value={sortMethod}
              onChange={(e) => setSortMethod(e.target.value)}
              className="bg-gray-800 text-white text-sm border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
            >
              <option value="priority">{activeTab === 'toWatch' ? 'Priority' : 'Rating'}</option>
              <option value="title">Title</option>
              <option value="service">Service</option>
            </select>
          </div>
          
          {activeTab === 'toWatch' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
            >
              <Plus size={16} />
              Add
            </button>
          )}
        </div>

        {sortedItems.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            {activeTab === 'toWatch' 
              ? 'No shows added yet. Click Add to get started!' 
              : 'No shows watched yet. Mark something as watched to see it here!'}
          </p>
        ) : (
          activeTab === 'toWatch' ? (
            sortedItems.map(item => <ToWatchCard key={item.id} item={item} />)
          ) : (
            sortedItems.map(item => (
              <WatchedCard 
                key={item.id} 
                item={item} 
                isEditing={editingEpisodesId === item.id}
                onToggleEdit={() => setEditingEpisodesId(editingEpisodesId === item.id ? null : item.id)}
              />
            ))
          )
        )}
      </div>

      {showAddModal && <AddModal />}
      {showRatingModal && <RatingModal />}
    </div>
  );
};

export default WatchTogether;
