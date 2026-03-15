import React, { useState } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
// IMPORTANTE: Asegúrate de tener lucide-react instalado
import { Disc, Play } from 'lucide-react'; 

const API_URL = "https://rtnmusicappbackend.onrender.com";

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('inicio');
  const [searchResults, setSearchResults] = useState([]);
  // 1. ESTADO PARA EL MODAL: Necesario para que el botón de Layout lo abra
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSearch = async (query) => {
    if (query.length < 2) { setSearchResults([]); return; }
    try {
      const res = await fetch(`${API_URL}/search?query=${query}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) { console.error(err); }
  };

  if (!user) return <Login onLogin={(userData) => setUser(userData)} />;

  return (
    // 2. PASAMOS setIsModalOpen AL LAYOUT: 
    // Para que cuando hagas clic en "DROP NEW HIT" cambie a true
    <Layout setView={setView} user={user} view={view} setModalOpen={setIsModalOpen}>
      
      {view === 'inicio' && (
        <div className="animate-in fade-in duration-700">
          <h1 className="text-7xl font-black mb-8 tracking-tighter uppercase italic">
            EXPLORA EL <span className="text-yellow-400 font-black">SONIDO</span>
          </h1>
          
          <section className="mt-12">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] mb-6">Novedades en la Crew</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="group relative bg-white/5 border border-white/5 p-4 rounded-[35px] hover:bg-white/10 transition-all cursor-pointer">
                  <div className="aspect-square bg-yellow-400/10 rounded-[25px] mb-4 flex items-center justify-center overflow-hidden">
                     <Disc className="text-yellow-400/20 group-hover:animate-spin-slow" size={60} />
                  </div>
                  <h4 className="font-black uppercase italic">Track Name #{i}</h4>
                  <p className="text-[10px] text-yellow-400 font-bold tracking-widest uppercase">Artist Name</p>
                  <button className="absolute bottom-6 right-6 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 shadow-xl shadow-yellow-400/20">
                    <Play fill="black" size={20} className="ml-1 text-black" />
                  </button>
                </div>
              ))}
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
        </div>
      )}

      {/* 3. RENDERIZAR EL MODAL: Debe estar aquí para que aparezca en pantalla */}
      <UploadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        userId={user._id} 
      />

    </Layout>
  );
}

// 4. COMPONENTE MODAL (Fuera de App para limpieza)
const UploadModal = ({ isOpen, onClose, userId }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#121212] border border-white/10 w-full max-w-lg rounded-[40px] p-10 animate-in zoom-in-95 duration-300 relative">
        <h2 className="text-3xl font-black italic mb-6 uppercase tracking-tighter">
          SOLTAR <span className="text-yellow-400">NUEVO HIT</span>
        </h2>
        
        <div className="space-y-6">
          <div className="border-2 border-dashed border-white/10 rounded-3xl p-10 text-center hover:border-yellow-400/50 transition-all cursor-pointer group">
            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest group-hover:text-white transition-colors">Arrastra tu MP3 aquí</p>
          </div>
          
          <input 
            type="text" 
            placeholder="Nombre del track" 
            className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 outline-none focus:border-yellow-400 text-white placeholder:text-gray-700 transition-all" 
          />
          
          <div className="flex gap-4">
            <button 
              onClick={onClose} 
              className="flex-1 text-gray-500 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button className="flex-1 bg-yellow-400 text-black font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg shadow-yellow-400/20 hover:scale-[1.02] active:scale-95 transition-all">
              Publicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;