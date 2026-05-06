const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId:   { type: Number, required: true, unique: true },
  chatId:   { type: Number, required: true },
  username: String,
  firstName: String,
  joinedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);