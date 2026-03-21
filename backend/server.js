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

const IG_APP_ID = process.env.INSTAGRAM_APP_ID || '';
const IG_APP_SECRET = process.env.INSTAGRAM_APP_SECRET || '';
const IG_REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || '';
const IG_SCOPES = 'user_profile,user_media';
const IG_SYNC_INTERVAL_MS = Number(process.env.IG_SYNC_INTERVAL_MS || 5 * 60 * 1000);
const FRONTEND_APP_URL = (process.env.FRONTEND_APP_URL || '').replace(/\/$/, '');

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const getRequestOrigin = (req) => {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwardedProto || req.protocol || 'https';
  const host = req.get('host');
  return `${proto}://${host}`;
};

const toAbsoluteUrl = (req, rawUrl = '') => {
  const value = String(rawUrl || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  const origin = getRequestOrigin(req);
  if (value.startsWith('/')) return `${origin}${value}`;
  return `${origin}/${value}`;
};

const resolveAppBaseUrl = (req) => {
  const candidate = String(req.query.app || '').trim().replace(/\/$/, '');
  if (/^https?:\/\//i.test(candidate)) return candidate;
  if (candidate.startsWith('http://localhost') || candidate.startsWith('https://localhost')) return candidate;
  if (FRONTEND_APP_URL) return FRONTEND_APP_URL;
  return '';
};

const renderSharePreviewHtml = ({ title, description, imageUrl, canonicalUrl, redirectUrl, ogType = 'website' }) => {
  const safeTitle = escapeHtml(title || 'RTN Music');
  const safeDescription = escapeHtml(description || 'Escucha este contenido en RTN Music');
  const safeImage = escapeHtml(imageUrl || '');
  const safeCanonical = escapeHtml(canonicalUrl || '');
  const safeRedirect = escapeHtml(redirectUrl || '');

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDescription}" />
    <meta property="og:site_name" content="RTN Music" />
    <meta property="og:type" content="${escapeHtml(ogType)}" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDescription}" />
    <meta property="og:url" content="${safeCanonical}" />
    ${safeImage ? `<meta property="og:image" content="${safeImage}" />` : ''}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />
    ${safeImage ? `<meta name="twitter:image" content="${safeImage}" />` : ''}
    ${safeRedirect ? `<meta http-equiv="refresh" content="0;url=${safeRedirect}" />` : ''}
    <style>
      body { margin: 0; background: #080808; color: #fff; font-family: Segoe UI, Arial, sans-serif; display: grid; place-items: center; min-height: 100vh; }
      .card { width: min(92vw, 480px); border: 1px solid #222; border-radius: 18px; overflow: hidden; background: #111; }
      .cover { aspect-ratio: 1.8 / 1; background: #222 center/cover no-repeat; }
      .content { padding: 16px; }
      .title { font-size: 20px; font-weight: 800; margin: 0 0 8px; }
      .desc { color: #aaa; margin: 0 0 14px; }
      .btn { display: inline-block; text-decoration: none; color: #080808; background: #facc15; font-weight: 700; padding: 10px 14px; border-radius: 10px; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="cover" style="background-image: url('${safeImage}');"></div>
      <div class="content">
        <p class="title">${safeTitle}</p>
        <p class="desc">${safeDescription}</p>
        ${safeRedirect ? `<a class="btn" href="${safeRedirect}">Abrir en RTN Music</a>` : ''}
      </div>
    </div>
    ${safeRedirect ? `<script>window.location.replace(${JSON.stringify(redirectUrl)});</script>` : ''}
  </body>
</html>`;
};

const shouldSyncInstagram = (userDoc, maxAgeMs = 5 * 60 * 1000) => {
  if (!userDoc?.instagramLinked || !userDoc?.instagramAccessToken) return false;
  if (!userDoc.instagramLastSyncedAt) return true;
  return (Date.now() - new Date(userDoc.instagramLastSyncedAt).getTime()) > maxAgeMs;
};

const fetchInstagramLongLivedToken = async (shortLivedToken) => {
  const params = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: IG_APP_SECRET,
    access_token: shortLivedToken,
  });

  const response = await fetch(`https://graph.instagram.com/access_token?${params.toString()}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(data.error?.message || 'No se pudo obtener token largo de Instagram');
  }
  return data;
};

const refreshInstagramLongLivedToken = async (token) => {
  const params = new URLSearchParams({
    grant_type: 'ig_refresh_token',
    access_token: token,
  });
  const response = await fetch(`https://graph.instagram.com/refresh_access_token?${params.toString()}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(data.error?.message || 'No se pudo refrescar token de Instagram');
  }
  return data;
};

const fetchInstagramProfile = async (token) => {
  const params = new URLSearchParams({
    fields: 'id,username',
    access_token: token,
  });
  const response = await fetch(`https://graph.instagram.com/me?${params.toString()}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.id) {
    throw new Error(data.error?.message || 'No se pudo obtener perfil de Instagram');
  }
  return data;
};

const fetchInstagramMedia = async (token) => {
  const params = new URLSearchParams({
    fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp',
    access_token: token,
    limit: '9',
  });
  const response = await fetch(`https://graph.instagram.com/me/media?${params.toString()}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || 'No se pudo obtener publicaciones de Instagram');
  }

  const media = Array.isArray(data.data) ? data.data : [];
  return media.map((item) => ({
    igMediaId: String(item.id || ''),
    caption: String(item.caption || ''),
    mediaType: String(item.media_type || ''),
    mediaUrl: String(item.media_url || ''),
    thumbnailUrl: String(item.thumbnail_url || ''),
    permalink: String(item.permalink || ''),
    timestamp: item.timestamp ? new Date(item.timestamp) : null,
  }));
};

const syncInstagramForUser = async (userDoc, { force = false } = {}) => {
  if (!userDoc?.instagramLinked || !userDoc?.instagramAccessToken) return userDoc;
  if (!force && !shouldSyncInstagram(userDoc)) return userDoc;

  try {
    if (userDoc.instagramTokenExpiresAt) {
      const msToExpire = new Date(userDoc.instagramTokenExpiresAt).getTime() - Date.now();
      if (msToExpire < 7 * 24 * 60 * 60 * 1000) {
        const refreshed = await refreshInstagramLongLivedToken(userDoc.instagramAccessToken);
        userDoc.instagramAccessToken = refreshed.access_token;
        userDoc.instagramTokenExpiresAt = new Date(Date.now() + Number(refreshed.expires_in || 0) * 1000);
      }
    }

    const profile = await fetchInstagramProfile(userDoc.instagramAccessToken);
    const media = await fetchInstagramMedia(userDoc.instagramAccessToken);

    userDoc.instagramLinked = true;
    userDoc.instagramUserId = String(profile.id || userDoc.instagramUserId || '');
    userDoc.instagramHandle = String(profile.username || userDoc.instagramHandle || '');
    userDoc.instagramFeed = media;
    userDoc.instagramPosts = media.map((item) => item.permalink).filter(Boolean).slice(0, 3);
    userDoc.instagramLastSyncedAt = new Date();
    await userDoc.save();
    return userDoc;
  } catch (error) {
    console.error('Instagram sync error:', error.message);
    return userDoc;
  }
};

const runInstagramAutoSync = async () => {
  try {
    const users = await User.find({ instagramLinked: true, instagramAccessToken: { $ne: '' } }).limit(200);
    for (const user of users) {
      // eslint-disable-next-line no-await-in-loop
      await syncInstagramForUser(user);
    }
  } catch (error) {
    console.error('Instagram auto-sync error:', error.message);
  }
};

app.get('/share/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const appBaseUrl = resolveAppBaseUrl(req);
    const canonicalUrl = `${getRequestOrigin(req)}${req.originalUrl}`;

    if (type === 'song') {
      const song = await Song.findById(id)
        .populate('artist', 'username _id')
        .populate('collaborators.userId', 'username _id');
      if (!song) {
        return res.status(404).send('Cancion no encontrada');
      }

      const collaborators = (song.collaborators || [])
        .map((collaborator) => collaborator?.userId?.username || collaborator?.name)
        .filter(Boolean)
        .slice(0, 4);

      const artistLabel = song.artist?.username || 'Artista';
      const contributors = collaborators.length ? `${artistLabel}, ${collaborators.join(', ')}` : artistLabel;
      const redirectUrl = appBaseUrl ? `${appBaseUrl}?song=${song._id}` : '';
      const html = renderSharePreviewHtml({
        title: `${song.title} - RTN Music`,
        description: `Por ${contributors}`,
        imageUrl: toAbsoluteUrl(req, song.coverUrl),
        canonicalUrl,
        redirectUrl,
        ogType: 'music.song',
      });

      return res.status(200).type('html').send(html);
    }

    if (type === 'album') {
      const album = await Album.findById(id)
        .populate('artist', 'username _id')
        .populate('songs', 'title coverUrl');
      if (!album) {
        return res.status(404).send('Album no encontrado');
      }

      const redirectUrl = appBaseUrl ? `${appBaseUrl}?album=${album._id}` : '';
      const html = renderSharePreviewHtml({
        title: `${album.title} - Album en RTN Music`,
        description: `${album.artist?.username || 'Artista'} • ${album.songs?.length || 0} canciones`,
        imageUrl: toAbsoluteUrl(req, album.coverUrl || album.songs?.[0]?.coverUrl),
        canonicalUrl,
        redirectUrl,
        ogType: 'music.album',
      });

      return res.status(200).type('html').send(html);
    }

    if (type === 'playlist') {
      const playlist = await Playlist.findById(id)
        .populate('creator', 'username _id')
        .populate({ path: 'songs', select: 'coverUrl title' });
      if (!playlist) {
        return res.status(404).send('Playlist no encontrada');
      }

      const redirectUrl = appBaseUrl ? `${appBaseUrl}?playlist=${playlist._id}` : '';
      const html = renderSharePreviewHtml({
        title: `${playlist.name} - Playlist en RTN Music`,
        description: `${playlist.creator?.username || 'RTN Music'} • ${playlist.songs?.length || 0} canciones`,
        imageUrl: toAbsoluteUrl(req, playlist.coverUrl || playlist.songs?.[0]?.coverUrl),
        canonicalUrl,
        redirectUrl,
        ogType: 'music.playlist',
      });

      return res.status(200).type('html').send(html);
    }

    return res.status(400).send('Tipo de contenido no soportado');
  } catch (error) {
    console.error(error);
    return res.status(500).send('Error al generar vista previa de enlace');
  }
});

const orderByIds = (items, orderedIds) => {
  const byId = new Map(items.map((item) => [String(item._id), item]));
  return orderedIds
    .map((id) => byId.get(String(id)))
    .filter(Boolean);
};

const buildUserLibraryPayload = async (userId) => {
  const user = await User.findById(userId)
    .select('likedSongs likedAlbums likedPlaylists listeningHistory');

  if (!user) return null;

  const likedSongIds = (user.likedSongs || []).map((id) => String(id));
  const likedAlbumIds = (user.likedAlbums || []).map((id) => String(id));
  const likedPlaylistIds = (user.likedPlaylists || []).map((id) => String(id));

  const likedSongsRaw = likedSongIds.length
    ? await Song.find({ _id: { $in: likedSongIds } })
      .populate('artist', 'username _id profilePic bio')
      .populate('collaborators.userId', 'username _id')
    : [];

  const likedAlbumsRaw = likedAlbumIds.length
    ? await Album.find({ _id: { $in: likedAlbumIds } })
      .populate('artist', 'username _id profilePic bio')
      .populate({
        path: 'songs',
        select: 'title artist coverUrl audioUrl collaborators',
        populate: [
          { path: 'artist', select: 'username _id profilePic role' },
          { path: 'collaborators.userId', select: 'username _id' },
        ],
      })
    : [];

  const likedPlaylistsRaw = likedPlaylistIds.length
    ? await Playlist.find({ _id: { $in: likedPlaylistIds } })
      .populate('creator', 'username _id profilePic')
      .populate({
        path: 'songs',
        populate: [
          { path: 'artist', select: 'username _id profilePic' },
          { path: 'collaborators.userId', select: 'username _id' },
        ],
      })
    : [];

  const historySorted = [...(user.listeningHistory || [])]
    .sort((a, b) => new Date(b.lastPlayedAt || 0).getTime() - new Date(a.lastPlayedAt || 0).getTime())
    .slice(0, 20);

  const historySongIds = historySorted
    .map((item) => item.song)
    .filter(Boolean)
    .map((id) => String(id));

  const historySongsRaw = historySongIds.length
    ? await Song.find({ _id: { $in: historySongIds } })
      .populate('artist', 'username _id profilePic bio')
      .populate('collaborators.userId', 'username _id')
    : [];
  const historySongsById = new Map(historySongsRaw.map((song) => [String(song._id), song]));

  const continueListening = historySorted
    .map((entry) => {
      const song = historySongsById.get(String(entry.song));
      if (!song) return null;
      const durationSeconds = Math.max(0, Math.floor(Number(entry.durationSeconds || 0)));
      const positionSeconds = Math.max(0, Math.floor(Number(entry.lastPositionSeconds || 0)));
      const progressPercent = durationSeconds > 0
        ? Math.min(100, Math.round((positionSeconds / durationSeconds) * 100))
        : 0;
      return {
        song,
        positionSeconds,
        durationSeconds,
        totalListenedSeconds: Math.max(0, Math.floor(Number(entry.totalListenedSeconds || 0))),
        completedCount: Math.max(0, Math.floor(Number(entry.completedCount || 0))),
        progressPercent,
        lastPlayedAt: entry.lastPlayedAt || null,
      };
    })
    .filter(Boolean);

  return {
    likedSongIds,
    likedAlbumIds,
    likedPlaylistIds,
    favorites: {
      songs: orderByIds(likedSongsRaw, likedSongIds),
      albums: orderByIds(likedAlbumsRaw, likedAlbumIds),
      playlists: orderByIds(likedPlaylistsRaw, likedPlaylistIds),
    },
    continueListening,
  };
};

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

const parseArrayField = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }
  return [];
};

const parseBooleanField = (value, defaultValue = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1') return true;
    if (lower === 'false' || lower === '0') return false;
  }
  return defaultValue;
};

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
        instagramLinked: Boolean(user.instagramLinked),
        instagramHandle: user.instagramHandle,
        instagramPosts: user.instagramPosts || [],
        instagramFeed: user.instagramFeed || [],
        instagramLastSyncedAt: user.instagramLastSyncedAt || null,
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
      .populate('artist', 'username _id profilePic role')
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
      .populate('artist', 'username _id profilePic role')
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
        populate: [
          { path: 'artist', select: 'username _id profilePic' },
          { path: 'collaborators.userId', select: 'username _id' },
        ],
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
      .populate({
        path: 'songs',
        populate: [
          { path: 'artist', select: 'username _id profilePic' },
          { path: 'collaborators.userId', select: 'username _id' },
        ],
      })
      .sort({ createdAt: -1 });

    return res.json(playlists);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al obtener tus playlists' });
  }
});

app.post('/my-playlists', (req, res) => {
  upload.single('cover')(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(500).json({ error: `Error al subir portada: ${uploadErr.message || 'fallo de Cloudinary'}` });
    }

    try {
      const { userId, name, description, coverUrl, isPublic } = req.body;
      const songIds = parseArrayField(req.body.songIds);
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
        coverUrl: req.file?.path || coverUrl || '',
        creator: userId,
        songs: songIds,
        isDefault: false,
        isPublic: parseBooleanField(isPublic, true),
      });

      await playlist.save();
      const populatedPlaylist = await Playlist.findById(playlist._id)
        .populate('creator', 'username _id')
        .populate({
          path: 'songs',
          populate: [
            { path: 'artist', select: 'username _id profilePic' },
            { path: 'collaborators.userId', select: 'username _id' },
          ],
        });

      return res.status(201).json({ message: 'Playlist creada', playlist: populatedPlaylist });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error al crear tu playlist' });
    }
  });
});

app.put('/my-playlists/:playlistId', (req, res) => {
  upload.single('cover')(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(500).json({ error: `Error al subir portada: ${uploadErr.message || 'fallo de Cloudinary'}` });
    }

    try {
      const { playlistId } = req.params;
      const { userId, name, description, coverUrl, isPublic } = req.body;
      const songIds = parseArrayField(req.body.songIds);
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
      if (req.file?.path) playlist.coverUrl = req.file.path;
      else if (typeof coverUrl === 'string') playlist.coverUrl = coverUrl;
      if (songIds.length > 0 || req.body.songIds !== undefined) playlist.songs = songIds;
      if (isPublic !== undefined) playlist.isPublic = parseBooleanField(isPublic, playlist.isPublic);
      playlist.isDefault = false;

      await playlist.save();
      const populatedPlaylist = await Playlist.findById(playlist._id)
        .populate('creator', 'username _id')
        .populate({
          path: 'songs',
          populate: [
            { path: 'artist', select: 'username _id profilePic' },
            { path: 'collaborators.userId', select: 'username _id' },
          ],
        });

      return res.json({ message: 'Playlist actualizada', playlist: populatedPlaylist });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error al actualizar tu playlist' });
    }
  });
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
      .populate({
        path: 'songs',
        populate: [
          { path: 'artist', select: 'username _id profilePic' },
          { path: 'collaborators.userId', select: 'username _id' },
        ],
      });

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
      .populate({
        path: 'songs',
        populate: [
          { path: 'artist', select: 'username _id profilePic' },
          { path: 'collaborators.userId', select: 'username _id' },
        ],
      });

    return res.json({ message: 'Canción eliminada de playlist', playlist: populatedPlaylist });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al quitar canción de playlist' });
  }
});

app.post('/admin/playlists', (req, res) => {
  upload.single('cover')(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(500).json({ error: `Error al subir portada: ${uploadErr.message || 'fallo de Cloudinary'}` });
    }

    try {
      const { requesterId, name, description, coverUrl, isDefault } = req.body;
      const songIds = parseArrayField(req.body.songIds);
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
        coverUrl: req.file?.path || coverUrl || '',
        creator: requesterId,
        songs: songIds,
        isDefault: parseBooleanField(isDefault, false),
        isPublic: true,
      });

      await playlist.save();
      const populatedPlaylist = await Playlist.findById(playlist._id)
        .populate('creator', 'username _id')
        .populate({
          path: 'songs',
          populate: [
            { path: 'artist', select: 'username _id profilePic' },
            { path: 'collaborators.userId', select: 'username _id' },
          ],
        });

      return res.status(201).json({ message: 'Playlist creada', playlist: populatedPlaylist });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error al crear playlist' });
    }
  });
});

app.put('/admin/playlists/:playlistId', (req, res) => {
  upload.single('cover')(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(500).json({ error: `Error al subir portada: ${uploadErr.message || 'fallo de Cloudinary'}` });
    }

    try {
      const { playlistId } = req.params;
      const { requesterId, name, description, coverUrl, isDefault } = req.body;
      const songIds = parseArrayField(req.body.songIds);

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
      if (req.file?.path) playlist.coverUrl = req.file.path;
      else if (typeof coverUrl === 'string') playlist.coverUrl = coverUrl;
      if (songIds.length > 0 || req.body.songIds !== undefined) playlist.songs = songIds;
      if (isDefault !== undefined) playlist.isDefault = parseBooleanField(isDefault, playlist.isDefault);

      await playlist.save();
      const populatedPlaylist = await Playlist.findById(playlist._id)
        .populate('creator', 'username _id')
        .populate({
          path: 'songs',
          populate: [
            { path: 'artist', select: 'username _id profilePic' },
            { path: 'collaborators.userId', select: 'username _id' },
          ],
        });

      return res.json({ message: 'Playlist actualizada', playlist: populatedPlaylist });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error al actualizar playlist' });
    }
  });
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
        .populate({
          path: 'songs',
          select: 'title artist coverUrl audioUrl collaborators',
          populate: [
            { path: 'artist', select: 'username _id profilePic role' },
            { path: 'collaborators.userId', select: 'username _id' },
          ],
        })
        .sort({ releaseDate: -1 })
        .limit(20)
      : [];

    return res.json({ artists, songs, albums });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al buscar contenido' });
  }
});

app.get('/discovery-feed', async (req, res) => {
  try {
    const userId = req.query.userId;
    const requesterId = req.query.requesterId || userId;
    if (!userId || !requesterId) {
      return res.status(400).json({ error: 'Faltan userId/requesterId' });
    }

    const requester = await User.findById(requesterId).select('_id role');
    if (!requester) {
      return res.status(404).json({ error: 'Requester no encontrado' });
    }

    if (String(requester._id) !== String(userId) && requester.role !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso para ver este feed' });
    }

    const user = await User.findById(userId)
      .select('likedSongs likedAlbums likedPlaylists listeningHistory');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const likedSongIds = (user.likedSongs || []).map((id) => String(id));
    const likedAlbumIds = (user.likedAlbums || []).map((id) => String(id));

    const likedSongs = likedSongIds.length
      ? await Song.find({ _id: { $in: likedSongIds } }).select('_id artist')
      : [];
    const likedAlbums = likedAlbumIds.length
      ? await Album.find({ _id: { $in: likedAlbumIds } }).select('_id artist')
      : [];

    const historySongIds = (user.listeningHistory || [])
      .map((entry) => String(entry.song || ''))
      .filter(Boolean);
    const historySongs = historySongIds.length
      ? await Song.find({ _id: { $in: historySongIds } }).select('_id artist')
      : [];

    const preferredArtistIds = Array.from(new Set([
      ...likedSongs.map((song) => String(song.artist)),
      ...likedAlbums.map((album) => String(album.artist)),
      ...historySongs.map((song) => String(song.artist)),
    ].filter(Boolean)));

    let forYouSongs = [];
    if (preferredArtistIds.length) {
      forYouSongs = await Song.find({
        artist: { $in: preferredArtistIds },
      })
        .populate('artist', 'username _id profilePic bio')
        .populate('collaborators.userId', 'username _id')
        .sort({ listenSeconds: -1, playCount: -1, createdAt: -1 })
        .limit(20);
    }

    if (forYouSongs.length < 10) {
      const excludeIds = new Set(forYouSongs.map((song) => String(song._id)));
      const fallbackSongs = await Song.find()
        .populate('artist', 'username _id profilePic bio')
        .populate('collaborators.userId', 'username _id')
        .sort({ createdAt: -1 })
        .limit(40);
      fallbackSongs.forEach((song) => {
        if (forYouSongs.length >= 10) return;
        const songId = String(song._id);
        if (excludeIds.has(songId)) return;
        excludeIds.add(songId);
        forYouSongs.push(song);
      });
    }

    const trendingSongs = await Song.find()
      .populate('artist', 'username _id profilePic bio')
      .populate('collaborators.userId', 'username _id')
      .sort({ listenSeconds: -1, playCount: -1, createdAt: -1 })
      .limit(10);

    const freshAlbums = await Album.find()
      .populate('artist', 'username _id profilePic bio')
      .populate({
        path: 'songs',
        select: 'title artist coverUrl audioUrl collaborators',
        populate: [
          { path: 'artist', select: 'username _id profilePic role' },
          { path: 'collaborators.userId', select: 'username _id' },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(8);

    const discoveryPlaylists = await Playlist.find({ isPublic: true })
      .populate('creator', 'username _id profilePic')
      .populate({
        path: 'songs',
        populate: [
          { path: 'artist', select: 'username _id profilePic' },
          { path: 'collaborators.userId', select: 'username _id' },
        ],
      })
      .sort({ isDefault: -1, createdAt: -1 })
      .limit(8);

    return res.json({
      forYouSongs: forYouSongs.slice(0, 10),
      trendingSongs,
      freshAlbums,
      playlists: discoveryPlaylists,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al obtener discovery feed' });
  }
});

app.get('/artists/:artistId', async (req, res) => {
  try {
    const { artistId } = req.params;
    const artist = await User.findById(artistId).select('_id username role bio profilePic instagramLinked instagramHandle instagramPosts instagramFeed instagramLastSyncedAt instagramAccessToken');

    if (!artist) {
      return res.status(404).json({ error: 'Artista no encontrado' });
    }

    if (artist.instagramLinked && artist.instagramAccessToken && shouldSyncInstagram(artist, 2 * 60 * 1000)) {
      await syncInstagramForUser(artist, { force: true });
    }

    const songs = await Song.find({ artist: artistId })
      .populate('artist', 'username _id profilePic bio')
      .populate('collaborators.userId', 'username _id')
      .sort({ createdAt: -1 });

    const albums = await Album.find({ artist: artistId })
      .populate('artist', 'username _id profilePic bio')
      .populate({
        path: 'songs',
        select: 'title artist coverUrl audioUrl collaborators',
        populate: [
          { path: 'artist', select: 'username _id profilePic role' },
          { path: 'collaborators.userId', select: 'username _id' },
        ],
      })
      .sort({ releaseDate: -1 });

    const artistSafe = {
      _id: artist._id,
      username: artist.username,
      role: artist.role,
      bio: artist.bio,
      profilePic: artist.profilePic,
      instagramLinked: Boolean(artist.instagramLinked),
      instagramHandle: artist.instagramHandle || '',
      instagramPosts: artist.instagramPosts || [],
      instagramFeed: artist.instagramFeed || [],
      instagramLastSyncedAt: artist.instagramLastSyncedAt || null,
    };

    return res.json({ artist: artistSafe, songs, albums });
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
      const { bio, instagramHandle, instagramPosts } = req.body;
      const instagramPostPattern = /^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+/i;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      if (typeof bio === 'string') {
        user.bio = bio;
      }

      if (typeof instagramHandle === 'string') {
        user.instagramHandle = instagramHandle.trim().replace(/^@+/, '');
      }

      if (typeof instagramPosts === 'string') {
        user.instagramPosts = instagramPosts
          .split('\n')
          .map((item) => item.trim())
          .map((item) => item.replace(/\/?$/, '/'))
          .filter((item) => instagramPostPattern.test(item))
          .filter(Boolean)
          .slice(0, 3);
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
          instagramLinked: Boolean(user.instagramLinked),
          instagramHandle: user.instagramHandle,
          instagramPosts: user.instagramPosts || [],
          instagramFeed: user.instagramFeed || [],
          instagramLastSyncedAt: user.instagramLastSyncedAt || null,
          profilePic: user.profilePic,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error al actualizar perfil' });
    }
  });
});

app.get('/users/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('_id username role bio profilePic instagramLinked instagramHandle instagramPosts instagramFeed instagramLastSyncedAt');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json({
      user: {
        _id: user._id,
        username: user.username,
        role: user.role,
        bio: user.bio,
        profilePic: user.profilePic,
        instagramLinked: Boolean(user.instagramLinked),
        instagramHandle: user.instagramHandle || '',
        instagramPosts: user.instagramPosts || [],
        instagramFeed: user.instagramFeed || [],
        instagramLastSyncedAt: user.instagramLastSyncedAt || null,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

app.get('/users/:userId/library', async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.query.requesterId;
    if (!requesterId) {
      return res.status(400).json({ error: 'Falta requesterId' });
    }

    const requester = await User.findById(requesterId).select('_id role');
    if (!requester) {
      return res.status(404).json({ error: 'Requester no encontrado' });
    }

    if (String(requester._id) !== String(userId) && requester.role !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso para ver esta biblioteca' });
    }

    const payload = await buildUserLibraryPayload(userId);
    if (!payload) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json(payload);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al obtener biblioteca' });
  }
});

app.post('/users/:userId/likes/toggle', async (req, res) => {
  try {
    const { userId } = req.params;
    const { requesterId, type, itemId } = req.body;
    if (!requesterId || !type || !itemId) {
      return res.status(400).json({ error: 'Faltan requesterId, type o itemId' });
    }

    const requester = await User.findById(requesterId).select('_id role');
    if (!requester) {
      return res.status(404).json({ error: 'Requester no encontrado' });
    }

    if (String(requester._id) !== String(userId) && requester.role !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso para editar esta biblioteca' });
    }

    const typeConfig = {
      song: { key: 'likedSongs', model: Song },
      album: { key: 'likedAlbums', model: Album },
      playlist: { key: 'likedPlaylists', model: Playlist },
    };
    const config = typeConfig[String(type || '').toLowerCase()];
    if (!config) {
      return res.status(400).json({ error: 'type inválido (song|album|playlist)' });
    }

    const targetExists = await config.model.findById(itemId).select('_id');
    if (!targetExists) {
      return res.status(404).json({ error: 'Elemento no encontrado' });
    }

    const user = await User.findById(userId).select('_id likedSongs likedAlbums likedPlaylists');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const currentIds = (user[config.key] || []).map((id) => String(id));
    const targetId = String(itemId);
    const existingIndex = currentIds.findIndex((id) => id === targetId);
    let liked = false;

    if (existingIndex >= 0) {
      currentIds.splice(existingIndex, 1);
    } else {
      currentIds.unshift(targetId);
      liked = true;
    }

    user[config.key] = currentIds;
    await user.save();

    return res.json({
      ok: true,
      type: String(type || '').toLowerCase(),
      itemId: targetId,
      liked,
      ids: currentIds,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al actualizar favoritos' });
  }
});

app.post('/users/:userId/listening-history', async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      requesterId,
      songId,
      positionSeconds,
      durationSeconds,
      incrementSeconds,
      completed,
    } = req.body;

    if (!requesterId || !songId) {
      return res.status(400).json({ error: 'Faltan requesterId o songId' });
    }

    const requester = await User.findById(requesterId).select('_id role');
    if (!requester) {
      return res.status(404).json({ error: 'Requester no encontrado' });
    }

    if (String(requester._id) !== String(userId) && requester.role !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso para actualizar este historial' });
    }

    const song = await Song.findById(songId).select('_id');
    if (!song) {
      return res.status(404).json({ error: 'Canción no encontrada' });
    }

    const user = await User.findById(userId).select('_id listeningHistory');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const safePosition = Math.max(0, Math.floor(Number(positionSeconds || 0)));
    const safeDuration = Math.max(0, Math.floor(Number(durationSeconds || 0)));
    const safeIncrement = Math.min(120, Math.max(0, Math.floor(Number(incrementSeconds || 0))));
    const isCompleted = Boolean(completed);

    const history = [...(user.listeningHistory || [])];
    const existingIndex = history.findIndex((entry) => String(entry.song) === String(songId));

    if (existingIndex >= 0) {
      const entry = history[existingIndex];
      if (safeDuration > 0) entry.durationSeconds = safeDuration;
      if (safeIncrement > 0) entry.totalListenedSeconds = Math.max(0, Number(entry.totalListenedSeconds || 0) + safeIncrement);
      if (isCompleted) {
        entry.completedCount = Math.max(0, Number(entry.completedCount || 0) + 1);
        entry.lastPositionSeconds = 0;
      } else {
        entry.lastPositionSeconds = safePosition;
      }
      entry.lastPlayedAt = new Date();
      history[existingIndex] = entry;
    } else {
      history.push({
        song: songId,
        lastPositionSeconds: isCompleted ? 0 : safePosition,
        durationSeconds: safeDuration,
        totalListenedSeconds: safeIncrement,
        completedCount: isCompleted ? 1 : 0,
        lastPlayedAt: new Date(),
      });
    }

    history.sort((a, b) => new Date(b.lastPlayedAt || 0).getTime() - new Date(a.lastPlayedAt || 0).getTime());
    user.listeningHistory = history.slice(0, 60);
    await user.save();

    return res.json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al actualizar historial de escucha' });
  }
});

app.get('/users/:userId/instagram/connect-url', async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.query.requesterId;

    if (!IG_APP_ID || !IG_APP_SECRET || !IG_REDIRECT_URI) {
      return res.status(500).json({ error: 'Instagram no está configurado en el servidor' });
    }

    if (!requesterId) {
      return res.status(400).json({ error: 'Falta requesterId' });
    }

    const requester = await User.findById(requesterId).select('_id role');
    if (!requester) {
      return res.status(404).json({ error: 'Requester no encontrado' });
    }

    if (String(requester._id) !== String(userId) && requester.role !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso para vincular este Instagram' });
    }

    const state = jwt.sign(
      { type: 'instagram-connect', userId },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '15m' }
    );

    const params = new URLSearchParams({
      client_id: IG_APP_ID,
      redirect_uri: IG_REDIRECT_URI,
      scope: IG_SCOPES,
      response_type: 'code',
      state,
    });

    return res.json({ url: `https://api.instagram.com/oauth/authorize?${params.toString()}` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al iniciar vinculación con Instagram' });
  }
});

app.get('/auth/instagram/callback', async (req, res) => {
  const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
  try {
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');
    if (!code || !state) {
      return res.redirect(`${frontendBase}?view=ajustes&ig=error`);
    }

    const decoded = jwt.verify(state, process.env.JWT_SECRET || 'dev-secret');
    if (decoded?.type !== 'instagram-connect' || !decoded?.userId) {
      return res.redirect(`${frontendBase}?view=ajustes&ig=error`);
    }

    const tokenPayload = new URLSearchParams({
      client_id: IG_APP_ID,
      client_secret: IG_APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: IG_REDIRECT_URI,
      code,
    });

    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenPayload,
    });
    const shortTokenData = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !shortTokenData.access_token) {
      return res.redirect(`${frontendBase}?view=ajustes&ig=error`);
    }

    const longTokenData = await fetchInstagramLongLivedToken(shortTokenData.access_token);
    const profile = await fetchInstagramProfile(longTokenData.access_token);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.redirect(`${frontendBase}?view=ajustes&ig=error`);
    }

    user.instagramLinked = true;
    user.instagramUserId = String(profile.id || shortTokenData.user_id || '');
    user.instagramHandle = String(profile.username || user.instagramHandle || '');
    user.instagramAccessToken = longTokenData.access_token;
    user.instagramTokenExpiresAt = new Date(Date.now() + Number(longTokenData.expires_in || 0) * 1000);
    await user.save();

    await syncInstagramForUser(user, { force: true });
    return res.redirect(`${frontendBase}?view=ajustes&ig=connected`);
  } catch (error) {
    console.error('Instagram callback error:', error.message);
    return res.redirect(`${frontendBase}?view=ajustes&ig=error`);
  }
});

