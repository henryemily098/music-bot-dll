const {
    EmbedBuilder
} = require("discord.js");
const {
    spawn
} = require("child_process");
const {
    createAudioResource,
    getVoiceConnection,
    StreamType
} = require("@discordjs/voice");
const {
    Readable
} = require("stream");
const scdl = require("soundcloud-downloader").default;

async function createStream(song) {
    let stream;
    if(song.permalink_url) stream = await scdl.downloadFormat(song.permalink_url, scdl.FORMATS.MP3);
    else stream = Readable.from(song.buffer);
    return {
        resource: stream,
        type: StreamType.Arbitrary
    };
}

/**
 * 
 * @param {string[]} filter 
 */
function createFFmpeg(filter) {
    let ffmpeg = spawn('ffmpeg', [
        '-loglevel', 'quiet',
        '-i', 'pipe:0',
        '-af', filter,
        '-f', 's16le',
        '-ar', '48000',
        '-ac', '2',
        'pipe:1'
    ], { stdio: ['pipe', 'pipe', 'inherit'] });
    ffmpeg.stdin.on('error', (err) => {
        if (err.code === 'EPIPE') {
            console.warn('[WARN] FFmpeg stdin closed early (EPIPE)');
        } else {
            console.error('[FFmpeg stdin error]', err);
        }
    });

    ffmpeg.on('error', (err) => console.error('[FFmpeg spawn error]', err));
    ffmpeg.on('close', (code) => console.log(`[FFmpeg closed] code ${code}`));
    return ffmpeg;
}

async function audioBassBoost(song) {
    const stream = await createStream(song);
    const filter = [
        "dynaudnorm=g=15",
        "equalizer=f=100:width_type=o:width=2:g=10",
        "equalizer=f=250:width_type=o:width=2:g=4",
        "acompressor=threshold=-18dB:ratio=3:attack=20:release=250"
    ].join(',');

    const ffmpeg = createFFmpeg(filter);
    stream.resource.pipe(ffmpeg.stdin);
    return {
        resource: ffmpeg,
        type: StreamType.Raw
    }
}

async function audioEightD(song) {
    const stream = await createStream(song);
    const filter = [
        "dynaudnorm=g=10",
        "apulsator=hz=0.2",
        "aecho=0.8:0.88:60:0.4",
        "highpass=f=100, lowpass=f=10000"
    ].join(',');
    const ffmpeg = createFFmpeg(filter);
    stream.resource.pipe(ffmpeg.stdin);
    return {
        resource: ffmpeg,
        type: StreamType.Raw
    }
}

/**
 * 
 * @param {{}} song 
 * @param {import("discord.js").Client} client 
 * @param {string} guildId 
 */
module.exports.play = async(song, client, guildId) => {
    let queue = client.queue.get(guildId);
    let player = client.players.get(guildId);
    let connection = getVoiceConnection(guildId);
    if(!song || !connection) {
        client.queue.delete(guildId);
        return;
    }

    let stream = null;
    try {
        if(queue.outputType === "default") stream = await createStream(song);
        else if(queue.outputType === "bassboost") stream = await audioBassBoost(song);
        else if(queue.outputType === "eightd") stream = await audioEightD(song);
    } catch (error) {
        console.log(error);
    }
    if(!stream) {
        this.end(client, guildId);
        return;
    }

    queue.stream = stream;
    let resource = createAudioResource(queue.outputType === "default" ? queue.stream.resource : queue.stream.resource.stdout, { inputType: stream.type, inlineVolume: true });
    resource.volume.setVolume(queue.volume / 100);
    player.play(resource);

    try {
        let embed = new EmbedBuilder()
            .setColor("Blue")
            .setDescription(`Now Playing ${song.permalink_url ? `[${song.title}](${song.permalink_url})` : `**${song.title}**`} - [<@${song.requestedBy.id}>]`);
        queue.message = await song.textChannel.send({ embeds: [embed] });
    } catch (error) {
        console.log(error);
    }
}

/**
 * 
 * @param {import("discord.js").Client} client 
 * @param {string} guildId 
 */
module.exports.end = async(client, guildId) => {
    let queue = client.queue.get(guildId);
    if(!queue) return;

    let lyricKeys = Array.from(client.lyrics.keys());
    for (let i = 0; i < lyricKeys.length; i++) {
        let lyrics = client.lyrics.get(lyricKeys[i]);
        try {
            let channel = client.channels.cache.get(lyrics.message.channelId);
            let message = await channel.messages.fetch(lyrics.message.id);
            await message.delete();
        } catch (error) {
            console.log(error);
        }

        clearInterval(lyrics.interval);
        client.lyrics.delete(lyricKeys[i]);
    }
    
    queue.skipVotes = [];
    queue.prevVotes = [];
    try {
        if(queue.message) await queue.message.delete();
        queue.message = null;
    } catch (error) {
        console.log(error);
    }

    if(!queue.currentSong) queue.currentSong = queue.songs.first;
    else {
        queue.currentSong = queue.direction ? queue.currentSong.next : queue.currentSong.prev;
        if(!queue.currentSong && queue.loop) queue.currentSong = queue.direction ? queue.songs.first : queue.songs.last;
    }
    await this.play(queue.currentSong?.info, client, guildId);
}