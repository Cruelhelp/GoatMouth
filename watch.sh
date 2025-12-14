#!/bin/bash
# Watch mode for Tailwind CSS development

echo "👀 Watching Tailwind CSS for changes..."
echo "Press Ctrl+C to stop"
./tailwindcss -i ./css/input.css -o ./css/output.css --watch
