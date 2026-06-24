const { Events } = require('discord.js');
const Giveaway = require('../models/Giveaway');

module.exports = {
  name: Events.MessageReactionRemove,
  async execute(reaction, user) {
    if (user.bot) return;

    if (reaction.emoji.name !== '🎉') return;

    const giveaway = await Giveaway.findOne({
      messageId: reaction.message.id,
      ended: false,
    });

    if (!giveaway) return;

    giveaway.participants = giveaway.participants.filter(id => id !== user.id);
    await giveaway.save();
  },
};
