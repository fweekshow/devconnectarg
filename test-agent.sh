#!/bin/bash
# Quick test script to see agent activity

echo "🔍 Starting Agent SDK with verbose logging..."
echo "📍 Press Ctrl+C to stop"
echo ""

cd /Users/matthewmeakin/devconnect-concierge

# Run the agent and capture output
npm run dev:agent-sdk 2>&1 | tee /tmp/agent-debug.log

