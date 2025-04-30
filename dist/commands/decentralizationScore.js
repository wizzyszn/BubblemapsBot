"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const decentralizationScore = async (ctx) => {
    if (!ctx.message || !("text" in ctx.message)) {
        await ctx.reply("Please enter a valid command.");
        return;
    }
    const input = ctx.message.text.trim();
    const args = input.split(" ");
    if (args.length < 3) {
        return ctx.replyWithHTML("❌ <b>Incorrect usage</b>\n\n" +
            "📝 <b>Usage:</b> /dexscore <chain_shorthand> <token_address>\n\n" +
            "🔗 <b>Supported chains:</b> eth, bsc, ftm, avax, cro, arbi, poly, base, sol, sonic");
    }
    const tokenAddress = args[2];
    const chain = args[1];
    const coinInput = args.slice(1).join(" ").toLowerCase();
    const supportedChains = [
        "eth",
        "bsc",
        "ftm",
        "avax",
        "cro",
        "arbi",
        "poly",
        "base",
        "sol",
        "sonic",
    ];
    if (!supportedChains.find((supportedChain) => supportedChain === chain)) {
        return ctx.reply("❌Unsupported chain. Please use a valid chain shorthand.\n\nUsage: /dexscore <chain> <token_address>");
    }
    // Handle cancel command
    if (coinInput === "cancel") {
        await ctx.reply("Process canceled");
        return;
    }
    try {
        const response = await fetch(`https://api-legacy.bubblemaps.io/map-metadata?chain=${chain}&token=${tokenAddress}`);
        if (!response.ok) {
            return ctx.reply("🚫 Data not available for this token");
        }
        const data = await response.json();
        const responseMsg = `
🎯 <b>Decentralization Analysis</b>

📊 <b>Decentralization Score:</b> ${data.decentralisation_score}
🏦 <b>CEX Holdings:</b> ${data.identified_supply.percent_in_cexs}% (top 150 holders)
📜 <b>Smart Contract Holdings:</b> ${data.identified_supply.percent_in_contracts}% (top 150 holders)
    `;
        return ctx.replyWithHTML(responseMsg);
    }
    catch (err) {
        console.error("Error fetching Decentralization Score:", err);
        await ctx.reply("⚠️ An error occurred while fetching the data.\n\n" +
            "🔄 Please verify the token address and try again.");
    }
};
exports.default = decentralizationScore;
