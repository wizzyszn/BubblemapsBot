import { Telegraf } from "telegraf";
import { Alchemy, Network } from "alchemy-sdk";
import fs from "fs";
import {
  isBubbleMapAvailable,
  generateBubbleMapScreenshot,
} from "./bubblemaps";
import dotenv from "dotenv";
import generateBubbleMaps from "./commands/generateBubbleMaps";
import marketCap from "./commands/MarketCap";
import decentralizationScore from "./commands/decentralizationScore";
import tokenInfo from "./commands/token";
import help from "./commands/help";
import path from "path"
dotenv.config();
const bot = new Telegraf(process.env.BOT_TOKEN as string);
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

  // Construct the absolute path to the image using __dirname
  const imagePath = path.join(__dirname,"..", 'public', 'assets', 'image.jpg');

  // Send the image using the local file path
  await ctx.replyWithPhoto({ source: imagePath });
  await ctx.reply(startMessage);
});
bot.command("bmap", generateBubbleMaps);
bot.command("mcap", marketCap);
bot.command("dexscore", decentralizationScore);
bot.command("token", tokenInfo);
bot.command("help", help);
bot.launch().then(() => {
  console.log("Bot is up and running!");
});
