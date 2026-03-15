import React, { useState } from 'react';

const Login = ({ onLogin }) => {
  const [id, setId] = useState('');
  const [pass, setPass] = useState('');

  // Simulación de base de datos para pruebas
  // En el futuro, esto se consultará con fetch() a tu MongoDB
  const mockUsers = [
    { id: 1, username: 'Agus_rtn', password: 'Maragus2417', role: 'admin', accessDenied: false },
    { id: 2, username: 'pedro_music', password: '123', role: 'user', accessDenied: false },
    { id: 3, username: 'laura_beats', password: '123', role: 'artist', accessDenied: true }, // Usuario baneado
  ];

  const handleEntry = (e) => {
    e.preventDefault();

    // Buscamos si las credenciales coinciden con algún usuario de la "base de datos"
    const userFound = mockUsers.find(u => u.username === id && u.password === pass);

    if (userFound) {
      // 1. Verificamos si el administrador le ha denegado el acceso
      if (userFound.accessDenied) {
        alert("⚠️ ACCESO DENEGADO: Tu cuenta ha sido suspendida por la administración de RTN MUSIC.");
        return;
      }

      // 2. Si todo está bien, iniciamos sesión con sus datos y rol
      onLogin(userFound);
    } else {
      // 3. Error si no existe o la contraseña está mal
      alert("❌ Credenciales inválidas. Inténtalo de nuevo o contacta con la Crew.");
    }
  };

  return (
    <div className="h-screen bg-[#080808] flex items-center justify-center font-sans relative overflow-hidden">
      
      {/* Decoración de fondo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-yellow-400/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-yellow-400/5 blur-[120px] rounded-full"></div>

      <form 
        onSubmit={handleEntry} 
        className="bg-white/5 p-12 rounded-[48px] border border-white/10 w-full max-w-md backdrop-blur-2xl shadow-2xl z-10 animate-in zoom-in-95 duration-500"
      >
        <div className="text-center mb-10">
          <div className="bg-yellow-400 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3 shadow-lg shadow-yellow-400/20">
            <span className="text-black text-3xl font-black">RTN</span>
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter">
            JOIN THE <span className="text-yellow-400">CREW</span>
          </h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-2">Vibe Check 2026</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-gray-500 font-black uppercase ml-4 mb-2 block">Username</label>
            <input 
              type="text" 
              placeholder="Ej: Agus_rtn" 
              className="w-full bg-black/50 border border-white/10 p-4 rounded-2xl text-white focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition-all placeholder:text-gray-700"
              onChange={(e) => setId(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-500 font-black uppercase ml-4 mb-2 block">Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="w-full bg-black/50 border border-white/10 p-4 rounded-2xl text-white focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition-all placeholder:text-gray-700"
              onChange={(e) => setPass(e.target.value)}
              required
            />
          </div>
        </div>

        <button 
          type="submit"
          className="w-full bg-yellow-400 text-black font-black py-5 rounded-2xl mt-10 hover:scale-[1.02] active:scale-95 hover:shadow-[0_0_40px_rgba(250,204,21,0.4)] transition-all uppercase tracking-widest text-sm"
        >
          Entrar a la Plataforma
        </button>

        <p className="text-center text-gray-600 text-[10px] mt-8 font-medium">
          ¿No tienes cuenta? <span className="text-yellow-400/50 cursor-not-allowed">Solicita acceso a un Admin</span>
        </p>
      </form>
    </div>
  );
};

export default Login;