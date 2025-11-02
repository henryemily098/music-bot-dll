const {
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
} = require("discord.js");
const {
    createAudioResource,
    getVoiceConnection,
    StreamType
} = require("@discordjs/voice");
const {
    v4
} = require("uuid");
const {
    default: scdl
} = require("soundcloud-downloader");
const {
    spawn
} = require("child_process");
const {
    play
} = require("../../play");
const music = require("../music");

/**
 * 
 * @param {import("discord.js").StringSelectMenuInteraction} interaction 
 */
module.exports = async(interaction) => {
    let [f] = interaction.customId.split("-");
    if(f.toLowerCase() === "selectsong") {
        let songs = interaction.client.search.get(interaction.user.id+interaction.channelId);
        if(!songs) {
            try {
                await interaction.reply({
                    content: "You have to use `/search` to start a search session!",
                    flags: MessageFlags.Ephemeral
                });
            } catch (error) {
                console.log(error);
            }
            return;
        }
        let { channel } = interaction.member.voice;
        let connection = getVoiceConnection(interaction.guildId);
        if(!connection) {
            let params = [];
            let permission = channel.permissionsFor(interaction.client.user);
            if(!permission.has(PermissionFlagsBits.ViewChannel)) params.push("`View Channel`");
            if(!permission.has(PermissionFlagsBits.Connect)) params.push("`Connect`");
            if(!permission.has(PermissionFlagsBits.Speak)) params.push("`Speak`");
    
            if(params.length) {
                try {
                    await interaction.reply({
                        content: `I don't have these permissions: ${params.join(", ")}`,
                        flags: MessageFlags.Ephemeral
                    });
                } catch (error) {
                    console.log(error);
                }
                return;
            }
        }
    
        if(connection && connection.joinConfig.channelId != channel.id) {
            try {
                await interaction.reply({
                    content: `You have to join <#${connection.joinConfig.channelId} first!`,
                    flags: MessageFlags.Ephemeral
                });
            } catch (error) {
                console.log(error);
            }
            return;
        }

        let option = parseInt(interaction.values[0]);
        let serverQueue = interaction.client.queue.get(interaction.guildId);
        let queueConstruct = music.createQueueConstruct(interaction.user);

        let player = interaction.client.players.get(interaction.guildId);
        if(!player) player = music.createPlayer(interaction.guildId, interaction.client);

        songs[option].queue_id = v4();
        songs[option].requestedBy = interaction.user;
        songs[option].textChannel = interaction.channel;
        
        if(serverQueue) serverQueue.songs.insertLast(songs[option]);
        else queueConstruct.songs.insertLast(songs[option]);

        try {
            let embed = new EmbedBuilder()
                .setColor("Blue")
                .setDescription(
                    `Added [${songs[option].title}](${songs[option].permalink_url}) - [<@${songs[option].requestedBy.id}>]`
                );
            await interaction.update({
                components: [],
                content: null,
                embeds: [embed]
            });
        } catch (error) {
            console.log(error);
        }

        queueConstruct.currentSong = queueConstruct.songs.first;
        if(!serverQueue) interaction.client.queue.set(interaction.guildId, queueConstruct);
        if(!serverQueue) {
            try {
                if(!connection) connection = music.createConnection(interaction.client, interaction.guildId, channel.id, interaction.guild.voiceAdapterCreator);
                await play(queueConstruct.songs.getFirst(), interaction.client, interaction.guildId);
            } catch (error) {
                console.log(error);
            }
        }
    }
    if(f.toLowerCase() === "guessthesong") {
        let connection = getVoiceConnection(interaction.guildId);
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

        let option = parseInt(interaction.values[0]);
        games.userAnswers.push(games.options[option]);

        if(games.options[option].permalink_url === games.answers[games.indexSong]) games.correct++;
        else games.wrong++;
        games.indexSong++;
        games.options = [];

        if(games.indexSong === 5) {
            try {
                let embed = new EmbedBuilder()
                    .setColor("Blue")
                    .setAuthor({
                        name: "Your Results!",
                        iconURL: interaction.user.displayAvatarURL({ size: 1024 })
                    })
                    .setDescription(
                        `**Correct Answers:** ${games.correct}/5\n**Wrong Answers:** ${games.wrong}/5`
                    );
                let j, k = 0;
                for (let i = 0; i < games.answers.length; i++) {
                    let song = await scdl.getInfo(games.answers[i]);
                    let userAnswerSong = games.userAnswers[i];
                    let value = `The Answer: *[${song.title.length > 30 ? `${song.title.substring(0, 27)}...` : song.title}](${song.permalink_url})*\n`;
                    value += `Your Answer: *[${userAnswerSong.title.length > 30 ? `${userAnswerSong.title.substring(0, 27)}...` : userAnswerSong.title}](${userAnswerSong.permalink_url})*\n`;
                    embed
                        .addFields(
                            {
                                name: `Answer Number ${i+1}`,
                                value
                            }
                        )
                }
                await interaction.update({
                    components: [],
                    content: null,
                    embeds: [embed]
                })
            } catch (error) {
                console.log(error);
            }
            interaction.client.guessTheSongs.delete(interaction.guildId);
            if(connection) connection.destroy();
        }
        else {
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

            let stream = null;
            try {
                stream = await createStream(games.answers[games.indexSong]);
            } catch (error) {
                console.log(error);
            }
            const resource = createAudioResource(stream, { inputType: StreamType.Raw });
            games.player.play(resource);

            try {
                let txt = "";
                if((games.indexSong+1) === 1) txt += "1st";
                else if((games.indexSong+1) === 2) txt += "2nd";
                else if((games.indexSong+1) === 3) txt += "3rd";
                else txt += `${(games.indexSong+1)}th`;
                let embed = new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle(`<a:Buffering:819771417767051315> Playing ${txt} song!`);
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