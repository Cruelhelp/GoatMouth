#!/bin/bash
# Build Tailwind CSS for production

echo "🎨 Building Tailwind CSS..."
./tailwindcss -i ./css/input.css -o ./css/output.css --minify

if [ $? -eq 0 ]; then
    echo "✅ Build complete! CSS file: css/output.css"
else
    echo "❌ Build failed"
    exit 1
fi
