const {
    ActionRowBuilder,
    EmbedBuilder,
    MessageFlags,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
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
const {
    autoPlayList
} = require("../../sources");

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
    let [f, c] = interaction.customId.split("-");
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
            else return `${viewQueue.star+index+1}). ${song.title} - [${song.requestedBy.username}]`;
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

                let select = new StringSelectMenuBuilder()
                    .setCustomId("guessthesong")
                    .setPlaceholder("Guess The Song!")
                    .setMaxValues(1);
                let options = [];
            
                let i = 1;
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
}