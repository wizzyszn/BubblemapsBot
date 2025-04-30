"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bubblemaps_1 = require("../bubblemaps");
const fs_1 = __importDefault(require("fs"));
const generateBubbleMaps = async (ctx) => {
    if (!ctx.message || !("text" in ctx.message)) {
        await ctx.reply("Please enter a valid blockchain address or type 'cancel' to exit.");
        return;
    }
    const input = ctx.message.text.trim();
    const args = input.split(" ");
    if (args.length < 3) {
        return ctx.reply("Incorrect usage ❌\n\nUsage: /bmap <chain> <token>");
    }
    const token = args[2];
    const chain = args[1];
    if (input.toLowerCase() === "cancel") {
        await ctx.reply("Process canceled");
        return;
    }
    const regexPattern = /^(0x)?[a-zA-Z0-9]{25,64}$/;
    const check = regexPattern.test(token);
    if (chain.length > 3) {
        return ctx.reply("Invalid syntax for chain.\n\nUsage: /bmap eth|sol|bnb... <token>");
    }
    if (!check) {
        await ctx.reply("Please enter a valid blockchain address");
        return;
    }
    try {
        const available = await (0, bubblemaps_1.isBubbleMapAvailable)(chain, token);
        if (!available) {
            return ctx.reply("❌ This bubble map is not available yet.");
        }
        await ctx.reply("🧠 Generating bubble map...");
        const screenshotPath = await (0, bubblemaps_1.generateBubbleMapScreenshot)(chain, token);
        await ctx.replyWithPhoto({ source: fs_1.default.createReadStream(screenshotPath) });
    }
    catch (err) {
        console.error(err);
        ctx.reply("⚠️ An error occurred while generating the bubble map.");
    }
};
exports.default = generateBubbleMaps;
