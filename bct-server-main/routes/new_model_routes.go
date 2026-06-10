package routes

import (
	"bytes"
	"context"
	"encoding/json"
	"strconv"
	"time"

	"fiber-ecommerce/config"
	"fiber-ecommerce/models"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Company CRUD
func CompanyRoutes(app fiber.Router, db *mongo.Client) {
	companies := app.Group("/companies")

	companies.Get("/", func(c *fiber.Ctx) error {
		collection := config.GetCollection(db, "companies")

		page, _ := strconv.Atoi(c.Query("page", "1"))
		limit, _ := strconv.Atoi(c.Query("limit", "10"))
		if limit <= 0 {
			limit = 10
		}
		if page <= 0 {
			page = 1
		}
		skip := (page - 1) * limit

		opts := options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.D{{Key: "created_at", Value: -1}})

		cursor, err := collection.Find(context.TODO(), bson.M{}, opts)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch companies"})
		}
		defer cursor.Close(context.TODO())

		var companies []models.Company
		if err = cursor.All(context.TODO(), &companies); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to decode companies"})
		}

		for i := range companies {
			if companies[i].OrderHistory == nil {
				companies[i].OrderHistory = []models.OrderHistoryEntry{}
			}
		}

		total, _ := collection.CountDocuments(context.TODO(), bson.M{})

		return c.JSON(fiber.Map{
			"data":  companies,
			"total": total,
			"page":  page,
			"limit": limit,
		})
	})

	companies.Get("/:id", func(c *fiber.Ctx) error {
		id, err := primitive.ObjectIDFromHex(c.Params("id"))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
		}

		collection := config.GetCollection(db, "companies")
		var company models.Company
		err = collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&company)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Company not found"})
		}

		if company.OrderHistory == nil {
			company.OrderHistory = []models.OrderHistoryEntry{}
		}

		return c.JSON(company)
	})

	type companyPayload struct {
		Name    string  `json:"name"`
		Email   string  `json:"email"`
		Inn     string  `json:"inn"`
		Address string  `json:"address"`
		Phone   string  `json:"phone"`
		Comment *string `json:"comment"`
	}

	companies.Post("/", func(c *fiber.Ctx) error {
		var payload companyPayload
		if err := c.BodyParser(&payload); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		if payload.Name == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Name is required"})
		}

		now := time.Now()
		company := models.Company{
			Name:         payload.Name,
			OrderCount:   0,
			TotalAmount:  models.NewFlexFloat64(0),
			Email:        payload.Email,
			Inn:          payload.Inn,
			Address:      payload.Address,
			Phone:        payload.Phone,
			Comment:      payload.Comment,
			OrderHistory: []models.OrderHistoryEntry{},
			CreatedAt:    now,
			UpdatedAt:    now,
		}

		collection := config.GetCollection(db, "companies")
		result, err := collection.InsertOne(context.TODO(), company)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create company"})
		}

		company.ID = result.InsertedID.(primitive.ObjectID)
		return c.Status(201).JSON(company)
	})

	companies.Put("/:id", func(c *fiber.Ctx) error {
		id, err := primitive.ObjectIDFromHex(c.Params("id"))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
		}

		var updateData bson.M
		if err := c.BodyParser(&updateData); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		delete(updateData, "_id")
		delete(updateData, "created_at")

		if orderCount, ok := updateData["order_count"]; ok {
			if v, valid := toInt(orderCount); valid {
				updateData["order_count"] = v
			} else {
				delete(updateData, "order_count")
			}
		}
		if totalAmount, ok := updateData["total_amount"]; ok {
			if v, valid := toFloat64(totalAmount); valid {
				updateData["total_amount"] = v
			} else {
				delete(updateData, "total_amount")
			}
		}

		updateData["updated_at"] = time.Now()

		collection := config.GetCollection(db, "companies")
		update := bson.M{"$set": updateData}

		result, err := collection.UpdateOne(context.TODO(), bson.M{"_id": id}, update)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update company"})
		}

		if result.MatchedCount == 0 {
			return c.Status(404).JSON(fiber.Map{"error": "Company not found"})
		}

		var company models.Company
		collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&company)
		if company.OrderHistory == nil {
			company.OrderHistory = []models.OrderHistoryEntry{}
		}

		return c.JSON(company)
	})

	companies.Delete("/:id", func(c *fiber.Ctx) error {
		id, err := primitive.ObjectIDFromHex(c.Params("id"))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
		}

		collection := config.GetCollection(db, "companies")
		contractsCollection := config.GetCollection(db, "contracts")
		linkedContracts, err := contractsCollection.CountDocuments(context.TODO(), bson.M{"company_id": id})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to validate company usage"})
		}
		if linkedContracts > 0 {
			return c.Status(409).JSON(fiber.Map{"error": "Company is linked to existing contracts"})
		}

		result, err := collection.DeleteOne(context.TODO(), bson.M{"_id": id})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to delete company"})
		}

		if result.DeletedCount == 0 {
			return c.Status(404).JSON(fiber.Map{"error": "Company not found"})
		}

		return c.JSON(fiber.Map{"message": "Company deleted successfully"})
	})
}

