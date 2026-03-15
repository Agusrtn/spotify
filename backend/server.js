require('dotenv').config(); // 1. IMPORTANTE: Carga las variables del panel de Render
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 2. Conexión dinámica a MongoDB
// Usamos process.env.MONGO_URI para que Render use la llave que pusimos en el panel
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ RTN conectado a MongoDB"))
  .catch(err => console.error("❌ Error de conexión:", err));

// 3. Importar el modelo de Usuario (Mejor usar el archivo que ya tienes en models/User.js)
const User = require('./models/User'); 

// --- RUTAS DE PERFIL Y PLAYLISTS ---

// Actualizar Perfil (Bio y Foto)
app.put("/update-profile", async (req, res) => {
  try {
    const { userId, bio, profilePic } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      { bio, profilePic }, 
      { new: true }
    );
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar el perfil" });
  }
});

// Buscar Artistas (Para el buscador de Explorar)
app.get("/search", async (req, res) => {
  try {
    const { query } = req.query;
    const artists = await User.find({ 
      username: { $regex: query, $options: "i" },
      role: "artist" 
    });
    res.json(artists);
  } catch (error) {
    res.status(500).json({ error: "Error en la búsqueda" });
  }
});

// Crear Playlist (Requiere el modelo Playlist que creamos antes)
const Playlist = require('./models/Playlist'); // Asegúrate de que el archivo existe
app.post("/playlists", async (req, res) => {
  try {
    const { name, creatorId, songs } = req.body;
    const newPlaylist = new Playlist({ name, creator: creatorId, songs });
    await newPlaylist.save();
    res.json(newPlaylist);
  } catch (error) {
    res.status(500).json({ error: "Error al crear la playlist" });
  }
});
// Ruta de Login
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    if (user.accessDenied) {
      return res.status(403).json({ error: "Estás baneado de RTN MUSIC" });
    }

    // Usar una clave secreta desde el .env para más seguridad
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "RTN_SECRET_KEY"
    );

    res.json({
      token,
      user: {
        username: user.username,
        role: user.role,
        bio: user.bio,        // Añadimos esto para el perfil musical
        profilePic: user.profilePic // Añadimos esto para la foto
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// 4. Puerto dinámico para Render
const PORT = process.env.PORT || 10000; 
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});

// RUTA DE REGISTRO
app.post("/register", async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "El nombre de usuario ya está pillado" });
    }

    // Encriptar la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear nuevo usuario
    const newUser = new User({
      username,
      password: hashedPassword,
      role: role || 'user', // Por defecto es user si no se manda nada
      bio: "¡Nueva leyenda en RTN MUSIC!",
      profilePic: ""
    });

    await newUser.save();
    res.status(201).json({ message: "Usuario creado con éxito en la Crew" });
  } catch (error) {
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});

module.exports = mongoose.model('User', UserSchema);