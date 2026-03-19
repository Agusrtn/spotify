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
    instagramPosts: [{
        type: String,
        default: ''
    }],
    profilePic: { 
        type: String, 
        default: '' // Aquí guardaremos la URL de la imagen de Cloudinary
    },
    
    // PLAYLISTS (Referencia a los IDs de las playlists que cree el usuario)
    playlists: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Playlist' 
    }]
}, { timestamps: true });

// Corregido el error de escritura al final
module.exports = mongoose.model('User', UserSchema);