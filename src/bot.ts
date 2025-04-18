import { Telegraf } from "telegraf";
import dotenv from "dotenv";
dotenv.config();
const bot = new Telegraf(process.env.BOT_TOKEN as string);

bot.start((ctx) => {
  ctx.reply("Welcome to bubblemaps Analyzer Bot");
});

bot
  .launch()
  .then(() => {
    console.log("This Bot is now running........");
  })
  .catch((err) => {
    console.log(`Something went wrong ${err}`);
  });
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));