const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('chrome-aws-lambda');
const hljs = require('highlight.js');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const helmet = require('helmet');
const crypto = require('crypto');
const NodeCache = require('node-cache');

const app = express();
const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 }); // 10-min cache

// Security and performance middleware
app.use(compression());
app.use(helmet());
app.use(express.json({ limit: '5mb' }));

// Rate limiting
app.use('/image', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests' }
}));

// Enhanced LinkedIn-optimized themes with more minimal aesthetic
const themes = {
  dracula: {
    bg: '#282a36',
    fg: '#f8f8f2',
    highlight: '#ff79c6',
    comment: '#6272a4',
    windowBg: '#1e1f29',
    string: '#a9dc76',
    number: '#bd93f9',
    property: '#66d9ef'
  },
  light: {
    bg: '#ffffff',
    fg: '#333333',
    highlight: '#0077b5', // LinkedIn blue
    comment: '#888888',
    windowBg: '#f5f5f5',
    string: '#50a14f',
    number: '#986801',
    property: '#e45649'
  },
  gradient: {
    bg: 'linear-gradient(135deg, #0077b5, #00a0dc)', // LinkedIn colors
    fg: '#ffffff',
    highlight: '#ffffff',
    comment: '#e1e1e1',
    windowBg: '#ffffff',
    string: '#d4ff80',
    number: '#ffcfd7',
    property: '#a2eeff'
  },
  github: {
    bg: '#ffffff',
    fg: '#24292e',
    highlight: '#005cc5',
    comment: '#6a737d',
    windowBg: '#f6f8fa',
    string: '#22863a',
    number: '#e36209',
    property: '#d73a49'
  },
  modern: {
    bg: '#1a1a1a',
    fg: '#f8f8f2',
    highlight: '#79b8ff',
    comment: '#959da5',
    windowBg: '#121212',
    string: '#9ece6a',
    number: '#ff79c6',
    property: '#7dcfff'
  },
  minimal: {
    bg: '#ffffff',
    fg: '#222222',
    highlight: '#2d68c4',
    comment: '#989898',
    windowBg: '#fafafa',
    string: '#3e8774',
    number: '#b76b01',
    property: '#df4353'
  },
  carbon: {
    bg: '#151718',
    fg: '#e6e6e6',
    highlight: '#5ab3ff',
    comment: '#a0a0a0',
    windowBg: '#0d0e0f',
    string: '#9ece6a',
    number: '#ffb86c',
    property: '#5ab3ff'
  },
  nord: {
    bg: '#2e3440',
    fg: '#d8dee9',
    highlight: '#88c0d0',
    comment: '#636f88',
    windowBg: '#232730',
    string: '#a3be8c',
    number: '#b48ead',
    property: '#81a1c1'
  },
  solarized: {
    bg: '#fdf6e3',
    fg: '#657b83',
    highlight: '#268bd2',
    comment: '#93a1a1',
    windowBg: '#eee8d5',
    string: '#2aa198',
    number: '#d33682',
    property: '#6c71c4'
  },
  onedark: {
    bg: '#282c34',
    fg: '#abb2bf',
    highlight: '#61afef',
    comment: '#5c6370',
    windowBg: '#21252b',
    string: '#98c379',
    number: '#d19a66',
    property: '#e06c75'
  },
  "linkedin-pro": {
    bg: '#1d2026',
    fg: '#e4e6eb',
    highlight: '#0a66c2',
    comment: '#8f9299',
    windowBg: '#16181d',
    string: '#5caa70',
    number: '#c27ba0',
    property: '#64a5d6'
  }
};

