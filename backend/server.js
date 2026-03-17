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
      const { title, description, lyrics, artistId } = req.body;

      if (!title) return res.status(400).json({ error: 'El titulo es obligatorio' });
      if (!artistId) return res.status(400).json({ error: 'ID de artista faltante. Vuelve a iniciar sesion.' });
      if (!req.files || !req.files.audio) return res.status(400).json({ error: 'Falta el archivo de audio' });
      if (!req.files || !req.files.cover) return res.status(400).json({ error: 'Falta la carátula' });
      
      console.log('📁 Archivos recibidos:', { 
        hasAudio: !!req.files.audio, 
        hasCover: !!req.files.cover,
        audioPath: req.files.audio?.[0]?.path,
        coverPath: req.files.cover?.[0]?.path
      });

      if (!process.env.CLOUDINARY_NAME || !process.env.CLOUDINARY_KEY || !process.env.CLOUDINARY_SECRET) {
        return res.status(500).json({ error: 'Servidor no configurado: Cloudinary sin credenciales' });
      }

      const newSong = new Song({
        title,
        description: description || '',
        lyrics: lyrics || '',
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
    const { username, password } = req.body;

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
      role: 'artist',
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

app.post('/register-admin', async (req, res) => {
  try {
    const { username, password, adminCode } = req.body;

    if (!username || !password || !adminCode) {
      return res.status(400).json({ error: 'Usuario, contraseña y código admin son obligatorios' });
    }

    if (!process.env.ADMIN_SETUP_CODE) {
      return res.status(500).json({ error: 'ADMIN_SETUP_CODE no está configurado en el servidor' });
    }

    if (adminCode !== process.env.ADMIN_SETUP_CODE) {
      return res.status(403).json({ error: 'Código admin inválido' });
    }

    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(409).json({ error: 'Ese usuario ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      password: hashedPassword,
      role: 'admin',
    });

    await newUser.save();
    return res.status(201).json({
      message: 'Cuenta admin creada',
      user: {
        _id: newUser._id,
        username: newUser.username,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al crear cuenta admin' });
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

app.get('/songs', async (req, res) => {
  try {
    const artistId = req.query.artist;
    if (!artistId) {
      return res.status(400).json({ error: 'Falta ID de artista' });
    }

    const songs = await Song.find({ artist: artistId })
      .populate('artist', 'username')
      .sort({ createdAt: -1 });

    return res.json(songs);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al obtener canciones' });
  }
});

app.get('/all-songs', async (req, res) => {
  try {
    const songs = await Song.find()
      .populate('artist', 'username _id')
      .sort({ createdAt: -1 });

    return res.json(songs);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al obtener canciones' });
  }
});

app.put('/songs/:songId', async (req, res) => {
  try {
    const { songId } = req.params;
    const { title, description, lyrics, userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Falta userId para autorizar edición' });
    }

    const user = await User.findById(userId).select('_id role');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const song = await Song.findById(songId);
    if (!song) {
      return res.status(404).json({ error: 'Canción no encontrada' });
    }

    const canEdit = user.role === 'admin' || String(song.artist) === String(user._id);
    if (!canEdit) {
      return res.status(403).json({ error: 'No tienes permisos para editar esta canción' });
    }

    song.title = (title || '').trim() || song.title;
    song.description = description || '';
    song.lyrics = lyrics || '';
    await song.save();

    const updatedSong = await Song.findById(songId).populate('artist', 'username _id');
    return res.json({ message: 'Canción actualizada', song: updatedSong });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al actualizar canción' });
  }
});

app.delete('/songs/:songId', async (req, res) => {
  try {
    const { songId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Falta userId para autorizar eliminación' });
    }

    const user = await User.findById(userId).select('_id role');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const song = await Song.findById(songId);
    if (!song) {
      return res.status(404).json({ error: 'Canción no encontrada' });
    }

    const canDelete = user.role === 'admin' || String(song.artist) === String(user._id);
    if (!canDelete) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar esta canción' });
    }

    await Song.findByIdAndDelete(songId);
    return res.json({ message: 'Canción eliminada' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al eliminar canción' });
  }
});

app.get('/search-all', async (req, res) => {
  try {
    const query = (req.query.query || '').trim();
    if (!query) {
      return res.json({ artists: [], songs: [] });
    }

    const artists = await User.find({
      username: { $regex: query, $options: 'i' },
    })
      .select('_id username role bio profilePic')
      .limit(12);

    const songs = await Song.find({
      title: { $regex: query, $options: 'i' },
    })
      .populate('artist', 'username _id profilePic bio')
      .sort({ createdAt: -1 })
      .limit(20);

    return res.json({ artists, songs });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al buscar contenido' });
  }
});

app.get('/artists/:artistId', async (req, res) => {
  try {
    const { artistId } = req.params;
    const artist = await User.findById(artistId).select('_id username role bio profilePic');

    if (!artist) {
      return res.status(404).json({ error: 'Artista no encontrado' });
    }

    const songs = await Song.find({ artist: artistId })
      .populate('artist', 'username _id profilePic bio')
      .sort({ createdAt: -1 });

    return res.json({ artist, songs });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al obtener perfil del artista' });
  }
});

app.put('/users/:userId/profile', (req, res) => {
  upload.single('profilePic')(req, res, async (uploadErr) => {
    if (uploadErr) {
      console.error('Error subiendo foto de perfil:', uploadErr.message || uploadErr);
      return res.status(500).json({ error: 'Error al subir foto de perfil' });
    }

    try {
      const { userId } = req.params;
      const { bio } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      if (typeof bio === 'string') {
        user.bio = bio;
      }

      if (req.file?.path) {
        user.profilePic = req.file.path;
      }

      await user.save();

      return res.json({
        message: 'Perfil actualizado',
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
      return res.status(500).json({ error: 'Error al actualizar perfil' });
    }
  });
});

app.get('/admin/users', async (req, res) => {
  try {
    const requesterId = req.query.requesterId;
    if (!requesterId) {
      return res.status(400).json({ error: 'Falta requesterId' });
    }

    const requester = await User.findById(requesterId).select('role');
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({ error: 'Solo admins pueden ver miembros' });
    }

    const users = await User.find()
      .select('_id username role bio profilePic createdAt')
      .sort({ createdAt: -1 });

    return res.json(users);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al obtener miembros' });
  }
});

app.put('/admin/users/:userId/role', async (req, res) => {
  try {
    const { userId } = req.params;
    const { requesterId, role } = req.body;

    if (!requesterId || !role) {
      return res.status(400).json({ error: 'Faltan datos para actualizar rol' });
    }

    if (!['user', 'artist', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    const requester = await User.findById(requesterId).select('role');
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({ error: 'Solo admins pueden cambiar roles' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    targetUser.role = role;
    await targetUser.save();

    return res.json({
      message: 'Rol actualizado',
      user: {
        _id: targetUser._id,
        username: targetUser.username,
        role: targetUser.role,
        profilePic: targetUser.profilePic,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al cambiar rol' });
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