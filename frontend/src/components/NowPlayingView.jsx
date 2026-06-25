import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown, Pause, Play, SkipBack, SkipForward, Volume2, Heart, Share2,
} from 'lucide-react';
import SongVisualizer from './SongVisualizer';
import TourDatesPanel from './TourDatesPanel';
import { API_URL } from '../config';

const NowPlayingView = ({
  open,
  onClose,
  currentSong,
  isPlaying,
  togglePlay,
  nextSong,
  prevSong,
  volume,
  setVolume,
  currentTime,
  duration,
  audioRef,
  onOpenArtist,
  onShare,
  onToggleLike,
  isLiked,
}) => {
  const [visualizerMode, setVisualizerMode] = useState('pulsar');
  const [artistTourDates, setArtistTourDates] = useState([]);
  const [tourLoading, setTourLoading] = useState(false);

  const collaborators = useMemo(
    () => (currentSong?.collaborators || []).filter((c) => c?.userId?.username || c?.name),
    [currentSong?.collaborators]
  );

  useEffect(() => {
    if (!open || !currentSong?.artist?._id) {
      setArtistTourDates([]);
      return undefined;
    }

    let cancelled = false;
    const loadTourDates = async () => {
      setTourLoading(true);
      try {
        const res = await fetch(`${API_URL}/users/${currentSong.artist._id}/tour-dates`);
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) setArtistTourDates(data.tourDates || []);
      } catch (_) {
        if (!cancelled) setArtistTourDates([]);
      } finally {
        if (!cancelled) setTourLoading(false);
      }
    };

    loadTourDates();
    return () => { cancelled = true; };
  }, [open, currentSong?.artist?._id]);

  const formatTime = (time) => {
    if (!time || Number.isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleSeek = (e) => {
    if (!audioRef?.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = percent * duration;
  };

  if (!open || !currentSong) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-[#050505] flex flex-col animate-in fade-in duration-300">
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: currentSong.coverUrl ? `url(${currentSong.coverUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(80px) saturate(1.4)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/70 to-black pointer-events-none" />

      <div className="relative flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-4 md:px-8 pt-4 md:pt-6 pb-2 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-xs font-black uppercase tracking-[0.25em] transition-all"
          >
            <ChevronDown size={18} />
            Minimizar
          </button>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-yellow-400/70">Now Playing</p>
          <div className="w-20" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-10 pb-36 md:pb-28">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-6 lg:gap-10 items-start">
            <div className="space-y-5">
              <div className="relative aspect-square max-w-[420px] mx-auto lg:mx-0 w-full rounded-[32px] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.6)] border border-white/10">
                {currentSong.coverUrl ? (
                  <img src={currentSong.coverUrl} alt={currentSong.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-yellow-500/30 to-black" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>

              <div className="text-center lg:text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-yellow-400/80 mb-2">En reproducción</p>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none mb-3">{currentSong.title}</h1>
                <div className="text-sm md:text-base text-gray-300 font-bold">
                  <button
                    type="button"
                    onClick={() => currentSong.artist?._id && onOpenArtist(currentSong.artist._id)}
                    className="hover:text-yellow-300 transition-colors"
                  >
                    {currentSong.artist?.username || 'Artista'}
                  </button>
                  {collaborators.map((collaborator, index) => {
                    const name = collaborator?.userId?.username || collaborator?.name;
                    const id = collaborator?.userId?._id || collaborator?.userId;
                    return (
                      <span key={`np-collab-${index}`}>
                        {', '}
                        {id ? (
                          <button type="button" onClick={() => onOpenArtist(id)} className="hover:text-yellow-300 transition-colors">
                            {name}
                          </button>
                        ) : name}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-14 h-14 bg-yellow-400 text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-yellow-400/25"
                >
                  {isPlaying ? <Pause fill="black" size={26} /> : <Play fill="black" size={26} className="ml-1" />}
                </button>
                <button
                  type="button"
                  onClick={() => onToggleLike?.(currentSong._id)}
                  className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all ${isLiked ? 'border-yellow-400 bg-yellow-400/15 text-yellow-300' : 'border-white/15 text-gray-400 hover:text-white'}`}
                >
                  <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
                </button>
                <button
                  type="button"
                  onClick={() => onShare?.(currentSong)}
                  className="w-11 h-11 rounded-full border border-white/15 text-gray-400 hover:text-white flex items-center justify-center transition-all"
                >
                  <Share2 size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-5 min-h-[320px]">
              <div className="h-[280px] md:h-[340px]">
                <SongVisualizer
                  audioRef={audioRef}
                  isPlaying={isPlaying}
                  mode={visualizerMode}
                  setMode={setVisualizerMode}
                />
              </div>

              {!tourLoading && artistTourDates.length > 0 && (
                <TourDatesPanel tourDates={artistTourDates} compact />
              )}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 inset-x-0 px-4 md:px-10 pb-4 md:pb-6 pt-4 bg-gradient-to-t from-black via-black/95 to-transparent">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-6 md:gap-10 mb-4">
              <button type="button" onClick={prevSong} className="text-gray-500 hover:text-white transition hover:scale-110">
                <SkipBack size={22} />
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-all"
              >
                {isPlaying ? <Pause fill="black" size={22} /> : <Play fill="black" size={22} className="ml-0.5" />}
              </button>
              <button type="button" onClick={nextSong} className="text-gray-500 hover:text-white transition hover:scale-110">
                <SkipForward size={22} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] text-gray-500 font-black w-10 text-right">{formatTime(currentTime)}</span>
              <div
                className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden cursor-pointer hover:h-2 transition-all"
                onClick={handleSeek}
                role="presentation"
              >
                <div
                  className="h-full bg-yellow-400 shadow-[0_0_12px_#facc15] rounded-full"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-500 font-black w-10">{formatTime(duration)}</span>
              <div className="hidden md:flex items-center gap-2 ml-2">
                <Volume2 size={16} className="text-gray-500" />
                <div
                  className="w-20 h-1 bg-white/10 rounded-full cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percent = (e.clientX - rect.left) / rect.width;
                    setVolume(Math.max(0, Math.min(1, percent)));
                  }}
                  role="presentation"
                >
                  <div className="h-full bg-white rounded-full" style={{ width: `${volume * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NowPlayingView;
