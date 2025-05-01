import { Context } from "telegraf";
import axios from "axios";
import { Alchemy, Network } from "alchemy-sdk";
import fs from "fs";
import { Contract, ethers } from "ethers";
import {
  generateBubbleMapScreenshot,
  isBubbleMapAvailable,
} from "../bubblemaps";

// Utility to wrap promises with a timeout
const promiseWithTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  errorMsg: string
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(errorMsg));
    }, ms);
    promise
      .then((result) => {
        clearTimeout(timeout);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timeout);
        reject(err);
      });
  });
};

// Retry utility for API calls
const retry = async <T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Retry limit reached");
};

// CoinGecko API base URL
const COINGECKO_API = "https://api.coingecko.com/api/v3";

// Etherscan API base URL
const ETHERSCAN_API = "https://api.etherscan.io/api";

// BubbleMaps API base URL
const BUBBLEMAPS_API = "https://api-legacy.bubblemaps.io";

// ERC-20 ABI for totalSupply and metadata
const ERC20_ABI = [
  "function totalSupply() view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

// Supported chains
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

// Chain to CoinGecko platform mapping
const chainIdToPlatform: { [key: string]: string } = {
  eth: "ethereum",
  bsc: "binance-smart-chain",
  ftm: "fantom",
  avax: "avalanche",
  cro: "crypto-com-chain",
  arbi: "arbitrum",
  poly: "polygon-pos",
  base: "base",
  sol: "solana",
  sonic: "sonic",
};

// Chain to Alchemy network mapping
const chainMapper: { [key: string]: Network } = {
  eth: Network.ETH_MAINNET,
  avx: Network.AVAX_MAINNET,
  base: Network.BASE_MAINNET,
  bnb: Network.BNB_MAINNET,
};

// Alchemy configuration
const alchemyConfig = {
  apiKey: process.env.ALCHEMY_API_KEY || "your-alchemy-api-key",
  network: Network.ETH_MAINNET,
};

const tokenInfo = async (ctx: Context) => {
  if (!ctx.message || !("text" in ctx.message)) {
    await ctx.reply("Please enter a valid command.");
    return;
  }

  const input = ctx.message.text;
  const args = input.split(" ");
  if (args.length < 3) {
    return ctx.replyWithHTML(
      "❌ <b>Incorrect usage</b>\n\n" +
        "📝 <b>Usage:</b> /token <chain> <contract_address>\n\n" +
        "🔗 <b>Supported chains:</b> " +
        supportedChains.join(", ") +
        "\n" +
        "💡 <b>Example:</b> /token eth 0x1234..."
    );
  }

  const chain = args[1].toLowerCase();
  const contractAddress = args[2];

  if (input.toLowerCase() === "cancel") {
    await ctx.reply("Process canceled");
    return;
  }

  if (!supportedChains.includes(chain)) {
    return ctx.reply(
      `Unsupported chain ❌\n\nValid chains are: ${supportedChains.join(", ")}`
    );
  }

  const regexPattern = /^(0x)?[a-fA-F0-9]{40}$/;
  if (!regexPattern.test(contractAddress)) {
    return ctx.reply("Invalid contract address ❌");
  }

  try {
    let alchemy: Alchemy | null = null;
    if (chainMapper[chain]) {
      alchemy = new Alchemy({ ...alchemyConfig, network: chainMapper[chain] });
    }

    // 1. Bubble map
    let bubbleMapPath: string | null = null;
    try {
      console.log(
        `Checking bubble map availability for ${chain}:${contractAddress}`
      );
      const available = await retry(() =>
        promiseWithTimeout(
          isBubbleMapAvailable(chain, contractAddress),
          10000,
          "Bubble map availability check timed out"
        )
      );
      if (available) {
        await ctx.reply("🧠 Generating bubble map...");
        console.log(`Generating bubble map for ${chain}:${contractAddress}`);
        bubbleMapPath = await retry(() =>
          promiseWithTimeout(
            generateBubbleMapScreenshot(chain, contractAddress),
            60000, // Increased for major tokens
            "Bubble map generation timed out"
          )
        );
      } else {
        await ctx.reply("⚠️ Bubble map not available for this token.");
        console.log(`Bubble map not available for ${chain}:${contractAddress}`);
      }
    } catch (err) {
      console.error(`Bubble map error for ${chain}:${contractAddress}:`, err);
      await ctx.reply("⚠️ Failed to generate bubble map.");
    }

    // 2. Fetch data concurrently
    const [
      decentralizationResult,
      tokenMetadataResult,
      marketDataResult,
      contractVerificationResult,
      coinGeckoMetadataResult,
    ] = await Promise.allSettled([
      // Decentralization score (BubbleMaps)
      retry(() =>
        promiseWithTimeout(
          axios.get(
            `${BUBBLEMAPS_API}/map-metadata?chain=${chain}&token=${contractAddress}`
          ),
          10000,
          "BubbleMaps API timed out"
        )
      ),
      // Token metadata and supply (Alchemy + ethers)
      alchemy
        ? retry(() =>
            promiseWithTimeout(
              (async () => {
                const provider = new ethers.JsonRpcProvider(
                  `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
                );
                const contract = new Contract(
                  contractAddress,
                  ERC20_ABI,
                  provider
                );
                const [metadata, supplyRaw] = await Promise.all([
                  alchemy!.core.getTokenMetadata(contractAddress),
                  contract.totalSupply().catch(() => null),
                  contract.name().catch(() => null),
                  contract.symbol().catch(() => null),
                  contract.decimals().catch(() => null),
                ]);
                return [
                  metadata,
                  supplyRaw?.toString() || null,
                  metadata.name || (await contract.name().catch(() => null)),
                  metadata.symbol ||
                    (await contract.symbol().catch(() => null)),
                  metadata.decimals ||
                    (await contract.decimals().catch(() => 18)),
                ];
              })(),
              10000,
              "Alchemy API timed out"
            )
          )
        : Promise.resolve(null),
      // Market data (CoinGecko)
      retry(() =>
        promiseWithTimeout(
          axios.get(
            `${COINGECKO_API}/simple/token_price/${
              chainIdToPlatform[chain] || "ethereum"
            }`,
            {
              params: {
                contract_addresses: contractAddress,
                vs_currencies: "usd",
                include_market_cap: true,
                include_24hr_vol: true,
                include_24hr_change: true,
              },
            }
          ),
          10000,
          "CoinGecko API timed out"
        )
      ),
      // Contract verification (Etherscan, only for eth)
      chain === "eth"
        ? retry(() =>
            promiseWithTimeout(
              axios.get(ETHERSCAN_API, {
                params: {
                  module: "contract",
                  action: "getsourcecode",
                  address: contractAddress,
                  apikey:
                    process.env.ETHERSCAN_API_KEY || "your-etherscan-api-key",
                },
              }),
              10000,
              "Etherscan API timed out"
            )
          )
        : Promise.resolve(null),
      // CoinGecko metadata fallback
      retry(() =>
        promiseWithTimeout(
          axios.get(`${COINGECKO_API}/search`, {
            params: { query: contractAddress },
          }),
          10000,
          "CoinGecko search API timed out"
        )
      ),
    ]);

    // Process decentralization score
    let decentralizationData = {
      score: 0,
      percentInCexs: 0,
      percentInContracts: 0,
    };
    if (
      decentralizationResult.status === "fulfilled" &&
      decentralizationResult.value.status === 200
    ) {
      const data = decentralizationResult.value.data;
      decentralizationData = {
        score: data.decentralisation_score || 0,
        percentInCexs: data.identified_supply?.percent_in_cexs || 0,
        percentInContracts: data.identified_supply?.percent_in_contracts || 0,
      };
    } else {
      console.error(
        `Decentralization score fetch failed for ${chain}:${contractAddress}:`,
        decentralizationResult.status === "rejected"
          ? decentralizationResult.reason
          : "API error"
      );
    }

    // Process token metadata
    let name = "Unknown";
    let symbol = "N/A";
    let decimals = 18;
    let totalSupply = "N/A";
    if (
      tokenMetadataResult?.status === "fulfilled" &&
      tokenMetadataResult.value
    ) {
      const [
        metadata,
        supplyRaw,
        contractName,
        contractSymbol,
        contractDecimals,
      ] = tokenMetadataResult.value;
      if (metadata && metadata.name && metadata.symbol) {
        name = metadata.name;
        symbol = metadata.symbol.toUpperCase();
        decimals = metadata.decimals || contractDecimals || 18;
      } else if (contractName && contractSymbol) {
        name = contractName;
        symbol = contractSymbol.toUpperCase();
        decimals = contractDecimals || 18;
      }
      if (supplyRaw) {
        totalSupply = (parseInt(supplyRaw, 10) / 10 ** decimals).toLocaleString(
          undefined,
          {
            maximumFractionDigits: 2,
          }
        );
      }
    } else {
      console.error(
        `Token metadata fetch failed for ${chain}:${contractAddress}:`,
        tokenMetadataResult?.status === "rejected"
          ? tokenMetadataResult.reason
          : "No data"
      );
    }

    // Fallback to CoinGecko metadata
    if (name === "Unknown" && coinGeckoMetadataResult.status === "fulfilled") {
      const coins = coinGeckoMetadataResult.value.data.coins;
      if (coins && coins.length > 0) {
        const coin = coins.find(
          (c: any) =>
            c.contract_address?.toLowerCase() ===
              contractAddress.toLowerCase() &&
            c.platforms?.[chainIdToPlatform[chain]]
        );
        if (coin) {
          name = coin.name;
          symbol = coin.symbol.toUpperCase();
          if (coin.total_supply) {
            totalSupply = parseFloat(coin.total_supply).toLocaleString(
              undefined,
              {
                maximumFractionDigits: 2,
              }
            );
          }
        }
      }
      console.log(
        `CoinGecko metadata fallback for ${chain}:${contractAddress}:`,
        name,
        symbol,
        totalSupply
      );
    }

    // Process market data
    let price: number | null = null;
    let marketCap: string | null = null;
    let volume: string | null = null;
    let priceChange24h: string | null = null;
    if (marketDataResult.status === "fulfilled") {
      const priceData =
        marketDataResult.value.data[contractAddress.toLowerCase()];
      console.log(
        `CoinGecko market data for ${chain}:${contractAddress}:`,
        priceData
      );
      if (priceData) {
        price = priceData.usd;
        marketCap = priceData.usd_market_cap?.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        });
        volume = priceData.usd_24h_vol?.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        });
        priceChange24h = priceData.usd_24h_change?.toFixed(2);
      }
    } else {
      console.error(
        `Market data fetch failed for ${chain}:${contractAddress}:`,
        marketDataResult.status === "rejected"
          ? marketDataResult.reason
          : "No data"
      );
    }

    // Cross-check market cap with CoinGecko /coins/{id}
    if (marketCap && parseFloat(marketCap.replace(/,/g, "")) < 4000000000) {
      try {
        const searchResponse = await retry(() =>
          promiseWithTimeout(
            axios.get(`${COINGECKO_API}/search`, {
              params: { query: contractAddress },
            }),
            10000,
            "CoinGecko search API timed out"
          )
        );
        const coin = searchResponse.data.coins.find(
          (c: any) =>
            c.contract_address?.toLowerCase() ===
              contractAddress.toLowerCase() &&
            c.platforms?.[chainIdToPlatform[chain]]
        );
        if (coin) {
          const coinData = await retry(() =>
            promiseWithTimeout(
              axios.get(`${COINGECKO_API}/coins/${coin.id}`, {
                params: {
                  localization: false,
                  tickers: false,
                  community_data: false,
                  developer_data: false,
                },
              }),
              10000,
              "CoinGecko coin data API timed out"
            )
          );
          marketCap = coinData.data.market_data.market_cap.usd.toLocaleString(
            undefined,
            {
              maximumFractionDigits: 2,
            }
          );
          volume = coinData.data.market_data.total_volume.usd.toLocaleString(
            undefined,
            {
              maximumFractionDigits: 2,
            }
          );
          console.log(
            `Updated market data for ${chain}:${contractAddress}:`,
            marketCap,
            volume
          );
        }
      } catch (err) {
        console.error(
          `Market data cross-check failed for ${chain}:${contractAddress}:`,
          err
        );
      }
    }

    // Process contract verification
    let contractStatus = "Unknown";
    if (
      contractVerificationResult?.status === "fulfilled" &&
      contractVerificationResult.value?.data.result[0]
    ) {
      contractStatus = contractVerificationResult.value.data.result[0]
        .SourceCode
        ? "Verified"
        : "Unverified";
      console.log(
        `Etherscan result for ${chain}:${contractAddress}:`,
        contractVerificationResult.value.data.result[0]
      );
    } else {
      console.error(
        `Contract verification fetch failed for ${chain}:${contractAddress}:`,
        contractVerificationResult?.status === "rejected"
          ? contractVerificationResult.reason
          : "No data"
      );
    }

    // Generate insights
    const insights = [];
    if (decentralizationData.score > 80) {
      insights.push("Highly decentralized token distribution");
    }
    if (priceChange24h && parseFloat(priceChange24h) > 10) {
      insights.push("Significant price increase in the last 24 hours");
    }
    if (volume && parseFloat(volume.replace(/,/g, "")) > 50000000) {
      insights.push("High trading activity");
    }
    if (decentralizationData.percentInCexs > 50) {
      insights.push("High concentration in centralized exchanges");
    }
    if (priceChange24h && Math.abs(parseFloat(priceChange24h)) < 1) {
      insights.push("Stable price");
    }

    // Format response
    const response = `
🔗 <b>Chain:</b> ${chain.toUpperCase()}
💰 <b>Price (USD):</b> $${price ? price.toFixed(4) : "N/A"}
📊 <b>Market Cap:</b> $${marketCap || "N/A"}
📈 <b>24h Volume:</b> $${volume || "N/A"}
📉 <b>24h Price Change:</b> ${priceChange24h ? priceChange24h + "%" : "N/A"}
🎯 <b>Decentralization Score:</b> ${decentralizationData.score}/100
🏦 <b>Supply in CEXs:</b> ${decentralizationData.percentInCexs}%
📝 <b>Supply in Contracts:</b> ${decentralizationData.percentInContracts}%
💡 <b>Insights:</b> ${
      insights.length > 0 ? insights.join(", ") : "No notable insights"
    }`;

    // Send bubble map
    if (bubbleMapPath && fs.existsSync(bubbleMapPath)) {
      await ctx.replyWithPhoto({ source: fs.createReadStream(bubbleMapPath) });
      console.log(`Bubble map sent for ${chain}:${contractAddress}`);
    } else if (bubbleMapPath) {
      console.error(`Bubble map file missing: ${bubbleMapPath}`);
      await ctx.reply("⚠️ Bubble map generated but file is missing.");
    }

    // Send token info
    await ctx.replyWithHTML(response);
  } catch (err) {
    console.error(`Error in tokenInfo for ${chain}:${contractAddress}:`, err);
    await ctx.reply(
      "An error occurred while fetching token data. Some information may be unavailable."
    );
  }
};

export default tokenInfo;
