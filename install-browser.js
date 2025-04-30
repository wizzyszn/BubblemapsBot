import { execSync } from 'child_process';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if we're running on Render
if (process.env.RENDER) {
    console.log('Running on Render.com - installing browser...');

    try {
        // Install Chrome using puppeteer
        execSync('apt-get update && apt-get install -y chromium', { stdio: 'inherit' });

        // Get the executable path
        const browserPath = process.env.CHROME_BIN || '/usr/bin/chromium';
        console.log(`Browser executable path: ${browserPath}`);

        // Create a file to help verify installation
        const installedFile = join(__dirname, '.chrome-installed');
        fs.writeFileSync(installedFile, `Chrome installed at ${new Date().toISOString()}`);

        if (fs.existsSync(browserPath)) {
            console.log('Browser executable exists, installation successful!');
            // Set environment variable for Puppeteer
            process.env.PUPPETEER_EXECUTABLE_PATH = browserPath;
        } else {
            console.log('Browser executable not found at:', browserPath);
            throw new Error('Chrome installation failed - executable not found');
        }
    } catch (error) {
        console.error('Failed to install browser:', error);
        process.exit(1);
    }
} else {
    console.log('Not running on Render.com, skipping browser installation');
}