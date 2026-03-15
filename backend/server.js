require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Modelos
const User = require('./models/User'); 
const Song = require('./models/Song');

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ RTN conectado a MongoDB"))
  .catch(err => console.error("❌ Error de conexión:", err));

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

// Configuración de Almacenamiento
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isAudio = file.mimetype.includes('audio');
    return {
      folder: 'rtn_music',
      resource_type: isAudio ? 'video' : 'image',
      format: isAudio ? 'mp3' : 'jpg',
    };
  },
});
const upload = multer({ storage: storage });

// --- RUTAS ---

// RUTA DE SUBIDA (DROP NEW HIT)
app.post("/upload-song", upload.fields([{ name: 'audio' }, { name: 'cover' }]), async (req, res) => {
  try {
    const { title, description, artistId } = req.body;
    if (!req.files['audio']) return res.status(400).json({ error: "Falta el archivo de audio" });

    const newSong = new Song({
      title,
      description,
      artist: artistId,
      audioUrl: req.files['audio'][0].path,
      coverUrl: req.files['cover'] ? req.files['cover'][0].path : ''
    });

    await newSong.save();
    res.status(201).json({ message: "¡Hit en la calle!", song: newSong });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al subir a Cloudinary" });
  }
});

// (Mantén tus rutas de /register, /login, /search y /update-profile aquí igual que las tenías)

app.post("/register", async (req, res) => { /* Tu código actual */ });
app.post("/login", async (req, res) => { /* Tu código actual */ });
app.get("/search", async (req, res) => { /* Tu código actual */ });

const PORT = process.env.PORT || 10000; 
app.listen(PORT, () => console.log(`🚀 Servidor RTN en puerto ${PORT}`));