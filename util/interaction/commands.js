const {
    MessageFlags
} = require("discord.js");

/**
 * 
 * @param {import("discord.js").CommandInteraction} interaction 
 */
module.exports = async(interaction) => {
    let commandName;
    if(interaction.options.getSubcommandGroup(false)) commandName = `${interaction.commandName}-${interaction.options.getSubcommandGroup(true)}-${interaction.options.getSubcommand(true)}`;
    else commandName = `${interaction.commandName}-${interaction.options.getSubcommand(true)}`;

    const command = interaction.client.commands.get(commandName);
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