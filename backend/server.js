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
const Playlist = require('./models/Playlist');
const Album = require('./models/Album');

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
      const { title, description, lyrics, artistId, uploaderId, collaborators: collaboratorsRaw } = req.body;

      let parsedCollaborators = [];
      if (collaboratorsRaw) {
        try { parsedCollaborators = JSON.parse(collaboratorsRaw); } catch (_) {}
        parsedCollaborators = parsedCollaborators
          .filter(c => c && typeof c.name === 'string' && c.name.trim())
          .map(c => ({ name: c.name.trim(), userId: c.userId || null }));
      }

      if (!title) return res.status(400).json({ error: 'El titulo es obligatorio' });
      if (!artistId) return res.status(400).json({ error: 'ID de artista faltante. Vuelve a iniciar sesion.' });
      if (!req.files || !req.files.audio) return res.status(400).json({ error: 'Falta el archivo de audio' });
      if (!req.files || !req.files.cover) return res.status(400).json({ error: 'Falta la carátula' });

      const targetArtist = await User.findById(artistId).select('_id role');
      if (!targetArtist) {
        return res.status(404).json({ error: 'Artista no encontrado' });
      }

      if (targetArtist.role !== 'artist' && targetArtist.role !== 'admin') {
        return res.status(400).json({ error: 'El usuario seleccionado no tiene rol de artista' });
      }

      if (uploaderId && String(uploaderId) !== String(artistId)) {
        const uploader = await User.findById(uploaderId).select('_id role');
        if (!uploader || uploader.role !== 'admin') {
          return res.status(403).json({ error: 'Solo admins pueden subir canciones para otros artistas' });
        }
      }
      
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
        collaborators: parsedCollaborators,
      });

      await newSong.save();
      const populatedSong = await Song.findById(newSong._id)
        .populate('artist', 'username _id profilePic bio')
        .populate('collaborators.userId', 'username _id');
      return res.status(201).json({ message: 'Hit publicado', song: populatedSong });
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
      role: 'user',
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
      .populate('collaborators.userId', 'username _id')
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
      .populate('collaborators.userId', 'username _id')
      .sort({ createdAt: -1 });

    return res.json(songs);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al obtener canciones' });
  }
});

app.post('/songs/:songId/play', async (req, res) => {
  try {
    const { songId } = req.params;
    const song = await Song.findById(songId);
    if (!song) {
      return res.status(404).json({ error: 'Canción no encontrada' });
    }

    song.playCount = Number(song.playCount || 0) + 1;
    song.lastPlayedAt = new Date();
    await song.save();

    return res.json({ ok: true, songId: song._id, playCount: song.playCount });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al registrar reproducción' });
  }
});

app.post('/songs/:songId/listen-time', async (req, res) => {
  try {
    const { songId } = req.params;
    const seconds = Number(req.body?.seconds || 0);
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return res.status(400).json({ error: 'seconds inválido' });
    }

    const safeSeconds = Math.min(Math.floor(seconds), 600);
    const song = await Song.findById(songId);
    if (!song) {
      return res.status(404).json({ error: 'Canción no encontrada' });
    }

    song.listenSeconds = Number(song.listenSeconds || 0) + safeSeconds;
    await song.save();

    return res.json({ ok: true, songId: song._id, listenSeconds: song.listenSeconds });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al registrar tiempo escuchado' });
  }
});

app.get('/playlists', async (req, res) => {
  try {
    const playlists = await Playlist.find({ isPublic: true })
      .populate('creator', 'username _id')
      .populate({
        path: 'songs',
        populate: { path: 'artist', select: 'username _id profilePic' },
      })
      .sort({ createdAt: -1 });

    return res.json(playlists);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al obtener playlists' });
  }
});

app.get('/my-playlists', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'Falta userId' });
    }

    const playlists = await Playlist.find({ creator: userId })
      .populate('creator', 'username _id')
      .populate({ path: 'songs', populate: { path: 'artist', select: 'username _id profilePic' } })
      .sort({ createdAt: -1 });

    return res.json(playlists);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al obtener tus playlists' });
  }
});