// Add vibrant gradients to match the example image
const gradients = {
  // Professional gradients for LinkedIn
  'linkedin': 'linear-gradient(135deg, #0077b5, #00a0dc)',
  'bluemarine': 'linear-gradient(135deg, #1e3c72, #2a5298)',
  'sunset': 'linear-gradient(135deg, #ff7e5f, #feb47b)',
  'emerald': 'linear-gradient(135deg, #43cea2, #185a9d)',
  'passion': 'linear-gradient(135deg, #f43b47, #453a94)',
  'cool': 'linear-gradient(135deg, #4facfe, #00f2fe)',
  'warm': 'linear-gradient(135deg, #ff9966, #ff5e62)',
  'night': 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
  'royal': 'linear-gradient(135deg, #141e30, #243b55)',
  'silver': 'linear-gradient(135deg, #bdc3c7, #2c3e50)',
  'subtle': 'linear-gradient(135deg, #f5f7fa, #c3cfe2)',
  'elegant': 'linear-gradient(135deg, #08203e, #557c93)',
  'tech': 'linear-gradient(135deg, #051937, #004d7a, #008793)',
  'faded': 'linear-gradient(135deg, rgba(0,0,0,0.03), rgba(0,0,0,0.08))',
  'shadow': 'linear-gradient(135deg, rgba(15,23,42,0.2), rgba(15,23,42,0.1))',
  // New vibrant gradients
  'fiery': 'linear-gradient(135deg, #f12711, #f5af19)',
  'vivid': 'linear-gradient(135deg, #ee0979, #ff6a00)',
  'crimson': 'linear-gradient(135deg, #8E0E00, #1F1C18)',
  'redhot': 'linear-gradient(135deg, #CB356B, #BD3F32)',
  'ember': 'linear-gradient(135deg, #ff4e50, #f9d423)',
  'flame': 'linear-gradient(135deg, #ff416c, #ff4b2b)'
};

// Replace the browser promise with a singleton pattern
let browser = null;
let browserError = null;