// Funnel CRUD
func FunnelRoutes(app fiber.Router, db *mongo.Client) {
	funnels := app.Group("/funnels")

	funnels.Get("/", func(c *fiber.Ctx) error {
		collection := config.GetCollection(db, "funnels")

		opts := options.Find().SetSort(bson.D{{Key: "order", Value: 1}})

		cursor, err := collection.Find(context.TODO(), bson.M{}, opts)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch funnels"})
		}
		defer cursor.Close(context.TODO())

		var funnelsList []models.Funnel
		if err = cursor.All(context.TODO(), &funnelsList); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to decode funnels"})
		}

		return c.JSON(funnelsList)
	})

	funnels.Get("/:id", func(c *fiber.Ctx) error {
		id, err := primitive.ObjectIDFromHex(c.Params("id"))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
		}

		collection := config.GetCollection(db, "funnels")
		var funnel models.Funnel
		err = collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&funnel)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Funnel stage not found"})
		}

		return c.JSON(funnel)
	})

	type funnelPayload struct {
		Name    string `json:"name"`
		Color   string `json:"color"`
		Comment string `json:"comment"`
		Order   *int   `json:"order"`
	}

	funnels.Post("/", func(c *fiber.Ctx) error {
		var payload funnelPayload
		if err := c.BodyParser(&payload); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		if payload.Name == "" || payload.Color == "" || payload.Order == nil {
			return c.Status(400).JSON(fiber.Map{"error": "name, color and order are required"})
		}

		now := time.Now()
		funnel := models.Funnel{
			Name:      payload.Name,
			Color:     payload.Color,
			Comment:   payload.Comment,
			Order:     *payload.Order,
			CreatedAt: now,
			UpdatedAt: now,
		}

		collection := config.GetCollection(db, "funnels")
		result, err := collection.InsertOne(context.TODO(), funnel)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create funnel stage"})
		}

		funnel.ID = result.InsertedID.(primitive.ObjectID)
		return c.Status(201).JSON(funnel)
	})

	funnels.Put("/:id", func(c *fiber.Ctx) error {
		id, err := primitive.ObjectIDFromHex(c.Params("id"))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
		}

		var updateData bson.M
		if err := c.BodyParser(&updateData); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		delete(updateData, "_id")
		delete(updateData, "created_at")

		if orderVal, ok := updateData["order"]; ok {
			if v, valid := toInt(orderVal); valid {
				updateData["order"] = v
			} else {
				return c.Status(400).JSON(fiber.Map{"error": "order must be a number"})
			}
		}

		updateData["updated_at"] = time.Now()

		collection := config.GetCollection(db, "funnels")
		result, err := collection.UpdateOne(context.TODO(), bson.M{"_id": id}, bson.M{"$set": updateData})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update funnel stage"})
		}

		if result.MatchedCount == 0 {
			return c.Status(404).JSON(fiber.Map{"error": "Funnel stage not found"})
		}

		var funnel models.Funnel
		collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&funnel)
		return c.JSON(funnel)
	})

	funnels.Delete("/:id", func(c *fiber.Ctx) error {
		id, err := primitive.ObjectIDFromHex(c.Params("id"))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
		}

		collection := config.GetCollection(db, "funnels")
		result, err := collection.DeleteOne(context.TODO(), bson.M{"_id": id})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to delete funnel stage"})
		}

		if result.DeletedCount == 0 {
			return c.Status(404).JSON(fiber.Map{"error": "Funnel stage not found"})
		}

		return c.JSON(fiber.Map{"message": "Funnel stage deleted successfully"})
	})
}

// Counterparty CRUD
func CounterpartyRoutes(app fiber.Router, db *mongo.Client) {
	counterparties := app.Group("/counterparties")

	counterparties.Get("/", func(c *fiber.Ctx) error {
		collection := config.GetCollection(db, "counterparties")

		page, _ := strconv.Atoi(c.Query("page", "1"))
		limit, _ := strconv.Atoi(c.Query("limit", "10"))
		if limit <= 0 {
			limit = 10
		}
		if page <= 0 {
			page = 1
		}
		skip := (page - 1) * limit

		opts := options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.D{{Key: "created_at", Value: -1}})

		cursor, err := collection.Find(context.TODO(), bson.M{}, opts)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch counterparties"})
		}
		defer cursor.Close(context.TODO())

		var counterparties []models.Counterparty
		if err = cursor.All(context.TODO(), &counterparties); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to decode counterparties"})
		}

		for i := range counterparties {
			if counterparties[i].OrderHistory == nil {
				counterparties[i].OrderHistory = []models.OrderHistoryEntry{}
			}
		}

		total, _ := collection.CountDocuments(context.TODO(), bson.M{})

		return c.JSON(fiber.Map{
			"data":  counterparties,
			"total": total,
			"page":  page,
			"limit": limit,
		})
	})

	counterparties.Get("/:id", func(c *fiber.Ctx) error {
		id, err := primitive.ObjectIDFromHex(c.Params("id"))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
		}

		collection := config.GetCollection(db, "counterparties")
		var counterparty models.Counterparty
		err = collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&counterparty)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Counterparty not found"})
		}

		if counterparty.OrderHistory == nil {
			counterparty.OrderHistory = []models.OrderHistoryEntry{}
		}

		return c.JSON(counterparty)
	})

	type counterpartyPayload struct {
		FirstName    string  `json:"first_name"`
		LastName     string  `json:"last_name"`
		Email        string  `json:"email"`
		Phone        string  `json:"phone"`
		CompanyPhone string  `json:"company_phone"`
		Company      string  `json:"company"`
		Address      string  `json:"address"`
		Comment      *string `json:"comment"`
	}

	counterparties.Post("/", func(c *fiber.Ctx) error {
		var payload counterpartyPayload
		if err := c.BodyParser(&payload); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		if payload.FirstName == "" || payload.LastName == "" || payload.Phone == "" {
			return c.Status(400).JSON(fiber.Map{"error": "First name, last name and phone are required"})
		}

		now := time.Now()
		counterparty := models.Counterparty{
			FirstName:    payload.FirstName,
			LastName:     payload.LastName,
			Email:        payload.Email,
			Phone:        payload.Phone,
			CompanyPhone: payload.CompanyPhone,
			Company:      payload.Company,
			Address:      payload.Address,
			Comment:      payload.Comment,
			OrderHistory: []models.OrderHistoryEntry{},
			CreatedAt:    now,
			UpdatedAt:    now,
		}

		collection := config.GetCollection(db, "counterparties")
		result, err := collection.InsertOne(context.TODO(), counterparty)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create counterparty"})
		}

		counterparty.ID = result.InsertedID.(primitive.ObjectID)
		return c.Status(201).JSON(counterparty)
	})

	counterparties.Put("/:id", func(c *fiber.Ctx) error {
		id, err := primitive.ObjectIDFromHex(c.Params("id"))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
		}

		var updateData bson.M
		if err := c.BodyParser(&updateData); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		delete(updateData, "_id")
		delete(updateData, "created_at")
		updateData["updated_at"] = time.Now()

		collection := config.GetCollection(db, "counterparties")
		update := bson.M{"$set": updateData}

		result, err := collection.UpdateOne(context.TODO(), bson.M{"_id": id}, update)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update counterparty"})
		}

		if result.MatchedCount == 0 {
			return c.Status(404).JSON(fiber.Map{"error": "Counterparty not found"})
		}

		var counterparty models.Counterparty
		collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&counterparty)
		if counterparty.OrderHistory == nil {
			counterparty.OrderHistory = []models.OrderHistoryEntry{}
		}
		return c.JSON(counterparty)
	})

	counterparties.Delete("/:id", func(c *fiber.Ctx) error {
		id, err := primitive.ObjectIDFromHex(c.Params("id"))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
		}

		collection := config.GetCollection(db, "counterparties")
		contractsCollection := config.GetCollection(db, "contracts")
		linkedContracts, err := contractsCollection.CountDocuments(context.TODO(), bson.M{"counterparty_id": id})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to validate counterparty usage"})
		}
		if linkedContracts > 0 {
			return c.Status(409).JSON(fiber.Map{"error": "Counterparty is linked to existing contracts"})
		}

		result, err := collection.DeleteOne(context.TODO(), bson.M{"_id": id})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to delete counterparty"})
		}

		if result.DeletedCount == 0 {
			return c.Status(404).JSON(fiber.Map{"error": "Counterparty not found"})
		}

		return c.JSON(fiber.Map{"message": "Counterparty deleted successfully"})
	})
}

