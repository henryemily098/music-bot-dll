require("dotenv").config();
const fs = require("fs");
const {
    Client,
    Collection,
    Events,
    GatewayIntentBits,
    Partials,
    REST,
    Routes
} = require("discord.js");
const {
    getVoiceConnection
} = require("@discordjs/voice");
const {
    interaction: interactionRun
} = require("./util");

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
client.guessTheSongs = new Collection();

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
    if(interaction.isCommand()) await interactionRun.commands(interaction);
    if(interaction.isButton()) await interactionRun.buttons(interaction);
    if(interaction.isStringSelectMenu()) await interactionRun.selectString(interaction);
});
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    let queue = client.queue.get(oldState.guild.id);
    let player = client.players.get(oldState.guild.id);
    let connection = getVoiceConnection(oldState.guild.id);
    if(!queue || !connection) return;
    
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
                queue.prevVotes.splice(queue.prevVotes.indexOf(oldState.member.id), 1);
                queue.skipVotes.splice(queue.skipVotes.indexOf(oldState.member.id), 1);
                if(members.size && (queue.skipVotes.length === members.size || queue.prevVotes.length === members.size)) player.stop();
            }
            else if(newState.channelId === channel.id && members.size <= 1) queue.dj = queue.dj || newState.member.user;
        }
    }
});
client.login(process.env.TOKEN);