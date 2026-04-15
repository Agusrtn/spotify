const mongoose = require('mongoose');

const PlaylistSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    coverUrl: { type: String, default: '' },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    songs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Song'
    }],
    isDefault: { type: Boolean, default: false },
    isPublic: { type: Boolean, default: true },
    // Campos para programación de publicación
    isScheduled: { type: Boolean, default: false },
    scheduledPublishAt: { type: Date, default: null },
    isPublished: { type: Boolean, default: true },
    publishedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Playlist', PlaylistSchema);