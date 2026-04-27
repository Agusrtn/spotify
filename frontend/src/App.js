import React, { useState, useRef, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import { API_URL } from './config';
import { Disc, Play, X, Edit3, Save, Trash2, Plus, Check, Trophy, Share2, Heart, Clock3, Compass, ChevronLeft, ChevronRight } from 'lucide-react';

// Album gradient colors (similar to Spotify album art)
const ALBUM_GRADIENTS = [
  'from-red-600 via-pink-600 to-black',
  'from-purple-600 via-pink-500 to-black',
  'from-blue-600 via-cyan-500 to-black',
  'from-green-600 via-emerald-500 to-black',
  'from-orange-600 via-pink-500 to-black',
  'from-indigo-600 via-purple-500 to-black',
  'from-rose-600 via-red-500 to-black',
  'from-amber-600 via-orange-500 to-black',
];

// Many more gradient variations for album creation form
const ALL_ALBUM_GRADIENTS = [
  'from-red-600 via-pink-600 to-black',
  'from-red-700 via-red-500 to-black',
  'from-pink-600 via-rose-500 to-black',
  'from-pink-700 via-pink-500 to-black',
  'from-rose-600 via-pink-500 to-black',
  'from-rose-700 via-red-600 to-black',
  'from-purple-600 via-pink-500 to-black',
  'from-purple-700 via-purple-500 to-black',
  'from-blue-600 via-cyan-500 to-black',
  'from-blue-700 via-blue-500 to-black',
  'from-cyan-600 via-blue-500 to-black',
  'from-green-600 via-emerald-500 to-black',
  'from-green-700 via-green-500 to-black',
  'from-emerald-600 via-teal-500 to-black',
  'from-teal-600 via-green-500 to-black',
  'from-orange-600 via-pink-500 to-black',
  'from-orange-700 via-orange-500 to-black',
  'from-indigo-600 via-purple-500 to-black',
  'from-indigo-700 via-indigo-500 to-black',
  'from-amber-600 via-orange-500 to-black',
  'from-amber-700 via-amber-500 to-black',
  'from-fuchsia-600 via-pink-500 to-black',
  'from-fuchsia-700 via-purple-600 to-black',
];

const getAlbumGradient = (albumId) => {
  const index = albumId.charCodeAt(0) % ALBUM_GRADIENTS.length;
  return ALBUM_GRADIENTS[index];
};

const getRandomAlbumGradient = () => {
  return ALL_ALBUM_GRADIENTS[Math.floor(Math.random() * ALL_ALBUM_GRADIENTS.length)];
};

const SONG_GENRE_OPTIONS = [
  { value: 'urbano', label: 'Urbano' },
  { value: 'reggaeton', label: 'Reggaeton' },
  { value: 'trap', label: 'Trap' },
  { value: 'drill', label: 'Drill' },
  { value: 'dembow', label: 'Dembow' },
  { value: 'pop', label: 'Pop' },
  { value: 'rnb', label: 'R&B' },
  { value: 'hiphop', label: 'Hip Hop' },
  { value: 'rock', label: 'Rock' },
  { value: 'electro', label: 'Electro' },
  { value: 'house', label: 'House' },
  { value: 'afrobeats', label: 'Afrobeats' },
  { value: 'bachata', label: 'Bachata' },
  { value: 'salsa', label: 'Salsa' },
  { value: 'merengue', label: 'Merengue' },
  { value: 'corrido', label: 'Corrido' },
  { value: 'balada', label: 'Balada' },
  { value: 'lofi', label: 'Lofi' },
  { value: 'experimental', label: 'Experimental' },
  { value: 'otro', label: 'Otro' },
];

const inferGenreFromSongText = ({ title = '', description = '', lyrics = '' } = {}) => {
  const source = `${title} ${description} ${lyrics}`.toLowerCase();
  const checks = [
    ['reggaeton', /reggaeton|regueton|perreo|bellaqueo/],
    ['dembow', /dembow/],
    ['trap', /trap|808|autotune/],
    ['drill', /drill/],
    ['urbano', /urban|calle|flow/],
    ['afrobeats', /afrobeat|afrobeats/],
    ['bachata', /bachata/],
    ['salsa', /salsa/],
    ['merengue', /merengue/],
    ['corrido', /corrido|corridos/],
    ['rnb', /r&b|rnb/],
    ['hiphop', /hip hop|hiphop|rap/],
    ['house', /house/],
    ['electro', /electro|electronica|edm/],
    ['rock', /rock|guitarra/],
    ['balada', /balada|romantic/],
    ['lofi', /lofi|chill/],
    ['pop', /pop/],
  ];

  const match = checks.find((item) => item[1].test(source));
  return match ? match[0] : 'otro';
};

const INSTAGRAM_POST_REGEX = /^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+/i;
const LYRIC_TIMESTAMP_REGEX = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

const parseLyricsForDisplay = (rawLyrics = '') => {
  const rows = String(rawLyrics || '').split('\n');
  const parsed = [];
  let hasTimestampRows = false;

  rows.forEach((rawRow, rowIndex) => {
    const row = String(rawRow || '');
    const matches = [...row.matchAll(LYRIC_TIMESTAMP_REGEX)];
    const text = row.replace(LYRIC_TIMESTAMP_REGEX, '').trim();

    if (matches.length > 0) {
      hasTimestampRows = true;
      matches.forEach((match, matchIndex) => {
        const minute = Number(match[1] || 0);
        const second = Number(match[2] || 0);
        const fraction = String(match[3] || '').trim();
        const safeMinute = String(Number.isFinite(minute) ? minute : 0).padStart(2, '0');
        const safeSecond = String(Number.isFinite(second) ? second : 0).padStart(2, '0');
        const timeLabel = fraction ? `${safeMinute}:${safeSecond}.${fraction}` : `${safeMinute}:${safeSecond}`;
        parsed.push({
          id: `lrc-${rowIndex}-${matchIndex}`,
          text,
          timeLabel,
        });
      });
      return;
    }

    if (text) {
      parsed.push({
        id: `plain-${rowIndex}`,
        text,
        timeLabel: '',
      });
    }
  });

  return {
    isLrc: hasTimestampRows,
    lines: parsed,
  };
};

const containsLrcTimestamps = (rawLyrics = '') => /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/.test(String(rawLyrics || ''));

const formatLrcTimestamp = (totalSeconds = 0) => {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = Math.floor(safeSeconds % 60);
  const centiseconds = Math.floor((safeSeconds - Math.floor(safeSeconds)) * 100);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
};

const convertPlainLyricsToLrc = (rawLyrics = '', lineStepSeconds = 4) => {
  const rows = String(rawLyrics || '')
    .split('\n')
    .map((row) => row.trim())
    .filter(Boolean);

  if (!rows.length) return '';

  return rows
    .map((row, index) => `[${formatLrcTimestamp(index * lineStepSeconds)}]${row}`)
    .join('\n');
};

const formatPlayCount = (value = 0) => {
  const count = Math.max(0, Number(value) || 0);
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(Math.floor(count));
};

const getSongPlayCount = (song) => Math.max(0, Number(song?.playCount || 0));

const getAlbumPlayCount = (album) => {
  const songs = Array.isArray(album?.songs) ? album.songs : [];
  return songs.reduce((sum, song) => sum + getSongPlayCount(song), 0);
};

const extractYoutubeId = (url) => {
  const match = String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
};

const RTN_MUSIC_USER_ID = '69b979bde67d9d8b90e63d46';

const normalizeInstagramPostUrl = (url = '') => {
  const trimmed = String(url).trim();
  if (!trimmed) return '';
  if (!INSTAGRAM_POST_REGEX.test(trimmed)) return '';
  return trimmed.replace(/\/?$/, '/');
};

const getInstagramEmbedUrl = (url = '') => {
  const normalized = normalizeInstagramPostUrl(url);
  if (!normalized) return '';
  return `${normalized}embed/captioned/`;
};

const getAlbumThemeGradient = (album) => {
  if (album?.themeGradient) return album.themeGradient;
  return getAlbumGradient(album?._id || 'a');
};

const normalizeMediaUrl = (rawUrl = '') => {
  const value = String(rawUrl || '').trim();
  if (!value) return '';
  if (value.startsWith('data:')) return value;
  if (value.startsWith('//')) return `https:${value}`;
  if (/^http:\/\//i.test(value)) return value.replace(/^http:\/\//i, 'https://');
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return `${API_URL}${value}`;
  return `${API_URL}/${value.replace(/^\/+/, '')}`;
};

const normalizeArtistEntity = (artist) => {
  if (!artist) return artist;
  return {
    ...artist,
    profilePic: normalizeMediaUrl(artist.profilePic),
  };
};

const normalizeSongEntity = (song) => {
  if (!song) return song;
  return {
    ...song,
    coverUrl: normalizeMediaUrl(song.coverUrl),
    artist: normalizeArtistEntity(song.artist),
    collaborators: Array.isArray(song.collaborators)
      ? song.collaborators.map((collaborator) => ({
        ...collaborator,
        userId: collaborator?.userId
          ? normalizeArtistEntity(collaborator.userId)
          : collaborator?.userId,
      }))
      : song.collaborators,
  };
};

const normalizePlaylistEntity = (playlist) => {
  if (!playlist) return playlist;
  return {
    ...playlist,
    coverUrl: normalizeMediaUrl(playlist.coverUrl),
    creator: normalizeArtistEntity(playlist.creator),
    songs: Array.isArray(playlist.songs) ? playlist.songs.map(normalizeSongEntity) : playlist.songs,
  };
};

const normalizeAlbumEntity = (album) => {
  if (!album) return album;
  return {
    ...album,
    coverUrl: normalizeMediaUrl(album.coverUrl),
    artist: normalizeArtistEntity(album.artist),
    songs: Array.isArray(album.songs) ? album.songs.map(normalizeSongEntity) : album.songs,
  };
};

const AUTH_USER_STORAGE_KEY = 'rtnmusic.auth.user';
const AUTH_TOKEN_STORAGE_KEY = 'rtnmusic.auth.token';

const getStoredAuthUser = () => {
  if (typeof window === 'undefined') return null;

  try {
    const rawUser = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    console.error('Error reading stored user session:', error);
    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    return null;
  }
};

const getStoredAuthToken = () => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || '';
};

function App() {
  const [user, setUser] = useState(getStoredAuthUser);
  const [authToken, setAuthToken] = useState(getStoredAuthToken);
  const [view, setView] = useState('inicio');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ artists: [], songs: [], albums: [] });
  const [searchType, setSearchType] = useState('all');
  const [searchSort, setSearchSort] = useState('recent');
  const [searchGenre, setSearchGenre] = useState('all');
  const [searchLoading, setSearchLoading] = useState(false);
  const [mySongs, setMySongs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [albumToEdit, setAlbumToEdit] = useState(null);
  const [activeArtistTab, setActiveArtistTab] = useState('info');

  const [allSongs, setAllSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [userPlaylistsLoading, setUserPlaylistsLoading] = useState(false);
  const [userPlaylistForm, setUserPlaylistForm] = useState({ id: null, name: '', description: '', coverUrl: '', isPublic: true, songIds: [] });
  const [userPlaylistCoverFile, setUserPlaylistCoverFile] = useState(null);
  const [userPlaylistSaving, setUserPlaylistSaving] = useState(false);
  const [albums, setAlbums] = useState([]);
  const [likedSongIds, setLikedSongIds] = useState([]);
  const [likedAlbumIds, setLikedAlbumIds] = useState([]);
  const [likedPlaylistIds, setLikedPlaylistIds] = useState([]);
  const [favoriteLibrary, setFavoriteLibrary] = useState({ songs: [], albums: [], playlists: [] });
  const [continueListening, setContinueListening] = useState([]);
  const [discoveryFeed, setDiscoveryFeed] = useState({ forYouSongs: [], trendingSongs: [], freshAlbums: [], playlists: [] });
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [homeVisibleCards, setHomeVisibleCards] = useState(3);
  const [featuredCarouselIndex, setFeaturedCarouselIndex] = useState(0);
  const [albumsCarouselIndex, setAlbumsCarouselIndex] = useState(0);
  const [artistsCarouselIndex, setArtistsCarouselIndex] = useState(0);
  const [crewSongsPage, setCrewSongsPage] = useState(0);
  const [featuredMotionTick, setFeaturedMotionTick] = useState(0);
  const [featuredMotionDirection, setFeaturedMotionDirection] = useState('next');
  const [albumsMotionTick, setAlbumsMotionTick] = useState(0);
  const [albumsMotionDirection, setAlbumsMotionDirection] = useState('next');
  const [artistsMotionTick, setArtistsMotionTick] = useState(0);
  const [artistsMotionDirection, setArtistsMotionDirection] = useState('next');
  const [crewMotionTick, setCrewMotionTick] = useState(0);
  const [crewMotionDirection, setCrewMotionDirection] = useState('next');
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [, setCurrentIndex] = useState(0);
  const [playQueue, setPlayQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [playMode, setPlayMode] = useState('all');
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedSong, setSelectedSong] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [artistProfile, setArtistProfile] = useState(null);
  const [artistStats, setArtistStats] = useState(null);
  const [adminTopSongs, setAdminTopSongs] = useState([]);
  const [adminTopLoading, setAdminTopLoading] = useState(false);
  const [scheduledSongs, setScheduledSongs] = useState([]);
  const [scheduledAlbums, setScheduledAlbums] = useState([]);
  const [scheduledLoading, setScheduledLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '' });
  const [songToAddPlaylist, setSongToAddPlaylist] = useState(null);

  const [settingsBio, setSettingsBio] = useState('');
  const [settingsInstagramHandle, setSettingsInstagramHandle] = useState('');
  const [settingsPic, setSettingsPic] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Media / Videos
  const [videos, setVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [activeVideo, setActiveVideo] = useState(null);
  const [videoUploadOpen, setVideoUploadOpen] = useState(false);
  const [videoUploadTab, setVideoUploadTab] = useState('youtube'); // 'youtube' | 'upload'
  const [videoUploadForm, setVideoUploadForm] = useState({ title: '', description: '', youtubeUrl: '', orientation: 'horizontal' });
  const [videoUploadFile, setVideoUploadFile] = useState(null);
  const [videoUploadLoading, setVideoUploadLoading] = useState(false);
  const [videoUploadAsRTN, setVideoUploadAsRTN] = useState(false);
  const [rtnProfilePic, setRtnProfilePic] = useState('');
  const [rtnProfilePicUploading, setRtnProfilePicUploading] = useState(false);
  const [instagramActionLoading, setInstagramActionLoading] = useState(false);
  const [instagramConfig, setInstagramConfig] = useState({ checked: false, configured: true, missing: [] });
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberUsernameDrafts, setMemberUsernameDrafts] = useState({});
  const [memberPasswordDrafts, setMemberPasswordDrafts] = useState({});
  const [memberPasswordConfirmDrafts, setMemberPasswordConfirmDrafts] = useState({});
  const [memberActionLoading, setMemberActionLoading] = useState({});
  const [playlistForm, setPlaylistForm] = useState({ id: null, name: '', description: '', coverUrl: '', songIds: [], isDefault: true });
  const [playlistCoverFile, setPlaylistCoverFile] = useState(null);
  const [playlistSaving, setPlaylistSaving] = useState(false);
  const [albumForm, setAlbumForm] = useState({ id: null, title: '', description: '', coverUrl: '', songIds: [] });
  // eslint-disable-next-line no-unused-vars
  const [albumSaving, setAlbumSaving] = useState(false);

  // Top Weekly Covers
  const [topWeeklyCovers, setTopWeeklyCovers] = useState([]);
  const [topWeeklyCoversLoading, setTopWeeklyCoversLoading] = useState(false);
  const [topWeeklyCoverFile, setTopWeeklyCoverFile] = useState(null);
  const [topWeeklyCoverUploading, setTopWeeklyCoverUploading] = useState(false);

  const audioRef = useRef(null);
  const activeSongIdRef = useRef(null);
  const lastTrackedPositionRef = useRef(0);
  const pendingListenSecondsRef = useRef(0);
  const songsInitializedRef = useRef(false);
  const albumsInitializedRef = useRef(false);
  const deepLinkHandledRef = useRef(false);
  const confirmResolverRef = useRef(null);
  const pendingResumeSecondsRef = useRef(0);
  const historyPendingSecondsRef = useRef(0);
  const historySyncInFlightRef = useRef(false);

  const likedSongSet = useMemo(() => new Set((likedSongIds || []).map((id) => String(id))), [likedSongIds]);
  const likedAlbumSet = useMemo(() => new Set((likedAlbumIds || []).map((id) => String(id))), [likedAlbumIds]);
  const likedPlaylistSet = useMemo(() => new Set((likedPlaylistIds || []).map((id) => String(id))), [likedPlaylistIds]);
  const featuredPlaylists = useMemo(
    () => playlists.filter((playlist) => playlist.isDefault),
    [playlists]
  );
  const maxFeaturedIndex = Math.max(0, featuredPlaylists.length - homeVisibleCards);
  const maxAlbumsIndex = Math.max(0, albums.length - homeVisibleCards);
  const allArtistsForHome = useMemo(() => {
    const map = new Map();
    allSongs.forEach((song) => {
      const artist = song?.artist;
      const artistId = String(artist?._id || '');
      if (!artistId) return;
      const existing = map.get(artistId);
      if (!existing) {
        map.set(artistId, artist);
      } else if (!existing.profilePic && artist?.profilePic) {
        map.set(artistId, { ...existing, profilePic: artist.profilePic });
      }
    });
    albums.forEach((album) => {
      const artist = album?.artist;
      const artistId = String(artist?._id || '');
      if (!artistId) return;
      const existing = map.get(artistId);
      if (!existing) {
        map.set(artistId, artist);
      } else if (!existing.profilePic && artist?.profilePic) {
        map.set(artistId, { ...existing, profilePic: artist.profilePic });
      }
    });
    return Array.from(map.values());
  }, [allSongs, albums]);
  const maxArtistsIndex = Math.max(0, allArtistsForHome.length - homeVisibleCards);
  const crewSongsPageSize = 9;
  const maxCrewSongsPage = Math.max(0, Math.ceil(allSongs.length / crewSongsPageSize) - 1);
  const visibleFeaturedPlaylists = useMemo(
    () => featuredPlaylists.slice(featuredCarouselIndex, featuredCarouselIndex + homeVisibleCards),
    [featuredPlaylists, featuredCarouselIndex, homeVisibleCards]
  );
  const visibleAlbums = useMemo(
    () => albums.slice(albumsCarouselIndex, albumsCarouselIndex + homeVisibleCards),
    [albums, albumsCarouselIndex, homeVisibleCards]
  );
  const visibleArtistsForHome = useMemo(
    () => allArtistsForHome.slice(artistsCarouselIndex, artistsCarouselIndex + homeVisibleCards),
    [allArtistsForHome, artistsCarouselIndex, homeVisibleCards]
  );
  const visibleCrewSongs = useMemo(
    () => allSongs.slice(crewSongsPage * crewSongsPageSize, (crewSongsPage + 1) * crewSongsPageSize),
    [allSongs, crewSongsPage]
  );

  const rtnVideos = useMemo(() => videos.filter((v) => String(v.uploader?._id) === RTN_MUSIC_USER_ID), [videos]);
  const crewVideos = useMemo(() => videos.filter((v) => String(v.uploader?._id) !== RTN_MUSIC_USER_ID), [videos]);

  const animatePageMove = (step, maxIndex, setDirection, setTick, setIndex) => {
    if (!Number.isFinite(step) || step === 0) return;
    const safeStep = step > 0 ? 1 : -1;
    setIndex((prev) => {
      const next = Math.max(0, Math.min(maxIndex, prev + safeStep));
      if (next !== prev) {
        setDirection(safeStep > 0 ? 'next' : 'prev');
        setTick((tick) => tick + 1);
      }
      return next;
    });
  };

  const shiftFeaturedCarousel = (step) => animatePageMove(step, maxFeaturedIndex, setFeaturedMotionDirection, setFeaturedMotionTick, setFeaturedCarouselIndex);
  const shiftAlbumsCarousel = (step) => animatePageMove(step, maxAlbumsIndex, setAlbumsMotionDirection, setAlbumsMotionTick, setAlbumsCarouselIndex);
  const shiftArtistsCarousel = (step) => animatePageMove(step, maxArtistsIndex, setArtistsMotionDirection, setArtistsMotionTick, setArtistsCarouselIndex);
  const shiftCrewSongsPage = (step) => animatePageMove(step, maxCrewSongsPage, setCrewMotionDirection, setCrewMotionTick, setCrewSongsPage);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const addNotification = (title, message, action = null) => {
    const notification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      message,
      action,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [notification, ...prev].slice(0, 40));
  };

  const askConfirm = (message, title = 'Confirmar') => {
    return new Promise((resolve) => {
      confirmResolverRef.current = resolve;
      setConfirmDialog({ open: true, title, message });
    });
  };

  const resolveConfirm = (accepted) => {
    if (confirmResolverRef.current) {
      confirmResolverRef.current(Boolean(accepted));
      confirmResolverRef.current = null;
    }
    setConfirmDialog({ open: false, title: '', message: '' });
  };

  const fetchAllSongs = async () => {
    try {
      const res = await fetch(`${API_URL}/all-songs`);
      if (res.ok) {
        const dataRaw = await res.json();
        const data = Array.isArray(dataRaw) ? dataRaw.map(normalizeSongEntity) : [];
        setAllSongs((prev) => {
          if (songsInitializedRef.current) {
            const prevIds = new Set(prev.map((song) => String(song._id)));
            const freshSongs = data.filter((song) => !prevIds.has(String(song._id)));
            freshSongs.slice(0, 3).forEach((song) => {
              addNotification(
                'Nueva canción publicada',
                `${song.title} - ${song.artist?.username || 'Artista'}`,
                { type: 'song', id: song._id }
              );
            });
          } else {
            songsInitializedRef.current = true;
          }
          return data;
        });
      }
    } catch (err) {
      console.error('Error fetching all songs:', err);
    }
  };

  const fetchVideos = async () => {
    setVideosLoading(true);
    try {
      const res = await fetch(`${API_URL}/videos`);
      if (res.ok) setVideos(await res.json());
    } catch (err) {
      console.error('Error fetching videos:', err);
    }
    setVideosLoading(false);
  };

  const fetchRtnProfilePic = async () => {
    try {
      const res = await fetch(`${API_URL}/users/${RTN_MUSIC_USER_ID}/profile`);
      if (res.ok) {
        const data = await res.json();
        setRtnProfilePic(data.profilePic || '');
      }
    } catch (_) {}
  };

  const fetchPlaylists = async () => {
    try {
      const res = await fetch(`${API_URL}/playlists`);
      if (res.ok) {
        const dataRaw = await res.json();
        const data = Array.isArray(dataRaw) ? dataRaw.map(normalizePlaylistEntity) : [];
        setPlaylists(data);
      }
    } catch (err) {
      console.error('Error fetching playlists:', err);
    }
  };

  const fetchUserPlaylists = async () => {
    if (!user?._id) return;
    setUserPlaylistsLoading(true);
    try {
      const res = await fetch(`${API_URL}/my-playlists?userId=${user._id}`);
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        showToast(data.error || 'No se pudieron cargar tus playlists', 'error');
        return;
      }
      setUserPlaylists(Array.isArray(data) ? data.map(normalizePlaylistEntity) : []);
    } catch (err) {
      console.error('Error fetching user playlists:', err);
      showToast('Error al cargar playlists personales', 'error');
    } finally {
      setUserPlaylistsLoading(false);
    }
  };

  const resetUserPlaylistForm = () => {
    setUserPlaylistForm({ id: null, name: '', description: '', coverUrl: '', isPublic: true, songIds: [] });
    setUserPlaylistCoverFile(null);
  };

  const startEditUserPlaylist = (playlist) => {
    setUserPlaylistCoverFile(null);
    setUserPlaylistForm({
      id: playlist._id,
      name: playlist.name || '',
      description: playlist.description || '',
      coverUrl: playlist.coverUrl || '',
      isPublic: Boolean(playlist.isPublic),
      songIds: playlist.songs?.map((song) => song._id) || [],
    });
  };

  const toggleUserPlaylistSong = (songId) => {
    setUserPlaylistForm((prev) => ({
      ...prev,
      songIds: prev.songIds.includes(songId)
        ? prev.songIds.filter((id) => id !== songId)
        : [...prev.songIds, songId],
    }));
  };

  const saveUserPlaylist = async (e) => {
    e.preventDefault();
    if (!userPlaylistForm.name.trim()) {
      showToast('La playlist necesita nombre', 'error');
      return;
    }

    setUserPlaylistSaving(true);
    try {
      const endpoint = userPlaylistForm.id
        ? `${API_URL}/my-playlists/${userPlaylistForm.id}`
        : `${API_URL}/my-playlists`;
      const method = userPlaylistForm.id ? 'PUT' : 'POST';

      const formData = new FormData();
      formData.append('userId', user._id);
      formData.append('name', userPlaylistForm.name);
      formData.append('description', userPlaylistForm.description || '');
      formData.append('coverUrl', userPlaylistForm.coverUrl || '');
      formData.append('songIds', JSON.stringify(userPlaylistForm.songIds || []));
      formData.append('isPublic', String(Boolean(userPlaylistForm.isPublic)));
      if (userPlaylistCoverFile) formData.append('cover', userPlaylistCoverFile);

      const res = await fetch(endpoint, {
        method,
        body: formData,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast(data.error || 'No se pudo guardar la playlist', 'error');
        return;
      }

      if (userPlaylistForm.id) {
        setUserPlaylists((prev) => prev.map((playlist) => (playlist._id === data.playlist._id ? normalizePlaylistEntity(data.playlist) : playlist)));
      } else {
        setUserPlaylists((prev) => [normalizePlaylistEntity(data.playlist), ...prev]);
      }

      resetUserPlaylistForm();
      showToast('Playlist personal guardada', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al guardar playlist personal', 'error');
    } finally {
      setUserPlaylistSaving(false);
    }
  };

  const deleteUserPlaylist = async (playlistId) => {
    const confirmed = await askConfirm('¿Eliminar esta playlist personal?', 'Eliminar playlist');
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/my-playlists/${playlistId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast(data.error || 'No se pudo eliminar la playlist', 'error');
        return;
      }

      setUserPlaylists((prev) => prev.filter((playlist) => playlist._id !== playlistId));
      if (selectedPlaylist?._id === playlistId) {
        setSelectedPlaylist(null);
      }
      if (userPlaylistForm.id === playlistId) {
        resetUserPlaylistForm();
      }
      showToast('Playlist eliminada', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al eliminar playlist', 'error');
    }
  };

  const addSongToUserPlaylist = async (playlistId, songId) => {
    try {
      const res = await fetch(`${API_URL}/my-playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id, songId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || 'No se pudo añadir canción', 'error');
        return;
      }

      setUserPlaylists((prev) => prev.map((playlist) => (playlist._id === data.playlist._id ? normalizePlaylistEntity(data.playlist) : playlist)));
      showToast('Canción añadida a playlist', 'success');
      setSongToAddPlaylist(null);
    } catch (err) {
      console.error(err);
      showToast('Error al añadir canción', 'error');
    }
  };

  const fetchAlbums = async () => {
    try {
      const res = await fetch(`${API_URL}/albums`);
      if (res.ok) {
        const dataRaw = await res.json();
        const data = Array.isArray(dataRaw) ? dataRaw.map(normalizeAlbumEntity) : [];
        setAlbums((prev) => {
          if (albumsInitializedRef.current) {
            const prevIds = new Set(prev.map((album) => String(album._id)));
            const freshAlbums = data.filter((album) => !prevIds.has(String(album._id)));
            freshAlbums.slice(0, 3).forEach((album) => {
              addNotification(
                'Nuevo álbum publicado',
                `${album.title} - ${album.artist?.username || 'Artista'}`,
                { type: 'album', id: album._id }
              );
            });
          } else {
            albumsInitializedRef.current = true;
          }
          return data;
        });
      }
    } catch (err) {
      console.error('Error fetching albums:', err);
    }
  };

  const fetchUserLibrary = async (targetUserId = user?._id) => {
    if (!targetUserId || !user?._id) return;
    try {
      const params = new URLSearchParams({ requesterId: user._id });
      const res = await fetch(`${API_URL}/users/${targetUserId}/library?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;

      setLikedSongIds(Array.isArray(data.likedSongIds) ? data.likedSongIds : []);
      setLikedAlbumIds(Array.isArray(data.likedAlbumIds) ? data.likedAlbumIds : []);
      setLikedPlaylistIds(Array.isArray(data.likedPlaylistIds) ? data.likedPlaylistIds : []);
      setFavoriteLibrary({
        songs: Array.isArray(data.favorites?.songs) ? data.favorites.songs.map(normalizeSongEntity) : [],
        albums: Array.isArray(data.favorites?.albums) ? data.favorites.albums.map(normalizeAlbumEntity) : [],
        playlists: Array.isArray(data.favorites?.playlists) ? data.favorites.playlists.map(normalizePlaylistEntity) : [],
      });
      setContinueListening(
        Array.isArray(data.continueListening)
          ? data.continueListening.map((entry) => ({
            ...entry,
            song: normalizeSongEntity(entry.song),
          }))
          : []
      );
    } catch (err) {
      console.error('Error fetching user library:', err);
    }
  };

  const fetchDiscoveryFeed = async (targetUserId = user?._id) => {
    if (!targetUserId || !user?._id) return;
    setDiscoveryLoading(true);
    try {
      const params = new URLSearchParams({ userId: targetUserId, requesterId: user._id });
      const res = await fetch(`${API_URL}/discovery-feed?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;

      setDiscoveryFeed({
        forYouSongs: Array.isArray(data.forYouSongs) ? data.forYouSongs.map(normalizeSongEntity) : [],
        trendingSongs: Array.isArray(data.trendingSongs) ? data.trendingSongs.map(normalizeSongEntity) : [],
        freshAlbums: Array.isArray(data.freshAlbums) ? data.freshAlbums.map(normalizeAlbumEntity) : [],
        playlists: Array.isArray(data.playlists) ? data.playlists.map(normalizePlaylistEntity) : [],
      });
    } catch (err) {
      console.error('Error fetching discovery feed:', err);
    } finally {
      setDiscoveryLoading(false);
    }
  };

  const toggleFavorite = async (type, itemId) => {
    if (!user?._id || !itemId) return;
    try {
      const res = await fetch(`${API_URL}/users/${user._id}/likes/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: user._id, type, itemId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || 'No se pudo actualizar favoritos', 'error');
        return;
      }

      if (data.type === 'song') setLikedSongIds(Array.isArray(data.ids) ? data.ids : []);
      if (data.type === 'album') setLikedAlbumIds(Array.isArray(data.ids) ? data.ids : []);
      if (data.type === 'playlist') setLikedPlaylistIds(Array.isArray(data.ids) ? data.ids : []);

      fetchUserLibrary(user._id);
    } catch (err) {
      console.error('Error toggling favorite:', err);
      showToast('Error al actualizar favoritos', 'error');
    }
  };

  const syncListeningHistory = async ({ songId, positionSeconds, durationSeconds, incrementSeconds = 0, completed = false }) => {
    if (!user?._id || !songId || historySyncInFlightRef.current) return;

    const safeIncrement = Math.max(0, Math.floor(Number(incrementSeconds || 0)));
    const shouldSend = completed || safeIncrement >= 1;
    if (!shouldSend) return;

    historySyncInFlightRef.current = true;
    try {
      await fetch(`${API_URL}/users/${user._id}/listening-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: user._id,
          songId,
          positionSeconds: Math.max(0, Math.floor(Number(positionSeconds || 0))),
          durationSeconds: Math.max(0, Math.floor(Number(durationSeconds || 0))),
          incrementSeconds: safeIncrement,
          completed,
        }),
      });
    } catch (err) {
      console.error('Error syncing listening history:', err);
    } finally {
      historySyncInFlightRef.current = false;
    }
  };

  const fetchArtistStats = async (artistId) => {
    try {
      const res = await fetch(`${API_URL}/artists/${artistId}/stats`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setArtistStats(data);
    } catch (err) {
      console.error('Error fetching artist stats:', err);
    }
  };

  const fetchAdminTopSongs = async () => {
    if (!user?._id || user.role !== 'admin') return;
    setAdminTopLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/top-songs?requesterId=${user._id}&limit=20`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || 'No se pudo cargar el top', 'error');
        return;
      }
      setAdminTopSongs(data.songs || []);
    } catch (err) {
      console.error('Error fetching top songs:', err);
      showToast('Error al cargar top canciones', 'error');
    } finally {
      setAdminTopLoading(false);
    }
  };

  const fetchTopWeeklyCovers = async () => {
    if (!user?._id || user.role !== 'admin') return;
    setTopWeeklyCoversLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/top-weekly-covers?requesterId=${user._id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || 'No se pudieron cargar las imágenes', 'error');
        return;
      }
      setTopWeeklyCovers(data.covers || []);
    } catch (err) {
      console.error('Error fetching top weekly covers:', err);
      showToast('Error al cargar imágenes del top', 'error');
    } finally {
      setTopWeeklyCoversLoading(false);
    }
  };

  const fetchSongsDebug = async () => {
    if (!user?._id || user.role !== 'admin') return;
    try {
      const res = await fetch(`${API_URL}/admin/all-songs-debug?requesterId=${user._id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || 'Error al obtener debug', 'error');
        return;
      }
      console.log('📊 Debug de canciones:', data.stats);
      showToast(`Total: ${data.stats.total}, Publicadas: ${data.stats.published}, Programadas no pub: ${data.stats.scheduledNotPublished}`, 'info');
    } catch (err) {
      console.error('Error fetching songs debug:', err);
      showToast('Error al obtener debug de canciones', 'error');
    }
  };

  const publishExpiredScheduled = async () => {
    if (!user?._id || user.role !== 'admin') return;
    try {
      const res = await fetch(`${API_URL}/admin/publish-expired-scheduled`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: user._id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || 'Error al publicar canciones vencidas', 'error');
        return;
      }
      showToast(data.message, 'success');
      await fetchAllSongs(); // Recargar la lista
    } catch (err) {
      console.error('Error publishing expired scheduled:', err);
      showToast('Error al publicar canciones vencidas', 'error');
    }
  };

  const uploadTopWeeklyCover = async () => {
    if (!user?._id || user.role !== 'admin' || !topWeeklyCoverFile) {
      showToast('Necesitas seleccionar una imagen', 'error');
      return;
    }

    setTopWeeklyCoverUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', topWeeklyCoverFile);
      formData.append('requesterId', user._id);

      const res = await fetch(`${API_URL}/admin/top-weekly-covers`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || 'Error al subir imagen', 'error');
        return;
      }

      showToast('Imagen subida correctamente', 'success');
      setTopWeeklyCoverFile(null);
      await fetchTopWeeklyCovers();
    } catch (err) {
      console.error('Error uploading cover:', err);
      showToast('Error al subir imagen', 'error');
    } finally {
      setTopWeeklyCoverUploading(false);
    }
  };

  const deleteTopWeeklyCover = async (coverId) => {
    if (!user?._id || user.role !== 'admin') return;

    setConfirmDialog({
      open: true,
      title: 'Eliminar imagen',
      message: '¿Estás seguro de que deseas eliminar esta imagen del top semanal?',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/admin/top-weekly-covers/${coverId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requesterId: user._id }),
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            showToast(data.error || 'Error al eliminar imagen', 'error');
            return;
          }

          showToast('Imagen eliminada', 'success');
          await fetchTopWeeklyCovers();
        } catch (err) {
          console.error('Error deleting cover:', err);
          showToast('Error al eliminar imagen', 'error');
        }
      },
    });
  };

  const registerSongPlay = async (songId) => {
    if (!songId) return;
    try {
      await fetch(`${API_URL}/songs/${songId}/play`, { method: 'POST' });
    } catch (err) {
      console.error('Error tracking play:', err);
    }
  };

  const registerSongListenTime = async (songId, seconds) => {
    if (!songId) return;
    const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    if (safeSeconds <= 0) return;
    try {
      await fetch(`${API_URL}/songs/${songId}/listen-time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seconds: safeSeconds }),
      });
    } catch (err) {
      console.error('Error tracking listen time:', err);
    }
  };

  const flushPendingListenTime = async () => {
    const songId = activeSongIdRef.current;
    const pending = pendingListenSecondsRef.current;
    if (!songId || pending < 1) return;

    pendingListenSecondsRef.current = 0;
    await registerSongListenTime(songId, pending);

    setAllSongs((prev) => prev.map((song) => (
      song._id === songId
        ? { ...song, listenSeconds: Number(song.listenSeconds || 0) + Math.floor(pending) }
        : song
    )));
  };

  const flushPendingHistory = ({ completed = false } = {}) => {
    const songId = activeSongIdRef.current;
    if (!songId) return;

    const pending = Math.max(0, Math.floor(Number(historyPendingSecondsRef.current || 0)));
    if (!completed && pending < 1) return;

    const songDuration = Math.floor(Number(audioRef.current?.duration || duration || 0));
    syncListeningHistory({
      songId,
      positionSeconds: completed ? songDuration : Math.floor(Number(lastTrackedPositionRef.current || 0)),
      durationSeconds: songDuration,
      incrementSeconds: pending,
      completed,
    });

    historyPendingSecondsRef.current = 0;
  };

  const formatListenTime = (seconds) => {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const shareLink = async (type, itemId, label) => {
    try {
      const url = `${API_URL}/share/${type}/${itemId}?app=${encodeURIComponent(window.location.origin)}`;
      if (navigator.share) {
        await navigator.share({ title: `RTN Music - ${label}`, text: `Te comparto ${label}`, url });
        showToast(`Compartiste ${label}`, 'success');
      } else {
        await navigator.clipboard.writeText(url);
        showToast(`Enlace de ${label} copiado`, 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('No se pudo copiar el enlace', 'error');
    }
  };

  useEffect(() => {
    fetchAllSongs();
    fetchPlaylists();
    fetchAlbums();
    if (user?._id) fetchUserPlaylists();
    fetchVideos();
    fetchRtnProfilePic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (isNotificationsOpen) {
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    }
  }, [isNotificationsOpen]);

  useEffect(() => {
    if (deepLinkHandledRef.current) return;
    if (!allSongs.length && !albums.length && !playlists.length && !userPlaylists.length) return;

    const params = new URLSearchParams(window.location.search);
    const songId = params.get('song');
    const albumId = params.get('album');
    const playlistId = params.get('playlist');
    const artistId = params.get('artist');

    if (songId) {
      const song = allSongs.find((item) => String(item._id) === String(songId));
      if (song) {
        setSelectedSong(song);
        setView('inicio');
        showToast('Abriendo canción compartida', 'success');
      }
    }

    if (albumId) {
      const album = albums.find((item) => String(item._id) === String(albumId));
      if (album) {
        setSelectedAlbum(album);
        setView('inicio');
        showToast('Abriendo álbum compartido', 'success');
      }
    }

    if (playlistId) {
      const allAvailablePlaylists = [...(playlists || []), ...(userPlaylists || [])];
      const playlist = allAvailablePlaylists.find((item) => String(item._id) === String(playlistId));
      if (playlist) {
        setSelectedPlaylist(playlist);
        setView('inicio');
        showToast('Abriendo playlist compartida', 'success');
      }
    }

    if (artistId && !songId && !albumId && !playlistId) {
      openArtistProfile(artistId);
      showToast('Abriendo artista compartido', 'success');
    }

    if (songId || albumId || playlistId || artistId) {
      deepLinkHandledRef.current = true;
      const cleanUrl = `${window.location.origin}${window.location.pathname}`;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, [allSongs, albums, playlists, userPlaylists]);

  useEffect(() => {
    if (!user?._id) return;

    const params = new URLSearchParams(window.location.search);
    const igStatus = params.get('ig');
    const requestedView = params.get('view');
    if (!igStatus && !requestedView) return;

    if (requestedView === 'ajustes') {
      setView('ajustes');
    }

    if (igStatus === 'connected') {
      showToast('Instagram conectado correctamente', 'success');
      refreshOwnProfile(true);
    } else if (igStatus === 'error') {
      showToast('No se pudo conectar Instagram', 'error');
    }

    const cleanUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.replaceState({}, '', cleanUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  useEffect(() => {
    if (!user?._id || !user?.instagramLinked) return;
    const intervalId = setInterval(() => {
      refreshOwnProfile(true);
    }, 60 * 1000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, user?.instagramLinked]);

  useEffect(() => {
    if (view !== 'artist' || !artistProfile?.artist?._id || !artistProfile?.artist?.instagramLinked) return;
    const intervalId = setInterval(() => {
      openArtistProfile(artistProfile.artist._id);
    }, 60 * 1000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, artistProfile?.artist?._id, artistProfile?.artist?.instagramLinked]);

  useEffect(() => {
    if (view === 'media') fetchVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (user) {
      window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    }
  }, [user]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (authToken) {
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, authToken);
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  }, [authToken]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleResize = () => {
      if (window.innerWidth >= 1280) setHomeVisibleCards(3);
      else if (window.innerWidth >= 768) setHomeVisibleCards(2);
      else setHomeVisibleCards(1);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleResourceError = (event) => {
      const target = event.target;
      if (target && target.tagName === 'IMG') {
        target.style.display = 'none';
      }
    };

    window.addEventListener('error', handleResourceError, true);
    return () => window.removeEventListener('error', handleResourceError, true);
  }, []);

  useEffect(() => {
    setFeaturedCarouselIndex((prev) => Math.min(prev, maxFeaturedIndex));
  }, [maxFeaturedIndex]);

  useEffect(() => {
    setAlbumsCarouselIndex((prev) => Math.min(prev, maxAlbumsIndex));
  }, [maxAlbumsIndex]);

  useEffect(() => {
    setArtistsCarouselIndex((prev) => Math.min(prev, maxArtistsIndex));
  }, [maxArtistsIndex]);

  useEffect(() => {
    setCrewSongsPage((prev) => Math.min(prev, maxCrewSongsPage));
  }, [maxCrewSongsPage]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchAllSongs();
      fetchPlaylists();
      fetchAlbums();
      if (user?._id) {
        fetchUserPlaylists();
      }
      if (user?._id && (user.role === 'artist' || user.role === 'admin')) {
        fetchMySongs(user._id);
      }
    }, 8000);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (!audioRef.current || !currentSong) return;
    if (isPlaying) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [isPlaying, currentSong]);

  useEffect(() => {
    if (isPlaying) return;
    flushPendingHistory();
    flushPendingListenTime();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      flushPendingHistory();
      flushPendingListenTime();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) {
      setSettingsBio(user.bio || '');
      setSettingsInstagramHandle(user.instagramHandle || '');
    }
  }, [user]);

  useEffect(() => {
    if (!user?._id) return;
    if (user.role !== 'artist' && user.role !== 'admin') return;
    checkInstagramServerConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, user?.role]);

  const fetchScheduledContent = async () => {
    if (!user?._id) return;
    setScheduledLoading(true);
    try {
      const [songsRes, albumsRes] = await Promise.all([
        fetch(`${API_URL}/admin/scheduled-content`),
        fetch(`${API_URL}/admin/scheduled-content?type=albums`)
      ]);
      
      const songsData = await songsRes.json().catch(() => ({ songs: [] }));
      const albumsData = await albumsRes.json().catch(() => ({ albums: [] }));
      
      setScheduledSongs(Array.isArray(songsData.songs) ? songsData.songs : []);
      setScheduledAlbums(Array.isArray(albumsData.albums) ? albumsData.albums : []);
    } catch (err) {
      console.error('Error al cargar contenido programado:', err);
    } finally {
      setScheduledLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'admin' && user?.role === 'admin') {
      fetchMembers();
      fetchAllSongs();
      fetchPlaylists();
      fetchAdminTopSongs();
      fetchScheduledContent();
      fetchTopWeeklyCovers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, user]);

  useEffect(() => {
    if (user?._id && (user.role === 'artist' || user.role === 'admin')) {
      fetchMySongs(user._id);
      fetchArtistStats(user._id);
    }
    if (user?._id) {
      fetchUserPlaylists();
      fetchUserLibrary(user._id);
      fetchDiscoveryFeed(user._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user?._id) return;
    const intervalId = setInterval(() => {
      fetchDiscoveryFeed(user._id);
    }, 30 * 1000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  useEffect(() => {
    if (view === 'artist' && artistProfile?.artist?._id) {
      fetchArtistStats(artistProfile.artist._id);
    }
  }, [view, artistProfile]);

  useEffect(() => {
    if (isModalOpen && user?.role === 'admin') {
      fetchMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, user]);

  useEffect(() => {
    if (isAlbumModalOpen && user?.role === 'admin' && members.length === 0) {
      fetchMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAlbumModalOpen, user, members.length]);

  useEffect(() => {
    if (selectedSong && user?.role === 'admin' && members.length === 0) {
      fetchMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSong, user, members.length]);

  const fetchMySongs = async (artistId) => {
    try {
      const res = await fetch(`${API_URL}/songs?artist=${artistId}`);
      if (res.ok) {
        const dataRaw = await res.json();
        setMySongs(Array.isArray(dataRaw) ? dataRaw.map(normalizeSongEntity) : []);
      }
    } catch (err) {
      console.error('Error fetching songs:', err);
    }
  };

  const handleSongEnd = () => {
    flushPendingHistory({ completed: true });

    if (!playQueue.length || !allSongs.length) {
      setIsPlaying(false);
      return;
    }

    if (playMode === 'random') {
      const randomIndex = Math.floor(Math.random() * allSongs.length);
      playSong(allSongs[randomIndex], randomIndex, { queue: allSongs, mode: 'random' });
      return;
    }

    if (queueIndex < playQueue.length - 1) {
      const nextIndex = queueIndex + 1;
      playSong(playQueue[nextIndex], nextIndex, { queue: playQueue, mode: playMode });
      return;
    }

    if (playMode === 'album') {
      const randomIndex = Math.floor(Math.random() * allSongs.length);
      playSong(allSongs[randomIndex], randomIndex, { queue: allSongs, mode: 'random' });
      return;
    }

    setIsPlaying(false);
  };

  const playSong = (song, index, options = {}) => {
    flushPendingHistory();
    flushPendingListenTime();

    const queue = options.queue || allSongs;
    const mode = options.mode || 'all';
    const startAtSeconds = Math.max(0, Number(options.startAtSeconds || 0));
    setCurrentSong(song);
    setCurrentIndex(index);
    setPlayQueue(queue);
    setQueueIndex(index);
    setPlayMode(mode);
    setIsPlaying(true);
    setCurrentTime(startAtSeconds);
    activeSongIdRef.current = song?._id || null;
    lastTrackedPositionRef.current = startAtSeconds;
    pendingListenSecondsRef.current = 0;
    historyPendingSecondsRef.current = 0;
    pendingResumeSecondsRef.current = startAtSeconds;

    if (song?._id) {
      registerSongPlay(song._id);
      const initialPosition = Math.floor(startAtSeconds || 0);
      const initialDuration = Math.max(0, Math.floor(Number(song.duration || 0)));
      setContinueListening((prev) => {
        const withoutCurrent = prev.filter((entry) => String(entry.song?._id) !== String(song._id));
        return [{
          song,
          positionSeconds: initialPosition,
          durationSeconds: initialDuration,
          totalListenedSeconds: 0,
          completedCount: 0,
          progressPercent: initialDuration > 0 ? Math.min(100, Math.round((initialPosition / initialDuration) * 100)) : 0,
          lastPlayedAt: new Date().toISOString(),
        }, ...withoutCurrent].slice(0, 20);
      });
      setAllSongs((prev) => prev.map((item) => (
        item._id === song._id
          ? { ...item, playCount: Number(item.playCount || 0) + 1, lastPlayedAt: new Date().toISOString() }
          : item
      )));
    }
  };

  const handlePlaybackTimeUpdate = (time) => {
    setCurrentTime(time);

    const songId = activeSongIdRef.current;
    if (songId) {
      setContinueListening((prev) => prev.map((entry) => {
        if (String(entry.song?._id) !== String(songId)) return entry;
        const durationSeconds = Math.max(0, Math.floor(Number(audioRef.current?.duration || entry.durationSeconds || 0)));
        const positionSeconds = Math.max(0, Math.floor(Number(time || 0)));
        return {
          ...entry,
          positionSeconds,
          durationSeconds,
          progressPercent: durationSeconds > 0 ? Math.min(100, Math.round((positionSeconds / durationSeconds) * 100)) : 0,
          lastPlayedAt: new Date().toISOString(),
        };
      }));
    }

    if (!isPlaying || !songId) {
      lastTrackedPositionRef.current = time;
      return;
    }

    const delta = Number(time) - Number(lastTrackedPositionRef.current || 0);
    if (delta > 0 && delta < 5) {
      pendingListenSecondsRef.current += delta;
      historyPendingSecondsRef.current += delta;
      if (pendingListenSecondsRef.current >= 5) {
        flushPendingListenTime();
      }
      if (historyPendingSecondsRef.current >= 12) {
        flushPendingHistory();
      }
    }

    lastTrackedPositionRef.current = time;
  };

  const togglePlay = () => setIsPlaying(!isPlaying);
  const nextSong = () => {
    if (!playQueue.length || !allSongs.length) return;

    if (playMode === 'random') {
      const randomIndex = Math.floor(Math.random() * allSongs.length);
      playSong(allSongs[randomIndex], randomIndex, { queue: allSongs, mode: 'random' });
      return;
    }

    if (queueIndex < playQueue.length - 1) {
      const nextIndex = queueIndex + 1;
      playSong(playQueue[nextIndex], nextIndex, { queue: playQueue, mode: playMode });
      return;
    }

    if (playMode === 'album') {
      const randomIndex = Math.floor(Math.random() * allSongs.length);
      playSong(allSongs[randomIndex], randomIndex, { queue: allSongs, mode: 'random' });
    }
  };
  const prevSong = () => {
    if (!playQueue.length || playMode === 'random') return;
    if (queueIndex > 0) {
      const prevIndex = queueIndex - 1;
      playSong(playQueue[prevIndex], prevIndex, { queue: playQueue, mode: playMode });
    }
  };

  const openSongDetail = (song) => setSelectedSong(song);

  const openArtistProfile = async (artistId) => {
    try {
      const res = await fetch(`${API_URL}/artists/${artistId}`);
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'No se pudo abrir el perfil del artista');
      setArtistProfile({
        ...data,
        artist: normalizeArtistEntity(data.artist),
        songs: Array.isArray(data.songs) ? data.songs.map(normalizeSongEntity) : [],
        albums: Array.isArray(data.albums) ? data.albums.map(normalizeAlbumEntity) : [],
      });
      setActiveArtistTab('info');
      setView('artist');
    } catch (err) {
      console.error(err);
      alert('Error al cargar perfil del artista');
    }
  };

  const handleSaveSongChanges = async (songId, payload) => {
    try {
      const res = await fetch(`${API_URL}/songs/${songId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, userId: user._id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return alert(data.error || 'No se pudo guardar la cancion');

      const normalizedSong = normalizeSongEntity(data.song);
      setSelectedSong(normalizedSong);
      setCurrentSong((prev) => (prev && prev._id === songId ? normalizedSong : prev));
      setAllSongs((prev) => prev.map((song) => (song._id === songId ? normalizedSong : song)));
      setMySongs((prev) => prev.map((song) => (song._id === songId ? normalizedSong : song)));
      setPlaylists((prev) => prev.map((playlist) => ({
        ...playlist,
        songs: playlist.songs?.map((song) => (song._id === songId ? normalizedSong : song)),
      })));
      if (view === 'artist' && artistProfile?.artist?._id) await openArtistProfile(artistProfile.artist._id);
      alert('Cambios guardados');
    } catch (err) {
      console.error(err);
      alert('Error al guardar cambios');
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults({ artists: [], songs: [], albums: [] });
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    try {
      const params = new URLSearchParams({
        query: query,
        type: searchType,
        sort: searchSort,
        genre: searchGenre,
      });
      const res = await fetch(`${API_URL}/search-all?${params.toString()}`);
      const data = await res.json();
      if (res.ok) setSearchResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    if (view !== 'buscar') return;
    if (searchQuery.trim().length < 2) return;
    handleSearch(searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchType, searchSort, searchGenre]);

  const resetPlaylistForm = () => {
    setPlaylistForm({ id: null, name: '', description: '', coverUrl: '', songIds: [], isDefault: true });
    setPlaylistCoverFile(null);
  };

  const startEditPlaylist = (playlist) => {
    setPlaylistCoverFile(null);
    setPlaylistForm({
      id: playlist._id,
      name: playlist.name || '',
      description: playlist.description || '',
      coverUrl: playlist.coverUrl || '',
      songIds: playlist.songs?.map((song) => song._id) || [],
      isDefault: Boolean(playlist.isDefault),
    });
  };

  const togglePlaylistSong = (songId) => {
    setPlaylistForm((prev) => ({
      ...prev,
      songIds: prev.songIds.includes(songId)
        ? prev.songIds.filter((id) => id !== songId)
        : [...prev.songIds, songId],
    }));
  };

  const savePlaylist = async (e) => {
    e.preventDefault();
    if (!playlistForm.name.trim()) {
      alert('La playlist necesita nombre');
      return;
    }

    setPlaylistSaving(true);
    try {
      const endpoint = playlistForm.id
        ? `${API_URL}/admin/playlists/${playlistForm.id}`
        : `${API_URL}/admin/playlists`;
      const method = playlistForm.id ? 'PUT' : 'POST';

      const formData = new FormData();
      formData.append('requesterId', user._id);
      formData.append('name', playlistForm.name);
      formData.append('description', playlistForm.description || '');
      formData.append('coverUrl', playlistForm.coverUrl || '');
      formData.append('songIds', JSON.stringify(playlistForm.songIds || []));
      formData.append('isDefault', String(Boolean(playlistForm.isDefault)));
      if (playlistCoverFile) formData.append('cover', playlistCoverFile);

      const res = await fetch(endpoint, {
        method,
        body: formData,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || 'No se pudo guardar la playlist');
        return;
      }

      if (playlistForm.id) {
        setPlaylists((prev) => prev.map((playlist) => (playlist._id === data.playlist._id ? normalizePlaylistEntity(data.playlist) : playlist)));
      } else {
        setPlaylists((prev) => [normalizePlaylistEntity(data.playlist), ...prev]);
      }

      resetPlaylistForm();
      alert('Playlist guardada');
    } catch (err) {
      console.error(err);
      alert('Error al guardar playlist');
    } finally {
      setPlaylistSaving(false);
    }
  };

  const deletePlaylist = async (playlistId) => {
    const confirmed = await askConfirm('¿Eliminar esta playlist?', 'Eliminar playlist');
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/admin/playlists/${playlistId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: user._id }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || 'No se pudo eliminar la playlist');
        return;
      }

      setPlaylists((prev) => prev.filter((playlist) => playlist._id !== playlistId));
      if (selectedPlaylist?._id === playlistId) {
        setSelectedPlaylist(null);
      }
      if (playlistForm.id === playlistId) {
        resetPlaylistForm();
      }
    } catch (err) {
      console.error(err);
      alert('Error al eliminar playlist');
    }
  };

  // ========== ALBUMS ==========
  const resetAlbumForm = () => {
    setAlbumForm({ id: null, title: '', description: '', coverUrl: '', songIds: [] });
  };

  // eslint-disable-next-line no-unused-vars
  const startEditAlbum = (album) => {
    setAlbumForm({
      id: album._id,
      title: album.title || '',
      description: album.description || '',
      coverUrl: album.coverUrl || '',
      songIds: album.songs?.map((song) => song._id) || [],
    });
  };

  // eslint-disable-next-line no-unused-vars
  const toggleAlbumSong = (songId) => {
    setAlbumForm((prev) => ({
      ...prev,
      songIds: prev.songIds.includes(songId)
        ? prev.songIds.filter((id) => id !== songId)
        : [...prev.songIds, songId],
    }));
  };

  // eslint-disable-next-line no-unused-vars
  const saveAlbum = async (e) => {
    e.preventDefault();
    if (!albumForm.title.trim()) {
      alert('El álbum necesita título');
      return;
    }

    setAlbumSaving(true);
    try {
      const endpoint = albumForm.id
        ? `${API_URL}/albums/${albumForm.id}`
        : `${API_URL}/albums`;
      const method = albumForm.id ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user._id,
          title: albumForm.title,
          description: albumForm.description,
          coverUrl: albumForm.coverUrl,
          songIds: albumForm.songIds,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || 'No se pudo guardar el álbum');
        return;
      }

      if (albumForm.id) {
        setAlbums((prev) => prev.map((album) => (album._id === data.album._id ? data.album : album)));
      } else {
        setAlbums((prev) => [data.album, ...prev]);
      }

      resetAlbumForm();
      alert('Álbum guardado');
    } catch (err) {
      console.error(err);
      alert('Error al guardar álbum');
    } finally {
      setAlbumSaving(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const deleteAlbum = async (albumId) => {
    const confirmed = await askConfirm('¿Eliminar este álbum?', 'Eliminar álbum');
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/albums/${albumId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || 'No se pudo eliminar el álbum');
        return;
      }

      setAlbums((prev) => prev.filter((album) => album._id !== albumId));
      if (selectedAlbum?._id === albumId) {
        setSelectedAlbum(null);
      }
      if (albumForm.id === albumId) {
        resetAlbumForm();
      }
    } catch (err) {
      console.error(err);
      alert('Error al eliminar álbum');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSettingsLoading(true);
    try {
      const formData = new FormData();
      formData.append('bio', settingsBio || '');
      const sanitizedInstagramHandle = String(settingsInstagramHandle || '')
        .trim()
        .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
        .replace(/^@+/, '')
        .split(/[/?#]/)[0]
        .trim();
      formData.append('instagramHandle', sanitizedInstagramHandle);
      if (settingsPic) formData.append('profilePic', settingsPic);

      const res = await fetch(`${API_URL}/users/${user._id}/profile`, {
        method: 'PUT',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return alert(data.error || 'No se pudo actualizar tu perfil');

      setUser(normalizeArtistEntity(data.user));
  setSettingsInstagramHandle(data.user?.instagramHandle || sanitizedInstagramHandle || '');
      setSettingsPic(null);
      alert('Perfil actualizado');
    } catch (err) {
      console.error(err);
      alert('Error al actualizar perfil');
    } finally {
      setSettingsLoading(false);
    }
  };

  const refreshOwnProfile = async (silent = false) => {
    if (!user?._id) return;
    try {
      const res = await fetch(`${API_URL}/users/${user._id}/profile`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (!silent) alert(data.error || 'No se pudo refrescar el perfil');
        return;
      }
      setUser(normalizeArtistEntity(data.user));
    } catch (err) {
      console.error(err);
      if (!silent) alert('Error al refrescar perfil');
    }
  };

  const checkInstagramServerConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/health/instagram-config`);
      const data = await res.json().catch(() => ({}));
      const configured = Boolean(data?.instagram?.configured ?? data?.ok);
      const missing = Array.isArray(data?.instagram?.missing) ? data.instagram.missing : [];
      setInstagramConfig({ checked: true, configured, missing });
    } catch (_) {
      setInstagramConfig({ checked: true, configured: true, missing: [] });
    }
  };

  const connectInstagram = async () => {
    if (!user?._id) return;
    if (instagramConfig.checked && !instagramConfig.configured) {
      const missing = instagramConfig.missing?.length ? ` (${instagramConfig.missing.join(', ')})` : '';
      alert(`La sincronización automática de Instagram no está habilitada en el servidor${missing}.\n\nPuedes guardar tu @usuario manualmente en este mismo panel y se mostrará en tu perfil.`);
      return;
    }
    setInstagramActionLoading(true);
    try {
      const frontend = encodeURIComponent(window.location.origin);
      const res = await fetch(`${API_URL}/users/${user._id}/instagram/connect-url?requesterId=${user._id}&frontend=${frontend}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        alert(data.error || 'No se pudo iniciar conexión con Instagram');
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      alert('Error al conectar Instagram');
    } finally {
      setInstagramActionLoading(false);
    }
  };

  const syncInstagramNow = async () => {
    if (!user?._id) return;
    setInstagramActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/${user._id}/instagram/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: user._id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'No se pudo sincronizar Instagram');
        return;
      }
      setUser(normalizeArtistEntity(data.user));
      showToast('Instagram sincronizado', 'success');
    } catch (err) {
      console.error(err);
      alert('Error al sincronizar Instagram');
    } finally {
      setInstagramActionLoading(false);
    }
  };

  const disconnectInstagram = async () => {
    if (!user?._id) return;
    const confirmed = await askConfirm('¿Desvincular Instagram de tu perfil?', 'Desvincular Instagram');
    if (!confirmed) return;

    setInstagramActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/${user._id}/instagram/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: user._id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'No se pudo desvincular Instagram');
        return;
      }
      await refreshOwnProfile(true);
      showToast('Instagram desvinculado', 'success');
    } catch (err) {
      console.error(err);
      alert('Error al desvincular Instagram');
    } finally {
      setInstagramActionLoading(false);
    }
  };

  const handleChangeOwnPassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      alert('Completa todos los campos de contraseña');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      alert('La nueva contraseña y la confirmación no coinciden');
      return;
    }

    if (String(newPassword).length < 6) {
      alert('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    setSettingsLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/${user._id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: user._id,
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'No se pudo cambiar la contraseña');
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      showToast('Contraseña actualizada', 'success');
    } catch (err) {
      console.error(err);
      alert('Error al cambiar la contraseña');
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchMembers = async () => {
    if (!user?._id) return;
    setMembersLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/users?requesterId=${user._id}`);
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        alert(data.error || 'No se pudo cargar miembros');
        return;
      }
      setMembers(data);
    } catch (err) {
      console.error(err);
      alert('Error al cargar miembros');
    } finally {
      setMembersLoading(false);
    }
  };

  const updateMemberRole = async (memberId, role) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${memberId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: user._id, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'No se pudo actualizar el rol');
        return;
      }

      setMembers((prev) => prev.map((m) => (m._id === memberId ? { ...m, role } : m)));
      if (user._id === memberId) {
        setUser((prev) => ({ ...prev, role }));
      }
    } catch (err) {
      console.error(err);
      alert('Error al actualizar rol');
    }
  };

  const updateMemberUsername = async (memberId) => {
    const username = String(memberUsernameDrafts[memberId] || '').trim();
    if (!username) {
      alert('Escribe un nombre de usuario válido');
      return;
    }

    setMemberActionLoading((prev) => ({ ...prev, [memberId]: true }));
    try {
      const res = await fetch(`${API_URL}/admin/users/${memberId}/username`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: user._id, username }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'No se pudo cambiar el nombre de usuario');
        return;
      }

      setMembers((prev) => prev.map((m) => (
        m._id === memberId ? { ...m, username: data.user?.username || username } : m
      )));
      setMemberUsernameDrafts((prev) => ({
        ...prev,
        [memberId]: data.user?.username || username,
      }));

      if (user._id === memberId) {
        setUser((prev) => ({ ...prev, username: data.user?.username || username }));
      }

      alert('Nombre de usuario actualizado');
    } catch (err) {
      console.error(err);
      alert('Error al cambiar nombre de usuario');
    } finally {
      setMemberActionLoading((prev) => ({ ...prev, [memberId]: false }));
    }
  };

  const resetMemberPassword = async (memberId) => {
    const newPassword = memberPasswordDrafts[memberId] || '';
    const confirmPassword = memberPasswordConfirmDrafts[memberId] || '';

    if (!newPassword || !confirmPassword) {
      alert('Escribe y confirma la nueva contraseña');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }

    setMemberActionLoading((prev) => ({ ...prev, [memberId]: true }));
    try {
      const res = await fetch(`${API_URL}/admin/users/${memberId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: user._id, newPassword }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || 'No se pudo restablecer la contraseña');
        return;
      }

      setMemberPasswordDrafts((prev) => ({ ...prev, [memberId]: '' }));
      setMemberPasswordConfirmDrafts((prev) => ({ ...prev, [memberId]: '' }));
      alert('Contraseña restablecida');
    } catch (err) {
      console.error(err);
      alert('Error al restablecer contraseña');
    } finally {
      setMemberActionLoading((prev) => ({ ...prev, [memberId]: false }));
    }
  };

  const deleteMemberAccount = async (memberId) => {
    const confirmed = await askConfirm('¿Seguro que quieres eliminar esta cuenta y sus canciones?', 'Eliminar cuenta');
    if (!confirmed) return;

    setMemberActionLoading((prev) => ({ ...prev, [memberId]: true }));
    try {
      const res = await fetch(`${API_URL}/admin/users/${memberId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: user._id }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || 'No se pudo eliminar la cuenta');
        return;
      }

      setMembers((prev) => prev.filter((member) => member._id !== memberId));
      setAllSongs((prev) => prev.filter((song) => !data.deletedSongIds?.includes(song._id)));
      setMySongs((prev) => prev.filter((song) => !data.deletedSongIds?.includes(song._id)));
      setPlaylists((prev) => prev
        .filter((playlist) => String(playlist.creator?._id || playlist.creator) !== String(memberId))
        .map((playlist) => ({
          ...playlist,
          songs: playlist.songs?.filter((song) => !data.deletedSongIds?.includes(song._id)),
        })));

      if (selectedSong && data.deletedSongIds?.includes(selectedSong._id)) {
        setSelectedSong(null);
      }

      if (currentSong && data.deletedSongIds?.includes(currentSong._id)) {
        setCurrentSong(null);
        setIsPlaying(false);
      }

      if (artistProfile?.artist?._id === memberId) {
        setArtistProfile(null);
        setView('admin');
      }

      setMemberPasswordDrafts((prev) => {
        const next = { ...prev };
        delete next[memberId];
        return next;
      });
      setMemberPasswordConfirmDrafts((prev) => {
        const next = { ...prev };
        delete next[memberId];
        return next;
      });
      setMemberUsernameDrafts((prev) => {
        const next = { ...prev };
        delete next[memberId];
        return next;
      });

      alert('Cuenta eliminada');
    } catch (err) {
      console.error(err);
      alert('Error al eliminar cuenta');
    } finally {
      setMemberActionLoading((prev) => ({ ...prev, [memberId]: false }));
    }
  };

  const handleDeleteSong = async (songId) => {
    const confirmed = await askConfirm('¿Seguro que quieres eliminar esta canción?', 'Eliminar canción');
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/songs/${songId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || 'No se pudo eliminar la canción');
        return;
      }

      if (selectedSong?._id === songId) {
        setSelectedSong(null);
      }

      setAllSongs((prev) => prev.filter((song) => song._id !== songId));
      setMySongs((prev) => prev.filter((song) => song._id !== songId));
      setPlaylists((prev) => prev.map((playlist) => ({
        ...playlist,
        songs: playlist.songs?.filter((song) => song._id !== songId),
      })));
      if (artistProfile?.artist?._id) {
        await openArtistProfile(artistProfile.artist._id);
      }
      alert('Canción eliminada');
    } catch (err) {
      console.error(err);
      alert('Error al eliminar canción');
    }
  };

  const unreadNotifications = notifications.filter((item) => !item.read).length;

  const handleNotificationClick = (notification) => {
    if (!notification?.action?.id) return;

    if (notification.action.type === 'song') {
      const song = allSongs.find((item) => String(item._id) === String(notification.action.id));
      if (song) {
        setSelectedSong(song);
        setView('inicio');
      }
    }

    if (notification.action.type === 'album') {
      const album = albums.find((item) => String(item._id) === String(notification.action.id));
      if (album) {
        setSelectedAlbum(album);
        setView('inicio');
      }
    }

    setIsNotificationsOpen(false);
  };

  if (!user) {
    return (
      <Login
        onLogin={(userData, token) => {
            setUser(normalizeArtistEntity(userData));
          setAuthToken(token || '');
        }}
      />
    );
  }

  return (
    <Layout
      setView={setView}
      user={user}
      view={view}
      setModalOpen={setIsModalOpen}
      currentSong={currentSong}
      isPlaying={isPlaying}
      togglePlay={togglePlay}
      nextSong={nextSong}
      prevSong={prevSong}
      volume={volume}
      setVolume={setVolume}
      currentTime={currentTime}
      duration={duration}
      audioRef={audioRef}
      onTimeUpdate={handlePlaybackTimeUpdate}
      onDurationChange={(dur) => {
        setDuration(dur);
        const pending = Number(pendingResumeSecondsRef.current || 0);
        if (!audioRef.current || pending <= 0 || !Number.isFinite(dur) || dur <= 0) return;
        const nextTime = Math.min(Math.max(0, pending), Math.max(0, dur - 1));
        audioRef.current.currentTime = nextTime;
        setCurrentTime(nextTime);
        lastTrackedPositionRef.current = nextTime;
        pendingResumeSecondsRef.current = 0;
      }}
      onSongEnd={handleSongEnd}
      onOpenArtist={openArtistProfile}
      unreadNotifications={unreadNotifications}
      onToggleNotifications={() => setIsNotificationsOpen((prev) => !prev)}
    >
      {view === 'inicio' && (
        <div className="animate-in fade-in duration-700">
          <h1 className="text-3xl sm:text-4xl md:text-7xl font-black mb-4 md:mb-8 tracking-tighter uppercase italic leading-tight">
            EXPLORA EL <span className="text-yellow-400 font-black">SONIDO</span>
          </h1>

          <section className="mb-10 md:mb-14">
            <div className="flex items-center justify-between mb-4 md:mb-6 gap-3">
              <h3 className="text-xl md:text-3xl font-black tracking-tight">Discovery Feed</h3>
              <button
                type="button"
                onClick={() => fetchDiscoveryFeed(user._id)}
                className="inline-flex items-center gap-2 text-xs md:text-sm text-yellow-300 font-bold"
              >
                <Compass size={16} /> Refrescar
              </button>
            </div>

            {discoveryLoading ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-gray-400">Cargando discovery...</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-5">
                <div className="bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl p-3 md:p-4">
                  <p className="text-[10px] font-black text-yellow-300 uppercase tracking-[0.2em] mb-3">Para ti</p>
                  <div className="space-y-2">
                    {(discoveryFeed.forYouSongs || []).slice(0, 5).map((song) => {
                      const idx = allSongs.findIndex((item) => String(item._id) === String(song._id));
                      return (
                        <button
                          key={song._id}
                          type="button"
                          onClick={() => {
                            const queue = idx >= 0 ? allSongs : [song, ...allSongs.filter((item) => String(item._id) !== String(song._id))];
                            playSong(song, idx >= 0 ? idx : 0, { queue, mode: 'all' });
                          }}
                          className="w-full flex items-center gap-3 text-left p-2 rounded-xl hover:bg-white/10 transition-all"
                        >
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-black/40 flex-shrink-0">
                            {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Disc size={14} className="text-yellow-400/40" /></div>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold truncate">{song.title}</p>
                            <p className="text-[10px] text-gray-400 uppercase truncate">{song.artist?.username || 'Artista'}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl p-3 md:p-4">
                  <p className="text-[10px] font-black text-yellow-300 uppercase tracking-[0.2em] mb-3">Trending</p>
                  <div className="space-y-2">
                    {(discoveryFeed.trendingSongs || []).slice(0, 5).map((song) => {
                      const idx = allSongs.findIndex((item) => String(item._id) === String(song._id));
                      return (
                        <button
                          key={song._id}
                          type="button"
                          onClick={() => {
                            const queue = idx >= 0 ? allSongs : [song, ...allSongs.filter((item) => String(item._id) !== String(song._id))];
                            playSong(song, idx >= 0 ? idx : 0, { queue, mode: 'all' });
                          }}
                          className="w-full flex items-center gap-3 text-left p-2 rounded-xl hover:bg-white/10 transition-all"
                        >
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-black/40 flex-shrink-0">
                            {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Disc size={14} className="text-yellow-400/40" /></div>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold truncate">{song.title}</p>
                            <p className="text-[10px] text-gray-400 uppercase truncate">{song.artist?.username || 'Artista'}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl p-3 md:p-4">
                  <p className="text-[10px] font-black text-yellow-300 uppercase tracking-[0.2em] mb-3">Álbumes nuevos</p>
                  <div className="space-y-2">
                    {(discoveryFeed.freshAlbums || []).slice(0, 4).map((album) => (
                      <button
                        key={album._id}
                        type="button"
                        onClick={() => setSelectedAlbum(album)}
                        className="w-full flex items-center gap-3 text-left p-2 rounded-xl hover:bg-white/10 transition-all"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/40 flex-shrink-0">
                          {album.coverUrl ? <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Disc size={14} className="text-yellow-400/40" /></div>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold truncate">{album.title}</p>
                          <p className="text-[10px] text-gray-400 uppercase truncate">{album.artist?.username || 'Artista'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl p-3 md:p-4">
                  <p className="text-[10px] font-black text-yellow-300 uppercase tracking-[0.2em] mb-3">Playlists recomendadas</p>
                  <div className="space-y-2">
                    {(discoveryFeed.playlists || []).slice(0, 4).map((playlist) => (
                      <button
                        key={playlist._id}
                        type="button"
                        onClick={() => setSelectedPlaylist(playlist)}
                        className="w-full flex items-center gap-3 text-left p-2 rounded-xl hover:bg-white/10 transition-all"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/40 flex-shrink-0">
                          {playlist.coverUrl ? <img src={playlist.coverUrl} alt={playlist.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Disc size={14} className="text-yellow-400/40" /></div>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold truncate">{playlist.name}</p>
                          <p className="text-[10px] text-gray-400 uppercase truncate">{playlist.songs?.length || 0} canciones</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="mb-10 md:mb-14">
            <div className="flex items-center justify-between mb-4 md:mb-6 gap-3">
              <h3 className="text-xl md:text-3xl font-black tracking-tight">Tus favoritos</h3>
              <span className="text-xs md:text-sm text-gray-400 font-bold">{likedSongIds.length + likedAlbumIds.length + likedPlaylistIds.length} guardados</span>
            </div>

            {(favoriteLibrary.songs?.length || favoriteLibrary.albums?.length || favoriteLibrary.playlists?.length) ? (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl p-3 md:p-4">
                  <p className="text-xs font-black text-pink-300 uppercase tracking-[0.2em] mb-4">Canciones</p>
                  <div className="space-y-2">
                    {(favoriteLibrary.songs || []).slice(0, 4).map((song) => {
                      const idx = allSongs.findIndex((item) => String(item._id) === String(song._id));
                      return (
                        <div key={song._id} className="flex items-center gap-3 bg-black/30 border border-white/10 rounded-2xl p-2">
                          <button
                            type="button"
                            onClick={() => {
                              const queue = idx >= 0 ? allSongs : [song, ...allSongs.filter((item) => String(item._id) !== String(song._id))];
                              const startIndex = idx >= 0 ? idx : 0;
                              playSong(song, startIndex, { queue, mode: 'all' });
                            }}
                            className="w-10 h-10 rounded-lg overflow-hidden bg-black/40 flex-shrink-0"
                          >
                            {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Disc size={16} className="text-yellow-400/40" /></div>}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold truncate">{song.title}</p>
                            <p className="text-[10px] text-gray-400 uppercase truncate">{song.artist?.username || 'Artista'}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleFavorite('song', song._id)}
                            className="w-8 h-8 rounded-lg border border-pink-300/40 text-pink-300 bg-pink-500/10 flex items-center justify-center"
                          >
                            <Heart size={14} fill="currentColor" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl p-3 md:p-4">
                  <p className="text-xs font-black text-pink-300 uppercase tracking-[0.2em] mb-4">Álbumes</p>
                  <div className="space-y-2">
                    {(favoriteLibrary.albums || []).slice(0, 4).map((album) => (
                      <div key={album._id} className="flex items-center gap-3 bg-black/30 border border-white/10 rounded-2xl p-2">
                        <button
                          type="button"
                          onClick={() => setSelectedAlbum(album)}
                          className="w-10 h-10 rounded-lg overflow-hidden bg-black/40 flex-shrink-0"
                        >
                          {album.coverUrl ? <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Disc size={16} className="text-yellow-400/40" /></div>}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold truncate">{album.title}</p>
                          <p className="text-[10px] text-gray-400 uppercase truncate">{album.artist?.username || 'Artista'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleFavorite('album', album._id)}
                          className="w-8 h-8 rounded-lg border border-pink-300/40 text-pink-300 bg-pink-500/10 flex items-center justify-center"
                        >
                          <Heart size={14} fill="currentColor" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl p-3 md:p-4">
                  <p className="text-xs font-black text-pink-300 uppercase tracking-[0.2em] mb-4">Playlists</p>
                  <div className="space-y-2">
                    {(favoriteLibrary.playlists || []).slice(0, 4).map((playlist) => (
                      <div key={playlist._id} className="flex items-center gap-3 bg-black/30 border border-white/10 rounded-2xl p-2">
                        <button
                          type="button"
                          onClick={() => setSelectedPlaylist(playlist)}
                          className="w-10 h-10 rounded-lg overflow-hidden bg-black/40 flex-shrink-0"
                        >
                          {playlist.coverUrl ? <img src={playlist.coverUrl} alt={playlist.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Disc size={16} className="text-yellow-400/40" /></div>}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold truncate">{playlist.name}</p>
                          <p className="text-[10px] text-gray-400 uppercase truncate">{playlist.songs?.length || 0} canciones</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleFavorite('playlist', playlist._id)}
                          className="w-8 h-8 rounded-lg border border-pink-300/40 text-pink-300 bg-pink-500/10 flex items-center justify-center"
                        >
                          <Heart size={14} fill="currentColor" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Todavía no guardaste favoritos. Usa el corazón en canciones, álbumes y playlists.</p>
            )}
          </section>

          <section className="mb-10 md:mb-14">
            <div className="flex items-center justify-between mb-4 md:mb-6 gap-3">
              <h3 className="text-xl md:text-3xl font-black tracking-tight">Continuar escuchando</h3>
              <Clock3 size={18} className="text-yellow-300" />
            </div>

            {continueListening.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {continueListening.slice(0, 6).map((entry) => {
                  const song = entry.song;
                  const idx = allSongs.findIndex((item) => String(item._id) === String(song?._id));
                  return (
                    <button
                      key={`${song?._id}-${entry.lastPlayedAt}`}
                      onClick={() => {
                        if (!song?._id) return;
                        const queue = idx >= 0 ? allSongs : [song, ...allSongs.filter((item) => String(item._id) !== String(song._id))];
                        const startIndex = idx >= 0 ? idx : 0;
                        playSong(song, startIndex, {
                          queue,
                          mode: 'all',
                          startAtSeconds: Number(entry.positionSeconds || 0),
                        });
                      }}
                      className="text-left bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/40 flex-shrink-0">
                          {song?.coverUrl ? <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Disc size={18} className="text-yellow-400/40" /></div>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold truncate">{song?.title || 'Canción'}</p>
                          <p className="text-[10px] text-gray-400 uppercase truncate">{song?.artist?.username || 'Artista'}</p>
                        </div>
                        <Play size={16} className="text-yellow-300" />
                      </div>
                      <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400" style={{ width: `${Math.max(0, Math.min(100, Number(entry.progressPercent || 0)))}%` }} />
                      </div>
                      <p className="mt-2 text-[10px] text-gray-400 uppercase tracking-widest">{Math.max(0, Math.floor(Number(entry.positionSeconds || 0)))}s de {Math.max(0, Math.floor(Number(entry.durationSeconds || 0)))}s</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Cuando escuches canciones, aquí aparecerán para retomarlas desde donde te quedaste.</p>
            )}
          </section>

          <section className="mb-10 md:mb-14">
            <div className="flex items-center justify-between mb-4 md:mb-6 gap-3">
              <h3 className="text-xl md:text-3xl font-black tracking-tight">Especialmente para ti</h3>
              {featuredPlaylists.length > homeVisibleCards ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => shiftFeaturedCarousel(-1)}
                    disabled={featuredCarouselIndex === 0}
                    className="w-9 h-9 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-300 hover:-translate-y-0.5"
                    aria-label="Anterior playlists"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => shiftFeaturedCarousel(1)}
                    disabled={featuredCarouselIndex >= maxFeaturedIndex}
                    className="w-9 h-9 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-300 hover:-translate-y-0.5"
                    aria-label="Siguiente playlists"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              ) : (
                <span className="text-xs md:text-sm text-gray-400 font-bold">{featuredPlaylists.length} visibles</span>
              )}
            </div>

            <div className="carousel-viewport">
              <div
                key={`featured-${featuredMotionTick}`}
                className={`grid gap-4 md:gap-6 carousel-page-enter ${featuredMotionDirection === 'next' ? 'carousel-page-next' : 'carousel-page-prev'}`}
                style={{ gridTemplateColumns: `repeat(${Math.max(1, homeVisibleCards)}, minmax(0, 1fr))` }}
              >
                {visibleFeaturedPlaylists.map((playlist, cardIndex) => (
                <button
                  key={playlist._id}
                  onClick={() => setSelectedPlaylist(playlist)}
                  className="text-left bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl overflow-hidden hover:bg-white/10 transition-all duration-500 hover:-translate-y-1 carousel-card-enter"
                  style={{ animationDelay: `${cardIndex * 55}ms` }}
                >
                  <div className="aspect-square bg-black/30 overflow-hidden">
                    {playlist.coverUrl ? (
                      <img src={playlist.coverUrl} alt={playlist.name} className="w-full h-full object-cover" />
                    ) : playlist.songs?.[0]?.coverUrl ? (
                      <img src={playlist.songs[0].coverUrl} alt={playlist.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500 via-pink-500 to-purple-500">
                        <Disc size={52} className="text-white/80" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-black text-lg md:text-2xl leading-tight mb-2">{playlist.name}</p>
                    <p className="text-gray-400 text-sm line-clamp-2">{playlist.description || 'Playlist oficial de RTN Music'}</p>
                  </div>
                </button>
                ))}
              </div>
            </div>
          </section>

          <section className="mb-10 md:mb-14">
            <div className="flex items-center justify-between mb-4 md:mb-6 gap-3">
              <h3 className="text-xl md:text-3xl font-black tracking-tight">Álbumes</h3>
              {albums.length > homeVisibleCards ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => shiftAlbumsCarousel(-1)}
                    disabled={albumsCarouselIndex === 0}
                    className="w-9 h-9 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-300 hover:-translate-y-0.5"
                    aria-label="Anterior álbumes"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => shiftAlbumsCarousel(1)}
                    disabled={albumsCarouselIndex >= maxAlbumsIndex}
                    className="w-9 h-9 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-300 hover:-translate-y-0.5"
                    aria-label="Siguiente álbumes"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              ) : (
                <span className="text-xs md:text-sm text-gray-400 font-bold">{albums.length} visibles</span>
              )}
            </div>

            {albums.length > 0 ? (
              <div className="carousel-viewport">
                <div
                  key={`albums-${albumsMotionTick}`}
                  className={`grid gap-4 md:gap-6 carousel-page-enter ${albumsMotionDirection === 'next' ? 'carousel-page-next' : 'carousel-page-prev'}`}
                  style={{ gridTemplateColumns: `repeat(${Math.max(1, homeVisibleCards)}, minmax(0, 1fr))` }}
                >
                  {visibleAlbums.map((album, cardIndex) => (
                  <button
                    key={album._id}
                    onClick={() => setSelectedAlbum(album)}
                    className={`text-left bg-gradient-to-br ${getAlbumThemeGradient(album)} rounded-2xl md:rounded-3xl overflow-hidden hover:scale-105 transition-all duration-500 shadow-lg hover:-translate-y-1 carousel-card-enter`}
                    style={{ animationDelay: `${cardIndex * 55}ms` }}
                  >
                    <div className="aspect-square bg-black/20 overflow-hidden flex items-center justify-center relative">
                      {album.coverUrl ? (
                        <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover" />
                      ) : (
                        <Disc size={64} className="text-white/40" />
                      )}
                    </div>
                    <div className="p-4 bg-black/40 backdrop-blur-sm">
                      <p className="font-black text-lg md:text-2xl leading-tight mb-2 text-white">{album.title}</p>
                      <p className="text-white/70 text-sm">{album.artist?.username || 'Artista'}</p>
                      <p className="text-white/50 text-xs mt-2">{album.songs?.length || 0} canciones • {album.releaseYear || new Date(album.releaseDate).getFullYear()}</p>
                        <p className="text-yellow-300/90 text-[10px] mt-1 font-bold uppercase tracking-widest">{formatPlayCount(getAlbumPlayCount(album))} reproducciones</p>
                    </div>
                  </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No hay álbumes aún.</p>
            )}
          </section>

          <section className="mb-10 md:mb-14">
            <div className="flex items-center justify-between mb-4 md:mb-6 gap-3">
              <h3 className="text-xl md:text-3xl font-black tracking-tight">Artistas</h3>
              {allArtistsForHome.length > homeVisibleCards ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => shiftArtistsCarousel(-1)}
                    disabled={artistsCarouselIndex === 0}
                    className="w-9 h-9 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-300 hover:-translate-y-0.5"
                    aria-label="Anterior artistas"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => shiftArtistsCarousel(1)}
                    disabled={artistsCarouselIndex >= maxArtistsIndex}
                    className="w-9 h-9 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-300 hover:-translate-y-0.5"
                    aria-label="Siguiente artistas"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              ) : (
                <span className="text-xs md:text-sm text-gray-400 font-bold">{allArtistsForHome.length} visibles</span>
              )}
            </div>

            {allArtistsForHome.length > 0 ? (
              <div className="carousel-viewport">
                <div
                  key={`artists-${artistsMotionTick}`}
                  className={`grid gap-4 md:gap-6 carousel-page-enter ${artistsMotionDirection === 'next' ? 'carousel-page-next' : 'carousel-page-prev'}`}
                  style={{ gridTemplateColumns: `repeat(${Math.max(1, homeVisibleCards)}, minmax(0, 1fr))` }}
                >
                  {visibleArtistsForHome.map((artist, cardIndex) => (
                  <button
                    key={artist._id}
                    onClick={() => openArtistProfile(artist._id)}
                    className="text-left bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl p-4 hover:bg-white/10 transition-all duration-500 hover:-translate-y-1 carousel-card-enter"
                    style={{ animationDelay: `${cardIndex * 55}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-yellow-400/20 flex-shrink-0 flex items-center justify-center">
                        {artist.profilePic ? (
                          <img src={artist.profilePic} alt={artist.username} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-yellow-300 text-lg font-black">{artist.username?.charAt(0)?.toUpperCase() || '?'}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-lg truncate">{artist.username || 'Artista'}</p>
                        <p className="text-[10px] text-yellow-300 uppercase font-bold tracking-widest">{artist.role || 'artist'}</p>
                      </div>
                    </div>
                  </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No hay artistas aún.</p>
            )}
          </section>

          <section className="mt-12">
            <div className="flex items-center justify-between mb-4 md:mb-6 gap-3">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em]">Novedades en la Crew</h3>
              {allSongs.length > crewSongsPageSize ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => shiftCrewSongsPage(-1)}
                    disabled={crewSongsPage === 0}
                    className="w-9 h-9 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-300 hover:-translate-y-0.5"
                    aria-label="Página anterior novedades"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => shiftCrewSongsPage(1)}
                    disabled={crewSongsPage >= maxCrewSongsPage}
                    className="w-9 h-9 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-300 hover:-translate-y-0.5"
                    aria-label="Página siguiente novedades"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              ) : null}
            </div>
            <div className="carousel-viewport">
              <div
                key={`crew-${crewMotionTick}`}
                className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 carousel-page-enter ${crewMotionDirection === 'next' ? 'carousel-page-next' : 'carousel-page-prev'}`}
              >
                {visibleCrewSongs.length > 0 ? (
                  visibleCrewSongs.map((song, cardIndex) => {
                  const idx = allSongs.findIndex((item) => String(item._id) === String(song._id));
                  return (
                      <div key={song._id} className="carousel-card-enter" style={{ animationDelay: `${cardIndex * 45}ms` }}>
                        <CrewSongCard
                          song={song}
                          onOpen={() => openSongDetail(song)}
                          onPlay={() => playSong(song, idx >= 0 ? idx : 0)}
                          onOpenArtist={(artistId) => openArtistProfile(artistId)}
                        />
                      </div>
                  );
                  })
                ) : (
                  <p className="text-gray-500 text-sm">No hay canciones publicadas aun.</p>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {view === 'buscar' && (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          <input
            type="text"
            value={searchQuery}
            placeholder="Busca artistas o canciones"
            className="w-full bg-white/5 border border-white/10 p-4 md:p-6 rounded-[30px] text-lg md:text-2xl outline-none focus:border-yellow-400 transition-all mb-6 md:mb-10 font-bold"
            onChange={(e) => handleSearch(e.target.value)}
          />

          <div className="flex flex-col md:flex-row gap-3 mb-8">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold uppercase"
            >
              <option value="all">Todo</option>
              <option value="songs">Solo canciones</option>
              <option value="artists">Solo artistas</option>
              <option value="albums">Solo álbumes</option>
            </select>
            <select
              value={searchGenre}
              onChange={(e) => setSearchGenre(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold uppercase"
            >
              <option value="all">Todos los géneros</option>
              {SONG_GENRE_OPTIONS.map((genreOption) => (
                <option key={genreOption.value} value={genreOption.value}>{genreOption.label}</option>
              ))}
            </select>
            <select
              value={searchSort}
              onChange={(e) => setSearchSort(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold uppercase"
            >
              <option value="recent">Más reciente</option>
              <option value="popular">Más popular</option>
            </select>
          </div>

          {searchLoading && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 text-sm text-yellow-300 font-bold">
              Buscando resultados...
            </div>
          )}

          <div className="space-y-10">
            <section>
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] mb-5">Canciones</h3>
              <div className="space-y-3">
                {searchResults.songs?.length ? (
                  searchResults.songs.map((song) => {
                    const idx = allSongs.findIndex((item) => item._id === song._id);
                    return (
                      <SongRow
                        key={song._id}
                        song={song}
                        onRowClick={() => openSongDetail(song)}
                        onPlay={(e) => {
                          e.stopPropagation();
                          playSong(song, idx >= 0 ? idx : 0);
                        }}
                        onArtistClick={(e) => {
                          e.stopPropagation();
                          if (song.artist?._id) openArtistProfile(song.artist._id);
                        }}
                        onCollaboratorClick={(id) => openArtistProfile(id)}
                        onToggleLike={(songId) => toggleFavorite('song', songId)}
                        isLiked={likedSongSet.has(String(song._id))}
                      />
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-sm">No se encontraron canciones.</p>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] mb-5">Artistas</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {searchResults.artists?.length ? (
                  searchResults.artists.map((artist) => (
                    <button
                      key={artist._id}
                      onClick={() => openArtistProfile(artist._id)}
                      className="bg-white/5 p-6 rounded-[35px] border border-white/5 hover:bg-white/10 transition group text-center"
                    >
                      <div className="w-24 h-24 bg-yellow-400 rounded-full mx-auto mb-4 overflow-hidden border-4 border-black group-hover:scale-105 transition-transform">
                        {artist.profilePic ? <img src={artist.profilePic} alt="pic" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-black font-black">{artist.username?.charAt(0).toUpperCase()}</div>}
                      </div>
                      <h3 className="font-black uppercase italic truncate">{artist.username}</h3>
                      <p className="text-[10px] text-yellow-400 font-bold tracking-widest uppercase truncate">{artist.role}</p>
                    </button>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm col-span-full">No se encontraron artistas.</p>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] mb-5">Álbumes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {searchResults.albums?.length ? (
                  searchResults.albums.map((album) => (
                    <button
                      key={album._id}
                      onClick={() => setSelectedAlbum(album)}
                      className={`text-left bg-gradient-to-br ${getAlbumThemeGradient(album)} rounded-3xl overflow-hidden hover:scale-105 transition-all shadow-lg`}
                    >
                      <div className="aspect-square bg-black/20 overflow-hidden flex items-center justify-center">
                        {album.coverUrl ? (
                          <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover" />
                        ) : (
                          <Disc size={48} className="text-white/40" />
                        )}
                      </div>
                      <div className="p-4 bg-black/40 backdrop-blur-sm">
                        <p className="font-black text-lg leading-tight mb-1 text-white truncate">{album.title}</p>
                        <p className="text-white/70 text-xs">{album.artist?.username || 'Artista'} • {album.releaseYear || new Date(album.releaseDate).getFullYear()}</p>
                        <p className="text-yellow-300/90 text-[10px] mt-1 font-bold uppercase tracking-widest">{formatPlayCount(getAlbumPlayCount(album))} reproducciones</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No se encontraron álbumes.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {view === 'media' && (
        <div className="animate-in slide-in-from-bottom-4 duration-500">

          {/* ── RTN MUSIC ── */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative group/avatar w-14 h-14 rounded-2xl bg-yellow-400 flex items-center justify-center flex-shrink-0 shadow-lg shadow-yellow-400/20 overflow-hidden">
                  {rtnProfilePic ? (
                    <img src={rtnProfilePic} alt="RTN MUSIC" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-black font-black text-xl">R</span>
                  )}
                  {user.role === 'admin' && (
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer flex items-center justify-center" title="Cambiar foto">
                      <Edit3 size={16} className="text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={rtnProfilePicUploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setRtnProfilePicUploading(true);
                          try {
                            const fd = new FormData();
                            fd.append('profilePic', file);
                            const r = await fetch(`${API_URL}/users/${RTN_MUSIC_USER_ID}/profile`, { method: 'PUT', body: fd });
                            if (r.ok) {
                              const data = await r.json();
                              setRtnProfilePic(data.user?.profilePic || '');
                              showToast('Foto de perfil actualizada', 'success');
                            } else {
                              showToast('Error al actualizar la foto', 'error');
                            }
                          } catch (_) {
                            showToast('Error de conexión', 'error');
                          }
                          setRtnProfilePicUploading(false);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                  {rtnProfilePicUploading && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-black uppercase tracking-tight">RTN MUSIC</h2>
                    <span className="text-[9px] text-yellow-400 font-black uppercase tracking-widest border border-yellow-400/30 bg-yellow-400/10 px-2 py-0.5 rounded-full">Canal Oficial</span>
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">{rtnVideos.length} {rtnVideos.length === 1 ? 'video' : 'videos'}</p>
                </div>
              </div>
              {user.role === 'admin' && (
                <button
                  onClick={() => { setVideoUploadOpen(true); setVideoUploadAsRTN(true); setVideoUploadForm({ title: '', description: '', youtubeUrl: '', orientation: 'horizontal' }); setVideoUploadFile(null); setVideoUploadTab('youtube'); }}
                  className="flex items-center gap-2 bg-yellow-400 text-black text-xs font-black uppercase tracking-widest px-4 py-2.5 rounded-2xl hover:shadow-[0_0_20px_rgba(250,204,21,0.4)] transition-all active:scale-95"
                >
                  <Plus size={14} /> Video RTN
                </button>
              )}
            </div>
            {videosLoading ? (
              <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" /></div>
            ) : rtnVideos.length === 0 ? (
              <div className="flex items-center justify-center py-10 gap-3 text-gray-700">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="5" width="20" height="14" rx="3"/><polygon points="10,9 16,12 10,15" fill="currentColor"/></svg>
                <p className="text-xs font-bold uppercase tracking-widest">Sin videos publicados todavía</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {rtnVideos.map((vid) => {
                  const thumb = vid.thumbnailUrl || (vid.type === 'youtube' ? `https://img.youtube.com/vi/${vid.youtubeId}/hqdefault.jpg` : '');
                  const isOwnerOrAdmin = String(vid.uploader?._id) === String(user._id) || user.role === 'admin';
                  return (
                    <div key={vid._id} className="group relative bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden hover:border-yellow-400/30 transition-all cursor-pointer" onClick={() => { setActiveVideo(vid); fetch(`${API_URL}/videos/${vid._id}/view`, { method: 'POST' }).then(() => setVideos((prev) => prev.map((v) => v._id === vid._id ? { ...v, views: (v.views || 0) + 1 } : v))).catch(() => {}); }}>
                      <div className={`relative bg-black/60 overflow-hidden ${vid.orientation === 'vertical' ? 'aspect-[9/16]' : 'aspect-video'}`}>
                        {thumb ? <img src={thumb} alt={vid.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full bg-gradient-to-br from-yellow-400/10 to-black flex items-center justify-center"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="1.5"><rect x="2" y="5" width="20" height="14" rx="3"/><polygon points="10,9 16,12 10,15" fill="#facc1580"/></svg></div>}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><div className="w-14 h-14 bg-yellow-400 rounded-full flex items-center justify-center shadow-xl shadow-yellow-400/40"><Play size={22} fill="black" className="text-black ml-1" /></div></div>
                        {vid.type === 'youtube' && <div className="absolute top-2 right-2 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">YT</div>}
                        {vid.orientation === 'vertical' && <div className="absolute top-2 left-2 bg-black/60 text-gray-300 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-white/10">Vertical</div>}
                      </div>
                      <div className="p-4">
                        <p className="font-black text-sm truncate">{vid.title}</p>
                        {vid.description && <p className="text-gray-500 text-xs mt-0.5 truncate">{vid.description}</p>}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-yellow-400 overflow-hidden flex-shrink-0 flex items-center justify-center text-[9px] font-black text-black">{vid.uploader?.profilePic ? <img src={vid.uploader.profilePic} alt={vid.uploader.username} className="w-full h-full object-cover" /> : (vid.uploader?.username || '?').charAt(0).toUpperCase()}</div>
                            <span className="text-gray-400 text-xs font-bold truncate max-w-[100px]">{vid.uploader?.username || 'Artista'}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-600 text-[10px] font-bold">{formatPlayCount(vid.views || 0)} views</span>
                            {isOwnerOrAdmin && <button onClick={(e) => { e.stopPropagation(); if (window.confirm(`¿Eliminar "${vid.title}"?`)) { fetch(`${API_URL}/videos/${vid._id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requesterId: user._id }) }).then((r) => { if (r.ok) { setVideos((prev) => prev.filter((v) => v._id !== vid._id)); showToast('Video eliminado', 'success'); } else showToast('No se pudo eliminar', 'error'); }).catch(() => showToast('Error al eliminar', 'error')); } }} className="w-6 h-6 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-colors"><Trash2 size={11} /></button>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* divider */}
          <div className="border-t border-white/5 mb-12" />

          {/* ── La Crew ── */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">La Crew</h2>
                <p className="text-gray-500 text-xs mt-0.5">{crewVideos.length} {crewVideos.length === 1 ? 'video' : 'videos'} de la comunidad</p>
              </div>
              {(user.role === 'artist' || user.role === 'admin') && (
                <button
                  onClick={() => { setVideoUploadOpen(true); setVideoUploadAsRTN(false); setVideoUploadForm({ title: '', description: '', youtubeUrl: '', orientation: 'horizontal' }); setVideoUploadFile(null); setVideoUploadTab('youtube'); }}
                  className="flex items-center gap-2 bg-white/10 border border-white/10 text-white text-xs font-black uppercase tracking-widest px-4 py-2.5 rounded-2xl hover:bg-white/15 transition-all active:scale-95"
                >
                  <Plus size={14} /> Subir Video
                </button>
              )}
            </div>
            {videosLoading ? (
              <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" /></div>
            ) : crewVideos.length === 0 ? (
              <div className="flex items-center justify-center py-10 gap-3 text-gray-700">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="5" width="20" height="14" rx="3"/><polygon points="10,9 16,12 10,15" fill="currentColor"/></svg>
                <p className="text-xs font-bold uppercase tracking-widest">Todavía no hay videos de la crew</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {crewVideos.map((vid) => {
                  const thumb = vid.thumbnailUrl || (vid.type === 'youtube' ? `https://img.youtube.com/vi/${vid.youtubeId}/hqdefault.jpg` : '');
                  const isOwnerOrAdmin = String(vid.uploader?._id) === String(user._id) || user.role === 'admin';
                  return (
                    <div key={vid._id} className="group relative bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden hover:border-yellow-400/30 transition-all cursor-pointer" onClick={() => { setActiveVideo(vid); fetch(`${API_URL}/videos/${vid._id}/view`, { method: 'POST' }).then(() => setVideos((prev) => prev.map((v) => v._id === vid._id ? { ...v, views: (v.views || 0) + 1 } : v))).catch(() => {}); }}>
                      <div className={`relative bg-black/60 overflow-hidden ${vid.orientation === 'vertical' ? 'aspect-[9/16]' : 'aspect-video'}`}>
                        {thumb ? <img src={thumb} alt={vid.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full bg-gradient-to-br from-yellow-400/10 to-black flex items-center justify-center"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="1.5"><rect x="2" y="5" width="20" height="14" rx="3"/><polygon points="10,9 16,12 10,15" fill="#facc1580"/></svg></div>}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><div className="w-14 h-14 bg-yellow-400 rounded-full flex items-center justify-center shadow-xl shadow-yellow-400/40"><Play size={22} fill="black" className="text-black ml-1" /></div></div>
                        {vid.type === 'youtube' && <div className="absolute top-2 right-2 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">YT</div>}
                        {vid.orientation === 'vertical' && <div className="absolute top-2 left-2 bg-black/60 text-gray-300 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-white/10">Vertical</div>}
                      </div>
                      <div className="p-4">
                        <p className="font-black text-sm truncate">{vid.title}</p>
                        {vid.description && <p className="text-gray-500 text-xs mt-0.5 truncate">{vid.description}</p>}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-yellow-400 overflow-hidden flex-shrink-0 flex items-center justify-center text-[9px] font-black text-black">{vid.uploader?.profilePic ? <img src={vid.uploader.profilePic} alt={vid.uploader.username} className="w-full h-full object-cover" /> : (vid.uploader?.username || '?').charAt(0).toUpperCase()}</div>
                            <span className="text-gray-400 text-xs font-bold truncate max-w-[100px]">{vid.uploader?.username || 'Artista'}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-600 text-[10px] font-bold">{formatPlayCount(vid.views || 0)} views</span>
                            {isOwnerOrAdmin && <button onClick={(e) => { e.stopPropagation(); if (window.confirm(`¿Eliminar "${vid.title}"?`)) { fetch(`${API_URL}/videos/${vid._id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requesterId: user._id }) }).then((r) => { if (r.ok) { setVideos((prev) => prev.filter((v) => v._id !== vid._id)); showToast('Video eliminado', 'success'); } else showToast('No se pudo eliminar', 'error'); }).catch(() => showToast('Error al eliminar', 'error')); } }} className="w-6 h-6 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-colors"><Trash2 size={11} /></button>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* VIDEO PLAYER MODAL */}
      {activeVideo && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setActiveVideo(null)}>
          <div className={`relative bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl ${activeVideo.orientation === 'vertical' ? 'w-full max-w-sm' : 'w-full max-w-4xl'}`} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setActiveVideo(null)} className="absolute top-4 right-4 z-10 w-9 h-9 bg-black/60 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center text-gray-300 hover:text-white hover:border-white/40 transition-all">
              <X size={16} />
            </button>
            {activeVideo.type === 'youtube' ? (
              <div className={`${activeVideo.orientation === 'vertical' ? 'aspect-[9/16]' : 'aspect-video'}`}>
                <iframe
                  src={`https://www.youtube.com/embed/${activeVideo.youtubeId}?autoplay=1&rel=0`}
                  title={activeVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div className={`${activeVideo.orientation === 'vertical' ? 'aspect-[9/16]' : 'aspect-video'} bg-black`}>
                <video
                  src={activeVideo.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full"
                  style={{ maxHeight: '80vh' }}
                />
              </div>
            )}
            <div className="p-4 md:p-6">
              <p className="font-black text-lg md:text-xl">{activeVideo.title}</p>
              {activeVideo.description && <p className="text-gray-400 text-sm mt-1">{activeVideo.description}</p>}
              <div className="flex items-center gap-3 mt-3">
                <div className="w-7 h-7 rounded-full bg-yellow-400 overflow-hidden flex-shrink-0 flex items-center justify-center text-[10px] font-black text-black">
                  {activeVideo.uploader?.profilePic ? <img src={activeVideo.uploader.profilePic} alt={activeVideo.uploader.username} className="w-full h-full object-cover" /> : (activeVideo.uploader?.username || '?').charAt(0).toUpperCase()}
                </div>
                <span className="text-yellow-400 text-xs font-bold uppercase tracking-widest">{activeVideo.uploader?.username || 'Artista'}</span>
                <span className="text-gray-600 text-xs ml-auto">{formatPlayCount((activeVideo.views || 0) + 1)} views</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIDEO UPLOAD MODAL */}
      {videoUploadOpen && (
        <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="font-black text-lg uppercase tracking-widest">{videoUploadAsRTN ? 'Video RTN MUSIC' : 'Subir Video'}</h2>
              <button onClick={() => setVideoUploadOpen(false)} className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            {videoUploadAsRTN && (
              <div className="mx-6 mt-3 flex items-center gap-3 bg-yellow-400/10 border border-yellow-400/20 rounded-2xl px-4 py-2.5">
                <div className="w-6 h-6 rounded-lg bg-yellow-400 flex items-center justify-center flex-shrink-0"><span className="text-black font-black text-xs">R</span></div>
                <span className="text-yellow-400 text-xs font-black uppercase tracking-widest">Publicando como RTN MUSIC</span>
              </div>
            )}
            {/* Tabs */}
            <div className="flex border-b border-white/10">
              <button onClick={() => setVideoUploadTab('youtube')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${videoUploadTab === 'youtube' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-500 hover:text-white'}`}>
                Link YouTube
              </button>
              <button onClick={() => setVideoUploadTab('upload')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${videoUploadTab === 'upload' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-500 hover:text-white'}`}>
                Subir Archivo
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <input
                type="text"
                placeholder="Título del video *"
                value={videoUploadForm.title}
                onChange={(e) => setVideoUploadForm((f) => ({ ...f, title: e.target.value }))}
                className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-yellow-400 transition-all"
              />
              <input
                type="text"
                placeholder="Descripción (opcional)"
                value={videoUploadForm.description}
                onChange={(e) => setVideoUploadForm((f) => ({ ...f, description: e.target.value }))}
                className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:border-yellow-400 transition-all"
              />
              {videoUploadTab === 'youtube' ? (
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=... o https://youtu.be/..."
                  value={videoUploadForm.youtubeUrl}
                  onChange={(e) => setVideoUploadForm((f) => ({ ...f, youtubeUrl: e.target.value }))}
                  className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:border-yellow-400 transition-all"
                />
              ) : (
                <>
                  <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/10 rounded-2xl py-6 cursor-pointer hover:border-yellow-400/40 transition-all" onClick={() => document.getElementById('video-file-input').click()}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#facc1580" strokeWidth="1.5"><rect x="2" y="5" width="20" height="14" rx="3"/><polygon points="10,9 16,12 10,15" fill="#facc1540"/></svg>
                    {videoUploadFile ? (
                      <span className="text-xs font-bold text-yellow-400">{videoUploadFile.name}</span>
                    ) : (
                      <span className="text-xs text-gray-500">Seleccioná un video (MP4, MOV, WebM)</span>
                    )}
                    <input id="video-file-input" type="file" accept="video/*" className="hidden" onChange={(e) => setVideoUploadFile(e.target.files?.[0] || null)} />
                  </label>
                  <div className="flex gap-3">
                    <button onClick={() => setVideoUploadForm((f) => ({ ...f, orientation: 'horizontal' }))} className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${videoUploadForm.orientation === 'horizontal' ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-transparent text-gray-500 border-white/10 hover:border-white/30'}`}>
                      Horizontal
                    </button>
                    <button onClick={() => setVideoUploadForm((f) => ({ ...f, orientation: 'vertical' }))} className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${videoUploadForm.orientation === 'vertical' ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-transparent text-gray-500 border-white/10 hover:border-white/30'}`}>
                      Vertical
                    </button>
                  </div>
                </>
              )}
              <button
                disabled={videoUploadLoading || !videoUploadForm.title.trim() || (videoUploadTab === 'youtube' && !extractYoutubeId(videoUploadForm.youtubeUrl)) || (videoUploadTab === 'upload' && !videoUploadFile)}
                onClick={async () => {
                  setVideoUploadLoading(true);
                  try {
                    let newVideo;
                    if (videoUploadTab === 'youtube') {
                      const r = await fetch(`${API_URL}/videos/youtube`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title: videoUploadForm.title.trim(), description: videoUploadForm.description.trim(), youtubeUrl: videoUploadForm.youtubeUrl, uploaderId: videoUploadAsRTN ? RTN_MUSIC_USER_ID : user._id }),
                      });
                      if (!r.ok) { const e = await r.json(); showToast(e.error || 'Error al agregar video', 'error'); setVideoUploadLoading(false); return; }
                      newVideo = await r.json();
                    } else {
                      const fd = new FormData();
                      fd.append('video', videoUploadFile);
                      fd.append('title', videoUploadForm.title.trim());
                      fd.append('description', videoUploadForm.description.trim());
                      fd.append('uploaderId', videoUploadAsRTN ? RTN_MUSIC_USER_ID : user._id);
                      fd.append('orientation', videoUploadForm.orientation);
                      const r = await fetch(`${API_URL}/videos/upload`, { method: 'POST', body: fd });
                      if (!r.ok) { const e = await r.json(); showToast(e.error || 'Error al subir video', 'error'); setVideoUploadLoading(false); return; }
                      newVideo = await r.json();
                    }
                    setVideos((prev) => [newVideo, ...prev]);
                    setVideoUploadOpen(false);
                    showToast('Video publicado', 'success');
                  } catch (err) {
                    showToast('Error de conexión', 'error');
                  }
                  setVideoUploadLoading(false);
                }}
                className="w-full py-3 bg-yellow-400 text-black font-black text-sm uppercase tracking-widest rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(250,204,21,0.4)] transition-all"
              >
                {videoUploadLoading ? 'Publicando...' : 'Publicar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {false && (() => {
        return (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            {/* Hero banner */}
            <div className="relative rounded-[40px] overflow-hidden border border-yellow-400/20 mb-8" style={{ background: 'linear-gradient(135deg, #1a0f00 0%, #0d0500 50%, #000 100%)' }}>
              <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(ellipse at 30% 50%, #facc15 0%, transparent 70%)' }} />
              <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-center md:items-end gap-6">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-yellow-400 flex items-center justify-center shadow-2xl shadow-yellow-400/30 flex-shrink-0 overflow-hidden border-2 border-yellow-400/40">
                  <span className="text-black font-black text-4xl md:text-5xl">R</span>
                </div>
                <div>
                  <p className="text-[10px] text-yellow-400 font-black uppercase tracking-[0.4em] mb-1">Canal Oficial</p>
                  <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">RTN MUSIC</h1>
                  <p className="text-gray-400 text-sm mt-2">{rtnVideos.length} {rtnVideos.length === 1 ? 'video' : 'videos'} publicados</p>
                </div>
              </div>
            </div>

            {videosLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : rtnVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-600">
                <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="5" width="20" height="14" rx="3"/><polygon points="10,9 16,12 10,15" fill="currentColor"/></svg>
                </div>
                <p className="text-sm font-bold uppercase tracking-widest">No hay videos todavía</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {rtnVideos.map((vid) => {
                  const thumb = vid.thumbnailUrl || (vid.type === 'youtube' ? `https://img.youtube.com/vi/${vid.youtubeId}/hqdefault.jpg` : '');
                  return (
                    <div
                      key={vid._id}
                      className="group relative bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden hover:border-yellow-400/40 transition-all cursor-pointer"
                      onClick={() => { setActiveVideo(vid); fetch(`${API_URL}/videos/${vid._id}/view`, { method: 'POST' }).then(() => setVideos((prev) => prev.map((v) => v._id === vid._id ? { ...v, views: (v.views || 0) + 1 } : v))).catch(() => {}); }}
                    >
                      <div className={`relative bg-black/60 overflow-hidden ${vid.orientation === 'vertical' ? 'aspect-[9/16]' : 'aspect-video'}`}>
                        {thumb ? (
                          <img src={thumb} alt={vid.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-yellow-400/10 to-black flex items-center justify-center">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="1.5"><rect x="2" y="5" width="20" height="14" rx="3"/><polygon points="10,9 16,12 10,15" fill="#facc1580"/></svg>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-14 h-14 bg-yellow-400 rounded-full flex items-center justify-center shadow-xl shadow-yellow-400/40">
                            <Play size={22} fill="black" className="text-black ml-1" />
                          </div>
                        </div>
                        {vid.type === 'youtube' && (
                          <div className="absolute top-2 right-2 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">YT</div>
                        )}
                        {vid.orientation === 'vertical' && (
                          <div className="absolute top-2 left-2 bg-black/60 text-gray-300 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-white/10">Vertical</div>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="font-black text-sm truncate">{vid.title}</p>
                        {vid.description && <p className="text-gray-500 text-xs mt-0.5 truncate">{vid.description}</p>}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-yellow-400 overflow-hidden flex-shrink-0 flex items-center justify-center text-[8px] font-black text-black">
                              {vid.uploader?.profilePic ? <img src={vid.uploader.profilePic} alt="RTN" className="w-full h-full object-cover" /> : 'R'}
                            </div>
                            <span className="text-yellow-400 text-[10px] font-black uppercase tracking-widest">RTN MUSIC</span>
                          </div>
                          <span className="text-gray-600 text-[10px] font-bold">{formatPlayCount(vid.views || 0)} views</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {view === 'perfil' && (
        <div className="animate-in fade-in duration-500">
          <div className="bg-gradient-to-r from-yellow-400/20 to-black rounded-[40px] border border-white/10 p-6 md:p-10 flex items-center md:items-end gap-4 md:gap-6 min-h-[100px] md:h-48">
            <div className="w-16 h-16 md:w-24 md:h-24 bg-yellow-400 rounded-3xl overflow-hidden font-black text-black text-3xl md:text-4xl flex items-center justify-center shadow-lg shadow-yellow-400/20 flex-shrink-0">
              {user.profilePic ? <img src={user.profilePic} alt={user.username} className="w-full h-full object-cover" /> : user.username.charAt(0)}
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl md:text-5xl font-black uppercase tracking-tighter truncate">{user.username}</h2>
              <p className="text-yellow-400 font-bold uppercase tracking-[0.3em] text-xs">{user.role}</p>
            </div>
          </div>

          {/* Tabs */}
          {(user.role === 'artist' || user.role === 'admin') && (
            <div className="flex gap-1 border-b border-white/10 mt-8 overflow-x-auto">
              <button
                onClick={() => setActiveArtistTab('info')}
                className={`px-4 md:px-6 py-3 text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeArtistTab === 'info' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-white'}`}
              >
                Info
              </button>
              <button
                onClick={() => setActiveArtistTab('canciones')}
                className={`px-4 md:px-6 py-3 text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeArtistTab === 'canciones' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-white'}`}
              >
                Canciones
              </button>
              <button
                onClick={() => setActiveArtistTab('albumes')}
                className={`px-4 md:px-6 py-3 text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeArtistTab === 'albumes' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-white'}`}
              >
                Álbumes
              </button>
              <button
                onClick={() => setActiveArtistTab('playlists')}
                className={`px-4 md:px-6 py-3 text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeArtistTab === 'playlists' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-white'}`}
              >
                Playlists
              </button>
              <button
                onClick={() => setIsAlbumModalOpen(true)}
                className="ml-auto px-4 md:px-6 py-3 text-yellow-400 text-xl font-black hover:bg-yellow-400/10 rounded-xl transition-all"
                title="Crear nuevo álbum"
              >
                +
              </button>
            </div>
          )}

          {/* Tab Content */}
          {(activeArtistTab === 'info' || user.role === 'user') && (
            <div className="mt-8 bg-white/5 p-5 md:p-8 rounded-[40px] border border-white/5">
              <p className="text-xs font-black text-gray-500 uppercase mb-4 tracking-widest">Biografia de Artista</p>
              <p className="text-xl text-gray-300 italic">"{user.bio || 'Nueva leyenda de RTN MUSIC'}"</p>
              {(user.role === 'artist' || user.role === 'admin') && artistStats && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Tiempo Escuchado</p>
                    <p className="text-2xl font-black text-yellow-400">{formatListenTime(artistStats.totals?.listenSeconds || 0)}</p>
                  </div>
                  <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Canciones</p>
                    <p className="text-2xl font-black">{artistStats.totals?.songs || 0}</p>
                  </div>
                  <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Álbumes</p>
                    <p className="text-2xl font-black">{artistStats.totals?.albums || 0}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeArtistTab === 'canciones' && (user.role === 'artist' || user.role === 'admin') && (
            <div className="mt-8 bg-white/5 p-5 md:p-8 rounded-[40px] border border-white/5">
              <div className="flex justify-between items-center mb-6">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Mis Canciones</p>
                <button onClick={() => fetchMySongs(user._id)} className="text-yellow-400 text-xs font-bold hover:underline">Refrescar</button>
              </div>
              <div className="space-y-3">
                {mySongs?.length > 0 ? (
                  mySongs.map((song) => {
                    const idx = allSongs.findIndex((item) => item._id === song._id);
                    return (
                      <SongRow
                        key={song._id}
                        song={song}
                        onRowClick={() => openSongDetail(song)}
                        onPlay={(e) => {
                          e.stopPropagation();
                          playSong(song, idx >= 0 ? idx : 0);
                        }}
                        onArtistClick={(e) => {
                          e.stopPropagation();
                          if (song.artist?._id) openArtistProfile(song.artist._id);
                        }}
                        onCollaboratorClick={(id) => openArtistProfile(id)}
                        onToggleLike={(songId) => toggleFavorite('song', songId)}
                        isLiked={likedSongSet.has(String(song._id))}
                      />
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-sm">Aun no has subido canciones. Sube tu primer hit.</p>
                )}
              </div>
            </div>
          )}

          {activeArtistTab === 'albumes' && (user.role === 'artist' || user.role === 'admin') && (
            <div className="mt-8 bg-white/5 p-5 md:p-8 rounded-[40px] border border-white/5">
              <p className="text-xs font-black text-gray-500 uppercase mb-6 tracking-widest">Mis Álbumes</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {albums.filter((a) => String(a.artist?._id) === String(user._id)).length > 0 ? (
                  albums.filter((a) => String(a.artist?._id) === String(user._id)).map((album) => (
                    <button
                      key={album._id}
                      onClick={() => setSelectedAlbum(album)}
                      className={`text-left bg-gradient-to-br ${getAlbumThemeGradient(album)} rounded-3xl overflow-hidden hover:scale-105 transition-all shadow-lg`}
                    >
                      <div className="aspect-square bg-black/20 overflow-hidden flex items-center justify-center">
                        {album.coverUrl ? (
                          <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover" />
                        ) : (
                          <Disc size={48} className="text-white/40" />
                        )}
                      </div>
                      <div className="p-4 bg-black/40 backdrop-blur-sm">
                        <p className="font-black text-lg leading-tight mb-1 text-white">{album.title}</p>
                        <p className="text-white/50 text-xs">{album.songs?.length || 0} canciones</p>
                        <p className="text-yellow-300/90 text-[10px] mt-1 font-bold uppercase tracking-widest">{formatPlayCount(getAlbumPlayCount(album))} reproducciones</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm col-span-full">No tienes álbumes aún. Pulsa el <span className="text-yellow-400 font-bold">+</span> para crear uno.</p>
                )}
              </div>
            </div>
          )}

          {activeArtistTab === 'playlists' && (
            <div className="mt-8 bg-white/5 p-5 md:p-8 rounded-[40px] border border-white/5">
              <div className="grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-6 md:gap-8">
                <form onSubmit={saveUserPlaylist} className="space-y-4 bg-black/30 rounded-3xl border border-white/10 p-5">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest">{userPlaylistForm.id ? 'Editar playlist personal' : 'Nueva playlist personal'}</p>
                  <input
                    value={userPlaylistForm.name}
                    onChange={(e) => setUserPlaylistForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Nombre de la playlist"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-yellow-400"
                  />
                  <textarea
                    value={userPlaylistForm.description}
                    onChange={(e) => setUserPlaylistForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Descripción"
                    className="w-full h-24 bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-yellow-400"
                  />
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Portada desde archivo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setUserPlaylistCoverFile(e.target.files?.[0] || null)}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 outline-none focus:border-yellow-400 text-sm"
                    />
                    {userPlaylistForm.coverUrl && !userPlaylistCoverFile && (
                      <p className="text-[10px] text-gray-400">Usando portada actual guardada.</p>
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-300">
                    <input
                      type="checkbox"
                      checked={userPlaylistForm.isPublic}
                      onChange={(e) => setUserPlaylistForm((prev) => ({ ...prev, isPublic: e.target.checked }))}
                    />
                    Playlist pública
                  </label>

                  <div className="max-h-72 overflow-y-auto space-y-2 pr-2">
                    {allSongs.map((song) => (
                      <button
                        key={song._id}
                        type="button"
                        onClick={() => toggleUserPlaylistSong(song._id)}
                        className={`w-full flex items-center gap-3 rounded-2xl p-3 border transition ${userPlaylistForm.songIds.includes(song._id) ? 'border-yellow-400 bg-yellow-400/10' : 'border-white/10 bg-black/20 hover:bg-white/5'}`}
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/40 flex-shrink-0">
                          {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Disc size={18} className="text-yellow-400/40" /></div>}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-bold truncate">{song.title}</p>
                          <p className="text-[10px] text-gray-400 uppercase truncate">{song.artist?.username || 'Artista'}</p>
                        </div>
                        {userPlaylistForm.songIds.includes(song._id) && <Check size={16} className="text-yellow-400" />}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button disabled={userPlaylistSaving} className="flex-1 bg-yellow-400 text-black font-black py-3 rounded-2xl uppercase text-xs tracking-widest disabled:opacity-60">
                      {userPlaylistSaving ? 'Guardando...' : userPlaylistForm.id ? 'Actualizar playlist' : 'Crear playlist'}
                    </button>
                    {userPlaylistForm.id && (
                      <button type="button" onClick={resetUserPlaylistForm} className="px-4 py-3 rounded-2xl bg-white/10 text-white font-bold text-xs uppercase tracking-widest">
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>

                <div className="space-y-3">
                  {userPlaylistsLoading ? (
                    <p className="text-gray-500 text-sm">Cargando tus playlists...</p>
                  ) : userPlaylists.length > 0 ? userPlaylists.map((playlist) => (
                    <div key={playlist._id} className="bg-black/30 border border-white/10 rounded-3xl p-4 flex gap-4">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden bg-black/40 flex-shrink-0">
                        {playlist.coverUrl ? (
                          <img src={playlist.coverUrl} alt={playlist.name} className="w-full h-full object-cover" />
                        ) : playlist.songs?.[0]?.coverUrl ? (
                          <img src={playlist.songs[0].coverUrl} alt={playlist.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Disc size={28} className="text-yellow-400/40" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-xl truncate">{playlist.name}</p>
                        <p className="text-sm text-gray-400 line-clamp-2">{playlist.description || 'Sin descripción'}</p>
                        <p className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest mt-2">{playlist.songs?.length || 0} canciones • {playlist.isPublic ? 'Pública' : 'Privada'}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button onClick={() => setSelectedPlaylist(playlist)} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold uppercase">Ver</button>
                        <button onClick={() => startEditUserPlaylist(playlist)} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold uppercase">Editar</button>
                        <button onClick={() => deleteUserPlaylist(playlist._id)} className="px-3 py-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-xs font-bold uppercase">Eliminar</button>
                      </div>
                    </div>
                  )) : <p className="text-gray-500 text-sm">No tienes playlists personales todavía.</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'artist' && artistProfile && (
        <div className="animate-in fade-in duration-500 space-y-8">
          <div className="bg-gradient-to-r from-yellow-400/20 to-black rounded-[40px] border border-white/10 p-6 md:p-10 flex items-center md:items-end gap-4 md:gap-6 min-h-[100px] md:h-56">
            <div className="w-16 h-16 md:w-28 md:h-28 rounded-3xl overflow-hidden bg-yellow-400 text-black font-black text-3xl md:text-4xl flex items-center justify-center shadow-lg shadow-yellow-400/20 flex-shrink-0">
              {artistProfile.artist.profilePic ? <img src={artistProfile.artist.profilePic} alt={artistProfile.artist.username} className="w-full h-full object-cover" /> : artistProfile.artist.username.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs tracking-[0.3em] text-gray-400 uppercase font-black">Mi Crew</p>
              <h2 className="text-2xl md:text-5xl font-black uppercase tracking-tighter truncate">{artistProfile.artist.username}</h2>
              <p className="text-yellow-400 font-bold uppercase tracking-[0.2em] text-xs">{artistProfile.artist.role}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-white/10 overflow-x-auto">
            <button
              onClick={() => setActiveArtistTab('info')}
              className={`px-4 md:px-6 py-3 text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                activeArtistTab === 'info'
                  ? 'text-yellow-400 border-b-2 border-yellow-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Info
            </button>
            <button
              onClick={() => setActiveArtistTab('canciones')}
              className={`px-4 md:px-6 py-3 text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                activeArtistTab === 'canciones'
                  ? 'text-yellow-400 border-b-2 border-yellow-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Canciones
            </button>
            <button
              onClick={() => setActiveArtistTab('albumes')}
              className={`px-4 md:px-6 py-3 text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                activeArtistTab === 'albumes'
                  ? 'text-yellow-400 border-b-2 border-yellow-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Álbumes
            </button>
            {String(user._id) === String(artistProfile.artist._id) && (user.role === 'artist' || user.role === 'admin') && (
              <button
                onClick={() => setIsAlbumModalOpen(true)}
                className="ml-auto px-4 md:px-6 py-3 text-yellow-400 text-xl font-black hover:bg-yellow-400/10 rounded-xl transition-all"
                title="Crear nuevo álbum"
              >
                +
              </button>
            )}
          </div>

          {/* Tab Content */}
          {activeArtistTab === 'info' && (
            <div className="bg-white/5 p-5 md:p-8 rounded-[40px] border border-white/5">
              <p className="text-xs font-black text-gray-500 uppercase mb-4 tracking-widest">Biografia</p>
              <p className="text-lg text-gray-300">{artistProfile.artist.bio || 'Este artista no tiene bio aun.'}</p>
              {(artistProfile.artist.instagramHandle || artistProfile.artist.instagramPosts?.filter(Boolean).length) ? (
                <div className="mt-6 bg-black/30 border border-white/10 rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                    <div>
                      <p className="text-xs font-black text-gray-500 uppercase mb-2 tracking-widest">Instagram</p>
                      {artistProfile.artist.instagramHandle ? (
                        <a
                          href={`https://www.instagram.com/${artistProfile.artist.instagramHandle}/`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-lg font-black text-pink-300 hover:text-pink-200"
                        >
                          @{artistProfile.artist.instagramHandle}
                        </a>
                      ) : (
                        <p className="text-sm text-gray-500">Sin usuario vinculado</p>
                      )}
                    </div>
                    {artistProfile.artist.instagramHandle ? (
                      <a
                        href={`https://www.instagram.com/${artistProfile.artist.instagramHandle}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold uppercase tracking-widest"
                      >
                        Ver perfil IG
                      </a>
                    ) : null}
                  </div>

                  {(artistProfile.artist.instagramFeed?.length || artistProfile.artist.instagramPosts?.filter(Boolean).length) ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {(artistProfile.artist.instagramFeed?.length
                        ? artistProfile.artist.instagramFeed.map((item) => item.permalink).filter(Boolean)
                        : artistProfile.artist.instagramPosts.filter(Boolean)
                      ).map((postUrl, index) => (
                        <div
                          key={`${postUrl}-${index}`}
                          className="rounded-2xl border border-pink-400/20 bg-gradient-to-br from-pink-500/20 via-orange-400/10 to-black/30 p-3 hover:border-pink-300/40 transition-all"
                        >
                          <div className="aspect-[4/5] rounded-xl overflow-hidden bg-black/30 border border-white/10">
                            <iframe
                              src={getInstagramEmbedUrl(postUrl)}
                              title={`Instagram post ${index + 1}`}
                              className="w-full h-full"
                              loading="lazy"
                            />
                          </div>
                          <a
                            href={postUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold uppercase tracking-widest"
                          >
                            Abrir publicación
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Este artista todavía no añadió publicaciones de Instagram.</p>
                  )}
                </div>
              ) : null}
              {artistStats && (
                <>
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                      <p className="text-[10px] text-gray-500 uppercase font-bold">Tiempo Escuchado</p>
                      <p className="text-2xl font-black text-yellow-400">{formatListenTime(artistStats.totals?.listenSeconds || 0)}</p>
                    </div>
                    <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                      <p className="text-[10px] text-gray-500 uppercase font-bold">Canciones</p>
                      <p className="text-2xl font-black">{artistStats.totals?.songs || 0}</p>
                    </div>
                    <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                      <p className="text-[10px] text-gray-500 uppercase font-bold">Álbumes</p>
                      <p className="text-2xl font-black">{artistStats.totals?.albums || 0}</p>
                    </div>
                  </div>
                  <div className="mt-6 bg-black/30 border border-white/10 rounded-2xl p-4">
                    <p className="text-xs font-black text-gray-500 uppercase mb-3 tracking-widest">Top Canciones</p>
                    {artistStats.topSongs?.length ? artistStats.topSongs.map((song, idx) => (
                      <div key={song._id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-b-0">
                        <p className="text-sm"><span className="text-yellow-400 font-black mr-2">#{idx + 1}</span>{song.title}</p>
                        <p className="text-xs text-gray-400">{formatListenTime(song.listenSeconds || 0)}</p>
                      </div>
                    )) : <p className="text-sm text-gray-500">Aún sin tiempo escuchado.</p>}
                  </div>
                </>
              )}
            </div>
          )}

          {activeArtistTab === 'canciones' && (
            <div className="bg-white/5 p-5 md:p-8 rounded-[40px] border border-white/5">
              <p className="text-xs font-black text-gray-500 uppercase mb-6 tracking-widest">Canciones del Artista</p>
              <div className="space-y-3">
                {artistProfile.songs?.length > 0 ? (
                  artistProfile.songs.map((song) => {
                    const idx = allSongs.findIndex((item) => item._id === song._id);
                    return (
                      <SongRow
                        key={song._id}
                        song={song}
                        onRowClick={() => openSongDetail(song)}
                        onPlay={(e) => {
                          e.stopPropagation();
                          playSong(song, idx >= 0 ? idx : 0);
                        }}
                        onArtistClick={(e) => {
                          e.stopPropagation();
                          if (song.artist?._id) openArtistProfile(song.artist._id);
                        }}
                        onCollaboratorClick={(id) => openArtistProfile(id)}
                        onToggleLike={(songId) => toggleFavorite('song', songId)}
                        isLiked={likedSongSet.has(String(song._id))}
                      />
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-sm">Este artista no tiene canciones publicadas.</p>
                )}
              </div>
            </div>
          )}

          {activeArtistTab === 'albumes' && (
            <div className="bg-white/5 p-5 md:p-8 rounded-[40px] border border-white/5">
              <p className="text-xs font-black text-gray-500 uppercase mb-6 tracking-widest">Álbumes del Artista</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {artistProfile.albums?.length > 0 ? (
                  artistProfile.albums.map((album) => (
                    <button
                      key={album._id}
                      onClick={() => setSelectedAlbum(album)}
                      className={`text-left bg-gradient-to-br ${getAlbumThemeGradient(album)} rounded-3xl overflow-hidden hover:scale-105 transition-all shadow-lg`}
                    >
                      <div className="aspect-square bg-black/20 overflow-hidden flex items-center justify-center">
                        {album.coverUrl ? (
                          <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover" />
                        ) : (
                          <Disc size={48} className="text-white/40" />
                        )}
                      </div>
                      <div className="p-4 bg-black/40 backdrop-blur-sm">
                        <p className="font-black text-lg leading-tight mb-1 text-white">{album.title}</p>
                        <p className="text-white/50 text-xs">{album.songs?.length || 0} canciones</p>
                        <p className="text-yellow-300/90 text-[10px] mt-1 font-bold uppercase tracking-widest">{formatPlayCount(getAlbumPlayCount(album))} reproducciones</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">Este artista no tiene álbumes.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'admin' && user.role === 'admin' && (
        <div className="animate-in fade-in duration-500 space-y-8">
          <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter">Panel de Administrador</h2>

          <section className="bg-white/5 p-4 md:p-8 rounded-[40px] border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Top Tiempo Escuchado Global</p>
              <button onClick={fetchAdminTopSongs} className="text-yellow-400 text-xs font-bold hover:underline">Refrescar ranking</button>
            </div>

            {adminTopLoading ? (
              <p className="text-gray-500 text-sm">Cargando ranking...</p>
            ) : adminTopSongs.length > 0 ? (
              <div className="space-y-3">
                {adminTopSongs.map((song, idx) => (
                  <div key={song._id} className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-2xl p-3">
                    <div className="w-12 text-center font-black text-yellow-400">TOP {idx + 1}</div>
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/40 flex-shrink-0">
                      {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Trophy size={18} className="text-yellow-400/60" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{song.title}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest truncate">{song.artist?.username || 'Artista'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-yellow-300 font-black text-lg">{formatListenTime(song.listenSeconds || 0)}</p>
                      <p className="text-[10px] text-gray-500 uppercase">tiempo escuchado</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Sin tiempo escuchado todavía.</p>
            )}
          </section>

          <section className="bg-white/5 p-4 md:p-8 rounded-[40px] border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Playlists por defecto</p>
              <button onClick={resetPlaylistForm} className="text-yellow-400 text-xs font-bold hover:underline flex items-center gap-2"><Plus size={14} /> Nueva playlist</button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-6 md:gap-8">
              <form onSubmit={savePlaylist} className="space-y-4 bg-black/30 rounded-3xl border border-white/10 p-5">
                <input
                  value={playlistForm.name}
                  onChange={(e) => setPlaylistForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre de la playlist"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-yellow-400"
                />
                <textarea
                  value={playlistForm.description}
                  onChange={(e) => setPlaylistForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción"
                  className="w-full h-24 bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-yellow-400"
                />
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Portada desde archivo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPlaylistCoverFile(e.target.files?.[0] || null)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 outline-none focus:border-yellow-400 text-sm"
                  />
                  {playlistForm.coverUrl && !playlistCoverFile && (
                    <p className="text-[10px] text-gray-400">Usando portada actual guardada.</p>
                  )}
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-300">
                  <input
                    type="checkbox"
                    checked={playlistForm.isDefault}
                    onChange={(e) => setPlaylistForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
                  />
                  Mostrar como playlist por defecto
                </label>

                <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
                  {allSongs.map((song) => (
                    <button
                      key={song._id}
                      type="button"
                      onClick={() => togglePlaylistSong(song._id)}
                      className={`w-full flex items-center gap-3 rounded-2xl p-3 border transition ${playlistForm.songIds.includes(song._id) ? 'border-yellow-400 bg-yellow-400/10' : 'border-white/10 bg-black/20 hover:bg-white/5'}`}
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/40 flex-shrink-0">
                        {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Disc size={18} className="text-yellow-400/40" /></div>}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-bold truncate">{song.title}</p>
                        <p className="text-[10px] text-gray-400 uppercase truncate">{song.artist?.username || 'Artista'}</p>
                      </div>
                      {playlistForm.songIds.includes(song._id) && <Check size={16} className="text-yellow-400" />}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button disabled={playlistSaving} className="flex-1 bg-yellow-400 text-black font-black py-3 rounded-2xl uppercase text-xs tracking-widest disabled:opacity-60">
                    {playlistSaving ? 'Guardando...' : playlistForm.id ? 'Actualizar playlist' : 'Crear playlist'}
                  </button>
                  {playlistForm.id && (
                    <button type="button" onClick={resetPlaylistForm} className="px-4 py-3 rounded-2xl bg-white/10 text-white font-bold text-xs uppercase tracking-widest">
                      Cancelar
                    </button>
                  )}
                </div>
              </form>

              <div className="space-y-3">
                {playlists.length > 0 ? playlists.map((playlist) => (
                  <div key={playlist._id} className="bg-black/30 border border-white/10 rounded-3xl p-4 flex gap-4">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden bg-black/40 flex-shrink-0">
                      {playlist.coverUrl ? (
                        <img src={playlist.coverUrl} alt={playlist.name} className="w-full h-full object-cover" />
                      ) : playlist.songs?.[0]?.coverUrl ? (
                        <img src={playlist.songs[0].coverUrl} alt={playlist.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Disc size={28} className="text-yellow-400/40" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-xl truncate">{playlist.name}</p>
                      <p className="text-sm text-gray-400 line-clamp-2">{playlist.description || 'Sin descripción'}</p>
                      <p className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest mt-2">{playlist.songs?.length || 0} canciones</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => setSelectedPlaylist(playlist)} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold uppercase">Ver</button>
                      <button onClick={() => startEditPlaylist(playlist)} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold uppercase">Editar</button>
                      <button onClick={() => deletePlaylist(playlist._id)} className="px-3 py-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-xs font-bold uppercase">Eliminar</button>
                    </div>
                  </div>
                )) : <p className="text-gray-500 text-sm">No hay playlists todavía.</p>}
              </div>
            </div>
          </section>

          <section className="bg-white/5 p-4 md:p-8 rounded-[40px] border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Miembros registrados</p>
              <button onClick={fetchMembers} className="text-yellow-400 text-xs font-bold hover:underline">Refrescar</button>
            </div>

            <div className="space-y-3">
              {membersLoading ? (
                <p className="text-gray-500 text-sm">Cargando miembros...</p>
              ) : members.length > 0 ? (
                members.map((member) => (
                  <div key={member._id} className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-yellow-400 text-black font-black flex items-center justify-center flex-shrink-0">
                        {member.profilePic ? (
                          <img src={member.profilePic} alt={member.username} className="w-full h-full object-cover" />
                        ) : (
                          member.username.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate">{member.username}</p>
                        <p className="text-[11px] text-gray-400">ID: {member._id}</p>
                      </div>

                      <select
                        value={member.role}
                        onChange={(e) => updateMemberRole(member._id, e.target.value)}
                        className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold uppercase"
                      >
                        <option value="user">user</option>
                        <option value="artist">artist</option>
                        <option value="admin">admin</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-3 items-center">
                      <input
                        type="text"
                        value={memberUsernameDrafts[member._id] ?? member.username}
                        onChange={(e) => setMemberUsernameDrafts((prev) => ({ ...prev, [member._id]: e.target.value }))}
                        placeholder="Nuevo nombre de usuario"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-3 text-sm outline-none focus:border-yellow-400"
                      />
                      <button
                        onClick={() => updateMemberUsername(member._id)}
                        disabled={Boolean(memberActionLoading[member._id])}
                        className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold uppercase whitespace-nowrap disabled:opacity-60"
                      >
                        Guardar usuario
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] gap-3 items-center">
                      <input
                        type="password"
                        value={memberPasswordDrafts[member._id] || ''}
                        onChange={(e) => setMemberPasswordDrafts((prev) => ({ ...prev, [member._id]: e.target.value }))}
                        placeholder="Nueva contraseña"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-3 text-sm outline-none focus:border-yellow-400"
                      />
                      <input
                        type="password"
                        value={memberPasswordConfirmDrafts[member._id] || ''}
                        onChange={(e) => setMemberPasswordConfirmDrafts((prev) => ({ ...prev, [member._id]: e.target.value }))}
                        placeholder="Confirmar contraseña"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-3 text-sm outline-none focus:border-yellow-400"
                      />
                      <button
                        onClick={() => resetMemberPassword(member._id)}
                        disabled={Boolean(memberActionLoading[member._id])}
                        className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold uppercase whitespace-nowrap disabled:opacity-60"
                      >
                        Restablecer
                      </button>
                      <button
                        onClick={() => deleteMemberAccount(member._id)}
                        disabled={Boolean(memberActionLoading[member._id]) || member._id === user._id}
                        className="px-4 py-3 rounded-xl bg-red-600/80 hover:bg-red-600 text-xs font-bold uppercase whitespace-nowrap disabled:opacity-40"
                      >
                        Eliminar cuenta
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No hay miembros para mostrar.</p>
              )}
            </div>
          </section>

          <section className="bg-gradient-to-br from-yellow-600/10 to-orange-600/5 p-4 md:p-8 rounded-[40px] border border-yellow-400/30">
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs font-black text-yellow-400 uppercase tracking-widest">📅 Contenido Programado</p>
              <button onClick={fetchScheduledContent} className="text-yellow-400 text-xs font-bold hover:underline">Refrescar</button>
            </div>

            {scheduledLoading ? (
              <p className="text-gray-500 text-sm">Cargando contenido programado...</p>
            ) : (scheduledSongs.length > 0 || scheduledAlbums.length > 0) ? (
              <div className="space-y-6">
                {/* Canciones programadas */}
                {scheduledSongs.length > 0 && (
                  <div>
                    <h4 className="text-sm font-black text-yellow-300 uppercase tracking-widest mb-3">🎵 Canciones Programadas ({scheduledSongs.length})</h4>
                    <div className="space-y-2 bg-black/40 rounded-2xl p-3 border border-yellow-400/20">
                      {scheduledSongs.map((song) => (
                        <div key={song._id} className="flex items-center gap-3 p-3 bg-black/30 rounded-xl hover:bg-black/50 transition">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/40 flex-shrink-0">
                            {song.coverUrl ? (
                              <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><Disc size={18} className="text-yellow-400/40" /></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-white truncate">{song.title}</p>
                            <p className="text-[10px] text-gray-400 uppercase truncate">{song.artist?.username || 'Artista'}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[11px] text-yellow-300 font-black whitespace-nowrap">
                              {new Date(song.scheduledPublishAt).toLocaleDateString('es-ES', { 
                                month: 'short', 
                                day: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                            <p className="text-[9px] text-gray-500 uppercase">Publicación programada</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Álbumes programados */}
                {scheduledAlbums.length > 0 && (
                  <div>
                    <h4 className="text-sm font-black text-yellow-300 uppercase tracking-widest mb-3">💿 Álbumes Programados ({scheduledAlbums.length})</h4>
                    <div className="space-y-2 bg-black/40 rounded-2xl p-3 border border-yellow-400/20">
                      {scheduledAlbums.map((album) => (
                        <div key={album._id} className="flex items-center gap-3 p-3 bg-black/30 rounded-xl hover:bg-black/50 transition">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/40 flex-shrink-0">
                            {album.coverUrl ? (
                              <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><Disc size={18} className="text-yellow-400/40" /></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-white truncate">{album.title}</p>
                            <p className="text-[10px] text-gray-400 uppercase truncate">{album.artist?.username || 'Artista'} • {album.songs?.length || 0} canciones</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[11px] text-yellow-300 font-black whitespace-nowrap">
                              {new Date(album.scheduledPublishAt).toLocaleDateString('es-ES', { 
                                month: 'short', 
                                day: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                            <p className="text-[9px] text-gray-500 uppercase">Publicación programada</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No hay contenido programado para publicar.</p>
            )}
          </section>

          <section className="bg-white/5 p-4 md:p-8 rounded-[40px] border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest">🎞️ Imágenes para Rotación (Top Semanal)</p>
              <div className="flex gap-2">
                <button onClick={publishExpiredScheduled} className="text-red-400 text-xs font-bold hover:underline">Publicar Vencidas</button>
                <button onClick={fetchSongsDebug} className="text-yellow-400 text-xs font-bold hover:underline">Debug Canciones</button>
                <button onClick={fetchTopWeeklyCovers} className="text-yellow-400 text-xs font-bold hover:underline">Refrescar</button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Upload Form */}
              <div className="bg-black/40 rounded-2xl p-4 border border-white/10">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Selecciona una imagen</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setTopWeeklyCoverFile(e.target.files?.[0] || null)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-yellow-400 text-sm"
                    />
                    {topWeeklyCoverFile && (
                      <p className="text-[10px] text-yellow-400">Archivo seleccionado: {topWeeklyCoverFile.name}</p>
                    )}
                  </div>
                  <button
                    onClick={uploadTopWeeklyCover}
                    disabled={topWeeklyCoverUploading || !topWeeklyCoverFile}
                    className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:bg-gray-600 text-black font-black py-2 rounded-xl uppercase text-xs tracking-widest transition-all disabled:opacity-60"
                  >
                    {topWeeklyCoverUploading ? 'Subiendo...' : 'Subir Imagen'}
                  </button>
                </div>
              </div>

              {/* Images List */}
              {topWeeklyCoversLoading ? (
                <p className="text-gray-500 text-sm">Cargando imágenes...</p>
              ) : topWeeklyCovers.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {topWeeklyCovers.map((cover) => (
                    <div key={cover._id} className="group relative bg-black/30 border border-white/10 rounded-xl overflow-hidden hover:border-yellow-400/40 transition-all">
                      <div className="aspect-square overflow-hidden bg-black/60">
                        <img 
                          src={cover.imageUrl} 
                          alt="Cover" 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => deleteTopWeeklyCover(cover._id)}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg"
                        >
                          Eliminar
                        </button>
                      </div>
                      <div className="p-2">
                        <p className="text-[10px] text-gray-400">#{cover.order}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No hay imágenes subidas aún.</p>
              )}
            </div>
          </section>

          <section className="bg-white/5 p-4 md:p-8 rounded-[40px] border border-white/10">
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6">Gestión global de canciones</p>
            <div className="space-y-3">
              {allSongs.length > 0 ? (
                allSongs.map((song) => {
                  const idx = allSongs.findIndex((item) => item._id === song._id);
                  return (
                    <div key={song._id} className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-2xl p-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/40 flex-shrink-0">
                        {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Disc size={20} className="text-yellow-400/40" /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{song.title}</p>
                        <button
                          type="button"
                          onClick={() => song.artist?._id && openArtistProfile(song.artist._id)}
                          className="text-[10px] text-yellow-400 uppercase font-bold tracking-widest hover:text-yellow-300"
                        >
                          {song.artist?.username || 'Artista'}
                        </button>
                      </div>
                      <button
                        onClick={() => playSong(song, idx >= 0 ? idx : 0)}
                        className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center"
                      >
                        <Play size={18} />
                      </button>
                      <button
                        onClick={() => openSongDetail(song)}
                        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold uppercase"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteSong(song._id)}
                        className="px-3 py-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-xs font-bold uppercase"
                      >
                        Eliminar
                      </button>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-sm">No hay canciones publicadas.</p>
              )}
            </div>
          </section>
        </div>
      )}

      {isNotificationsOpen && (
        <div className="fixed top-20 right-4 z-[190] w-[360px] max-w-[calc(100vw-2rem)] bg-black/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-gray-400 font-black">Notificaciones</p>
            <button
              onClick={() => setNotifications([])}
              className="text-[10px] text-yellow-400 font-bold uppercase"
            >
              Limpiar
            </button>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length ? notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNotificationClick(item)}
                className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 ${item.read ? 'opacity-70' : ''}`}
              >
                <p className="text-sm font-bold text-white">{item.title}</p>
                <p className="text-xs text-gray-400 mt-1">{item.message}</p>
              </button>
            )) : (
              <p className="px-4 py-8 text-sm text-gray-500">No tienes notificaciones.</p>
            )}
          </div>
        </div>
      )}

      {confirmDialog.open && (
        <div className="fixed inset-0 z-[210] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-black mb-3">{confirmDialog.title}</h3>
            <p className="text-gray-300 text-sm mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => resolveConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold uppercase"
              >
                Cancelar
              </button>
              <button
                onClick={() => resolveConfirm(true)}
                className="flex-1 py-3 rounded-xl bg-red-600/90 hover:bg-red-600 text-sm font-bold uppercase"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-28 right-4 z-[200]">
          <div className={`px-4 py-3 rounded-2xl border shadow-2xl text-sm font-bold ${toast.type === 'error' ? 'bg-red-900/90 border-red-500 text-red-100' : 'bg-black/90 border-yellow-400/40 text-yellow-200'}`}>
            {toast.message}
          </div>
        </div>
      )}

      {view === 'ajustes' && (
        <div className="animate-in fade-in duration-500">
          <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter mb-6 md:mb-8">Ajustes de Mi Crew</h2>
          <form onSubmit={handleSaveProfile} className="bg-white/5 p-5 md:p-8 rounded-[40px] border border-white/10 max-w-3xl space-y-6">
            <div>
              <p className="text-xs font-black text-gray-500 uppercase mb-3 tracking-widest">Foto de Perfil</p>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center">
                  {settingsPic ? (
                    <img src={URL.createObjectURL(settingsPic)} alt="preview" className="w-full h-full object-cover" />
                  ) : user.profilePic ? (
                    <img src={user.profilePic} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-black text-yellow-400">{user.username.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <label className="px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm font-bold uppercase tracking-wide cursor-pointer hover:border-yellow-400">
                  Cambiar Foto
                  <input type="file" accept="image/*" onChange={(e) => setSettingsPic(e.target.files?.[0] || null)} className="hidden" />
                </label>
              </div>
            </div>

            <div>
              <p className="text-xs font-black text-gray-500 uppercase mb-3 tracking-widest">Descripcion de tu Crew</p>
              <textarea
                value={settingsBio}
                onChange={(e) => setSettingsBio(e.target.value)}
                className="w-full h-40 bg-black/40 p-4 rounded-2xl border border-white/10 outline-none focus:border-yellow-400 text-white"
                placeholder="Describe tu estilo, tu crew y lo que haces..."
              />
            </div>

            {(user.role === 'artist' || user.role === 'admin') && (
              <>
                <div>
                  <p className="text-xs font-black text-gray-500 uppercase mb-3 tracking-widest">Instagram en tu perfil</p>
                  <input
                    type="text"
                    value={settingsInstagramHandle}
                    onChange={(e) => setSettingsInstagramHandle(e.target.value)}
                    placeholder="@tuusuario o enlace de Instagram"
                    className="w-full bg-black/40 p-4 rounded-2xl border border-white/10 outline-none focus:border-yellow-400 text-white"
                  />
                  <p className="mt-2 text-xs text-gray-500">Guárdalo y aparecerá en tu perfil público aunque no uses sincronización automática.</p>
                </div>

                <div>
                  <p className="text-xs font-black text-gray-500 uppercase mb-3 tracking-widest">Sincronización automática</p>
                  {instagramConfig.checked && !instagramConfig.configured && (
                    <div className="mb-3 w-full bg-amber-500/10 border border-amber-400/30 p-3 rounded-2xl">
                      <p className="text-[11px] font-bold text-amber-200 uppercase tracking-widest">No disponible en servidor</p>
                      <p className="text-xs text-amber-100/90 mt-1">Faltan variables de Instagram ({instagramConfig.missing.join(', ')}). Puedes usar el campo manual de arriba para mostrar tu cuenta en el perfil.</p>
                    </div>
                  )}
                  {user.instagramLinked ? (
                    <div className="space-y-3">
                      <div className="w-full bg-black/40 p-4 rounded-2xl border border-white/10">
                        <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Cuenta conectada</p>
                        <p className="font-black text-lg text-pink-300">@{user.instagramHandle || settingsInstagramHandle || 'instagram'}</p>
                        <p className="text-xs text-gray-500 mt-1">Sincronizado: {user.instagramLastSyncedAt ? new Date(user.instagramLastSyncedAt).toLocaleString() : 'pendiente'}</p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={syncInstagramNow}
                          disabled={instagramActionLoading || (instagramConfig.checked && !instagramConfig.configured)}
                          className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold uppercase tracking-widest disabled:opacity-60"
                        >
                          {instagramActionLoading ? 'Sincronizando...' : 'Sincronizar ahora'}
                        </button>
                        <button
                          type="button"
                          onClick={disconnectInstagram}
                          disabled={instagramActionLoading}
                          className="px-4 py-3 rounded-xl bg-red-600/80 hover:bg-red-600 text-xs font-bold uppercase tracking-widest disabled:opacity-60"
                        >
                          Desvincular
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={connectInstagram}
                      disabled={instagramActionLoading || (instagramConfig.checked && !instagramConfig.configured)}
                      className="px-4 py-3 rounded-xl bg-pink-500/80 hover:bg-pink-500 text-xs font-bold uppercase tracking-widest disabled:opacity-60"
                    >
                      {instagramActionLoading ? 'Conectando...' : 'Conectar Instagram'}
                    </button>
                  )}
                  <p className="mt-2 text-xs text-gray-500">Las publicaciones se cargan automáticamente desde Instagram y se actualizan periódicamente.</p>
                  </div>
              </>
            )}

            <div>
              <p className="text-xs font-black text-gray-500 uppercase mb-3 tracking-widest">Cambiar contraseña</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Contraseña actual"
                  className="w-full bg-black/40 p-4 rounded-2xl border border-white/10 outline-none focus:border-yellow-400 text-white"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nueva contraseña"
                  className="w-full bg-black/40 p-4 rounded-2xl border border-white/10 outline-none focus:border-yellow-400 text-white"
                />
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirmar nueva contraseña"
                  className="w-full bg-black/40 p-4 rounded-2xl border border-white/10 outline-none focus:border-yellow-400 text-white"
                />
              </div>
              <button
                type="button"
                onClick={handleChangeOwnPassword}
                disabled={settingsLoading}
                className="mt-3 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold uppercase tracking-widest disabled:opacity-60"
              >
                Cambiar contraseña
              </button>
            </div>

            <div className="flex gap-3">
              <button disabled={settingsLoading} className="flex-1 bg-yellow-400 text-black font-black py-3 px-8 rounded-2xl uppercase tracking-widest text-xs disabled:opacity-60">
                {settingsLoading ? 'Guardando...' : 'Guardar Ajustes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setUser(null);
                  setAuthToken('');
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-black py-3 px-8 rounded-2xl uppercase tracking-widest text-xs transition-all"
              >
                Cerrar Sesión
              </button>
            </div>
          </form>
        </div>
      )}

      <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={user}
        members={members}
        userId={user._id}
        fetchMySongs={fetchMySongs}
        fetchAllSongs={fetchAllSongs}
        fetchPlaylists={fetchPlaylists}
        onSongCreated={(song) => {
          const normalizedSong = normalizeSongEntity(song);
          setAllSongs((prev) => [normalizedSong, ...prev.filter((item) => item._id !== normalizedSong._id)]);
          if (String(normalizedSong.artist?._id) === String(user._id)) {
            setMySongs((prev) => [normalizedSong, ...prev.filter((item) => item._id !== normalizedSong._id)]);
          }
        }}
      />

      <AlbumCreateModal
        isOpen={isAlbumModalOpen}
        onClose={() => { setIsAlbumModalOpen(false); setAlbumToEdit(null); }}
        user={user}
        members={members}
        allSongs={allSongs}
        fetchAlbums={fetchAlbums}
        albumToEdit={albumToEdit}
        onAlbumUpdated={(updated) => {
          const normalizedAlbum = normalizeAlbumEntity(updated);
          setAlbums((prev) => prev.map((a) => a._id === normalizedAlbum._id ? normalizedAlbum : a));
          setSelectedAlbum(normalizedAlbum);
        }}
      />

      <SongDetailPanel
        song={selectedSong}
        onClose={() => setSelectedSong(null)}
        user={user}
        members={members}
        onPlay={(song) => {
          const idx = allSongs.findIndex((item) => item._id === song._id);
          playSong(song, idx >= 0 ? idx : 0);
        }}
        onSave={handleSaveSongChanges}
        onDelete={handleDeleteSong}
        onOpenArtist={openArtistProfile}
        onShare={(songId) => shareLink('song', songId, 'la canción')}
        onAddToPlaylist={(song) => setSongToAddPlaylist(song)}
      />

      <AddToPlaylistModal
        song={songToAddPlaylist}
        playlists={userPlaylists}
        onClose={() => setSongToAddPlaylist(null)}
        onAdd={(playlistId, songId) => addSongToUserPlaylist(playlistId, songId)}
      />

      <PlaylistDetailPanel
        playlist={selectedPlaylist}
        allSongs={allSongs}
        onClose={() => setSelectedPlaylist(null)}
        onPlaySong={(song, playlistIndex, playlistSongs) => {
          const normalizedPlaylistSongs = (playlistSongs || []).map((playlistSong) => {
            const idx = allSongs.findIndex((item) => item._id === playlistSong._id);
            return idx >= 0 ? allSongs[idx] : playlistSong;
          });
          const safeIndex = playlistIndex >= 0 ? playlistIndex : 0;
          const playableSong = normalizedPlaylistSongs[safeIndex] || song;
          playSong(playableSong, safeIndex, { queue: normalizedPlaylistSongs, mode: 'playlist' });
        }}
        onOpenArtist={openArtistProfile}
        isLiked={likedPlaylistSet.has(String(selectedPlaylist?._id || ''))}
        onToggleLike={(playlistId) => toggleFavorite('playlist', playlistId)}
      />

      <AlbumDetailPanel
        album={selectedAlbum}
        onClose={() => setSelectedAlbum(null)}
        user={user}
        allSongs={allSongs}
        onPlaySong={(song, albumIndex, albumSongs) => {
          const normalizedAlbumSongs = (albumSongs || []).map((albumSong) => {
            const idx = allSongs.findIndex((item) => item._id === albumSong._id);
            return idx >= 0 ? allSongs[idx] : albumSong;
          });
          const safeIndex = albumIndex >= 0 ? albumIndex : 0;
          const playableSong = normalizedAlbumSongs[safeIndex] || song;
          playSong(playableSong, safeIndex, { queue: normalizedAlbumSongs, mode: 'album' });
        }}
        onOpenArtist={openArtistProfile}
        onShare={(albumId) => shareLink('album', albumId, 'el álbum')}
        isLiked={likedAlbumSet.has(String(selectedAlbum?._id || ''))}
        onToggleLike={(albumId) => toggleFavorite('album', albumId)}
        onEdit={(album) => {
          setAlbumToEdit(album);
          setIsAlbumModalOpen(true);
        }}
        onDelete={async (albumId) => {
          const confirmed = await askConfirm('¿Eliminar este álbum?', 'Eliminar álbum');
          if (!confirmed) return;
          try {
            const res = await fetch(`${API_URL}/albums/${albumId}`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user._id }),
            });
            if (res.ok) {
              setAlbums((prev) => prev.filter((a) => a._id !== albumId));
              setSelectedAlbum(null);
            } else {
              const d = await res.json().catch(() => ({}));
              alert(d.error || 'Error al eliminar');
            }
          } catch { alert('Error al conectar'); }
        }}
      />
    </Layout>
  );
}

const SongRow = ({ song, onRowClick, onPlay, onArtistClick, onCollaboratorClick, onToggleLike, isLiked }) => (
  <div
    className="group flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-3 py-2 hover:bg-white/10 transition-all cursor-pointer"
    onClick={onRowClick}
  >
    <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/50 flex-shrink-0">
      {song.coverUrl ? (
        <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Disc className="text-yellow-400/40" size={28} />
        </div>
      )}
    </div>

    <div className="min-w-0 flex-1 overflow-hidden">
      <h4 className="font-black uppercase italic text-sm truncate">{song.title}</h4>
      <div className="mt-1 mb-1">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-400/15 border border-yellow-400/30 text-[9px] uppercase tracking-widest font-bold text-yellow-300">
          {SONG_GENRE_OPTIONS.find((item) => item.value === String(song.genre || '').toLowerCase())?.label || 'Otro'}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-0 mt-0.5">
        <button
          type="button"
          onClick={onArtistClick}
          className="text-[10px] text-yellow-400 font-bold tracking-widest uppercase hover:text-yellow-300 leading-tight"
        >
          {song.artist?.username || 'Anonimo'}
        </button>
        {song.collaborators?.filter(c => c.name).map((c, i) => (
          <span key={i} className="flex items-center leading-tight">
            <span className="text-yellow-400 text-[10px] font-bold mx-0.5">,</span>
            {c.userId ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onCollaboratorClick && onCollaboratorClick(c.userId._id || c.userId); }}
                className="text-[10px] text-yellow-400 font-bold tracking-widest uppercase hover:text-yellow-300"
              >
                {c.userId?.username || c.name}
              </button>
            ) : (
              <span className="text-[10px] text-yellow-400 font-bold tracking-widest uppercase">{c.name}</span>
            )}
          </span>
        ))}
      </div>
      <p className="text-[10px] text-white/60 font-bold tracking-widest uppercase mt-1">{formatPlayCount(getSongPlayCount(song))} reproducciones</p>
    </div>

    <div className="flex items-center gap-2">
      {onToggleLike && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike(song._id);
          }}
          aria-label={isLiked ? `Quitar ${song.title} de favoritos` : `Agregar ${song.title} a favoritos`}
          className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${isLiked ? 'bg-pink-500/20 border-pink-400 text-pink-300' : 'bg-white/10 border-white/10 text-gray-300 hover:text-pink-300 hover:border-pink-300/40'}`}
        >
          <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
        </button>
      )}
      <button
        onClick={onPlay}
        aria-label={`Reproducir ${song.title}`}
        className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all"
      >
        <Play fill="currentColor" size={20} className="ml-0.5" />
      </button>
    </div>
  </div>
);

const CrewSongCard = ({ song, onOpen, onPlay, onOpenArtist }) => {
  const isScheduledNotPublished = song.isScheduled && !song.isPublished;

  return (
  <div
    className="group flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2 hover:bg-white/10 transition-all cursor-pointer"
    onClick={onOpen}
  >
    <div className="w-9 h-9 rounded-lg overflow-hidden bg-black/50 flex-shrink-0">
      {song.coverUrl ? (
        <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Disc className="text-yellow-400/40" size={14} />
        </div>
      )}
    </div>

    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-black uppercase italic truncate">{song.title}</p>
      <div className="flex flex-wrap items-center gap-x-0.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (song.artist?._id) onOpenArtist(song.artist._id);
          }}
          className="text-[9px] text-yellow-300/90 font-bold uppercase tracking-widest truncate"
        >
          {song.artist?.username || 'Artista'}
        </button>
        {song.collaborators?.filter((collaborator) => collaborator?.name).map((collaborator, index) => (
          <span key={`crew-collaborator-${song._id}-${index}`} className="flex items-center">
            <span className="text-[9px] text-yellow-300/70 font-bold">,</span>
            {collaborator.userId ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const collaboratorId = collaborator.userId?._id || collaborator.userId;
                  if (collaboratorId) onOpenArtist(collaboratorId);
                }}
                className="text-[9px] text-yellow-300/90 font-bold uppercase tracking-widest truncate"
              >
                {collaborator.userId?.username || collaborator.name}
              </button>
            ) : (
              <span className="text-[9px] text-yellow-300/90 font-bold uppercase tracking-widest truncate">{collaborator.name}</span>
            )}
          </span>
        ))}
        {isScheduledNotPublished && (
          <span className="text-[8px] text-orange-400 font-black uppercase tracking-widest ml-1">⏰ Programada</span>
        )}
      </div>
    </div>

    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (!isScheduledNotPublished) {
          onPlay();
        }
      }}
      disabled={isScheduledNotPublished}
      className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
        isScheduledNotPublished
          ? 'border-gray-600/30 bg-gray-600/20 cursor-not-allowed opacity-50'
          : 'border-white/15 bg-white/10 hover:bg-white/20'
      }`}
      aria-label={isScheduledNotPublished ? `Canción programada para ${new Date(song.scheduledPublishAt).toLocaleDateString()}` : `Reproducir ${song.title}`}
    >
      {isScheduledNotPublished ? (
        <Clock3 size={12} className="text-gray-500" />
      ) : (
        <Play fill="currentColor" size={12} className="ml-[1px]" />
      )}
    </button>
  </div>
  );
};

const SongDetailPanel = ({ song, onClose, user, members, onPlay, onSave, onDelete, onOpenArtist, onShare, onAddToPlaylist }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [genre, setGenre] = useState('otro');
  const [artistId, setArtistId] = useState('');
  const [collaborators, setCollaborators] = useState([]);
  const [panelGradient, setPanelGradient] = useState(getRandomAlbumGradient());
  const [saving, setSaving] = useState(false);
  const [lrcAiLoading, setLrcAiLoading] = useState(false);
  const collabTimerRef = useRef({});

  useEffect(() => {
    if (!song) return;
    setTitle(song.title || '');
    setDescription(song.description || '');
    setLyrics(song.lyrics || '');
    setGenre(song.genre || 'otro');
    setArtistId(song.artist?._id || '');
    setCollaborators((song.collaborators || []).map((collaborator) => ({
      name: collaborator.userId?.username || collaborator.name || '',
      userId: collaborator.userId?._id || collaborator.userId || null,
      suggestions: [],
    })));
    setPanelGradient(getRandomAlbumGradient());
    setIsEditing(false);
  }, [song]);

  useEffect(() => () => {
    Object.values(collabTimerRef.current || {}).forEach((timerId) => clearTimeout(timerId));
  }, []);

  const lyricsDisplay = useMemo(() => parseLyricsForDisplay(lyrics), [lyrics]);

  if (!song) return null;

  const isOwner = String(song.artist?._id) === String(user?._id);
  const canEdit = isOwner || user?.role === 'admin';
  const canDelete = isOwner || user?.role === 'admin';
  const artistOptions = user?.role === 'admin'
    ? (members || []).filter((member) => member.role === 'artist' || member.role === 'admin')
    : [];

  const addCollaborator = () => setCollaborators((prev) => [...prev, { name: '', userId: null, suggestions: [] }]);
  const removeCollaborator = (index) => setCollaborators((prev) => prev.filter((_, idx) => idx !== index));
  const handleCollaboratorNameChange = (index, value) => {
    setCollaborators((prev) => prev.map((collaborator, idx) => (
      idx === index ? { ...collaborator, name: value, userId: null, suggestions: [] } : collaborator
    )));
    if (collabTimerRef.current[index]) clearTimeout(collabTimerRef.current[index]);
    if (value.length >= 2) {
      collabTimerRef.current[index] = setTimeout(async () => {
        try {
          const res = await fetch(`${API_URL}/search?query=${encodeURIComponent(value)}`);
          const users = await res.json().catch(() => []);
          setCollaborators((prev) => prev.map((collaborator, idx) => (
            idx === index ? { ...collaborator, suggestions: Array.isArray(users) ? users : [] } : collaborator
          )));
        } catch (_) {}
      }, 300);
    }
  };
  const selectCollaboratorUser = (index, member) => {
    if (collabTimerRef.current[index]) clearTimeout(collabTimerRef.current[index]);
    setCollaborators((prev) => prev.map((collaborator, idx) => (
      idx === index ? { ...collaborator, name: member.username, userId: member._id, suggestions: [] } : collaborator
    )));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(song._id, {
      title,
      description,
      lyrics,
      genre,
      ...(user?.role === 'admin' ? { artistId } : {}),
      ...(user?.role === 'admin' ? {
        collaborators: JSON.stringify(
          collaborators
            .filter((collaborator) => String(collaborator.name || '').trim())
            .map((collaborator) => ({
              name: String(collaborator.name || '').trim(),
              userId: collaborator.userId || null,
            }))
        ),
      } : {}),
    });
    setSaving(false);
    setIsEditing(false);
  };

  const handleConvertLyricsToLrc = () => {
    const source = String(lyrics || '').trim();
    if (!source) {
      alert('Primero escribe o pega una letra para convertir');
      return;
    }
    if (containsLrcTimestamps(source)) {
      alert('Esta letra ya parece estar en formato LRC');
      return;
    }
    setLyrics(convertPlainLyricsToLrc(source));
    alert('Letra convertida a formato LRC con tiempos base');
  };

  const handleGenerateLrcWithAi = async () => {
    const source = String(lyrics || '').trim();
    if (!source) {
      alert('Primero escribe o pega una letra para generar LRC con IA');
      return;
    }
    if (!song?.audioUrl) {
      alert('Esta canción no tiene audio disponible para análisis de IA');
      return;
    }

    setLrcAiLoading(true);
    try {
      const payload = { lyrics: source, audioUrl: song.audioUrl, mode: 'perfect' };
      const res = await fetch(`${API_URL}/ai/lyrics/to-lrc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.lrc) {
        alert(data.error || 'No se pudo generar LRC con IA');
        return;
      }
      setLyrics(data.lrc);
      alert('LRC generado con IA');
    } catch (error) {
      console.error(error);
      alert('Error al generar LRC con IA');
    } finally {
      setLrcAiLoading(false);
    }
  };

  const handleSuggestGenre = () => {
    const suggested = inferGenreFromSongText({ title, description, lyrics });
    setGenre(suggested);
    const label = SONG_GENRE_OPTIONS.find((item) => item.value === suggested)?.label || 'Otro';
    alert(`Género sugerido: ${label}`);
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-sm p-4 md:p-8 overflow-y-auto">
      <div className={`max-w-6xl mx-auto bg-gradient-to-b ${panelGradient} rounded-3xl border border-white/10 overflow-hidden`}>
        <div className="p-6 md:p-10 flex flex-col md:flex-row gap-6 md:gap-8 items-end">
          <div className="w-48 h-48 md:w-60 md:h-60 rounded-xl overflow-hidden border border-white/10 shadow-2xl flex-shrink-0 bg-black/30">
            {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Disc className="text-yellow-400/40" size={72} /></div>}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-white/80 text-xl font-bold">Cancion</p>
            <h2 className="text-3xl md:text-5xl lg:text-8xl font-black leading-none uppercase tracking-tight break-words">{title || song.title}</h2>
            <div className="mt-4 flex flex-wrap items-baseline gap-x-0">
              <button
                type="button"
                onClick={() => song.artist?._id && onOpenArtist(song.artist._id)}
                className="text-white/80 font-semibold hover:text-yellow-300"
              >
                {song.artist?.username || 'Artista'}
                {' – '}{new Date(song.createdAt).getFullYear() || '2026'}
              </button>
              {song.collaborators?.filter(c => c.name).map((c, i) => (
                <span key={i} className="flex items-baseline">
                  <span className="text-white/80 font-semibold mx-1">,</span>
                  {c.userId ? (
                    <button type="button" onClick={() => { const id = c.userId._id || c.userId; if (id) onOpenArtist(id); }} className="text-white/80 font-semibold hover:text-yellow-300">
                      {c.userId?.username || c.name}
                    </button>
                  ) : (
                    <span className="text-white/80 font-semibold">{c.name}</span>
                  )}
                </span>
              ))}
              <span className="ml-2 text-yellow-300/90 text-xs font-black uppercase tracking-widest">
                • {formatPlayCount(getSongPlayCount(song))} reproducciones
              </span>
            </div>
          </div>

          <button onClick={onClose} className="self-start md:self-auto p-3 rounded-xl bg-black/30 hover:bg-black/50 transition">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 md:px-10 py-6 border-t border-white/10 bg-black/25">
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => onPlay(song)}
              disabled={song.isScheduled && !song.isPublished}
              className={`w-14 h-14 rounded-full text-black flex items-center justify-center transition ${
                song.isScheduled && !song.isPublished
                  ? 'bg-gray-500 cursor-not-allowed opacity-50'
                  : 'bg-green-500 hover:bg-green-400'
              }`}
            >
              {song.isScheduled && !song.isPublished ? (
                <Clock3 size={22} className="text-gray-300" />
              ) : (
                <Play fill="black" size={22} className="ml-0.5" />
              )}
            </button>
            {song.isScheduled && !song.isPublished && (
              <div className="text-xs text-orange-400 font-bold uppercase tracking-widest">
                Programada para {new Date(song.scheduledPublishAt).toLocaleDateString('es-ES', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            )}
            <button onClick={() => onShare(song._id)} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold uppercase tracking-wide flex items-center gap-2">
              <Share2 size={15} /> Compartir
            </button>
            <button onClick={() => onAddToPlaylist(song)} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold uppercase tracking-wide flex items-center gap-2">
              <Plus size={15} /> Agregar a playlist
            </button>
            {canEdit && !isEditing && (
              <button onClick={() => setIsEditing(true)} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                <Edit3 size={15} /> Editar
              </button>
            )}
            {canEdit && isEditing && (
              <button disabled={saving} onClick={handleSave} className="px-4 py-2 rounded-xl bg-yellow-400 text-black hover:bg-yellow-300 text-sm font-bold uppercase tracking-wide flex items-center gap-2 disabled:opacity-60">
                <Save size={15} /> {saving ? 'Guardando...' : 'Guardar'}
              </button>
            )}
            {canDelete && (
              <button onClick={() => onDelete(song._id)} className="px-4 py-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                <Trash2 size={15} /> Eliminar
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <h3 className="text-3xl font-black mb-4">Letra</h3>
              {isEditing ? (
                <div className="mb-4 flex flex-col md:flex-row gap-2">
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-yellow-400 text-sm font-bold uppercase"
                  >
                    {SONG_GENRE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleSuggestGenre}
                    className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold uppercase tracking-widest"
                  >
                    Sugerir género
                  </button>
                </div>
              ) : (
                <div className="mb-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-400/15 border border-yellow-400/30 text-[10px] uppercase tracking-widest font-bold text-yellow-300">
                    Género: {SONG_GENRE_OPTIONS.find((item) => item.value === String(genre || '').toLowerCase())?.label || 'Otro'}
                  </span>
                </div>
              )}
              {isEditing ? (
                <div>
                  <textarea
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    className="w-full h-80 bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-yellow-400"
                    placeholder="Escribe la letra (texto normal o LRC: [mm:ss.xx]Linea)"
                  />
                  <button
                    type="button"
                    onClick={handleConvertLyricsToLrc}
                    className="mt-3 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold uppercase tracking-widest"
                  >
                    Convertir a LRC
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateLrcWithAi}
                    disabled={lrcAiLoading}
                    className="mt-3 ml-2 px-4 py-2 rounded-xl bg-yellow-500/80 hover:bg-yellow-500 text-xs font-bold uppercase tracking-widest disabled:opacity-60"
                  >
                    {lrcAiLoading ? 'Analizando...' : 'Generar LRC con IA'}
                  </button>
                  <p className="text-[11px] text-gray-400 mt-2">Tip: formato LRC ejemplo [00:12.50]Primera línea. Si pegas texto normal también se mostrará bien.</p>
                </div>
              ) : (
                lyricsDisplay.lines.length ? (
                  <div className="space-y-2">
                    {lyricsDisplay.isLrc ? (
                      lyricsDisplay.lines.map((line) => (
                        <div key={line.id} className="flex items-baseline gap-3 rounded-xl bg-black/20 px-3 py-2">
                          <span className="text-[11px] font-black uppercase tracking-widest text-yellow-300/90 min-w-[68px]">[{line.timeLabel}]</span>
                          <p className="text-lg leading-relaxed text-gray-100 whitespace-pre-wrap">{line.text || '...'}</p>
                        </div>
                      ))
                    ) : (
                      lyricsDisplay.lines.map((line) => (
                        <p key={line.id} className="whitespace-pre-wrap text-lg leading-relaxed text-gray-200">{line.text}</p>
                      ))
                    )}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-lg leading-relaxed text-gray-200">Esta cancion aun no tiene letra cargada.</p>
                )
              )}
            </div>

            <div className="space-y-4">
              <h4 className="text-xl font-black">Detalle</h4>
              {isEditing ? (
                <>
                  {user?.role === 'admin' && (
                    <>
                      <select
                        value={artistId}
                        onChange={(e) => setArtistId(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-yellow-400"
                      >
                        {artistOptions.map((member) => (
                          <option key={member._id} value={member._id}>{member.username} ({member.role})</option>
                        ))}
                      </select>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Colaboradores</p>
                          <button
                            type="button"
                            onClick={addCollaborator}
                            className="flex items-center gap-1 text-[10px] text-yellow-400 font-bold uppercase tracking-widest hover:text-yellow-300"
                          >
                            <Plus size={12} /> Añadir
                          </button>
                        </div>

                        {collaborators.length > 0 ? collaborators.map((collaborator, index) => (
                          <div key={`detail-collaborator-${index}`} className="relative flex items-start gap-2">
                            <div className="relative flex-1">
                              <input
                                type="text"
                                value={collaborator.name}
                                placeholder="NOMBRE DEL COLABORADOR"
                                onChange={(e) => handleCollaboratorNameChange(index, e.target.value)}
                                className={`w-full bg-black/40 p-3 rounded-xl border ${collaborator.userId ? 'border-yellow-400/60' : 'border-white/10'} outline-none focus:border-yellow-400 text-white text-sm font-bold`}
                              />
                              {collaborator.userId && <p className="text-[9px] text-yellow-400/80 mt-1 pl-1 font-bold uppercase tracking-widest">✓ Cuenta registrada</p>}
                              {collaborator.suggestions?.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden z-50 shadow-xl max-h-48 overflow-y-auto">
                                  {collaborator.suggestions.slice(0, 5).map((member) => (
                                    <button
                                      key={member._id}
                                      type="button"
                                      onClick={() => selectCollaboratorUser(index, member)}
                                      className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-2 text-sm"
                                    >
                                      {member.profilePic ? <img src={member.profilePic} alt={member.username} className="w-6 h-6 rounded-full object-cover flex-shrink-0" /> : <div className="w-6 h-6 rounded-full bg-yellow-400/20 flex items-center justify-center text-[10px] font-black text-yellow-400 flex-shrink-0">{member.username.charAt(0).toUpperCase()}</div>}
                                      <span className="font-bold truncate">{member.username}</span>
                                      <span className="text-[10px] text-gray-500 ml-auto uppercase">{member.role}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button type="button" onClick={() => removeCollaborator(index)} className="p-2 mt-1 text-gray-500 hover:text-red-400 flex-shrink-0">
                              <X size={16} />
                            </button>
                          </div>
                        )) : <p className="text-xs text-gray-500">No hay colaboradores cargados.</p>}
                      </div>
                    </>
                  )}
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-yellow-400"
                    placeholder="Titulo"
                  />
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full h-36 bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-yellow-400"
                    placeholder="Descripcion"
                  />
                </>
              ) : (
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{description || 'Sin descripcion'}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PlaylistDetailPanel = ({ playlist, allSongs, onClose, onPlaySong, onOpenArtist, isLiked, onToggleLike }) => {
  const [panelGradient, setPanelGradient] = useState(getRandomAlbumGradient());
  const songsById = useMemo(() => {
    const map = new Map();
    (allSongs || []).forEach((song) => {
      if (song?._id) map.set(String(song._id), song);
    });
    return map;
  }, [allSongs]);

  const resolveSongArtist = (song) => {
    if (song?.artist?.username) return song.artist;
    const fallback = songsById.get(String(song?._id || ''));
    return fallback?.artist || song?.artist || null;
  };

  const resolveSongCollaborators = (song) => {
    if (Array.isArray(song?.collaborators) && song.collaborators.length > 0) {
      return song.collaborators;
    }
    const fallback = songsById.get(String(song?._id || ''));
    return fallback?.collaborators || [];
  };

  useEffect(() => {
    if (playlist) {
      setPanelGradient(getRandomAlbumGradient());
    }
  }, [playlist]);

  if (!playlist) return null;

  return (
    <div className="fixed inset-0 z-[105] bg-black/85 backdrop-blur-sm p-4 md:p-8 overflow-y-auto">
      <div className={`max-w-6xl mx-auto bg-gradient-to-b ${panelGradient} rounded-3xl border border-white/10 overflow-hidden`}>
        <div className="p-6 md:p-10 flex flex-col md:flex-row gap-6 items-end">
          <div className="w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden bg-black/30 border border-white/10">
            {playlist.coverUrl ? (
              <img src={playlist.coverUrl} alt={playlist.name} className="w-full h-full object-cover" />
            ) : playlist.songs?.[0]?.coverUrl ? (
              <img src={playlist.songs[0].coverUrl} alt={playlist.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><Disc size={72} className="text-yellow-400/40" /></div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm uppercase tracking-[0.3em] text-gray-300 font-black">Lista pública</p>
            <h2 className="text-5xl md:text-7xl font-black tracking-tight">{playlist.name}</h2>
            <p className="mt-3 text-gray-200 text-lg">{playlist.description || 'Playlist oficial de RTN Music'}</p>
            <p className="mt-4 text-white/70 font-semibold">{playlist.songs?.length || 0} canciones</p>
            <button
              type="button"
              onClick={() => onToggleLike && onToggleLike(playlist._id)}
              className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all ${isLiked ? 'border-pink-300/50 bg-pink-500/15 text-pink-200' : 'border-white/15 bg-white/10 text-white hover:border-pink-300/40 hover:text-pink-200'}`}
            >
              <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} /> {isLiked ? 'En favoritos' : 'Guardar'}
            </button>
          </div>
          <button onClick={onClose} className="self-start md:self-auto p-3 rounded-xl bg-black/30 hover:bg-black/50 transition"><X size={20} /></button>
        </div>

        <div className="border-t border-white/10 px-6 md:px-10 py-6 pb-32 md:pb-40 bg-black/20 space-y-3">
          {playlist.songs?.length ? playlist.songs.map((song, index) => (
            <div key={song._id} className="flex items-center gap-3 py-3 border-b border-white/5">
              <span className="hidden md:block text-gray-500 font-bold w-7 text-center flex-shrink-0">{index + 1}</span>
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden bg-black/40 flex-shrink-0">
                {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Disc size={20} className="text-yellow-400/40" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{song.title}</p>
                <div className="text-xs text-gray-400 truncate">
                  <button
                    type="button"
                    onClick={() => {
                      const artist = resolveSongArtist(song);
                      if (artist?._id) onOpenArtist(artist._id);
                    }}
                    className="inline hover:text-yellow-300"
                  >
                    {resolveSongArtist(song)?.username || 'Artista'}
                  </button>
                  {resolveSongCollaborators(song).map((collaborator, collaboratorIndex) => {
                    const collaboratorName = collaborator?.userId?.username || collaborator?.name || 'Colaborador';
                    const collaboratorId = collaborator?.userId?._id || collaborator?.userId;
                    return (
                      <span key={`${song._id}-playlist-collab-${collaboratorIndex}`}>
                        {', '}
                        {collaboratorId ? (
                          <button
                            type="button"
                            onClick={() => onOpenArtist(collaboratorId)}
                            className="inline hover:text-yellow-300"
                          >
                            {collaboratorName}
                          </button>
                        ) : (
                          <span>{collaboratorName}</span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={() => onPlaySong(song, index, playlist.songs || [])}
                disabled={song.isScheduled && !song.isPublished}
                className={`w-12 h-12 rounded-xl border flex-shrink-0 flex items-center justify-center transition-all ${
                  song.isScheduled && !song.isPublished
                    ? 'bg-gray-600/20 border-gray-600/30 cursor-not-allowed opacity-50'
                    : 'bg-white/15 hover:bg-white/25 border-white/15'
                }`}
                aria-label={song.isScheduled && !song.isPublished ? "Canción programada" : "Reproducir canción"}
              >
                {song.isScheduled && !song.isPublished ? (
                  <Clock3 size={18} className="text-gray-400" />
                ) : (
                  <Play size={18} fill="white" className="text-white ml-[2px]" />
                )}
              </button>
            </div>
          )) : <p className="text-gray-500">Esta playlist no tiene canciones.</p>}
        </div>
      </div>
    </div>
  );
};

const AlbumDetailPanel = ({ album, onClose, user, allSongs, onPlaySong, onOpenArtist, onShare, isLiked, onToggleLike, onEdit, onDelete }) => {
  const [panelGradient, setPanelGradient] = useState(getRandomAlbumGradient());
  const songsById = useMemo(() => {
    const map = new Map();
    (allSongs || []).forEach((song) => {
      if (song?._id) map.set(String(song._id), song);
    });
    return map;
  }, [allSongs]);

  useEffect(() => {
    if (album) {
      setPanelGradient(getRandomAlbumGradient());
    }
  }, [album]);

  if (!album) return null;

  const albumArtistId = album?.artist?._id || album?.artist;
  const isOwner = user && (String(user._id) === String(albumArtistId) || user.role === 'admin');

  const resolveSongArtist = (song) => {
    if (song?.artist?.username) return song.artist;
    const fallback = songsById.get(String(song?._id || ''));
    return fallback?.artist || song?.artist || null;
  };

  const resolveSongCollaborators = (song) => {
    if (Array.isArray(song?.collaborators) && song.collaborators.length) {
      return song.collaborators;
    }
    const fallback = songsById.get(String(song?._id || ''));
    return fallback?.collaborators || [];
  };

  return (
    <div className="fixed inset-0 z-[105] bg-black/85 backdrop-blur-sm p-4 md:p-8 overflow-y-auto">
      <div className={`max-w-6xl mx-auto bg-gradient-to-b ${panelGradient} rounded-3xl border border-white/10 overflow-hidden`}>
        <div className="p-6 md:p-10 flex flex-col md:flex-row gap-6 items-end">
          <div className="w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden bg-black/30 border border-white/10">
            {album.coverUrl ? (
              <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover" />
            ) : album.songs?.[0]?.coverUrl ? (
              <img src={album.songs[0].coverUrl} alt={album.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><Disc size={72} className="text-white/40" /></div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm uppercase tracking-[0.3em] text-white/70 font-black">Álbum</p>
            <h2 className="text-5xl md:text-7xl font-black tracking-tight text-white">{album.title}</h2>
            <button
              type="button"
              onClick={() => album.artist?._id && onOpenArtist(album.artist._id)}
              className="mt-3 text-white/80 font-semibold hover:text-yellow-300 text-lg"
            >
              {album.artist?.username || 'Artista'}
            </button>
            <p className="mt-2 text-white/70 font-semibold">{album.songs?.length || 0} canciones • {album.releaseYear || new Date(album.releaseDate).getFullYear()}</p>
            <p className="mt-1 text-yellow-300/90 text-xs font-black uppercase tracking-widest">{formatPlayCount(getAlbumPlayCount(album))} reproducciones del álbum</p>
            <button
              type="button"
              onClick={() => onToggleLike && onToggleLike(album._id)}
              className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all ${isLiked ? 'border-pink-300/50 bg-pink-500/15 text-pink-200' : 'border-white/15 bg-white/10 text-white hover:border-pink-300/40 hover:text-pink-200'}`}
            >
              <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} /> {isLiked ? 'En favoritos' : 'Guardar'}
            </button>
            {isOwner && (
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => onShare(album._id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-widest transition-all"
                >
                  <Share2 size={14} /> Compartir
                </button>
                <button
                  onClick={() => onEdit(album)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-widest transition-all"
                >
                  <Edit3 size={14} /> Editar
                </button>
                <button
                  onClick={() => onDelete(album._id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/30 hover:bg-red-600/60 text-red-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all"
                >
                  <Trash2 size={14} /> Eliminar
                </button>
              </div>
            )}
          </div>
          <button onClick={onClose} className="self-start md:self-auto p-3 rounded-xl bg-black/30 hover:bg-black/50 transition"><X size={20} /></button>
        </div>

        <div className="border-t border-white/10 px-6 md:px-10 py-6 pb-32 md:pb-40 bg-black/40 space-y-3">
          {album.songs?.length ? album.songs.map((song, index) => (
            <div key={song._id} className="flex items-center gap-3 py-3 border-b border-white/5">
              <span className="hidden md:block text-white/50 font-bold w-7 text-center flex-shrink-0">{index + 1}</span>
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden bg-black/40 flex-shrink-0">
                {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Disc size={20} className="text-white/40" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate">{song.title}</p>
                <div className="text-xs text-white/60 truncate">
                  <button
                    type="button"
                    onClick={() => {
                      const artist = resolveSongArtist(song);
                      if (artist?._id) onOpenArtist(artist._id);
                    }}
                    className="inline hover:text-yellow-300"
                  >
                    {resolveSongArtist(song)?.username || 'Artista'}
                  </button>
                  {resolveSongCollaborators(song).map((collaborator, collaboratorIndex) => {
                    const collaboratorName = collaborator?.userId?.username || collaborator?.name || 'Colaborador';
                    const collaboratorId = collaborator?.userId?._id || collaborator?.userId;
                    return (
                      <span key={`${song._id}-album-collab-${collaboratorIndex}`}>
                        {', '}
                        {collaboratorId ? (
                          <button
                            type="button"
                            onClick={() => onOpenArtist(collaboratorId)}
                            className="inline hover:text-yellow-300"
                          >
                            {collaboratorName}
                          </button>
                        ) : (
                          <span>{collaboratorName}</span>
                        )}
                      </span>
                    );
                  })}
                </div>
                <p className="text-[10px] text-yellow-200/90 font-bold uppercase tracking-widest mt-1">{formatPlayCount(getSongPlayCount(song))} reproducciones</p>
              </div>
              <button
                onClick={() => onPlaySong(song, index, album.songs || [])}
                disabled={song.isScheduled && !song.isPublished}
                className={`w-12 h-12 rounded-xl border flex-shrink-0 flex items-center justify-center transition-all ${
                  song.isScheduled && !song.isPublished
                    ? 'bg-gray-600/20 border-gray-600/30 cursor-not-allowed opacity-50'
                    : 'bg-white/15 hover:bg-white/25 border-white/15'
                }`}
                aria-label={song.isScheduled && !song.isPublished ? "Canción programada" : "Reproducir canción"}
              >
                {song.isScheduled && !song.isPublished ? (
                  <Clock3 size={18} className="text-gray-400" />
                ) : (
                  <Play size={18} fill="white" className="text-white ml-[2px]" />
                )}
              </button>
            </div>
          )) : <p className="text-white/60">Este álbum no tiene canciones.</p>}
        </div>
      </div>
    </div>
  );
};

const AlbumCreateModal = ({ isOpen, onClose, user, members, allSongs, fetchAlbums, albumToEdit, onAlbumUpdated }) => {
  const isEditing = !!albumToEdit;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('');
  const [releaseYear, setReleaseYear] = useState(new Date().getFullYear());
  const [artistId, setArtistId] = useState(user?._id || '');
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [previewGradient, setPreviewGradient] = useState(getRandomAlbumGradient());
  const [loading, setLoading] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const artistOptions = user?.role === 'admin'
    ? (members || []).filter((member) => member.role === 'artist' || member.role === 'admin')
    : [];
  const selectedArtistId = user?.role === 'admin' ? artistId : user._id;
  const userSongs = useMemo(
    () => allSongs.filter((song) => String(song.artist?._id) === String(selectedArtistId)),
    [allSongs, selectedArtistId]
  );

  useEffect(() => {
    if (isOpen) {
      if (albumToEdit) {
        setTitle(albumToEdit.title || '');
        setDescription(albumToEdit.description || '');
        setCoverUrl(albumToEdit.coverUrl || '');
        setCoverFile(null);
        setReleaseYear(Number(albumToEdit.releaseYear) || new Date().getFullYear());
        setArtistId(albumToEdit.artist?._id || user?._id || '');
        setIsScheduled(false);
        setScheduledDate('');
      } else {
        setTitle('');
        setDescription('');
        setCoverUrl('');
        setCoverFile(null);
        setReleaseYear(new Date().getFullYear());
        setArtistId(user?._id || '');
        setSelectedSongs([]);
        setPreviewGradient(getRandomAlbumGradient());
        setIsScheduled(false);
        setScheduledDate('');
      }
    }
  }, [isOpen, albumToEdit, user]);

  useEffect(() => {
    setSelectedSongs((prev) => prev.filter((songId) => userSongs.some((song) => String(song._id) === String(songId))));
  }, [artistId, user?._id, userSongs]);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreviewUrl('');
      return undefined;
    }

    const objectUrl = URL.createObjectURL(coverFile);
    setCoverPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [coverFile]);

  if (!isOpen) return null;

  const handleAddSong = (songId) => {
    if (selectedSongs.includes(songId)) {
      setSelectedSongs((prev) => prev.filter((id) => id !== songId));
    } else {
      setSelectedSongs((prev) => [...prev, songId]);
    }
  };

  const handleSave = async () => {
    if (isScheduled && !scheduledDate) return alert('Debes seleccionar una fecha y hora para la publicación programada');

    setLoading(true);
    try {
      const endpoint = isEditing ? `${API_URL}/albums/${albumToEdit._id}` : `${API_URL}/albums`;
      const method = isEditing ? 'PUT' : 'POST';

      const formData = new FormData();
      formData.append('userId', user._id);
      formData.append('artistId', artistId || user._id);
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('coverUrl', coverUrl.trim());
      formData.append('releaseYear', String(releaseYear));
      formData.append('themeGradient', previewGradient);
      formData.append('songIds', JSON.stringify(selectedSongs || []));
      formData.append('isScheduled', isScheduled);
      if (isScheduled) {
        formData.append('scheduledPublishAt', new Date(scheduledDate).toISOString());
      }
      if (coverFile) formData.append('cover', coverFile);

      const res = await fetch(endpoint, {
        method,
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        if (isEditing) {
          onAlbumUpdated && onAlbumUpdated(data.album);
        } else {
          fetchAlbums();
        }
        onClose();
      } else {
        alert(data.error || 'Error al guardar el álbum');
      }
    } catch (err) {
      console.error(err);
      alert('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-start md:items-center justify-center pt-10 px-4 pb-28 overflow-y-auto">
      <form onSubmit={handleSave} className="bg-[#121212] border border-white/10 w-full max-w-2xl rounded-[40px] p-6 md:p-10 relative animate-in zoom-in-95 my-4 md:my-0">
        <h2 className="text-2xl md:text-3xl font-black italic mb-6 md:mb-8 uppercase tracking-tighter text-white">
          {isEditing ? <><span className="text-yellow-400">EDITAR</span> ÁLBUM</> : <>CREAR <span className="text-yellow-400">NUEVO ÁLBUM</span></>}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Preview */}
          <div className={`rounded-3xl overflow-hidden aspect-square bg-gradient-to-br ${previewGradient} flex items-center justify-center shadow-lg`}>
            {coverPreviewUrl ? (
              <img src={coverPreviewUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : coverUrl ? (
              <img src={coverUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <Disc size={64} className="text-white/40" />
            )}
          </div>

          {/* Form */}
          <div className="space-y-4">
            {user?.role === 'admin' && (
              <select
                value={artistId}
                onChange={(e) => setArtistId(e.target.value)}
                className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-yellow-400 text-white font-bold"
              >
                {artistOptions.map((member) => (
                  <option key={member._id} value={member._id}>{member.username} ({member.role})</option>
                ))}
              </select>
            )}
            <input
              type="text"
              placeholder="TÍTULO DEL ÁLBUM"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-yellow-400 text-white font-bold"
            />
            <textarea
              placeholder="DESCRIPCIÓN (OPCIONAL)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-yellow-400 text-white h-20"
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
              className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-yellow-400 text-white font-bold"
            />
            {coverUrl && !coverFile && <p className="text-[10px] text-gray-400">Usando portada actual guardada.</p>}
            <input
              type="number"
              min="1900"
              max="3000"
              placeholder="AÑO DE LANZAMIENTO"
              value={releaseYear}
              onChange={(e) => setReleaseYear(Number(e.target.value) || new Date().getFullYear())}
              className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-yellow-400 text-white font-bold"
            />
            <button
              type="button"
              onClick={() => setPreviewGradient(getRandomAlbumGradient())}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-2xl uppercase tracking-widest text-[10px] transition-all"
            >
              Cambiar Color
            </button>
          </div>
        </div>

        {/* Songs Selection */}
        <div className="bg-black/20 rounded-3xl p-4 mb-6 border border-white/5 max-h-48 overflow-y-auto">
          <p className="text-xs font-black text-gray-400 uppercase mb-4 tracking-widest">Seleccionar Canciones ({selectedSongs.length})</p>
          {userSongs.length > 0 ? (
            <div className="space-y-2">
              {userSongs.map((song) => (
                <label key={song._id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={selectedSongs.includes(song._id)}
                    onChange={() => handleAddSong(song._id)}
                    className="accent-yellow-400 cursor-pointer"
                  />
                  <span className="text-sm text-white flex-1 truncate">{song.title}</span>
                  <span className="text-xs text-gray-400">
                    {Number.isFinite(song.duration)
                      ? `${Math.floor(song.duration / 60)}:${String(song.duration % 60).padStart(2, '0')}`
                      : '--:--'}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              {user?.role === 'admin' ? 'Ese artista no tiene canciones subidas aún' : 'No tienes canciones subidas aún'}
            </p>
          )}
        </div>

        {/* Scheduling Section */}
        <div className="bg-black/20 rounded-3xl p-4 mb-6 border border-white/5">
          <label className="flex items-center gap-3 mb-3">
            <input
              type="checkbox"
              checked={isScheduled}
              onChange={(e) => setIsScheduled(e.target.checked)}
              className="w-4 h-4 rounded accent-yellow-400 cursor-pointer"
            />
            <span className="text-sm font-bold text-white uppercase tracking-widest">Programar publicación</span>
          </label>
          {isScheduled && (
            <div className="bg-black/30 border border-yellow-400/30 rounded-2xl p-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">
                Fecha y hora de publicación
              </label>
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full bg-black/40 p-3 rounded-xl border border-yellow-400/50 outline-none focus:border-yellow-400 text-white text-sm font-bold"
              />
              <p className="text-[10px] text-gray-400 mt-2">El álbum se publicará automáticamente en la fecha y hora seleccionada</p>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 text-gray-500 font-black uppercase text-[10px] tracking-widest hover:text-white transition-all"
          >
            CANCELAR
          </button>
          <button
            disabled={loading}
            className="flex-1 bg-yellow-400 text-black font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg shadow-yellow-400/20 disabled:opacity-50 hover:bg-yellow-300 transition-all"
          >
            {loading ? 'GUARDANDO...' : isEditing ? 'GUARDAR CAMBIOS' : 'CREAR ÁLBUM'}
          </button>
        </div>
      </form>
    </div>
  );
};

const AddToPlaylistModal = ({ song, playlists, onClose, onAdd }) => {
  if (!song) return null;

  return (
    <div className="fixed inset-0 z-[205] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#111] border border-white/10 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-black">Agregar a playlist</h3>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20"><X size={16} /></button>
        </div>

        <p className="text-sm text-gray-400 mb-4">Canción: <span className="text-white font-bold">{song.title}</span></p>

        <div className="max-h-80 overflow-y-auto space-y-2">
          {playlists.length > 0 ? playlists.map((playlist) => {
            const alreadyInPlaylist = playlist.songs?.some((item) => String(item._id) === String(song._id));
            return (
              <button
                key={playlist._id}
                onClick={() => onAdd(playlist._id, song._id)}
                disabled={alreadyInPlaylist}
                className={`w-full text-left rounded-2xl border p-3 transition ${alreadyInPlaylist ? 'border-white/10 bg-white/5 text-gray-500 cursor-not-allowed' : 'border-white/15 bg-black/30 hover:bg-white/10'}`}
              >
                <p className="font-bold truncate">{playlist.name}</p>
                <p className="text-xs text-gray-400">{playlist.songs?.length || 0} canciones</p>
              </button>
            );
          }) : <p className="text-gray-500 text-sm">No tienes playlists. Crea una en tu pestaña Playlists.</p>}
        </div>
      </div>
    </div>
  );
};

const UploadModal = ({ isOpen, onClose, user, members, userId, fetchMySongs, fetchAllSongs, fetchPlaylists, onSongCreated }) => {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [genre, setGenre] = useState('otro');
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lrcAiLoading, setLrcAiLoading] = useState(false);
  const [artistId, setArtistId] = useState(userId);
  const [collaborators, setCollaborators] = useState([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const collabTimerRef = useRef({});

  useEffect(() => {
    if (isOpen) {
      setArtistId(userId);
      setCollaborators([]);
      setGenre('otro');
      setIsScheduled(false);
      setScheduledDate('');
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const artistOptions = user?.role === 'admin'
    ? members.filter((member) => member.role === 'artist' || member.role === 'admin')
    : [];

  const addCollaborator = () => setCollaborators(prev => [...prev, { name: '', userId: null, suggestions: [] }]);
  const removeCollaborator = (i) => setCollaborators(prev => prev.filter((_, idx) => idx !== i));
  const handleCollaboratorNameChange = (i, value) => {
    setCollaborators(prev => prev.map((c, idx) => idx === i ? { ...c, name: value, userId: null, suggestions: [] } : c));
    if (collabTimerRef.current[i]) clearTimeout(collabTimerRef.current[i]);
    if (value.length >= 2) {
      collabTimerRef.current[i] = setTimeout(async () => {
        try {
          const res = await fetch(`${API_URL}/search?query=${encodeURIComponent(value)}`);
          const users = await res.json();
          setCollaborators(prev => prev.map((c, idx) => idx === i ? { ...c, suggestions: Array.isArray(users) ? users : [] } : c));
        } catch (_) {}
      }, 300);
    }
  };
  const selectCollaboratorUser = (i, u) => {
    if (collabTimerRef.current[i]) clearTimeout(collabTimerRef.current[i]);
    setCollaborators(prev => prev.map((c, idx) => idx === i ? { ...c, name: u.username, userId: u._id, suggestions: [] } : c));
  };

  const handleConvertLyricsToLrc = () => {
    const source = String(lyrics || '').trim();
    if (!source) {
      alert('Primero escribe o pega una letra para convertir');
      return;
    }
    if (containsLrcTimestamps(source)) {
      alert('Esta letra ya parece estar en formato LRC');
      return;
    }
    setLyrics(convertPlainLyricsToLrc(source));
    alert('Letra convertida a formato LRC con tiempos base');
  };

  const handleGenerateLrcWithAi = async () => {
    const source = String(lyrics || '').trim();
    if (!source) {
      alert('Primero escribe o pega una letra para generar LRC con IA');
      return;
    }
    if (!audioFile) {
      alert('Selecciona primero el audio para que la IA pueda analizar la canción');
      return;
    }

    setLrcAiLoading(true);
    try {
      const formData = new FormData();
      formData.append('lyrics', source);
      formData.append('audio', audioFile);
      formData.append('mode', 'perfect');

      const res = await fetch(`${API_URL}/ai/lyrics/to-lrc`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.lrc) {
        alert(data.error || 'No se pudo generar LRC con IA');
        return;
      }
      setLyrics(data.lrc);
      alert('LRC generado con IA');
    } catch (error) {
      console.error(error);
      alert('Error al generar LRC con IA');
    } finally {
      setLrcAiLoading(false);
    }
  };

  const handleSuggestGenre = () => {
    const suggested = inferGenreFromSongText({ title, description: desc, lyrics });
    setGenre(suggested);
    const label = SONG_GENRE_OPTIONS.find((item) => item.value === suggested)?.label || 'Otro';
    alert(`Género sugerido: ${label}`);
  };

  const handleUpload = async (e) => {
    if (isScheduled && !scheduledDate) return alert('Debes seleccionar una fecha y hora para la publicación programada');
    if (!userId) return alert('Sesion invalida. Cierra sesion y vuelve a entrar.');

    setLoading(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', desc);
    formData.append('lyrics', lyrics);
    formData.append('genre', genre);
    formData.append('artistId', artistId || userId);
    formData.append('uploaderId', userId);
    formData.append('collaborators', JSON.stringify(
      collaborators.filter(c => c.name.trim()).map(c => ({ name: c.name.trim(), userId: c.userId || null }))
    ));
    formData.append('audio', audioFile);
    formData.append('cover', coverFile);
    formData.append('isScheduled', isScheduled);
    if (isScheduled) {
      formData.append('scheduledPublishAt', new Date(scheduledDate).toISOString());
    }

    try {
      const res = await fetch(`${API_URL}/upload-song`, { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert(data.message || 'Hit publicado');
        if (data.song) {
          onSongCreated(data.song);
        }
        onClose();
        if (String(artistId || userId) === String(userId)) {
          fetchMySongs(userId);
        }
        fetchAllSongs();
        fetchPlaylists();
        setTitle('');
        setDesc('');
        setLyrics('');
        setGenre('otro');
        setAudioFile(null);
        setCoverFile(null);
        setArtistId(userId);
        setCollaborators([]);
        setIsScheduled(false);
        setScheduledDate('');
      } else {
        alert(data.error || 'Error al subir el archivo');
      }
    } catch (err) {
      console.error(err);
      alert('No se pudo conectar con el servidor al subir el archivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-start md:items-center justify-center pt-10 px-4 pb-28 overflow-y-auto">
      <form onSubmit={handleUpload} className="bg-[#121212] border border-white/10 w-full max-w-lg rounded-[40px] p-6 md:p-10 relative animate-in zoom-in-95 my-4 md:my-0">
<h2 className="text-2xl md:text-3xl font-black italic mb-5 md:mb-6 uppercase tracking-tighter text-white">
          SOLTAR <span className="text-yellow-400">NUEVO HIT</span>
        </h2>

        <div className="space-y-4">
          {user?.role === 'admin' && (
            <select
              value={artistId}
              onChange={(e) => setArtistId(e.target.value)}
              className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-yellow-400 text-white font-bold"
            >
              {artistOptions.map((member) => (
                <option key={member._id} value={member._id}>{member.username} ({member.role})</option>
              ))}
            </select>
          )}

          <div className="relative border-2 border-dashed border-white/10 rounded-3xl p-8 text-center hover:border-yellow-400/50 transition-all cursor-pointer">
            <input type="file" accept="audio/*" required onChange={(e) => setAudioFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{audioFile ? `OK ${audioFile.name}` : 'SELECCIONAR MP3'}</p>
          </div>

          <div className="relative border-2 border-dashed border-white/10 rounded-3xl p-8 text-center hover:border-yellow-400/50 transition-all cursor-pointer">
            <input type="file" accept="image/*" required onChange={(e) => setCoverFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{coverFile ? `OK ${coverFile.name}` : 'SELECCIONAR CARATULA'}</p>
          </div>

          <input value={title} type="text" placeholder="NOMBRE DEL TRACK" required className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-yellow-400 text-white font-bold" onChange={(e) => setTitle(e.target.value)} />
          <textarea value={desc} placeholder="DESCRIPCION" className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-yellow-400 text-white h-20" onChange={(e) => setDesc(e.target.value)} />
          <div className="flex flex-col md:flex-row gap-2">
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full md:w-auto bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-yellow-400 text-white font-bold uppercase"
            >
              {SONG_GENRE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleSuggestGenre}
              className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold uppercase tracking-widest"
            >
              Sugerir género
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">COLABORADORES</p>
              <button type="button" onClick={addCollaborator} className="flex items-center gap-1 text-[10px] text-yellow-400 font-bold uppercase tracking-widest hover:text-yellow-300">
                <Plus size={12} /> Añadir
              </button>
            </div>
            <div className="space-y-2">
              {collaborators.map((c, i) => (
                <div key={i} className="relative flex items-start gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={c.name}
                      placeholder="NOMBRE DEL COLABORADOR"
                      onChange={(e) => handleCollaboratorNameChange(i, e.target.value)}
                      className={`w-full bg-black/40 p-3 rounded-xl border ${c.userId ? 'border-yellow-400/60' : 'border-white/5'} outline-none focus:border-yellow-400 text-white text-sm font-bold`}
                    />
                    {c.userId && <p className="text-[9px] text-yellow-400/80 mt-0.5 pl-1 font-bold uppercase tracking-widest">✓ Cuenta registrada</p>}
                    {c.suggestions?.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden z-50 shadow-xl">
                        {c.suggestions.slice(0, 5).map((u) => (
                          <button key={u._id} type="button" onClick={() => selectCollaboratorUser(i, u)} className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-2 text-sm">
                            {u.profilePic ? <img src={u.profilePic} alt={u.username} className="w-6 h-6 rounded-full object-cover flex-shrink-0" /> : <div className="w-6 h-6 rounded-full bg-yellow-400/20 flex items-center justify-center text-[10px] font-black text-yellow-400 flex-shrink-0">{u.username.charAt(0).toUpperCase()}</div>}
                            <span className="font-bold">{u.username}</span>
                            <span className="text-[10px] text-gray-500 ml-auto uppercase">{u.role}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => removeCollaborator(i)} className="p-2 mt-1 text-gray-500 hover:text-red-400 flex-shrink-0">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 pb-4">
            <label className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
                className="w-4 h-4 rounded accent-yellow-400 cursor-pointer"
              />
              <span className="text-sm font-bold text-white uppercase tracking-widest">Programar publicación</span>
            </label>
            {isScheduled && (
              <div className="bg-black/30 border border-yellow-400/30 rounded-2xl p-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">
                  Fecha y hora de publicación
                </label>
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full bg-black/40 p-3 rounded-xl border border-yellow-400/50 outline-none focus:border-yellow-400 text-white text-sm font-bold"
                />
                <p className="text-[10px] text-gray-400 mt-2">La canción se publicará automáticamente en la fecha y hora seleccionada</p>
              </div>
            )}
          </div>

          <div>
            <textarea value={lyrics} placeholder="LETRA (OPCIONAL) - TEXTO NORMAL O LRC [mm:ss.xx]" className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-yellow-400 text-white h-32" onChange={(e) => setLyrics(e.target.value)} />
            <button
              type="button"
              onClick={handleConvertLyricsToLrc}
              className="mt-3 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold uppercase tracking-widest"
            >
              Convertir a LRC
            </button>
            <button
              type="button"
              onClick={handleGenerateLrcWithAi}
              disabled={lrcAiLoading}
              className="mt-3 ml-2 px-4 py-2 rounded-xl bg-yellow-500/80 hover:bg-yellow-500 text-xs font-bold uppercase tracking-widest disabled:opacity-60"
            >
              {lrcAiLoading ? 'Analizando...' : 'Generar LRC con IA'}
            </button>
            <p className="text-[10px] text-gray-500 mt-2">Si pegas LRC con timestamps, se mostrará sincronizable. Si pegas texto normal, se verá como letra común.</p>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 text-gray-500 font-black uppercase text-[10px] tracking-widest">CANCELAR</button>
            <button disabled={loading} className="flex-1 bg-yellow-400 text-black font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg shadow-yellow-400/20 disabled:opacity-50">
              {loading ? 'SUBIENDO...' : 'PUBLICAR HIT'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default App;
