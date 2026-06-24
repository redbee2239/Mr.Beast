const { Events } = require('discord.js');

const CHANNEL_ID = process.env.CHANNEL_ID;
const ALLOWED_ROLE_ID = process.env.ALLOWED_ROLE_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot) return;
    if (message.channel.id !== CHANNEL_ID) return;
    if (ALLOWED_ROLE_ID && message.member.roles.cache.has(ALLOWED_ROLE_ID)) return;

    try {
      await message.delete();

      const invite = await message.guild.invites.create(message.channel.id, {
        maxAge: 86400,
        reason: 'Link invite cho nguoi bi kick',
      });

      try {
        await message.member.send(
          'Ban da bi kick do chat vao khu vuc cam.\nVao lai server bang link sau:\n' + invite.url
        );
      } catch {
        console.log('Khong the gui DM cho ' + message.author.tag);
      }

      await message.member.kick('Da gui tin nhan trong khu vuc bi cam');
      console.log('Da kick ' + message.author.tag + ' (ID: ' + message.author.id + ')');

      if (LOG_CHANNEL_ID) {
        try {
          const logChannel = await message.guild.channels.fetch(LOG_CHANNEL_ID);
          if (logChannel) {
            await logChannel.send(
              '🚨 **' + message.author.tag + '** (ID: ' + message.author.id + ') da bi kick vi chat vao khu vuc cam.'
            );
          }
        } catch (e) {
          console.log('Loi gui log: ' + e.message);
        }
      }
    } catch (err) {
      console.log('Loi khi thao tac voi ' + message.author.tag + ': ' + err.message);
    }
  },
};