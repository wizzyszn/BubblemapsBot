import { Telegraf } from 'telegraf';
import fs from 'fs';
import { isBubbleMapAvailable, generateBubbleMapScreenshot } from './bubblemaps';
import dotenv from "dotenv"
dotenv.config()
const bot = new Telegraf(process.env.BOT_TOKEN as string);

bot.command('bmap', async (ctx) => {
  console.log("bmap command received!");
  const chain = 'bsc';
  const token = '0x603c7f932ed1fc6575303d8fb018fdcbb0f39a95';

  try {
    const available = await isBubbleMapAvailable(chain, token);
    console.log("availability:", available)
    if (!available) {
      return ctx.reply('❌ This bubble map is not available yet.');
    }

    await ctx.reply('🧠 Generating bubble map...');

    const screenshotPath = await generateBubbleMapScreenshot(chain, token);
    await ctx.replyWithPhoto({ source: fs.createReadStream(screenshotPath) });
  } catch (err) {
    console.error(err);
    ctx.reply('⚠️ An error occurred while generating the bubble map.');
  }
});

bot.launch().then(() => {
  console.log('Bot is up and running!');
});
