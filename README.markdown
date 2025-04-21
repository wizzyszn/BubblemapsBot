# **BubbleMapsBot**

BubbleMapsBot is a Telegram bot designed to provide users with comprehensive cryptocurrency and token information. It integrates with multiple APIs to fetch real-time data on market capitalization, token decentralization scores, bubble map visualizations in the form of screenshots, and detailed token metadata. The bot supports various blockchain networks and offers insights into token distribution and market performance.

## Features

### 1. Market Capitalization (`/mcap`)

- **Description**: Retrieves market data for a specified cryptocurrency, including price, total supply, market cap, and 24-hour trading volume.
- **Command**: `/mcap <coin_name_or_symbol>`
- **Example**: `/mcap bitcoin`
- **Output**: Provides coin name, symbol, USD price, total supply, market cap, and 24-hour volume.
- **Supported Input**: Multi-word coin names (e.g., "cardano") or symbols (e.g., "ada").

### 2. Decentralization Score (`/dexscore`)

- **Description**: Fetches a token's decentralization score and distribution metrics from BubbleMaps, focusing on the top 150 holders.
- **Command**: `/dexscore <chain_shorthand> <token_address>`
- **Example**: `/dexscore eth 0x123...`
- **Output**: Decentralization score (0-100), percentage of supply in centralized exchanges (CEXs), and percentage in smart contracts.
- **Supported Chains**: `eth`, `bsc`, `ftm`, `avax`, `cro`, `arbi`, `poly`, `base`, `sol`, `sonic`.

### 3. Bubble Map Generation (`/bmap`)

- **Description**: Generates a visual bubble map representing token holder distribution using BubbleMaps.
- **Command**: `/bmap <chain> <token>`
- **Example**: `/bmap eth 0x123...`
- **Output**: A screenshot of the bubble map sent as a photo, if available.
- **Validation**: Validates token address format and checks bubble map availability before generation.

### 4. Token Information (`/token`)

- **Description**: Provides comprehensive token data, including market metrics, decentralization scores, and bubble maps, with insights based on data analysis.
- **Command**: `/token <chain> <contract_address>`
- **Example**: `/token eth 0x123...`
- **Output**:
  - Chain, price, market cap, 24-hour volume, and price change.
  - Decentralization score, supply in CEXs, and supply in contracts.
  - Insights (e.g., "Highly decentralized token distribution" for scores &gt; 80).
  - Bubble map (if available).
- **Supported Chains**: Same as `/dexscore`.
- **Validation**: Checks for valid contract address format and supported chains.

### Additional Features

- **Cancel Command**: Users can type `cancel` to exit any command process.
- **Error Handling**: Robust error handling for API failures, invalid inputs, and timeouts.
- **Insights Generation**: Provides actionable insights based on decentralization scores, price changes, and trading volume.

## Technology Used

### Core Technologies

- **Node.js**: Runtime environment for executing JavaScript server-side.
- **TypeScript**: Used for type safety and improved code maintainability.
- **Telegraf**: A modern Telegram bot framework for Node.js, used to handle bot commands and interactions.
- **Ethers.js**: Library for interacting with Ethereum-based blockchains to fetch token metadata and supply.
- **Alchemy SDK**: Provides blockchain data access for token metadata and contract interactions.
- **Axios**: HTTP client for making API requests to CoinGecko, BubbleMaps, and Etherscan.
- **Puppeteer**: Package for generaitng screenshot from a browser.

### APIs and Services

- **CoinGecko API**: Fetches market data, including price, market cap, volume, and coin metadata.
  - Base URL: `https://api.coingecko.com/api/v3`
- **BubbleMaps API**: Provides decentralization scores and bubble map data for token holder distribution.
  - Base URL: `https://api-legacy.bubblemaps.io`
- **Etherscan API**: Checks contract verification status for Ethereum tokens.
  - Base URL: `https://api.etherscan.io/api`
- **Alchemy API**: Retrieves token metadata and supply for supported chains.

### Supported Blockchains

- Ethereum (`eth`)
- Binance Smart Chain (`bsc`)
- Fantom (`ftm`)
- Avalanche (`avax`)
- Crypto.com Chain (`cro`)
- Arbitrum (`arbi`)
- Polygon (`poly`)
- Base (`base`)
- Solana (`sol`)
- Sonic (`sonic`)

## Core Implementation Methodologies

### 1. Modular Command Structure

- Each command (`/mcap`, `/dexscore`, `/bmap`, `/token`) is implemented as a separate module, exported as a default function that takes a `Context` object from Telegraf.
- This modular approach ensures maintainability and allows for easy addition of new commands.

### 2. Input Validation

- **Command Arguments**: Each command validates the number of arguments and their format (e.g., chain shorthand, token address).
  - Example: `/dexscore` requires at least three arguments: command, chain, and token address.
- **Chain Validation**: Checks if the provided chain is in the supported list.
- **Address Validation**: Uses regex patterns to validate token/contract addresses (e.g., `^(0x)?[a-fA-F0-9]{40}$` for Ethereum addresses).
- **Cancel Handling**: Supports a `cancel` command to gracefully exit processes.

### 3. Asynchronous API Calls

