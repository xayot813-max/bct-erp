package routes

import (
	"context"
	"net/url"
	"strconv"
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

type vendorPayload struct {
	Name              string   `json:"name"`
	Phone             string   `json:"phone"`
	Agent             string   `json:"agent"`
	DefaultMode       string   `json:"default_mode"`
	AllowCash         *bool    `json:"allow_cash"`
	AllowDebt         *bool    `json:"allow_debt"`
	AllowMixed        *bool    `json:"allow_mixed"`
	ActiveForSupplies *bool    `json:"active_for_supplies"`
	CurrentDebt       *float64 `json:"current_debt"`
	DebtLimit         *float64 `json:"debt_limit"`
	Comment           string   `json:"comment"`
}

func normalizeVendorPhone(value string) string {
	digits := strings.Builder{}
	for _, symbol := range value {
		if symbol >= '0' && symbol <= '9' {
			digits.WriteRune(symbol)
		}
	}

	raw := digits.String()
	switch {
	case raw == "":
		return ""
	case strings.HasPrefix(raw, "998"):
		raw = raw[3:]
	case strings.HasPrefix(raw, "00998"):
		raw = raw[5:]
	case len(raw) == 9:
	default:
		return strings.TrimSpace(value)
	}

	if len(raw) > 9 {
		raw = raw[:9]
	}
	if len(raw) == 0 {
		return ""
	}
	if len(raw) < 9 {
		return "+998" + raw
	}

	return "+998" + raw
}

func isValidVendorMode(value string) bool {
	switch value {
	case "partial", "cash", "debt":
		return true
	default:
		return false
	}
}

func normalizeVendorPayload(payload vendorPayload) (models.Vendor, error) {
	name := strings.TrimSpace(payload.Name)
	if name == "" {
		return models.Vendor{}, fiber.NewError(fiber.StatusBadRequest, "Name is required")
	}

	mode := strings.ToLower(strings.TrimSpace(payload.DefaultMode))
	if mode == "" {
		mode = "partial"
	}
	if !isValidVendorMode(mode) {
		return models.Vendor{}, fiber.NewError(fiber.StatusBadRequest, "Default mode must be partial, cash, or debt")
	}

	phone := normalizeVendorPhone(payload.Phone)
	if phone != "" {
		digitsOnly := strings.TrimPrefix(phone, "+998")
		if len(digitsOnly) < 9 {
			return models.Vendor{}, fiber.NewError(fiber.StatusBadRequest, "Phone number is incomplete")
		}
	}

	allowCash := false
	if payload.AllowCash != nil {
		allowCash = *payload.AllowCash
	}
	allowDebt := false
	if payload.AllowDebt != nil {
		allowDebt = *payload.AllowDebt
	}
	allowMixed := false
	if payload.AllowMixed != nil {
		allowMixed = *payload.AllowMixed
	}
	activeForSupplies := true
	if payload.ActiveForSupplies != nil {
		activeForSupplies = *payload.ActiveForSupplies
	}
	currentDebt := 0.0
	if payload.CurrentDebt != nil {
		currentDebt = *payload.CurrentDebt
	}
	debtLimit := 0.0
	if payload.DebtLimit != nil {
		debtLimit = *payload.DebtLimit
	}
	if currentDebt < 0 || debtLimit < 0 {
		return models.Vendor{}, fiber.NewError(fiber.StatusBadRequest, "Debt values cannot be negative")
	}

	return models.Vendor{
		Name:              name,
		Phone:             phone,
		Agent:             strings.TrimSpace(payload.Agent),
		DefaultMode:       mode,
		AllowCash:         allowCash,
		AllowDebt:         allowDebt,
		AllowMixed:        allowMixed,
		ActiveForSupplies: activeForSupplies,
		CurrentDebt:       currentDebt,
		DebtLimit:         debtLimit,
		Comment:           strings.TrimSpace(payload.Comment),
	}, nil
}

func registerVendorRoutes(app fiber.Router, db *mongo.Client) {
	vendors := app.Group("/vendors")
	collection := config.GetCollection(db, "vendors")

	hydrateVendorDefaults := func(vendor models.Vendor) models.Vendor {
		isLegacyVendor := strings.TrimSpace(vendor.Name) == "" && strings.TrimSpace(vendor.Phone) == "" && strings.TrimSpace(vendor.Agent) == ""
		if strings.TrimSpace(vendor.Name) == "" {
			if parsed, err := url.Parse(strings.TrimSpace(vendor.URL)); err == nil && strings.TrimSpace(parsed.Host) != "" {
				vendor.Name = parsed.Host
			} else {
				vendor.Name = "Supplier"
			}
		}
		if !isValidVendorMode(vendor.DefaultMode) {
			vendor.DefaultMode = "partial"
		}
		if vendor.CreatedAt.IsZero() {
			vendor.CreatedAt = time.Now()
		}
		if vendor.UpdatedAt.IsZero() {
			vendor.UpdatedAt = vendor.CreatedAt
		}
		if isLegacyVendor && !vendor.ActiveForSupplies {
			vendor.ActiveForSupplies = true
		}
		return vendor
	}

	vendors.Get("/", func(c *fiber.Ctx) error {
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
				{"phone": bson.M{"$regex": search, "$options": "i"}},
				{"agent": bson.M{"$regex": search, "$options": "i"}},
			}
		}
		if activeRaw := strings.TrimSpace(c.Query("active_for_supplies")); activeRaw != "" {
			filter["active_for_supplies"] = activeRaw == "true" || activeRaw == "1"
		}

		opts := options.Find().
			SetSkip(int64((page - 1) * limit)).
			SetLimit(int64(limit)).
			SetSort(bson.D{{Key: "created_at", Value: -1}, {Key: "name", Value: 1}})

		cursor, err := collection.Find(context.TODO(), filter, opts)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch vendors"})
		}
		defer cursor.Close(context.TODO())

		result := []models.Vendor{}
		if err := cursor.All(context.TODO(), &result); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to decode vendors"})
		}
		for index := range result {
			result[index] = hydrateVendorDefaults(result[index])
		}

		total, _ := collection.CountDocuments(context.TODO(), filter)
		return c.JSON(fiber.Map{"data": result, "total": total, "page": page, "limit": limit})
	})

	vendors.Get("/:id", func(c *fiber.Ctx) error {
		id, err := primitive.ObjectIDFromHex(strings.TrimSpace(c.Params("id")))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid vendor ID"})
		}

		var vendor models.Vendor
		if err := collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&vendor); err != nil {
			if err == mongo.ErrNoDocuments {
				return c.Status(404).JSON(fiber.Map{"error": "Vendor not found"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch vendor"})
		}
		return c.JSON(hydrateVendorDefaults(vendor))
	})

	vendors.Post("/", func(c *fiber.Ctx) error {
		var payload vendorPayload
		if err := c.BodyParser(&payload); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		vendor, err := normalizeVendorPayload(payload)
		if err != nil {
			return err
		}

		now := time.Now()
		vendor.ID = primitive.NewObjectID()
		vendor.CreatedAt = now
		vendor.UpdatedAt = now

		if _, err := collection.InsertOne(context.TODO(), vendor); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create vendor"})
		}
		return c.Status(201).JSON(hydrateVendorDefaults(vendor))
	})

	vendors.Put("/:id", func(c *fiber.Ctx) error {
		id, err := primitive.ObjectIDFromHex(strings.TrimSpace(c.Params("id")))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid vendor ID"})
		}

		var payload vendorPayload
		if err := c.BodyParser(&payload); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		vendor, err := normalizeVendorPayload(payload)
		if err != nil {
			return err
		}

		updateData := bson.M{
			"name":                vendor.Name,
			"phone":               vendor.Phone,
			"agent":               vendor.Agent,
			"default_mode":        vendor.DefaultMode,
			"allow_cash":          vendor.AllowCash,
			"allow_debt":          vendor.AllowDebt,
			"allow_mixed":         vendor.AllowMixed,
			"active_for_supplies": vendor.ActiveForSupplies,
			"current_debt":        vendor.CurrentDebt,
			"debt_limit":          vendor.DebtLimit,
			"comment":             vendor.Comment,
			"updated_at":          time.Now(),
		}

		result, err := collection.UpdateOne(context.TODO(), bson.M{"_id": id}, bson.M{"$set": updateData})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update vendor"})
		}
		if result.MatchedCount == 0 {
			return c.Status(404).JSON(fiber.Map{"error": "Vendor not found"})
		}

		var updated models.Vendor
		if err := collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&updated); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch updated vendor"})
		}
		return c.JSON(hydrateVendorDefaults(updated))
	})

	vendors.Delete("/:id", func(c *fiber.Ctx) error {
		id, err := primitive.ObjectIDFromHex(strings.TrimSpace(c.Params("id")))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid vendor ID"})
		}

		result, err := collection.DeleteOne(context.TODO(), bson.M{"_id": id})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to delete vendor"})
		}
		if result.DeletedCount == 0 {
			return c.Status(404).JSON(fiber.Map{"error": "Vendor not found"})
		}
		return c.JSON(fiber.Map{"message": "Vendor deleted successfully"})
	})
}