type contractHistoryTarget struct {
	Collection string
	ID         primitive.ObjectID
}

func contractHistoryTargets(contract models.Contract) []contractHistoryTarget {
	return []contractHistoryTarget{
		{Collection: "clients", ID: contract.ClientID},
		{Collection: "counterparties", ID: contract.CounterpartyID},
		{Collection: "companies", ID: contract.CompanyID},
	}
}

func contractHistoryID(contract models.Contract) string {
	if !contract.ID.IsZero() {
		return contract.ID.Hex()
	}
	if contract.ContractNumber != "" {
		return contract.ContractNumber
	}
	return ""
}

func buildContractHistoryEntry(db *mongo.Client, contract models.Contract) models.OrderHistoryEntry {
	now := time.Now()
	purchaseDate := contract.DealDate
	if purchaseDate.IsZero() {
		purchaseDate = contract.CreatedAt
	}
	if purchaseDate.IsZero() {
		purchaseDate = now
	}

	entryID := contractHistoryID(contract)
	orderNumber := contract.ContractNumber
	if orderNumber == "" {
		orderNumber = entryID
	}

	productsCollection := config.GetCollection(db, "products")
	products := make([]models.OrderHistoryProduct, 0, len(contract.Products))
	for _, item := range contract.Products {
		productName := item.ProductID.Hex()
		serialNumber := item.SerialNumber
		shtrixNumber := item.ShtrixNumber
		guarantee := item.Guarantee

		if !item.ProductID.IsZero() {
			var product models.Product
			if err := productsCollection.FindOne(context.TODO(), bson.M{"_id": item.ProductID}).Decode(&product); err == nil {
				if product.Name != "" {
					productName = product.Name
				}
				if serialNumber == "" {
					serialNumber = product.SerialNumber
				}
				if shtrixNumber == "" {
					shtrixNumber = product.ShtrixNumber
				}
				if guarantee == "" {
					guarantee = product.Guarantee
				}
			}
		}

		products = append(products, models.OrderHistoryProduct{
			ID:           item.ProductID.Hex(),
			Name:         productName,
			Price:        item.Price,
			Quantity:     item.Quantity,
			SerialNumber: serialNumber,
			ShtrixNumber: shtrixNumber,
			Guarantee:    guarantee,
			CreatedAt:    purchaseDate,
			UpdatedAt:    now,
		})
	}

	return models.OrderHistoryEntry{
		ID:          entryID,
		OrderNumber: orderNumber,
		Price:       contract.ContractAmount,
		Status:      "contract",
		CreatedAt:   purchaseDate,
		UpdatedAt:   now,
		Products:    products,
	}
}

func removeContractHistoryFromEntities(db *mongo.Client, contract models.Contract) error {
	entryID := contractHistoryID(contract)
	if entryID == "" {
		return nil
	}

	now := time.Now()
	for _, target := range contractHistoryTargets(contract) {
		if target.ID.IsZero() {
			continue
		}
		collection := config.GetCollection(db, target.Collection)
		_, err := collection.UpdateOne(
			context.TODO(),
			bson.M{"_id": target.ID},
			bson.M{
				"$pull": bson.M{"order_history": bson.M{"id": entryID}},
				"$set":  bson.M{"updated_at": now},
			},
		)
		if err != nil {
			return err
		}
	}
	return nil
}

