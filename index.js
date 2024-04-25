const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    // Füge andere benötigte Intents hinzu
  ],
});

const app = express();
const port = 3000;

let userName = "";
let userID = "";

const GUILD_ID = "1223645033002172586";
const RULES_CHANNEL_ID = "1223645033903820803";
const QUERY_CHANNEL_ID = "1223645037569769642";

let isVerificationInProgress = false;

client.on("messageCreate", async (message) => {
  if (message.channel.id === RULES_CHANNEL_ID && !message.author.bot) {
    message.delete().catch(console.error);
  }
  if (message.content.toLowerCase() === "!verify") {
    if (!isVerificationInProgress) {
      isVerificationInProgress = true;

      userName = message.author.username;
      userID = message.author.id;

      const verificationLink =
        "https://b2c78dd2-7cf8-4cd8-a1d6-0fc156cec03d-00-31o1ryugda7ke.picard.replit.dev/verify";

      const guild = client.guilds.cache.get(GUILD_ID);
      const rulesChannel = guild.channels.cache.get(RULES_CHANNEL_ID);

      rulesChannel
        .send(
          `${userName} (ID: ${userID}), klicke hier, um dich zu verifizieren: ${verificationLink}`,
        )
        .then((sentMessage) => {
          setTimeout(() => {
            sentMessage.delete().catch(console.error);
            isVerificationInProgress = false; // Markiere, dass die Verifizierung abgeschlossen ist
          }, 10000);
        });
    }
  }
});

app.get("/verify", async (req, res) => {
  const referrer = req.get("x-forwarded-for").split(",")[0].trim();
  const userAgent = req.get("user-agent");

  if (userAgent && userAgent.toLowerCase().includes("discordbot")) {
    return;
  }

  const guild = client.guilds.cache.get(GUILD_ID);
  const queryChannel = guild.channels.cache.get(QUERY_CHANNEL_ID);

  try {
    const isProxy = await checkProxy(referrer);
    const member = await guild.members.fetch(userID);

    const verifyRole = guild.roles.cache.find((role) => role.name === "Verify");

    if (userName && userID && verifyRole && !isProxy) {
      await member.roles.add(verifyRole);
      queryChannel.send(
        `Verifizierter Benutzer: ${userName} (ID: ${userID}), IP: ${
          referrer || "Nicht verfügbar"
        }, User-Agent: ${userAgent || "Nicht verfügbar"}`,
      );
      res.send("Du wurdest erfolgreich verifiziert!");
    } else {
      res
        .status(500)
        .send(
          "Die Rolle 'Verify' wurde nicht gefunden oder ungültige Benutzerinformationen.",
        );
    }
  } catch (error) {
    console.error("Fehler bei der Überprüfung des Proxys:", error.message);
    res.status(500).send("Interner Serverfehler.");
  }
});

async function checkProxy(ip) {
  try {
    const response = await axios.get(
      `https://api.xdefcon.com/proxy/check/?ip=${ip}`,
    );
    return response.data.proxy;
  } catch (error) {
    console.error("Fehler bei der Überprüfung des Proxys:", error.message);
    return false;
  }
}

client.login(process.env.DISCORD_TOKEN);

app.listen(port, () => {
  console.log(`Express-Server läuft auf http://localhost:${port}`);
});
