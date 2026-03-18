import React, { useState, useRef, useEffect } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import { API_URL } from './config';
import { Disc, Play, X, Edit3, Save, Trash2, Plus, Check } from 'lucide-react';

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
  const [searchResults, setSearchResults] = useState({ artists: [], songs: [] });
  const [mySongs, setMySongs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [allSongs, setAllSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedSong, setSelectedSong] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [artistProfile, setArtistProfile] = useState(null);

  const [settingsBio, setSettingsBio] = useState('');
  const [settingsPic, setSettingsPic] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberPasswordDrafts, setMemberPasswordDrafts] = useState({});
  const [memberPasswordConfirmDrafts, setMemberPasswordConfirmDrafts] = useState({});
  const [memberActionLoading, setMemberActionLoading] = useState({});
  const [playlistForm, setPlaylistForm] = useState({ id: null, name: '', description: '', coverUrl: '', songIds: [], isDefault: true });
  const [playlistSaving, setPlaylistSaving] = useState(false);

  const audioRef = useRef(null);

  const fetchAllSongs = async () => {
    try {
      const res = await fetch(`${API_URL}/all-songs`);
      if (res.ok) {
        const data = await res.json();
        setAllSongs(data);
      }
    } catch (err) {
      console.error('Error fetching all songs:', err);
    }
  };

  const fetchPlaylists = async () => {
    try {
      const res = await fetch(`${API_URL}/playlists`);
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data);
      }
    } catch (err) {
      console.error('Error fetching playlists:', err);
    }
  };

  useEffect(() => {
    fetchAllSongs();
    fetchPlaylists();
  }, []);

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
    const intervalId = setInterval(() => {
      fetchAllSongs();
      fetchPlaylists();
      if (user?._id && (user.role === 'artist' || user.role === 'admin')) {
        fetchMySongs(user._id);
      }
    }, 8000);

    return () => clearInterval(intervalId);
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
    if (user) setSettingsBio(user.bio || '');
  }, [user]);

  useEffect(() => {
    if (view === 'admin' && user?.role === 'admin') {
      fetchMembers();
      fetchAllSongs();
      fetchPlaylists();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, user]);

  useEffect(() => {
    if (user?._id && (user.role === 'artist' || user.role === 'admin')) {
      fetchMySongs(user._id);
    }
  }, [user]);

  useEffect(() => {
    if (isModalOpen && user?.role === 'admin') {
      fetchMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, user]);

  const fetchMySongs = async (artistId) => {
    try {
      const res = await fetch(`${API_URL}/songs?artist=${artistId}`);
      if (res.ok) {
        const data = await res.json();
        setMySongs(data);
      }
    } catch (err) {
      console.error('Error fetching songs:', err);
    }
  };

  const handleSongEnd = () => {
    if (currentIndex < allSongs.length - 1) playSong(allSongs[currentIndex + 1], currentIndex + 1);
    else setIsPlaying(false);
  };

  const playSong = (song, index) => {
    setCurrentSong(song);
    setCurrentIndex(index);
    setIsPlaying(true);
    setCurrentTime(0);
  };

  const togglePlay = () => setIsPlaying(!isPlaying);
  const nextSong = () => {
    if (currentIndex < allSongs.length - 1) playSong(allSongs[currentIndex + 1], currentIndex + 1);
  };
  const prevSong = () => {
    if (currentIndex > 0) playSong(allSongs[currentIndex - 1], currentIndex - 1);
  };

  const openSongDetail = (song) => setSelectedSong(song);

  const openArtistProfile = async (artistId) => {
    try {
      const res = await fetch(`${API_URL}/artists/${artistId}`);
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'No se pudo abrir el perfil del artista');
      setArtistProfile(data);
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

      setSelectedSong(data.song);
      setAllSongs((prev) => prev.map((song) => (song._id === songId ? data.song : song)));
      setMySongs((prev) => prev.map((song) => (song._id === songId ? data.song : song)));
      setPlaylists((prev) => prev.map((playlist) => ({
        ...playlist,
        songs: playlist.songs?.map((song) => (song._id === songId ? data.song : song)),
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
      setSearchResults({ artists: [], songs: [] });
      return;
    }
    try {
      const res = await fetch(`${API_URL}/search-all?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok) setSearchResults(data);
    } catch (err) {
      console.error(err);
    }
  };

  const resetPlaylistForm = () => {
    setPlaylistForm({ id: null, name: '', description: '', coverUrl: '', songIds: [], isDefault: true });
  };

  const startEditPlaylist = (playlist) => {
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

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: user._id,
          name: playlistForm.name,
          description: playlistForm.description,
          coverUrl: playlistForm.coverUrl,
          songIds: playlistForm.songIds,
          isDefault: playlistForm.isDefault,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || 'No se pudo guardar la playlist');
        return;
      }

      if (playlistForm.id) {
        setPlaylists((prev) => prev.map((playlist) => (playlist._id === data.playlist._id ? data.playlist : playlist)));
      } else {
        setPlaylists((prev) => [data.playlist, ...prev]);
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
    const confirmed = window.confirm('¿Eliminar esta playlist?');
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

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSettingsLoading(true);
    try {
      const formData = new FormData();
      formData.append('bio', settingsBio || '');
      if (settingsPic) formData.append('profilePic', settingsPic);

      const res = await fetch(`${API_URL}/users/${user._id}/profile`, {
        method: 'PUT',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return alert(data.error || 'No se pudo actualizar tu perfil');

      setUser(data.user);
      setSettingsPic(null);
      alert('Perfil actualizado');
    } catch (err) {
      console.error(err);
      alert('Error al actualizar perfil');
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
    const confirmed = window.confirm('¿Seguro que quieres eliminar esta cuenta y sus canciones?');
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

      alert('Cuenta eliminada');
    } catch (err) {
      console.error(err);
      alert('Error al eliminar cuenta');
    } finally {
      setMemberActionLoading((prev) => ({ ...prev, [memberId]: false }));
    }
  };

  const handleDeleteSong = async (songId) => {
    const confirmed = window.confirm('¿Seguro que quieres eliminar esta canción?');
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

  if (!user) {
    return (
      <Login
        onLogin={(userData, token) => {
          setUser(userData);
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
      onTimeUpdate={(time) => setCurrentTime(time)}
      onDurationChange={(dur) => setDuration(dur)}
      onSongEnd={handleSongEnd}
      onOpenArtist={openArtistProfile}
    >
      {view === 'inicio' && (
        <div className="animate-in fade-in duration-700">
          <h1 className="text-4xl md:text-7xl font-black mb-4 md:mb-8 tracking-tighter uppercase italic">
            EXPLORA EL <span className="text-yellow-400 font-black">SONIDO</span>
          </h1>

          <section className="mb-14">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl md:text-3xl font-black tracking-tight">Especialmente para ti</h3>
              <span className="text-sm text-gray-400 font-bold">Mostrar todos</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {playlists.filter((playlist) => playlist.isDefault).slice(0, 4).map((playlist) => (
                <button
                  key={playlist._id}
                  onClick={() => setSelectedPlaylist(playlist)}
                  className="text-left bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:bg-white/10 transition-all"
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
                    <p className="font-black text-2xl leading-tight mb-2">{playlist.name}</p>
                    <p className="text-gray-400 text-sm line-clamp-2">{playlist.description || 'Playlist oficial de RTN Music'}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-12">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] mb-6">Novedades en la Crew</h3>
            <div className="space-y-4">
              {allSongs.length > 0 ? (
                allSongs.map((song, idx) => (
                  <SongRow
                    key={song._id}
                    song={song}
                    onRowClick={() => openSongDetail(song)}
                    onPlay={(e) => {
                      e.stopPropagation();
                      playSong(song, idx);
                    }}
                    onArtistClick={(e) => {
                      e.stopPropagation();
                      if (song.artist?._id) openArtistProfile(song.artist._id);
                    }}
                  />
                ))
              ) : (
                <p className="text-gray-500 text-sm">No hay canciones publicadas aun.</p>
              )}
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
          </div>
        </div>
      )}

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
          <div className="mt-8 bg-white/5 p-5 md:p-8 rounded-[40px] border border-white/5">
            <p className="text-xs font-black text-gray-500 uppercase mb-4 tracking-widest">Biografia de Artista</p>
            <p className="text-xl text-gray-300 italic">"{user.bio || 'Nueva leyenda de RTN MUSIC'}"</p>
          </div>

          {(user.role === 'artist' || user.role === 'admin') && (
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
                      />
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-sm">Aun no has subido canciones. Sube tu primer hit.</p>
                )}
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

          <div className="bg-white/5 p-5 md:p-8 rounded-[40px] border border-white/5">
            <p className="text-xs font-black text-gray-500 uppercase mb-4 tracking-widest">Biografia</p>
            <p className="text-lg text-gray-300">{artistProfile.artist.bio || 'Este artista no tiene bio aun.'}</p>
          </div>

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
                    />
                  );
                })
              ) : (
                <p className="text-gray-500 text-sm">Este artista no tiene canciones publicadas.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'admin' && user.role === 'admin' && (
        <div className="animate-in fade-in duration-500 space-y-8">
          <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter">Panel de Administrador</h2>

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
                <input
                  value={playlistForm.coverUrl}
                  onChange={(e) => setPlaylistForm((prev) => ({ ...prev, coverUrl: e.target.value }))}
                  placeholder="URL de portada (opcional)"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-yellow-400"
                />
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

            <button disabled={settingsLoading} className="bg-yellow-400 text-black font-black py-3 px-8 rounded-2xl uppercase tracking-widest text-xs disabled:opacity-60">
              {settingsLoading ? 'Guardando...' : 'Guardar Ajustes'}
            </button>
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
          setAllSongs((prev) => [song, ...prev.filter((item) => item._id !== song._id)]);
          if (String(song.artist?._id) === String(user._id)) {
            setMySongs((prev) => [song, ...prev.filter((item) => item._id !== song._id)]);
          }
        }}
      />

      <SongDetailPanel
        song={selectedSong}
        onClose={() => setSelectedSong(null)}
        user={user}
        onPlay={(song) => {
          const idx = allSongs.findIndex((item) => item._id === song._id);
          playSong(song, idx >= 0 ? idx : 0);
        }}
        onSave={handleSaveSongChanges}
        onDelete={handleDeleteSong}
        onOpenArtist={openArtistProfile}
      />

      <PlaylistDetailPanel
        playlist={selectedPlaylist}
        onClose={() => setSelectedPlaylist(null)}
        onPlaySong={(song) => {
          const idx = allSongs.findIndex((item) => item._id === song._id);
          playSong(song, idx >= 0 ? idx : 0);
        }}
        onOpenArtist={openArtistProfile}
      />
    </Layout>
  );
}

const SongRow = ({ song, onRowClick, onPlay, onArtistClick }) => (
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

    <div className="min-w-0 flex-1">
      <h4 className="font-black uppercase italic text-sm truncate">{song.title}</h4>
      <button
        type="button"
        onClick={onArtistClick}
        className="text-[10px] text-yellow-400 font-bold tracking-widest uppercase truncate hover:text-yellow-300"
      >
        {song.artist?.username || 'Anonimo'}
      </button>
    </div>

    <button
      onClick={onPlay}
      aria-label={`Reproducir ${song.title}`}
      className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all"
    >
      <Play fill="currentColor" size={20} className="ml-0.5" />
    </button>
  </div>
);

const SongDetailPanel = ({ song, onClose, user, onPlay, onSave, onDelete, onOpenArtist }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!song) return;
    setTitle(song.title || '');
    setDescription(song.description || '');
    setLyrics(song.lyrics || '');
    setIsEditing(false);
  }, [song]);

  if (!song) return null;

  const isOwner = String(song.artist?._id) === String(user?._id);
  const canEdit = isOwner || user?.role === 'admin';
  const canDelete = isOwner || user?.role === 'admin';

  const handleSave = async () => {
    setSaving(true);
    await onSave(song._id, { title, description, lyrics });
    setSaving(false);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-sm p-4 md:p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto bg-gradient-to-b from-[#c11654] via-[#8f0032] to-[#0a0a0a] rounded-3xl border border-white/10 overflow-hidden">
        <div className="p-6 md:p-10 flex flex-col md:flex-row gap-6 md:gap-8 items-end">
          <div className="w-48 h-48 md:w-60 md:h-60 rounded-xl overflow-hidden border border-white/10 shadow-2xl flex-shrink-0 bg-black/30">
            {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Disc className="text-yellow-400/40" size={72} /></div>}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-white/80 text-xl font-bold">Cancion</p>
            <h2 className="text-3xl md:text-5xl lg:text-8xl font-black leading-none uppercase tracking-tight break-words">{title || song.title}</h2>
            <button
              type="button"
              onClick={() => song.artist?._id && onOpenArtist(song.artist._id)}
              className="mt-4 text-white/80 font-semibold hover:text-yellow-300"
            >
              {song.artist?.username || 'Artista'} - {new Date(song.createdAt).getFullYear() || '2026'}
            </button>
          </div>

          <button onClick={onClose} className="self-start md:self-auto p-3 rounded-xl bg-black/30 hover:bg-black/50 transition">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 md:px-10 py-6 border-t border-white/10 bg-black/25">
          <div className="flex items-center gap-3 mb-8">
            <button onClick={() => onPlay(song)} className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-400 text-black flex items-center justify-center transition">
              <Play fill="black" size={22} className="ml-0.5" />
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
                <textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  className="w-full h-80 bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-yellow-400"
                  placeholder="Escribe la letra aqui..."
                />
              ) : (
                <p className="whitespace-pre-wrap text-lg leading-relaxed text-gray-200">{lyrics || 'Esta cancion aun no tiene letra cargada.'}</p>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="text-xl font-black">Detalle</h4>
              {isEditing ? (
                <>
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

const PlaylistDetailPanel = ({ playlist, onClose, onPlaySong, onOpenArtist }) => {
  if (!playlist) return null;

  return (
    <div className="fixed inset-0 z-[105] bg-black/85 backdrop-blur-sm p-4 md:p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto bg-gradient-to-b from-[#5a0b0b] via-[#2c0909] to-[#0a0a0a] rounded-3xl border border-white/10 overflow-hidden">
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
          </div>
          <button onClick={onClose} className="self-start md:self-auto p-3 rounded-xl bg-black/30 hover:bg-black/50 transition"><X size={20} /></button>
        </div>

        <div className="border-t border-white/10 px-6 md:px-10 py-6 bg-black/20 space-y-3">
          {playlist.songs?.length ? playlist.songs.map((song, index) => (
            <div key={song._id} className="flex items-center gap-3 py-3 border-b border-white/5">
              <span className="hidden md:block text-gray-500 font-bold w-7 text-center flex-shrink-0">{index + 1}</span>
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden bg-black/40 flex-shrink-0">
                {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Disc size={20} className="text-yellow-400/40" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{song.title}</p>
                <button type="button" onClick={() => song.artist?._id && onOpenArtist(song.artist._id)} className="text-xs text-gray-400 hover:text-yellow-300 truncate block">
                  {song.artist?.username || 'Artista'}
                </button>
              </div>
              <button onClick={() => onPlaySong(song)} className="p-2 md:px-3 md:py-2 rounded-xl bg-white/10 hover:bg-white/20 flex-shrink-0 flex items-center justify-center">
                <Play size={16} fill="white" className="md:hidden" />
                <span className="hidden md:inline text-xs font-bold uppercase">Reproducir</span>
              </button>
              <span className="hidden md:block text-right text-gray-500 text-sm flex-shrink-0">{song.audioUrl ? 'MP3' : '--'}</span>
            </div>
          )) : <p className="text-gray-500">Esta playlist no tiene canciones.</p>}
        </div>
      </div>
    </div>
  );
};

const UploadModal = ({ isOpen, onClose, user, members, userId, fetchMySongs, fetchAllSongs, fetchPlaylists, onSongCreated }) => {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [artistId, setArtistId] = useState(userId);

  useEffect(() => {
    if (isOpen) {
      setArtistId(userId);
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const artistOptions = user?.role === 'admin'
    ? members.filter((member) => member.role === 'artist' || member.role === 'admin')
    : [];

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!audioFile || !title || !coverFile) return alert('Nombre, Audio y Caratula son obligatorios');
    if (!userId) return alert('Sesion invalida. Cierra sesion y vuelve a entrar.');

    setLoading(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', desc);
    formData.append('lyrics', lyrics);
    formData.append('artistId', artistId || userId);
    formData.append('uploaderId', userId);
    formData.append('audio', audioFile);
    formData.append('cover', coverFile);

    try {
      const res = await fetch(`${API_URL}/upload-song`, { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert('Hit publicado');
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
        setAudioFile(null);
        setCoverFile(null);
        setArtistId(userId);
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-start md:items-center justify-center p-4 overflow-y-auto">
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

          <input type="text" placeholder="NOMBRE DEL TRACK" required className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-yellow-400 text-white font-bold" onChange={(e) => setTitle(e.target.value)} />
          <textarea placeholder="DESCRIPCION" className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-yellow-400 text-white h-20" onChange={(e) => setDesc(e.target.value)} />
          <textarea placeholder="LETRA (OPCIONAL)" className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-yellow-400 text-white h-32" onChange={(e) => setLyrics(e.target.value)} />

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