func syncContractHistory(db *mongo.Client, previous *models.Contract, current models.Contract) error {
	if previous != nil {
		if err := removeContractHistoryFromEntities(db, *previous); err != nil {
			return err
		}
	}

	entryID := contractHistoryID(current)
	if entryID == "" {
		return nil
	}

	entry := buildContractHistoryEntry(db, current)
	now := time.Now()
	for _, target := range contractHistoryTargets(current) {
		if target.ID.IsZero() {
			continue
		}
		collection := config.GetCollection(db, target.Collection)
		if _, err := collection.UpdateOne(
			context.TODO(),
			bson.M{"_id": target.ID},
			bson.M{
				"$pull": bson.M{"order_history": bson.M{"id": entryID}},
				"$set":  bson.M{"updated_at": now},
			},
		); err != nil {
			return err
		}
		if _, err := collection.UpdateOne(
			context.TODO(),
			bson.M{"_id": target.ID},
			bson.M{
				"$push": bson.M{"order_history": entry},
				"$set":  bson.M{"updated_at": now},
			},
		); err != nil {
			return err
		}
	}
	return nil
}

// Contract CRUD
func ContractRoutes(app fiber.Router, db *mongo.Client) {
	contracts := app.Group("/contracts")

	contracts.Get("/", func(c *fiber.Ctx) error {
		collection := config.GetCollection(db, "contracts")

		page, _ := strconv.Atoi(c.Query("page", "1"))
		limit, _ := strconv.Atoi(c.Query("limit", "10"))
		if limit <= 0 {
			limit = 10
		}
		if page <= 0 {
			page = 1
		}
		skip := (page - 1) * limit

		filter := bson.M{}
		if clientID := c.Query("client_id"); clientID != "" {
			if id, err := primitive.ObjectIDFromHex(clientID); err == nil {
				filter["client_id"] = id
			}
		}
		if companyID := c.Query("company_id"); companyID != "" {
			if id, err := primitive.ObjectIDFromHex(companyID); err == nil {
				filter["company_id"] = id
			}
		}

		opts := options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.D{{Key: "created_at", Value: -1}})

		cursor, err := collection.Find(context.TODO(), filter, opts)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch contracts"})
		}
		defer cursor.Close(context.TODO())

		var contractsList []models.Contract
		if err = cursor.All(context.TODO(), &contractsList); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to decode contracts"})
		}

		for i := range contractsList {
			if contractsList[i].Products == nil {
				contractsList[i].Products = []models.ContractProduct{}
			}
			if contractsList[i].Documents == nil {
				contractsList[i].Documents = []string{}
			}
		}

		total, _ := collection.CountDocuments(context.TODO(), filter)

		return c.JSON(fiber.Map{
			"data":  contractsList,
			"total": total,
			"page":  page,
			"limit": limit,
		})
	})

	contracts.Get("/:id", func(c *fiber.Ctx) error {
		id, err := primitive.ObjectIDFromHex(c.Params("id"))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
		}

		collection := config.GetCollection(db, "contracts")
		var contract models.Contract
		err = collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&contract)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Contract not found"})
		}

		if contract.Products == nil {
			contract.Products = []models.ContractProduct{}
		}
		if contract.Documents == nil {
			contract.Documents = []string{}
		}

		return c.JSON(contract)
	})

	contracts.Post("/", func(c *fiber.Ctx) error {
		var contract models.Contract
		if err := c.BodyParser(&contract); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		if contract.ClientID.IsZero() || contract.CounterpartyID.IsZero() || contract.CompanyID.IsZero() {
			return c.Status(400).JSON(fiber.Map{"error": "client_id, counterparty_id and company_id are required"})
		}

		if normalized, ok := normalizeCurrency(contract.ContractCurrency); ok {
			contract.ContractCurrency = normalized
		} else {
			return c.Status(400).JSON(fiber.Map{"error": "contract_currency must be one of UZS, USD, EUR"})
		}

		if contract.DealDate.IsZero() {
			return c.Status(400).JSON(fiber.Map{"error": "deal_date is required"})
		}

		now := time.Now()
		if contract.Products == nil {
			contract.Products = []models.ContractProduct{}
		}
		if contract.Documents == nil {
			contract.Documents = []string{}
		}

		contract.CreatedAt = now
		contract.UpdatedAt = now

		collection := config.GetCollection(db, "contracts")
		result, err := collection.InsertOne(context.TODO(), contract)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create contract"})
		}

		contract.ID = result.InsertedID.(primitive.ObjectID)
		if err := syncContractHistory(db, nil, contract); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to sync contract history"})
		}
		return c.Status(201).JSON(contract)
	})

	contracts.Put("/:id", func(c *fiber.Ctx) error {
		id, err := primitive.ObjectIDFromHex(c.Params("id"))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
		}

		collection := config.GetCollection(db, "contracts")

		var previous models.Contract
		if err := collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&previous); err != nil {
			if err == mongo.ErrNoDocuments {
				return c.Status(404).JSON(fiber.Map{"error": "Contract not found"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Failed to load contract"})
		}

		body := c.Body()
		if len(body) == 0 {
			return c.Status(400).JSON(fiber.Map{"error": "Request body cannot be empty"})
		}

		var raw map[string]json.RawMessage
		if err := json.Unmarshal(body, &raw); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		unset := bson.M{}
		set := bson.M{}

		isNull := func(v json.RawMessage) bool {
			return bytes.Equal(bytes.TrimSpace(v), []byte("null"))
		}

		parseObjectID := func(field string, value json.RawMessage) (primitive.ObjectID, error) {
			var hex string
			if err := json.Unmarshal(value, &hex); err != nil {
				return primitive.NilObjectID, err
			}
			return primitive.ObjectIDFromHex(hex)
		}

		sanitized := []string{"_id", "id", "created_at", "updated_at"}
		for _, key := range sanitized {
			delete(raw, key)
		}

		for key, value := range raw {
			switch key {
			case "client_id", "counterparty_id", "company_id", "funnel_id":
				if isNull(value) {
					return c.Status(400).JSON(fiber.Map{"error": key + " cannot be null"})
				}
				oid, err := parseObjectID(key, value)
				if err != nil {
					return c.Status(400).JSON(fiber.Map{"error": "Invalid " + key})
				}
				set[key] = oid
			case "client_name", "counterparty_name", "company_name":
				if isNull(value) {
					unset[key] = ""
					continue
				}
				var name string
				if err := json.Unmarshal(value, &name); err != nil {
					return c.Status(400).JSON(fiber.Map{"error": "Invalid " + key})
				}
				set[key] = name
			case "contract_number", "guarantee", "comment":
				if isNull(value) {
					return c.Status(400).JSON(fiber.Map{"error": key + " cannot be null"})
				}
				var text string
				if err := json.Unmarshal(value, &text); err != nil {
					return c.Status(400).JSON(fiber.Map{"error": "Invalid " + key})
				}
				set[key] = text
			case "deal_date":
				if isNull(value) {
					return c.Status(400).JSON(fiber.Map{"error": "deal_date cannot be null"})
				}
				var dateStr string
				if err := json.Unmarshal(value, &dateStr); err != nil {
					return c.Status(400).JSON(fiber.Map{"error": "Invalid deal_date"})
				}
				parsed, err := time.Parse(time.RFC3339, dateStr)
				if err != nil {
					return c.Status(400).JSON(fiber.Map{"error": "deal_date must be in RFC3339 format"})
				}
				set["deal_date"] = parsed
			case "contract_currency":
				if isNull(value) {
					return c.Status(400).JSON(fiber.Map{"error": "contract_currency cannot be null"})
				}
				var currency string
				if err := json.Unmarshal(value, &currency); err != nil {
					return c.Status(400).JSON(fiber.Map{"error": "Invalid contract_currency"})
				}
				if normalized, ok := normalizeCurrency(currency); ok {
					set["contract_currency"] = normalized
				} else {
					return c.Status(400).JSON(fiber.Map{"error": "contract_currency must be one of UZS, USD, EUR"})
				}
			case "contract_amount", "pay_card", "pay_cash":
				var flex models.FlexFloat64
				if err := json.Unmarshal(value, &flex); err != nil {
					return c.Status(400).JSON(fiber.Map{"error": "Invalid " + key})
				}
				set[key] = flex
			case "products":
				if isNull(value) {
					set[key] = []models.ContractProduct{}
					continue
				}
				var products []models.ContractProduct
				if err := json.Unmarshal(value, &products); err != nil {
					return c.Status(400).JSON(fiber.Map{"error": "Invalid products"})
				}
				if products == nil {
					products = []models.ContractProduct{}
				}
				set[key] = products
			case "documents":
				if isNull(value) {
					set[key] = []string{}
					continue
				}
				var documents []string
				if err := json.Unmarshal(value, &documents); err != nil {
					return c.Status(400).JSON(fiber.Map{"error": "Invalid documents"})
				}
				if documents == nil {
					documents = []string{}
				}
				set[key] = documents
			default:
				// Ignore unknown fields to allow forward compatibility.
			}
		}

		if len(set) == 0 && len(unset) == 0 {
			return c.Status(400).JSON(fiber.Map{"error": "No updatable fields provided"})
		}

		set["updated_at"] = time.Now()

		updateDoc := bson.M{}
		if len(set) > 0 {
			updateDoc["$set"] = set
		}
		if len(unset) > 0 {
			updateDoc["$unset"] = unset
		}

		result, err := collection.UpdateOne(context.TODO(), bson.M{"_id": id}, updateDoc)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update contract"})
		}
		if result.MatchedCount == 0 {
			return c.Status(404).JSON(fiber.Map{"error": "Contract not found"})
		}

		var updated models.Contract
		if err := collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&updated); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to load updated contract"})
		}

		if updated.Products == nil {
			updated.Products = []models.ContractProduct{}
		}
		if updated.Documents == nil {
			updated.Documents = []string{}
		}
		if err := syncContractHistory(db, &previous, updated); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to sync contract history"})
		}

		return c.JSON(updated)
	})

	contracts.Delete("/:id", func(c *fiber.Ctx) error {
		id, err := primitive.ObjectIDFromHex(c.Params("id"))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
		}

		collection := config.GetCollection(db, "contracts")
		var contract models.Contract
		if err := collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&contract); err != nil {
			if err == mongo.ErrNoDocuments {
				return c.Status(404).JSON(fiber.Map{"error": "Contract not found"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Failed to load contract"})
		}

		result, err := collection.DeleteOne(context.TODO(), bson.M{"_id": id})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to delete contract"})
		}

		if result.DeletedCount == 0 {
			return c.Status(404).JSON(fiber.Map{"error": "Contract not found"})
		}

		if err := removeContractHistoryFromEntities(db, contract); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to sync contract history"})
		}
		return c.JSON(fiber.Map{"message": "Contract deleted successfully"})
	})
}

