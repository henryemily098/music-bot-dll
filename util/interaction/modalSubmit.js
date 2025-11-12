const fs = require("fs");
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");

const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
const onlyNumber = /^\d+$/;

/**
 * 
 * @param {import("discord.js").ModalSubmitInteraction} interaction
 */
module.exports = async(interaction) => {
    let [f, c] = interaction.customId.split("-");
    if(f.toLowerCase() === "lyrics") {
        let createLyrics = interaction.client.createLyrics.get(`${interaction.guildId}-${interaction.user.id}`);
        if(c.toLowerCase() === "add") {
            if(!createLyrics) {
                try {
                    await interaction.message.delete();
                } catch (error) {
                    console.log(error);
                }
                return;
            }
            let lyricsText = interaction.fields.getTextInputValue("lyrics-text");
            let lyricsTimestamp = interaction.fields.getTextInputValue("lyrics-timestamp");

            let timestamp = 0;
            let invalidFormat = false;
            if(lyricsTimestamp) {
                if(onlyNumber.test(lyricsTimestamp)) timestamp = parseInt(lyricsTimestamp);
                else if(timeRegex.test(lyricsTimestamp)) {
                    let parts = lyricsTimestamp.split(":");
                    if(parts.length === 3) timestamp += parseInt(parts[0])*3600 + parseInt(parts[1])*60 + parseInt(parts[2]);
                    if(parts.length === 2) timestamp += parseInt(parts[0])*60 + parseInt(parts[1]);
                }
                else invalidFormat = true;
            }

            if(invalidFormat) {
                try {
                    await interaction.reply({
                        content: "You input the wrong time's format!",
                        flags: MessageFlags.Ephemeral
                    });
                } catch (error) {
                    console.log(error);
                }
                return;
            }

            createLyrics.lyrics.push({
                start_at: timestamp,
                text: lyricsText
            });
            createLyrics.lyrics = createLyrics.lyrics.sort((a, b) => a.start_at - b.start_at);

            try {
                await interaction.reply({
                    content: "Successfully added new line to the lyrics!",
                    flags: MessageFlags.Ephemeral
                });
            } catch (error) {
                console.log(error);
            }
        }

        if(c.toLowerCase() === "select") {
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
            const file = fs.readFileSync("./sources/lyrics.json", "utf8");
            const lyrics = JSON.parse(file);

            let selection = interaction.fields.getStringSelectValues("lyrics-select");
            let embed = new EmbedBuilder()
                .setColor("Blue")
                .setDescription(`**Create Lyrics For:** ${selection[0].split("-").join(" ")}`);
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
                    components: [row],
                    embeds: [embed],
                    withResponse: true
                });
                let data = {
                    song: {
                        title: selection[0].split("-").join(" ")
                    },
                    lyrics: lyrics[selection[0]],
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

        if(c.toLowerCase() === "delete") {
            let selection = interaction.fields.getStringSelectValues("lyrics-delete");
            const file = fs.readFileSync("./sources/lyrics.json", "utf8");
            let lyrics = JSON.parse(file);
            
            delete lyrics[selection[0]];
            fs.writeFileSync("./sources/lyrics.json", JSON.stringify(lyrics, null, 2), "utf8");

            try {
                let embed = new EmbedBuilder()
                    .setColor("Blue")
                    .setDescription(`Successfully delete: ${selection[0].split("-").join(" ")}`);
                await interaction.reply({
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral
                });
            } catch (error) {
                console.log(error);
            }
        }
    }
}