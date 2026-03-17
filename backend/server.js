require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

app.get('/health/upload-config', async (req, res) => {
  const hasName = Boolean(process.env.CLOUDINARY_NAME);
  const hasKey = Boolean(process.env.CLOUDINARY_KEY);
  const hasSecret = Boolean(process.env.CLOUDINARY_SECRET);

  if (!hasName || !hasKey || !hasSecret) {
    return res.status(500).json({
      ok: false,
      error: 'Faltan variables de Cloudinary en el servidor',
      cloudinary: { hasName, hasKey, hasSecret },
    });
  }

  try {
    await cloudinary.api.ping();
    return res.json({
      ok: true,
      cloudinary: {
        cloudName: process.env.CLOUDINARY_NAME,
        keyLast4: process.env.CLOUDINARY_KEY.slice(-4),
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: 'Cloudinary no acepta credenciales/configuracion',
      details: error.message,
      cloudinary: {
        cloudName: process.env.CLOUDINARY_NAME,
        keyLast4: process.env.CLOUDINARY_KEY.slice(-4),
      },
    });
  }
});

// Configuración de Almacenamiento
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isAudio = file.mimetype.includes('audio');
    return {
      folder: 'rtn_music',
      resource_type: isAudio ? 'video' : 'image',
    };
  },
});
const upload = multer({ storage: storage });

// --- RUTAS ---

// RUTA DE SUBIDA (DROP NEW HIT)
app.post('/upload-song', (req, res) => {
  upload.fields([{ name: 'audio' }, { name: 'cover' }])(req, res, async (uploadErr) => {
    if (uploadErr) {
      console.error('Error de upload en Cloudinary:', uploadErr.message || uploadErr);
      return res.status(500).json({
        error: `Error de upload: ${uploadErr.message || 'fallo de Cloudinary'}`,
        code: uploadErr.http_code || uploadErr.code || undefined,
      });
    }

    try {
      const { title, description, artistId } = req.body;

      if (!title) return res.status(400).json({ error: 'El titulo es obligatorio' });
      if (!artistId) return res.status(400).json({ error: 'ID de artista faltante. Vuelve a iniciar sesion.' });
      if (!req.files || !req.files.audio) return res.status(400).json({ error: 'Falta el archivo de audio' });

      if (!process.env.CLOUDINARY_NAME || !process.env.CLOUDINARY_KEY || !process.env.CLOUDINARY_SECRET) {
        return res.status(500).json({ error: 'Servidor no configurado: Cloudinary sin credenciales' });
      }

      const newSong = new Song({
        title,
        description: description || '',
        artist: artistId,
        audioUrl: req.files.audio[0].path,
        coverUrl: req.files.cover ? req.files.cover[0].path : '',
      });

      await newSong.save();
      return res.status(201).json({ message: 'Hit publicado', song: newSong });
    } catch (error) {
      console.error('Error en /upload-song:', error.message);
      return res.status(500).json({ error: `Error al subir el archivo: ${error.message}` });
    }
  });
});

app.post('/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
    }

    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(409).json({ error: 'Ese usuario ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      password: hashedPassword,
      role: role === 'artist' || role === 'admin' ? role : 'user',
    });

    await newUser.save();
    return res.status(201).json({
      message: 'Registro exitoso',
      user: {
        _id: newUser._id,
        username: newUser.username,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        role: user.role,
        bio: user.bio,
        profilePic: user.profilePic,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

app.get('/search', async (req, res) => {
  try {
    const query = (req.query.query || '').trim();
    if (!query) {
      return res.json([]);
    }

    const users = await User.find({
      username: { $regex: query, $options: 'i' },
    })
      .select('_id username role profilePic')
      .limit(20);

    return res.json(users);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al buscar artistas' });
  }
});

const PORT = Number(process.env.PORT) || 10000;
const server = app.listen(PORT, () => console.log(`🚀 Servidor RTN en puerto ${PORT}`));

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ El puerto ${PORT} ya está en uso. Define otro puerto en PORT.`);
  } else {
    console.error('❌ Error del servidor:', err);
  }
  process.exit(1);
});