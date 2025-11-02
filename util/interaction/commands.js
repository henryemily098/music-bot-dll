const {
    MessageFlags
} = require("discord.js");

/**
 * 
 * @param {import("discord.js").CommandInteraction} interaction 
 */
module.exports = async(interaction) => {
    const command = interaction.client.commands.get(`${interaction.commandName}-${interaction.options.getSubcommand(true)}`);
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