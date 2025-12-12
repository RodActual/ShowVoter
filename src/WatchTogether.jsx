// src/WatchTogether.jsx
import React, { useState, useEffect } from 'react';
import { Star, Plus, Check, X, ChevronDown, ChevronUp, Trash2, Edit2, Search, User } from 'lucide-react';
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

const COUPLE_ID = 'pamrod'; // Single shared couple ID

const WatchTogether = () => {
  const [currentUser, setCurrentUser] = useState(null); // 'Anthony' or 'Pam'
  const [showUserSelect, setShowUserSelect] = useState(false);
  
  // App state
  const [activeTab, setActiveTab] = useState('toWatch');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [expandedShow, setExpandedShow] = useState(null);
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
  }, []);

  // Listen to Firestore data
  useEffect(() => {
    if (!currentUser) return;

    const toWatchRef = collection(db, 'couples', COUPLE_ID, 'toWatch');
    const watchedRef = collection(db, 'couples', COUPLE_ID, 'watched');

    const unsubscribeToWatch = onSnapshot(toWatchRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setToWatch(items);
    });

    const unsubscribeWatched = onSnapshot(watchedRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
      anthonyPriority: currentUser === 'Anthony' ? 3 : 0,
      pamPriority: currentUser === 'Pam' ? 3 : 0,
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
    const watchedItem = {
      ...itemToRate,
      anthonyRating,
      pamRating,
      watchedDate: new Date().toISOString().split('T')[0],
      episodes: episodes.length > 0 ? episodes : undefined,
      ratedBy: currentUser,
      updatedAt: serverTimestamp()
    };
    
    const watchedRef = doc(collection(db, 'couples', COUPLE_ID, 'watched'));
    await setDoc(watchedRef, watchedItem);
    
    await deleteDoc(doc(db, 'couples', COUPLE_ID, 'toWatch', itemToRate.id));
    
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

  const handleUpdateEpisodeRating = async (showId, episodeNum, user, newRating) => {
    const showRef = doc(db, 'couples', COUPLE_ID, 'watched', showId);
    const showDoc = await getDoc(showRef);
    
    if (showDoc.exists()) {
      const showData = showDoc.data();
      const updatedEpisodes = showData.episodes.map(ep =>
        ep.num === episodeNum
          ? { ...ep, [user === 'Anthony' ? 'anthonyRating' : 'pamRating']: newRating }
          : ep
      );
      
      await setDoc(showRef, { episodes: updatedEpisodes }, { merge: true });
    }
  };

  const StarRating = ({ rating, maxStars = 5, onRate, editable = false, size = 20 }) => {
    const [hoverRating, setHoverRating] = useState(0);
    
    return (
      <div className="flex gap-1">
        {[...Array(maxStars)].map((_, i) => (
          <Star
            key={i}
            size={size}
            className={`${i < (editable && hoverRating ? hoverRating : rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'} ${editable ? 'cursor-pointer hover:fill-yellow-300 transition-all' : ''}`}
            onClick={() => editable && onRate && onRate(i + 1)}
            onMouseEnter={() => editable && setHoverRating(i + 1)}
            onMouseLeave={() => editable && setHoverRating(0)}
          />
        ))}
      </div>
    );
  };

  const calculateAvgPriority = (item) => {
    const anthony = item.anthonyPriority || 0;
    const pam = item.pamPriority || 0;
    
    if (anthony === 0 && pam === 0) return 0;
    if (anthony === 0) return pam;
    if (pam === 0) return anthony;
    
    return ((anthony + pam) / 2).toFixed(1);
  };

  const ToWatchCard = ({ item }) => {
    const [editMode, setEditMode] = useState(false);
    
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
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-400">{calculateAvgPriority(item)}</div>
              <div className="text-xs text-gray-400">avg priority</div>
            </div>
            <button 
              onClick={() => handleDeleteItem(item.id)}
              className="text-red-400 hover:text-red-300 p-1"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-700">
          <div>
            <div className="text-xs text-gray-400 mb-1">Anthony's Priority</div>
            <StarRating 
              rating={item.anthonyPriority || 0} 
              editable={editMode}
              onRate={(rating) => handleUpdatePriority(item.id, 'anthonyPriority', rating)}
            />
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Pam's Priority</div>
            <StarRating 
              rating={item.pamPriority || 0} 
              editable={editMode}
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
            {editMode ? 'Done' : 'Edit Votes'}
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

  const WatchedCard = ({ item }) => {
    const isExpanded = expandedShow === item.id;
    const anthony = item.anthonyRating || 0;
    const pam = item.pamRating || 0;
    const avgRating = pam ? ((anthony + pam) / 2).toFixed(1) : anthony;
    const [editEpisodes, setEditEpisodes] = useState(false);
    
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
          <div className="text-right">
            <div className="text-2xl font-bold text-green-400">{avgRating}</div>
            <div className="text-xs text-gray-400">avg rating</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-700">
          <div>
            <div className="text-xs text-gray-400 mb-1">Anthony's Rating</div>
            <StarRating rating={anthony} />
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Pam's Rating</div>
            <StarRating rating={pam} />
          </div>
        </div>

        {item.episodes && (
          <div className="mt-3">
            <div className="flex justify-between items-center">
              <button 
                onClick={() => setExpandedShow(isExpanded ? null : item.id)}
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
              >
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {isExpanded ? 'Hide' : 'Show'} Episodes ({item.episodes.length})
              </button>
              {isExpanded && (
                <button 
                  onClick={() => setEditEpisodes(!editEpisodes)}
                  className="text-sm text-gray-400 hover:text-gray-300 flex items-center gap-1"
                >
                  <Edit2 size={14} />
                  {editEpisodes ? 'Done' : 'Edit'}
                </button>
              )}
            </div>
            
            {isExpanded && (
              <div className="mt-3 space-y-2">
                {item.episodes.map(ep => (
                  <div key={ep.num} className="bg-gray-700 p-3 rounded">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-medium text-white">Episode {ep.num}</span>
                        <div className="text-sm text-gray-400">{ep.title}</div>
                      </div>
                      <div className="text-sm font-semibold text-gray-300">
                        {(((ep.anthonyRating || 0) + (ep.pamRating || 0)) / 2).toFixed(1)}/10
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-gray-400 mb-1">Anthony: {ep.anthonyRating || 0}/10</div>
                        <StarRating 
                          rating={Math.round((ep.anthonyRating || 0) / 2)} 
                          maxStars={5}
                          size={16}
                          editable={editEpisodes}
                          onRate={(rating) => handleUpdateEpisodeRating(item.id, ep.num, 'Anthony', rating * 2)}
                        />
                      </div>
                      <div>
                        <div className="text-gray-400 mb-1">Pam: {ep.pamRating || 0}/10</div>
                        <StarRating 
                          rating={Math.round((ep.pamRating || 0) / 2)} 
                          maxStars={5}
                          size={16}
                          editable={editEpisodes}
                          onRate={(rating) => handleUpdateEpisodeRating(item.id, ep.num, 'Pam', rating * 2)}
                        />
                      </div>
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

    const handleLoadEpisodesFromTMDB = async () => {
      if (!itemToRate?.tmdbId || !itemToRate?.mediaType) {
        handleAddEpisodesManually();
        return;
      }

      setLoadingEpisodes(true);
      try {
        const seasonData = await tmdbService.getSeasonDetails(itemToRate.tmdbId, 1);
        if (seasonData && seasonData.episodes) {
          setEpisodes(seasonData.episodes.map(ep => ({
            ...ep,
            anthonyRating: 5,
            pamRating: 5
          })));
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
        pamRating: 5
      }));
      setEpisodes(newEps);
    };

    const handleEpisodeRatingChange = (epNum, user, rating) => {
      setEpisodes(episodes.map(ep =>
        ep.num === epNum
          ? { ...ep, [user === 'Anthony' ? 'anthonyRating' : 'pamRating']: rating }
          : ep
      ));
    };

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
              <h3 className="font-semibold mb-3 text-white">Overall Rating (1-5 stars)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-300 mb-2">Anthony's Rating</div>
                  <StarRating rating={anthonyRating} editable onRate={setAnthonyRating} size={28} />
                </div>
                <div>
                  <div className="text-sm text-gray-300 mb-2">Pam's Rating</div>
                  <StarRating rating={pamRating} editable onRate={setPamRating} size={28} />
                </div>
              </div>
            </div>

            {itemToRate?.type === 'TV Show' && (
              <div className="bg-blue-900 bg-opacity-40 p-4 rounded border border-blue-800">
                <h3 className="font-semibold mb-3 text-white">Episodes (Optional)</h3>
                {episodes.length === 0 ? (
                  <div>
                    <label className="text-sm text-gray-300 block mb-2">
                      How many episodes did you watch?
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={numEpisodes}
                        onChange={(e) => setNumEpisodes(parseInt(e.target.value) || 0)}
                        className="border border-gray-600 rounded px-3 py-2 w-24 bg-gray-700 text-white"
                      />
                      <button
                        onClick={handleLoadEpisodesFromTMDB}
                        disabled={numEpisodes === 0 || loadingEpisodes}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-600"
                      >
                        {loadingEpisodes ? 'Loading...' : 'Add Episodes'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {itemToRate.tmdbId ? 'Episode titles will be loaded from TMDB' : 'Episodes will be numbered'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {episodes.map(ep => (
                      <div key={ep.num} className="bg-gray-700 p-3 rounded">
                        <div className="font-medium mb-2 text-white">Episode {ep.num}: {ep.title}</div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-gray-300 mb-1">Anthony: {ep.anthonyRating}/10</div>
                            <StarRating
                              rating={Math.round(ep.anthonyRating / 2)}
                              maxStars={5}
                              size={18}
                              editable
                              onRate={(rating) => handleEpisodeRatingChange(ep.num, 'Anthony', rating * 2)}
                            />
                          </div>
                          <div>
                            <div className="text-gray-300 mb-1">Pam: {ep.pamRating}/10</div>
                            <StarRating
                              rating={Math.round(ep.pamRating / 2)}
                              maxStars={5}
                              size={18}
                              editable
                              onRate={(rating) => handleEpisodeRatingChange(ep.num, 'Pam', rating * 2)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => setEpisodes([])}
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      Remove all episodes
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
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold text-lg transition"
          >
            Anthony
          </button>
          <button
            onClick={() => handleUserSelect('Pam')}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 px-6 rounded-lg hover:from-purple-700 hover:to-purple-800 font-semibold text-lg transition"
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
      </div>
    );
  }

  const sortedToWatch = [...toWatch].sort((a, b) => calculateAvgPriority(b) - calculateAvgPriority(a));

  return (
    <div className="max-w-2xl mx-auto bg-gray-900 min-h-screen pb-20">
      <div className="bg-gradient-to-r from-blue-700 to-purple-700 text-white p-6 shadow-lg">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-2xl font-bold">Watch Together</h1>
            <p className="text-blue-200 text-sm">Currently: {currentUser}</p>
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
        {activeTab === 'toWatch' ? (
          <>
            <div className="mb-4 flex justify-between items-center">
              <p className="text-sm text-gray-400">Sorted by priority</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
              >
                <Plus size={16} />
                Add
              </button>
            </div>
            {sortedToWatch.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No shows added yet. Click Add to get started!</p>
            ) : (
              sortedToWatch.map(item => <ToWatchCard key={item.id} item={item} />)
            )}
          </>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-gray-400">Your watch history</p>
            </div>
            {watched.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No shows watched yet. Mark something as watched to see it here!</p>
            ) : (
              watched.map(item => <WatchedCard key={item.id} item={item} />)
            )}
          </>
        )}
      </div>

      {showAddModal && <AddModal />}
      {showRatingModal && <RatingModal />}
    </div>
  );
};

export default WatchTogether;