app.post('/my-playlists', async (req, res) => {
  try {
    const { userId, name, description, coverUrl, songIds, isPublic } = req.body;
    if (!userId || !name) {
      return res.status(400).json({ error: 'Faltan datos para crear playlist' });
    }

    const user = await User.findById(userId).select('_id');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const playlist = new Playlist({
      name,
      description: description || '',
      coverUrl: coverUrl || '',
      creator: userId,
      songs: Array.isArray(songIds) ? songIds : [],
      isDefault: false,
      isPublic: typeof isPublic === 'boolean' ? isPublic : true,
    });

    await playlist.save();
    const populatedPlaylist = await Playlist.findById(playlist._id)
      .populate('creator', 'username _id')
      .populate({ path: 'songs', populate: { path: 'artist', select: 'username _id profilePic' } });

    return res.status(201).json({ message: 'Playlist creada', playlist: populatedPlaylist });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al crear tu playlist' });
  }
});

app.put('/my-playlists/:playlistId', async (req, res) => {
  try {
    const { playlistId } = req.params;
    const { userId, name, description, coverUrl, songIds, isPublic } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Falta userId' });
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist no encontrada' });
    }

    const user = await User.findById(userId).select('_id role');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const canEdit = String(playlist.creator) === String(userId) || user.role === 'admin';
    if (!canEdit) {
      return res.status(403).json({ error: 'No tienes permisos para editar esta playlist' });
    }

    if (typeof name === 'string' && name.trim()) playlist.name = name.trim();
    if (typeof description === 'string') playlist.description = description;
    if (typeof coverUrl === 'string') playlist.coverUrl = coverUrl;
    if (Array.isArray(songIds)) playlist.songs = songIds;
    if (typeof isPublic === 'boolean') playlist.isPublic = isPublic;
    playlist.isDefault = false;

    await playlist.save();
    const populatedPlaylist = await Playlist.findById(playlist._id)
      .populate('creator', 'username _id')
      .populate({ path: 'songs', populate: { path: 'artist', select: 'username _id profilePic' } });

    return res.json({ message: 'Playlist actualizada', playlist: populatedPlaylist });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al actualizar tu playlist' });
  }
});

app.delete('/my-playlists/:playlistId', async (req, res) => {
  try {
    const { playlistId } = req.params;
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Falta userId' });
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist no encontrada' });
    }

    const user = await User.findById(userId).select('_id role');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const canDelete = String(playlist.creator) === String(userId) || user.role === 'admin';
    if (!canDelete) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar esta playlist' });
    }

    await Playlist.findByIdAndDelete(playlistId);
    return res.json({ message: 'Playlist eliminada' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al eliminar tu playlist' });
  }
});

app.post('/my-playlists/:playlistId/songs', async (req, res) => {
  try {
    const { playlistId } = req.params;
    const { userId, songId } = req.body;
    if (!userId || !songId) {
      return res.status(400).json({ error: 'Faltan userId o songId' });
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist no encontrada' });
    }

    const user = await User.findById(userId).select('_id role');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const canEdit = String(playlist.creator) === String(userId) || user.role === 'admin';
    if (!canEdit) {
      return res.status(403).json({ error: 'No tienes permisos para editar esta playlist' });
    }

    if (!playlist.songs.some((id) => String(id) === String(songId))) {
      playlist.songs.push(songId);
      await playlist.save();
    }

    const populatedPlaylist = await Playlist.findById(playlist._id)
      .populate('creator', 'username _id')
      .populate({ path: 'songs', populate: { path: 'artist', select: 'username _id profilePic' } });

    return res.json({ message: 'Canción añadida a playlist', playlist: populatedPlaylist });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al añadir canción a playlist' });
  }
});

