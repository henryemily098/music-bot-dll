const {
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js")
const {
    getVoiceConnection
} = require("@discordjs/voice");

/**
 * 
 * @param {import("discord.js").CommandInteraction} interaction 
 */
module.exports.run = async(interaction) => {
    let { channel } = interaction.member.voice;
    let guild = interaction.client.guilds.cache.get(interaction.guildId);
    let queue = interaction.client.queue.get(interaction.guildId);
    let connection = getVoiceConnection(interaction.guildId);
    if(!channel || (connection && connection.joinConfig.channelId != channel.id)) {
        try {
            await interaction.reply({
                content: connection ? `You have to join <#${connection.joinConfig.channelId}> first!` : "I already left voice channel!",
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.log(error);
        }
        return;
    }

    if(queue) {
        let confirm = false;
        let member = guild.members.cache.get(interaction.user.id);
        if(member.user.id === queue.dj?.id) confirm = true;
        if(member.permissions.has(PermissionFlagsBits.Administrator)) confirm = true;
        if(member.permissions.has(PermissionFlagsBits.ManageGuild)) confirm = true;
        if(!confirm) {
            try {
                await interaction.reply({
                    content: `You're not a DJ or missing some permissions!`,
                    flags: MessageFlags.Ephemeral
                });
            } catch (error) {
                console.log(error);
            }
            return;
        }
    }

    connection.destroy();
    try {
        let embed = new EmbedBuilder()
            .setColor("Blue")
            .setDescription(`Disconnect from <#${channel.id}>`);
        await interaction.reply({
            embeds: [embed]
        })
    } catch (error) {
        console.log(error);
    }
}

module.exports.data = {
    name: "disconnect",
    description: "Disconnect from voice channel."
}