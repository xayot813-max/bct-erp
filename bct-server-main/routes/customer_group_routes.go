package routes

import (
	"context"
	"regexp"
	"sort"
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

type customerGroupPayload struct {
	Name              string `json:"name"`
	Code              string `json:"code"`
	Description       string `json:"description"`
	Color             string `json:"color"`
	PricingProfile    string `json:"pricing_profile"`
	DiscountPolicyRef string `json:"discount_policy_ref"`
	Priority          int    `json:"priority"`
	IsActive          *bool  `json:"is_active"`
}

type customerGroupAnalyticsItem struct {
	Group          models.CustomerGroup `json:"group"`
	ClientCount    int                  `json:"client_count"`
	OrderCount     int                  `json:"order_count"`
	TotalAmount    float64              `json:"total_amount"`
	AverageRevenue float64              `json:"average_revenue"`
}

var customerGroupSlugPattern = regexp.MustCompile(`[^a-z0-9]+`)

func defaultCustomerGroups() []models.CustomerGroup {
	now := time.Now()
	return []models.CustomerGroup{
		{Code: "retail", Name: "Retail", Color: "#4F8CFF", PricingProfile: "retail", Priority: 10, IsSystem: true, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Code: "wholesale", Name: "Wholesale", Color: "#1FA971", PricingProfile: "wholesale", Priority: 20, IsSystem: true, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Code: "regular", Name: "Regular", Color: "#6F7B91", PricingProfile: "standard", Priority: 30, IsSystem: true, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Code: "vip", Name: "VIP", Color: "#8A5BFF", PricingProfile: "vip", Priority: 40, IsSystem: true, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Code: "corporate", Name: "Corporate", Color: "#F59E0B", PricingProfile: "corporate", Priority: 50, IsSystem: true, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Code: "distributor", Name: "Distributor", Color: "#EF4444", PricingProfile: "distributor", Priority: 60, IsSystem: true, IsActive: true, CreatedAt: now, UpdatedAt: now},
	}
}

func normalizeCustomerGroupCode(input string) string {
	value := strings.ToLower(strings.TrimSpace(input))
	value = customerGroupSlugPattern.ReplaceAllString(value, "-")
	value = strings.Trim(value, "-")
	if value == "" {
		return "group"
	}
	return value
}

func buildCustomerGroupBrief(group models.CustomerGroup) models.CustomerGroupBrief {
	return models.CustomerGroupBrief{
		ID:                group.ID,
		Code:              group.Code,
		Name:              group.Name,
		Color:             group.Color,
		PricingProfile:    group.PricingProfile,
		DiscountPolicyRef: group.DiscountPolicyRef,
	}
}

func calculateOrderAmount(entry models.OrderHistoryEntry) float64 {
	total := entry.Price.Float64()
	if total > 0 {
		return total
	}

	var sum float64
	for _, product := range entry.Products {
		quantity := product.Quantity
		if quantity <= 0 {
			quantity = 1
		}
		sum += product.Price.Float64() * float64(quantity)
	}
	return sum
}

func ensureCustomerGroupIndexes(db *mongo.Client) error {
	collection := config.GetCollection(db, "customer_groups")
	_, err := collection.Indexes().CreateMany(context.TODO(), []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "code", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("customer_group_code_unique"),
		},
		{
			Keys:    bson.D{{Key: "name", Value: 1}},
			Options: options.Index().SetName("customer_group_name_idx"),
		},
		{
			Keys:    bson.D{{Key: "priority", Value: 1}, {Key: "name", Value: 1}},
			Options: options.Index().SetName("customer_group_priority_idx"),
		},
	})
	return err
}

func ensureCustomerGroupDefaults(db *mongo.Client) error {
	if err := ensureCustomerGroupIndexes(db); err != nil {
		return err
	}

	collection := config.GetCollection(db, "customer_groups")
	for _, group := range defaultCustomerGroups() {
		update := bson.M{
			"$set": bson.M{
				"name":                group.Name,
				"description":         group.Description,
				"color":               group.Color,
				"pricing_profile":     group.PricingProfile,
				"discount_policy_ref": group.DiscountPolicyRef,
				"priority":            group.Priority,
				"is_system":           true,
				"is_active":           true,
				"updated_at":          time.Now(),
			},
			"$setOnInsert": bson.M{
				"code":       group.Code,
				"created_at": group.CreatedAt,
			},
		}
		if _, err := collection.UpdateOne(
			context.TODO(),
			bson.M{"code": group.Code},
			update,
			options.Update().SetUpsert(true),
		); err != nil {
			return err
		}
	}

	return ensureClientGroupBackfill(db)
}

