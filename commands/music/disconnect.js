const {
    EmbedBuilder,
    MessageFlags
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
    let player = interaction.client.players.get(interaction.guildId);
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