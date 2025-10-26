const {
    getVoiceConnection
} = require("@discordjs/voice");
const {
    EmbedBuilder,
    MessageFlags
} = require("discord.js");

/**
 * 
 * @param {import('discord.js').CommandInteraction} interaction 
 */
module.exports.run = async(interaction) => {
    let { channel } = interaction.member.voice;
    let connection = getVoiceConnection(interaction.guildId);
    let queue = interaction.client.queue.get(interaction.guildId);

    if(!queue) {
        try {
            await interaction.reply({
                content: "There's no queue in the server.",
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.log(error);
        }
        return;
    }

    if(!channel || connection.joinConfig.channelId != channel.id) {
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

    let number = interaction.options.get("queue-number", true).value;
    if(number < 1 || number > queue.songs.length) {
        try {
            await interaction.reply({
                content: `You can only input ${queue.songs.length > 1 ? `number between 1 to ${queue.songs.length}` : "number 1"}.`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.log(error);
        }
        return;
    }

    let removedSong = queue.songs.deleteByIndex(number-1);
    try {
        let embed = new EmbedBuilder()
            .setColor("Blue")
            .setDescription(`Removed [${removedSong.title}](${removedSong.permalink_url}) from queue`);
        await interaction.reply({
            embeds: [embed]
        });
    } catch (error) {
        console.log(error);
    }
}

module.exports.data = {
    name: "remove",
    description: "Remove a song from queue.",
    options: [
        {
            name: "queue-number",
            description: "Select a song with the number.",
            type: 4,
            required: true
        }
    ]
}