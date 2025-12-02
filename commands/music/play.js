const {
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");
const {
    getVoiceConnection,
} = require("@discordjs/voice");
const {
    v4
} = require("uuid");
const {
    music
} = require("../../util");
const {
    play
} = require("../../play");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch").default;
const scdl = require("soundcloud-downloader").default;
const youtubedl = require("yt-dlp-exec").exec;

/**
 * 
 * @param {string} url 
 * @returns 
 */
const getYouTubeId = (url) => {
  const pattern = /^(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
  const match = url.match(pattern);
  return match ? match[1] : null;
}

/**
 * 
 * @param {import("discord.js").CommandInteraction} interaction 
 */
module.exports.run = async(interaction) => {
    let games = interaction.client.guessTheSongs.get(interaction.guildId);
    if(games) {
        try {
            await interaction.reply({
                content: "Someone is using me for guess the song.",
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.log(error);
        }
        return;
    } 

    let { channel } = interaction.member.voice;
    let connection = getVoiceConnection(interaction.guildId);
    if(!channel) {
        try {
            await interaction.reply({
                content: "You have to join voice channel first.",
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.log(error);
        }
        return;
    }

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

    try {
        await interaction.deferReply();
    } catch (error) {
        console.log(error);
    }

    let youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[?&].*)?$/i;
    let query = interaction.options.getString("query", true);
    let url = query.split(" ")[0];

    let song, playlist = null;
    let songs = [];
    try {
        if(scdl.isValidUrl(url)) {
            if(scdl.isPlaylistURL(url)) {
                playlist = await scdl.getSetInfo(url);
                let tracks = playlist.tracks.map(track => {
                    track.queue_id = v4();
                    track.requestedBy = interaction.user;
                    track.textChannel = interaction.channel;
                    track.type = "soundcloud";
                    return track;
                });
                songs.push(...tracks);
            }
            else song = await scdl.getInfo(url);
            song["type"] = "soundcloud";
        }
        else if(youtubeRegex.test(url)) {
            let response = await fetch(`https://www.youtube.com/oembed?format=json&url=${url}`);
            song = await response.json();

            let id = v4();
            let videoId = getYouTubeId(url);

            if(!fs.existsSync(`./download/${videoId}.mp3`)) await youtubedl(url, {
                audioFormat: "mp3",
                audioQuality: "0",
                cookies: interaction.client.cookiesPath,
                extractAudio: true,
                noPart: true,
                output: interaction.client.outputPath(videoId)
            });

            song["queue_id"] = id;
            song["path"] = `./download/${videoId}.mp3`;
            song["id"] = videoId;
            song["url"] = `https://youtube.com/watch?v=${url}`;
            song["type"] = "youtube";
        }
        else {
            let results = await scdl.search({ query, resourceType: "tracks" });
            song = results.collection[0];
            song["type"] = "soundcloud";
            song.queue_id = v4();
        }
        if(song) {
            song.requestedBy = interaction.user;
            song.textChannel = interaction.channel;
        }
    } catch (error) {
        console.log(error);
    }
    if(!song && (!songs || !songs.length)) {
        try {
            await interaction.editReply({
                content: "There's something wrong while trying to get songs!",
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.log(error);
        }
        return;
    }

    let serverQueue = interaction.client.queue.get(interaction.guildId);
    let queueConstruct = music.createQueueConstruct(interaction.user);

    let player = interaction.client.players.get(interaction.guildId);
    if(!player) player = music.createPlayer(interaction.guildId, interaction.client);

    if(song) {
        if(serverQueue) serverQueue.songs.insertLast(song);
        else queueConstruct.songs.insertLast(song);
    }
    else {
        if(serverQueue) serverQueue.songs.insertMultipleLast(songs);
        else queueConstruct.songs.insertMultipleLast(songs);
    }

    try {
        let embed = new EmbedBuilder()
            .setColor("Blue")
            .setDescription(
                song
                ? `Added [${song.title}](${song.type === "youtube" ? song.url : song.permalink_url}) - [<@${song.requestedBy.id}>]`
                : `Added [${songs.length} songs](${playlist.permalink_url}) - [<@${songs[0].requestedBy.id}>]`
            );
        await interaction.editReply({
            embeds: [embed]
        });
    } catch (error) {
        console.log(error);
    }

    queueConstruct.currentSong = queueConstruct.songs.first;
    if(!serverQueue) interaction.client.queue.set(interaction.guildId, queueConstruct);
    if(!serverQueue) {
        try {
            if(!connection) connection = await music.createConnection(interaction.client, interaction.guildId, channel.id, interaction.guild.voiceAdapterCreator);
            await play(queueConstruct.songs.getFirst(), interaction.client, interaction.guildId);
        } catch (error) {
            console.log(error);
        }
    }
}
module.exports.data = {
    name: "play",
    description: "Playing music with the bot.",
    options: [
        {
            name: "query",
            description: "Input the title or url song",
            type: 3,
            required: true
        }
    ]
}