"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const fs_1 = __importDefault(require("fs"));
const bubblemaps_1 = require("./bubblemaps");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const bot = new telegraf_1.Telegraf(process.env.BOT_TOKEN);
bot.command('bmap', async (ctx) => {
    console.log("bmap command received!");
    const chain = 'bsc';
    const token = '0x603c7f932ed1fc6575303d8fb018fdcbb0f39a95';
    try {
        const available = await (0, bubblemaps_1.isBubbleMapAvailable)(chain, token);
        console.log("availability:", available);
        if (!available) {
            return ctx.reply('❌ This bubble map is not available yet.');
        }
        await ctx.reply('🧠 Generating bubble map...');
        const screenshotPath = await (0, bubblemaps_1.generateBubbleMapScreenshot)(chain, token);
        await ctx.replyWithPhoto({ source: fs_1.default.createReadStream(screenshotPath) });
    }
    catch (err) {
        console.error(err);
        ctx.reply('⚠️ An error occurred while generating the bubble map.');
    }
});
bot.launch().then(() => {
    console.log('Bot is up and running!');
});
