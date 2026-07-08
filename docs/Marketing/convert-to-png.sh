#!/bin/bash
#
# Divi5Generate Marketing Assets — SVG to PNG Conversion Script
# Created: 2026-07-06
# Purpose: Convert all SVG diagrams to PNG with proper density and optimization
#
# Usage:
#   chmod +x convert-to-png.sh
#   ./convert-to-png.sh
#
# Requirements:
#   - ImageMagick (install via: brew install imagemagick)
#   - Optipng (install via: brew install optipng) [optional, for compression]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSETS_DIR="$SCRIPT_DIR/assets"

echo "🎨 Divi5Generate Marketing Assets — PNG Conversion"
echo "=================================================="
echo ""

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found. Install it with:"
    echo "   brew install imagemagick"
    exit 1
fi

# Check if we're in the right directory
if [ ! -d "$ASSETS_DIR" ]; then
    echo "❌ assets/ directory not found. Make sure you're in the Marketing directory."
    exit 1
fi

# Create output directory
OUTPUT_DIR="$ASSETS_DIR/png-exports"
mkdir -p "$OUTPUT_DIR"

echo "📁 Converting SVGs to PNG..."
echo "   Density: 300 DPI (suitable for web and print)"
echo "   Quality: 85 (optimized file size)"
echo ""

# Convert each SVG
convert_svg() {
    local input_file="$1"
    local output_file="$2"
    local filename=$(basename "$input_file" .svg)

    echo "   ⏳ Converting $filename.svg..."

    convert \
        -density 300 \
        -quality 85 \
        -background white \
        "$input_file" \
        "$output_file"

    # Get file size
    local size=$(ls -lh "$output_file" | awk '{print $5}')
    echo "      ✓ Created $(basename "$output_file") ($size)"
}

# Process each SVG file
convert_svg "$ASSETS_DIR/hero-workflow.svg" "$OUTPUT_DIR/hero-workflow.png"
convert_svg "$ASSETS_DIR/qa-gates-validation.svg" "$OUTPUT_DIR/qa-gates-validation.png"
convert_svg "$ASSETS_DIR/brand-inheritance-flow.svg" "$OUTPUT_DIR/brand-inheritance-flow.png"
convert_svg "$ASSETS_DIR/time-savings-timeline.svg" "$OUTPUT_DIR/time-savings-timeline.png"

echo ""

# Optimize PNGs if optipng is available
if command -v optipng &> /dev/null; then
    echo "📦 Optimizing PNG files..."
    for png in "$OUTPUT_DIR"/*.png; do
        echo "   ⏳ Optimizing $(basename "$png")..."
        optipng -o2 "$png" > /dev/null
        local size=$(ls -lh "$png" | awk '{print $5}')
        echo "      ✓ Optimized ($size)"
    done
    echo ""
fi

# Render HTML mockup to PNG using headless Chrome
echo "🖼️  Rendering HTML mockup to PNG..."
if command -v npx &> /dev/null; then
    echo "   ⏳ Checking for Puppeteer..."

    # Create a temporary rendering script
    cat > "$SCRIPT_DIR/render-html-screenshot.js" << 'EOFJS'
const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });

  const filePath = 'file://' + path.resolve(__dirname, 'assets/chat-ui-mockup.html');

  try {
    await page.goto(filePath, { waitUntil: 'networkidle2' });
    await page.screenshot({
      path: path.resolve(__dirname, 'assets/png-exports/chat-ui-preview.png'),
      fullPage: false
    });
    console.log('✓ Created chat-ui-preview.png');
  } catch (error) {
    console.error('Could not render HTML mockup:', error.message);
    console.log('   Tip: You can manually take a screenshot by opening');
    console.log('   assets/chat-ui-mockup.html in your browser and using');
    console.log('   the screenshot tool (DevTools or Cmd+Shift+4 on Mac).');
  }

  await browser.close();
})();
EOFJS

    # Try to install and run Puppeteer
    if npm list puppeteer > /dev/null 2>&1 || npm ls puppeteer -g > /dev/null 2>&1; then
        node "$SCRIPT_DIR/render-html-screenshot.js"
    else
        echo "   ℹ️  Puppeteer not installed. For HTML mockup, use one of:"
        echo "      1. Open chat-ui-mockup.html in browser → DevTools → screenshot"
        echo "      2. Install Puppeteer: npm install -D puppeteer"
        echo "      3. Use: npx puppeteer screenshot assets/chat-ui-mockup.html"
    fi

    # Clean up temp script
    rm -f "$SCRIPT_DIR/render-html-screenshot.js"
else
    echo "   ℹ️  For HTML mockup screenshot:"
    echo "      1. Open assets/chat-ui-mockup.html in your browser"
    echo "      2. Press F12 (DevTools) → More tools → Rendering"
    echo "      3. Ctrl+Shift+P (or Cmd+Shift+P on Mac) → Screenshot"
fi

echo ""
echo "✅ Conversion complete!"
echo ""
echo "📊 Output files:"
ls -lh "$OUTPUT_DIR"/*.png 2>/dev/null | awk '{print "   " $9 " (" $5 ")"}'
echo ""
echo "💡 Next steps:"
echo "   1. Review PNG files in: $OUTPUT_DIR"
echo "   2. Upload to your website or CDN"
echo "   3. Use in landing pages, blog posts, and social media"
echo ""
echo "📖 For usage recommendations, see: README.md"
