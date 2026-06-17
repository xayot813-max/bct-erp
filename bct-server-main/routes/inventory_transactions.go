package routes

import (
	"context"
	"errors"
	"fmt"
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
	Reference  string                        `json:"reference"`
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

func normalizeSerialList(values []string) []string {
	normalized := make([]string, 0, len(values))
	seen := map[string]bool{}
	for _, value := range values {
		serial := strings.TrimSpace(value)
		if serial == "" || seen[serial] {
			continue
		}
		seen[serial] = true
		normalized = append(normalized, serial)
	}
	return normalized
}

func normalizeProductSerialItems(product models.Product) []models.ProductSerialUnit {
	items := make([]models.ProductSerialUnit, 0, len(product.SerialItems)+1)
	seen := map[string]bool{}

	for _, item := range product.SerialItems {
		serial := strings.TrimSpace(item.SerialNumber)
		if serial == "" || seen[serial] {
			continue
		}
		seen[serial] = true
		warehouseID := resolveInventoryWarehouseKey(item.WarehouseID, item.Warehouse)
		items = append(items, models.ProductSerialUnit{
			SerialNumber: serial,
			WarehouseID:  warehouseID,
			Warehouse:    resolveInventoryWarehouseLabel(warehouseID, item.Warehouse),
			CreatedAt:    item.CreatedAt,
			UpdatedAt:    item.UpdatedAt,
		})
	}

	if len(items) == 0 && strings.TrimSpace(product.SerialNumber) != "" && product.Count == 1 {
		warehouseID := resolveInventoryWarehouseKey(product.WarehouseID, product.Warehouse)
		items = append(items, models.ProductSerialUnit{
			SerialNumber: strings.TrimSpace(product.SerialNumber),
			WarehouseID:  warehouseID,
			Warehouse:    resolveInventoryWarehouseLabel(warehouseID, product.Warehouse),
			CreatedAt:    product.CreatedAt,
			UpdatedAt:    product.UpdatedAt,
		})
	}

	return items
}

func serialWarehouseTotals(items []models.ProductSerialUnit) map[string]int {
	totals := map[string]int{}
	for _, item := range items {
		warehouseID := resolveInventoryWarehouseKey(item.WarehouseID, item.Warehouse)
		totals[warehouseID]++
	}
	return totals
}

func ensureSerialNumbersAvailable(ctx context.Context, productsCollection *mongo.Collection, currentProductID primitive.ObjectID, serials []string) error {
	if len(serials) == 0 {
		return nil
	}

	filter := bson.M{
		"_id": bson.M{"$ne": currentProductID},
		"$or": []bson.M{
			{"serial_number": bson.M{"$in": serials}},
			{"serial_items.serial_number": bson.M{"$in": serials}},
		},
	}

	conflicts, err := productsCollection.CountDocuments(ctx, filter)
	if err != nil {
		return err
	}
	if conflicts > 0 {
		return errors.New("serial numbers must be globally unique")
	}
	return nil
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

func validateInventorySerials(payload InventoryTransactionPayload) error {
	normalizedSerials := normalizeSerialList(payload.SerialNumbers)
	if len(normalizedSerials) > 0 && len(normalizedSerials) != payload.Quantity {
		return errors.New("serial numbers count must match quantity")
	}
	return nil
}

func prepareInventoryOperation(ctx context.Context, productsCollection *mongo.Collection, product models.Product, payload InventoryTransactionPayload, now time.Time, documentID string) (inventoryPreparedOperation, error) {
	operationType := normalizeInventoryType(payload.Type)
	if operationType != "receipt" && operationType != "writeoff" && operationType != "sale" && operationType != "movement" && operationType != "adjustment" {
		return inventoryPreparedOperation{}, errors.New("type must be receipt, writeoff, sale, movement, or adjustment")
	}

	if operationType == "receipt" || operationType == "writeoff" || operationType == "movement" || operationType == "sale" {
		if err := validateInventorySerials(payload); err != nil {
			return inventoryPreparedOperation{}, err
		}
	}

	if operationType != "adjustment" && payload.Quantity <= 0 {
		return inventoryPreparedOperation{}, errors.New("quantity must be greater than zero")
	}

	stockByWarehouse := copyPositiveStock(product.StockByWarehouse)
	serialItems := normalizeProductSerialItems(product)
	currentWarehouseKey := resolveInventoryWarehouseKey(product.WarehouseID, product.Warehouse)
	if len(stockByWarehouse) == 0 && product.Count > 0 {
		stockByWarehouse[currentWarehouseKey] = product.Count
	}
	if len(serialItems) > 0 {
		stockByWarehouse = serialWarehouseTotals(serialItems)
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
	normalizedSerials := normalizeSerialList(payload.SerialNumbers)

	switch operationType {
	case "receipt":
		if payload.WarehouseID == "" && payload.Warehouse == "" {
			destinationKey = currentWarehouseKey
			destinationLabel = resolveInventoryWarehouseLabel(product.WarehouseID, product.Warehouse)
		}
		if err := ensureSerialNumbersAvailable(ctx, productsCollection, product.ID, normalizedSerials); err != nil {
			return inventoryPreparedOperation{}, err
		}
		stockByWarehouse[destinationKey] += quantity
		nextCount += quantity
		for _, serial := range normalizedSerials {
			serialItems = append(serialItems, models.ProductSerialUnit{
				SerialNumber: serial,
				WarehouseID:  destinationKey,
				Warehouse:    destinationLabel,
				CreatedAt:    now,
				UpdatedAt:    now,
			})
		}
	case "writeoff", "sale":
		sourceKey = pickWarehouseWithInventory(stockByWarehouse, sourceKey, quantity)
		if nextCount < quantity || stockByWarehouse[sourceKey] < quantity {
			return inventoryPreparedOperation{}, errors.New("not enough stock")
		}
		if len(normalizedSerials) != quantity {
			return inventoryPreparedOperation{}, errors.New("serial numbers count must match quantity")
		}
		remaining := make([]models.ProductSerialUnit, 0, len(serialItems))
		selectedSerials := map[string]bool{}
		for _, serial := range normalizedSerials {
			selectedSerials[serial] = false
		}
		for _, item := range serialItems {
			warehouseID := resolveInventoryWarehouseKey(item.WarehouseID, item.Warehouse)
			if warehouseID == sourceKey {
				if _, exists := selectedSerials[item.SerialNumber]; exists && !selectedSerials[item.SerialNumber] {
					selectedSerials[item.SerialNumber] = true
					continue
				}
			}
			remaining = append(remaining, item)
		}
		for _, found := range selectedSerials {
			if !found {
				return inventoryPreparedOperation{}, errors.New("serial number not found in source warehouse")
			}
		}
		serialItems = remaining
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
		if len(normalizedSerials) != quantity {
			return inventoryPreparedOperation{}, errors.New("serial numbers count must match quantity")
		}
		selectedSerials := map[string]bool{}
		for _, serial := range normalizedSerials {
			selectedSerials[serial] = false
		}
		for index := range serialItems {
			warehouseID := resolveInventoryWarehouseKey(serialItems[index].WarehouseID, serialItems[index].Warehouse)
			if warehouseID == sourceKey {
				if _, exists := selectedSerials[serialItems[index].SerialNumber]; exists && !selectedSerials[serialItems[index].SerialNumber] {
					selectedSerials[serialItems[index].SerialNumber] = true
					serialItems[index].WarehouseID = destinationKey
					serialItems[index].Warehouse = destinationLabel
					serialItems[index].UpdatedAt = now
				}
			}
		}
		for _, found := range selectedSerials {
			if !found {
				return inventoryPreparedOperation{}, errors.New("serial number not found in source warehouse")
			}
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
		if len(serialItems) > 0 || len(normalizedSerials) > 0 {
			diff := *payload.RealQuantity - systemQuantity
			if diff > 0 {
				if len(normalizedSerials) != diff {
					return inventoryPreparedOperation{}, errors.New("serial numbers count must match quantity")
				}
				if err := ensureSerialNumbersAvailable(ctx, productsCollection, product.ID, normalizedSerials); err != nil {
					return inventoryPreparedOperation{}, err
				}
				for _, serial := range normalizedSerials {
					serialItems = append(serialItems, models.ProductSerialUnit{
						SerialNumber: serial,
						WarehouseID:  sourceKey,
						Warehouse:    sourceLabel,
						CreatedAt:    now,
						UpdatedAt:    now,
					})
				}
			} else if diff < 0 {
				if len(normalizedSerials) != -diff {
					return inventoryPreparedOperation{}, errors.New("serial numbers count must match quantity")
				}
				remaining := make([]models.ProductSerialUnit, 0, len(serialItems))
				selectedSerials := map[string]bool{}
				for _, serial := range normalizedSerials {
					selectedSerials[serial] = false
				}
				for _, item := range serialItems {
					warehouseID := resolveInventoryWarehouseKey(item.WarehouseID, item.Warehouse)
					if warehouseID == sourceKey {
						if _, exists := selectedSerials[item.SerialNumber]; exists && !selectedSerials[item.SerialNumber] {
							selectedSerials[item.SerialNumber] = true
							continue
						}
					}
					remaining = append(remaining, item)
				}
				for _, found := range selectedSerials {
					if !found {
						return inventoryPreparedOperation{}, errors.New("serial number not found in source warehouse")
					}
				}
				serialItems = remaining
			}
		}
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
		"serial_items":       serialItems,
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
	after.SerialItems = serialItems
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
			"document_id":                 documentID,
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
			"serial_numbers":              normalizedSerials,
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
	documentID := fmt.Sprintf("STK-%s", now.Format("20060102150405.000000000"))
	productsCollection := config.GetCollection(db, "products")
	operationsCollection := config.GetCollection(db, "stock_operations")
	prepared := make([]inventoryPreparedOperation, 0, len(payloads))
	productState := map[string]models.Product{}

	for _, payload := range payloads {
		id, err := primitive.ObjectIDFromHex(payload.ProductID)
		if err != nil {
			return nil, nil, errors.New("invalid product_id")
		}
		stateKey := id.Hex()
		product, exists := productState[stateKey]
		if !exists {
			if err := productsCollection.FindOne(ctx, bson.M{"_id": id}).Decode(&product); err != nil {
				return nil, nil, errors.New("product not found")
			}
		}
		payload.Type = normalizeInventoryType(payload.Type)
		next, err := prepareInventoryOperation(ctx, productsCollection, product, payload, now, documentID)
		if err != nil {
			return nil, nil, err
		}
		prepared = append(prepared, next)
		productState[stateKey] = next.ProductAfter
	}

	updatedProducts := make([]models.Product, 0, len(prepared))
	insertedOperations := make([]bson.M, 0, len(prepared))
	applied := make([]inventoryPreparedOperation, 0, len(prepared))
	insertedOperationIDs := make([]interface{}, 0, len(prepared))

	rollbackApplied := func() {
		for i := len(applied) - 1; i >= 0; i-- {
			rollback := applied[i]
			_, _ = productsCollection.UpdateOne(ctx, bson.M{"_id": rollback.ID}, bson.M{"$set": bson.M{
				"count":              rollback.ProductBefore.Count,
				"stock_by_warehouse": rollback.ProductBefore.StockByWarehouse,
				"serial_items":       rollback.ProductBefore.SerialItems,
				"warehouse_id":       rollback.ProductBefore.WarehouseID,
				"warehouse":          rollback.ProductBefore.Warehouse,
				"updated_at":         rollback.ProductBefore.UpdatedAt,
			}})
		}
		if len(insertedOperationIDs) > 0 {
			_, _ = operationsCollection.DeleteMany(ctx, bson.M{"_id": bson.M{"$in": insertedOperationIDs}})
		}
	}

	for _, item := range prepared {
		filter := bson.M{"_id": item.ID}
		if !item.ProductBefore.UpdatedAt.IsZero() {
			filter["updated_at"] = item.ProductBefore.UpdatedAt
		}

		result, err := productsCollection.UpdateOne(ctx, filter, bson.M{"$set": item.UpdateData})
		if err != nil || result.MatchedCount != 1 {
			rollbackApplied()
			if err != nil {
				return nil, nil, err
			}
			return nil, nil, errors.New("inventory changed during transaction")
		}

		insertResult, err := operationsCollection.InsertOne(ctx, item.OperationDoc)
		if err != nil {
			applied = append(applied, item)
			rollbackApplied()
			return nil, nil, err
		}
		insertedOperationIDs = append(insertedOperationIDs, insertResult.InsertedID)

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

	if err := syncInventoryOperationsToERP(db, insertedOperations); err != nil {
		return nil, nil, err
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
