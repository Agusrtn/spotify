const mongoose = require('mongoose');

const PlaylistSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    songs: [{
        title: String,
        artist: String,
        audioUrl: String,
        coverUrl: String
    }],
    isPublic: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Playlist', PlaylistSchema);