#!/bin/bash
# Build Tailwind CSS for production

echo "🎨 Building Tailwind CSS..."
npx tailwindcss -i ./src/css/input.css -o ./public/css/output.css --minify

if [ $? -eq 0 ]; then
    echo "✅ Build complete! CSS file: css/output.css"
else
    echo "❌ Build failed"
    exit 1
fi
