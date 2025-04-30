import { Context } from "telegraf";

const help = (ctx: Context) => {
  const helpMessage = `
📋 <b>Available Commands</b>

🗺 <b>/bmap</b> <code>&lt;chain&gt; &lt;token&gt;</code>
- Generates bubble maps for the specified token on the given blockchain.
Example: /bmap eth 0x1234...

📊 <b>/dexscore</b> <code>&lt;chain&gt; &lt;token&gt;</code>
- Retrieves the decentralization score for a token.
Example: /dexscore eth 0x1234...

💰 <b>/mcap</b> <code>&lt;coin_name_or_symbol&gt;</code>
- Fetches the market capitalization for the specified coin.
Example: /mcap BTC

ℹ️ <b>/token</b> <code>&lt;chain&gt; &lt;contract_address&gt;</code>
- Provides detailed token information.
Example: /token eth 0x1234...

💡 Use the commands with the correct syntax for accurate results!`;

  return ctx.replyWithHTML(helpMessage);
};

export default help;
