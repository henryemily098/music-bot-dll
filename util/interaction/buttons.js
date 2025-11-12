const fs = require("fs");
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    LabelBuilder,
    MessageFlags,
    ModalBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");
const {
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    getVoiceConnection,
    StreamType
} = require("@discordjs/voice");
const {
    spawn
} = require("child_process");
const {
    default: scdl
} = require("soundcloud-downloader");

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1)); 
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * 
 * @param {import("discord.js").ButtonInteraction} interaction 
 */
module.exports = async(interaction) => {
    let [f, c, l] = interaction.customId.split("-");
    if(f.toLowerCase() === "selectsong") {
        if(!interaction.client.search.has(interaction.user.id+interaction.channelId)) {
            try {
                await interaction.reply({
                    content: "You can't... you just can't...",
                    flags: MessageFlags.Ephemeral
                });
            } catch (error) {
                console.log(error);
            }
            return;
        }
        if(c.toLowerCase() === "cancel") {
            try {
                await interaction.message.delete();
                interaction.client.search.delete(interaction.user.id + interaction.channelId);
            } catch (error) {
                console.log(error);
            }
        }
    }
    if(f.toLowerCase() === "queue") {
        let queue = interaction.client.queue.get(interaction.guildId);
        let viewQueue = interaction.client.viewQueue.get(interaction.user.id+interaction.message.id);
        if(!viewQueue) {
            try {
                await interaction.reply({
                    content: "You have to use `/queue` to view your own queue session.",
                    flags: MessageFlags.Ephemeral
                });
            } catch (error) {
                console.log(error);
            }
            return;
        }
        if(!queue) {
            try {
                let content = "```\n";
                content += `FIRST 5 TRACKS TO BE PLAYED IN ${interaction.guild.name}'s QUEUE\n\n`;
                content += `Total tracks: 0\n`;
                content += `Current DJ: none\n\n`;
                content += "```";
                await interaction.update({
                    components: [],
                    content
                });
            } catch (error) {
                console.log(error);
            }
            return;
        }
        
        if(c.toLowerCase() === "left") {
            viewQueue.end = viewQueue.end == 5 ? Math.ceil(queue.songs.length / 5)*5 : viewQueue.end - 5;
            viewQueue.start = viewQueue.start == 0 ? viewQueue.end - 5 : viewQueue.start - 5;
        }
        else if(c.toLowerCase() === "right") {
            viewQueue.start = viewQueue.end >= queue.songs.length ? 0 : viewQueue.start + 5;
            viewQueue.end = viewQueue.end >= queue.songs.length ? 5 : viewQueue.end + 5;
        }

        let list = queue.songs.toArray();
        let content = "```\n";
        content += `DISPLAY 5 TRACKS TO BE PLAYED IN "${interaction.guild.name.toUpperCase()}" QUEUE\n\n`;
        content += `Total tracks: ${queue.songs.length}\n`;
        content += `Current DJ: ${queue.dj ? `${queue.dj.username}` : "None"}\n`;
        content += `Current Song: ${queue.currentSong ? queue.currentSong.info.title : "Unknown"}\n\n`;
        content += list.splice(0, 5).map((song, index) => {
            if(queue.currentSong && queue.currentSong.info === song) return `${viewQueue.start+index+1}). ${song.title} - [${song.requestedBy.username}] ⬅️`;
            else return `${viewQueue.start+index+1}). ${song.title} - [${song.requestedBy.username}]`;
        }).join("\n") + "\n\n";
        content += `Page: ${viewQueue.end/5}/${Math.ceil(queue.songs.length / 5)}\n`;
        content += "```";
        try {
            await interaction.update({
                content
            });
        } catch (error) {
            console.log(error);
        }
    }
    if(f.toLowerCase() === "guessthesong") {
        let games = interaction.client.guessTheSongs.get(interaction.guildId);
        if(!games) {
            try {
                await interaction.message.delete();
            } catch (error) {
                console.log(error);
            }
            return;
        }
        if(games.userId !== interaction.user.id) {
            try {
                await interaction.reply({
                    content: "There's someone who already playing the 'Guess The Song'.",
                    flags: MessageFlags.Ephemeral
                });
            } catch (error) {
                console.log(error);
            }
            return;
        }

        if(c.toLowerCase() === "cancel") {
            let connection = getVoiceConnection(interaction.guildId);
            if(connection) connection.destroy();
            interaction.client.guessTheSongs.delete(interaction.guildId);

            try {
                await interaction.message.delete();
            } catch (error) {
                console.log(error);
            }
        }
        if(c.toLowerCase() === "ready") {
            /**
             * 
             * @param {string} url 
             */
            const createStream = async(url) => {
                const stream = await scdl.downloadFormat(url, scdl.FORMATS.MP3);
                const song = await scdl.getInfo(url);
                let seconds = Math.floor(song.full_duration / 1000) - 20;
                let start = Math.floor(Math.random()*seconds);

                const ffmpeg = spawn(
                    "ffmpeg",
                    [
                        "-ss", start.toString(),
                        "-t", (15).toString(),
                        "-i", "pipe:0",
                        "-f", "s16le",
                        "-ar", "48000",
                        "-ac", "2",
                        "pipe:1"
                    ],
                    { stdio: ["pipe", "pipe", "inherit"] }
                );
                ffmpeg.stdin.on("error", () => {
                    try {
                        stream.unpipe(ffmpeg.stdin);
                        ffmpeg.stdin.destroy();
                    } catch (err) {
                        console.log("Error cleaning up ffmpeg pipe:", err.message);
                    }
                });
                ffmpeg.stdout.on("error", () => {
                    try {
                        stream.unpipe(ffmpeg.stdin);
                        ffmpeg.stdin.destroy();
                    } catch (err) {
                        console.log("Error cleaning up ffmpeg pipe:", err.message);
                    }
                });
                stream.on("error", (err) => console.log(err));
                stream.once("readable", () => {
                    stream.pipe(ffmpeg.stdin);
                });
                return ffmpeg.stdout;
            }
            const endStream = async() => {
                let msg = null;
                let games = interaction.client.guessTheSongs.get(interaction.guildId);
                try {
                    let channel = interaction.guild.channels.cache.get(games.message.channelId);
                    msg = await channel.messages.fetch(games.message.id);
                } catch (error) {
                    console.log(error);
                }
                if(!msg) return;

                const files = fs.readFileSync("./sources/autoplay-list.json");
                const autoPlayList = JSON.parse(files);

                let i = 1;
                let options = [];
                let select = new StringSelectMenuBuilder()
                    .setCustomId("guessthesong")
                    .setPlaceholder("Guess The Song!")
                    .setMaxValues(1);
                while(i < 5) {
                    try {
                        if(options.length) {
                            let indexSong = Math.floor(Math.random()*autoPlayList.length);
                            if(!options.includes(autoPlayList[indexSong])) {
                                let song = await scdl.getInfo(autoPlayList[indexSong]);
                                options.push(song);
                                i++;
                            }
                        }
                        else {
                            let song = await scdl.getInfo(games.answers[games.indexSong]);
                            options.push(song);
                        }
                    } catch (error) {
                        console.log(error);
                    }
                }

                options = shuffleArray(options);
                games.options = options;
                for(i = 0; i < options.length; i++) {
                    select.addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setDescription(`By ${options[i].user ? options[i].user.username : "Unknown User"}`)
                            .setLabel(`${i+1}). ${options[i].title.length > 60 ? `${options[i].title.substring(0, 57)}...` : options[i].title}`)
                            .setValue(`${i}`)
                    );
                }
                let row = new ActionRowBuilder().setComponents([select]);
                let embed = new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle("What song is this?");
                try {
                    await msg.edit({
                        components: [row],
                        content: null,
                        embeds: [embed]
                    });
                } catch (error) {
                    console.log(error);
                }
            }
            let stream = null;
            try {
                stream = await createStream(games.answers[games.indexSong]);
            } catch (error) {
                console.log(error);
            }
            let connection = getVoiceConnection(interaction.guildId);
            const resource = createAudioResource(stream, { inputType: StreamType.Raw });
            games.player = createAudioPlayer().on(AudioPlayerStatus.Idle, () => endStream());
            connection.subscribe(games.player);
            games.player.play(resource);
            

            try {
                let embed = new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle("<a:Buffering:819771417767051315> Playing 1st song!");
                await interaction.update({
                    components: [],
                    content: null,
                    embeds: [embed]
                });
            } catch (error) {
                console.log(error);
            }
        }
    }
    if(f.toLowerCase() === "lyrics") {
        let createLyrics = interaction.client.createLyrics.get(`${interaction.guildId}-${interaction.user.id}`);
        if(!createLyrics) {
            try {
                await interaction.reply({
                    content: "This message it's not for you.",
                    flags: MessageFlags.Ephemeral
                });
            } catch (error) {
                console.log(error);
            }
            return;
        }

        if(c.toLowerCase() === "save" || c.toLowerCase() === "cancel") {
            try {
                let channel = interaction.client.channels.cache.get(createLyrics.message.channelId);
                let message = await channel.messages.fetch(createLyrics.message.id);
                if(message) await message.delete();
            } catch (error) {
                console.log(error);
            }

            if(c.toLowerCase() === "save") {
                const files = fs.readFileSync("./sources/lyrics.json", "utf8");
                let lyrics = JSON.parse(files);
                lyrics[createLyrics.song.title.toLowerCase().split(" ").join("-")] = createLyrics.lyrics;
                fs.writeFileSync("./sources/lyrics.json", JSON.stringify(lyrics, null, 2), "utf8");
            }

            interaction.client.createLyrics.delete(`${interaction.guildId}-${interaction.user.id}`);
        }

        if(c.toLowerCase() === "add") {
            let modal = new ModalBuilder()
                .setCustomId("lyrics-add")
                .setTitle("New Line of Lyrics");
            let labelText = new LabelBuilder()
                .setLabel("Lyrics Text")
                .setTextInputComponent(
                    new TextInputBuilder()
                        .setCustomId("lyrics-text")
                        .setMaxLength(300)
                        .setMinLength(1)
                        .setPlaceholder("Ex: And we would love you to join us for a bite.")
                        .setRequired(true)
                        .setStyle(TextInputStyle.Paragraph)
                );
            let labelTimestamp = new LabelBuilder()
                .setLabel("Lyrics Timestamp")
                .setTextInputComponent(
                    new TextInputBuilder()
                        .setCustomId("lyrics-timestamp")
                        .setPlaceholder("Format: HH:MM:SS, MM:SS, or just input at which seconds. Invalid format will automatically set to 0.")
                        .setRequired(false)
                        .setStyle(TextInputStyle.Short)
                );
            modal.setLabelComponents([labelText, labelTimestamp]);
            try {
                await interaction.showModal(modal);
            } catch (error) {
                console.log(error);
            }
        }

        if(c.toLowerCase() === "remove") {
            let embed = new EmbedBuilder().setColor("Blue");
            if(interaction.message.id !== createLyrics.message.id) {
                if(l.toLowerCase() === "submit" || l.toLowerCase() === "cancel") {
                    let index = createLyrics.removed.index;
                    createLyrics.removed = null;
                    if(l.toLowerCase() === "submit") {
                        let removed = createLyrics.lyrics.splice(index, 1)[0];
                        embed.setDescription(`**Successfully removed line ${index+1} from lyrics:**\n\`\`\`${removed.text}\`\`\``);
                    }
                    else embed.setDescription("Cancel the removal of the line of the lyrics.");

                    try {
                        await interaction.update({
                            components: [],
                            embeds: [embed]
                        });
                    } catch (error) {
                        console.log(error);
                    }
                }
                else {
                    if(l.toLowerCase() === "left") {
                        if(createLyrics.removed.index === 0) createLyrics.removed.index = createLyrics.lyrics.length-1;
                        else createLyrics.removed.index--;
                    }
                    else if(l.toLowerCase() === "right") {
                        if(createLyrics.removed.index === (createLyrics.lyrics.length-1)) createLyrics.removed.index = 0;
                        else createLyrics.removed.index++;
                    }

                    embed
                        .setAuthor({
                            name: `Line ${createLyrics.removed.index+1}`,
                            iconURL: interaction.client.user.displayAvatarURL({ size: 1024 })
                        })
                        .setDescription(createLyrics.lyrics[createLyrics.removed.index].text);
                    try {
                        await interaction.update({
                            embeds: [embed]
                        });
                    } catch (error) {
                        console.log(error);
                    }
                }
            }
            else {
                try {
                    createLyrics.removed = {
                        index: 0
                    }
                    embed
                        .setAuthor({
                            name: "Line 1",
                            iconURL: interaction.client.user.displayAvatarURL({ size: 1024 })
                        })
                        .setDescription(createLyrics.lyrics[0].text);
                    let row = new ActionRowBuilder()
                        .setComponents([
                            new ButtonBuilder()
                                .setCustomId("lyrics-remove-submit")
                                .setEmoji("🗑")
                                .setLabel("Remove")
                                .setStyle(ButtonStyle.Danger),
                            new ButtonBuilder()
                                .setCustomId("lyrics-remove-cancel")
                                .setEmoji("❌")
                                .setLabel("Cancel")
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId("lyrics-remove-left")
                                .setEmoji("⬅️")
                                .setStyle(ButtonStyle.Primary),
                            new ButtonBuilder()
                                .setCustomId("lyrics-remove-right")
                                .setEmoji("➡️")
                                .setStyle(ButtonStyle.Primary)
                        ]);
                    await interaction.reply({
                        components: [row],
                        embeds: [embed],
                        flags: MessageFlags.Ephemeral
                    });
                } catch (error) {
                    console.log(error);
                }
            }
        }

        if(c.toLowerCase() === "view") {
            if(!createLyrics.lyrics.length) {
                try {
                    await interaction.reply({
                        content: "Create one line first before viewing the lyrics.",
                        flags: MessageFlags.Ephemeral
                    });
                } catch (error) {
                    console.log(error);
                }
                return;
            }

            let embeds = [];
            let j = 0;

            for (let i = 1; i <= Math.ceil(createLyrics.lyrics.length / 10); i++) {
                let description = "";
                while(j < 10*i && createLyrics.lyrics[j]) {
                    description += `**[${interaction.client.convertMStoFormat(createLyrics.lyrics[j].start_at*1000)}]** - ${createLyrics.lyrics[j].text}\n`;
                    j++;
                }
                let embed = new EmbedBuilder()
                    .setColor("Blue")
                    .setDescription(description);
                embeds.push(embed);
            }

            try {
                await interaction.reply({
                    embeds,
                    flags: MessageFlags.Ephemeral
                });
            } catch (error) {
                console.log(error);
            }
        }
    }
}