// Client CRUD
func ClientRoutes(app fiber.Router, db *mongo.Client) {
	clients := app.Group("/clients")

	// Get all clients
	clients.Get("/", func(c *fiber.Ctx) error {
		collection := config.GetCollection(db, "clients")

		page, _ := strconv.Atoi(c.Query("page", "1"))
		limit, _ := strconv.Atoi(c.Query("limit", "10"))
		skip := (page - 1) * limit

		opts := options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.D{{Key: "created_at", Value: -1}})

		cursor, err := collection.Find(context.TODO(), bson.M{}, opts)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch clients"})
		}
		defer cursor.Close(context.TODO())

		var clients []models.Client
		if err = cursor.All(context.TODO(), &clients); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to decode clients"})
		}

		for i := range clients {
			if clients[i].OrderHistory == nil {
				clients[i].OrderHistory = []models.OrderHistoryEntry{}
			}
		}

		total, _ := collection.CountDocuments(context.TODO(), bson.M{})

		return c.JSON(fiber.Map{
			"data":  clients,
			"total": total,
			"page":  page,
			"limit": limit,
		})
	})

	// Get single client
	clients.Get("/:id", func(c *fiber.Ctx) error {
		id, err := primitive.ObjectIDFromHex(c.Params("id"))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
		}

		collection := config.GetCollection(db, "clients")
		var client models.Client
		err = collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&client)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Client not found"})
		}

		if client.OrderHistory == nil {
			client.OrderHistory = []models.OrderHistoryEntry{}
		}

		return c.JSON(client)
	})

	type clientPayload struct {
		FirstName    string  `json:"first_name"`
		LastName     string  `json:"last_name"`
		Email        string  `json:"email"`
		Phone        string  `json:"phone"`
		CompanyPhone string  `json:"company_phone"`
		Company      string  `json:"company"`
		Address      string  `json:"address"`
		Comment      *string `json:"comment"`
	}

	// Create client
	clients.Post("/", func(c *fiber.Ctx) error {
		var payload clientPayload
		if err := c.BodyParser(&payload); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		if payload.FirstName == "" || payload.LastName == "" || payload.Phone == "" {
			return c.Status(400).JSON(fiber.Map{"error": "First name, last name and phone are required"})
		}

		now := time.Now()
		client := models.Client{
			FirstName:    payload.FirstName,
			LastName:     payload.LastName,
			Email:        payload.Email,
			Phone:        payload.Phone,
			CompanyPhone: payload.CompanyPhone,
			Company:      payload.Company,
			Address:      payload.Address,
			Comment:      payload.Comment,
			OrderHistory: []models.OrderHistoryEntry{},
			CreatedAt:    now,
			UpdatedAt:    now,
		}

		collection := config.GetCollection(db, "clients")

		result, err := collection.InsertOne(context.TODO(), client)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create client"})
		}

		client.ID = result.InsertedID.(primitive.ObjectID)
		return c.Status(201).JSON(client)
	})

	// Update client
	clients.Put("/:id", func(c *fiber.Ctx) error {
		id, err := primitive.ObjectIDFromHex(c.Params("id"))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
		}

		var updateData bson.M
		if err := c.BodyParser(&updateData); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		delete(updateData, "_id")
		delete(updateData, "created_at")
		updateData["updated_at"] = time.Now()

		collection := config.GetCollection(db, "clients")
		update := bson.M{"$set": updateData}

		result, err := collection.UpdateOne(context.TODO(), bson.M{"_id": id}, update)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update client"})
		}

		if result.MatchedCount == 0 {
			return c.Status(404).JSON(fiber.Map{"error": "Client not found"})
		}

		var client models.Client
		collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&client)
		if client.OrderHistory == nil {
			client.OrderHistory = []models.OrderHistoryEntry{}
		}
		return c.JSON(client)
	})

	// Delete client
	clients.Delete("/:id", func(c *fiber.Ctx) error {
		id, err := primitive.ObjectIDFromHex(c.Params("id"))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
		}

		collection := config.GetCollection(db, "clients")
		contractsCollection := config.GetCollection(db, "contracts")
		linkedContracts, err := contractsCollection.CountDocuments(context.TODO(), bson.M{"client_id": id})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to validate client usage"})
		}
		if linkedContracts > 0 {
			return c.Status(409).JSON(fiber.Map{"error": "Client is linked to existing contracts"})
		}

		result, err := collection.DeleteOne(context.TODO(), bson.M{"_id": id})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to delete client"})
		}

		if result.DeletedCount == 0 {
			return c.Status(404).JSON(fiber.Map{"error": "Client not found"})
		}

		return c.JSON(fiber.Map{"message": "Client deleted successfully"})
	})
}

