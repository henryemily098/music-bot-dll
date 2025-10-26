const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} = require("discord.js");
const {
    getVoiceConnection
} = require("@discordjs/voice");
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
                content: "You have to join voice channel first!",
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            
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
    let songs = [];

    try {
        let results = await scdl.search({ query });
        songs.push(...results.collection);
    } catch (error) {
        console.log(error);
    }

    if(!songs.length) {
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

    let select = new StringSelectMenuBuilder()
        .setCustomId("selectsong")
        .setPlaceholder("Select song!")
        .setMaxValues(1)
        .setMaxValues(1);
    for (let i = 0; i < (songs.length > 10 ? 10 : songs.length); i++) {
        let option = new StringSelectMenuOptionBuilder()
            .setDescription(`By ${songs[i].user ? songs[i].user.username : "Unknown User"}`)
            .setLabel(`${i+1}). ${songs[i].title}`)
            .setValue(`${i}`);
        select.addOptions(option);
    }
    let row = new ActionRowBuilder().setComponents([select]);
    let row2 = new ActionRowBuilder()
        .setComponents([
            new ButtonBuilder()
                .setCustomId("selectsong-cancel")
                .setEmoji("❌")
                .setStyle(ButtonStyle.Danger)
        ]);

    let content = "```\n";
    content += `Found ${songs.length} songs!\n\n`;
    content += "Results:\n";
    content += [...songs].splice(0, 10).map((song, index) => `${index+1}). ${song.title} by ${song.user ? song.user.username : "Unknown User"}`).join("\n");
    content += "\n```";
    try {
        await interaction.editReply({
            components: [row, row2],
            content: content
        });
        interaction.client.search.set(interaction.user.id + interaction.channelId, songs);
    } catch (error) {
        console.log(error);
    }
}

module.exports.data = {
    name: "search",
    description: "Search for specific song",
    options: [
        {
            name: "query",
            description: "Input the title of the song",
            type: 3,
            required: true
        }
    ]
}