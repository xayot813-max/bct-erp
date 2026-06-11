package routes

import (
	"context"
	"errors"
	"strings"
	"time"

	"fiber-ecommerce/config"
	"fiber-ecommerce/models"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type InventoryTransactionPayload struct {
	ProductID         string   `json:"product_id"`
	Type              string   `json:"type"`
	Quantity          int      `json:"quantity"`
	WarehouseID       string   `json:"warehouse_id"`
	Warehouse         string   `json:"warehouse"`
	SourceWarehouseID string   `json:"source_warehouse_id"`
	SourceWarehouse   string   `json:"source_warehouse"`
	Reason            string   `json:"reason"`
	Comment           string   `json:"comment"`
	Files             []string `json:"files"`
	SerialNumbers     []string `json:"serial_numbers"`
	ExpirationValue   int      `json:"expiration_value"`
	ExpirationUnit    string   `json:"expiration_unit"`
	RealQuantity      *int     `json:"real_quantity"`
	SystemQuantity    *int     `json:"system_quantity"`
}

type InventoryBulkPayload struct {
	Type       string                        `json:"type"`
	Reason     string                        `json:"reason"`
	Comment    string                        `json:"comment"`
	Operations []InventoryTransactionPayload `json:"operations"`
	Items      []InventoryTransactionPayload `json:"items"`
}

type inventoryPreparedOperation struct {
	ID            primitive.ObjectID
	Operation     InventoryTransactionPayload
	ProductBefore models.Product
	ProductAfter  models.Product
	UpdateData    bson.M
	OperationDoc  bson.M
}

func normalizeInventoryType(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "receive", "receipt":
		return "receipt"
	case "writeoff", "write-off":
		return "writeoff"
	case "sale", "sales":
		return "sale"
	case "movement", "move", "transfer":
		return "movement"
	case "adjustment", "audit", "reconciliation":
		return "adjustment"
	default:
		return strings.ToLower(strings.TrimSpace(value))
	}
}

func resolveInventoryWarehouseKey(id, name string) string {
	if strings.TrimSpace(id) != "" {
		return strings.TrimSpace(id)
	}
	if strings.TrimSpace(name) != "" {
		return strings.TrimSpace(name)
	}
	return "warehouse-1"
}

func resolveInventoryWarehouseLabel(id, name string) string {
	if strings.TrimSpace(name) != "" {
		return strings.TrimSpace(name)
	}
	return strings.TrimSpace(id)
}

func copyPositiveStock(stock map[string]int) map[string]int {
	next := map[string]int{}
	for key, count := range stock {
		if strings.TrimSpace(key) != "" && count > 0 {
			next[key] = count
		}
	}
	return next
}

func sumStock(stock map[string]int) int {
	total := 0
	for _, count := range stock {
		if count > 0 {
			total += count
		}
	}
	return total
}

func pickWarehouseWithInventory(stock map[string]int, preferred string, quantity int) string {
	if preferred != "" && stock[preferred] >= quantity {
		return preferred
	}
	for key, count := range stock {
		if count >= quantity {
			return key
		}
	}
	if preferred != "" {
		return preferred
	}
	for key := range stock {
		return key
	}
	return "warehouse-1"
}

func validateReceiptSerials(payload InventoryTransactionPayload) error {
	seenSerials := map[string]bool{}
	for _, serial := range payload.SerialNumbers {
		normalized := strings.TrimSpace(serial)
		if normalized == "" {
			continue
		}
		if seenSerials[normalized] {
			return errors.New("serial numbers must be unique")
		}
		seenSerials[normalized] = true
	}
	if len(seenSerials) > 0 && len(seenSerials) != payload.Quantity {
		return errors.New("serial numbers count must match quantity")
	}
	return nil
}

