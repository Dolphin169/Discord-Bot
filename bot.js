import { Client, GatewayIntentBits } from 'discord.js';
import fetch from 'node-fetch';
import 'dotenv/config';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Replace these with your Discord info
const CHANNEL_ID = '1415764001031327744'; // Channel to send alerts
const ROLE_ID = '1415764663685222572';       // Role to ping for live tournaments

let announced = new Set(); // keep track of already-announced tournaments

async function checkTournaments() {
  try {
    const res = await fetch('https://fortniteapi.io/v1/events/list?region=NAE', {
      headers: { 'Authorization': process.env.FORTNITE_API_KEY }
    });

    if (!res.ok) {
      console.error('API error:', res.status);
      return;
    }

    const data = await res.json();
    const now = new Date();

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
      // Send one message if no tournaments are live
      //await channel.send('No Fortnite tournaments are live right now.');
    }

  } catch (err) {
    console.error('Error checking tournaments:', err);
  }
}

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // Optional test ping to verify bot works
  // const channel = await client.channels.fetch(CHANNEL_ID);
  // await channel.send('Bot is running!');

  // Run check immediately on startup
  checkTournaments();

  // Then run every 5 minutes
  setInterval(checkTournaments, 5 * 60 * 1000);
});

client.login(process.env.TOKEN);