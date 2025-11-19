const {
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");
const {
    getVoiceConnection
} = require("@discordjs/voice");

/**
 * 
 * @param {import("discord.js").CommandInteraction} interaction 
 */
module.exports.run = async(interaction) => {
    let { channel } = interaction.member.voice;
    let player = interaction.client.players.get(interaction.guildId);
    let connection = getVoiceConnection(interaction.guildId);
    let guild = interaction.client.guilds.cache.get(interaction.guildId);
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

    let confirm = false;
    let member = guild.members.cache.get(interaction.user.id);
    if(member.user.id === queue.dj?.id) confirm = true;
    if(member.permissions.has(PermissionFlagsBits.Administrator)) confirm = true;
    if(member.permissions.has(PermissionFlagsBits.ManageGuild)) confirm = true;

    let embed = new EmbedBuilder().setColor("Blue");
    let members = channel.members.filter(m => !m.user.bot);
    if(confirm) queue.prevVotes.push(...members.map(m => m.id));
    else {
        if(queue.dj.prevVotes.includes(interaction.user.id))
        try {
            embed
                .setAuthor({
                    name: `${interaction.user.username} voted to skip!`,
                    iconURL: interaction.client.user.displayAvatarURL({ size: 1024 })
                })
                .setDescription(`Current votes: ${queue.prevVotes.length}/${members.size}`);
            await interaction.reply({
                embeds: [embed],
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.log(error);
        }
    }

    if(queue.prevVotes.length >= members.size) {
        embed
            .setAuthor({
                name: "Skip to previous song.",
                iconURL: interaction.client.user.displayAvatarURL({ size: 1024 })
            })
            .setDescription(null);
        try {
            if(interaction.replied) await interaction.channel.send({ embed: [embed] });
            else await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.log(error);
        }
        
        if(queue.currentSong.info === queue.songs.getFirst()) queue.currentSong = null;
        else queue.currentSong = queue.currentSong.prev.prev;
        player.stop();
    }
}

module.exports.data = {
    name: "previous",
    description: "Skip to previous song."
}