func getCustomerGroupByID(db *mongo.Client, id primitive.ObjectID) (models.CustomerGroup, error) {
	collection := config.GetCollection(db, "customer_groups")
	var group models.CustomerGroup
	err := collection.FindOne(context.TODO(), bson.M{"_id": id, "is_active": true}).Decode(&group)
	return group, err
}

func getCustomerGroupByCode(db *mongo.Client, code string) (models.CustomerGroup, error) {
	collection := config.GetCollection(db, "customer_groups")
	var group models.CustomerGroup
	err := collection.FindOne(context.TODO(), bson.M{"code": normalizeCustomerGroupCode(code), "is_active": true}).Decode(&group)
	return group, err
}

func resolveCustomerGroupForPayload(db *mongo.Client, groupID string) (models.CustomerGroup, error) {
	if strings.TrimSpace(groupID) != "" {
		id, err := primitive.ObjectIDFromHex(groupID)
		if err != nil {
			return models.CustomerGroup{}, err
		}
		return getCustomerGroupByID(db, id)
	}
	return getCustomerGroupByCode(db, "regular")
}

func ensureClientGroupBackfill(db *mongo.Client) error {
	regularGroup, err := getCustomerGroupByCode(db, "regular")
	if err != nil {
		return err
	}

	clientsCollection := config.GetCollection(db, "clients")
	_, err = clientsCollection.UpdateMany(
		context.TODO(),
		bson.M{
			"$or": []bson.M{
				{"group": bson.M{"$exists": false}},
				{"group": nil},
				{"group.id": bson.M{"$exists": false}},
			},
		},
		bson.M{
			"$set": bson.M{
				"group":      buildCustomerGroupBrief(regularGroup),
				"updated_at": time.Now(),
			},
		},
	)
	return err
}

