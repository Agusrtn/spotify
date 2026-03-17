import React from 'react';
import { Home, Search, Library, Play, Pause, SkipBack, SkipForward, Volume2, Mic2, LayoutGrid, Disc, ShieldAlert } from 'lucide-react';

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
  onSongEnd
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
      
      {/* SIDEBAR - Cristal Oscuro */}
      <aside className="w-64 bg-black/60 backdrop-blur-2xl border-r border-white/5 flex flex-col z-20">
        <div className="p-8">
          <div className="flex items-center gap-2 mb-10">
            <div className="bg-yellow-400 p-1.5 rounded-lg">
              <Disc className="text-black animate-spin-slow" size={24} />
            </div>
            <h1 className="text-xl font-black tracking-tighter uppercase italic">
              RTN <span className="text-yellow-400">MUSIC</span>
            </h1>
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
        
        <header className="sticky top-0 z-10 flex items-center justify-between px-10 py-6 bg-black/10 backdrop-blur-md border-b border-white/5">
          <div className="text-gray-500 font-black tracking-[0.3em] text-[10px] uppercase">RTN Engine / 2.0.26</div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-xs font-black text-white leading-none">{user.username}</p>
              <p className="text-[9px] text-yellow-400 font-bold uppercase tracking-tighter mt-1">{user.role}</p>
            </div>
            <button 
              onClick={() => setView('perfil')}
              className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all active:scale-95"
            >
              <div className="w-8 h-8 bg-yellow-400 rounded-xl flex items-center justify-center text-black font-black text-xs shadow-lg shadow-yellow-400/20">
                {user.username.charAt(0).toUpperCase()}
              </div>
            </button>
          </div>
        </header>

        <div className="px-10 py-8 pb-40">
          {children}
        </div>
      </main>

      {/* PLAYER MODERNO */}
      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-6xl h-24 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[35px] px-10 flex items-center justify-between shadow-2xl z-50">
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
            <p className="text-[10px] text-yellow-400/70 font-black uppercase italic truncate">{currentSong?.artist?.username || 'System Radio'}</p>
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
    </div>
  );
};

export default Layout;