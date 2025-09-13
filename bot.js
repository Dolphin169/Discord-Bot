import { Client, GatewayIntentBits } from 'discord.js';
import fetch from 'node-fetch';
import 'dotenv/config';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Replace these with your Discord info
const CHANNEL_ID = '1415764001031327744'; // Channel to send alerts
const ROLE_ID = '1415764663685222572';       // Role to ping for live tournaments
let lastCheck = 'Never';
let userRegions = new Map();
let cachedTournaments = [];


let announced = new Set(); // keep track of already-announced tournaments

async function checkTournaments() {
  try {
    const res = await fetch('https://fortniteapi.io/v1/events/list?region=NAC', {
      headers: { 'Authorization': process.env.FORTNITE_API_KEY }
    });

    if (!res.ok) {
      console.error('API error:', res.status);
      return;
    }

    const data = await res.json();
    const now = new Date();

    cachedTournaments = data.events.map(e => ({
      name_line1: e.name_line1,
      name_line2: e.name_line2,
      beginTime: e.beginTime,
      endTime: e.endTime,
      region: e.region
    }));

    console.log(cachedTournaments)

    lastCheck = new Date().toUTCString();

    // Find all tournaments currently live
    const liveTournaments = (data.events || []).filter(event => {
      const start = new Date(event.start);
      const end = new Date(event.end);
      return now >= start && now <= end;
    });

    const channel = await client.channels.fetch(CHANNEL_ID);

    if (liveTournaments.length > 0) {
      // Only send tournaments that haven’t been announced yet
      const newTournaments = liveTournaments.filter(e => !announced.has(e.id));

      if (newTournaments.length > 0) {
        const names = newTournaments.map(e => e.name || e.id).join(', ');
        await channel.send(`<@&${ROLE_ID}> Live Fortnite tournament(s) now: ${names} 🏆`);

        // Mark them as announced
        newTournaments.forEach(e => announced.add(e.id));
      }
    } else {
      await channel.send('No Fortnite tournaments are live right now.');
    }
  } catch (err) {
    console.error('Error checking tournaments:', err);
  }
}

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // Run check immediately on startup
  checkTournaments();

  // Then run every 5 minutes
  setInterval(checkTournaments, 5 * 60 * 1000);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()){
    return;
  }

  const { commandName, options, member, guild } = interaction;

  if (commandName === 'ping') {
    await interaction.reply('Pong!');
    return;
  }
  else if (commandName === 'status') {
    await interaction.reply(`Bot is online. Last check: ${lastCheck}`);
    return;
  }
  else if (commandName === 'help') {
    await interaction.reply(`
    **Commands:**
    /ping - Check if the bot is online
    /status - Show bot status
    /help - List all commands
    /next - Show next tournament
    /live - Show currently live tournaments
    /region [region] - Set or view preferred region
    /myrole - Check subscription status
    `);
    return;
  }
  else if (commandName === 'next') {
    const now = new Date();

    // Get user's region or fallback to NAC
    const userRegion = userRegions.get(member.id) || 'NAC';

    // Only future tournaments in this region
    const upcoming = cachedTournaments
      .filter(t => t.region === userRegion && new Date(t.beginTime) > now)
      .sort((a, b) => new Date(a.beginTime) - new Date(b.beginTime));

    if (upcoming.length === 0) {
      await interaction.reply('No upcoming tournaments found.');
      return;
    }

    const next = upcoming[0];
    const startTime = new Date(next.beginTime);

    const diffMs = startTime - now;
    const diffMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    await interaction.reply(
      `Next tournament: **${next.name_line1} - ${next.name_line2}** starts at ${startTime.toUTCString()} ` +
      `(in ${hours}h ${minutes}m)`
    );
    return;
  }
  else if (commandName === 'live') {
    const now = new Date();
    const live = cachedTournaments.filter(t => now >= new Date(t.start) && now <= new Date(t.end));
    if (live.length === 0) {
      await interaction.reply('No tournaments are live right now.');
    } else {
      const names = live.map(t => t.name).join(', ');
      await interaction.reply(`Live tournament(s): **${names}**`);
    }
    return;
  }
  else if (commandName === 'region') {
    const region = options.getString('region');
    if (region) {
      userRegions.set(member.id, region.toUpperCase());
      await interaction.reply(`Your preferred region is now set to **${region.toUpperCase()}**`);
    } else {
      const current = userRegions.get(member.id) || 'Not set';
      await interaction.reply(`Your preferred region: **${current}**`);
    }
    return;
  }
  else if (commandName === 'myrole') {
    const hasRole = member.roles.cache.has(ROLE_ID);
    await interaction.reply(hasRole ? 'You are subscribed to alerts.' : 'You are not subscribed to alerts.');
  }
  return;
});

client.login(process.env.TOKEN);