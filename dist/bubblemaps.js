"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBubbleMapAvailable = isBubbleMapAvailable;
exports.generateBubbleMapScreenshot = generateBubbleMapScreenshot;
const puppeteer_1 = __importDefault(require("puppeteer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
/**
 * Check whether the bubble map is available.
 */
async function isBubbleMapAvailable(chain, token) {
    const res = await axios_1.default.get("https://api-legacy.bubblemaps.io/map-availability", {
        params: { chain, token },
    });
    return res.data.status === "OK" && res.data.availability === true;
}
/**
 * Generate a screenshot of the bubble map using a fixed 1920×1080 resolution.
 * Modified for local testing: loads iframe URL directly, no local server.
 */
async function generateBubbleMapScreenshot(chain, token) {
    let browser;
    // const htmlPath = path.join(process.cwd(), "temp-bmap.html"); // Not needed locally
    try {
        // Construct the Bubblemaps iframe URL
        const iframeUrl = `https://app.bubblemaps.io/${chain}/token/${token}?prevent_scroll_zoom&hide_context&small_text`;
        // --- Local testing: skip HTML file and server ---
        // Find an available port starting from 3001
        // const port = await portfinder.getPortPromise({ port: 3001 });
        // Start the HTTP server
        // ...server code commented out...
        // Launch Puppeteer with default configuration (Chromium auto-managed)
        console.log("Launching browser...");
        browser = await puppeteer_1.default.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--single-process",
                "--no-zygote",
            ],
        });
        console.log("Browser launched successfully!");
        const page = await browser.newPage();
        // Set viewport
        await page.setViewport({ width: 1920, height: 1080 });
        // Set a realistic user-agent and extra headers
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36");
        await page.setExtraHTTPHeaders({
            "accept-language": "en-US,en;q=0.9",
        });
        // Robust retry logic for page.goto and element wait
        const maxAttempts = 3;
        let attempt = 0;
        let lastError = null;
        let loaded = false;
        const timeouts = [60000, 90000, 120000]; // Increase timeout per attempt
        const selector = ".mapboxgl-canvas, canvas, svg, .map-container"; // Try common map selectors
        while (attempt < maxAttempts && !loaded) {
            try {
                console.log(`Attempt ${attempt + 1} to load bubblemap page...`);
                await page.goto(iframeUrl, {
                    waitUntil: "load",
                    timeout: timeouts[attempt],
                });
                // Wait for a map element to appear (up to 30s)
                await page.waitForSelector(selector, { timeout: 30000 });
                loaded = true;
            }
            catch (err) {
                console.warn(`Navigation or selector wait failed on attempt ${attempt + 1}:`, err);
                lastError = err;
                // Exponential backoff before retrying
                const backoff = 3000 * Math.pow(2, attempt);
                console.log(`Waiting ${backoff / 1000}s before retrying...`);
                await new Promise((resolve) => setTimeout(resolve, backoff));
            }
            attempt++;
        }
        if (!loaded) {
            console.error("All attempts to load the bubblemap page or find the map element failed.");
            throw lastError || new Error("Page did not load");
        }
        // Wait an additional 30 seconds to ensure the bubble map is fully rendered
        await new Promise((resolve) => setTimeout(resolve, 30000));
        // Use /tmp for Render or allow override via env
        const screenshotDir = process.env.SCREENSHOT_DIR || "/tmp";
        if (!fs_1.default.existsSync(screenshotDir)) {
            fs_1.default.mkdirSync(screenshotDir, { recursive: true });
        }
        const screenshotPath = path_1.default.join(screenshotDir, "bubblemap.png");
        await page.screenshot({ path: screenshotPath, fullPage: true });
        return screenshotPath;
    }
    catch (error) {
        console.error("Error generating screenshot:", error);
        throw error;
    }
    finally {
        // Cleanup
        if (browser) {
            await browser.close();
        }
        // if (fs.existsSync(htmlPath)) {
        //   fs.unlinkSync(htmlPath);
        // }
    }
}
// Handle process termination to ensure cleanup
// process.on("SIGINT", async () => {
//   console.log("Received SIGINT. Cleaning up...");
//   process.exit(0);
// });
//
// process.on("SIGTERM", async () => {
//   console.log("Received SIGTERM. Cleaning up...");
//   process.exit(0);
// });