app.delete('/my-playlists/:playlistId/songs/:songId', async (req, res) => {
  try {
    const { playlistId, songId } = req.params;
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Falta userId' });
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist no encontrada' });
    }

    const user = await User.findById(userId).select('_id role');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const canEdit = String(playlist.creator) === String(userId) || user.role === 'admin';
    if (!canEdit) {
      return res.status(403).json({ error: 'No tienes permisos para editar esta playlist' });
    }

    playlist.songs = playlist.songs.filter((id) => String(id) !== String(songId));
    await playlist.save();

    const populatedPlaylist = await Playlist.findById(playlist._id)
      .populate('creator', 'username _id')
      .populate({ path: 'songs', populate: { path: 'artist', select: 'username _id profilePic' } });

    return res.json({ message: 'Canción eliminada de playlist', playlist: populatedPlaylist });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al quitar canción de playlist' });
  }
});

app.post('/admin/playlists', async (req, res) => {
  try {
    const { requesterId, name, description, coverUrl, songIds, isDefault } = req.body;
    if (!requesterId || !name) {
      return res.status(400).json({ error: 'Faltan datos para crear playlist' });
    }

    const requester = await User.findById(requesterId).select('_id role');
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({ error: 'Solo admins pueden crear playlists' });
    }

    const playlist = new Playlist({
      name,
      description: description || '',
      coverUrl: coverUrl || '',
      creator: requesterId,
      songs: Array.isArray(songIds) ? songIds : [],
      isDefault: Boolean(isDefault),
      isPublic: true,
    });

    await playlist.save();
    const populatedPlaylist = await Playlist.findById(playlist._id)
      .populate('creator', 'username _id')
      .populate({ path: 'songs', populate: { path: 'artist', select: 'username _id profilePic' } });

    return res.status(201).json({ message: 'Playlist creada', playlist: populatedPlaylist });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al crear playlist' });
  }
});

app.put('/admin/playlists/:playlistId', async (req, res) => {
  try {
    const { playlistId } = req.params;
    const { requesterId, name, description, coverUrl, songIds, isDefault } = req.body;

    const requester = await User.findById(requesterId).select('_id role');
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({ error: 'Solo admins pueden editar playlists' });
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist no encontrada' });
    }

    if (typeof name === 'string' && name.trim()) playlist.name = name.trim();
    if (typeof description === 'string') playlist.description = description;
    if (typeof coverUrl === 'string') playlist.coverUrl = coverUrl;
    if (Array.isArray(songIds)) playlist.songs = songIds;
    if (typeof isDefault === 'boolean') playlist.isDefault = isDefault;

    await playlist.save();
    const populatedPlaylist = await Playlist.findById(playlist._id)
      .populate('creator', 'username _id')
      .populate({ path: 'songs', populate: { path: 'artist', select: 'username _id profilePic' } });

    return res.json({ message: 'Playlist actualizada', playlist: populatedPlaylist });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al actualizar playlist' });
  }
});

