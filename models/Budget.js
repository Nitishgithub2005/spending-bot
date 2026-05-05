const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  category: { type: String, required: true },
  limit: { type: Number, required: true }
}, { timestamps: true });

budgetSchema.index({ userId: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);