func prepareInventoryOperation(product models.Product, payload InventoryTransactionPayload, now time.Time) (inventoryPreparedOperation, error) {
	operationType := normalizeInventoryType(payload.Type)
	if operationType != "receipt" && operationType != "writeoff" && operationType != "sale" && operationType != "movement" && operationType != "adjustment" {
		return inventoryPreparedOperation{}, errors.New("type must be receipt, writeoff, sale, movement, or adjustment")
	}

	if operationType == "receipt" {
		if err := validateReceiptSerials(payload); err != nil {
			return inventoryPreparedOperation{}, err
		}
	}

	if operationType != "adjustment" && payload.Quantity <= 0 {
		return inventoryPreparedOperation{}, errors.New("quantity must be greater than zero")
	}

	stockByWarehouse := copyPositiveStock(product.StockByWarehouse)
	currentWarehouseKey := resolveInventoryWarehouseKey(product.WarehouseID, product.Warehouse)
	if len(stockByWarehouse) == 0 && product.Count > 0 {
		stockByWarehouse[currentWarehouseKey] = product.Count
	}
	if product.Count != sumStock(stockByWarehouse) {
		product.Count = sumStock(stockByWarehouse)
	}

	nextCount := product.Count
	destinationKey := resolveInventoryWarehouseKey(payload.WarehouseID, payload.Warehouse)
	destinationLabel := resolveInventoryWarehouseLabel(payload.WarehouseID, payload.Warehouse)
	sourceKey := resolveInventoryWarehouseKey(payload.SourceWarehouseID, payload.SourceWarehouse)
	sourceLabel := resolveInventoryWarehouseLabel(payload.SourceWarehouseID, payload.SourceWarehouse)
	if payload.SourceWarehouseID == "" && payload.SourceWarehouse == "" {
		sourceKey = currentWarehouseKey
		sourceLabel = resolveInventoryWarehouseLabel(product.WarehouseID, product.Warehouse)
	}

	quantity := payload.Quantity

	switch operationType {
	case "receipt":
		if payload.WarehouseID == "" && payload.Warehouse == "" {
			destinationKey = currentWarehouseKey
			destinationLabel = resolveInventoryWarehouseLabel(product.WarehouseID, product.Warehouse)
		}
		stockByWarehouse[destinationKey] += quantity
		nextCount += quantity
	case "writeoff", "sale":
		sourceKey = pickWarehouseWithInventory(stockByWarehouse, sourceKey, quantity)
		if nextCount < quantity || stockByWarehouse[sourceKey] < quantity {
			return inventoryPreparedOperation{}, errors.New("not enough stock")
		}
		stockByWarehouse[sourceKey] -= quantity
		if stockByWarehouse[sourceKey] <= 0 {
			delete(stockByWarehouse, sourceKey)
		}
		nextCount -= quantity
	case "movement":
		if payload.WarehouseID == "" && payload.Warehouse == "" {
			return inventoryPreparedOperation{}, errors.New("destination warehouse is required")
		}
		sourceKey = pickWarehouseWithInventory(stockByWarehouse, sourceKey, quantity)
		if sourceKey == destinationKey {
			return inventoryPreparedOperation{}, errors.New("destination warehouse must be different from source warehouse")
		}
		if nextCount < quantity || stockByWarehouse[sourceKey] < quantity {
			return inventoryPreparedOperation{}, errors.New("not enough stock")
		}
		stockByWarehouse[sourceKey] -= quantity
		if stockByWarehouse[sourceKey] <= 0 {
			delete(stockByWarehouse, sourceKey)
		}
		stockByWarehouse[destinationKey] += quantity
	case "adjustment":
		if payload.RealQuantity == nil {
			return inventoryPreparedOperation{}, errors.New("real_quantity is required for adjustment")
		}
		if *payload.RealQuantity < 0 {
			return inventoryPreparedOperation{}, errors.New("real_quantity cannot be negative")
		}
		sourceKey = resolveInventoryWarehouseKey(payload.WarehouseID, payload.Warehouse)
		sourceLabel = resolveInventoryWarehouseLabel(payload.WarehouseID, payload.Warehouse)
		systemQuantity := stockByWarehouse[sourceKey]
		if payload.SystemQuantity != nil {
			systemQuantity = *payload.SystemQuantity
		}
		quantity = *payload.RealQuantity - systemQuantity
		if *payload.RealQuantity == 0 {
			delete(stockByWarehouse, sourceKey)
		} else {
			stockByWarehouse[sourceKey] = *payload.RealQuantity
		}
		nextCount = sumStock(stockByWarehouse)
		destinationKey = sourceKey
		destinationLabel = sourceLabel
	}

	if nextCount < 0 {
		return inventoryPreparedOperation{}, errors.New("stock cannot be negative")
	}

	updateData := bson.M{
		"count":              nextCount,
		"stock_by_warehouse": stockByWarehouse,
		"updated_at":         now,
	}

	if operationType == "receipt" || operationType == "movement" || operationType == "adjustment" {
		updateData["warehouse_id"] = destinationKey
		updateData["warehouse"] = destinationLabel
	} else if nextCount == 0 {
		updateData["warehouse_id"] = product.WarehouseID
		updateData["warehouse"] = product.Warehouse
	}

	after := product
	after.Count = nextCount
	after.StockByWarehouse = stockByWarehouse
	if warehouseID, ok := updateData["warehouse_id"].(string); ok {
		after.WarehouseID = warehouseID
	}
	if warehouse, ok := updateData["warehouse"].(string); ok {
		after.Warehouse = warehouse
	}
	after.UpdatedAt = now

	return inventoryPreparedOperation{
		ID:            product.ID,
		Operation:     payload,
		ProductBefore: product,
		ProductAfter:  after,
		UpdateData:    updateData,
		OperationDoc: bson.M{
			"product_id":                  product.ID,
			"product_name":                product.Name,
			"type":                        operationType,
			"quantity":                    quantity,
			"source_warehouse_id":         sourceKey,
			"source_warehouse":            sourceLabel,
			"target_warehouse_id":         destinationKey,
			"target_warehouse":            destinationLabel,
			"reason":                      payload.Reason,
			"comment":                     payload.Comment,
			"files":                       payload.Files,
			"serial_numbers":              payload.SerialNumbers,
			"expiration_value":            payload.ExpirationValue,
			"expiration_unit":             payload.ExpirationUnit,
			"previous_count":              product.Count,
			"next_count":                  nextCount,
			"previous_stock_by_warehouse": product.StockByWarehouse,
			"next_stock_by_warehouse":     stockByWarehouse,
			"created_at":                  now,
		},
	}, nil
}

