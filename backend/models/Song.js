const mongoose = require('mongoose');

const SongSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  lyrics: { type: String, default: '' },
  genre: { type: String, default: 'otro' },
  artist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  audioUrl: { type: String, required: true }, 
  coverUrl: { type: String, default: '' },
  playCount: { type: Number, default: 0 },
  listenSeconds: { type: Number, default: 0 },
  lastPlayedAt: { type: Date },
  collaborators: [{
    name: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  }],
  // Campos para programación de publicación
  isScheduled: { type: Boolean, default: false },
  scheduledPublishAt: { type: Date, default: null },
  isPublished: { type: Boolean, default: true },
  publishedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Song', SongSchema);