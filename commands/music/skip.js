const {
    EmbedBuilder,
    MessageFlags
} = require("discord.js");
const {
    getVoiceConnection
} = require("@discordjs/voice");

/**
 * 
 * @param {import('discord.js').CommandInteraction} interaction 
 */
module.exports.run = async(interaction) => {
    let { channel } = interaction.member.voice;
    let player = interaction.client.players.get(interaction.guildId);
    let connection = getVoiceConnection(interaction.guildId);
    let queue = interaction.client.queue.get(interaction.guildId);
    if(!queue) {
        try {
            await interaction.reply({
                content: "There's no song queue in the server!",
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.log(error);
        }
        return;
    }

    if(!channel || connection.joinConfig.channelId !== channel.id) {
        try {
            await interaction.reply({
                content: `You have to join <#${connection.joinConfig.channelId}> first! `,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.log(error);
        }
        return;
    }

    let embed = new EmbedBuilder().setColor("Blue");
    let members = channel.members.filter(m => !m.user.bot);
    if(interaction.user.id === queue.dj.id) queue.skipVotes.push(...members.map(m => m.id));
    else {
        if(queue.dj.skipVotes.includes(interaction.user.id))
        try {
            embed
                .setAuthor({
                    name: `${interaction.user.username} voted to skip!`,
                    iconURL: interaction.client.user.displayAvatarURL({ size: 1024 })
                })
                .setDescription(`Current votes: ${queue.skipVotes.length}/${members.size}`);
            await interaction.reply({
                embeds: [embed],
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.log(error);
        }
    }

    if(queue.skipVotes.length >= members.size) {
        embed
            .setAuthor({
                name: "Skip current song.",
                iconURL: interaction.client.user.displayAvatarURL({ size: 1024 })
            })
            .setDescription(null);
        try {
            if(interaction.replied) await interaction.channel.send({ embed: [embed] });
            else await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.log(error);
        }
        player.stop();
    }
}

module.exports.data = {
    name: "skip",
    description: "Skip current song",
}