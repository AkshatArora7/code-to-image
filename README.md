# LinkedIn Code Image API

A service that generates beautiful code images for sharing on LinkedIn and other social media platforms.

## Getting Started

```bash
npm install
node index.js
```

The server runs on port 3000 by default.

## Example Usage

Here's a curl command to generate an image with a beautiful fiery gradient background and a large code block:

```bash
curl -X POST http://localhost:3000/image \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function helloWorld() {\n  console.log(\"Hello, LinkedIn!\");\n  return \"Connection established!\";\n}\n\nfunction sum(a, b) {\n  return a + b;\n}\n\nfor (let i = 0; i < 10; i++) {\n  console.log(\"Number:\", i);\n}\n\nconst arr = [1,2,3,4,5];\narr.forEach(n => console.log(n));\n\nclass Greeter {\n  constructor(name) {\n    this.name = name;\n  }\n  greet() {\n    return `Hello, ${this.name}!`;\n  }\n}\n\nconst g = new Greeter(\"World\");\nconsole.log(g.greet());\n\n// More lines for demonstration\nlet total = 0;\nfor (const n of arr) {\n  total += n;\n}\nconsole.log(\"Total:\", total);\n",
    "language": "javascript",
    "theme": "carbon",
    "background": "fiery",
    "fontSize": "16px",
    "padding": "24px",
    "watermark": "@akshat_arora7",
    "fileName": "demo.js"
  }' \
  --output code-image.png
```

## Popular Background Gradients

- `fiery` - Red-orange gradient (recommended)
- `vivid` - Pink-orange gradient
- `flame` - Pink-red gradient
- `ember` - Red-yellow gradient
- `redhot` - Crimson red gradient
- `crimson` - Dark red gradient
- `night` - Dark blue gradient
- `linkedin` - LinkedIn blue gradient

## Available Themes

- `carbon` - Dark theme (shown in preview)
- `dracula` - Dark purple theme
- `modern` - Modern dark theme
- `linkedin-pro` - Professional dark LinkedIn theme
- `light` - Standard light theme
- `github` - GitHub light theme
- `minimal` - Minimal light theme
- `nord` - Nord color scheme
- `solarized` - Solarized light theme
- `onedark` - One Dark theme

## All Options

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `code` | string | Code to display in the image | (required) |
| `language` | string | Code language | `javascript` |
| `theme` | string | Color theme | `light` |
| `background` | string | Background gradient or color | `vivid` |
| `fontSize` | string | Font size | `16px` |
| `radius` | string | Border radius | `10px` |
| `padding` | string | Inner padding | `24px` |
| `containerMargin` | string | Outer margin | `40px` |
| `gradientPadding` | string | Padding around gradient | `60px` |
| `gradientOpacity` | number | Background opacity | `1.0` |
| `shadow` | boolean | Show container shadow | `true` |
| `shadowIntensity` | string | Shadow strength (`light`, `medium`, `heavy`) | `light` |
| `showLineNumbers` | boolean | Show line numbers | `true` |
| `lineNumbersStyle` | string | Line number style (`minimal` or normal) | `minimal` |
| `showWindowControls` | boolean | Show window controls | `true` |
| `showTab` | boolean | Show tab | `true` |
| `fileName` | string | File name in tab | `""` |
| `title` | string | Window title | `""` |
| `watermark` | string | Watermark text | `@YourLinkedInHandle` |
| `squareImage` | boolean | Create square image | `true` |