app.delete('/admin/playlists/:playlistId', async (req, res) => {
  try {
    const { playlistId } = req.params;
    const { requesterId } = req.body;

    const requester = await User.findById(requesterId).select('_id role');
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({ error: 'Solo admins pueden eliminar playlists' });
    }

    await Playlist.findByIdAndDelete(playlistId);
    return res.json({ message: 'Playlist eliminada' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al eliminar playlist' });
  }
});

app.put('/songs/:songId', async (req, res) => {
  try {
    const { songId } = req.params;
    const { title, description, lyrics, artistId, userId, collaborators: collaboratorsRaw } = req.body;

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

    if (artistId !== undefined) {
      if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Solo admins pueden cambiar el artista creador' });
      }

      const nextArtist = await User.findById(artistId).select('_id role');
      if (!nextArtist) {
        return res.status(404).json({ error: 'Artista no encontrado' });
      }

      if (nextArtist.role !== 'artist' && nextArtist.role !== 'admin') {
        return res.status(400).json({ error: 'El usuario seleccionado no tiene rol de artista' });
      }

      song.artist = artistId;
    }

    song.title = (title || '').trim() || song.title;
    song.description = description || '';
    song.lyrics = lyrics || '';
    if (collaboratorsRaw !== undefined) {
      try {
        const parsed = JSON.parse(collaboratorsRaw);
        song.collaborators = parsed
          .filter(c => c && typeof c.name === 'string' && c.name.trim())
          .map(c => ({ name: c.name.trim(), userId: c.userId || null }));
      } catch (_) {}
    }
    await song.save();

    const updatedSong = await Song.findById(songId)
      .populate('artist', 'username _id profilePic bio')
      .populate('collaborators.userId', 'username _id');
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
    const type = (req.query.type || 'all').trim();
    const sort = (req.query.sort || 'recent').trim();
    if (!query) {
      return res.json({ artists: [], songs: [], albums: [] });
    }

    const songSort = sort === 'popular' ? { listenSeconds: -1, playCount: -1, createdAt: -1 } : { createdAt: -1 };
    const artists = type === 'all' || type === 'artists'
      ? await User.find({
        username: { $regex: query, $options: 'i' },
      })
        .select('_id username role bio profilePic')
        .limit(12)
      : [];

    const songs = type === 'all' || type === 'songs'
      ? await Song.find({
        title: { $regex: query, $options: 'i' },
      })
        .populate('artist', 'username _id profilePic bio')
        .populate('collaborators.userId', 'username _id')
        .sort(songSort)
        .limit(20)
      : [];

    const albums = type === 'all' || type === 'albums'
      ? await Album.find({
        title: { $regex: query, $options: 'i' },
      })
        .populate('artist', 'username _id profilePic bio')
        .populate('songs', 'title artist coverUrl audioUrl')
        .sort({ releaseDate: -1 })
        .limit(20)
      : [];

    return res.json({ artists, songs, albums });
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
      .populate('collaborators.userId', 'username _id')
      .sort({ createdAt: -1 });

    const albums = await Album.find({ artist: artistId })
      .populate('artist', 'username _id profilePic bio')
      .populate('songs', 'title artist coverUrl audioUrl')
      .sort({ releaseDate: -1 });

    return res.json({ artist, songs, albums });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al obtener perfil del artista' });
  }
});

