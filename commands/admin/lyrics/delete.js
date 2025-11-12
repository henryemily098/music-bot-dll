const fs = require("fs");
const {
    LabelBuilder,
    ModalBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} = require("discord.js");

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

    const files = fs.readFileSync("./sources/lyrics.json", "utf8");
    const lyrics = JSON.parse(files);
    const keys = Object.keys(lyrics);

    let modal = new ModalBuilder()
        .setCustomId("lyrics-delete")
        .setTitle("Select Which Lyrics!");
    let label = new LabelBuilder().setLabel("Select Lyrics");
    let stringSelect = new StringSelectMenuBuilder()
        .setCustomId("lyrics-delete")
        .setMinValues(1)
        .setMaxValues(1)
        .setRequired(true);
    for (let i = 0; i < keys.length; i++) {
        let option = new StringSelectMenuOptionBuilder()
            .setLabel(keys[i].split("-").join(" "))
            .setValue(keys[i]);
        stringSelect.addOptions(option);
    }
    label.setStringSelectMenuComponent(stringSelect);
    modal.setLabelComponents([label]);
    try {
        await interaction.showModal(modal);
    } catch (error) {
        console.log(error);
    }
}

module.exports.data = {
    name: "delete",
    description: "Delete existing lyrics."
}