import { Context } from "telegraf";
import {
  generateBubbleMapScreenshot,
  isBubbleMapAvailable,
} from "../bubblemaps";
import fs from "fs";
const generateBubbleMaps = async (ctx: Context) => {
  if (!ctx.message || !("text" in ctx.message)) {
    await ctx.reply(
      "Please enter a valid blockchain address or type 'cancel' to exit."
    );
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
    return ctx.reply(
      "Invalid syntax for chain.\n\nUsage: /bmap eth|sol|bnb... <token>"
    );
  }
  if (!check) {
    await ctx.reply("Please enter a valid blockchain address");
    return;
  }
  try {
    const available = await isBubbleMapAvailable(chain, token);
    if (!available) {
      return ctx.reply("❌ This bubble map is not available yet.");
    }
    await ctx.reply("🧠 Generating bubble map...");
    const screenshotPath = await generateBubbleMapScreenshot(chain, token);
    await ctx.replyWithPhoto({ source: fs.createReadStream(screenshotPath) });
  } catch (err) {
    console.error(err);
    ctx.reply("⚠️ An error occurred while generating the bubble map.");
  }
};

export default generateBubbleMaps;
