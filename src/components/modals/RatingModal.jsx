// src/components/modals/RatingModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Ban } from 'lucide-react';
import Modal from '../common/Modal';
import RatingPicker, { RatingSelect } from '../common/RatingPicker';
import tmdbService from '../../services/tmdbService';
import { ratingField, userName } from '../../users';
import { isMovie, localDateString, sameTitle } from '../../titles';

// Rates a title as the signed-in user only; the partner rates later on their own device.
const RatingModal = ({ item, currentUser, settings, watchedHistory, onClose, onSubmit }) => {
  const [myRating, setMyRating] = useState(0);
  const [numEpisodes, setNumEpisodes] = useState(0);
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [expandedSeason, setExpandedSeason] = useState(null);
  const [isDNF, setIsDNF] = useState(false);
  const [saving, setSaving] = useState(false);
  const myField = ratingField(currentUser);
  const partner = currentUser === 'user1' ? 'user2' : 'user1';
  const tv = !isMovie(item);
  // Read history through a ref so live updates don't reload the list and wipe your selections.
  const historyRef = useRef(watchedHistory);
  historyRef.current = watchedHistory;

  useEffect(() => {
    if (!tv || !item.tmdbId) return;
    let cancelled = false;
    (async () => {
      setLoadingEpisodes(true);
      setLoadError(false);
      try {
        const details = await tmdbService.getDetails(item.tmdbId, 'tv');
        if (!details) throw new Error('details unavailable');
        const totalSeasons = details.numberOfSeasons || 1;
        const existingShow = historyRef.current.find((w) => sameTitle(w, item));
        const watchedSet = new Set((existingShow?.episodes || []).map((ep) => `${ep.season}-${ep.num}`));

        const seasonNumbers = Array.from({ length: totalSeasons }, (_, i) => i + 1);
        const seasons = await Promise.all(seasonNumbers.map((n) => tmdbService.getSeasonDetails(item.tmdbId, n)));
        const today = localDateString();

        const all = seasons.flatMap((seasonData, idx) => (seasonData?.episodes || [])
          // Only aired episodes you haven't logged yet.
          .filter((ep) => !watchedSet.has(`${seasonNumbers[idx]}-${ep.num}`) && ep.airDate && ep.airDate <= today)
          .map((ep) => ({ season: seasonNumbers[idx], num: ep.num, title: ep.title || `Episode ${ep.num}`, isSelected: true })));

        if (cancelled) return;
        setEpisodes(all);
        setExpandedSeason(all[0]?.season ?? null);
      } catch {
        if (!cancelled) setLoadError(true);
      }
      if (!cancelled) setLoadingEpisodes(false);
    })();
    return () => { cancelled = true; };
  }, [item, tv]);

  const addEpisodesManually = () => {
    setEpisodes(Array.from({ length: numEpisodes }, (_, i) => ({ season: 1, num: i + 1, title: `Episode ${i + 1}`, isSelected: true })));
    setExpandedSeason(1);
  };

  const updateEpisode = (ep, changes) => setEpisodes((prev) => prev.map((e) => (e.season === ep.season && e.num === ep.num ? { ...e, ...changes } : e)));
  const setSeasonSelected = (season, isSelected) => setEpisodes((prev) => prev.map((e) => (e.season === season ? { ...e, isSelected } : e)));
  const setAllSelected = (isSelected) => setEpisodes((prev) => prev.map((e) => ({ ...e, isSelected })));

  const episodesBySeason = episodes.reduce((acc, ep) => {
    (acc[ep.season] ||= []).push(ep);
    return acc;
  }, {});
  const selectedCount = episodes.filter((e) => e.isSelected).length;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSubmit(myRating, episodes, isDNF);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Rate: ${item.title}`} onClose={onClose}>
      <div className="space-y-4">
        <fieldset disabled={isDNF} className={`bg-gray-700 p-4 rounded-lg ${isDNF ? 'opacity-50' : ''}`}>
          <legend className="sr-only">Your overall rating</legend>
          <div className="flex justify-between items-baseline mb-3">
            <h3 className="font-semibold text-white">Your rating ({userName(settings, currentUser)})</h3>
            <span className="text-sm text-gray-200 tabular-nums">{myRating ? `${myRating}/10` : 'Not rated'}</span>
          </div>
          <RatingPicker label="Your overall rating" value={myRating} onChange={setMyRating} />
          <p className="text-xs text-gray-200 mt-3">
            {userName(settings, partner)} adds theirs on their own device.
            {tv && ' Leave this empty to use the average of your episode ratings.'}
          </p>
        </fieldset>

        {tv && (
          <fieldset disabled={isDNF} className={`bg-gray-900 p-4 rounded-lg border border-gray-700 ${isDNF ? 'opacity-50' : ''}`}>
            <legend className="sr-only">Episodes watched</legend>
            <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
              <h3 className="font-semibold text-white">Episodes watched ({selectedCount})</h3>
              {episodes.length > 0 && (
                <div className="flex gap-1 text-sm">
                  <button type="button" onClick={() => setAllSelected(true)} className="text-blue-300 underline min-h-11 px-2">All</button>
                  <button type="button" onClick={() => setAllSelected(false)} className="text-blue-300 underline min-h-11 px-2">None</button>
                </div>
              )}
            </div>

            {loadingEpisodes ? (
              <p className="text-center text-gray-200 py-4" role="status">Loading episodes…</p>
            ) : episodes.length === 0 ? (
              <div>
                <p className="text-sm text-gray-200 mb-3">
                  {loadError ? "Couldn't load episodes from TMDB." : 'No new aired episodes found.'}
                </p>
                <div className="flex gap-2 items-center flex-wrap">
                  <label htmlFor="manual-episodes" className="text-sm text-gray-200">Add episodes manually:</label>
                  <input
                    id="manual-episodes"
                    type="number"
                    min="0"
                    max="50"
                    inputMode="numeric"
                    value={numEpisodes}
                    onChange={(e) => setNumEpisodes(Math.min(50, parseInt(e.target.value, 10) || 0))}
                    className="border border-gray-500 rounded-lg px-3 min-h-11 w-20 bg-gray-700 text-white"
                  />
                  <button type="button" onClick={addEpisodesManually} className="bg-blue-600 text-white px-4 min-h-11 rounded-lg hover:bg-blue-700">Add</button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.keys(episodesBySeason).map((seasonKey) => {
                  const season = Number(seasonKey);
                  const list = episodesBySeason[seasonKey];
                  const allSelected = list.every((ep) => ep.isSelected);
                  const open = expandedSeason === season;
                  return (
                    <div key={season} className="border border-gray-600 rounded-lg overflow-hidden">
                      <div className="flex items-center bg-gray-700">
                        <label className="flex items-center gap-3 px-3 min-h-11 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={() => setSeasonSelected(season, !allSelected)}
                            className="w-5 h-5 accent-blue-500"
                          />
                          <span className="sr-only">Select all of season {season}</span>
                        </label>
                        <button
                          type="button"
                          aria-expanded={open}
                          onClick={() => setExpandedSeason(open ? null : season)}
                          className="flex-1 flex justify-between items-center min-h-11 pr-3 font-bold text-white text-left"
                        >
                          Season {season}
                          {open ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                        </button>
                      </div>
                      {open && (
                        <ul className="p-2 space-y-2 bg-gray-800">
                          {list.map((ep) => (
                            <li key={`${ep.season}-${ep.num}`} className={`p-2 rounded-lg flex items-center gap-2 ${ep.isSelected ? 'bg-gray-700' : 'bg-gray-800'}`}>
                              <label className="flex items-center gap-3 flex-1 min-w-0 min-h-11 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={ep.isSelected}
                                  onChange={() => updateEpisode(ep, { isSelected: !ep.isSelected })}
                                  className="w-5 h-5 accent-blue-500 shrink-0"
                                />
                                <span className="text-white truncate">E{ep.num}: {ep.title}</span>
                              </label>
                              {ep.isSelected && (
                                <RatingSelect
                                  label={`Your rating for season ${ep.season} episode ${ep.num}`}
                                  value={ep[myField] || 0}
                                  onChange={(value) => updateEpisode(ep, { [myField]: value })}
                                />
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </fieldset>
        )}

        <label className="p-3 bg-red-900/30 border border-red-800 rounded-lg flex items-center gap-3 cursor-pointer min-h-11">
          <input type="checkbox" checked={isDNF} onChange={(e) => setIsDNF(e.target.checked)} className="w-5 h-5 accent-red-500" />
          <span className="flex-1">
            <span className="flex items-center gap-2 text-white font-medium">
              <Ban size={16} aria-hidden="true" className="text-red-300" /> We abandoned this (DNF)
            </span>
            <span className="text-xs text-gray-200">Moves to history, marked as unfinished.</span>
          </span>
        </label>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`w-full min-h-12 rounded-lg font-semibold text-white disabled:opacity-60 ${isDNF ? 'bg-red-700 hover:bg-red-800' : 'bg-green-700 hover:bg-green-800'}`}
        >
          {saving ? 'Saving…' : isDNF ? 'Save as abandoned' : 'Save & mark as watched'}
        </button>
      </div>
    </Modal>
  );
};

export default RatingModal;
