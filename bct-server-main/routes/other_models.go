package routes

import (
	"context"
	"strconv"
	"strings"
	"time"

	"fiber-ecommerce/config"
	"fiber-ecommerce/middleware"
	"fiber-ecommerce/models"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"
)

func normalizeAdminRole(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "admin", "manager", "warehouse", "finance", "viewer":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return "manager"
	}
}

// Generic CRUD helper function
func genericCRUD(app fiber.Router, db *mongo.Client, routeName, collectionName string, model interface{}) {
	route := app.Group("/" + routeName)

	// Get all
	route.Get("/", func(c *fiber.Ctx) error {
		collection := config.GetCollection(db, collectionName)

		page, _ := strconv.Atoi(c.Query("page", "1"))
		limit, _ := strconv.Atoi(c.Query("limit", "10"))
		skip := (page - 1) * limit

		opts := options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.D{{Key: "created_at", Value: -1}})

		cursor, err := collection.Find(context.TODO(), bson.M{}, opts)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch " + routeName})
		}
		defer cursor.Close(context.TODO())

		var results []bson.M
		if err = cursor.All(context.TODO(), &results); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to decode " + routeName})
		}

		total, _ := collection.CountDocuments(context.TODO(), bson.M{})

		return c.JSON(fiber.Map{
			"data":  results,
			"total": total,
			"page":  page,
			"limit": limit,
		})
	})

	// Get single
	route.Get("/:id", func(c *fiber.Ctx) error {
		id, err := primitive.ObjectIDFromHex(c.Params("id"))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
		}

		collection := config.GetCollection(db, collectionName)
		var result bson.M
		err = collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&result)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": routeName + " not found"})
		}

		return c.JSON(result)
	})

	// Create
	route.Post("/", func(c *fiber.Ctx) error {
		var data bson.M
		if err := c.BodyParser(&data); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		data["created_at"] = time.Now()
		data["updated_at"] = time.Now()

		collection := config.GetCollection(db, collectionName)
		result, err := collection.InsertOne(context.TODO(), data)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create " + routeName})
		}

		data["_id"] = result.InsertedID
		return c.Status(201).JSON(data)
	})

	// Update
	route.Put("/:id", func(c *fiber.Ctx) error {
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

		collection := config.GetCollection(db, collectionName)
		update := bson.M{"$set": updateData}

		result, err := collection.UpdateOne(context.TODO(), bson.M{"_id": id}, update)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update " + routeName})
		}

		if result.MatchedCount == 0 {
			return c.Status(404).JSON(fiber.Map{"error": routeName + " not found"})
		}

		var updatedDoc bson.M
		collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&updatedDoc)
		return c.JSON(updatedDoc)
	})

	// Delete
	route.Delete("/:id", func(c *fiber.Ctx) error {
		id, err := primitive.ObjectIDFromHex(c.Params("id"))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
		}

		collection := config.GetCollection(db, collectionName)
		result, err := collection.DeleteOne(context.TODO(), bson.M{"_id": id})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to delete " + routeName})
		}

		if result.DeletedCount == 0 {
			return c.Status(404).JSON(fiber.Map{"error": routeName + " not found"})
		}

		return c.JSON(fiber.Map{"message": routeName + " deleted successfully"})
	})
}

// Sertificate CRUD
func SertificateRoutes(app fiber.Router, db *mongo.Client) {
	genericCRUD(app, db, "sertificates", "sertificates", models.Sertificate{})
}

// License CRUD
func LicenseRoutes(app fiber.Router, db *mongo.Client) {
	genericCRUD(app, db, "licenses", "licenses", models.License{})
}

// News CRUD
func NewsRoutes(app fiber.Router, db *mongo.Client) {
	genericCRUD(app, db, "news", "news", models.News{})
}

// Partner CRUD
func PartnerRoutes(app fiber.Router, db *mongo.Client) {
	genericCRUD(app, db, "partners", "partners", models.Partner{})
}

