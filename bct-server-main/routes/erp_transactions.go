package routes

import (
	"context"
	"fmt"
	"strings"
	"time"

	"fiber-ecommerce/config"
	"fiber-ecommerce/models"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type ERPTransactionPayload struct {
	Kind          string                 `json:"kind"`
	Type          string                 `json:"type"`
	Category      string                 `json:"category"`
	Status        string                 `json:"status"`
	Amount        float64                `json:"amount"`
	Currency      string                 `json:"currency"`
	Source        string                 `json:"source"`
	Destination   string                 `json:"destination"`
	PaymentMethod string                 `json:"payment_method"`
	OperationAt   string                 `json:"operation_at"`
	Comment       string                 `json:"comment"`
	Reason        string                 `json:"reason"`
	ReferenceType string                 `json:"reference_type"`
	ReferenceID   string                 `json:"reference_id"`
	Metadata      map[string]interface{} `json:"metadata"`
}

func normalizeTransactionKind(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "inventory", "finance", "deal", "manual":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return "manual"
	}
}

func normalizeTransactionStatus(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "draft", "posted", "cancelled":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return "posted"
	}
}

func normalizeTransactionType(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	switch normalized {
	case "income", "expense", "transfer", "payment", "refund", "receipt", "writeoff", "movement", "adjustment", "sale", "deal":
		return normalized
	case "":
		return "payment"
	default:
		return normalized
	}
}

func normalizePaymentMethod(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "cash", "card", "transfer", "multi":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return ""
	}
}

func erpTransactionDocumentID(prefix string, now time.Time) string {
	return fmt.Sprintf("%s-%s", prefix, now.Format("20060102150405.000000000"))
}

func upsertContractERPTransaction(db *mongo.Client, contract models.Contract) error {
	collection := config.GetCollection(db, "erp_transactions")
	now := time.Now()
	documentID := contract.ContractNumber
	if strings.TrimSpace(documentID) == "" {
		documentID = erpTransactionDocumentID("DEAL", now)
	}

	paid := contract.PayCard.Float64() + contract.PayCash.Float64()
	remaining := contract.ContractAmount.Float64() - paid
	if remaining < 0 {
		remaining = 0
	}

	update := bson.M{
		"document_id":       documentID,
		"kind":              "deal",
			"type":              "deal",
			"category":          "deal",
			"status":            "posted",
			"amount":            contract.ContractAmount,
			"currency":          contract.ContractCurrency,
			"source":            "deal",
			"destination":       "accounts_receivable",
		"comment":           contract.Comment,
		"reason":            contract.Guarantee,
		"reference_type":    "contract",
		"reference_id":      contract.ID.Hex(),
		"related_contract":  contract.ID.Hex(),
		"metadata": bson.M{
			"contract_number":   contract.ContractNumber,
			"client_name":       contract.ClientName,
			"company_name":      contract.CompanyName,
			"counterparty_name": contract.CounterpartyName,
			"deal_date":         contract.DealDate,
			"total_amount":      contract.ContractAmount,
			"paid_amount":       paid,
			"remaining_amount":  remaining,
			"pay_card":          contract.PayCard,
			"pay_cash":          contract.PayCash,
			"products_count":    len(contract.Products),
		},
		"updated_at": now,
	}

	_, err := collection.UpdateOne(
		context.TODO(),
		bson.M{"reference_type": "contract", "reference_id": contract.ID.Hex()},
		bson.M{
			"$set":         update,
			"$setOnInsert": bson.M{"created_at": now},
		},
		options.Update().SetUpsert(true),
	)
	return err
}

func deleteERPTransactionsByReference(db *mongo.Client, referenceType, referenceID string) error {
	if strings.TrimSpace(referenceType) == "" || strings.TrimSpace(referenceID) == "" {
		return nil
	}
	collection := config.GetCollection(db, "erp_transactions")
	_, err := collection.DeleteMany(context.TODO(), bson.M{
		"reference_type": referenceType,
		"reference_id":   referenceID,
	})
	return err
}

