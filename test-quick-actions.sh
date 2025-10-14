#!/bin/bash
# Test script to see Quick Actions error

cd /Users/matthewmeakin/devconnect-concierge

echo "🔍 Starting agent with Quick Actions debugging..."
echo ""

npm run dev:agent-sdk 2>&1 | grep -A 5 -B 5 "Quick Actions\|Error sending"

