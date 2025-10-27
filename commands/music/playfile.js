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
const {
    Buffer
} = require("buffer");
const fetch = require("node-fetch").default;;

const audioUrlToBuffer = async(url) => {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer;
}

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

    let file = interaction.options.getAttachment("file", true);
    if(file.contentType.split("/")[0] !== "audio") {
        try {
            await interaction.editReply({
                content: "You can only input audio files!",
            });
        } catch (error) {
            console.log(error);
        }
        return;
    }
    let buffer = null;
    try {
        buffer = await audioUrlToBuffer(file.attachment);
    } catch (error) {
        console.log(error);
    }
    if(!buffer) {
        try {
            await interaction.editReply({
                content: "Something wrong while trying to get file's information"
            });
        } catch (error) {
            console.log(error);
        }
        return;
    }

    let song = {
        buffer,
        queue_id: v4(),
        requestedBy: interaction.user,
        textChannel: interaction.channel,
        title: file.name.split(".")[0].split("_").join(" ")
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
            .on(AudioPlayerStatus.Idle, () => end(interaction.client, interaction.guildId));
        interaction.client.players.set(interaction.guildId, player);
    }

    if(serverQueue) serverQueue.songs.insertLast(song);
    else queueConstruct.songs.insertLast(song);

    try {
        let embed = new EmbedBuilder()
            .setColor("Blue")
            .setDescription(`Added **${song.title}** to queue!`);
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
                .on(VoiceConnectionStatus.Destroyed, () => end(interaction.client, interaction.guildId))
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
    name: "playfile",
    description: "Playing music from your local file",
    options: [
        {
            name: "file",
            description: "Input or drag your music file",
            type: 11,
            required: true
        }
    ]
}