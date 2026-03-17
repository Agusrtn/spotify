import React, { useState } from 'react';
import { API_URL } from '../config';

const Login = ({ onLogin }) => {
  const [id, setId] = useState('');
  const [pass, setPass] = useState('');
  const [isRegistering, setIsRegistering] = useState(false); // Modo registro
  const [isAdminRegister, setIsAdminRegister] = useState(false);
  const [adminCode, setAdminCode] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    
    // Si estamos registrando, vamos a /register; si no, a /login
    const endpoint = isRegistering
      ? (isAdminRegister ? "/register-admin" : "/register")
      : "/login";
    
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: id, 
          password: pass,
          adminCode: isRegistering && isAdminRegister ? adminCode : undefined,
        })
      });

      const data = await response.json();

      if (response.ok) {
        if (isRegistering) {
          alert("✅ ¡Registro exitoso! Ahora puedes entrar con tus credenciales.");
          setIsRegistering(false); // Volvemos al modo login
          setIsAdminRegister(false);
          setAdminCode('');
        } else {
          onLogin(data.user); // Iniciamos sesión
        }
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      alert("❌ Error de conexión con la Crew. Revisa tu internet.");
    }
  };

  return (
    <div className="h-screen bg-[#080808] flex items-center justify-center font-sans relative overflow-hidden">
      
      {/* Decoración de fondo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-yellow-400/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-yellow-400/5 blur-[120px] rounded-full"></div>

      <form 
        onSubmit={handleAuth} 
        className="bg-white/5 p-12 rounded-[48px] border border-white/10 w-full max-w-md backdrop-blur-2xl shadow-2xl z-10 animate-in zoom-in-95 duration-500"
      >
        <div className="text-center mb-10">
          <div className="bg-yellow-400 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3 shadow-lg shadow-yellow-400/20">
            <span className="text-black text-3xl font-black">RTN</span>
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">
            {isRegistering ? 'Join the' : 'Join the'} <span className="text-yellow-400">CREW</span>
          </h1>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">
            {isRegistering ? (isAdminRegister ? 'Crear cuenta de administrador' : 'Registro de artista') : 'Vibe Check 2026'}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-gray-500 font-black uppercase ml-4 mb-2 block">Username</label>
            <input 
              type="text" 
              placeholder="Ej: Paquito_1234" 
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

          {isRegistering && isAdminRegister && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] text-gray-500 font-black uppercase ml-4 mb-2 block">Código Admin</label>
              <input
                type="password"
                placeholder="Código secreto de administrador"
                className="w-full bg-black/50 border border-white/10 p-4 rounded-2xl text-white focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition-all placeholder:text-gray-700"
                onChange={(e) => setAdminCode(e.target.value)}
                value={adminCode}
                required
              />
            </div>
          )}

          {isRegistering && (
            <label className="flex items-center gap-2 text-xs text-gray-400 font-semibold">
              <input
                type="checkbox"
                checked={isAdminRegister}
                onChange={(e) => setIsAdminRegister(e.target.checked)}
              />
              Crear como cuenta admin
            </label>
          )}
        </div>

        <button 
          type="submit"
          className="w-full bg-yellow-400 text-black font-black py-5 rounded-2xl mt-10 hover:scale-[1.02] active:scale-95 hover:shadow-[0_0_40px_rgba(250,204,21,0.4)] transition-all uppercase tracking-widest text-sm"
        >
          {isRegistering ? 'Crear mi cuenta' : 'Entrar a la Plataforma'}
        </button>

        <p className="text-center text-gray-600 text-[10px] mt-8 font-medium">
          {isRegistering ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'} 
          <button 
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setIsAdminRegister(false);
              setAdminCode('');
            }}
            className="text-yellow-400 ml-1 font-black uppercase hover:underline"
          >
            {isRegistering ? 'Inicia sesión' : 'Regístrate aquí'}
          </button>
        </p>

        {isRegistering && !isAdminRegister && (
          <p className="text-center text-gray-500 text-[10px] mt-3 font-medium uppercase tracking-wide">
            El registro normal crea cuentas con rol ARTIST por defecto.
          </p>
        )}
      </form>
    </div>
  );
};

export default Login;