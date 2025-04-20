import { Context } from "telegraf";
import axios from "axios";

// CoinGecko API base URL
const COINGECKO_API = "https://api.coingecko.com/api/v3";

const marketCap = async (ctx: Context) => {
  // Validate message input
  if (!ctx.message || !("text" in ctx.message)) {
    await ctx.reply("Please enter a valid command.");
    return;
  }

  const input = ctx.message.text.trim();
  const args = input.split(" ");
  if (args.length < 2) {
    return ctx.reply(
      "Incorrect usage ❌\n\nUsage: /mcap <coin_name_or_symbol>"
    );
  }

  const coinInput = args.slice(1).join(" ").toLowerCase(); // Support multi-word names (e.g., "cardano")

  // Handle cancel command
  if (coinInput === "cancel") {
    await ctx.reply("Process canceled");
    return;
  }

  try {
    // Search for the coin on CoinGecko
    const searchResponse = await axios.get(`${COINGECKO_API}/search`, {
      params: { query: coinInput },
    });

    const coins = searchResponse.data.coins;
    if (!coins || coins.length === 0) {
      return ctx.reply(
        `No cryptocurrency found for "${coinInput}". Try another name or symbol.`
      );
    }

    // Use the first matching coin (most relevant)
    const coin = coins[0];
    const coinId = coin.id;

    // Fetch market data for the coin
    const marketResponse = await axios.get(`${COINGECKO_API}/coins/${coinId}`, {
      params: {
        localization: false,
        tickers: false,
        community_data: false,
        developer_data: false,
      },
    });

    const marketData = marketResponse.data;
    const name = marketData.name;
    const symbol = marketData.symbol.toUpperCase();
    const price = marketData.market_data.current_price.usd;
    const totalSupply = marketData.market_data.total_supply
      ? marketData.market_data.total_supply.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })
      : "N/A"; // Some coins may not have total supply data
    const marketCap = marketData.market_data.market_cap.usd.toLocaleString(
      undefined,
      {
        maximumFractionDigits: 2,
      }
    );
    const volume = marketData.market_data.total_volume.usd.toLocaleString(
      undefined,
      {
        maximumFractionDigits: 2,
      }
    );

    // Format response
    const response = `
Coin: ${name} (${symbol})
Price (USD): $${price.toFixed(4)}
Total Supply: ${totalSupply} ${totalSupply !== "N/A" ? symbol : ""}
Market Cap: $${marketCap}
24h Volume: $${volume}
    `;

    await ctx.reply(response);
  } catch (err) {
    console.error("Error fetching market cap:", err);
    await ctx.reply(
      "An error occurred while fetching market cap. Please try again later or check the coin name."
    );
  }
};

export default marketCap;
