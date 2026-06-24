const { Events } = require('discord.js');
const Giveaway = require('../models/Giveaway');

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    if (user.bot) return;

    if (reaction.emoji.name !== '🎉') return;

    const giveaway = await Giveaway.findOne({
      messageId: reaction.message.id,
      ended: false,
    });

    if (!giveaway) return;
    if (giveaway.paused) return;

    if (!giveaway.participants.includes(user.id)) {
      giveaway.participants.push(user.id);
      await giveaway.save();
    }
  },
};
