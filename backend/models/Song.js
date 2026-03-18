const mongoose = require('mongoose');

const SongSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  lyrics: { type: String, default: '' },
  artist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  audioUrl: { type: String, required: true }, 
  coverUrl: { type: String, default: '' },
  playCount: { type: Number, default: 0 },
  listenSeconds: { type: Number, default: 0 },
  lastPlayedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Song', SongSchema);