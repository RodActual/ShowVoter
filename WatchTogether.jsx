import React, { useState } from 'react';
import { Star, Plus, Check, X, ChevronDown, ChevronUp, Search, Trash2, Edit2 } from 'lucide-react';

const WatchVoteApp = () => {
  const [activeTab, setActiveTab] = useState('toWatch');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [expandedShow, setExpandedShow] = useState(null);
  const [currentUser, setCurrentUser] = useState('you'); // 'you' or 'spouse'
  const [itemToRate, setItemToRate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New item form
  const [newItem, setNewItem] = useState({
    title: '',
    type: 'TV Show',
    service: 'Netflix',
    yourPriority: 3,
    spousePriority: 0
  });

  const [toWatch, setToWatch] = useState([
    {
      id: 1,
      title: "The Bear",
      type: "TV Show",
      service: "Hulu",
      yourPriority: 4,
      spousePriority: 5,
      addedDate: "2024-12-01"
    },
    {
      id: 2,
      title: "Dune: Part Two",
      type: "Movie",
      service: "Max",
      yourPriority: 5,
      spousePriority: 3,
      addedDate: "2024-12-05"
    },
    {
      id: 3,
      title: "Shogun",
      type: "TV Show",
      service: "Hulu",
      yourPriority: 3,
      spousePriority: 4,
      addedDate: "2024-11-28"
    }
  ]);

  const [watched, setWatched] = useState([
    {
      id: 4,
      title: "The Last of Us",
      type: "TV Show",
      service: "Max",
      yourRating: 5,
      spouseRating: 4,
      watchedDate: "2024-11-15",
      episodes: [
        { num: 1, title: "When You're Lost in the Darkness", yourRating: 8, spouseRating: 7 },
        { num: 2, title: "Infected", yourRating: 9, spouseRating: 9 },
        { num: 3, title: "Long, Long Time", yourRating: 10, spouseRating: 10 },
      ]
    },
    {
      id: 5,
      title: "Oppenheimer",
      type: "Movie",
      service: "Prime Video",
      yourRating: 5,
      spouseRating: 4,
      watchedDate: "2024-11-20"
    }
  ]);

  const [episodeToRate, setEpisodeToRate] = useState(null);

  const services = ['Netflix', 'Hulu', 'Disney+', 'Max', 'Prime Video', 'Apple TV+', 'Paramount+'];

  const StarRating = ({ rating, maxStars = 5, onRate, editable = false, size = 20 }) => {
    const [hoverRating, setHoverRating] = useState(0);
    
    return (
      <div className="flex gap-1">
        {[...Array(maxStars)].map((_, i) => (
          <Star
            key={i}
            size={size}
            className={`${i < (editable && hoverRating ? hoverRating : rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} ${editable ? 'cursor-pointer hover:fill-yellow-300 transition-all' : ''}`}
            onClick={() => editable && onRate && onRate(i + 1)}
            onMouseEnter={() => editable && setHoverRating(i + 1)}
            onMouseLeave={() => editable && setHoverRating(0)}
          />
        ))}
      </div>
    );
  };

  const calculateAvgPriority = (item) => {
    if (item.spousePriority === 0) return item.yourPriority;
    return ((item.yourPriority + item.spousePriority) / 2).toFixed(1);
  };

  const handleAddItem = () => {
    if (!newItem.title.trim()) return;
    
    const item = {
      id: Date.now(),
      ...newItem,
      addedDate: new Date().toISOString().split('T')[0]
    };
    
    setToWatch([...toWatch, item]);
    setNewItem({
      title: '',
      type: 'TV Show',
      service: 'Netflix',
      yourPriority: 3,
      spousePriority: 0
    });
    setShowAddModal(false);
  };

  const handleMarkWatched = (item) => {
    setItemToRate(item);
    setShowRatingModal(true);
  };

  const handleSubmitRating = (yourRating, spouseRating, episodes = []) => {
    const watchedItem = {
      ...itemToRate,
      yourRating,
      spouseRating,
      watchedDate: new Date().toISOString().split('T')[0],
      episodes: episodes.length > 0 ? episodes : undefined
    };
    
    setWatched([watchedItem, ...watched]);
    setToWatch(toWatch.filter(i => i.id !== itemToRate.id));
    setShowRatingModal(false);
    setItemToRate(null);
  };

  const handleUpdatePriority = (itemId, user, newPriority) => {
    setToWatch(toWatch.map(item => 
      item.id === itemId 
        ? { ...item, [user === 'you' ? 'yourPriority' : 'spousePriority']: newPriority }
        : item
    ));
  };

  const handleDeleteItem = (itemId) => {
    setToWatch(toWatch.filter(i => i.id !== itemId));
  };

  const handleUpdateEpisodeRating = (showId, episodeNum, user, newRating) => {
    setWatched(watched.map(show => {
      if (show.id === showId && show.episodes) {
        return {
          ...show,
          episodes: show.episodes.map(ep =>
            ep.num === episodeNum
              ? { ...ep, [user === 'you' ? 'yourRating' : 'spouseRating']: newRating }
              : ep
          )
        };
      }
      return show;
    }));
  };

  const ToWatchCard = ({ item }) => {
    const [editMode, setEditMode] = useState(false);
    
    return (
      <div className="bg-gray-800 rounded-lg shadow-lg p-4 mb-3 border border-gray-700">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-white">{item.title}</h3>
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
            <div className="text-xs text-gray-400 mb-1">Your Priority</div>
            <StarRating 
              rating={item.yourPriority} 
              editable={editMode}
              onRate={(rating) => handleUpdatePriority(item.id, 'you', rating)}
            />
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Spouse Priority</div>
            <StarRating 
              rating={item.spousePriority} 
              editable={editMode}
              onRate={(rating) => handleUpdatePriority(item.id, 'spouse', rating)}
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
    const avgRating = item.spouseRating ? ((item.yourRating + item.spouseRating) / 2).toFixed(1) : item.yourRating;
    const [editEpisodes, setEditEpisodes] = useState(false);
    
    return (
      <div className="bg-gray-800 rounded-lg shadow-lg p-4 mb-3 border border-gray-700">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold text-lg text-white">{item.title}</h3>
            <div className="flex gap-2 text-sm mt-1 flex-wrap">
              <span className="bg-blue-900 text-blue-300 px-2 py-0.5 rounded">{item.type}</span>
              <span className="bg-purple-900 text-purple-300 px-2 py-0.5 rounded">{item.service}</span>
              <span className="text-gray-400">Watched {item.watchedDate}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-400">{avgRating}</div>
            <div className="text-xs text-gray-400">avg rating</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-700">
          <div>
            <div className="text-xs text-gray-400 mb-1">Your Rating</div>
            <StarRating rating={item.yourRating} />
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Spouse Rating</div>
            <StarRating rating={item.spouseRating || 0} />
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
                        {((ep.yourRating + ep.spouseRating) / 2).toFixed(1)}/10
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-gray-400 mb-1">You: {ep.yourRating}/10</div>
                        <StarRating 
                          rating={Math.round(ep.yourRating / 2)} 
                          maxStars={5}
                          size={16}
                          editable={editEpisodes}
                          onRate={(rating) => handleUpdateEpisodeRating(item.id, ep.num, 'you', rating * 2)}
                        />
                      </div>
                      <div>
                        <div className="text-gray-400 mb-1">Spouse: {ep.spouseRating}/10</div>
                        <StarRating 
                          rating={Math.round(ep.spouseRating / 2)} 
                          maxStars={5}
                          size={16}
                          editable={editEpisodes}
                          onRate={(rating) => handleUpdateEpisodeRating(item.id, ep.num, 'spouse', rating * 2)}
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
    const [yourRating, setYourRating] = useState(3);
    const [spouseRating, setSpouseRating] = useState(3);
    const [numEpisodes, setNumEpisodes] = useState(0);
    const [episodes, setEpisodes] = useState([]);

    const handleAddEpisodes = () => {
      const newEps = Array.from({ length: numEpisodes }, (_, i) => ({
        num: i + 1,
        title: `Episode ${i + 1}`,
        yourRating: 5,
        spouseRating: 5
      }));
      setEpisodes(newEps);
    };

    const handleEpisodeRatingChange = (epNum, user, rating) => {
      setEpisodes(episodes.map(ep =>
        ep.num === epNum
          ? { ...ep, [user === 'you' ? 'yourRating' : 'spouseRating']: rating }
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
                  <div className="text-sm text-gray-300 mb-2">Your Rating</div>
                  <StarRating rating={yourRating} editable onRate={setYourRating} size={28} />
                </div>
                <div>
                  <div className="text-sm text-gray-300 mb-2">Spouse Rating</div>
                  <StarRating rating={spouseRating} editable onRate={setSpouseRating} size={28} />
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
                        onClick={handleAddEpisodes}
                        disabled={numEpisodes === 0}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-600"
                      >
                        Add Episodes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {episodes.map(ep => (
                      <div key={ep.num} className="bg-gray-700 p-3 rounded">
                        <div className="font-medium mb-2 text-white">Episode {ep.num}</div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-gray-300 mb-1">You: {ep.yourRating}/10</div>
                            <StarRating
                              rating={Math.round(ep.yourRating / 2)}
                              maxStars={5}
                              size={18}
                              editable
                              onRate={(rating) => handleEpisodeRatingChange(ep.num, 'you', rating * 2)}
                            />
                          </div>
                          <div>
                            <div className="text-gray-300 mb-1">Spouse: {ep.spouseRating}/10</div>
                            <StarRating
                              rating={Math.round(ep.spouseRating / 2)}
                              maxStars={5}
                              size={18}
                              editable
                              onRate={(rating) => handleEpisodeRatingChange(ep.num, 'spouse', rating * 2)}
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
            onClick={() => handleSubmitRating(yourRating, spouseRating, episodes)}
            className="w-full mt-6 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium"
          >
            Save & Mark as Watched
          </button>
        </div>
      </div>
    );
  };

  const sortedToWatch = [...toWatch].sort((a, b) => calculateAvgPriority(b) - calculateAvgPriority(a));

  return (
    <div className="max-w-2xl mx-auto bg-gray-900 min-h-screen pb-20">
      <div className="bg-gradient-to-r from-blue-700 to-purple-700 text-white p-6 shadow-lg">
        <h1 className="text-2xl font-bold mb-1">Watch Together</h1>
        <p className="text-blue-200 text-sm">Track what to watch and rate what you've seen</p>
        
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setCurrentUser('you')}
            className={`px-4 py-2 rounded ${currentUser === 'you' ? 'bg-white text-blue-600' : 'bg-blue-800 text-white'}`}
          >
            You
          </button>
          <button
            onClick={() => setCurrentUser('spouse')}
            className={`px-4 py-2 rounded ${currentUser === 'spouse' ? 'bg-white text-purple-600' : 'bg-purple-800 text-white'}`}
          >
            Spouse
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
            {sortedToWatch.map(item => (
              <ToWatchCard key={item.id} item={item} />
            ))}
          </>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-gray-400">Your watch history</p>
            </div>
            {watched.map(item => (
              <WatchedCard key={item.id} item={item} />
            ))}
          </>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Add to Watch List</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-200">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Title</label>
                <input
                  type="text"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-700 text-white"
                  placeholder="Enter show or movie name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Type</label>
                <select
                  value={newItem.type}
                  onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
                  className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-700 text-white"
                >
                  <option>TV Show</option>
                  <option>Movie</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Streaming Service</label>
                <select
                  value={newItem.service}
                  onChange={(e) => setNewItem({ ...newItem, service: e.target.value })}
                  className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-700 text-white"
                >
                  {services.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Your Priority</label>
                <StarRating
                  rating={newItem.yourPriority}
                  editable
                  onRate={(rating) => setNewItem({ ...newItem, yourPriority: rating })}
                  size={28}
                />
              </div>
            </div>

            <button
              onClick={handleAddItem}
              disabled={!newItem.title.trim()}
              className="w-full mt-6 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-600"
            >
              Add to List
            </button>
          </div>
        </div>
      )}

      {showRatingModal && <RatingModal />}
    </div>
  );
};

export default WatchVoteApp;
