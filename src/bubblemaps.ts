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
 */
export async function generateBubbleMapScreenshot(
  chain: string,
  token: string
): Promise<string> {
  let server: http.Server | undefined;
  let browser: Browser | undefined;
  const htmlPath = path.join(process.cwd(), "temp-bmap.html");

  try {
    // Construct the Bubblemaps iframe URL
    const iframeUrl = `https://app.bubblemaps.io/${chain}/token/${token}?prevent_scroll_zoom&hide_context&small_text`;

    // Create HTML content
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          html, body { margin: 0; padding: 0; }
        </style>
      </head>
      <body>
        <iframe src="${iframeUrl}" width="1920" height="1080" frameborder="0" style="border: none;"></iframe>
      </body>
      </html>
    `;

    // Write the HTML content to a temporary file
    fs.writeFileSync(htmlPath, html);

    // Find an available port starting from 3001
    const port = await portfinder.getPortPromise({ port: 3001 });

    // Start the HTTP server
    server = createServer((req, res) => {
      fs.readFile(htmlPath, (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end("Error loading HTML");
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(data);
      });
    });

    await new Promise<void>((resolve, reject) => {
      server!.listen(port, resolve);
      server!.on("error", reject);
      setTimeout(
        () => reject(new Error("Server failed to start within 10 seconds")),
        10000
      );
    });

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

    // Load the locally served HTML page
    await page.goto(`http://localhost:${port}`, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Wait for iframe content to load
    await new Promise((resolve) => setTimeout(resolve, 25000));

    // Take screenshot
    const screenshotPath = path.join(process.cwd(), "bubblemap.png");
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
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    if (fs.existsSync(htmlPath)) {
      fs.unlinkSync(htmlPath);
    }
  }
}

// Handle process termination to ensure cleanup
process.on("SIGINT", async () => {
  console.log("Received SIGINT. Cleaning up...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM. Cleaning up...");
  process.exit(0);
});