app.post('/users/:userId/instagram/sync', async (req, res) => {
  try {
    const { userId } = req.params;
    const { requesterId } = req.body;
    if (!requesterId) {
      return res.status(400).json({ error: 'Falta requesterId' });
    }

    const requester = await User.findById(requesterId).select('_id role');
    if (!requester) {
      return res.status(404).json({ error: 'Requester no encontrado' });
    }

    if (String(requester._id) !== String(userId) && requester.role !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso para sincronizar este Instagram' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await syncInstagramForUser(user, { force: true });
    return res.json({
      message: 'Instagram sincronizado',
      user: {
        _id: user._id,
        username: user.username,
        role: user.role,
        bio: user.bio,
        profilePic: user.profilePic,
        instagramLinked: Boolean(user.instagramLinked),
        instagramHandle: user.instagramHandle || '',
        instagramPosts: user.instagramPosts || [],
        instagramFeed: user.instagramFeed || [],
        instagramLastSyncedAt: user.instagramLastSyncedAt || null,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al sincronizar Instagram' });
  }
});

app.post('/users/:userId/instagram/disconnect', async (req, res) => {
  try {
    const { userId } = req.params;
    const { requesterId } = req.body;
    if (!requesterId) {
      return res.status(400).json({ error: 'Falta requesterId' });
    }

    const requester = await User.findById(requesterId).select('_id role');
    if (!requester) {
      return res.status(404).json({ error: 'Requester no encontrado' });
    }

    if (String(requester._id) !== String(userId) && requester.role !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso para desvincular este Instagram' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    user.instagramLinked = false;
    user.instagramUserId = '';
    user.instagramAccessToken = '';
    user.instagramTokenExpiresAt = null;
    user.instagramLastSyncedAt = null;
    user.instagramHandle = '';
    user.instagramPosts = [];
    user.instagramFeed = [];
    await user.save();

    return res.json({ message: 'Instagram desvinculado' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al desvincular Instagram' });
  }
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
      .populate({
        path: 'songs',
        select: 'title artist coverUrl audioUrl collaborators',
        populate: [
          { path: 'artist', select: 'username _id profilePic role' },
          { path: 'collaborators.userId', select: 'username _id' },
        ],
      });
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
      .populate({
        path: 'songs',
        select: 'title artist coverUrl audioUrl collaborators',
        populate: [
          { path: 'artist', select: 'username _id profilePic role' },
          { path: 'collaborators.userId', select: 'username _id' },
        ],
      });
    return res.json(albums);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al obtener álbumes' });
  }
});

// CREATE album (artist)
app.post('/albums', (req, res) => {
  upload.single('cover')(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(500).json({ error: `Error al subir portada: ${uploadErr.message || 'fallo de Cloudinary'}` });
    }

    try {
      const { title, description, coverUrl, releaseYear, themeGradient, artistId, userId } = req.body;
      const songIds = parseArrayField(req.body.songIds);

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

      const sanitizedSongIds = songIds;
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
        coverUrl: req.file?.path || coverUrl || '',
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
});

// UPDATE album
app.put('/albums/:albumId', (req, res) => {
  upload.single('cover')(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(500).json({ error: `Error al subir portada: ${uploadErr.message || 'fallo de Cloudinary'}` });
    }

    try {
      const { albumId } = req.params;
      const { title, description, coverUrl, releaseYear, themeGradient, artistId, userId } = req.body;
      const songIds = parseArrayField(req.body.songIds);

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
      if (req.file?.path) album.coverUrl = req.file.path;
      else if (coverUrl !== undefined) album.coverUrl = coverUrl;
      if (releaseYear !== undefined) album.releaseYear = Number(releaseYear) || album.releaseYear;
      if (themeGradient !== undefined) album.themeGradient = String(themeGradient || '');
      if (songIds.length > 0 || req.body.songIds !== undefined) {
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
      await album.populate({
        path: 'songs',
        select: 'title artist coverUrl audioUrl collaborators',
        populate: [
          { path: 'artist', select: 'username _id profilePic role' },
          { path: 'collaborators.userId', select: 'username _id' },
        ],
      });

      return res.json({ album });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error al actualizar álbum' });
    }
  });
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

setInterval(() => {
  runInstagramAutoSync();
}, IG_SYNC_INTERVAL_MS);

runInstagramAutoSync();

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