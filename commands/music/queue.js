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
    content += `Current DJ: ${queue.dj ? `${queue.dj.username}` : "None"}\n`;
    content += `Current Song: ${queue.currentSong ? queue.currentSong.info.title : "Unknown"}\n\n`;
    content += list.splice(0, 5).map((song, index) => {
        if(queue.currentSong && queue.currentSong === song) `${index+1}). ${song.title} - [${song.requestedBy.username}] ⬅️`;
        else return `${index+1}). ${song.title} - [${song.requestedBy.username}]`
    }).join("\n") + "\n\n";
    content += "\n";
    content += `Page: 1/${Math.ceil(queue.songs.length / 5)}\n`;
    content += "```";

    let row = new ActionRowBuilder()
        .setComponents([
            new ButtonBuilder()
                .setCustomId("queue-left")
                .setEmoji("⬅️")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId("queue-right")
                .setEmoji("➡️")
                .setStyle(ButtonStyle.Primary)
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