const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    coverUrl: {
      type: String,
      default: '',
    },
    songs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Song',
      },
    ],
    releaseDate: {
      type: Date,
      default: Date.now,
    },
    releaseYear: {
      type: Number,
      min: 1900,
      max: 3000,
      default: () => new Date().getFullYear(),
    },
    themeGradient: {
      type: String,
      default: '',
    },
    // Campos para programación de publicación
    isScheduled: { type: Boolean, default: false },
    scheduledPublishAt: { type: Date, default: null },
    isPublished: { type: Boolean, default: true },
    publishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Album', albumSchema);
