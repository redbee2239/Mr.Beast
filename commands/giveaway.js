const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Giveaway = require('../models/Giveaway');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Quản lý giveaway')
    .setDefaultMemberPermissions(0x20)
    .addSubcommand(sub =>
      sub.setName('create').setDescription('Tạo giveaway mới')
        .addStringOption(opt => opt.setName('prize').setDescription('Phần thưởng').setRequired(true))
        .addIntegerOption(opt => opt.setName('winners').setDescription('Số người thắng').setRequired(true).setMinValue(1))
        .addIntegerOption(opt => opt.setName('duration').setDescription('Thời gian (phút)').setRequired(true).setMinValue(1))
        .addStringOption(opt => opt.setName('description').setDescription('Mô tả thêm').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('end').setDescription('Kết thúc giveaway sớm')
        .addStringOption(opt => opt.setName('message_id').setDescription('ID tin nhắn giveaway').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('pause').setDescription('Tạm dừng giveaway')
        .addStringOption(opt => opt.setName('message_id').setDescription('ID tin nhắn giveaway').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('resume').setDescription('Tiếp tục giveaway')
        .addStringOption(opt => opt.setName('message_id').setDescription('ID tin nhắn giveaway').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('list').setDescription('Xem các giveaway')
    )
    .addSubcommand(sub =>
      sub.setName('delete').setDescription('Xoá giveaway theo số thứ tự')
        .addIntegerOption(opt => opt.setName('stt').setDescription('Số thứ tự từ lệnh /giveaway list').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('clear').setDescription('Xoá tất cả giveaway đã kết thúc')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      const prize = interaction.options.getString('prize');
      const winnersCount = interaction.options.getInteger('winners');
      const duration = interaction.options.getInteger('duration');
      const description = interaction.options.getString('description') || '';
      const endTime = new Date(Date.now() + duration * 60 * 1000);

      const embed = new EmbedBuilder()
        .setTitle('🎉 GIVEAWAY 🎉')
        .setDescription(`**Phần thưởng:** ${prize}\n${description ? `**Mô tả:** ${description}\n` : ''}**Số người thắng:** ${winnersCount}\n**Kết thúc:** <t:${Math.floor(endTime.getTime() / 1000)}:R>\n\nReact với 🎉 để tham gia!`)
        .setColor(0x5865f2)
        .setFooter({ text: `Tạo bởi ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      const message = await interaction.fetchReply();
      await message.react('🎉');

      await Giveaway.create({
        messageId: message.id,
        channelId: message.channel.id,
        guildId: message.guild.id,
        hostId: interaction.user.id,
        prize,
        description,
        winnersCount,
        endTime,
      });

      setTimeout(async () => {
        const giveaway = await Giveaway.findOne({ messageId: message.id, ended: false });
        if (!giveaway || giveaway.ended) return;
        await endGiveaway(giveaway, message);
      }, duration * 60 * 1000);

    } else if (sub === 'end') {
      const messageId = interaction.options.getString('message_id');
      const giveaway = await Giveaway.findOne({ messageId, ended: false });
      if (!giveaway) return interaction.reply({ content: 'Không tìm thấy giveaway hoặc đã kết thúc!', ephemeral: true });

      const message = await interaction.channel.messages.fetch(messageId).catch(() => null);
      if (!message) return interaction.reply({ content: 'Không tìm thấy tin nhắn giveaway!', ephemeral: true });

      await endGiveaway(giveaway, message);
      await interaction.reply({ content: 'Đã kết thúc giveaway!', ephemeral: true });

    } else if (sub === 'pause') {
      const messageId = interaction.options.getString('message_id');
      const giveaway = await Giveaway.findOne({ messageId, ended: false });
      if (!giveaway) return interaction.reply({ content: 'Không tìm thấy giveaway hoặc đã kết thúc!', ephemeral: true });
      if (giveaway.paused) return interaction.reply({ content: 'Giveaway đã bị tạm dừng!', ephemeral: true });

      giveaway.paused = true;
      await giveaway.save();

      const message = await interaction.channel.messages.fetch(messageId).catch(() => null);
      if (message) {
        const embed = new EmbedBuilder()
          .setTitle('⏸️ GIVEAWAY TẠM DỪNG ⏸️')
          .setDescription(`**Phần thưởng:** ${giveaway.prize}\n\n giveaway đang bị tạm dừng`)
          .setColor(0xfee75c)
          .setTimestamp();
        await message.edit({ embeds: [embed] });
      }

      await interaction.reply({ content: 'Đã tạm dừng giveaway!', ephemeral: true });

    } else if (sub === 'resume') {
      const messageId = interaction.options.getString('message_id');
      const giveaway = await Giveaway.findOne({ messageId, ended: false });
      if (!giveaway) return interaction.reply({ content: 'Không tìm thấy giveaway hoặc đã kết thúc!', ephemeral: true });
      if (!giveaway.paused) return interaction.reply({ content: 'Giveaway không bị tạm dừng!', ephemeral: true });

      giveaway.paused = false;
      await giveaway.save();

      const message = await interaction.channel.messages.fetch(messageId).catch(() => null);
      if (message) {
        const remaining = Math.floor((giveaway.endTime.getTime() - Date.now()) / 1000);
        const embed = new EmbedBuilder()
          .setTitle('🎉 GIVEAWAY 🎉')
          .setDescription(`**Phần thưởng:** ${giveaway.prize}\n${giveaway.description ? `**Mô tả:** ${giveaway.description}\n` : ''}**Số người thắng:** ${giveaway.winnersCount}\n**Kết thúc:** <t:${Math.floor(giveaway.endTime.getTime() / 1000)}:R>\n\nReact với 🎉 để tham gia!`)
          .setColor(0x57f287)
          .setFooter({ text: `Tạo bởi ${interaction.user.tag}` })
          .setTimestamp();
        await message.edit({ embeds: [embed] });
      }

      await interaction.reply({ content: 'Đã tiếp tục giveaway!', ephemeral: true });

    } else if (sub === 'list') {
      const giveaways = await Giveaway.find();
      if (giveaways.length === 0) {
        return interaction.reply({ content: 'Không có giveaway nào!', ephemeral: true });
      }

      const list = giveaways.map((g, i) => {
        const status = g.ended ? '❌ Đã kết thúc' : g.paused ? '⏸️ Tạm dừng' : '✅ Đang chạy';
        const timeLeft = g.ended ? 0 : Math.max(0, Math.floor((g.endTime.getTime() - Date.now()) / 1000));
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        return `${i + 1}. **${g.prize}** - ${status} - ${g.ended ? '' : `Còn ${minutes}m ${seconds}s - `}Participants: ${g.participants.length}`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setTitle('📋 DANH SÁCH GIVEAWAY')
        .setDescription(list)
        .setColor(0x5865f2)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } else if (sub === 'delete') {
      const stt = interaction.options.getInteger('stt');
      const giveaways = await Giveaway.find();
      if (stt < 1 || stt > giveaways.length) {
        return interaction.reply({ content: `Số thứ tự không hợp lệ! Chỉ có ${giveaways.length} giveaway.`, ephemeral: true });
      }

      const giveaway = giveaways[stt - 1];
      const message = await interaction.channel.messages.fetch(giveaway.messageId).catch(() => null);
      if (message) await message.delete().catch(() => null);

      await Giveaway.deleteOne({ _id: giveaway._id });
      await interaction.reply({ content: `Đã xoá giveaway **${giveaway.prize}**!`, ephemeral: true });

    } else if (sub === 'clear') {
      const result = await Giveaway.deleteMany({ ended: true });
      await interaction.reply({ content: `Đã xoá ${result.deletedCount} giveaway đã kết thúc!`, ephemeral: true });
    }
  },
};

async function endGiveaway(giveaway, message) {
  giveaway.ended = true;

  if (giveaway.participants.length === 0) {
    giveaway.winners = [];
    await giveaway.save();

    const embed = new EmbedBuilder()
      .setTitle('🎉 GIVEAWAY KẾT THÚC 🎉')
      .setDescription(`**Phần thưởng:** ${giveaway.prize}\n\nKhông có ai tham gia!`)
      .setColor(0xed4245)
      .setTimestamp();

    await message.edit({ embeds: [embed] });
    return;
  }

  const shuffled = [...giveaway.participants].sort(() => 0.5 - Math.random());
  const selectedWinners = shuffled.slice(0, giveaway.winnersCount);
  giveaway.winners = selectedWinners;
  await giveaway.save();

  const winnerMentions = selectedWinners.map(id => `<@${id}>`).join(', ');
  const embed = new EmbedBuilder()
    .setTitle('🎉 GIVEAWAY KẾT THÚC 🎉')
    .setDescription(`**Phần thưởng:** ${giveaway.prize}\n\n**Người thắng:** ${winnerMentions}`)
    .setColor(0x57f287)
    .setTimestamp();

  await message.edit({ embeds: [embed] });
  await message.reply(`Chúc mừng ${winnerMentions}! Bạn đã thắng **${giveaway.prize}**! 🎉`);
}
