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
      const { title, description, lyrics, artistId, uploaderId } = req.body;

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
      });

      await newSong.save();
      const populatedSong = await Song.findById(newSong._id).populate('artist', 'username _id profilePic bio');
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
      return res.json({ artists: [], songs: [], albums: [] });
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

    const albums = await Album.find({
      title: { $regex: query, $options: 'i' },
    })
      .populate('artist', 'username _id profilePic bio')
      .populate('songs', 'title')
      .sort({ releaseDate: -1 })
      .limit(20);

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
      .sort({ createdAt: -1 });

    const albums = await Album.find({ artist: artistId })
      .populate('artist', 'username _id profilePic bio')
      .populate('songs', 'title artist coverUrl')
      .sort({ releaseDate: -1 });

    return res.json({ artist, songs, albums });
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
      .populate('songs', 'title artist coverUrl');
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
      .populate('songs', 'title artist coverUrl');
    return res.json(albums);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al obtener álbumes' });
  }
});

// CREATE album (artist)
app.post('/albums', async (req, res) => {
  try {
    const { title, description, coverUrl, userId } = req.body;

    if (!title || !userId) {
      return res.status(400).json({ error: 'Título y userId son requeridos' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (user.role !== 'artist' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo artistas y admins pueden crear álbumes' });
    }

    const album = new Album({
      title,
      description: description || '',
      coverUrl: coverUrl || '',
      artist: userId,
      songs: [],
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
    const { title, description, coverUrl, songIds, userId } = req.body;

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

    if (title) album.title = title;
    if (description !== undefined) album.description = description;
    if (coverUrl !== undefined) album.coverUrl = coverUrl;
    if (Array.isArray(songIds)) album.songs = songIds;

    await album.save();
    await album.populate('artist', 'username profilePic role');
    await album.populate('songs', 'title artist coverUrl');

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