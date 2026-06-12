package config

import (
	"context"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/x/mongo/driver/connstring"
)

var databaseName = "ecommerce"

func ConnectDB() (*mongo.Client, error) {
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://admin:password123@localhost:27017/ecommerce?authSource=admin"
	}

	if parsed, err := connstring.ParseAndValidate(mongoURI); err == nil && parsed.Database != "" {
		databaseName = parsed.Database
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		return nil, err
	}

	// Test connection
	if err = client.Ping(ctx, nil); err != nil {
		return nil, err
	}

	return client, nil
}

func GetCollection(client *mongo.Client, collectionName string) *mongo.Collection {
	return client.Database(databaseName).Collection(collectionName)
}
