const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['user', 'artist', 'admin'], 
        default: 'user' 
    },
    // Sistema de verificación
    isArtistRequestPending: { type: Boolean, default: false },

    // PERFIL MUSICAL (Lo que me pediste)
    bio: { 
        type: String, 
        default: '¡Bienvenido a mi perfil de RTN!' 
    },
    instagramHandle: {
        type: String,
        default: ''
    },
    instagramLinked: {
        type: Boolean,
        default: false
    },
    instagramUserId: {
        type: String,
        default: ''
    },
    instagramAccessToken: {
        type: String,
        default: ''
    },
    instagramTokenExpiresAt: {
        type: Date,
        default: null
    },
    instagramLastSyncedAt: {
        type: Date,
        default: null
    },
    instagramPosts: [{
        type: String,
        default: ''
    }],
    instagramFeed: [{
        igMediaId: { type: String, default: '' },
        caption: { type: String, default: '' },
        mediaType: { type: String, default: '' },
        mediaUrl: { type: String, default: '' },
        thumbnailUrl: { type: String, default: '' },
        permalink: { type: String, default: '' },
        timestamp: { type: Date, default: null }
    }],
    profilePic: { 
        type: String, 
        default: '' // Aquí guardaremos la URL de la imagen de Cloudinary
    },
    
    // PLAYLISTS (Referencia a los IDs de las playlists que cree el usuario)
    playlists: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Playlist' 
    }],
    likedSongs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Song'
    }],
    likedAlbums: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Album'
    }],
    likedPlaylists: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Playlist'
    }],
    listeningHistory: [{
        song: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Song',
            required: true
        },
        lastPositionSeconds: {
            type: Number,
            default: 0
        },
        durationSeconds: {
            type: Number,
            default: 0
        },
        totalListenedSeconds: {
            type: Number,
            default: 0
        },
        completedCount: {
            type: Number,
            default: 0
        },
        lastPlayedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

// Corregido el error de escritura al final
module.exports = mongoose.model('User', UserSchema);