package routes

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"fiber-ecommerce/config"
	"fiber-ecommerce/models"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func isSafeWarehouseID(id string) bool {
	return id != "" && !strings.ContainsAny(id, ".$")
}

func WarehouseRoutes(app fiber.Router, db *mongo.Client) {
	warehouses := app.Group("/warehouses")

	type warehousePayload struct {
		Name     string `json:"name"`
		Address  string `json:"address"`
		Comment  string `json:"comment"`
		IsActive *bool  `json:"is_active"`
	}

	ensureDefaultWarehouses := func(collection *mongo.Collection) error {
		now := time.Now()
		defaults := []models.Warehouse{
			models.Warehouse{ID: "warehouse-1", Name: "Склад 1", Address: "Ташкент, основной склад", Comment: "Основной склад для прихода и продаж", IsActive: true, CreatedAt: now, UpdatedAt: now},
			models.Warehouse{ID: "warehouse-2", Name: "Склад 2", Address: "Ташкент, резервный склад", Comment: "Резервная зона хранения", IsActive: true, CreatedAt: now, UpdatedAt: now},
			models.Warehouse{ID: "warehouse-3", Name: "Склад 3", Address: "Самарканд, филиал", Comment: "Региональный склад", IsActive: true, CreatedAt: now, UpdatedAt: now},
			models.Warehouse{ID: "warehouse-4", Name: "Склад 4", Address: "Андижан, филиал", Comment: "Региональный склад", IsActive: true, CreatedAt: now, UpdatedAt: now},
			models.Warehouse{ID: "warehouse-5", Name: "Склад 5", Address: "Бухара, филиал", Comment: "Склад для перемещений", IsActive: true, CreatedAt: now, UpdatedAt: now},
		}
		for _, warehouse := range defaults {
			_, err := collection.UpdateOne(
				context.TODO(),
				bson.M{"_id": warehouse.ID},
				bson.M{"$setOnInsert": warehouse},
				options.Update().SetUpsert(true),
			)
			if err != nil {
				return err
			}
		}
		return nil
	}

	isSystemWarehouse := func(id string) bool {
		switch id {
		case "warehouse-1", "warehouse-2", "warehouse-3", "warehouse-4", "warehouse-5":
			return true
		default:
			return false
		}
	}

	warehouses.Get("/", func(c *fiber.Ctx) error {
		collection := config.GetCollection(db, "warehouses")
		if err := ensureDefaultWarehouses(collection); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to initialize warehouses"})
		}

		page, _ := strconv.Atoi(c.Query("page", "1"))
		limit, _ := strconv.Atoi(c.Query("limit", "100"))
		if page <= 0 {
			page = 1
		}
		if limit <= 0 || limit > 500 {
			limit = 100
		}

		filter := bson.M{}
		if search := strings.TrimSpace(c.Query("search")); search != "" {
			filter["$or"] = []bson.M{
				{"name": bson.M{"$regex": search, "$options": "i"}},
				{"address": bson.M{"$regex": search, "$options": "i"}},
			}
		}

		opts := options.Find().
			SetSkip(int64((page - 1) * limit)).
			SetLimit(int64(limit)).
			SetSort(bson.D{{Key: "created_at", Value: 1}, {Key: "name", Value: 1}})

		cursor, err := collection.Find(context.TODO(), filter, opts)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch warehouses"})
		}
		defer cursor.Close(context.TODO())

		var result []models.Warehouse
		if err := cursor.All(context.TODO(), &result); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to decode warehouses"})
		}
		if result == nil {
			result = []models.Warehouse{}
		}

		total, _ := collection.CountDocuments(context.TODO(), filter)
		return c.JSON(fiber.Map{"data": result, "total": total, "page": page, "limit": limit})
	})

	warehouses.Get("/:id", func(c *fiber.Ctx) error {
		id := strings.TrimSpace(c.Params("id"))
		if !isSafeWarehouseID(id) {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid warehouse ID"})
		}

		collection := config.GetCollection(db, "warehouses")
		var warehouse models.Warehouse
		if err := collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&warehouse); err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Warehouse not found"})
		}
		return c.JSON(warehouse)
	})

	warehouses.Post("/", func(c *fiber.Ctx) error {
		var payload warehousePayload
		if err := c.BodyParser(&payload); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}
		payload.Name = strings.TrimSpace(payload.Name)
		payload.Address = strings.TrimSpace(payload.Address)
		if payload.Name == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Name is required"})
		}

		now := time.Now()
		isActive := true
		if payload.IsActive != nil {
			isActive = *payload.IsActive
		}
		warehouse := models.Warehouse{
			ID:        fmt.Sprintf("warehouse-%d", now.UnixNano()),
			Name:      payload.Name,
			Address:   payload.Address,
			Comment:   strings.TrimSpace(payload.Comment),
			IsActive:  isActive,
			CreatedAt: now,
			UpdatedAt: now,
		}

		collection := config.GetCollection(db, "warehouses")
		if _, err := collection.InsertOne(context.TODO(), warehouse); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create warehouse"})
		}
		return c.Status(201).JSON(warehouse)
	})

	warehouses.Put("/:id", func(c *fiber.Ctx) error {
		id := strings.TrimSpace(c.Params("id"))
		if !isSafeWarehouseID(id) {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid warehouse ID"})
		}

		var payload warehousePayload
		if err := c.BodyParser(&payload); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}
		payload.Name = strings.TrimSpace(payload.Name)
		payload.Address = strings.TrimSpace(payload.Address)
		if payload.Name == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Name is required"})
		}

		updateData := bson.M{
			"name":       payload.Name,
			"address":    payload.Address,
			"comment":    strings.TrimSpace(payload.Comment),
			"updated_at": time.Now(),
		}
		if payload.IsActive != nil {
			updateData["is_active"] = *payload.IsActive
		}

		collection := config.GetCollection(db, "warehouses")
		result, err := collection.UpdateOne(context.TODO(), bson.M{"_id": id}, bson.M{"$set": updateData})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update warehouse"})
		}
		if result.MatchedCount == 0 {
			return c.Status(404).JSON(fiber.Map{"error": "Warehouse not found"})
		}

		var warehouse models.Warehouse
		if err := collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&warehouse); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch updated warehouse"})
		}
		return c.JSON(warehouse)
	})

	warehouses.Delete("/:id", func(c *fiber.Ctx) error {
		id := strings.TrimSpace(c.Params("id"))
		if !isSafeWarehouseID(id) {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid warehouse ID"})
		}
		if isSystemWarehouse(id) {
			return c.Status(409).JSON(fiber.Map{"error": "System warehouse cannot be deleted"})
		}

		productsCollection := config.GetCollection(db, "products")
		linkedProducts, err := productsCollection.CountDocuments(context.TODO(), bson.M{
			"$or": []bson.M{
				{"stock_by_warehouse." + id: bson.M{"$gt": 0}},
				{"warehouse_id": id, "count": bson.M{"$gt": 0}},
			},
		})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to validate warehouse usage"})
		}
		if linkedProducts > 0 {
			return c.Status(409).JSON(fiber.Map{"error": "Warehouse has product stock"})
		}

		collection := config.GetCollection(db, "warehouses")
		result, err := collection.DeleteOne(context.TODO(), bson.M{"_id": id})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to delete warehouse"})
		}
		if result.DeletedCount == 0 {
			return c.Status(404).JSON(fiber.Map{"error": "Warehouse not found"})
		}
		return c.JSON(fiber.Map{"message": "Warehouse deleted successfully"})
	})
}
