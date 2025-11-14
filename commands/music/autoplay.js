const fs = require("fs");
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

    let serverQueue = interaction.client.queue.get(interaction.guildId);
    let queueConstruct = music.createQueueConstruct(interaction.user);

    let song = null;
    const files = fs.readFileSync("./sources/autoplay-list.json", "utf8");
    const autoPlayList = JSON.parse(files);

    try {
        let url = autoPlayList[Math.floor(Math.random()*autoPlayList.length)];
        if(serverQueue) {
            let p = serverQueue.songs.first;
            while(p != null) {
                if(p.info.permalink_url === url) {
                    p = serverQueue.songs.first;
                    url = autoPlayList[Math.floor(Math.random()*autoPlayList.length)];
                }
                else p = p.next;
            }
        }

        song = await scdl.getInfo(url);
        song.queue_id = v4();
        song.requestedBy = interaction.user;
        song.textChannel = interaction.channel;
        song.type = "soundcloud";
    } catch (error) {
        console.log(error);
    }
    if(!song) {
        try {
            await interaction.editReply({
                content: "There's something wrong while trying to fetch song's information!",
            });
        } catch (error) {
            console.log(error);
        }
        return;
    }

    let player = interaction.client.players.get(interaction.guildId);
    if(!player) player = music.createPlayer(interaction.guildId, interaction.client);

    if(serverQueue) serverQueue.songs.insertLast(song);
    else queueConstruct.songs.insertLast(song);

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
            if(!connection) connection = await music.createConnection(interaction.client, interaction.guildId, channel.id, interaction.guild.voiceAdapterCreator);
            await play(queueConstruct.songs.getFirst(), interaction.client, interaction.guildId);
        } catch (error) {
            console.log(error);
        }
    }
}
module.exports.data = {
    name: "autoplay",
    description: "Auto playing or adding music with the bot."
}