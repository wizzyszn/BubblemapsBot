"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlchemyFunc = exports.chainMapper = void 0;
const telegraf_1 = require("telegraf");
const alchemy_sdk_1 = require("alchemy-sdk");
const dotenv_1 = __importDefault(require("dotenv"));
const generateBubbleMaps_1 = __importDefault(require("./commands/generateBubbleMaps"));
const MarketCap_1 = __importDefault(require("./commands/MarketCap"));
const decentralizationScore_1 = __importDefault(require("./commands/decentralizationScore"));
const token_1 = __importDefault(require("./commands/token"));
const help_1 = __importDefault(require("./commands/help"));
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
dotenv_1.default.config();
const bot = new telegraf_1.Telegraf(process.env.BOT_TOKEN);
exports.chainMapper = {
    eth: alchemy_sdk_1.Network.ETH_MAINNET,
    avx: alchemy_sdk_1.Network.AVAX_MAINNET,
    base: alchemy_sdk_1.Network.BASE_MAINNET,
    bnb: alchemy_sdk_1.Network.BNB_MAINNET,
};
const AlchemyFunc = (chain) => {
    const config = {
        apiKey: process.env.ALCHEMY_API_KEY,
        network: exports.chainMapper[chain],
    };
    const alchemy = new alchemy_sdk_1.Alchemy(config);
    return alchemy;
};
exports.AlchemyFunc = AlchemyFunc;
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
    const imagePath = path_1.default.join(__dirname, "..", "public", "assets", "image.jpg");
    await ctx.replyWithPhoto({ source: imagePath });
    await ctx.reply(startMessage);
});
bot.command("bmap", generateBubbleMaps_1.default);
bot.command("mcap", MarketCap_1.default);
bot.command("dexscore", decentralizationScore_1.default);
bot.command("token", token_1.default);
bot.command("help", help_1.default);
// --- Express server and webhook setup ---
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Set webhook endpoint (change '/secret-path' to something unique)
const WEBHOOK_PATH = `/bot${process.env.BOT_TOKEN}`;
app.use(WEBHOOK_PATH, bot.webhookCallback(WEBHOOK_PATH));
// Optional: health check endpoint
app.get("/", (req, res) => {
    res.send("Crypto Bot server is running!");
});
// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    // Set webhook with Telegram (run this once, or automate)
    const webhookUrl = `${process.env.WEBHOOK_DOMAIN}${WEBHOOK_PATH}`;
    await bot.telegram.setWebhook(webhookUrl);
    console.log(`Webhook set to: ${webhookUrl}`);
});