// Admin CRUD with password hashing
func AdminRoutes(app fiber.Router, db *mongo.Client) {
	admins := app.Group("/admins")
	admins.Use(middleware.AdminJWTMiddleware())

	// Get all admins
	admins.Get("/", func(c *fiber.Ctx) error {
		collection := config.GetCollection(db, "admins")

		page, _ := strconv.Atoi(c.Query("page", "1"))
		limit, _ := strconv.Atoi(c.Query("limit", "10"))
		skip := (page - 1) * limit

		opts := options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.D{{Key: "created_at", Value: -1}})

		cursor, err := collection.Find(context.TODO(), bson.M{}, opts)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch admins"})
		}
		defer cursor.Close(context.TODO())

		var admins []models.Admin
		if err = cursor.All(context.TODO(), &admins); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to decode admins"})
		}

		// Remove passwords from response
		for i := range admins {
			admins[i].Password = ""
			if admins[i].Role == "" {
				admins[i].Role = "admin"
			}
		}

		total, _ := collection.CountDocuments(context.TODO(), bson.M{})

		return c.JSON(fiber.Map{
			"data":  admins,
			"total": total,
			"page":  page,
			"limit": limit,
		})
	})

	// Get single admin
	admins.Get("/:id", func(c *fiber.Ctx) error {
		id, err := primitive.ObjectIDFromHex(c.Params("id"))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
		}

		collection := config.GetCollection(db, "admins")
		var admin models.Admin
		err = collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&admin)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Admin not found"})
		}

		admin.Password = "" // Don't return password
		if admin.Role == "" {
			admin.Role = "admin"
		}
		return c.JSON(admin)
	})

	// Create admin
	admins.Post("/", func(c *fiber.Ctx) error {
		var admin models.Admin
		if err := c.BodyParser(&admin); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}
		if admin.Name == "" || admin.Password == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Name and password are required"})
		}
		admin.Role = normalizeAdminRole(admin.Role)

		collection := config.GetCollection(db, "admins")
		existing, err := collection.CountDocuments(context.TODO(), bson.M{"name": admin.Name})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to validate admin"})
		}
		if existing > 0 {
			return c.Status(409).JSON(fiber.Map{"error": "Admin with this name already exists"})
		}

		// Hash password
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(admin.Password), bcrypt.DefaultCost)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to hash password"})
		}

		admin.Password = string(hashedPassword)
		admin.CreatedAt = time.Now()
		admin.UpdatedAt = time.Now()

		result, err := collection.InsertOne(context.TODO(), admin)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create admin"})
		}

		admin.ID = result.InsertedID.(primitive.ObjectID)
		admin.Password = "" // Don't return password
		return c.Status(201).JSON(admin)
	})

	// Update admin
	admins.Put("/:id", func(c *fiber.Ctx) error {
		id, err := primitive.ObjectIDFromHex(c.Params("id"))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
		}

		var updateData bson.M
		if err := c.BodyParser(&updateData); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}
		if name, exists := updateData["name"]; exists {
			nameValue, ok := name.(string)
			if !ok || nameValue == "" {
				return c.Status(400).JSON(fiber.Map{"error": "Name is required"})
			}
			collection := config.GetCollection(db, "admins")
			existing, err := collection.CountDocuments(context.TODO(), bson.M{"name": nameValue, "_id": bson.M{"$ne": id}})
			if err != nil {
				return c.Status(500).JSON(fiber.Map{"error": "Failed to validate admin"})
			}
			if existing > 0 {
				return c.Status(409).JSON(fiber.Map{"error": "Admin with this name already exists"})
			}
		}

		// Hash password if provided
		if password, exists := updateData["password"]; exists && password != "" {
			passwordValue, ok := password.(string)
			if !ok {
				return c.Status(400).JSON(fiber.Map{"error": "Invalid password"})
			}
			hashedPassword, err := bcrypt.GenerateFromPassword([]byte(passwordValue), bcrypt.DefaultCost)
			if err != nil {
				return c.Status(500).JSON(fiber.Map{"error": "Failed to hash password"})
			}
			updateData["password"] = string(hashedPassword)
		} else {
			delete(updateData, "password")
		}
		if role, exists := updateData["role"]; exists {
			roleValue, ok := role.(string)
			if !ok {
				return c.Status(400).JSON(fiber.Map{"error": "Invalid role"})
			}
			updateData["role"] = normalizeAdminRole(roleValue)
		}

		delete(updateData, "_id")
		updateData["updated_at"] = time.Now()

		collection := config.GetCollection(db, "admins")
		update := bson.M{"$set": updateData}

		result, err := collection.UpdateOne(context.TODO(), bson.M{"_id": id}, update)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update admin"})
		}

		if result.MatchedCount == 0 {
			return c.Status(404).JSON(fiber.Map{"error": "Admin not found"})
		}

		var admin models.Admin
		collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&admin)
		admin.Password = "" // Don't return password
		if admin.Role == "" {
			admin.Role = "admin"
		}
		return c.JSON(admin)
	})

	// Delete admin
	admins.Delete("/:id", func(c *fiber.Ctx) error {
		id, err := primitive.ObjectIDFromHex(c.Params("id"))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
		}

		collection := config.GetCollection(db, "admins")
		currentAdminID, _ := primitive.ObjectIDFromHex(c.Locals("admin_id").(string))
		if currentAdminID == id {
			return c.Status(409).JSON(fiber.Map{"error": "Current admin cannot be deleted"})
		}
		totalAdmins, err := collection.CountDocuments(context.TODO(), bson.M{})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to validate admin"})
		}
		if totalAdmins <= 1 {
			return c.Status(409).JSON(fiber.Map{"error": "At least one admin is required"})
		}

		result, err := collection.DeleteOne(context.TODO(), bson.M{"_id": id})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to delete admin"})
		}

		if result.DeletedCount == 0 {
			return c.Status(404).JSON(fiber.Map{"error": "Admin not found"})
		}

		return c.JSON(fiber.Map{"message": "Admin deleted successfully"})
	})
}