func ApplyInventoryTransactions(ctx context.Context, db *mongo.Client, payloads []InventoryTransactionPayload) ([]models.Product, []bson.M, error) {
	if len(payloads) == 0 {
		return nil, nil, errors.New("at least one inventory operation is required")
	}

	now := time.Now()
	productsCollection := config.GetCollection(db, "products")
	operationsCollection := config.GetCollection(db, "stock_operations")
	prepared := make([]inventoryPreparedOperation, 0, len(payloads))
	seenProducts := map[string]bool{}

	for _, payload := range payloads {
		if seenProducts[payload.ProductID] {
			return nil, nil, errors.New("duplicate product_id in one inventory transaction")
		}
		seenProducts[payload.ProductID] = true

		id, err := primitive.ObjectIDFromHex(payload.ProductID)
		if err != nil {
			return nil, nil, errors.New("invalid product_id")
		}
		var product models.Product
		if err := productsCollection.FindOne(ctx, bson.M{"_id": id}).Decode(&product); err != nil {
			return nil, nil, errors.New("product not found")
		}
		payload.Type = normalizeInventoryType(payload.Type)
		next, err := prepareInventoryOperation(product, payload, now)
		if err != nil {
			return nil, nil, err
		}
		prepared = append(prepared, next)
	}

	updatedProducts := make([]models.Product, 0, len(prepared))
	insertedOperations := make([]bson.M, 0, len(prepared))
	applied := make([]inventoryPreparedOperation, 0, len(prepared))

	for _, item := range prepared {
		filter := bson.M{"_id": item.ID}
		if !item.ProductBefore.UpdatedAt.IsZero() {
			filter["updated_at"] = item.ProductBefore.UpdatedAt
		}

		result, err := productsCollection.UpdateOne(ctx, filter, bson.M{"$set": item.UpdateData})
		if err != nil || result.MatchedCount != 1 {
			for i := len(applied) - 1; i >= 0; i-- {
				rollback := applied[i]
				_, _ = productsCollection.UpdateOne(ctx, bson.M{"_id": rollback.ID}, bson.M{"$set": bson.M{
					"count":              rollback.ProductBefore.Count,
					"stock_by_warehouse": rollback.ProductBefore.StockByWarehouse,
					"warehouse_id":       rollback.ProductBefore.WarehouseID,
					"warehouse":          rollback.ProductBefore.Warehouse,
					"updated_at":         rollback.ProductBefore.UpdatedAt,
				}})
			}
			if err != nil {
				return nil, nil, err
			}
			return nil, nil, errors.New("inventory changed during transaction")
		}

		if _, err := operationsCollection.InsertOne(ctx, item.OperationDoc); err != nil {
			_, _ = productsCollection.UpdateOne(ctx, bson.M{"_id": item.ID}, bson.M{"$set": bson.M{
				"count":              item.ProductBefore.Count,
				"stock_by_warehouse": item.ProductBefore.StockByWarehouse,
				"warehouse_id":       item.ProductBefore.WarehouseID,
				"warehouse":          item.ProductBefore.Warehouse,
				"updated_at":         item.ProductBefore.UpdatedAt,
			}})
			return nil, nil, err
		}

		applied = append(applied, item)
		insertedOperations = append(insertedOperations, item.OperationDoc)

		var updated models.Product
		if err := productsCollection.FindOne(ctx, bson.M{"_id": item.ID}).Decode(&updated); err != nil {
			return nil, nil, err
		}
		populateCategoryNames(db, &updated)
		if updated.Images == nil {
			updated.Images = []string{}
		}
		updatedProducts = append(updatedProducts, updated)
	}

	return updatedProducts, insertedOperations, nil
}

func inventoryErrorResponse(c *fiber.Ctx, err error) error {
	message := err.Error()
	status := fiber.StatusBadRequest
	if strings.Contains(message, "changed during transaction") {
		status = fiber.StatusConflict
	}
	return c.Status(status).JSON(fiber.Map{"error": message})
}
