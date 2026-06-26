import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, ChevronDown, Download, Heart, MoreHorizontal, Pause, Play,
  Share2, SkipBack, SkipForward, Volume2,
} from 'lucide-react';
import SongVisualizer from './SongVisualizer';
import TourDatesPanel from './TourDatesPanel';
import { API_URL } from '../config';

const LYRIC_TS_REGEX = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

const formatLyricLines = (lyrics = '') => String(lyrics || '')
  .split('\n')
  .map((line) => line.replace(LYRIC_TS_REGEX, '').trim())
  .filter(Boolean);

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

  const artistNames = useMemo(() => [
    currentSong?.artist?.username,
    ...collaborators.map((collaborator) => collaborator?.userId?.username || collaborator?.name),
  ].filter(Boolean), [currentSong?.artist?.username, collaborators]);

  const allLyricLines = useMemo(() => formatLyricLines(currentSong?.lyrics), [currentSong?.lyrics]);
  const lyricLines = useMemo(() => allLyricLines.slice(0, 12), [allLyricLines]);

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

  const year = currentSong.createdAt ? new Date(currentSong.createdAt).getFullYear() : new Date().getFullYear();
  const playCount = Number(currentSong.playCount || 0).toLocaleString('es-ES');

  return (
    <div className="fixed inset-0 z-[90] bg-black text-white animate-in fade-in duration-300">
      <div className="absolute inset-x-0 top-0 h-1 bg-yellow-400" />

      <div className="relative h-full grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-2 p-2 pb-28 md:pb-24">
        <main className="min-h-0 overflow-y-auto rounded-lg bg-[#121212]">
          <section className="relative overflow-hidden px-6 md:px-10 pt-8 pb-10 bg-gradient-to-b from-yellow-900/70 via-[#351708] to-[#121212]">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-5 top-5 w-10 h-10 rounded-full bg-black/35 hover:bg-black/55 flex items-center justify-center text-white/80 transition-all"
              aria-label="Minimizar"
            >
              <ChevronDown size={22} />
            </button>

            <div className="flex flex-col md:flex-row items-start md:items-end gap-6 md:gap-8 pr-10">
              <div className="w-44 h-44 md:w-56 md:h-56 rounded shadow-[0_24px_70px_rgba(0,0,0,0.45)] overflow-hidden bg-black/30 flex-shrink-0">
                {currentSong.coverUrl ? (
                  <img src={currentSong.coverUrl} alt={currentSong.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-yellow-500/40 to-black" />
                )}
              </div>

              <div className="min-w-0">
                <p className="text-sm font-black mb-4">Cancion</p>
                <h1 className="text-5xl md:text-7xl 2xl:text-8xl font-black tracking-tight leading-none break-words">
                  {currentSong.title}
                </h1>
                <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold text-white/75">
                  <button
                    type="button"
                    onClick={() => currentSong.artist?._id && onOpenArtist(currentSong.artist._id)}
                    className="text-white hover:underline"
                  >
                    {currentSong.artist?.username || 'Artista'}
                  </button>
                  {collaborators.map((collaborator, index) => {
                    const name = collaborator?.userId?.username || collaborator?.name;
                    const id = collaborator?.userId?._id || collaborator?.userId;
                    return (
                      <span key={`np-collab-${index}`} className="inline-flex items-center gap-2">
                        <span>•</span>
                        {id ? (
                          <button type="button" onClick={() => onOpenArtist(id)} className="text-white hover:underline">
                            {name}
                          </button>
                        ) : <span className="text-white">{name}</span>}
                      </span>
                    );
                  })}
                  <span>•</span>
                  <span>{year}</span>
                  <span>•</span>
                  <span>{formatTime(duration)}</span>
                  <span>•</span>
                  <span>{playCount}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="px-6 md:px-10 py-7">
            <div className="flex items-center gap-5 mb-7">
              <button
                type="button"
                onClick={togglePlay}
                className="w-14 h-14 rounded-full bg-green-500 text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? <Pause fill="black" size={26} /> : <Play fill="black" size={26} className="ml-1" />}
              </button>
              <button
                type="button"
                onClick={() => onToggleLike?.(currentSong._id)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isLiked ? 'text-green-400' : 'text-white/55 hover:text-white'}`}
                aria-label="Me gusta"
              >
                {isLiked ? <CheckCircle2 size={29} fill="currentColor" className="text-green-400" /> : <Heart size={25} />}
              </button>
              <button type="button" className="w-9 h-9 rounded-full flex items-center justify-center text-white/55 hover:text-white">
                <Download size={24} />
              </button>
              <button
                type="button"
                onClick={() => onShare?.(currentSong)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white/55 hover:text-white"
                aria-label="Compartir"
              >
                <Share2 size={23} />
              </button>
              <button type="button" className="w-9 h-9 rounded-full flex items-center justify-center text-white/55 hover:text-white">
                <MoreHorizontal size={26} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(280px,0.45fr)] gap-8 items-start">
              <div>
                <h2 className="text-2xl font-black mb-5">Letra</h2>
                {lyricLines.length ? (
                  <div className="space-y-1.5 text-[15px] md:text-base leading-snug text-white/70 font-bold">
                    {lyricLines.map((line, index) => (
                      <p key={`lyric-${index}`}>{line}</p>
                    ))}
                    {allLyricLines.length > lyricLines.length && (
                      <button type="button" className="pt-1 text-white font-black hover:underline">
                        ...Mostrar mas
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-white/45 text-sm font-bold">Esta cancion aun no tiene letra cargada.</p>
                )}
              </div>

              {!tourLoading && artistTourDates.length > 0 && (
                <TourDatesPanel tourDates={artistTourDates} compact />
              )}
            </div>
          </section>
        </main>

        <aside className="hidden xl:flex min-h-0 overflow-y-auto rounded-lg bg-[#181818] flex-col">
          <div className="p-4">
            <h2 className="text-base font-black mb-4 truncate">{currentSong.title}</h2>
            <div className="h-[470px] rounded-md overflow-hidden bg-black">
              <SongVisualizer
                audioRef={audioRef}
                isPlaying={isPlaying}
                visualizerUrl={currentSong.visualizerUrl}
                mode={visualizerMode}
                setMode={setVisualizerMode}
              />
            </div>
            <div className="mt-5 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-2xl font-black truncate">{currentSong.title}</h3>
                <p className="text-sm text-white/65 font-bold truncate">{artistNames.join(', ') || 'RTN Music'}</p>
              </div>
              <CheckCircle2 size={24} fill="currentColor" className={isLiked ? 'text-green-400 flex-shrink-0' : 'text-white/30 flex-shrink-0'} />
            </div>
          </div>
        </aside>
      </div>

      <footer className="absolute bottom-0 inset-x-0 h-24 bg-black border-t border-white/5 px-4 md:px-8 flex items-center gap-4">
        <div className="hidden md:flex items-center gap-3 w-64 min-w-0">
          <div className="w-14 h-14 rounded overflow-hidden bg-white/10 flex-shrink-0">
            {currentSong.coverUrl && <img src={currentSong.coverUrl} alt={currentSong.title} className="w-full h-full object-cover" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black truncate">{currentSong.title}</p>
            <p className="text-xs text-white/55 font-bold truncate">{artistNames.join(', ') || 'RTN Music'}</p>
          </div>
        </div>

        <div className="flex-1 max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-6 mb-3">
            <button type="button" onClick={prevSong} className="text-white/55 hover:text-white transition">
              <SkipBack size={20} />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="w-9 h-9 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-all"
            >
              {isPlaying ? <Pause fill="black" size={18} /> : <Play fill="black" size={18} className="ml-0.5" />}
            </button>
            <button type="button" onClick={nextSong} className="text-white/55 hover:text-white transition">
              <SkipForward size={20} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-white/75 font-medium w-10 text-right">{formatTime(currentTime)}</span>
            <div
              className="h-1 flex-1 bg-white/25 rounded-full overflow-hidden cursor-pointer group"
              onClick={handleSeek}
              role="presentation"
            >
              <div
                className="h-full bg-white group-hover:bg-green-500 rounded-full"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[11px] text-white/75 font-medium w-10">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="hidden md:flex items-center justify-end gap-2 w-64">
          <Volume2 size={17} className="text-white/60" />
          <div
            className="w-24 h-1 bg-white/25 rounded-full cursor-pointer"
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
      </footer>
    </div>
  );
};

export default NowPlayingView;
