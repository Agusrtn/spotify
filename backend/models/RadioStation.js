const mongoose = require('mongoose');

const RadioQueueEntrySchema = new mongoose.Schema({
  song: { type: mongoose.Schema.Types.ObjectId, ref: 'Song', required: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  addedAt: { type: Date, default: Date.now },
}, { _id: true });

const RadioStationSchema = new mongoose.Schema({
  title: { type: String, default: 'RTN Radio' },
  subtitle: { type: String, default: 'En directo desde la crew' },
  isLive: { type: Boolean, default: true },
  autoplay: { type: Boolean, default: true },
  currentSong: { type: mongoose.Schema.Types.ObjectId, ref: 'Song', default: null },
  queue: [RadioQueueEntrySchema],
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

module.exports = mongoose.model('RadioStation', RadioStationSchema);