// Order CRUD
func OrderRoutes(app fiber.Router, db *mongo.Client) {
	orders := app.Group("/orders")

	// Get all orders
	orders.Get("/", func(c *fiber.Ctx) error {
		collection := config.GetCollection(db, "orders")

		page, _ := strconv.Atoi(c.Query("page", "1"))
		limit, _ := strconv.Atoi(c.Query("limit", "10"))
		skip := (page - 1) * limit

		filter := bson.M{}
		if clientID := c.Query("client_id"); clientID != "" {
			if id, err := primitive.ObjectIDFromHex(clientID); err == nil {
				filter["client_id"] = id
			}
		}

		opts := options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.D{{Key: "created_at", Value: -1}})

		cursor, err := collection.Find(context.TODO(), filter, opts)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch orders"})
		}
		defer cursor.Close(context.TODO())

		var orders []models.Order
		if err = cursor.All(context.TODO(), &orders); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to decode orders"})
		}

		total, _ := collection.CountDocuments(context.TODO(), filter)

		return c.JSON(fiber.Map{
			"data":  orders,
			"total": total,
			"page":  page,
			"limit": limit,
		})
	})

	// Get single order
	orders.Get("/:id", func(c *fiber.Ctx) error {
		id, err := primitive.ObjectIDFromHex(c.Params("id"))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
		}

		collection := config.GetCollection(db, "orders")
		var order models.Order
		err = collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&order)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Order not found"})
		}

		return c.JSON(order)
	})

	// Create order
	orders.Post("/", func(c *fiber.Ctx) error {
		var order models.Order
		if err := c.BodyParser(&order); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		order.CreatedAt = time.Now()
		order.UpdatedAt = time.Now()
		collection := config.GetCollection(db, "orders")

		result, err := collection.InsertOne(context.TODO(), order)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create order"})
		}

		order.ID = result.InsertedID.(primitive.ObjectID)
		return c.Status(201).JSON(order)
	})

	// Update order
	orders.Put("/:id", func(c *fiber.Ctx) error {
		id, err := primitive.ObjectIDFromHex(c.Params("id"))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
		}

		var updateData bson.M
		if err := c.BodyParser(&updateData); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		delete(updateData, "_id")
		updateData["updated_at"] = time.Now()

		collection := config.GetCollection(db, "orders")
		update := bson.M{"$set": updateData}

		result, err := collection.UpdateOne(context.TODO(), bson.M{"_id": id}, update)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update order"})
		}

		if result.MatchedCount == 0 {
			return c.Status(404).JSON(fiber.Map{"error": "Order not found"})
		}

		var order models.Order
		collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&order)
		return c.JSON(order)
	})

	// Delete order
	orders.Delete("/:id", func(c *fiber.Ctx) error {
		id, err := primitive.ObjectIDFromHex(c.Params("id"))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
		}

		collection := config.GetCollection(db, "orders")
		result, err := collection.DeleteOne(context.TODO(), bson.M{"_id": id})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to delete order"})
		}

		if result.DeletedCount == 0 {
			return c.Status(404).JSON(fiber.Map{"error": "Order not found"})
		}

		return c.JSON(fiber.Map{"message": "Order deleted successfully"})
	})
}

