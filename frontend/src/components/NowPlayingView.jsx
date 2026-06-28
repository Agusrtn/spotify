import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Download,
  ExternalLink,
  Heart,
  Info,
  Pause,
  Play,
  Share2,
  SkipBack,
  SkipForward,
  Volume2,
} from 'lucide-react';
import TourDatesPanel from './TourDatesPanel';
import { API_URL } from '../config';

const LYRIC_TS_REGEX = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

const formatLyricLines = (lyrics = '') => String(lyrics || '')
  .split('\n')
  .map((line) => line.replace(LYRIC_TS_REGEX, '').trim())
  .filter(Boolean);

const getArtistImage = (artist) => artist?.profilePic || artist?.avatarUrl || artist?.imageUrl || '';

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
  onOpenSong,
  onShare,
  onToggleLike,
  isLiked,
}) => {
  const [artistTourDates, setArtistTourDates] = useState([]);
  const [tourLoading, setTourLoading] = useState(false);
  const [showAllLyrics, setShowAllLyrics] = useState(false);

  const collaborators = useMemo(
    () => (currentSong?.collaborators || []).filter((collaborator) => {
      const userId = collaborator?.userId;
      return userId?._id || userId?.username || collaborator?.name;
    }),
    [currentSong?.collaborators]
  );

  const creditedArtists = useMemo(() => {
    const primaryArtist = currentSong?.artist ? [{
      id: currentSong.artist._id,
      name: currentSong.artist.username || 'Artista',
      image: getArtistImage(currentSong.artist),
      role: 'Artista',
      clickable: Boolean(currentSong.artist._id),
    }] : [];

    const collaboratorArtists = collaborators.map((collaborator) => {
      const user = collaborator?.userId && typeof collaborator.userId === 'object'
        ? collaborator.userId
        : null;

      return {
        id: user?._id,
        name: user?.username || collaborator?.name || 'Colaborador',
        image: getArtistImage(user),
        role: user?._id ? 'Colaborador' : 'Colaborador invitado',
        clickable: Boolean(user?._id),
      };
    });

    return [...primaryArtist, ...collaboratorArtists].filter((artist) => artist.name);
  }, [collaborators, currentSong?.artist]);

  const artistNames = creditedArtists.map((artist) => artist.name).join(', ');
  const allLyricLines = useMemo(() => formatLyricLines(currentSong?.lyrics), [currentSong?.lyrics]);
  const lyricLines = showAllLyrics ? allLyricLines : allLyricLines.slice(0, 14);
  const hasVisualizerVideo = Boolean(currentSong?.visualizerUrl);
  const mediaPoster = currentSong?.coverUrl || '';

  useEffect(() => {
    setShowAllLyrics(false);
  }, [currentSong?._id]);

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

  const handleSeek = (event) => {
    if (!audioRef?.current || !duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = percent * duration;
  };

  const handleVolume = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    setVolume(percent);
  };

  const openAudio = () => {
    if (currentSong?.audioUrl) window.open(currentSong.audioUrl, '_blank', 'noopener,noreferrer');
  };

  if (!open || !currentSong) return null;

  const year = currentSong.createdAt ? new Date(currentSong.createdAt).getFullYear() : new Date().getFullYear();
  const playCount = Number(currentSong.playCount || 0).toLocaleString('es-ES');

  return (
    <div className="fixed inset-0 z-[90] bg-[#080808] text-white animate-in fade-in duration-300">
      <div className="absolute inset-x-0 top-0 h-1 bg-yellow-400" />

      <div className="h-full overflow-y-auto pb-32 lg:pb-28 pt-0">
        <div className="mx-auto grid w-full max-w-[1680px] grid-cols-1 gap-4 px-4 pt-4 md:px-6 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_460px]">
          <main className="min-w-0 overflow-hidden rounded-lg bg-[#121212]">
            <section className="relative bg-gradient-to-b from-yellow-900/60 via-[#2a1508] to-[#121212] px-5 pb-7 pt-12 md:px-8 lg:px-10">
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white/80 transition hover:bg-black/70 hover:text-white"
                aria-label="Minimizar vista"
                title="Minimizar"
              >
                <ChevronDown size={22} />
              </button>

              <div className="grid grid-cols-1 items-end gap-6 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)]">
                <div className="aspect-square w-full max-w-[260px] overflow-hidden rounded-lg bg-black shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
                  {mediaPoster ? (
                    <img src={mediaPoster} alt={currentSong.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-yellow-400/45 via-zinc-800 to-black" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-white/65">Cancion</p>
                  <h1 className="max-w-full break-words text-4xl font-black leading-none sm:text-5xl md:text-6xl xl:text-7xl">
                    {currentSong.title}
                  </h1>
                  <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold text-white/75">
                    <span className="text-white">{artistNames || 'RTN Music'}</span>
                    <span>•</span>
                    <span>{year}</span>
                    <span>•</span>
                    <span>{formatTime(duration)}</span>
                    <span>•</span>
                    <span>{playCount} reproducciones</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 px-5 py-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-10">
              <div className="min-w-0">
                <div className="mb-7 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-400 text-black transition hover:scale-105 active:scale-95"
                    aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                    title={isPlaying ? 'Pausar' : 'Reproducir'}
                  >
                    {isPlaying ? <Pause fill="black" size={25} /> : <Play fill="black" size={25} className="ml-1" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleLike?.(currentSong._id)}
                    className={`flex h-11 w-11 items-center justify-center rounded-full border transition ${isLiked ? 'border-green-400/40 bg-green-400/10 text-green-400' : 'border-white/10 bg-white/5 text-white/70 hover:text-white'}`}
                    aria-label={isLiked ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                    title={isLiked ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                  >
                    {isLiked ? <CheckCircle2 size={25} fill="currentColor" /> : <Heart size={23} />}
                  </button>

                  <button
                    type="button"
                    onClick={openAudio}
                    disabled={!currentSong.audioUrl}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="Abrir audio"
                    title="Abrir audio"
                  >
                    <Download size={22} />
                  </button>

                  <button
                    type="button"
                    onClick={() => onShare?.(currentSong)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:text-white"
                    aria-label="Compartir"
                    title="Compartir"
                  >
                    <Share2 size={21} />
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenSong?.(currentSong)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:text-white"
                    aria-label="Ver detalles"
                    title="Ver detalles"
                  >
                    <Info size={22} />
                  </button>
                </div>

                <div>
                  <h2 className="mb-4 text-2xl font-black">Letra</h2>
                  {lyricLines.length ? (
                    <div className="space-y-2 text-base font-bold leading-relaxed text-white/72 md:text-lg">
                      {lyricLines.map((line, index) => (
                        <p key={`lyric-${index}`} className="break-words">{line}</p>
                      ))}
                      {allLyricLines.length > 14 && (
                        <button
                          type="button"
                          onClick={() => setShowAllLyrics((prev) => !prev)}
                          className="pt-2 text-sm font-black uppercase tracking-wide text-yellow-300 hover:text-yellow-200"
                        >
                          {showAllLyrics ? 'Mostrar menos' : 'Mostrar letra completa'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-white/45">Esta cancion aun no tiene letra cargada.</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-white/10 bg-black/25 p-4">
                  <h2 className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-white/55">Creditos</h2>
                  <div className="space-y-3">
                    {creditedArtists.map((artist, index) => (
                      <button
                        key={`${artist.role}-${artist.id || artist.name}-${index}`}
                        type="button"
                        onClick={() => artist.clickable && onOpenArtist?.(artist.id)}
                        disabled={!artist.clickable}
                        className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition enabled:hover:bg-white/10 disabled:cursor-default"
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-sm font-black uppercase text-white/60">
                          {artist.image ? (
                            <img src={artist.image} alt={artist.name} className="h-full w-full object-cover" />
                          ) : artist.name.slice(0, 1)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black text-white">{artist.name}</span>
                          <span className="block truncate text-xs font-bold text-white/45">{artist.role}</span>
                        </span>
                        {artist.clickable && <ExternalLink size={15} className="shrink-0 text-white/35" />}
                      </button>
                    ))}
                  </div>
                </div>

                {!tourLoading && artistTourDates.length > 0 && (
                  <TourDatesPanel tourDates={artistTourDates} compact />
                )}
              </div>
            </section>
          </main>

<aside className="min-w-0 overflow-visible rounded-lg bg-[#181818] pt-0 px-4 pb-4 lg:sticky lg:top-0 lg:max-h-[calc(100vh-8rem)]">
            <div className="aspect-[4/5] w-full overflow-hidden rounded-lg bg-black md:aspect-video lg:aspect-[4/5] relative">
              {hasVisualizerVideo ? (
                <video
                  src={currentSong.visualizerUrl}
                  poster={mediaPoster}
                  className="h-full w-full object-contain bg-black"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : mediaPoster ? (
                <img src={mediaPoster} alt={currentSong.title} className="h-full w-full object-contain bg-black" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-yellow-400/35 via-zinc-900 to-black" />
              )}
            </div>

            <div className="mt-5">
              <h2 className="truncate text-2xl font-black">{currentSong.title}</h2>
              <p className="mt-1 truncate text-sm font-bold text-white/55">{artistNames || 'RTN Music'}</p>
            </div>
          </aside>
        </div>
      </div>

      <footer className="fixed bottom-0 inset-x-0 border-t border-white/10 bg-black/95 px-4 py-3 backdrop-blur md:px-8">
        <div className="mx-auto grid max-w-[1680px] grid-cols-1 items-center gap-3 md:grid-cols-[260px_minmax(0,1fr)_190px]">
          <div className="hidden min-w-0 items-center gap-3 md:flex">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-white/10">
              {mediaPoster && <img src={mediaPoster} alt={currentSong.title} className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black">{currentSong.title}</p>
              <p className="truncate text-xs font-bold text-white/55">{artistNames || 'RTN Music'}</p>
            </div>
          </div>

          <div className="min-w-0">
            <div className="mb-3 flex items-center justify-center gap-6">
              <button type="button" onClick={prevSong} className="text-white/55 transition hover:text-white" aria-label="Anterior" title="Anterior">
                <SkipBack size={20} />
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition hover:scale-105"
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                title={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? <Pause fill="black" size={18} /> : <Play fill="black" size={18} className="ml-0.5" />}
              </button>
              <button type="button" onClick={nextSong} className="text-white/55 transition hover:text-white" aria-label="Siguiente" title="Siguiente">
                <SkipForward size={20} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-10 text-right text-[11px] font-medium text-white/75">{formatTime(currentTime)}</span>
              <div
                className="group h-2 flex-1 cursor-pointer rounded-full bg-white/20 p-[2px]"
                onClick={handleSeek}
                role="presentation"
              >
                <div
                  className="h-full rounded-full bg-white group-hover:bg-yellow-400"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              <span className="w-10 text-[11px] font-medium text-white/75">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="hidden items-center justify-end gap-2 md:flex">
            <Volume2 size={17} className="text-white/60" />
            <div className="h-2 w-28 cursor-pointer rounded-full bg-white/20 p-[2px]" onClick={handleVolume} role="presentation">
              <div className="h-full rounded-full bg-white" style={{ width: `${volume * 100}%` }} />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default NowPlayingView;
