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

    let direction = interaction.options.getInteger("direction", true);
    queue.direction = direction;

    let embed = new EmbedBuilder()
        .setColor("Blue")
        .setDescription(`Change queue move's direction to: **${queue.direction ? "Forward" : "Backward"}**`);
    try {
        await interaction.reply({
            embeds: [embed]
        });
    } catch (error) {
        console.log(error);
    }
}

module.exports.data = {
    name: "queue-direction",
    description: "Choose which direction will queue move.",
    options: [
        {
            name: "direction",
            description: "Forward or backward",
            type: 4,
            required: true,
            choices: [
                {
                    name: "Forward",
                    value: 1
                },
                {
                    name: "Backward",
                    value: 0
                }
            ]
        }
    ]
}