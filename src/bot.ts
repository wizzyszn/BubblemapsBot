import { Telegraf } from "telegraf";
import { Alchemy, Network } from "alchemy-sdk";
import dotenv from "dotenv";
import generateBubbleMaps from "./commands/generateBubbleMaps";
import marketCap from "./commands/MarketCap";
import decentralizationScore from "./commands/decentralizationScore";
import tokenInfo from "./commands/token";
import help from "./commands/help";
import path from "path";
import express from "express";
import { Request, Response, NextFunction } from "express";

dotenv.config();
const bot = new Telegraf(process.env.BOT_TOKEN as string);

// Error handling for bot
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}`, err);
  ctx.reply("Oops, something went wrong! Please try again later.");
});

export const chainMapper: Record<string, Network> = {
  eth: Network.ETH_MAINNET,
  avx: Network.AVAX_MAINNET,
  base: Network.BASE_MAINNET,
  bnb: Network.BNB_MAINNET,
};
export type SupportedChain = keyof typeof chainMapper;
export const AlchemyFunc = (chain: SupportedChain) => {
  const config = {
    apiKey: process.env.ALCHEMY_API_KEY,
    network: chainMapper[chain],
  };
  const alchemy = new Alchemy(config);
  return alchemy;
};

bot.command("start", async (ctx) => {
  const startMessage = `
🌟 **Welcome to Crypto Bot!** 🌟  
*Meet CryptoByte, your guide to the crypto universe!*

Dive into the world of cryptocurrency with powerful tools at your fingertips! Here's what CryptoByte can help you explore:

🔹 **Visualize Token Activity**  
Create stunning *bubble maps* to see token movements on any blockchain.

🔹 **Track Market Trends**  
Check the *market capitalization* of your favorite coins by name or symbol.

🔹 **Assess Network Health**  
Get *decentralization scores* to evaluate token networks.

🔹 **Dive Deep into Tokens**  
Access detailed *token info* using chain and contract addresses.

🚀 **Get Started with CryptoByte!**  
Type **/help** to view all commands and their syntax. Try something like **/mcap BTC** to kick things off!

*Your crypto journey starts here!* 🚀
  `;

  const imagePath = path.join(__dirname, "..", "public", "assets", "image.jpg");
  await ctx.replyWithPhoto({ source: imagePath });
  await ctx.reply(startMessage);
});
bot.command("bmap", generateBubbleMaps);
bot.command("mcap", marketCap);
bot.command("dexscore", decentralizationScore);
bot.command("token", tokenInfo);
bot.command("help", help);

// --- Express server and webhook setup ---
const app = express();
app.use(express.json());

// FIXED: Set webhook endpoint correctly
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_PATH = `/bot${BOT_TOKEN}`;

// Use the Telegraf webhook callback correctly
app.post(WEBHOOK_PATH, (req, res) => {
  bot.handleUpdate(req.body, res);
});

// Health check endpoint
app.get("/", (req, res) => {
  res.send("Crypto Bot server is running!");
});

// Debug all unmatched routes
app.use((req, res) => {
  console.log(`Unmatched route: ${req.method} ${req.url}`);
  res.status(404).send("Not Found");
});

// Express error middleware
interface ErrorMiddleware {
  (err: Error, req: Request, res: Response, next: NextFunction): void;
}

const errorMiddleware: ErrorMiddleware = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Server error");
};

app.use(errorMiddleware);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  // Set webhook with Telegram
  const webhookUrl = `${process.env.WEBHOOK_DOMAIN}${WEBHOOK_PATH}`;
  console.log(`Setting webhook to: ${webhookUrl}`); // Debug
  try {
    const currentWebhook = await bot.telegram.getWebhookInfo();
    if (!currentWebhook.url) {
      await bot.telegram.setWebhook(webhookUrl);
      console.log(`Webhook set to: ${webhookUrl}`);
    } else {
      console.log(`Webhook already set to: ${currentWebhook.url}`);
      
      // OPTIONAL: Force update webhook if URL doesn't match exactly
      if (currentWebhook.url !== webhookUrl) {
        console.log(`Updating webhook from ${currentWebhook.url} to ${webhookUrl}`);
        await bot.telegram.setWebhook(webhookUrl);
        console.log(`Webhook updated to: ${webhookUrl}`);
      }
    }
  } catch (error) {
    console.error("Error setting webhook:", error);
  }
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down...");
  await bot.telegram.deleteWebhook();
  process.exit(0);
});