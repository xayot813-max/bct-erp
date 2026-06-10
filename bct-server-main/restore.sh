#!/bin/bash

# === CONFIG ===
CONTAINER_NAME="mongodb"
BACKUP_PATH="$(pwd)/backup/db"        # backup/db papkangiz joylashgan joy
DB_NAME="ecommerce"
DB_USER="admin"
DB_PASS="password123"
AUTH_DB="admin"

echo "📦 Checking MongoDB container..."
docker ps | grep -q $CONTAINER_NAME
if [ $? -ne 0 ]; then
  echo "❌ MongoDB container not running. Please start it first with: docker compose up -d"
  exit 1
fi

echo "🚀 Copying backup folder to container..."
docker cp "$BACKUP_PATH" "$CONTAINER_NAME":/tmp/db

echo "📥 Restoring MongoDB database..."
docker exec -it $CONTAINER_NAME bash -c "
  mongorestore \
    --drop \
    --username $DB_USER \
    --password $DB_PASS \
    --authenticationDatabase $AUTH_DB \
    --nsInclude=$DB_NAME.* \
    /tmp/db
"

echo "🧹 Cleaning up temporary files..."
docker exec -it $CONTAINER_NAME rm -rf /tmp/db

echo "✅ Restore complete!"
