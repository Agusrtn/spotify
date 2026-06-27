import React from 'react';
import { Radio, Play, Disc, ListMusic, Pause } from 'lucide-react';

const RadioHomeSection = ({ radioStation, radioCurrentSong, radioNextSongs, radioStationQueueCount, isRadioPlayback, isPlaying, togglePlay, playRadioStation }) => {
  if (!radioStation) return null;

  return (
    <section className="mb-10 md:mb-14 p-6 md:p-8 rounded-[40px] border border-yellow-400/30 bg-gradient-to-br from-yellow-900/30 via-yellow-600/5 to-black/40 overflow-hidden relative">
      <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(ellipse at 30% 50%, #facc15 0%, transparent 70%)' }} />
      <div className="relative">
        <div className="flex items-center justify-between mb-4 md:mb-6 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-yellow-400 flex items-center justify-center animate-pulse">
              <Radio size={24} className="text-black" />
            </div>
            <div>
              <h3 className="text-xl md:text-3xl font-black tracking-tight">{radioStation.title || 'RTN Radio'}</h3>
              <p className="text-xs text-yellow-300/80 font-bold">{radioStation.subtitle || 'En directo desde la crew'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={playRadioStation}
            disabled={!radioCurrentSong && !radioStation.queue?.length}
            className="inline-flex items-center gap-2 bg-yellow-400 text-black text-xs md:text-sm font-black uppercase tracking-widest px-5 py-3 rounded-2xl hover:shadow-[0_0_30px_rgba(250,204,21,0.4)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={16} className="fill-black" />
            {isRadioPlayback ? 'Reproduciendo' : 'Sintonizar'}
          </button>
        </div>

        {radioCurrentSong ? (
          <div className="flex items-center gap-4 bg-black/40 border border-yellow-400/20 rounded-2xl p-4 mb-4">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/40 flex-shrink-0">
              {radioCurrentSong.coverUrl ? (
                <img src={radioCurrentSong.coverUrl} alt={radioCurrentSong.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Disc size={22} className="text-yellow-400/40" /></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-base truncate">{radioCurrentSong.title || 'Sonando ahora'}</p>
              <p className="text-[11px] text-yellow-300/80 font-bold truncate">{radioCurrentSong.artist?.username || 'Artista'}</p>
            </div>
            {isRadioPlayback && (
              <button onClick={togglePlay} className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center flex-shrink-0">
                {isPlaying ? <Pause size={18} fill="black" className="text-black" /> : <Play size={18} fill="black" className="text-black ml-0.5" />}
              </button>
            )}
          </div>
        ) : (
          <div className="bg-black/40 border border-yellow-400/20 rounded-2xl p-4 mb-4">
            <p className="text-sm text-gray-400">Radio en pausa — los admins pueden añadir canciones a la cola</p>
          </div>
        )}

        {radioNextSongs.length > 0 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400/70 mb-2 flex items-center gap-2">
              <ListMusic size={13} /> Siguientes en la radio ({radioStationQueueCount})
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {radioNextSongs.map((song) => (
                <div key={song._id} className="flex-shrink-0 flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2 min-w-0 max-w-[220px]">
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-black/40 flex-shrink-0">
                    {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Disc size={12} className="text-yellow-400/40" /></div>}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold truncate">{song.title}</p>
                    <p className="text-[9px] text-gray-500 truncate">{song.artist?.username || 'Artista'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default RadioHomeSection;
