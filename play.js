const {
    EmbedBuilder
} = require("discord.js");
const {
    createAudioResource,
    getVoiceConnection,
    StreamType
} = require("@discordjs/voice");
const {
    Readable
} = require("stream");
const scdl = require("soundcloud-downloader").default;

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
        if(song.permalink_url) stream = await scdl.downloadFormat(song.permalink_url, scdl.FORMATS.MP3);
        else stream = Readable.from(song.buffer);
    } catch (error) {
        console.log(error);
    }

    let resource = createAudioResource(stream, { inputType: StreamType.Arbitrary, inlineVolume: true });
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