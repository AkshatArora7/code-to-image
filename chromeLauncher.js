const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');

// Helper to determine whether we're in a Vercel serverless environment
const isVercelServerless = () => !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

// Robust browser launch function with specific settings for Vercel
async function getChromiumBrowser() {
  let browser = null;
  
  try {
    const executablePath = await chromium.executablePath;
    console.log('Executable path:', executablePath);
    
    const options = {
      args: chromium.args,
      executablePath: executablePath || process.env.CHROME_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
      headless: chromium.headless !== false,
      ignoreHTTPSErrors: true
    };
    
    // Additional settings specifically for serverless
    if (isVercelServerless()) {
      console.log('Running in serverless environment');
      options.args = [
        ...chromium.args,
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--no-first-run',
        '--single-process',
        '--disable-extensions'
      ];
    }
    
    browser = await puppeteer.launch(options);
    console.log('Browser launched successfully');
    
    return browser;
  } catch (error) {
    console.error('Failed to launch browser:', error);
    
    // If we're in development mode, try to fall back to a local Chrome
    if (!isVercelServerless()) {
      console.log('Attempting to fall back to local Chrome installation');
      try {
        browser = await puppeteer.launch({ 
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        return browser;
      } catch (localError) {
        console.error('Local Chrome fallback failed:', localError);
      }
    }
    
    throw error;
  }
}

module.exports = { getChromiumBrowser };
