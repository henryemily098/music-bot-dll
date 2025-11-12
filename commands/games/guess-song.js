const fs = require("fs");
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");
const {
    entersState,
    joinVoiceChannel,
    VoiceConnectionStatus
} = require("@discordjs/voice");

/**
 * 
 * @param {import("discord.js").CommandInteraction} interaction 
 */
module.exports.run = async(interaction) => {
    let { channel } = interaction.member.voice;
    let queue = interaction.client.queue.get(interaction.guildId);
    let game = interaction.client.guessTheSongs.get(interaction.guildId);
    if(queue) {
        try {
            await interaction.reply({
                content: "The bot currently is using to listening a music.",
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.log(error);
        }
        return;
    }

    if(game) {
        try {
            await interaction.reply({
                content: "The bot current is using for other's **guess the song** game.",
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.log(error);
        }
        return
    }

    if(!channel) {
        try {
            await interaction.reply({
                content: "You have to join voice channel first!",
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.log(error);
        }
        return;
    }

    let description = "";
    description += "**1).** Each song will play for 15 seconds and users will only be given one chance to listen to it.\n";
    description += "**2).** Users are only given one chance to answer each song.\n";
    description += "\n";
    description += "**ARE YOU READY???**";
    let embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle("Before We Start The Game")
        .setDescription(description);
    let row = new ActionRowBuilder()
        .setComponents([
            new ButtonBuilder()
                .setCustomId("guessthesong-ready")
                .setStyle(ButtonStyle.Primary)
                .setLabel("Ready!"),
            new ButtonBuilder()
                .setCustomId("guessthesong-cancel")
                .setStyle(ButtonStyle.Secondary)
                .setLabel("Cancel")
        ]);
    
    let connection;
    try {
        connection = joinVoiceChannel({
            guildId: interaction.guildId,
            channelId: channel.id,
            adapterCreator: interaction.guild.voiceAdapterCreator
        });
        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    } catch (error) {
        console.log(error);
    }
    if(!connection) {
        try {
            await interaction.reply({
                content: "I can't join voice channel! ",
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.log(error);
        }
        return;
    }

    let gamesConstruct = {
        userId: interaction.user.id,
        indexSong: 0,
        answers: [],
        userAnswers: [],
        options: [],
        correct: 0,
        wrong: 0,
        player: null,
        message: {
            id: null,
            channelId: null
        }
    }
    
    const files = fs.readFileSync("./sources/autoplay-list.json", "utf8");
    const autoPlayList = JSON.parse(files);

    let i = 0;
    while(i < 5) {
        let randomIndex = Math.floor(Math.random()*autoPlayList.length);
        if(!gamesConstruct.answers.includes(autoPlayList[randomIndex])) {
            gamesConstruct.answers.push(autoPlayList[randomIndex]);
            i++;
        }
    }
    try {
        let msg = await interaction.reply({
            components: [row],
            embeds: [embed],
            withResponse: true
        });
        gamesConstruct.message = {
            id: msg.resource.message.id,
            channelId: interaction.channelId
        };
        interaction.client.guessTheSongs.set(interaction.guildId, gamesConstruct);
    } catch (error) {
        console.log(error);
    }
}

module.exports.data = {
    name: "guess-the-song",
    description: "Guess the song that i'll play in voice channel."
}