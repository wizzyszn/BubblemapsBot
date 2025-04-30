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
// Error handling for bot
bot.catch((err, ctx) => {
    console.error(`Error for ${ctx.updateType}`, err);
    ctx.reply("Oops, something went wrong! Please try again later.");
});
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
const errorMiddleware = (err, req, res, next) => {
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
        }
        else {
            console.log(`Webhook already set to: ${currentWebhook.url}`);
            // OPTIONAL: Force update webhook if URL doesn't match exactly
            if (currentWebhook.url !== webhookUrl) {
                console.log(`Updating webhook from ${currentWebhook.url} to ${webhookUrl}`);
                await bot.telegram.setWebhook(webhookUrl);
                console.log(`Webhook updated to: ${webhookUrl}`);
            }
        }
    }
    catch (error) {
        console.error("Error setting webhook:", error);
    }
});
// Graceful shutdown
process.on("SIGTERM", async () => {
    console.log("Shutting down...");
    await bot.telegram.deleteWebhook();
    process.exit(0);
});