func syncInventoryOperationsToERP(db *mongo.Client, operationDocs []bson.M) error {
	if len(operationDocs) == 0 {
		return nil
	}

	collection := config.GetCollection(db, "erp_transactions")
	now := time.Now()
	documents := make([]interface{}, 0, len(operationDocs))

	for _, item := range operationDocs {
		documentID, _ := item["document_id"].(string)
		operationType, _ := item["type"].(string)
		referenceID := ""
		if productID, ok := item["product_id"].(primitive.ObjectID); ok {
			referenceID = productID.Hex()
		}
		quantity, _ := toInt(item["quantity"])

		documents = append(documents, bson.M{
			"document_id":       documentID,
			"kind":              "inventory",
			"type":              operationType,
			"category":          operationType,
			"status":            "posted",
			"amount":            0,
			"currency":          "UZS",
			"source":            item["source_warehouse"],
			"destination":       item["target_warehouse"],
			"comment":           item["comment"],
			"reason":            item["reason"],
			"reference_type":    "inventory_operation",
			"reference_id":      referenceID,
			"related_product":   referenceID,
			"related_warehouse": fmt.Sprint(item["target_warehouse_id"]),
			"quantity":          quantity,
			"metadata":          item,
			"created_at":        now,
			"updated_at":        now,
		})
	}

	_, err := collection.InsertMany(context.TODO(), documents)
	return err
}

func ERPTransactionRoutes(app fiber.Router, db *mongo.Client) {
	group := app.Group("/finance/transactions")

	group.Get("/", func(c *fiber.Ctx) error {
		collection := config.GetCollection(db, "erp_transactions")
		kind := strings.TrimSpace(c.Query("kind"))
		limit := 200
		filter := bson.M{}
		if kind != "" {
			filter["kind"] = kind
		}

		cursor, err := collection.Find(
			context.TODO(),
			filter,
			options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}).SetLimit(int64(limit)),
		)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch ERP transactions"})
		}
		defer cursor.Close(context.TODO())

		var items []models.ERPTransaction
		if err := cursor.All(context.TODO(), &items); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to decode ERP transactions"})
		}

		if items == nil {
			items = []models.ERPTransaction{}
		}

		return c.JSON(fiber.Map{
			"data":  items,
			"total": len(items),
		})
	})

	group.Post("/", func(c *fiber.Ctx) error {
		var payload ERPTransactionPayload
		if err := c.BodyParser(&payload); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		if payload.Amount <= 0 {
			return c.Status(400).JSON(fiber.Map{"error": "amount must be greater than zero"})
		}
		if normalized, ok := normalizeCurrency(payload.Currency); ok {
			payload.Currency = normalized
		} else {
			return c.Status(400).JSON(fiber.Map{"error": "currency must be one of UZS, USD, EUR"})
		}
		if strings.TrimSpace(payload.Source) == "" || strings.TrimSpace(payload.Destination) == "" {
			return c.Status(400).JSON(fiber.Map{"error": "source and destination are required"})
		}
		if strings.TrimSpace(payload.Category) == "" {
			return c.Status(400).JSON(fiber.Map{"error": "category is required"})
		}

		now := time.Now()
		operationAt := now
		if strings.TrimSpace(payload.OperationAt) != "" {
			parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(payload.OperationAt))
			if err != nil {
				return c.Status(400).JSON(fiber.Map{"error": "operation_at must be a valid RFC3339 datetime"})
			}
			operationAt = parsed
		}

		model := models.ERPTransaction{
			ID:            primitive.NewObjectID(),
			DocumentID:    erpTransactionDocumentID("TRX", now),
			Kind:          normalizeTransactionKind(payload.Kind),
			Type:          normalizeTransactionType(payload.Type),
			Category:      strings.TrimSpace(payload.Category),
			Status:        normalizeTransactionStatus(payload.Status),
			Amount:        models.NewFlexFloat64(payload.Amount),
			Currency:      payload.Currency,
			Source:        strings.TrimSpace(payload.Source),
			Destination:   strings.TrimSpace(payload.Destination),
			PaymentMethod: normalizePaymentMethod(payload.PaymentMethod),
			Comment:       strings.TrimSpace(payload.Comment),
			Reason:        strings.TrimSpace(payload.Reason),
			ReferenceType: strings.TrimSpace(payload.ReferenceType),
			ReferenceID:   strings.TrimSpace(payload.ReferenceID),
			OperationAt:   operationAt,
			Metadata:      payload.Metadata,
			CreatedAt:     now,
			UpdatedAt:     now,
		}

		collection := config.GetCollection(db, "erp_transactions")
		if _, err := collection.InsertOne(context.TODO(), model); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create ERP transaction"})
		}

		return c.Status(201).JSON(model)
	})
}
