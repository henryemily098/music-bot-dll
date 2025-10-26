const {
    getVoiceConnection
} = require("@discordjs/voice");
const {
    EmbedBuilder,
    MessageFlags
} = require("discord.js");

/**
 * 
 * @param {import("discord.js").CommandInteraction} interaction 
 */
module.exports.run = async(interaction) => {
    let { channel } = interaction.member.voice;
    let connection = getVoiceConnection(interaction.guildId);
    let queue = interaction.client.queue.get(interaction.guildId);
    if(!queue) {
        try {
            await interaction.reply({
                content: "There's no queue in the server!",
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.log(error);
        }
        return;
    }

    if(!channel || channel.id != connection.joinConfig.channelId) {
        try {
            await interaction.reply({
                content: `You have to join <#${connection.joinConfig.channelId}> first!`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.log(error);
        }
        return;
    }

    queue.loop = !queue.loop;
    try {
        let embed = new EmbedBuilder()
            .setColor("Blue")
            .setDescription(`Loop it's now ${queue.loop ? "**on**" : "**off**"}.`);
        await interaction.reply({
            embeds: [embed]
        });
    } catch (error) {
        console.log(error);
    }
}
module.exports.data = {
    name: "loop",
    description: "Loop the queue."
}