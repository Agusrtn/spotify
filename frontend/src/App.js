import React, { useState } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';

function App() {
  const [user, setUser] = useState(null); // Guardamos el objeto user {username, role}
  const [view, setView] = useState('inicio');

  // Si no hay usuario, mostramos login
  if (!user) {
    return <Login onLogin={(userData) => setUser(userData)} />;
  }

  return (
    <Layout setView={setView} user={user}>
      
      {view === 'inicio' && (
        <div className="animate-in fade-in duration-700">
          <h1 className="text-7xl font-black mb-8 tracking-tighter">
            EXPLORA EL <span className="text-yellow-400">SONIDO</span>
          </h1>
          <p className="text-gray-400 text-xl">Bienvenido de nuevo, {user.username}</p>
        </div>
      )}

      {view === 'admin' && user.role === 'admin' && (
        <AdminPanel />
      )}

      {view === 'perfil' && (
        <div className="p-10 bg-white/5 rounded-[40px] border border-white/10">
          <h2 className="text-3xl font-bold mb-4">Tu Espacio RTN</h2>
          <p>Rango actual: <span className="text-yellow-400 font-bold uppercase">{user.role}</span></p>
        </div>
      )}

    </Layout>
  );
}

// Sub-componente para el Panel de Admin
const AdminPanel = () => {
  const [users] = useState([
    { id: 1, name: 'pedro_music', role: 'user' },
    { id: 2, name: 'laura_beats', role: 'user' }
  ]);

  return (
    <div className="animate-in slide-in-from-bottom-8 duration-500">
      <h1 className="text-4xl font-black mb-8 text-yellow-400 uppercase tracking-tighter">Control de Crew</h1>
      <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-yellow-400 text-black font-black uppercase text-xs">
            <tr>
              <th className="p-5">Usuario</th>
              <th className="p-5">Rango</th>
              <th className="p-5">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition">
                <td className="p-5 font-bold">{u.name}</td>
                <td className="p-5 text-gray-400">{u.role}</td>
                <td className="p-5">
                  <button className="bg-white text-black px-4 py-1 rounded-full text-xs font-bold hover:bg-yellow-400 transition">
                    HACER ARTISTA
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default App;