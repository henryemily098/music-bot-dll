const {
    getVoiceConnection
} = require("@discordjs/voice");
const {
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

/**
 * 
 * @param {import("discord.js").CommandInteraction} interaction 
 */
module.exports.run = async(interaction) => {
    let { channel } = interaction.member.voice;
    let connection = getVoiceConnection(interaction.guildId);
    let queue = interaction.client.queue.get(interaction.guildId);
    let guild = interaction.client.guilds.cache.get(interaction.guildId);
    if(!queue) {
        try {
            await interaction.reply({
                content: "There's no queue in the server!",
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.log(error);
        }
        return;
    }

    let confirm = false;
    let member = guild.members.cache.get(interaction.user.id);
    if(member.user.id === queue.dj?.id) confirm = true;
    if(member.permissions.has(PermissionFlagsBits.Administrator)) confirm = true;
    if(member.permissions.has(PermissionFlagsBits.ManageGuild)) confirm = true;
    if(!confirm) {
        try {
            await interaction.reply({
                content: `You're not a DJ or missing some permissions!`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.log(error);
        }
        return;
    }

    if(!channel || channel.id != connection.joinConfig.channelId) {
        try {
            await interaction.reply({
                content: `You have to join <#${connection.joinConfig.channelId}> first!`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.log(error);
        }
        return;
    }

    let outputType = {
        "default": "Default",
        "bassboost": "Bass Boost / Sub Enchancer",
        "dolby": "Dolby / All Around",
        "reverb": "Reverb",
        "eightd": "8D"
    }

    queue.outputType = interaction.options.getString("type", true);
    let embed = new EmbedBuilder()
        .setColor("Blue")
        .setDescription(`The next song's audio output type will change to: **${outputType[queue.outputType]}**`);
    try {
        await interaction.reply({
            embeds: [embed]
        });
    } catch (error) {
        console.log(error);
    }
}

module.exports.data = {
    name: "audio-output-type",
    description: "Change audio output type",
    options: [
        {
            name: "type",
            description: "Type of the audio",
            type: 3,
            required: true,
            choices: [
                {
                    name: "Default",
                    value: "default"
                },
                {
                    name: "Bass Boost / Sub Enchancer",
                    value: "bassboost"
                },
                {
                    name: "8D",
                    value: "eightd"
                }
            ]
        }
    ]
}