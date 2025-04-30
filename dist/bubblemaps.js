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
const http_1 = require("http");
const portfinder_1 = __importDefault(require("portfinder"));
function logBrowserInfo() {
    try {
        const browserPath = process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium";
        console.log(`Browser executable path: ${browserPath}`);
        if (fs_1.default.existsSync(browserPath)) {
            console.log("Browser executable exists!");
            const stats = fs_1.default.statSync(browserPath);
            console.log(`File size: ${stats.size} bytes`);
            console.log(`File permissions: ${stats.mode.toString(8)}`);
        }
        else {
            console.log("Browser executable does not exist!");
        }
    }
    catch (error) {
        console.error("Error checking browser:", error);
    }
}
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
 */
async function generateBubbleMapScreenshot(chain, token) {
    logBrowserInfo();
    let server;
    let browser;
    const htmlPath = path_1.default.join(process.cwd(), "temp-bmap.html");
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
        fs_1.default.writeFileSync(htmlPath, html);
        // Find an available port starting from 3001
        const port = await portfinder_1.default.getPortPromise({ port: 3001 });
        // Start the HTTP server
        server = (0, http_1.createServer)((req, res) => {
            fs_1.default.readFile(htmlPath, (err, data) => {
                if (err) {
                    res.writeHead(500);
                    res.end("Error loading HTML");
                    return;
                }
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(data);
            });
        });
        await new Promise((resolve, reject) => {
            server.listen(port, resolve);
            server.on("error", reject);
            setTimeout(() => reject(new Error("Server failed to start within 10 seconds")), 10000);
        });
        // Launch Puppeteer with proper configuration
        console.log("Launching browser...");
        browser = await puppeteer_1.default.launch({
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
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
        const screenshotPath = path_1.default.join(process.cwd(), "bubblemap.png");
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
        if (server) {
            await new Promise((resolve) => server.close(() => resolve()));
        }
        if (fs_1.default.existsSync(htmlPath)) {
            fs_1.default.unlinkSync(htmlPath);
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
