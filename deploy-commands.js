import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import 'dotenv/config';

const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Check if the bot is online'),
  new SlashCommandBuilder().setName('status').setDescription('Shows bot status and last check'),
  new SlashCommandBuilder().setName('help').setDescription('Lists all commands'),
  new SlashCommandBuilder().setName('next').setDescription('Shows the next Fortnite tournament(s)')
  .addIntegerOption(option =>
    option.setName('amount')
      .setDescription('How many tournaments to show')
      .setMinValue(1)
      .setMaxValue(10)
  ),
  new SlashCommandBuilder().setName('live').setDescription('Shows currently live tournaments'),
  new SlashCommandBuilder().setName('region').setDescription('Set or view your preferred Fortnite region')
    .addStringOption(option =>
    option.setName('region')
    .setDescription('Region code, e.g., NAE, NAW, EU')
    .setRequired(false)
    ),
  new SlashCommandBuilder().setName('myrole').setDescription('Check if you are subscribed to alerts')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

try {
  console.log('Started refreshing slash commands...');
  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands },
  );
  console.log('Slash commands registered successfully.');
} catch (error) {
  console.error(error);
}