// About CRUD
func AboutRoutes(app fiber.Router, db *mongo.Client) {
	about := app.Group("/about")

	// Get about info (single record)
	about.Get("/", func(c *fiber.Ctx) error {
		collection := config.GetCollection(db, "about")
		var aboutInfo models.About
		err := collection.FindOne(context.TODO(), bson.M{}).Decode(&aboutInfo)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				return c.Status(404).JSON(fiber.Map{"error": "About information not found"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch about information"})
		}

		return c.JSON(aboutInfo)
	})

	// Create about info
	about.Post("/", func(c *fiber.Ctx) error {
		var aboutInfo models.About
		if err := c.BodyParser(&aboutInfo); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		aboutInfo.CreatedAt = time.Now()
		aboutInfo.UpdatedAt = time.Now()
		collection := config.GetCollection(db, "about")

		result, err := collection.InsertOne(context.TODO(), aboutInfo)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create about information"})
		}

		aboutInfo.ID = result.InsertedID.(primitive.ObjectID)
		return c.Status(201).JSON(aboutInfo)
	})

	// Update about info
	about.Put("/", func(c *fiber.Ctx) error {
		var updateData bson.M
		if err := c.BodyParser(&updateData); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		delete(updateData, "_id")
		updateData["updated_at"] = time.Now()

		collection := config.GetCollection(db, "about")
		update := bson.M{"$set": updateData}

		// Find and update the first (and should be only) record
		var aboutInfo models.About
		err := collection.FindOneAndUpdate(context.TODO(), bson.M{}, update).Decode(&aboutInfo)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				return c.Status(404).JSON(fiber.Map{"error": "About information not found"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update about information"})
		}

		// Get updated record
		collection.FindOne(context.TODO(), bson.M{"_id": aboutInfo.ID}).Decode(&aboutInfo)
		return c.JSON(aboutInfo)
	})

	// Delete about info
	about.Delete("/", func(c *fiber.Ctx) error {
		collection := config.GetCollection(db, "about")
		result, err := collection.DeleteOne(context.TODO(), bson.M{})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to delete about information"})
		}

		if result.DeletedCount == 0 {
			return c.Status(404).JSON(fiber.Map{"error": "About information not found"})
		}

		return c.JSON(fiber.Map{"message": "About information deleted successfully"})
	})
}

// Vendor CRUD
func VendorRoutes(app fiber.Router, db *mongo.Client) {
	genericCRUD(app, db, "vendors", "vendors", models.Vendor{})
}

// Project CRUD
func ProjectRoutes(app fiber.Router, db *mongo.Client) {
	genericCRUD(app, db, "projects", "projects", models.Project{})
}