// Proper browser management with environment detection
async function getBrowser() {
  // Return existing browser instance if available
  if (browser) return browser;
  // Throw if we already encountered an error
  if (browserError) throw browserError;
  
  try {
    // Determine if we're in local or serverless environment
    const executablePath = await chromium.executablePath;
    const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.VERCEL;
    
    const launchOptions = {
      args: chromium.args || [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
      defaultViewport: chromium.defaultViewport || { width: 1400, height: 1400 },
      executablePath: executablePath,
      headless: chromium.headless || true,
      ignoreHTTPSErrors: true
    };

    // Log launch info for debugging
    console.log('Launching browser in environment:', isLambda ? 'serverless' : 'local');
    console.log('Using executable path:', executablePath);
    
    browser = await puppeteer.launch(launchOptions);
    console.log('Browser launched successfully');
    
    // Clean up on browser disconnect
    browser.on('disconnected', () => {
      console.log('Browser disconnected');
      browser = null;
    });
    
    return browser;
  } catch (error) {
    console.error('Failed to launch browser:', error);
    browserError = error;
    throw error;
  }
}

app.post('/image', async (req, res) => {
  const { 
    code, 
    language = 'javascript', 
    theme = 'light',
    fontSize = '16px', 
    radius = '10px',
    padding = '24px',
    containerMargin = '40px',
    gradientPadding = '60px',
    gradientOpacity = 1.0,
    shadow = true,
    shadowIntensity = 'light',
    showLineNumbers = true,
    lineNumbersStyle = 'minimal',
    showWindowControls = true,
    showTab = true,
    fileName = '',
    title = '',
    watermark = '@akshat_arora7',
    background = 'vivid', // Set default to vibrant gradient
    gradientAngle = '135deg',
    squareImage = true
  } = req.body;

  if (!code) return res.status(400).json({ error: 'Code required' });

  // Generate cache key from all parameters
  const key = crypto.createHash('md5')
    .update(JSON.stringify(req.body))
    .digest('hex');
    
  const cached = cache.get(key);
  if (cached) return res.type('png').send(cached);

  try {
    const themeColors = themes[theme] || themes.light;
    
    // IMPORTANT: Preserve line breaks in code
    // Replace any \r\n with \n for consistent line breaks
    let formattedCode = code.replace(/\r\n/g, '\n');
    
    // If it's JavaScript or TypeScript, ensure consistent formatting
    if (language === 'javascript' || language === 'typescript') {
      // Preserve line breaks but improve formatting
      const lines = formattedCode.split('\n');
      let indent = 0;
      formattedCode = lines.map(line => {
        let currentIndent = indent;
        const trimmedLine = line.trim();
        
        // Handle indentation for braces
        if (trimmedLine.includes('}') && !trimmedLine.includes('{')) {
          indent = Math.max(0, indent - 1);
          currentIndent = indent;
        }
        
        if (trimmedLine.includes('{') && !trimmedLine.includes('}')) {
          currentIndent = indent;
          indent++;
        }
        
        // Return the indented line, or empty line if it's blank
        return trimmedLine ? '  '.repeat(currentIndent) + trimmedLine : '';
      }).join('\n');
    }
    
    // Highlight the code with proper language
    const highlighted = hljs.highlight(formattedCode, { language, ignoreIllegals: true }).value;
    
    // Count lines correctly from formatted code
    const lineCount = formattedCode.split('\n').length;
    const lineNumbers = showLineNumbers
      ? Array.from({ length: lineCount }, (_, i) => i + 1).join('\n')
      : '';

    // Shadow configuration
    const shadowStyle = {
      light: 'rgba(0, 0, 0, 0.1) 0px 4px 12px',
      medium: 'rgba(0, 0, 0, 0.15) 0px 5px 15px',
      heavy: 'rgba(0, 0, 0, 0.25) 0px 8px 24px'
    };
    
    // Process background 
    let backgroundStyle = 'transparent';
    
    if (background !== 'transparent') {
      // Check if it's a predefined gradient keyword
      if (gradients[background]) {
        backgroundStyle = gradients[background];
      }
      // Check if it's a custom gradient (Array with 2+ colors)
      else if (Array.isArray(background) && background.length >= 2) {
        backgroundStyle = `linear-gradient(${gradientAngle}, ${background.join(', ')})`;
      }
      // Otherwise use as solid color
      else {
        backgroundStyle = background;
      }
    }

    // Determine file name to display in the tab (use fileName, fallback to title, or use a default based on language)
    const displayFileName = fileName || title || `${language === 'javascript' ? 'script' : language}.${getExtensionForLanguage(language)}`;
    
    // Function to get file extension based on language
    function getExtensionForLanguage(lang) {
      const extensions = {
        javascript: 'js',
        typescript: 'ts',
        python: 'py',
        java: 'java',
        csharp: 'cs',
        cpp: 'cpp',
        php: 'php',
        ruby: 'rb',
        go: 'go',
        rust: 'rs',
        swift: 'swift',
        kotlin: 'kt',
        html: 'html',
        css: 'css'
      };
      return extensions[lang.toLowerCase()] || 'txt';
    }

    // Get icon for tab based on language - improved with SVG logos
    function getLanguageIcon(lang) {
      // Base64 encoded SVG icons for popular languages
      const icons = {
        javascript: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#F7DF1E"><path d="M0 0h24v24H0V0zm22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.42-.404-.601-.586-.78-.63-.705-1.469-1.065-2.834-1.034l-.705.089c-.676.165-1.32.525-1.71 1.005-1.14 1.291-.811 3.541.569 4.471 1.365 1.02 3.361 1.244 3.616 2.205.24 1.17-.87 1.545-1.966 1.41-.811-.18-1.26-.586-1.755-1.336l-1.83 1.051c.21.48.45.689.81 1.109 1.74 1.756 6.09 1.666 6.871-1.004.029-.09.24-.705.074-1.65l.046.067zm-8.983-7.245h-2.248c0 1.938-.009 3.864-.009 5.805 0 1.232.063 2.363-.138 2.711-.33.689-1.18.601-1.566.48-.396-.196-.597-.466-.83-.855-.063-.105-.11-.196-.127-.196l-1.825 1.125c.305.63.75 1.172 1.324 1.517.855.51 2.004.675 3.207.405.783-.226 1.458-.691 1.811-1.411.51-.93.402-2.07.397-3.346.012-2.054 0-4.109 0-6.179l.004-.056z"/></svg>`,
        typescript: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#3178C6"><path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z"/></svg>`,
        python: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#3776AB" d="M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02.13.01h-5.84l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05zm-6.3 1.98l-.23.33-.08.41.08.41.23.34.33.22.41.09.41-.09.33-.22.23-.34.08-.41-.08-.41-.23-.33-.33-.22-.41-.09-.41.09zm13.09 3.95l.28.06.32.12.35.18.36.27.36.35.35.47.32.59.28.73.21.88.14 1.04.05 1.23-.06 1.23-.16 1.04-.24.86-.32.71-.36.57-.4.45-.42.33-.42.24-.4.16-.36.09-.32.05-.24.02-.16-.01h-8.22v.82h5.84l.01 2.76.02.36-.05.34-.11.31-.17.29-.25.25-.31.24-.38.2-.44.17-.51.15-.58.13-.64.09-.71.07-.77.04-.84.01-1.27-.04-1.07-.14-.9-.2-.73-.25-.59-.3-.45-.33-.34-.34-.25-.34-.16-.33-.1-.3-.04-.25-.02-.2.01-.13v-5.34l.05-.64.13-.54.21.46.26.38.3.32.33.24.35.2.35.14.33.1.3.06.26.04.21.02.13.01h5.84l.69-.05.59-.14.5-.21.41-.28.33-.32.27-.35.2-.36.15-.36.1-.35.07-.32.04-.28.02-.21V6.07h2.09l.14.01zm-6.47 14.25l-.23.33-.08.41.08.41.23.33.33.23.41.08.41-.08.33-.23.23-.33.08-.41-.08-.41-.23-.33-.33-.23-.41-.08-.41.08z"/></svg>`,
        go: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#00ADD8"><path d="M1.811 10.231c-.047 0-.058-.023-.035-.059l.246-.315c.023-.035.081-.058.128-.058h4.172c.046 0 .058.035.035.07l-.199.303c-.023.036-.082.07-.117.07zM.047 11.306c-.047 0-.059-.023-.035-.058l.245-.316c.023-.035.082-.058.129-.058h5.328c.047 0 .07.035.058.07l-.093.28c-.012.047-.058.07-.105.07zm2.828 1.075c-.047 0-.059-.035-.035-.07l.163-.292c.023-.035.07-.07.117-.07h2.337c.047 0 .07.035.07.082l-.023.28c0 .047-.047.082-.082.082zm12.129-2.36c-.736.187-1.239.327-1.963.514-.176.046-.187.058-.34-.117-.174-.199-.303-.327-.548-.444-.737-.362-1.45-.257-2.115.175-.795.514-1.204 1.274-1.192 2.22.011.935.654 1.706 1.577 1.835.795.105 1.46-.175 1.987-.77.105-.13.198-.27.315-.434H10.47c-.245 0-.304-.152-.222-.35.152-.362.432-.97.596-1.274a.315.315 0 01.292-.187h4.253c-.023.316-.023.631-.07.947a4.983 4.983 0 01-.958 2.29c-.841 1.11-1.94 1.8-3.33 1.986-1.145.152-2.209-.07-3.143-.77-.865-.655-1.356-1.52-1.484-2.595-.152-1.274.222-2.419.993-3.424.83-1.086 1.928-1.776 3.272-2.02 1.098-.2 2.15-.07 3.096.571.62.41 1.063.97 1.356 1.648.07.105.023.164-.117.199 M19.337 19.722c-1.5-.868-2.337-2.23-2.337-3.991 0-1.087.386-1.98.902-2.731.394-.56.807-1.038 1.39-1.414v-.187h-4.056c-.012 0-.023-.012-.035 0l-2.026 5.241a.97.97 0 00-.035.304c-.023 1.5.338 2.8 1.133 3.991.632.949 1.459 1.674 2.499 2.142.458.2.916.35 1.414.458h1.344c.082 0 .152-.035.187-.105.079-.152.158-.304.234-.458.153-.328.317-.645.446-.982z"/></svg>`,
      };
      
      return icons[lang.toLowerCase()] || `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#555"><path d="M22 0H2v24h20V0zM7 22H4v-3h3v3zm0-5H4v-3h3v3zm0-5H4V9h3v3zm0-5H4V4h3v3zm5 15H9v-3h3v3zm0-5H9v-3h3v3zm0-5H9V9h3v3zm0-5H9V4h3v3zm5 15h-3v-3h3v3zm0-5h-3v-3h3v3zm0-5h-3V9h3v3zm0-5h-3V4h3v3z"/></svg>`;
    }

    const html = `
    <html><head>
        <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&family=Poppins:wght@400,500;600&display=swap" rel="stylesheet">
        <style>
          html, body { margin: 0; padding: 0; width: 100%; height: 100%; box-sizing: border-box; }
          body { display: flex; justify-content: center; align-items: center; background: ${backgroundStyle}; font-family: 'Poppins', sans-serif; padding: ${squareImage ? '50px' : gradientPadding}; }
          .gradient-wrapper { padding: ${containerMargin}; border-radius: ${radius}; display: flex; justify-content: center; align-items: center; width: ${squareImage ? 'auto' : '100%'}; aspect-ratio: ${squareImage ? '1/1' : 'auto'}; opacity: ${gradientOpacity}; }
          
          /* --- FIX: Added position: relative --- */
          .container { position: relative; border-radius: ${radius}; ${shadow ? `box-shadow: ${shadowStyle[shadowIntensity] || shadowStyle.light};` : ''} overflow: hidden; max-width: 850px; width: 100%; background: ${themeColors.bg}; }
          
          .header { display: flex; align-items: center; background: ${themeColors.windowBg}; height: ${showTab || showWindowControls ? '42px' : '0'}; padding: 0; border-radius: ${radius} ${radius} 0 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
          .window-controls-container { display: ${showWindowControls ? 'flex' : 'none'}; align-items: center; padding: 0 16px; }
          .window-controls { display: flex; gap: 8px; }
          .window-control { width: 12px; height: 12px; border-radius: 50%; }
          .window-control.close { background-color: #ff5f56; }
          .window-control.minimize { background-color: #ffbd2e; }
          .window-control.maximize { background-color: #27c93f; }
          .tabs { display: flex; flex-grow: 1; height: 100%; padding-left: 10px; }
          .tab { display: ${showTab ? 'flex' : 'none'}; align-items: center; padding: 0 16px; height: 100%; background: ${themeColors.bg}; border-top-left-radius: 5px; border-top-right-radius: 5px; position: relative; }
          .tab::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 1px; background: ${themeColors.bg}; z-index: 2; }
          .tab-icon { margin-right: 8px; }
          .tab-name { font-size: 13px; font-weight: 500; color: ${themeColors.fg}; white-space: nowrap; }
          .window-title { margin-left: auto; font-size: 13px; color: ${themeColors.comment}; padding: 0 16px; }

          .code-container { display: flex; background: ${themeColors.bg}; padding: ${padding} 0; }
          .line-numbers, .code-content pre code { font-family: 'Fira Code', monospace; font-size: ${fontSize}; line-height: 1.8; white-space: pre; tab-size: 2; -moz-tab-size: 2; }
          .line-numbers { text-align: right; user-select: none; padding-left: ${padding}; padding-right: 12px; color: ${themeColors.comment}; opacity: 0.7; border-right: 1px solid rgba(255, 255, 255, 0.1); }
          .code-content { overflow-x: auto; flex-grow: 1; padding-left: 16px; padding-right: ${padding}; }
          pre { margin: 0; padding: 0; }
          .code-content pre code { color: ${themeColors.fg}; background: transparent; padding: 0; display: block; }
          
          .hljs-keyword, .hljs-selector-tag, .hljs-built_in { color: ${themeColors.highlight}; }
          .hljs-string, .hljs-attr, .hljs-value { color: ${themeColors.string}; }
          .hljs-number, .hljs-literal { color: ${themeColors.number}; }
          .hljs-title.function_, .hljs-title.class_ { color: ${themeColors.highlight}; font-weight: 600; }
          .hljs-comment, .hljs-meta { color: ${themeColors.comment}; font-style: italic; }
          .hljs-property { color: ${themeColors.property}; }

          /* --- FIX: Watermark CSS Added --- */
          .watermark {
            font-family: 'Poppins', sans-serif;
            position: absolute;
            bottom: 12px; 
            right: 15px;
            font-size: 12px;
            font-weight: 500;
            color: ${themeColors.comment}; /* Dynamic color */
            opacity: 0.8;
            z-index: 10;
          }
        </style>
      </head><body>
        <div class="gradient-wrapper">
          <div class="container">
            <div class="header">
              <div class="window-controls-container"><div class="window-controls"><div class="window-control close"></div><div class="window-control minimize"></div><div class="window-control maximize"></div></div></div>
              <div class="tabs">${showTab ? `<div class="tab"><div class="tab-icon">${getLanguageIcon(language)}</div><span class="tab-name">${displayFileName}</span></div>` : ''}</div>
              ${title ? `<div class="window-title">${title}</div>` : ''}
            </div>
            <div class="code-container">
              ${showLineNumbers ? `<pre class="line-numbers"><code>${lineNumbers}</code></pre>` : ''}
              <div class="code-content">
                <pre><code class="hljs">${highlighted}</code></pre>
              </div>
            </div>
            <!-- FIX: Watermark moved inside .container -->
            ${watermark ? `<div class="watermark">${watermark}</div>` : ''}
          </div>
        </div>
      </body></html>
    `;

    try {
      // Get browser instance with error handling
      const browser = await getBrowser();
      const page = await browser.newPage();
      
      // LinkedIn recommended image size
      await page.setViewport({
        width: 1200,
        height: 630,
        deviceScaleFactor: 2
      });
      
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const element = await page.$('.gradient-wrapper');
      const image = await element.screenshot({
        omitBackground: false,
        encoding: 'binary'
      });
      
      await page.close();
      
      cache.set(key, image);
      res.type('png').send(image);
    } catch (browserError) {
      console.error('Browser error:', browserError);
      res.status(500).json({ 
        error: 'Image generation failed', 
        message: 'Browser error: ' + browserError.message 
      });
    }
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Image generation failed' });
  }
});

// Update health endpoint and graceful shutdown
app.get('/health', (_req, res) => res.send('OK'));
process.on('SIGINT', async () => {
  if (browser) await browser.close();
  process.exit();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`LinkedIn code image API running on port ${PORT}`));