func CustomerGroupRoutes(app fiber.Router, db *mongo.Client) {
	if err := ensureCustomerGroupDefaults(db); err != nil {
		panic(err)
	}

	groups := app.Group("/client-groups")

	groups.Get("/", func(c *fiber.Ctx) error {
		collection := config.GetCollection(db, "customer_groups")
		search := strings.TrimSpace(c.Query("search"))
		filter := bson.M{}
		if search != "" {
			filter["name"] = bson.M{"$regex": search, "$options": "i"}
		}

		opts := options.Find().SetSort(bson.D{{Key: "priority", Value: 1}, {Key: "name", Value: 1}})
		cursor, err := collection.Find(context.TODO(), filter, opts)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch customer groups"})
		}
		defer cursor.Close(context.TODO())

		var items []models.CustomerGroup
		if err := cursor.All(context.TODO(), &items); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to decode customer groups"})
		}

		return c.JSON(fiber.Map{"data": items, "total": len(items)})
	})

	groups.Get("/analytics", func(c *fiber.Ctx) error {
		groupCollection := config.GetCollection(db, "customer_groups")
		clientCollection := config.GetCollection(db, "clients")

		groupCursor, err := groupCollection.Find(context.TODO(), bson.M{}, options.Find().SetSort(bson.D{{Key: "priority", Value: 1}, {Key: "name", Value: 1}}))
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch group analytics"})
		}
		defer groupCursor.Close(context.TODO())

		var groups []models.CustomerGroup
		if err := groupCursor.All(context.TODO(), &groups); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to decode group analytics"})
		}

		clientCursor, err := clientCollection.Find(context.TODO(), bson.M{})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch clients for analytics"})
		}
		defer clientCursor.Close(context.TODO())

		var clients []models.Client
		if err := clientCursor.All(context.TODO(), &clients); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to decode clients for analytics"})
		}

		metricsByGroup := map[string]*customerGroupAnalyticsItem{}
		for _, group := range groups {
			copyGroup := group
			metricsByGroup[group.Code] = &customerGroupAnalyticsItem{Group: copyGroup}
		}

		for _, client := range clients {
			groupCode := "regular"
			if client.Group != nil && strings.TrimSpace(client.Group.Code) != "" {
				groupCode = client.Group.Code
			}

			entry, ok := metricsByGroup[groupCode]
			if !ok {
				continue
			}

			entry.ClientCount++
			entry.OrderCount += len(client.OrderHistory)
			for _, item := range client.OrderHistory {
				entry.TotalAmount += calculateOrderAmount(item)
			}
		}

		var analytics []customerGroupAnalyticsItem
		for _, item := range metricsByGroup {
			if item.ClientCount > 0 {
				item.AverageRevenue = item.TotalAmount / float64(item.ClientCount)
			}
			analytics = append(analytics, *item)
		}

		sort.SliceStable(analytics, func(i, j int) bool {
			if analytics[i].Group.Priority == analytics[j].Group.Priority {
				return analytics[i].Group.Name < analytics[j].Group.Name
			}
			return analytics[i].Group.Priority < analytics[j].Group.Priority
		})

		return c.JSON(fiber.Map{"data": analytics, "total": len(analytics)})
	})

	groups.Post("/", func(c *fiber.Ctx) error {
		var payload customerGroupPayload
		if err := c.BodyParser(&payload); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		name := strings.TrimSpace(payload.Name)
		if name == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Group name is required"})
		}

		code := normalizeCustomerGroupCode(payload.Code)
		if strings.TrimSpace(payload.Code) == "" {
			code = normalizeCustomerGroupCode(name)
		}

		collection := config.GetCollection(db, "customer_groups")
		existingCount, err := collection.CountDocuments(context.TODO(), bson.M{
			"$or": []bson.M{
				{"code": code},
				{"name": bson.M{"$regex": "^" + regexp.QuoteMeta(name) + "$", "$options": "i"}},
			},
		})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to validate customer group"})
		}
		if existingCount > 0 {
			return c.Status(409).JSON(fiber.Map{"error": "Customer group with the same name or code already exists"})
		}

		now := time.Now()
		isActive := true
		if payload.IsActive != nil {
			isActive = *payload.IsActive
		}

		group := models.CustomerGroup{
			Code:              code,
			Name:              name,
			Description:       strings.TrimSpace(payload.Description),
			Color:             strings.TrimSpace(payload.Color),
			PricingProfile:    strings.TrimSpace(payload.PricingProfile),
			DiscountPolicyRef: strings.TrimSpace(payload.DiscountPolicyRef),
			Priority:          payload.Priority,
			IsSystem:          false,
			IsActive:          isActive,
			CreatedAt:         now,
			UpdatedAt:         now,
		}

		result, err := collection.InsertOne(context.TODO(), group)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create customer group"})
		}

		group.ID = result.InsertedID.(primitive.ObjectID)
		return c.Status(201).JSON(group)
	})

	groups.Put("/:id", func(c *fiber.Ctx) error {
		id, err := primitive.ObjectIDFromHex(c.Params("id"))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
		}

		var payload customerGroupPayload
		if err := c.BodyParser(&payload); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		collection := config.GetCollection(db, "customer_groups")
		var existing models.CustomerGroup
		if err := collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&existing); err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Customer group not found"})
		}

		if existing.IsSystem && strings.TrimSpace(payload.Name) != "" && strings.TrimSpace(payload.Name) != existing.Name {
			return c.Status(409).JSON(fiber.Map{"error": "Default customer groups cannot be renamed"})
		}

		update := bson.M{
			"name":                strings.TrimSpace(payload.Name),
			"description":         strings.TrimSpace(payload.Description),
			"color":               strings.TrimSpace(payload.Color),
			"pricing_profile":     strings.TrimSpace(payload.PricingProfile),
			"discount_policy_ref": strings.TrimSpace(payload.DiscountPolicyRef),
			"priority":            payload.Priority,
			"updated_at":          time.Now(),
		}
		if payload.IsActive != nil {
			update["is_active"] = *payload.IsActive
		}
		if !existing.IsSystem && strings.TrimSpace(payload.Code) != "" {
			update["code"] = normalizeCustomerGroupCode(payload.Code)
		}
		if existing.IsSystem {
			update["name"] = existing.Name
			update["code"] = existing.Code
		}

		if _, err := collection.UpdateOne(context.TODO(), bson.M{"_id": id}, bson.M{"$set": update}); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update customer group"})
		}

		var updated models.CustomerGroup
		if err := collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&updated); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to load updated customer group"})
		}

		clientsCollection := config.GetCollection(db, "clients")
		_, _ = clientsCollection.UpdateMany(
			context.TODO(),
			bson.M{"group.id": updated.ID},
			bson.M{"$set": bson.M{"group": buildCustomerGroupBrief(updated), "updated_at": time.Now()}},
		)

		return c.JSON(updated)
	})

	groups.Delete("/:id", func(c *fiber.Ctx) error {
		id, err := primitive.ObjectIDFromHex(c.Params("id"))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
		}

		collection := config.GetCollection(db, "customer_groups")
		var existing models.CustomerGroup
		if err := collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&existing); err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Customer group not found"})
		}
		if existing.IsSystem {
			return c.Status(409).JSON(fiber.Map{"error": "Default customer groups cannot be deleted"})
		}

		clientsCollection := config.GetCollection(db, "clients")
		usageCount, err := clientsCollection.CountDocuments(context.TODO(), bson.M{"group.id": existing.ID})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to validate customer group usage"})
		}
		if usageCount > 0 {
			return c.Status(409).JSON(fiber.Map{"error": "Customer group is used by existing clients"})
		}

		if _, err := collection.DeleteOne(context.TODO(), bson.M{"_id": id}); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to delete customer group"})
		}

		return c.JSON(fiber.Map{"message": "Customer group deleted successfully"})
	})
}
