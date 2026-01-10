#!/bin/bash
# Watch mode for Tailwind CSS development

echo "👀 Watching Tailwind CSS for changes..."
echo "Press Ctrl+C to stop"
npx tailwindcss -i ./src/css/input.css -o ./public/css/output.css --watch
