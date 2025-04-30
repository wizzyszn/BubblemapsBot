import { execSync } from 'child_process';
import fs  from 'fs';
import path  from 'path';

// Check if we're running on Render
if (process.env.RENDER) {
  console.log('Running on Render.com - installing browser...');
  
  try {
    // Use puppeteer CLI to install Chrome
    execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
    console.log('Chrome installation completed successfully');
    
    // Create a file to help verify installation
    const installedFile = path.join(__dirname, '.chrome-installed');
    fs.writeFileSync(installedFile, `Chrome installed at ${new Date().toISOString()}`);
    
    // Log the browser path for debugging
    const browserPath = require('puppeteer').executablePath();
    console.log(`Browser executable path: ${browserPath}`);
    
    if (fs.existsSync(browserPath)) {
      console.log('Browser executable exists, installation successful!');
    } else {
      console.log('Browser executable not found, installation may have failed.');
    }
  } catch (error) {
    console.error('Failed to install browser:', error);
  }
} else {
  console.log('Not running on Render.com, skipping browser installation');
}