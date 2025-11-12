const fs = require("fs");
const {
    MessageFlags
} = require("discord.js");

/**
 * 
 * @param {import("discord.js").CommandInteraction} interaction 
 */
module.exports.run = async(interaction) => {
    let queue = interaction.client.queue.get(interaction.guildId);
    if(!queue) {
        try {
            await interaction.reply({
                content: "There's no queue in the server.",
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.log(error);
        }
        return;
    }

    const files = fs.readFileSync("./sources/lyrics.json", "utf8");
    let lyrics = JSON.parse(files);
    let lyr = lyrics[queue.currentSong.info.title.toLowerCase().split(" ").join("-")];
    if(!lyr) {
        try {
            await interaction.reply({
                content: `Cannot found **${queue.currentSong.info.title}**'s lyrics.`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.log(error);
        }
        return;
    }

    let l = interaction.client.lyrics.get(interaction.guildId + "-" + interaction.user.id);
    if(l) {
        try {
            let channel = interaction.client.channels.cache.get(l.message.channelId);
            let message = await channel.messages.fetch(l.message.id);
            await message.delete();
        } catch (error) {
            console.log(error);
        }
        clearInterval(l.interval);
        interaction.client.lyrics.delete(interaction.guildId + "-" + interaction.user.id);
    }

    const updateMessage = async() => {
        let l = interaction.client.lyrics.get(interaction.guildId + "-" + interaction.user.id);
        let player = interaction.client.players.get(interaction.guildId);
        let queue = interaction.client.queue.get(interaction.guildId);
        if(!queue || !l) return;

        const files = fs.readFileSync("./sources/lyrics.json", "utf8");
        let lyrics = JSON.parse(files);
        
        let lyr = lyrics[queue.currentSong.info.title.toLowerCase().split(" ").join("-")];
        if(!lyr) return;

        let channel = interaction.client.channels.cache.get(l.message.channelId);
        if(!channel || !channel.isTextBased()) return;

        let message = null;
        try {
            message = await channel.messages.fetch(l.message.id);
        } catch (error) {
            console.log(error);
        }

        if(!message) return;
        if(!lyr[l.index+1] || (lyr[l.index+1].start_at * 1000) >= player.state.playbackDuration) return;

        try {
            l.index++;
            let content = "";
            content += `[**${queue.currentSong.info.title}**](<${queue.currentSong.info.permalink_url}>) - **${queue.currentSong.info.user ? queue.currentSong.info.user.username : "Unknown"}**\n\n`;
            content += "▬▬▬▬▬▬▬▬▬\n";
            content += (lyr[l.index-1] ? `${lyr[l.index-1].text}\n` : "");
            content += `# ${lyr[l.index].text}\n`
            content += (lyr[l.index+1] ? `${lyr[l.index+1].text}\n` : "");
            content += "▬▬▬▬▬▬▬▬▬\n";
            await message.edit({
                content
            });
        } catch (error) {
            console.log(error);
        }
    }
    try {
        let index = 0;
        let player = interaction.client.players.get(interaction.guildId);
        while(index < lyr.length && (lyr[index].start_at * 1000) <= player.state.playbackDuration) {
            player = interaction.client.players.get(interaction.guildId);
            index++;
        }
        let content = "";
        content += `[**${queue.currentSong.info.title}**](<${queue.currentSong.info.permalink_url}>) - **${queue.currentSong.info.user ? queue.currentSong.info.user.username : "Unknown"}**\n\n`;
        content += "▬▬▬▬▬▬▬▬▬\n";
        content += (lyr[index-1] ? `${lyr[index-1].text}\n` : "");
        content += `# ${lyr[index].text}\n`
        content += (lyr[index+1] ? `${lyr[index+1].text}\n` : "");
        content += "▬▬▬▬▬▬▬▬▬\n";
        let response = await interaction.reply({
            content,
            withResponse: true
        });
        let interval = setInterval(updateMessage, 500);
        let data = {
            index,
            interval,
            message: {
                id: response.resource.message.id,
                channelId: interaction.channelId
            }
        };
        interaction.client.lyrics.set(interaction.guildId + "-" + interaction.user.id, data);
    } catch (error) {
        console.log(error);
    }
}

module.exports.data = {
    name: "lyrics",
    description: "Show current song's lyrics."
}