// Currency CRUD
func CurrencyRoutes(app fiber.Router, db *mongo.Client) {
	genericCRUD(app, db, "currencies", "currencies", models.Currency{})
}

// Banner CRUD
func BannerRoutes(app fiber.Router, db *mongo.Client) {
	genericCRUD(app, db, "banners", "banners", models.Banner{})
}

// SelectReview CRUD
func SelectReviewRoutes(app fiber.Router, db *mongo.Client) {
	genericCRUD(app, db, "select-reviews", "select_reviews", models.SelectReview{})
}

// Background CRUD
func BackgroundRoutes(app fiber.Router, db *mongo.Client) {
	genericCRUD(app, db, "backgrounds", "backgrounds", models.Background{})
}

// Contacts CRUD
func ContactsRoutes(app fiber.Router, db *mongo.Client) {
	genericCRUD(app, db, "contacts", "contacts", models.Contacts{})
}

// BannerSort CRUD
func BannerSortRoutes(app fiber.Router, db *mongo.Client) {
	genericCRUD(app, db, "banner-sorts", "banner_sorts", models.BannerSort{})
}

// TopCategorySort CRUD
func TopCategorySortRoutes(app fiber.Router, db *mongo.Client) {
	genericCRUD(app, db, "top-category-sorts", "top_category_sorts", models.TopCategorySort{})
}

// CategorySort CRUD
func CategorySortRoutes(app fiber.Router, db *mongo.Client) {
	genericCRUD(app, db, "category-sorts", "category_sorts", models.CategorySort{})
}

// Vendors_about CRUD
func VendorsAboutRoutes(app fiber.Router, db *mongo.Client) {
	genericCRUD(app, db, "vendors-about", "vendors_about", models.Vendors_about{})
}

// Experiments CRUD
func ExperimentsRoutes(app fiber.Router, db *mongo.Client) {
	genericCRUD(app, db, "experiments", "experiments", models.Experiments{})
}

// Company_stats CRUD
func CompanyStatsRoutes(app fiber.Router, db *mongo.Client) {
	genericCRUD(app, db, "company-stats", "company_stats", models.Company_stats{})
}
