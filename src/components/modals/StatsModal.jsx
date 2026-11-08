import React from 'react';
import { Trophy, Frown, Film } from 'lucide-react';
import Modal from '../common/Modal';
import { DEFAULT_SETTINGS, userColor, userName } from '../../users';

function calculateStats(watched) {
  if (!watched || watched.length === 0) return null;
  const finished = watched.filter((i) => i.status !== 'DNF');
  const stat = (field) => {
    const rated = finished.map((i) => i[field] || 0).filter((r) => r > 0);
    return {
      avg: rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : 0,
      low: rated.filter((r) => r <= 4).length
    };
  };
  return {
    user1: stat('anthonyRating'),
    user2: stat('pamRating'),
    finished: finished.length,
    abandoned: watched.length - finished.length
  };
}

const StatsModal = ({ watched, settings = DEFAULT_SETTINGS, onClose }) => {
  const name1 = userName(settings, 'user1');
  const name2 = userName(settings, 'user2');
  const stats = calculateStats(watched);
  const winner = (a, b) => (a > b ? name1 : b > a ? name2 : 'Tie');

  return (
    <Modal title="Couple stats" onClose={onClose} maxWidth="max-w-lg">
      {!stats ? (
        <div className="text-center py-8 text-gray-200">
          <Film size={48} aria-hidden="true" className="mx-auto mb-3 opacity-40" />
          <p>Watch some shows to see your stats.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-4 bg-gray-700 p-4 rounded-lg text-center">
            {['user1', 'user2'].map((key) => (
              <div key={key}>
                <dd className="text-3xl font-bold text-white tabular-nums">{stats[key].avg.toFixed(1)}</dd>
                <dt className="text-xs text-gray-200 uppercase tracking-wider mt-1 flex items-center justify-center gap-1">
                  <span aria-hidden="true" className="w-2 h-2 rounded-full" style={{ backgroundColor: userColor(settings, key) }} />
                  {userName(settings, key)}'s average
                </dt>
              </div>
            ))}
          </dl>

          <div className="flex items-center justify-between bg-gray-900 p-3 rounded-lg border border-gray-700">
            <span className="flex items-center gap-2 text-yellow-300 font-bold"><Trophy size={18} aria-hidden="true" /> The nicest</span>
            <span className="text-white font-medium">{winner(stats.user1.avg, stats.user2.avg)}</span>
          </div>
          <div className="flex items-center justify-between bg-gray-900 p-3 rounded-lg border border-gray-700">
            <span className="flex items-center gap-2 text-red-300 font-bold"><Frown size={18} aria-hidden="true" /> The critic <span className="text-xs font-normal text-gray-200">(ratings ≤ 4)</span></span>
            <span className="text-white font-medium">{winner(stats.user1.low, stats.user2.low)}</span>
          </div>

          <dl className="flex justify-between text-sm text-gray-200 pt-3 border-t border-gray-700">
            <div><dt className="inline">Finished: </dt><dd className="inline font-bold text-white">{stats.finished}</dd></div>
            <div><dt className="inline">Abandoned: </dt><dd className="inline font-bold text-white">{stats.abandoned}</dd></div>
          </dl>
        </div>
      )}
    </Modal>
  );
};

export default StatsModal;
