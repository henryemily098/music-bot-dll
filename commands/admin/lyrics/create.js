const fs = require("fs");
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");
const {
    default: scdl
} = require("soundcloud-downloader");

/**
 * 
 * @param {import("discord.js").CommandInteraction} interaction 
 */
module.exports.run = async(interaction) => {
    let createLyrics = interaction.client.createLyrics.get(`${interaction.guildId}-${interaction.user.id}`);
    if(createLyrics) {
        try {
            let channel = interaction.client.channels.cache.get(createLyrics.message.channelId);
            let message = await channel.messages.fetch(createLyrics.message.id);
            if(message) await message.delete();
        } catch (error) {
            console.log(error);
        }
        interaction.client.createLyrics.delete(`${interaction.guildId}-${interaction.user.id}`);
    }

    let value = interaction.options.getString("url", true);
    let url = value.split(" ")[0];
    if(!scdl.isValidUrl(url)) {
        try {
            await interaction.reply({
                content: "The URL you given it's not valid.",
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.log(error);
        }
        return;
    }

    let song = null;
    try {
        song = await scdl.getInfo(url);
    } catch (error) {
        console.log(error);
    }
    if(!song) {
        try {
            await interaction.reply({
                content: "Something wrong when trying fetch the information of the song.",
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.log(error);
        }
        return;
    }

    const files = fs.readFileSync("./sources/lyrics.json", "utf8");
    const lyrics = JSON.parse(files);
    if(lyrics[song.title.toLowerCase().split(" ").join("-")]) {
        try {
            await interaction.reply({
                content: "The lyrics has already been made!",
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.log(error);
        }
        return;
    }

    let embed = new EmbedBuilder()
        .setColor("Blue")
        .setDescription(`**Create Lyrics For:** ${song.title}`);
    let row = new ActionRowBuilder()
        .setComponents([
            new ButtonBuilder()
                .setCustomId("lyrics-add")
                .setEmoji("📝")
                .setLabel("Add")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId("lyrics-remove")
                .setEmoji("❌")
                .setLabel("Remove")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId("lyrics-view")
                .setEmoji("👁")
                .setLabel("View")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId("lyrics-save")
                .setEmoji("📥")
                .setLabel("Save")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId("lyrics-cancel")
                .setEmoji("🗑")
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Secondary)
        ]);
    try {
        let response = await interaction.reply({
            embeds: [embed],
            components: [row],
            withResponse: true,
        });
        let data = {
            song,
            lyrics: [],
            removed: null,
            message: {
                id: response.resource.message.id,
                channelId: interaction.channelId
            }
        }
        interaction.client.createLyrics.set(`${interaction.guildId}-${interaction.user.id}`, data);
    } catch (error) {
        console.log(error);
    }
}

module.exports.data = {
    name: "create",
    description: "Create new lyrics.",
    options: [
        {
            name: "url",
            description: "Url of the song (soundcloud only)",
            type: 3,
            required: true
        }
    ]
}