- All API requests are handled asynchronously using `async/await` for better performance and readability.
- **Concurrent Data Fetching**: The `/token` command uses `Promise.allSettled` to fetch data from multiple APIs (BubbleMaps, Alchemy, CoinGecko, Etherscan) concurrently, reducing latency.
- **Timeout Handling**: Implements a `promiseWithTimeout` utility to prevent API calls from hanging indefinitely (e.g., 10 seconds for most APIs, 60 seconds for bubble map generation).

### 4. Retry Mechanism

- A `retry` utility is used to handle transient API failures by retrying requests up to three times with a 1-second delay between attempts.
- Example: Used in `/token` for BubbleMaps, Alchemy, CoinGecko, and Etherscan API calls.

### 5. Error Handling

- Comprehensive error handling for API failures, invalid inputs, and unexpected errors.
- Errors are logged to the console for debugging and user-friendly messages are sent to Telegram users.
- Example: If the CoinGecko API fails in `/mcap`, the bot replies with "An error occurred while fetching market cap. Please try again later or check the coin name."

### 6. Data Processing and Insights

- **Decentralization Metrics**: Parses BubbleMaps data to extract decentralization scores and supply distribution.
- **Market Data**: Formats CoinGecko data with proper localization for numbers (e.g., `toLocaleString` for market cap and volume).
- **Insights Generation**: Analyzes data to provide insights, such as high decentralization, significant price changes, or high trading activity.
- **Fallback Mechanisms**: Uses CoinGecko search API as a fallback for token metadata if Alchemy data is unavailable.

### 7. File Handling

- Bubble map screenshots are generated and sent as photos using Node.js `fs` module for file streaming.
- Checks for file existence before sending to avoid errors.

### 8. Blockchain Interaction

- Uses `ethers.js` and Alchemy SDK to interact with blockchain contracts for token metadata (name, symbol, decimals, total supply).
- Implements a minimal ERC-20 ABI to query `totalSupply`, `name`, `symbol`, and `decimals`.

## Installation Guide

### Prerequisites

- **Node.js**: Version 16 or higher.
- **npm**: Node package manager (comes with Node.js).
- **Telegram Bot Token**: Obtain from BotFather on Telegram.
- **API Keys**:
  - **Alchemy API Key**: Sign up at Alchemy and get an API key.
  - **Etherscan API Key**: Sign up at Etherscan for contract verification (optional, only for Ethereum).
- **Environment**: A `.env` file for storing sensitive keys.

### Step-by-Step Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/your-repo/cryptobot.git
   cd cryptobot
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

   Required packages:

   - `telegraf`
   - `axios`
   - `alchemy-sdk`
   - `ethers`
   - `fs` (built-in Node.js module)

3. **Set Up Environment Variables**Create a `.env` file in the project root and add the following:

   ```env
   TELEGRAM_BOT_TOKEN=your-telegram-bot-token
   ALCHEMY_API_KEY=your-alchemy-api-key
   ETHERSCAN_API_KEY=your-etherscan-api-key
   ```

   Replace `your-telegram-bot-token`, `your-alchemy-api-key`, and `your-etherscan-api-key` with your actual keys.

4. **Directory Structure**Ensure the following structure:

   ```
   cryptobot/
   ├── src/
   │   ├── commands/
   │   │   ├── decentralizationScore.ts
   │   │   ├── generateBubbleMaps.ts
   │   │   ├── marketCap.ts
   │   │   ├── tokenInfo.ts
   │   ├── bubblemaps/
   │   │   ├── index.ts
   │   ├── bot.ts
   ├── .env
   ├── package.json
   ├── tsconfig.json
   ```

5. **Configure TypeScript**Ensure a `tsconfig.json` file exists with the following configuration:

   ```json
   {
     "compilerOptions": {
       "target": "ES2018",
       "module": "commonjs",
       "outDir": "./dist",
       "rootDir": "./src",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true
     }
   }
   ```

6. **Build the Project**

   ```bash
   npm run build
   ```

   This compiles TypeScript files from `src/` to `dist/`.

7. **Run the Bot**

   ```bash
   npm start
   ```

   The bot should now be running and responsive to Telegram commands.

### Testing the Bot

1. Start a chat with your bot on Telegram (e.g., `@YourCryptoBot`).
2. Try the following commands:
   - `/mcap bitcoin`
   - `/dexscore eth 0x123...`
   - `/bmap eth 0x123...`
   - `/token eth 0x123...`
3. Verify responses and ensure bubble map images are sent correctly.

### Troubleshooting

- **Bot Not Responding**: Check the Telegram bot token and ensure the bot is not blocked.
- **API Errors**: Verify API keys in `.env` and ensure you have not exceeded rate limits.
- **Bubble Map Issues**: Ensure the `bubblemaps` module is correctly implemented and the BubbleMaps API is accessible.
- **Logs**: Check console logs for detailed error messages.

## Usage Notes

- **Rate Limits**: Be aware of API rate limits (e.g., CoinGecko free tier has limits).
- **Chain Support**: Not all chains are supported by Alchemy; fallback to CoinGecko for metadata.
- **Bubble Maps**: Availability depends on BubbleMaps API; some tokens may not have maps.
- **Environment**: Keep `.env` secure and do not commit it to version control.
