import React from 'react';
import { Disc, Play, ChevronLeft, ChevronRight } from 'lucide-react';

const HomeSectionRenderer = ({ section, allSongs, playSong, setSelectedAlbum, setSelectedPlaylist, openArtistProfile, formatPlayCount, getSongPlayCount }) => {
  if (!section || !section.items?.length) return null;

  const { title, subtitle, type, layout, items } = section;

  const handleItemClick = (item) => {
    if (type === 'songs') {
      const idx = allSongs.findIndex((s) => String(s._id) === String(item._id));
      if (idx >= 0) {
        playSong(item, idx);
      }
    } else if (type === 'albums') {
      setSelectedAlbum(item);
    } else if (type === 'artists') {
      if (item._id) openArtistProfile(item._id);
    } else {
      // playlists
      setSelectedPlaylist(item);
    }
  };

  // For songs, show the row layout
  // For others, show card grid/carousel
  const showAsRows = type === 'songs';

  return (
    <section className="mb-10 md:mb-14">
      <div className="flex items-center justify-between mb-4 md:mb-6 gap-3">
        <div>
          <h3 className="text-xl md:text-3xl font-black tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 font-bold mt-1">{subtitle}</p>}
        </div>
      </div>

      {showAsRows ? (
        <div className="space-y-2">
          {items.slice(0, 8).map((song) => {
            const idx = allSongs.findIndex((s) => String(s._id) === String(song._id));
            return (
              <div
                key={song._id}
                className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2 hover:bg-white/10 transition-all cursor-pointer"
                onClick={() => handleItemClick(song)}
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/50 flex-shrink-0">
                  {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Disc size={16} className="text-yellow-400/40" /></div>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate">{song.title}</p>
                  <p className="text-[10px] text-gray-400 uppercase truncate">{song.artist?.username || 'Artista'}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleItemClick(song); }}
                  className="w-9 h-9 rounded-lg border border-white/15 bg-white/10 hover:bg-white/20 flex items-center justify-center flex-shrink-0"
                >
                  <Play size={14} className="ml-0.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6`}>
          {items.slice(0, 6).map((item) => (
            <button
              key={item._id}
              onClick={() => handleItemClick(item)}
              className="text-left bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl overflow-hidden hover:bg-white/10 transition-all hover:-translate-y-1"
            >
              <div className="aspect-square bg-black/30 overflow-hidden">
                {item.coverUrl ? (
                  <img src={item.coverUrl} alt={item.title || item.name} className="w-full h-full object-cover" />
                ) : type === 'artists' ? (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-yellow-400/20 to-black text-4xl font-black text-yellow-400">
                    {(item.username || '?').charAt(0).toUpperCase()}
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-yellow-500 via-yellow-600 to-black">
                    <Disc size={48} className="text-white/60" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="font-black text-lg leading-tight mb-1 truncate">{item.title || item.name}</p>
                {type === 'albums' && (
                  <p className="text-gray-400 text-sm truncate">{item.artist?.username || 'Artista'}</p>
                )}
                {type === 'artists' && (
                  <p className="text-[10px] text-yellow-300 uppercase font-bold tracking-widest">{item.role || 'artist'}</p>
                )}
                {type === 'playlists' && (
                  <p className="text-gray-400 text-sm line-clamp-2">{item.description || 'Playlist destacada'}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

export default HomeSectionRenderer;
