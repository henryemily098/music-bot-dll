const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");

/**
 * 
 * @param {import("discord.js").CommandInteraction} interaction 
 */
module.exports.run = async(interaction) => {
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

    let list = queue.songs.toArray();
    let content = "```\n";
    content += `FIRST 5 TRACKS TO BE PLAYED IN ${interaction.guild.name}'s QUEUE\n\n`;
    content += `Total tracks: ${queue.songs.length}\n`;
    content += `Current DJ: ${queue.dj ? `${queue.dj.username}` : "None"}\n\n`;
    content += list.map((song, index) => `${index+1}). ${song.title} - [${song.requestedBy.username}]`).join('\n') + "\n\n";
    content += `Page: 1/${Math.ceil(queue.songs.length / 5)}\n`;
    content += "```";

    let row = new ActionRowBuilder()
        .setComponents([
            new ButtonBuilder()
                .setCustomId("queue-left")
                .setEmoji("⬅️")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(queue.songs.length > 5),
            new ButtonBuilder()
                .setCustomId("queue-right")
                .setEmoji("➡️")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(queue.songs.length > 5)
        ]);

    try {
        let message = await interaction.reply({
            components: [row],
            content, 
            withResponse: true
        });
        interaction.client.viewQueue.set(interaction.user.id+message.resource.message.id, {
            start: 0,
            end: 5
        });
    } catch (error) {
        console.log(error);
    }
}

module.exports.data = {
    name: "queue",
    description: "View list song in queue.",
}