#!/bin/bash
# Restore database from base64 if XMTP_DB_BACKUP env var is set

if [ -n "$XMTP_DB_BACKUP" ] && [ ! -f "$RAILWAY_VOLUME_MOUNT_PATH/devconnect-agent.db3" ]; then
    echo "📦 Restoring XMTP database from backup..."
    mkdir -p $RAILWAY_VOLUME_MOUNT_PATH
    echo "$XMTP_DB_BACKUP" | base64 -d | tar -xzf - -C $RAILWAY_VOLUME_MOUNT_PATH
    echo "✅ Database restored to $RAILWAY_VOLUME_MOUNT_PATH"
    ls -lh $RAILWAY_VOLUME_MOUNT_PATH
else
    echo "ℹ️  Database already exists or no backup provided"
fi



