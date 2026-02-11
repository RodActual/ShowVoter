import React from 'react';
import { X, Trophy, TrendingUp, Frown, Film } from 'lucide-react';

const StatsModal = ({ watched, onClose }) => {
  const calculateStats = () => {
    if (!watched || watched.length === 0) return null;

    let anthonyTotal = 0, pamTotal = 0;
    let anthonyCount = 0, pamCount = 0;
    let anthonyLow = 0, pamLow = 0;
    let totalItems = watched.length;
    let dnfCount = watched.filter(i => i.status === 'DNF').length;

    watched.forEach(item => {
      // Don't count DNF in averages
      if (item.status === 'DNF') return;

      if (item.anthonyRating > 0) {
        anthonyTotal += item.anthonyRating;
        anthonyCount++;
        if (item.anthonyRating <= 4) anthonyLow++;
      }
      if (item.pamRating > 0) {
        pamTotal += item.pamRating;
        pamCount++;
        if (item.pamRating <= 4) pamLow++;
      }
    });

    return {
      anthonyAvg: anthonyCount ? (anthonyTotal / anthonyCount).toFixed(1) : "0.0",
      pamAvg: pamCount ? (pamTotal / pamCount).toFixed(1) : "0.0",
      anthonyCritic: anthonyLow,
      pamCritic: pamLow,
      totalItems,
      dnfCount
    };
  };

  const stats = calculateStats();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full border border-gray-700 relative shadow-xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X size={24} />
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <TrendingUp className="text-blue-400" /> Couple Stats
        </h2>

        {!stats ? (
          <div className="text-center py-8 text-gray-400">
            <Film size={48} className="mx-auto mb-3 opacity-20" />
            <p>Watch some shows to see your stats!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Averages */}
            <div className="grid grid-cols-2 gap-4 bg-gray-700 p-4 rounded-lg">
              <div className="text-center border-r border-gray-600">
                <div className="text-3xl font-bold text-blue-400">{stats.anthonyAvg}</div>
                <div className="text-xs text-gray-300 uppercase tracking-wider mt-1">Ant's Avg</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-pink-400">{stats.pamAvg}</div>
                <div className="text-xs text-gray-300 uppercase tracking-wider mt-1">Pam's Avg</div>
              </div>
            </div>

            {/* Fun Badges */}
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-gray-900 p-3 rounded border border-gray-700">
                <div className="flex items-center gap-2 text-yellow-400">
                  <Trophy size={18} /> <span className="font-bold">The Nicest</span>
                </div>
                <span className="text-white font-medium">
                  {parseFloat(stats.anthonyAvg) > parseFloat(stats.pamAvg) ? 'Anthony' : parseFloat(stats.anthonyAvg) < parseFloat(stats.pamAvg) ? 'Pam' : 'Tie!'}
                </span>
              </div>
              
              <div className="flex items-center justify-between bg-gray-900 p-3 rounded border border-gray-700">
                <div className="flex items-center gap-2 text-red-400">
                  <Frown size={18} /> <span className="font-bold">The Critic</span>
                </div>
                <div className="text-sm text-gray-400 text-right">
                  <span className="block text-white font-medium">
                    {stats.anthonyCritic > stats.pamCritic ? 'Anthony' : stats.pamCritic > stats.anthonyCritic ? 'Pam' : 'Tie!'}
                  </span>
                  <span className="text-xs opacity-75">
                    (Ratings ≤ 4)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-between text-xs text-gray-500 pt-4 border-t border-gray-700">
              <span>Total Watched: <strong className="text-gray-300">{stats.totalItems}</strong></span>
              <span>Abandoned: <strong className="text-gray-300">{stats.dnfCount}</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsModal;