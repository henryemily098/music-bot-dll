const {
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");
const {
    AudioPlayerStatus,
    createAudioPlayer,
    entersState,
    getVoiceConnection,
    joinVoiceChannel,
    VoiceConnectionStatus
} = require("@discordjs/voice");
const {
    v4
} = require("uuid");
const {
    end,
    play
} = require("../../play");
const {
    DLL
} = require("../../util");
const scdl = require("soundcloud-downloader").default;

/**
 * 
 * @param {import("discord.js").CommandInteraction} interaction 
 */
module.exports.run = async(interaction) => {
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
                    return track;
                });
                songs.push(...tracks);
            }
            else song = await scdl.getInfo(url);
        }
        else {
            let results = await scdl.search({ query });
            song = results.collection[0];
        }
        if(song) {
            song.queue_id = v4();
            song.requestedBy = interaction.user;
            song.textChannel = interaction.channel;
        }
    } catch (error) {
        console.log(error);
    }
    if(!song && (!songs || !songs.length)) {
        try {
            await interaction.reply({
                content: "There's something wrong while trying to get songs!",
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.log(error);
        }
        return;
    }

    let serverQueue = interaction.client.queue.get(interaction.guildId);
    let queueConstruct = interaction.client.createQueueConstruct(interaction.user);

    let player = interaction.client.players.get(interaction.guildId);
    if(!player) {
        player = createAudioPlayer()
            .on(AudioPlayerStatus.Playing, () => {
                let queue = interaction.client.queue.get(interaction.guildId);
                if(queue) queue.playing = true;
            })
            .on(AudioPlayerStatus.Paused, () => {
                let queue = interaction.client.queue.get(interaction.guildId);
                if(queue) queue.playing = false;
            })
            .on(AudioPlayerStatus.Idle, () => end(interaction.client, interaction.guildId))
            .on("error", () => end(interaction.client, interaction.guildId));
        interaction.client.players.set(interaction.guildId, player);
    }

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
                ? `Added [${song.title}](${song.permalink_url}) - [<@${song.requestedBy.id}>]`
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
            if(!connection) {
                connection = joinVoiceChannel({
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                    channelId: channel.id,
                    guildId: interaction.guildId
                })
                .on(VoiceConnectionStatus.Destroyed, () => end(interaction.client, interaction.guildId));
                await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
                connection.subscribe(player);
            }
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