app.get('/artists/:artistId/stats', async (req, res) => {
  try {
    const { artistId } = req.params;
    const artist = await User.findById(artistId).select('_id username role');

    if (!artist) {
      return res.status(404).json({ error: 'Artista no encontrado' });
    }

    const songs = await Song.find({ artist: artistId }).select('_id title playCount listenSeconds createdAt');
    const albumsCount = await Album.countDocuments({ artist: artistId });
    const totalPlays = songs.reduce((acc, song) => acc + Number(song.playCount || 0), 0);
    const totalListenSeconds = songs.reduce((acc, song) => acc + Number(song.listenSeconds || 0), 0);
    const topSongs = [...songs]
      .sort((a, b) => Number(b.listenSeconds || 0) - Number(a.listenSeconds || 0) || Number(b.playCount || 0) - Number(a.playCount || 0))
      .slice(0, 5);

    return res.json({
      artist: { _id: artist._id, username: artist.username },
      totals: {
        songs: songs.length,
        albums: albumsCount,
        plays: totalPlays,
        listenSeconds: totalListenSeconds,
      },
      topSongs,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al obtener estadísticas del artista' });
  }
});

app.get('/admin/top-songs', async (req, res) => {
  try {
    const requesterId = req.query.requesterId;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    if (!requesterId) {
      return res.status(400).json({ error: 'Falta requesterId' });
    }

    const requester = await User.findById(requesterId).select('role');
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({ error: 'Solo admins pueden ver el ranking' });
    }

    const topSongs = await Song.find()
      .populate('artist', 'username _id profilePic')
      .sort({ listenSeconds: -1, playCount: -1, createdAt: -1 })
      .limit(limit);

    return res.json({ songs: topSongs });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al obtener top de canciones' });
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

app.put('/admin/users/:userId/username', async (req, res) => {
  try {
    const { userId } = req.params;
    const { requesterId, username } = req.body;

    const nextUsername = String(username || '').trim();
    if (!requesterId || !nextUsername) {
      return res.status(400).json({ error: 'Faltan datos para actualizar usuario' });
    }

    const requester = await User.findById(requesterId).select('role');
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({ error: 'Solo admins pueden cambiar nombres de usuario' });
    }

    const targetUser = await User.findById(userId).select('_id username role profilePic');
    if (!targetUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const exists = await User.findOne({
      _id: { $ne: userId },
      username: { $regex: `^${nextUsername}$`, $options: 'i' },
    }).select('_id');
    if (exists) {
      return res.status(400).json({ error: 'Ese nombre de usuario ya está en uso' });
    }

    targetUser.username = nextUsername;
    await targetUser.save();

    await Song.updateMany(
      { 'collaborators.userId': targetUser._id },
      { $set: { 'collaborators.$[elem].name': targetUser.username } },
      { arrayFilters: [{ 'elem.userId': targetUser._id }] }
    );

    return res.json({
      message: 'Nombre de usuario actualizado',
      user: {
        _id: targetUser._id,
        username: targetUser.username,
        role: targetUser.role,
        profilePic: targetUser.profilePic,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al cambiar nombre de usuario' });
  }
});

app.put('/admin/users/:userId/password', async (req, res) => {
  try {
    const { userId } = req.params;
    const { requesterId, newPassword } = req.body;

    if (!requesterId || !newPassword) {
      return res.status(400).json({ error: 'Faltan datos para restablecer contraseña' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const requester = await User.findById(requesterId).select('_id role');
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({ error: 'Solo admins pueden restablecer contraseñas' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    targetUser.password = await bcrypt.hash(String(newPassword), 10);
    await targetUser.save();

    return res.json({ message: 'Contraseña restablecida' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al restablecer contraseña' });
  }
});

app.delete('/admin/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { requesterId } = req.body;

    if (!requesterId) {
      return res.status(400).json({ error: 'Falta requesterId' });
    }

    const requester = await User.findById(requesterId).select('_id role');
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({ error: 'Solo admins pueden eliminar cuentas' });
    }

    if (String(requester._id) === String(userId)) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta admin desde este panel' });
    }

    const targetUser = await User.findById(userId).select('_id');
    if (!targetUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const userSongs = await Song.find({ artist: userId }).select('_id');
    const songIds = userSongs.map((song) => song._id);

    if (songIds.length > 0) {
      await Playlist.updateMany({}, { $pull: { songs: { $in: songIds } } });
      await Song.deleteMany({ _id: { $in: songIds } });
    }

    await Album.deleteMany({ artist: userId });
    await Playlist.deleteMany({ creator: userId });
    await User.findByIdAndDelete(userId);

    return res.json({
      message: 'Cuenta eliminada',
      deletedUserId: userId,
      deletedSongIds: songIds,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al eliminar cuenta' });
  }
});

// ============ ALBUMS ============

// GET all albums
app.get('/albums', async (req, res) => {
  try {
    const albums = await Album.find()
      .populate('artist', 'username profilePic role')
      .populate('songs', 'title artist coverUrl audioUrl');
    return res.json(albums);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al obtener álbumes' });
  }
});

// GET albums by artist
app.get('/albums/artist/:artistId', async (req, res) => {
  try {
    const { artistId } = req.params;
    const albums = await Album.find({ artist: artistId })
      .populate('artist', 'username profilePic role')
      .populate('songs', 'title artist coverUrl audioUrl');
    return res.json(albums);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al obtener álbumes' });
  }
});

// CREATE album (artist)
app.post('/albums', async (req, res) => {
  try {
    const { title, description, coverUrl, releaseYear, themeGradient, songIds, artistId, userId } = req.body;

    if (!title || !userId) {
      return res.status(400).json({ error: 'Título y userId son requeridos' });
    }

    const user = await User.findById(userId).select('_id role');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (user.role !== 'artist' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo artistas y admins pueden crear álbumes' });
    }

    const targetArtistId = (user.role === 'admin' && artistId) ? artistId : userId;
    const targetArtist = await User.findById(targetArtistId).select('_id role');
    if (!targetArtist) {
      return res.status(404).json({ error: 'Artista no encontrado' });
    }

    if (targetArtist.role !== 'artist' && targetArtist.role !== 'admin') {
      return res.status(400).json({ error: 'El usuario seleccionado no tiene rol de artista' });
    }

    const sanitizedSongIds = Array.isArray(songIds) ? songIds : [];
    if (sanitizedSongIds.length > 0) {
      const songsCount = await Song.countDocuments({
        _id: { $in: sanitizedSongIds },
        artist: targetArtistId,
      });
      if (songsCount !== sanitizedSongIds.length) {
        return res.status(400).json({ error: 'Solo puedes agregar canciones del artista seleccionado' });
      }
    }

    const album = new Album({
      title,
      description: description || '',
      coverUrl: coverUrl || '',
      releaseYear: Number(releaseYear) || new Date().getFullYear(),
      themeGradient: String(themeGradient || ''),
      artist: targetArtistId,
      songs: sanitizedSongIds,
    });

    await album.save();
    await album.populate('artist', 'username profilePic role');

    return res.status(201).json({ album });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al crear álbum' });
  }
});

// UPDATE album
app.put('/albums/:albumId', async (req, res) => {
  try {
    const { albumId } = req.params;
    const { title, description, coverUrl, songIds, releaseYear, themeGradient, artistId, userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId es requerido' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const album = await Album.findById(albumId);
    if (!album) {
      return res.status(404).json({ error: 'Álbum no encontrado' });
    }

    if (String(album.artist) !== String(userId) && user.role !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso para editar este álbum' });
    }

    let targetArtistId = String(album.artist);
    if (artistId !== undefined) {
      if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Solo admins pueden cambiar el artista del álbum' });
      }

      const nextArtist = await User.findById(artistId).select('_id role');
      if (!nextArtist) {
        return res.status(404).json({ error: 'Artista no encontrado' });
      }

      if (nextArtist.role !== 'artist' && nextArtist.role !== 'admin') {
        return res.status(400).json({ error: 'El usuario seleccionado no tiene rol de artista' });
      }

      album.artist = artistId;
      targetArtistId = String(artistId);
    }

    if (title) album.title = title;
    if (description !== undefined) album.description = description;
    if (coverUrl !== undefined) album.coverUrl = coverUrl;
    if (releaseYear !== undefined) album.releaseYear = Number(releaseYear) || album.releaseYear;
    if (themeGradient !== undefined) album.themeGradient = String(themeGradient || '');
    if (Array.isArray(songIds)) {
      if (songIds.length > 0) {
        const songsCount = await Song.countDocuments({
          _id: { $in: songIds },
          artist: targetArtistId,
        });
        if (songsCount !== songIds.length) {
          return res.status(400).json({ error: 'Solo puedes agregar canciones del artista seleccionado' });
        }
      }
      album.songs = songIds;
    }

    await album.save();
    await album.populate('artist', 'username profilePic role');
    await album.populate('songs', 'title artist coverUrl audioUrl');

    return res.json({ album });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al actualizar álbum' });
  }
});

// DELETE album
app.delete('/albums/:albumId', async (req, res) => {
  try {
    const { albumId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId es requerido' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const album = await Album.findById(albumId);
    if (!album) {
      return res.status(404).json({ error: 'Álbum no encontrado' });
    }

    if (String(album.artist) !== String(userId) && user.role !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este álbum' });
    }

    await Album.findByIdAndDelete(albumId);

    return res.json({ message: 'Álbum eliminado' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al eliminar álbum' });
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