// Links CRUD
func LinksRoutes(app fiber.Router, db *mongo.Client) {
	links := app.Group("/links")

	// Get links (single record)
	links.Get("/", func(c *fiber.Ctx) error {
		collection := config.GetCollection(db, "links")
		var linksInfo models.Links
		err := collection.FindOne(context.TODO(), bson.M{}).Decode(&linksInfo)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				return c.Status(404).JSON(fiber.Map{"error": "Links information not found"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch links information"})
		}

		return c.JSON(linksInfo)
	})

	// Create links
	links.Post("/", func(c *fiber.Ctx) error {
		var linksInfo models.Links
		if err := c.BodyParser(&linksInfo); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		linksInfo.CreatedAt = time.Now()
		linksInfo.UpdatedAt = time.Now()
		collection := config.GetCollection(db, "links")

		result, err := collection.InsertOne(context.TODO(), linksInfo)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create links information"})
		}

		linksInfo.ID = result.InsertedID.(primitive.ObjectID)
		return c.Status(201).JSON(linksInfo)
	})

	// Update links
	links.Put("/", func(c *fiber.Ctx) error {
		var updateData bson.M
		if err := c.BodyParser(&updateData); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		delete(updateData, "_id")
		updateData["updated_at"] = time.Now()

		collection := config.GetCollection(db, "links")
		update := bson.M{"$set": updateData}

		// Find and update the first (and should be only) record
		var linksInfo models.Links
		err := collection.FindOneAndUpdate(context.TODO(), bson.M{}, update).Decode(&linksInfo)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				return c.Status(404).JSON(fiber.Map{"error": "Links information not found"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update links information"})
		}

		// Get updated record
		collection.FindOne(context.TODO(), bson.M{"_id": linksInfo.ID}).Decode(&linksInfo)
		return c.JSON(linksInfo)
	})

	// Delete links
	links.Delete("/", func(c *fiber.Ctx) error {
		collection := config.GetCollection(db, "links")
		result, err := collection.DeleteOne(context.TODO(), bson.M{})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to delete links information"})
		}

		if result.DeletedCount == 0 {
			return c.Status(404).JSON(fiber.Map{"error": "Links information not found"})
		}

		return c.JSON(fiber.Map{"message": "Links information deleted successfully"})
	})
}

// Discount (singleton)
func DiscountRoutes(app fiber.Router, db *mongo.Client) {
	discount := app.Group("/discount")

	// Get discount info (single record)
	discount.Get("/", func(c *fiber.Ctx) error {
		collection := config.GetCollection(db, "discount")
		var info models.Discount
		err := collection.FindOne(context.TODO(), bson.M{}).Decode(&info)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				return c.Status(404).JSON(fiber.Map{"error": "Discount information not found"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch discount information"})
		}
		return c.JSON(info)
	})

	// Create discount info
	discount.Post("/", func(c *fiber.Ctx) error {
		var info models.Discount
		if err := c.BodyParser(&info); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		info.CreatedAt = time.Now()
		info.UpdatedAt = time.Now()
		collection := config.GetCollection(db, "discount")

		result, err := collection.InsertOne(context.TODO(), info)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create discount information"})
		}

		info.ID = result.InsertedID.(primitive.ObjectID)
		return c.Status(201).JSON(info)
	})

	// Update discount info (single record)
	discount.Put("/", func(c *fiber.Ctx) error {
		var updateData bson.M
		if err := c.BodyParser(&updateData); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		delete(updateData, "_id")
		updateData["updated_at"] = time.Now()

		collection := config.GetCollection(db, "discount")
		update := bson.M{"$set": updateData}

		var info models.Discount
		err := collection.FindOneAndUpdate(context.TODO(), bson.M{}, update).Decode(&info)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				return c.Status(404).JSON(fiber.Map{"error": "Discount information not found"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update discount information"})
		}

		collection.FindOne(context.TODO(), bson.M{"_id": info.ID}).Decode(&info)
		return c.JSON(info)
	})

	// Delete discount info
	discount.Delete("/", func(c *fiber.Ctx) error {
		collection := config.GetCollection(db, "discount")
		result, err := collection.DeleteOne(context.TODO(), bson.M{})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to delete discount information"})
		}

		if result.DeletedCount == 0 {
			return c.Status(404).JSON(fiber.Map{"error": "Discount information not found"})
		}

		return c.JSON(fiber.Map{"message": "Discount information deleted successfully"})
	})
}

// Official partner (singleton)
func OfficialPartnerRoutes(app fiber.Router, db *mongo.Client) {
	route := app.Group("/official-partner")

	// Get official partner (single record)
	route.Get("/", func(c *fiber.Ctx) error {
		collection := config.GetCollection(db, "official_partner")
		var info models.Official_partner
		err := collection.FindOne(context.TODO(), bson.M{}).Decode(&info)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				return c.Status(404).JSON(fiber.Map{"error": "Official partner information not found"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch official partner information"})
		}
		return c.JSON(info)
	})

	// Create official partner
	route.Post("/", func(c *fiber.Ctx) error {
		var info models.Official_partner
		if err := c.BodyParser(&info); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		info.CreatedAt = time.Now()
		info.UpdatedAt = time.Now()
		collection := config.GetCollection(db, "official_partner")

		result, err := collection.InsertOne(context.TODO(), info)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create official partner information"})
		}

		info.ID = result.InsertedID.(primitive.ObjectID)
		return c.Status(201).JSON(info)
	})

	// Update official partner (single record)
	route.Put("/", func(c *fiber.Ctx) error {
		var updateData bson.M
		if err := c.BodyParser(&updateData); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		delete(updateData, "_id")
		updateData["updated_at"] = time.Now()

		collection := config.GetCollection(db, "official_partner")
		update := bson.M{"$set": updateData}

		var info models.Official_partner
		err := collection.FindOneAndUpdate(context.TODO(), bson.M{}, update).Decode(&info)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				return c.Status(404).JSON(fiber.Map{"error": "Official partner information not found"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update official partner information"})
		}

		collection.FindOne(context.TODO(), bson.M{"_id": info.ID}).Decode(&info)
		return c.JSON(info)
	})

	// Delete official partner
	route.Delete("/", func(c *fiber.Ctx) error {
		collection := config.GetCollection(db, "official_partner")
		result, err := collection.DeleteOne(context.TODO(), bson.M{})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to delete official partner information"})
		}

		if result.DeletedCount == 0 {
			return c.Status(404).JSON(fiber.Map{"error": "Official partner information not found"})
		}

		return c.JSON(fiber.Map{"message": "Official partner information deleted successfully"})
	})
}
