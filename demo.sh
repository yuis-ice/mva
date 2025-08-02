#!/bin/bash

# mva Demo Script
# This script demonstrates the basic functionality of mva

echo "🚀 mva Demo"
echo "==========="

echo ""
echo "1. Checking mva installation..."
if command -v node &> /dev/null; then
    echo "✅ Node.js is installed"
else
    echo "❌ Node.js is required"
    exit 1
fi

echo ""
echo "2. Building mva..."
npm run build

echo ""
echo "3. Showing help..."
node dist/index.js --help

echo ""
echo "4. Checking status (should show config)..."
node dist/index.js status

echo ""
echo "5. Setting up directories..."
node dist/index.js setup-directories

echo ""
echo "6. Listing created directories..."
ls -la /srv/mva/ 2>/dev/null || echo "Note: /srv/mva directories would be created with proper permissions"

echo ""
echo "📝 Next steps:"
echo "   • Ensure rclone is installed and configured"
echo "   • Edit ~/.mva/config.yml for your cloud providers"
echo "   • Run 'node dist/index.js start' to start the daemon"
echo "   • Move files to watch directories: mv file.txt /srv/mva/gdrive/"
echo ""
echo "🎉 mva is ready to use!"
