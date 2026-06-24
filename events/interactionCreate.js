const { Events } = require('discord.js');
const giveawayCommand = require('../commands/giveaway');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'giveaway') {
      await giveawayCommand.execute(interaction);
    }
  },
};
