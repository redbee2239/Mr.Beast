const { Events, REST, Routes } = require('discord.js');
const giveawayCommand = require('../commands/giveaway');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Bot đã đăng nhập với tên: ${client.user.tag}`);

    const commands = [giveawayCommand.data.toJSON()];
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
      console.log('Đang đăng ký slash commands...');
      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: commands }
      );
      console.log('Đã đăng ký slash commands thành công!');
    } catch (error) {
      console.error('Lỗi đăng ký slash commands:', error);
    }
  },
};
