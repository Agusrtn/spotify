const mongoose = require('mongoose');

const topWeeklyCoverSchema = new mongoose.Schema(
  {
    imageUrl: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TopWeeklyCover', topWeeklyCoverSchema);
