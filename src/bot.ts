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

// Set webhook endpoint
const WEBHOOK_PATH = `/bot${process.env.BOT_TOKEN}`;
app.use(WEBHOOK_PATH, bot.webhookCallback(WEBHOOK_PATH));

// Health check endpoint
app.get("/", (req, res) => {
  res.send("Crypto Bot server is running!");
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
  const currentWebhook = await bot.telegram.getWebhookInfo();
  if (!currentWebhook.url) {
    await bot.telegram.setWebhook(webhookUrl);
    console.log(`Webhook set to: ${webhookUrl}`);
  } else {
    console.log(`Webhook already set to: ${currentWebhook.url}`);
  }
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down...");
  await bot.telegram.deleteWebhook();
  process.exit(0);
});