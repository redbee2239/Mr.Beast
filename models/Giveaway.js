const mongoose = require('mongoose');

const giveawaySchema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true },
  channelId: { type: String, required: true },
  guildId: { type: String, required: true },
  hostId: { type: String, required: true },
  prize: { type: String, required: true },
  description: { type: String, default: '' },
  winnersCount: { type: Number, required: true, min: 1 },
  endTime: { type: Date, required: true },
  participants: [{ type: String }],
  paused: { type: Boolean, default: false },
  ended: { type: Boolean, default: false },
  winners: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('Giveaway', giveawaySchema);
