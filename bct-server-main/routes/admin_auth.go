package routes

import (
	"context"
	"log"
	"os"
	"strings"
	"time"

	"fiber-ecommerce/config"
	"fiber-ecommerce/models"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v4"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

// Admin authentication models
type AdminLoginRequest struct {
	Name     string `json:"name"`
	Login    string `json:"login"`
	Password string `json:"password"`
}

type AdminUpdateRequest struct {
	Name     string `json:"name"`
	Password string `json:"password"`
}

type AdminAuthResponse struct {
	Token string       `json:"token"`
	Admin models.Admin `json:"admin"`
}

func AdminAuthRoutes(app fiber.Router, db *mongo.Client) {
	adminAuth := app.Group("/admin")

	// Admin Login - only login with existing admin
	adminAuth.Post("/login", func(c *fiber.Ctx) error {
		var req AdminLoginRequest
		if err := c.BodyParser(&req); err != nil {
			log.Printf("Error parsing request body: %v", err)
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		if req.Name == "" {
			req.Name = req.Login
		}

		log.Printf("Login attempt for admin: %s", req.Name)

		if req.Name == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Name is required"})
		}

		collection := config.GetCollection(db, "admins")

		// Find the admin by name
		var admin models.Admin
		err := collection.FindOne(context.TODO(), bson.M{"name": req.Name}).Decode(&admin)
		if err != nil {
			log.Printf("Admin not found: %s, error: %v", req.Name, err)
			return c.Status(401).JSON(fiber.Map{"error": "Invalid credentials"})
		}

		log.Printf("Found admin: %s", admin.Name)

		// Check password
		err = bcrypt.CompareHashAndPassword([]byte(admin.Password), []byte(req.Password))
		if err != nil {
			log.Printf("Password comparison failed for admin %s: %v", admin.Name, err)
			return c.Status(401).JSON(fiber.Map{"error": "Invalid credentials"})
		}

		log.Printf("Password verification successful for admin: %s", admin.Name)

		admin.Password = "" // Don't return password
		if admin.Role == "" {
			admin.Role = "admin"
		}
		admin.Permissions = normalizeAdminPermissions(admin.Role, admin.Permissions)

		// Generate JWT token
		token, err := generateAdminJWT(admin.ID.Hex(), admin.Name, admin.Role)
		if err != nil {
			log.Printf("Failed to generate JWT token: %v", err)
			return c.Status(500).JSON(fiber.Map{"error": "Failed to generate token"})
		}

		log.Printf("Login successful for admin: %s", admin.Name)

		return c.JSON(AdminAuthResponse{
			Token: token,
			Admin: admin,
		})
	})

	// Admin Update - update existing admin (protected route)
	adminAuth.Put("/update", func(c *fiber.Ctx) error {
		var req AdminUpdateRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		if req.Name == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Name is required"})
		}

		collection := config.GetCollection(db, "admins")

		adminID, err := adminIDFromRequest(c)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{"error": "Invalid or missing admin token"})
		}

		var admin models.Admin
		err = collection.FindOne(context.TODO(), bson.M{"_id": adminID}).Decode(&admin)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Admin not found"})
		}

		if normalizeAdminRole(admin.Role) != "admin" {
			return c.Status(403).JSON(fiber.Map{"error": "Only administrators can update credentials"})
		}

		updateData := bson.M{
			"name":       req.Name,
			"updated_at": time.Now(),
		}
		if req.Password != "" {
			hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
			if err != nil {
				return c.Status(500).JSON(fiber.Map{"error": "Failed to hash password"})
			}
			updateData["password"] = string(hashedPassword)
		}

		_, err = collection.UpdateOne(context.TODO(), bson.M{"_id": admin.ID}, bson.M{"$set": updateData})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update admin"})
		}

		// Get updated admin
		err = collection.FindOne(context.TODO(), bson.M{"_id": admin.ID}).Decode(&admin)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch updated admin"})
		}

		admin.Password = "" // Don't return password
		if admin.Role == "" {
			admin.Role = "admin"
		}
		admin.Permissions = normalizeAdminPermissions(admin.Role, admin.Permissions)

		// Generate new JWT token with updated info
		token, err := generateAdminJWT(admin.ID.Hex(), admin.Name, admin.Role)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to generate token"})
		}

		return c.JSON(AdminAuthResponse{
			Token: token,
			Admin: admin,
		})
	})

	// Admin Profile - get current admin info (protected route)
	adminAuth.Get("/profile", func(c *fiber.Ctx) error {
		collection := config.GetCollection(db, "admins")

		adminID, err := adminIDFromRequest(c)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{"error": "Invalid or missing admin token"})
		}

		var admin models.Admin
		err = collection.FindOne(context.TODO(), bson.M{"_id": adminID}).Decode(&admin)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Admin not found"})
		}

		admin.Password = "" // Don't return password
		if admin.Role == "" {
			admin.Role = "admin"
		}
		admin.Permissions = normalizeAdminPermissions(admin.Role, admin.Permissions)
		return c.JSON(admin)
	})

	adminAuth.Post("/seed/test-products", func(c *fiber.Ctx) error {
		adminID, err := adminIDFromRequest(c)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{"error": "Invalid or missing admin token"})
		}

		now := time.Now()
		topCategoriesCollection := config.GetCollection(db, "topcategories")
		categoriesCollection := config.GetCollection(db, "categories")
		productsCollection := config.GetCollection(db, "products")

		var topCategory models.TopCategory
		err = topCategoriesCollection.FindOne(context.TODO(), bson.M{"name": "Test Data"}).Decode(&topCategory)
		if err == mongo.ErrNoDocuments {
			topCategory = models.TopCategory{
				ID:        primitive.NewObjectID(),
				Name:      "Test Data",
				Image:     "",
				CreatedAt: now,
				UpdatedAt: now,
			}
			if _, err := topCategoriesCollection.InsertOne(context.TODO(), topCategory); err != nil {
				return c.Status(500).JSON(fiber.Map{"error": "Failed to create test top category"})
			}
		} else if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to load test top category"})
		}

		type categorySeed struct {
			Name string
		}
		categoryMap := map[string]primitive.ObjectID{}
		for _, item := range []categorySeed{
			{Name: "POS Systems"},
			{Name: "Barcode Scanners"},
			{Name: "Label Printers"},
			{Name: "Receipt Printers"},
		} {
			var category models.Category
			err = categoriesCollection.FindOne(context.TODO(), bson.M{"name": item.Name}).Decode(&category)
			if err == mongo.ErrNoDocuments {
				category = models.Category{
					ID:             primitive.NewObjectID(),
					Name:           item.Name,
					Image:          "",
					TopCategoryID:  &topCategory.ID,
					TopCategoryName: topCategory.Name,
					CreatedAt:      now,
					UpdatedAt:      now,
				}
				if _, err := categoriesCollection.InsertOne(context.TODO(), category); err != nil {
					return c.Status(500).JSON(fiber.Map{"error": "Failed to create test category"})
				}
			} else if err != nil {
				return c.Status(500).JSON(fiber.Map{"error": "Failed to load test category"})
			}
			categoryMap[item.Name] = category.ID
		}

		seedData := []struct {
			Name       string
			Category   string
			Warehouse  string
			WarehouseID string
			Count      int
			Price      float64
		}{
			{"Тест товар 1", "POS Systems", "Склад 1", "warehouse-1", 7, 2499000},
			{"Тест товар 2", "Barcode Scanners", "Склад 2", "warehouse-2", 22, 890000},
			{"Тест товар 3", "Label Printers", "Склад 1", "warehouse-1", 4, 1780000},
			{"Тест товар 4", "POS Systems", "Склад 3", "warehouse-3", 9, 620000},
			{"Тест товар 5", "Receipt Printers", "Склад 2", "warehouse-2", 13, 540000},
		}

		insertedOrUpdated := []models.Product{}

		if _, err := productsCollection.DeleteMany(context.TODO(), bson.M{
			"owner_admin_id": adminID.Hex(),
			"is_test_data":   true,
		}); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to reset existing test products"})
		}

		for _, item := range seedData {
			categoryID := categoryMap[item.Category]
			categoryName := item.Category
			product := models.Product{
				ID:              primitive.NewObjectID(),
				Name:            item.Name,
				Images:          []string{"/uploads/test-product-placeholder.png"},
				Description:     "Profile test product for ERP verification",
				Price:           models.NewFlexFloat64(item.Price),
				CategoryID:      &categoryID,
				TopCategoryID:   &topCategory.ID,
				CategoryName:    &categoryName,
				TopCategoryName: &topCategory.Name,
				Count:           item.Count,
				WarehouseID:     item.WarehouseID,
				Warehouse:       item.Warehouse,
				StockByWarehouse: map[string]int{
					item.WarehouseID: item.Count,
				},
				OwnerAdminID: adminID.Hex(),
				IsTestData:   true,
				CreatedAt:    now,
				UpdatedAt:    now,
			}

			if _, err := productsCollection.InsertOne(context.TODO(), product); err != nil {
				return c.Status(500).JSON(fiber.Map{"error": "Failed to seed test products"})
			}
			insertedOrUpdated = append(insertedOrUpdated, product)
		}

		return c.JSON(fiber.Map{
			"data":  insertedOrUpdated,
			"total": len(insertedOrUpdated),
		})
	})

	// Debug endpoints must never expose password hashes in production.
}

func getAdminCount(collection *mongo.Collection) int64 {
	count, _ := collection.CountDocuments(context.TODO(), bson.M{})
	return count
}

func adminIDFromRequest(c *fiber.Ctx) (primitive.ObjectID, error) {
	authHeader := c.Get("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		return primitive.NilObjectID, fiber.ErrUnauthorized
	}

	tokenString := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-super-secret-jwt-key-here"
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(jwtSecret), nil
	})
	if err != nil || !token.Valid {
		return primitive.NilObjectID, fiber.ErrUnauthorized
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return primitive.NilObjectID, fiber.ErrUnauthorized
	}
	adminID, ok := claims["admin_id"].(string)
	if !ok || adminID == "" {
		return primitive.NilObjectID, fiber.ErrUnauthorized
	}

	return primitive.ObjectIDFromHex(adminID)
}

func generateAdminJWT(adminID, adminName, adminRole string) (string, error) {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-super-secret-jwt-key-here"
	}

	claims := jwt.MapClaims{
		"admin_id":   adminID,
		"admin_name": adminName,
		"admin_role": normalizeAdminRole(adminRole),
		"type":       "admin",
		"exp":        time.Now().Add(time.Hour * 24 * 7).Unix(), // 7 days
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(jwtSecret))
}
