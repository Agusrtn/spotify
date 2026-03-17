import React, { useState, useRef, useEffect } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import { API_URL } from './config';
// IMPORTANTE: Asegúrate de tener lucide-react instalado
import { Disc, Play, X, Edit3, Save } from 'lucide-react'; 

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('inicio');
  const [searchResults, setSearchResults] = useState([]);
  const [mySongs, setMySongs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados del Reproductor
  const [allSongs, setAllSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedSong, setSelectedSong] = useState(null);
  const audioRef = useRef(null);

  const fetchAllSongs = async () => {
    try {
      const res = await fetch(`${API_URL}/all-songs`);
      if (res.ok) {
        const data = await res.json();
        setAllSongs(data);
      }
    } catch (err) { console.error('Error fetching all songs:', err); }
  };

  // Fetch todas las canciones al montar
  useEffect(() => {
    fetchAllSongs();
  }, []);

  // Sincronizar volumen con el audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Sincronizar play/pause
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;
    if (isPlaying) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [isPlaying, currentSong]);

  // Manejar fin de canción (siguiente automáticamente)
  const handleSongEnd = () => {
    if (currentIndex < allSongs.length - 1) {
      playSong(allSongs[currentIndex + 1], currentIndex + 1);
    } else {
      setIsPlaying(false);
    }
  };

  // Reproducir una canción
  const playSong = (song, index) => {
    setCurrentSong(song);
    setCurrentIndex(index);
    setIsPlaying(true);
    setCurrentTime(0);
  };

  // Toggle play/pause
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  // Siguiente canción
  const nextSong = () => {
    if (currentIndex < allSongs.length - 1) {
      playSong(allSongs[currentIndex + 1], currentIndex + 1);
    }
  };

  // Canción anterior
  const prevSong = () => {
    if (currentIndex > 0) {
      playSong(allSongs[currentIndex - 1], currentIndex - 1);
    }
  };

  const openSongDetail = (song) => {
    setSelectedSong(song);
  };

  const handleSaveSongChanges = async (songId, payload) => {
    try {
      const res = await fetch(`${API_URL}/songs/${songId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, userId: user._id }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || 'No se pudo guardar la canción');
        return;
      }

      setSelectedSong(data.song);
      await fetchAllSongs();
      if (user?._id) await fetchMySongs(user._id);
      alert('Cambios guardados');
    } catch (err) {
      console.error(err);
      alert('Error al guardar cambios');
    }
  };

  const handleSearch = async (query) => {
    if (query.length < 2) { setSearchResults([]); return; }
    try {
      const res = await fetch(`${API_URL}/search?query=${query}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) { console.error(err); }
  };

  const fetchMySongs = async (artistId) => {
    try {
      const res = await fetch(`${API_URL}/songs?artist=${artistId}`);
      if(res.ok) {
        const data = await res.json();
        setMySongs(data);
      }
    } catch (err) { console.error('Error fetching songs:', err); }
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
    >
      
      {view === 'inicio' && (
        <div className="animate-in fade-in duration-700">
          <h1 className="text-7xl font-black mb-8 tracking-tighter uppercase italic">
            EXPLORA EL <span className="text-yellow-400 font-black">SONIDO</span>
          </h1>
          
          <section className="mt-12">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] mb-6">Novedades en la Crew</h3>
            <div className="space-y-4">
              {allSongs && allSongs.length > 0 ? (
                allSongs.map((song, idx) => (
                  <div
                    key={song._id}
                    className="group flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-3 py-2 hover:bg-white/10 transition-all cursor-pointer"
                    onClick={() => openSongDetail(song)}
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
                      <p className="text-[10px] text-yellow-400 font-bold tracking-widest uppercase truncate">{song.artist?.username || 'Anónimo'}</p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playSong(song, idx);
                      }}
                      aria-label={`Reproducir ${song.title}`}
                      className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all"
                    >
                      <Play fill="currentColor" size={20} className="ml-0.5" />
                    </button>
                  </div>
                ))
              ) : (
                [1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-3 py-2">
                    <div className="w-16 h-16 rounded-xl bg-black/40 flex items-center justify-center">
                      <Disc className="text-yellow-400/30" size={28} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-black uppercase italic text-sm">Track Name #{i}</h4>
                      <p className="text-[10px] text-yellow-400 font-bold tracking-widest uppercase">Artist Name</p>
                    </div>
                    <button
                      type="button"
                      disabled
                      className="w-12 h-12 rounded-xl bg-white/20 text-white flex items-center justify-center"
                    >
                      <Play fill="currentColor" size={20} className="ml-0.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {view === 'buscar' && (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          <input 
            type="text" 
            placeholder="¿Buscas un artista o hit?" 
            className="w-full bg-white/5 border border-white/10 p-6 rounded-[30px] text-2xl outline-none focus:border-yellow-400 transition-all mb-10 font-bold"
            onChange={(e) => handleSearch(e.target.value)}
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {searchResults.map(artist => (
              <div key={artist._id} className="bg-white/5 p-6 rounded-[35px] border border-white/5 hover:bg-white/10 transition group text-center">
                <div className="w-32 h-32 bg-yellow-400 rounded-full mx-auto mb-4 overflow-hidden border-4 border-black group-hover:scale-105 transition-transform">
                   <img src={artist.profilePic || 'https://via.placeholder.com/150'} alt="pic" className="w-full h-full object-cover" />
                </div>
                <h3 className="font-black uppercase italic">{artist.username}</h3>
                <p className="text-[10px] text-yellow-400 font-bold tracking-widest uppercase">{artist.role}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'perfil' && (
        <div className="animate-in fade-in duration-500">
          <div className="h-48 bg-gradient-to-r from-yellow-400/20 to-black rounded-[40px] border border-white/10 p-10 flex items-end gap-6">
             <div className="w-24 h-24 bg-yellow-400 rounded-3xl font-black text-black text-4xl flex items-center justify-center shadow-lg shadow-yellow-400/20">
                {user.username.charAt(0)}
             </div>
             <div>
                <h2 className="text-5xl font-black uppercase tracking-tighter">{user.username}</h2>
                <p className="text-yellow-400 font-bold uppercase tracking-[0.3em] text-xs">{user.role}</p>
             </div>
          </div>
          <div className="mt-8 bg-white/5 p-8 rounded-[40px] border border-white/5">
             <p className="text-xs font-black text-gray-500 uppercase mb-4 tracking-widest">Biografía de Artista</p>
             <p className="text-xl text-gray-300 italic">"{user.bio || 'Nueva leyenda de RTN MUSIC'}"</p>
          </div>

          {(user.role === 'artist' || user.role === 'admin') && (
            <div className="mt-8 bg-white/5 p-8 rounded-[40px] border border-white/5">
              <div className="flex justify-between items-center mb-6">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Mis Canciones</p>
                <button onClick={() => fetchMySongs(user._id)} className="text-yellow-400 text-xs font-bold hover:underline">
                  Refrescar
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {mySongs && mySongs.length > 0 ? (
                  mySongs.map(song => (
                    <div key={song._id} className="bg-black/50 border border-white/5 p-4 rounded-[20px]">
                      <div className="aspect-square bg-yellow-400/10 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                        {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" /> : <span className="text-gray-600 text-2xl">🎵</span>}
                      </div>
                      <h4 className="font-bold text-sm uppercase mb-1">{song.title}</h4>
                      <p className="text-[10px] text-gray-400 line-clamp-2">{song.description || 'Sin descripción'}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm col-span-full">Aún no has subido canciones. ¡Sube tu primer hit!</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. RENDERIZAR EL MODAL: Debe estar aquí para que aparezca en pantalla */}
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
      />

    </Layout>
  );
}

const SongDetailPanel = ({ song, onClose, user, onPlay, onSave }) => {
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
            <p className="mt-4 text-white/80 font-semibold">{song.artist?.username || 'Artista'} • {new Date(song.createdAt).getFullYear() || '2026'}</p>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <h3 className="text-3xl font-black mb-4">Letra</h3>
              {isEditing ? (
                <textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  className="w-full h-80 bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-yellow-400"
                  placeholder="Escribe la letra aquí..."
                />
              ) : (
                <p className="whitespace-pre-wrap text-lg leading-relaxed text-gray-200">{lyrics || 'Esta canción aún no tiene letra cargada.'}</p>
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

// 4. COMPONENTE MODAL (Fuera de App para limpieza)
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
    if (!audioFile || !title || !coverFile) return alert("¡Nombre, Audio y Carátula son obligatorios!");
    if (!userId) return alert("Sesion invalida. Cierra sesion y vuelve a entrar.");
    
    setLoading(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', desc);
    formData.append('lyrics', lyrics);
    formData.append('artistId', userId);
    formData.append('audio', audioFile);
    if (coverFile) formData.append('cover', coverFile);

    try {
      const res = await fetch(`${API_URL}/upload-song`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert("¡HIT PUBLICADO EN RTN!");
        onClose();
        setTimeout(() => {
          if (userId) fetchMySongs(userId);
          fetchAllSongs();
        }, 500);
      } else {
        alert(data.error || "Error al subir el archivo");
      }
    } catch (err) {
      console.error(err);
      alert("No se pudo conectar con el servidor al subir el archivo");
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
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              {audioFile ? `✅ ${audioFile.name}` : "SELECCIONAR MP3"}
            </p>
          </div>

          <div className="relative border-2 border-dashed border-white/10 rounded-3xl p-8 text-center hover:border-yellow-400/50 transition-all cursor-pointer">
            <input type="file" accept="image/*" required onChange={(e) => setCoverFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              {coverFile ? `✅ 🖼️ ${coverFile.name}` : "SELECCIONAR CARÁTULA"}
            </p>
          </div>
          
          <input type="text" placeholder="NOMBRE DEL TRACK" required className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-yellow-400 text-white font-bold" onChange={(e) => setTitle(e.target.value)} />
          <textarea placeholder="DESCRIPCIÓN" className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-yellow-400 text-white h-20" onChange={(e) => setDesc(e.target.value)} />
          <textarea placeholder="LETRA (OPCIONAL)" className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-yellow-400 text-white h-32" onChange={(e) => setLyrics(e.target.value)} />
          
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 text-gray-500 font-black uppercase text-[10px] tracking-widest">CANCELAR</button>
            <button disabled={loading} className="flex-1 bg-yellow-400 text-black font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg shadow-yellow-400/20 disabled:opacity-50">
              {loading ? "SUBIENDO..." : "PUBLICAR HIT"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default App;