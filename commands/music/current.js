const {
    EmbedBuilder,
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

    let currentSong = queue.songs.getFirst();
    let embed = new EmbedBuilder()
        .setColor("Blue")
        .setAuthor({
            name: "Now Playing",
            iconURL: interaction.client.user.displayAvatarURL({ size: 1024 })
        })
        .setFields([
            {
                name: "Song Title",
                value: `[${currentSong.title}](${currentSong.permalink_url})`,
                inline: true
            },
            {
                name: "Artist",
                value: (currentSong.user && currentSong.user.username) || "Unknown",
                inline: true
            },
            {
                name: "Duration",
                value: interaction.client.convertMStoFormat(currentSong.duration),
                inline: true
            }
        ])
        .setThumbnail(
            currentSong.artwork_url
        )
        .setFooter({
            text: `Requested by ${currentSong.requestedBy.username}`,
        });
    try {
        await interaction.reply({
            embeds: [embed]
        });
    } catch (error) {
        console.log(error);
    }
}

module.exports.data = {
    name: "current",
    description: "Display current song."
}