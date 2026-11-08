import React from 'react';
import { Ban, ChevronRight } from 'lucide-react';
import { PRIORITY_LABELS } from '../common/PriorityRating';
import { averageRating, priorityField, ratingField, userName } from '../../users';
import { daysUntil, isMovie } from '../../titles';
import useNextEpisode from '../../useNextEpisode';

const PRIORITY_CHIP = {
  0: 'bg-gray-700 text-gray-200',
  1: 'bg-blue-900 text-blue-100',
  2: 'bg-yellow-400 text-gray-900',
  3: 'bg-red-700 text-white'
};

const otherUser = (key) => (key === 'user1' ? 'user2' : 'user1');

function metaLine(item, mode, next, ourServices) {
  const parts = [item.service, isMovie(item) ? 'Movie' : 'TV'];
  if (mode === 'toWatch' && ourServices?.length && !ourServices.includes(item.service)) parts.push('not on yours');
  if (mode === 'toWatch') {
    const days = daysUntil(item.releaseDate);
    if (days > 0) parts.push(days === 1 ? 'out tomorrow' : `out in ${days} days`);
    else if (next?.status === 'next') parts.push(`next S${next.season} E${next.num}`);
    else if (next?.status === 'done') parts.push('caught up');
  } else {
    if (item.status === 'In progress') parts.push('in progress');
    if (item.watchedDate) parts.push(item.watchedDate);
  }
  return parts.filter(Boolean).join(' · ');
}

// One compact, tappable row. Opens the detail sheet; all actions live there.
const TitleRow = ({ item, mode, currentUser, settings, watchedEpisodes, highlighted, onOpen }) => {
  const ourServices = settings.services || [];
  const next = useNextEpisode(item, watchedEpisodes, mode === 'toWatch' && !isMovie(item));
  const partner = otherUser(currentUser);
  const isDNF = item.status === 'DNF';

  let right;
  if (mode === 'toWatch') {
    const mine = item[priorityField(currentUser)] || 0;
    const theirs = item[priorityField(partner)] || 0;
    right = (
      <div className="flex flex-col items-end gap-1 text-xs shrink-0">
        <span className={`px-2 py-0.5 rounded-full font-semibold ${PRIORITY_CHIP[mine]}`}>You: {PRIORITY_LABELS[mine]}</span>
        <span className="text-gray-200">{userName(settings, partner)}: {PRIORITY_LABELS[theirs]}</span>
      </div>
    );
  } else if (isDNF) {
    right = (
      <span className="flex items-center gap-1 text-xs font-bold text-red-200 shrink-0">
        <Ban size={14} aria-hidden="true" /> Abandoned
      </span>
    );
  } else {
    const avg = averageRating(item.anthonyRating, item.pamRating);
    const mine = item[ratingField(currentUser)] || 0;
    const theirs = item[ratingField(partner)] || 0;
    right = (
      <div className="flex flex-col items-end shrink-0">
        <span className="text-lg font-bold text-green-300 tabular-nums leading-tight">{avg ? avg.toFixed(1) : '–'}</span>
        <span className="text-xs text-gray-200 tabular-nums">You {mine || '–'} · {userName(settings, partner)} {theirs || '–'}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      id={`row-${item.id}`}
      onClick={() => onOpen(item)}
      className={`w-full text-left flex items-center gap-3 p-1.5 pr-2 rounded-xl bg-gray-800 hover:bg-gray-700 border transition ${highlighted ? 'border-yellow-400 ring-2 ring-yellow-400' : 'border-gray-700'}`}
    >
      {item.posterPath
        ? <img src={item.posterPath} alt="" loading="lazy" className={`w-10 h-[60px] object-cover rounded-md shrink-0 bg-gray-700 ${isDNF ? 'grayscale' : ''}`} />
        : <div aria-hidden="true" className="w-10 h-[60px] rounded-md shrink-0 bg-gray-700" />}
      <span className="flex-1 min-w-0">
        <span className="font-semibold text-white leading-snug line-clamp-1">{item.title}</span>
        <span className="block text-xs text-gray-200 mt-0.5 truncate">{metaLine(item, mode, next, ourServices)}</span>
        {item.isNewEpisodes && (
          <span className="inline-block mt-1 text-[11px] font-bold bg-green-700 text-white px-1.5 py-0.5 rounded">New episodes</span>
        )}
      </span>
      {right}
      <ChevronRight size={18} aria-hidden="true" className="text-gray-400 shrink-0 -mr-1" />
    </button>
  );
};

export default TitleRow;
