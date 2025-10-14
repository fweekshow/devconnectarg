#!/bin/bash
# Diagnostic script to check XMTP database and environment status

echo "=== XMTP Database Diagnostic ==="
echo ""
echo "1. Environment Variables:"
echo "   TEST_WALLET: ${TEST_WALLET:-not set}"
echo "   WALLET_KEY: ${WALLET_KEY:+SET (hidden)}${WALLET_KEY:-NOT SET}"
echo "   DB_ENCRYPTION_KEY: ${DB_ENCRYPTION_KEY:+SET (hidden)}${DB_ENCRYPTION_KEY:-NOT SET}"
echo "   XMTP_ENV: ${XMTP_ENV:-NOT SET}"
echo "   RAILWAY_VOLUME_MOUNT_PATH: ${RAILWAY_VOLUME_MOUNT_PATH:-not set (using .data/xmtp)}"
echo ""

echo "2. Database Location (based on TEST_WALLET):"
if [ "$TEST_WALLET" = "true" ]; then
    DB_DIR=".data/xmtp-test"
    echo "   Using TEST database: $DB_DIR/"
else
    DB_DIR=".data/xmtp"
    echo "   Using PRODUCTION database: $DB_DIR/"
fi
echo ""

echo "3. Database Files:"
if [ -d "$DB_DIR" ]; then
    echo "   ✅ Directory exists: $DB_DIR/"
    ls -lh "$DB_DIR" | tail -n +2 | while read -r line; do
        echo "      $line"
    done
else
    echo "   ❌ Directory DOES NOT EXIST: $DB_DIR/"
fi
echo ""

echo "4. Alternative Database:"
ALT_DB_DIR=".data/xmtp"
if [ "$TEST_WALLET" = "true" ]; then
    ALT_DB_DIR=".data/xmtp"
else
    ALT_DB_DIR=".data/xmtp-test"
fi

if [ -d "$ALT_DB_DIR" ]; then
    echo "   ⚠️  FOUND alternative database at: $ALT_DB_DIR/"
    ls -lh "$ALT_DB_DIR" | tail -n +2 | while read -r line; do
        echo "      $line"
    done
else
    echo "   No alternative database found at: $ALT_DB_DIR/"
fi
echo ""

echo "5. Agent Wallet Address:"
if [ -n "$WALLET_KEY" ]; then
    # This would require additional tools to derive address
    echo "   Wallet key is set (run agent to see address)"
else
    echo "   ❌ WALLET_KEY not set - agent will not start"
fi
echo ""

echo "=== Recommendations ==="
if [ -z "$WALLET_KEY" ] || [ -z "$DB_ENCRYPTION_KEY" ] || [ -z "$XMTP_ENV" ]; then
    echo "❌ Missing required environment variables"
    echo "   Create a .env file with: WALLET_KEY, DB_ENCRYPTION_KEY, XMTP_ENV"
fi

if [ "$TEST_WALLET" = "true" ] && [ ! -d ".data/xmtp-test" ]; then
    echo "⚠️  TEST_WALLET=true but test database doesn't exist"
    echo "   Either: unset TEST_WALLET or create .data/xmtp-test/"
fi

if [ -d ".data/xmtp" ] && [ -d ".data/xmtp-test" ]; then
    echo "⚠️  Both production and test databases exist"
    echo "   Make sure TEST_WALLET matches your intended database"
fi

