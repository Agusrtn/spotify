require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 1. Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ RTN conectado a MongoDB"))
  .catch(err => console.error("❌ Error de conexión:", err));

// 2. Importar Modelos
const User = require('./models/User'); 
const Playlist = require('./models/Playlist');

// --- RUTAS ---

// REGISTRO
app.post("/register", async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: "El nombre de usuario ya está pillado" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      password: hashedPassword,
      role: role || 'user',
      bio: "¡Nueva leyenda en RTN MUSIC!",
      profilePic: ""
    });

    await newUser.save();
    res.status(201).json({ message: "Usuario creado con éxito" });
  } catch (error) {
    console.error("Error en registro:", error);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    
    if (!user) return res.status(401).json({ error: "Usuario no existe en la Crew" });
    if (user.accessDenied) return res.status(403).json({ error: "Estás baneado de RTN MUSIC" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Credenciales inválidas" });

    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET || "RTN_SECRET"
    );

    res.json({ 
      token, 
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        bio: user.bio,
        profilePic: user.profilePic
      } 
    });
 } catch (error) {
    // Esto imprimirá el error real en la consola de Render
    console.error("DETALLE DEL FALLO EN LOGIN:", error); 
    
    // Esto enviará el mensaje real al cartelito de error en tu web
    res.status(500).json({ error: `Fallo en el servidor: ${error.message}` });
  }
});

// BUSCAR ARTISTAS
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

// ACTUALIZAR PERFIL
app.put("/update-profile", async (req, res) => {
  try {
    const { userId, bio, profilePic } = req.body;
    const updatedUser = await User.findByIdAndUpdate(userId, { bio, profilePic }, { new: true });
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar" });
  }
});

// PUERTO
const PORT = process.env.PORT || 10000; 
app.listen(PORT, () => console.log(`🚀 Servidor RTN en puerto ${PORT}`));