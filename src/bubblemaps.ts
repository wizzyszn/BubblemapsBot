import puppeteer, { Browser } from "puppeteer";
import fs from "fs";
import http from "http";
import path from "path";
import axios from "axios";
import { createServer } from "http";
import portfinder from "portfinder";

/**
 * Check whether the bubble map is available.
 */
export async function isBubbleMapAvailable(
  chain: string,
  token: string
): Promise<boolean> {
  const res = await axios.get(
    "https://api-legacy.bubblemaps.io/map-availability",
    {
      params: { chain, token },
    }
  );
  return res.data.status === "OK" && res.data.availability === true;
}

/**
 * Generate a screenshot of the bubble map using a fixed 1920×1080 resolution.
 * Modified for local testing: loads iframe URL directly, no local server.
 */
export async function generateBubbleMapScreenshot(
  chain: string,
  token: string
): Promise<string> {
  let browser: Browser | undefined;
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
    browser = await puppeteer.launch({
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
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "accept-language": "en-US,en;q=0.9",
    });

    // Robust retry logic for page.goto and element wait
    const maxAttempts = 3;
    let attempt = 0;
    let lastError: any = null;
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
      } catch (err) {
        console.warn(
          `Navigation or selector wait failed on attempt ${attempt + 1}:`,
          err
        );
        lastError = err;
        // Exponential backoff before retrying
        const backoff = 3000 * Math.pow(2, attempt);
        console.log(`Waiting ${backoff / 1000}s before retrying...`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
      attempt++;
    }
    if (!loaded) {
      console.error(
        "All attempts to load the bubblemap page or find the map element failed."
      );
      throw lastError || new Error("Page did not load");
    }

    // Wait an additional 30 seconds to ensure the bubble map is fully rendered
    await new Promise((resolve) => setTimeout(resolve, 30000));

    // Use /tmp for Render or allow override via env
    const screenshotDir = process.env.SCREENSHOT_DIR || "/tmp";
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const screenshotPath = path.join(screenshotDir, "bubblemap.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    return screenshotPath;
  } catch (error) {
    console.error("Error generating screenshot:", error);
    throw error;
  } finally {
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
