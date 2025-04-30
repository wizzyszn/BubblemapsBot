"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const help = (ctx) => {
    const helpMessage = `
  **Available Commands:**
  
  **/bmap <chain> <token>**
  - Generates bubble maps for the specified token on the given blockchain.
  
  **/dexscore <chain_shorthand> <token_address>**
  - Retrieves the decentralization score for a token on the specified chain.
  
  **/mcap <coin_name_or_symbol>**
  - Fetches the market capitalization for the specified coin or symbol.
  
  **/token <chain> <contract_address>**
  - Provides detailed information about a token based on its chain and contract address.
  
  Use the commands with the correct syntax for accurate results!
    `;
    ctx.reply(helpMessage);
};
exports.default = help;
