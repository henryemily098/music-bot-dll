require("dotenv").config();
const fs = require("fs");
const {
    Client,
    Collection,
    EmbedBuilder,
    Events,
    GatewayIntentBits,
    MessageFlags,
    Partials,
    PermissionFlagsBits,
    REST,
    Routes
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
    DLL
} = require("./util");
const {
    v4
} = require("uuid");
const {
    end,
    play
} = require("./play");

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
const client = new Client({
    intents: [
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.Channel,
        Partials.GuildMember,
        Partials.Message,
        Partials.User
    ]
});

const commands = [];
client.viewQueue = new Collection();
client.search = new Collection();
client.commands = new Collection();
client.players = new Collection();
client.queue = new Collection();

const folders = fs.readdirSync("./commands").filter(folder => !folder.includes("."));
for(let i = 0; i < folders.length; i++) {
    let config = require(`./commands/${folders[i]}.json`);
    let files = fs.readdirSync(`./commands/${folders[i]}`).filter(file => file.endsWith(".js"));
    for(let j = 0; j < files.length; j++) {
        let command = require(`./commands/${folders[i]}/${files[j]}`);
        if(command && command.data) {
            command.data.type = 1;
            config.options.push(command.data);
            client.commands.set(`${config.name}-${command.data.name}`, command);
        }
    }
    commands.push(config);
}

(async() => {
    try {
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            {
                body: commands
            }
        );
    } catch (error) {
        console.log(error);
    }
})();

client.on(Events.ClientReady, (readyClient) => console.log(`[SERVER] ${readyClient.user.username} it's ready to work!`));
client.on(Events.InteractionCreate, async(interaction) => {
    if(interaction.isCommand()) {
        const command = client.commands.get(`${interaction.commandName}-${interaction.options.getSubcommand(true)}`);
        if(!command) {
            try {
                await interaction.reply({
                    content: "The command it's no longer exist!",
                    flags: MessageFlags.Ephemeral
                });
            } catch (error) {
                console.log(error);
            }
            return;
        }

        try {
            await command.run(interaction);
        } catch (error) {
            console.log(error);
        }
    }
    if(interaction.isButton()) {
        let [f, c] = interaction.customId.split("-");
        if(f.toLowerCase() === "selectsong") {
            if(!client.search.has(interaction.user.id+interaction.channelId)) {
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
                    client.search.delete(interaction.user.id + interaction.channelId);
                } catch (error) {
                    console.log(error);
                }
            }
        }
        if(f.toLowerCase() === "queue") {
            let queue = client.queue.get(interaction.guildId);
            let viewQueue = client.viewQueue.get(interaction.user.id+interaction.message.id);
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
            content += `FIRST 5 TRACKS TO BE PLAYED IN ${interaction.guild.name}'s QUEUE\n\n`;
            content += `Total tracks: ${queue.songs.length}\n`;
            content += `Current DJ: ${queue.dj ? `${queue.dj.username}` : "None"}\n`;
            content += `Current Song: ${queue.currentSong ? queue.currentSong.info.title : "Unknown"}\n\n`;
            content += list.splice(viewQueue.start, 5).map((song, index) => `${viewQueue.start+index+1}). ${song.title} - [${song.requestedBy.username}]`).join("\n") + "\n\n";
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
    }
    if(interaction.isStringSelectMenu()) {
        let [f] = interaction.customId.split("-");
        if(f.toLowerCase() === "selectsong") {
            let songs = client.search.get(interaction.user.id+interaction.channelId);
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
            let queueConstruct = {
                currentSong: null,
                dj: interaction.user,
                loop: false,
                message: null,
                playing: true,
                prevVotes: [],
                skipVotes: [],
                songs: new DLL(),
                volume: 100,
            }

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

            songs[option].queue_id = v4();
            songs[option].requestedBy = interaction.user;
            songs[option].textChannel = interaction.channel;
            
            if(serverQueue) serverQueue.songs.insert(songs[option]);
            else queueConstruct.songs.insert(songs[option]);

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
            if(!serverQueue) client.queue.set(interaction.guildId, queueConstruct);
            if(!serverQueue) {
                try {
                    if(!connection) {
                        connection = joinVoiceChannel({
                            adapterCreator: interaction.guild.voiceAdapterCreator,
                            channelId: channel.id,
                            guildId: interaction.guildId
                        })
                        .on(VoiceConnectionStatus.Destroyed, () => end(interaction.client, interaction.guildId))
                        .on(VoiceConnectionStatus.Disconnected, () => end(interaction.client, interaction.guildId));

                        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
                        connection.subscribe(player);
                    }
                    await play(queueConstruct.songs.getFirst(), client, interaction.guildId);
                } catch (error) {
                    console.log(error);
                }
            }
        }
    }
});
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    let queue = client.queue.get(oldState.guild.id);
    let player = client.players.get(oldState.guild.id);
    let connection = getVoiceConnection(oldState.guild.id);
    if(!queue) return;
    
    const filter = (m) => !m.user.bot;
    if(oldState.member.id === client.user.id) {
        if(newState.channel) {
            let members = newState.channel.members.filter(filter);
            if(!members.has(queue.dj.id)) queue.dj = members.size ? members.random().user : null;
            queue.prevVotes = [];
            queue.skipVotes = [];
        }
        else {
            if(connection) connection.destroy();
        }
    }
    else {
        let channel = client.channels.cache.get(connection.joinConfig.channelId);
        if(channel && channel.isVoiceBased()) {
            let members = channel.members.filter(filter);
            if(oldState.channelId === channel.id && queue.dj.id === oldState.member.id) {
                queue.dj = members.size ? members.random().user : null;
                queue.prevVotes.splice(queue.indexOf(oldState.member.id), 1);
                queue.skipVotes.splice(queue.indexOf(oldState.member.id), 1);
                if(queue.skipVotes.length === members.size || queue.prevVotes.length === members.size) player.stop();
            }
            else if(newState.channelId === channel.id && members.size <= 1) queue.dj = queue.dj || newState.member.user;
        }
    }
});
client.login(process.env.TOKEN);