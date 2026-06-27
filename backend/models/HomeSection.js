const mongoose = require('mongoose');

const HomeSectionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  subtitle: { type: String, default: '' },
  type: {
    type: String,
    enum: ['playlists', 'songs', 'albums', 'artists'],
    default: 'playlists',
  },
  layout: {
    type: String,
    enum: ['grid', 'carousel'],
    default: 'carousel',
  },
  playlistIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Playlist' }],
  songIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }],
  albumIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Album' }],
  artistIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('HomeSection', HomeSectionSchema);
