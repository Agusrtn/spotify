import React, { useState, useRef, useEffect } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import { API_URL } from './config';
import { Disc, Play, X, Edit3, Save, Trash2 } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('inicio');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ artists: [], songs: [] });
  const [mySongs, setMySongs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [allSongs, setAllSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedSong, setSelectedSong] = useState(null);
  const [artistProfile, setArtistProfile] = useState(null);

  const [settingsBio, setSettingsBio] = useState('');
  const [settingsPic, setSettingsPic] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

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

  useEffect(() => {
    fetchAllSongs();
  }, []);

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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, user]);

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
      await fetchAllSongs();
      await fetchMySongs(user._id);
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

      await fetchAllSongs();
      await fetchMySongs(user._id);
      if (artistProfile?.artist?._id) {
        await openArtistProfile(artistProfile.artist._id);
      }
      alert('Canción eliminada');
    } catch (err) {
      console.error(err);
      alert('Error al eliminar canción');
    }
  };

  if (!user) return <Login onLogin={(userData) => setUser(userData)} />;

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
          <h1 className="text-7xl font-black mb-8 tracking-tighter uppercase italic">
            EXPLORA EL <span className="text-yellow-400 font-black">SONIDO</span>
          </h1>

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
            className="w-full bg-white/5 border border-white/10 p-6 rounded-[30px] text-2xl outline-none focus:border-yellow-400 transition-all mb-10 font-bold"
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
          <div className="h-48 bg-gradient-to-r from-yellow-400/20 to-black rounded-[40px] border border-white/10 p-10 flex items-end gap-6">
            <div className="w-24 h-24 bg-yellow-400 rounded-3xl overflow-hidden font-black text-black text-4xl flex items-center justify-center shadow-lg shadow-yellow-400/20">
              {user.profilePic ? <img src={user.profilePic} alt={user.username} className="w-full h-full object-cover" /> : user.username.charAt(0)}
            </div>
            <div>
              <h2 className="text-5xl font-black uppercase tracking-tighter">{user.username}</h2>
              <p className="text-yellow-400 font-bold uppercase tracking-[0.3em] text-xs">{user.role}</p>
            </div>
          </div>
          <div className="mt-8 bg-white/5 p-8 rounded-[40px] border border-white/5">
            <p className="text-xs font-black text-gray-500 uppercase mb-4 tracking-widest">Biografia de Artista</p>
            <p className="text-xl text-gray-300 italic">"{user.bio || 'Nueva leyenda de RTN MUSIC'}"</p>
          </div>

          {(user.role === 'artist' || user.role === 'admin') && (
            <div className="mt-8 bg-white/5 p-8 rounded-[40px] border border-white/5">
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
          <div className="h-56 bg-gradient-to-r from-yellow-400/20 to-black rounded-[40px] border border-white/10 p-8 md:p-10 flex items-end gap-6">
            <div className="w-28 h-28 rounded-3xl overflow-hidden bg-yellow-400 text-black font-black text-4xl flex items-center justify-center shadow-lg shadow-yellow-400/20">
              {artistProfile.artist.profilePic ? <img src={artistProfile.artist.profilePic} alt={artistProfile.artist.username} className="w-full h-full object-cover" /> : artistProfile.artist.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs tracking-[0.3em] text-gray-400 uppercase font-black">Mi Crew</p>
              <h2 className="text-5xl font-black uppercase tracking-tighter">{artistProfile.artist.username}</h2>
              <p className="text-yellow-400 font-bold uppercase tracking-[0.2em] text-xs">{artistProfile.artist.role}</p>
            </div>
          </div>

          <div className="bg-white/5 p-8 rounded-[40px] border border-white/5">
            <p className="text-xs font-black text-gray-500 uppercase mb-4 tracking-widest">Biografia</p>
            <p className="text-lg text-gray-300">{artistProfile.artist.bio || 'Este artista no tiene bio aun.'}</p>
          </div>

          <div className="bg-white/5 p-8 rounded-[40px] border border-white/5">
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
          <h2 className="text-4xl font-black uppercase tracking-tighter">Panel de Administrador</h2>

          <section className="bg-white/5 p-8 rounded-[40px] border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Miembros registrados</p>
              <button onClick={fetchMembers} className="text-yellow-400 text-xs font-bold hover:underline">Refrescar</button>
            </div>

            <div className="space-y-3">
              {membersLoading ? (
                <p className="text-gray-500 text-sm">Cargando miembros...</p>
              ) : members.length > 0 ? (
                members.map((member) => (
                  <div key={member._id} className="flex items-center gap-4 bg-black/40 border border-white/10 rounded-2xl p-3">
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
                ))
              ) : (
                <p className="text-gray-500 text-sm">No hay miembros para mostrar.</p>
              )}
            </div>
          </section>

          <section className="bg-white/5 p-8 rounded-[40px] border border-white/10">
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
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-8">Ajustes de Mi Crew</h2>
          <form onSubmit={handleSaveProfile} className="bg-white/5 p-8 rounded-[40px] border border-white/10 max-w-3xl space-y-6">
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
        userId={user._id}
        fetchMySongs={fetchMySongs}
        fetchAllSongs={fetchAllSongs}
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
            <h2 className="text-5xl md:text-8xl font-black leading-none uppercase tracking-tight break-words">{title || song.title}</h2>
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

const UploadModal = ({ isOpen, onClose, userId, fetchMySongs, fetchAllSongs }) => {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!audioFile || !title || !coverFile) return alert('Nombre, Audio y Caratula son obligatorios');
    if (!userId) return alert('Sesion invalida. Cierra sesion y vuelve a entrar.');

    setLoading(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', desc);
    formData.append('lyrics', lyrics);
    formData.append('artistId', userId);
    formData.append('audio', audioFile);
    formData.append('cover', coverFile);

    try {
      const res = await fetch(`${API_URL}/upload-song`, { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert('Hit publicado');
        onClose();
        setTimeout(() => {
          fetchMySongs(userId);
          fetchAllSongs();
        }, 500);
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <form onSubmit={handleUpload} className="bg-[#121212] border border-white/10 w-full max-w-lg rounded-[40px] p-10 relative animate-in zoom-in-95">
        <h2 className="text-3xl font-black italic mb-6 uppercase tracking-tighter text-white">
          SOLTAR <span className="text-yellow-400">NUEVO HIT</span>
        </h2>

        <div className="space-y-4">
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
