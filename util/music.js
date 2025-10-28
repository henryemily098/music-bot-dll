const {
    AudioPlayerStatus,
    createAudioPlayer,
    entersState,
    joinVoiceChannel,
    VoiceConnectionStatus
} = require("@discordjs/voice");
const {
    end
} = require("../play");
const {
    DLL
} = require("./linked-list");

module.exports = {
    /**
     * 
     * @param {import("discord.js").User} user 
     * @returns QueueConstruct
     */
    createQueueConstruct(user) {
        return {
            currentSong: null,
            direction: 1,
            dj: user,
            loop: false,
            message: null,
            playing: true,
            prevVotes: [],
            skipVotes: [],
            songs: new DLL(),
            volume: 100
        };
    },
    /**
     * 
     * @param {string} guildId 
     * @param {import("discord.js").Client} client
     * @returns AudioPlayer
     */
    createPlayer(guildId, client) {
        let player = createAudioPlayer()
            .on(AudioPlayerStatus.Playing, () => {
                let queue = client.queue.get(guildId);
                if(queue) queue.playing = true;
            })
            .on(AudioPlayerStatus.Paused, () => {
                let queue = client.queue.get(guildId);
                if(queue) queue.playing = false;
            })
            .on(AudioPlayerStatus.Idle, () => end(client, guildId))
            .on("error", () => end(client, guildId));
        client.players.set(guildId, player);
        return player;
    },
    /**
     * 
     * @param {import("discord.js").Client} client 
     * @param {string} guildId 
     * @param {string} channelId 
     * @param {object} voiceAdapterCreator 
     */
    async createConnection(client, guildId, channelId, voiceAdapterCreator) {
        let player = client.players.get(guildId);
        let connection = joinVoiceChannel({
            adapterCreator: voiceAdapterCreator,
            channelId: channelId,
            guildId: guildId
        })
        .on(VoiceConnectionStatus.Destroyed, () => end(client, guildId));
        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
        connection.subscribe(player);
        return connection;
    }
}