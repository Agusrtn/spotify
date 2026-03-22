const mongoose = require('mongoose');

const VideoSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['upload', 'youtube'], required: true },
  videoUrl: { type: String, default: '' },
  youtubeId: { type: String, default: '' },
  thumbnailUrl: { type: String, default: '' },
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  views: { type: Number, default: 0 },
  orientation: { type: String, enum: ['vertical', 'horizontal'], default: 'horizontal' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Video', VideoSchema);
