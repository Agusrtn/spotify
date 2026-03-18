import React from 'react';
import { Home, Search, Library, Play, Pause, SkipBack, SkipForward, Volume2, Mic2, LayoutGrid, Disc, ShieldAlert, Upload } from 'lucide-react';

const Layout = ({ 
  children, 
  setView, 
  user, 
  view, 
  setModalOpen,
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
  onTimeUpdate,
  onDurationChange,
  onSongEnd,
  onOpenArtist
}) => {

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = percent * duration;
  };

  return (
    <div className="flex h-screen bg-[#080808] text-white font-sans overflow-hidden">
      
      {/* SIDEBAR - Cristal Oscuro, oculto en móvil */}
      <aside className="hidden md:flex w-64 bg-black/60 backdrop-blur-2xl border-r border-white/5 flex-col z-20">
        <div className="p-8">
          <div className="mb-10">
            <img src="/logo.png" alt="RTN MUSIC" className="h-16 object-contain" />
          </div>
          
          <nav className="flex flex-col gap-y-6">
            <button 
              onClick={() => setView('inicio')}
              className={`flex items-center gap-4 font-bold transition-all text-left w-full ${view === 'inicio' ? 'text-yellow-400 scale-105' : 'text-gray-400 hover:text-white'}`}
            >
              <Home size={22} /> Inicio
            </button>
            <button 
              onClick={() => setView('buscar')}
              className={`flex items-center gap-4 transition-all text-left w-full group ${view === 'buscar' ? 'text-white font-bold' : 'text-gray-400 hover:text-white'}`}
            >
              <Search size={22} className={view === 'buscar' ? 'text-yellow-400' : 'group-hover:text-yellow-400'} /> Explorar
            </button>
            <button 
              onClick={() => setView('perfil')}
              className={`flex items-center gap-4 transition-all text-left w-full group ${view === 'perfil' ? 'text-white font-bold' : 'text-gray-400 hover:text-white'}`}
            >
              <Library size={22} className={view === 'perfil' ? 'text-yellow-400' : 'group-hover:text-yellow-400'} /> Mi Crew
            </button>
          </nav>

          {/* SECCIÓN EXCLUSIVA PARA ADMINS */}
          {user.role === 'admin' && (
            <div className="mt-10 pt-8 border-t border-white/5 animate-in fade-in slide-in-from-left-4 duration-700">
              <p className="text-[10px] text-red-500 font-black uppercase tracking-[0.3em] mb-4 px-2">
                System Admin
              </p>
              <button 
                onClick={() => setView('admin')}
                className={`flex items-center gap-4 w-full px-3 py-3 rounded-2xl transition-all ${view === 'admin' ? 'bg-red-600 text-white font-bold shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'text-gray-500 hover:text-red-400 hover:bg-white/5'}`}
              >
                <ShieldAlert size={20} /> 
                <span className="text-sm">Control Crew</span>
              </button>
            </div>
          )}
        </div>

        {/* ARTIST ZONE - Dinámico según Rol */}
        <div className="mt-auto p-6">
          {(user.role === 'admin' || user.role === 'artist') ? (
            <div className="bg-gradient-to-br from-yellow-400/20 to-transparent border border-yellow-400/30 p-5 rounded-[28px] backdrop-blur-md">
              <p className="text-[10px] text-yellow-400 font-black uppercase tracking-widest mb-2 px-1">Artist Zone</p>
              <button 
                onClick={() => setModalOpen(true)}
                className="text-xs font-black bg-yellow-400 text-black w-full py-3 rounded-xl hover:shadow-[0_0_25px_rgba(250,204,21,0.5)] transition-all uppercase"
              >
                Drop New Hit
              </button>
            </div>
          ) : (
            <div className="bg-white/[0.02] border border-white/5 p-5 rounded-[28px] opacity-40">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Artist Zone</p>
              <p className="text-[10px] text-gray-600 font-medium leading-tight">Solo artistas verificados pueden subir música.</p>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 relative overflow-y-auto bg-gradient-to-tr from-black via-[#0d0d0d] to-[#151515]">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-yellow-400/5 blur-[120px] rounded-full -z-10"></div>
        
        <header className="sticky top-0 z-10 flex items-center justify-between px-4 md:px-10 py-4 md:py-6 bg-black/10 backdrop-blur-md border-b border-white/5">
          <div className="text-gray-500 font-black tracking-[0.3em] text-[10px] uppercase">RTN Engine / 2.0.26</div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-xs font-black text-white leading-none">{user.username}</p>
              <p className="text-[9px] text-yellow-400 font-bold uppercase tracking-tighter mt-1">{user.role}</p>
            </div>
            <button 
              onClick={() => setView('ajustes')}
              className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all active:scale-95"
            >
              <div className="w-8 h-8 bg-yellow-400 rounded-xl flex items-center justify-center text-black font-black text-xs shadow-lg shadow-yellow-400/20 overflow-hidden">
                {user.profilePic ? (
                  <img src={user.profilePic} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  user.username.charAt(0).toUpperCase()
                )}
              </div>
            </button>
          </div>
        </header>

        <div className="px-4 md:px-10 py-6 md:py-8 pb-36 md:pb-40">
          {children}
        </div>
      </main>

      {/* PLAYER MODERNO - solo escritorio */}
      <footer className="hidden md:flex fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-6xl h-24 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[35px] px-10 items-center justify-between shadow-2xl z-50">
        <audio 
          ref={audioRef}
          src={currentSong?.audioUrl}
          onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => onDurationChange(e.currentTarget.duration)}
          onEnded={onSongEnd}
        />

        <div className="flex items-center gap-5 w-1/3 min-w-0">
          <div className="w-14 h-14 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-400/20 flex-shrink-0 overflow-hidden">
            {currentSong?.coverUrl ? (
              <img src={currentSong.coverUrl} alt="cover" className="w-full h-full object-cover" />
            ) : (
              <Mic2 className="text-black" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-black text-white tracking-wide truncate">{currentSong?.title || 'FLOW RTN'}</h4>
            <button
              type="button"
              onClick={() => currentSong?.artist?._id && onOpenArtist(currentSong.artist._id)}
              className="text-[10px] text-yellow-400/70 font-black uppercase italic truncate hover:text-yellow-300"
            >
              {currentSong?.artist?.username || 'System Radio'}
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center w-1/3 gap-2">
          <div className="flex items-center gap-8">
            <button
              onClick={prevSong}
              className="text-gray-600 hover:text-white transition cursor-pointer hover:scale-110"
            >
              <SkipBack size={20} />
            </button>
            <button 
              onClick={togglePlay}
              className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl"
            >
              {isPlaying ? <Pause fill="black" size={24} /> : <Play fill="black" size={24} className="ml-1" />}
            </button>
            <button
              onClick={nextSong}
              className="text-gray-600 hover:text-white transition cursor-pointer hover:scale-110"
            >
              <SkipForward size={20} />
            </button>
          </div>
          <div className="w-full flex items-center gap-3">
            <span className="text-[9px] text-gray-600 font-black whitespace-nowrap">{formatTime(currentTime)}</span>
            <div 
              className="h-[4px] flex-1 bg-white/5 rounded-full overflow-hidden cursor-pointer hover:h-[6px] transition-all"
              onClick={handleSeek}
            >
              <div 
                className="h-full bg-yellow-400 shadow-[0_0_10px_#facc15]"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[9px] text-gray-600 font-black whitespace-nowrap">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-6 w-1/3">
          <LayoutGrid size={18} className="text-gray-600 hover:text-yellow-400 transition cursor-pointer" />
          <div className="flex items-center gap-3">
            <Volume2 size={18} className="text-gray-600" />
            <div 
              className="w-20 h-[3px] bg-white/10 rounded-full cursor-pointer hover:h-[4px] transition-all"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                setVolume(Math.max(0, Math.min(1, percent)));
              }}
            >
              <div className="h-full bg-white" style={{ width: `${volume * 100}%` }}></div>
            </div>
          </div>
        </div>
      </footer>

      {/* MINI PLAYER MÓVIL */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 bg-black/95 backdrop-blur-xl border-t border-white/10">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-400 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
            {currentSong?.coverUrl ? (
              <img src={currentSong.coverUrl} alt="cover" className="w-full h-full object-cover" />
            ) : (
              <Mic2 className="text-black" size={18} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black truncate">{currentSong?.title || 'RTN MUSIC'}</p>
            <p className="text-[10px] text-yellow-400/70 font-bold uppercase truncate">{currentSong?.artist?.username || 'System Radio'}</p>
          </div>
          <button onClick={prevSong} className="text-gray-500 p-1 active:text-white">
            <SkipBack size={18} />
          </button>
          <button
            onClick={togglePlay}
            className="w-9 h-9 bg-white text-black rounded-full flex items-center justify-center active:scale-95 flex-shrink-0"
          >
            {isPlaying ? <Pause fill="black" size={16} /> : <Play fill="black" size={16} className="ml-0.5" />}
          </button>
          <button onClick={nextSong} className="text-gray-500 p-1 active:text-white">
            <SkipForward size={18} />
          </button>
        </div>
        <div
          className="h-[2px] bg-white/10 cursor-pointer mx-4"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-yellow-400"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* NAV INFERIOR MÓVIL */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-black/95 backdrop-blur-xl border-t border-white/5 flex items-center">
        <div className="flex justify-around w-full px-2">
          <button onClick={() => setView('inicio')} className="flex flex-col items-center gap-0.5 py-1 px-3">
            <Home size={22} className={view === 'inicio' ? 'text-yellow-400' : 'text-gray-500'} />
            <span className={`text-[9px] font-bold ${view === 'inicio' ? 'text-yellow-400' : 'text-gray-500'}`}>Inicio</span>
          </button>
          <button onClick={() => setView('buscar')} className="flex flex-col items-center gap-0.5 py-1 px-3">
            <Search size={22} className={view === 'buscar' ? 'text-yellow-400' : 'text-gray-500'} />
            <span className={`text-[9px] font-bold ${view === 'buscar' ? 'text-yellow-400' : 'text-gray-500'}`}>Explorar</span>
          </button>
          {(user.role === 'artist' || user.role === 'admin') && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex flex-col items-center gap-0.5 py-1 px-2"
            >
              <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg shadow-yellow-400/30 -mt-3">
                <Upload size={18} className="text-black" />
              </div>
              <span className="text-[9px] font-bold text-yellow-400">Subir</span>
            </button>
          )}
          <button onClick={() => setView('perfil')} className="flex flex-col items-center gap-0.5 py-1 px-3">
            <Library size={22} className={view === 'perfil' ? 'text-yellow-400' : 'text-gray-500'} />
            <span className={`text-[9px] font-bold ${view === 'perfil' ? 'text-yellow-400' : 'text-gray-500'}`}>Mi Crew</span>
          </button>
          {user.role === 'admin' && (
            <button onClick={() => setView('admin')} className="flex flex-col items-center gap-0.5 py-1 px-3">
              <ShieldAlert size={22} className={view === 'admin' ? 'text-red-400' : 'text-gray-500'} />
              <span className={`text-[9px] font-bold ${view === 'admin' ? 'text-red-400' : 'text-gray-500'}`}>Admin</span>
            </button>
          )}
          <button onClick={() => setView('ajustes')} className="flex flex-col items-center gap-0.5 py-1 px-3">
            <div className={`w-6 h-6 rounded-full overflow-hidden bg-yellow-400 flex items-center justify-center flex-shrink-0 ${view === 'ajustes' ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-black' : ''}`}>
              {user.profilePic ? (
                <img src={user.profilePic} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] font-black text-black">{user.username.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <span className={`text-[9px] font-bold ${view === 'ajustes' ? 'text-yellow-400' : 'text-gray-500'}`}>Perfil</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Layout;