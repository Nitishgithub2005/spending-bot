// models/Expense.js
const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  userId: { type: Number, required: true, index: true },
  username: String,
  item: { type: String, required: true },
  amount: { type: Number, required: true },
  category: {
    type: String,
    enum: ['food', 'transport', 'shopping', 'bills', 'others'],
    default: 'others'
  },
  date: { type: Date, default: Date.now },
  // Normalized date (YYYY-MM-DD in IST) for day-level grouping
  dateKey: { type: String, index: true } // e.g. "2025-05-04"
}, { timestamps: true });

// Compound index for fast per-user daily/monthly queries
expenseSchema.index({ userId: 1, dateKey: 1 });
expenseSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('Expense', expenseSchema);