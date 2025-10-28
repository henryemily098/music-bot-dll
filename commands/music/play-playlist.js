const {
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");
const {
    getVoiceConnection
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

    let query = interaction.options.getString("query", true);
    let range = interaction.options.getInteger("range", false);
    let url = query.split(" ")[0];

    if(scdl.isValidUrl(url) && !scdl.isPlaylistURL(url)) {
        try {
            await interaction.reply({
                content: "You input invalid link!",
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

    let playlist, songs = null;
    try {
        if(scdl.isPlaylistURL(url)) playlist = await scdl.getSetInfo(url);
        else {
            let results = await scdl.search({ query, resourceType: "playlists" });
            playlist = results.collection[0];
        }
    } catch (error) {
        console.log(error);
    }

    if(!playlist) {
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

    songs = playlist.tracks.map((track) => {
        track.queue_id = v4();
        track.requestedBy = interaction.user;
        track.textChannel = interaction.channel;
        return track;
    });
    let serverQueue = interaction.client.queue.get(interaction.guildId);
    let queueConstruct = music.createQueueConstruct(interaction.user);

    let player = interaction.client.players.get(interaction.guildId);
    if(!player) player = music.createPlayer(interaction.guildId, interaction.client);

    if(serverQueue) serverQueue.songs.insertMultipleLast(...songs);
    else queueConstruct.songs.insertMultipleLast(...songs);

    try {
        let embed = new EmbedBuilder()
            .setColor("Blue")
            .setDescription(`Added [${playlist.track_count}](${playlist.permalink_url}) - `);
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
    name: "play-playlist",
    description: "Play a playlist",
    options: [
        {
            name: "query",
            description: "Input the playlist's name.",
            type: 3,
            required: true
        },
        {
            name: "range",
            description: "How many songs will insert to the queue (default: 10).",
            type: 4,
            required: false
        }
    ]
}