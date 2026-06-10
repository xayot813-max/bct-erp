// routes/user_auth.go - PHONE-BASED LOGIN VERSION
package routes

import (
	"context"
	"time"

	"fiber-ecommerce/config"
	"fiber-ecommerce/models"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

func UserAuthRoutes(app fiber.Router, db *mongo.Client) {
	auth := app.Group("/auth")

	// User Registration
	auth.Post("/register", func(c *fiber.Ctx) error {
		var req models.UserRegisterRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		// Validate required fields
		if req.Name == "" || req.Phone == "" || req.Password == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Name, phone, and password are required"})
		}

		// Validate phone format (Uzbekistan format: +998XXXXXXXXX)
		if len(req.Phone) != 13 || req.Phone[:4] != "+998" {
			return c.Status(400).JSON(fiber.Map{"error": "Phone must be in format +998XXXXXXXXX"})
		}

		collection := config.GetCollection(db, "users")

		// Check if user already exists (by phone)
		var existingUser models.User
		err := collection.FindOne(context.TODO(), bson.M{"phone": req.Phone}).Decode(&existingUser)
		if err == nil {
			return c.Status(409).JSON(fiber.Map{"error": "User with this phone number already exists"})
		}

		// Check if email already exists (if provided)
		if req.Email != "" {
			err = collection.FindOne(context.TODO(), bson.M{"email": req.Email}).Decode(&existingUser)
			if err == nil {
				return c.Status(409).JSON(fiber.Map{"error": "User with this email already exists"})
			}
		}

		// Hash password
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to hash password"})
		}

		// Create user
		user := models.User{
			Name:      req.Name,
			Email:     req.Email,
			Phone:     req.Phone,
			Password:  string(hashedPassword),
			IsActive:  true, // Default to active
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		result, err := collection.InsertOne(context.TODO(), user)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create user"})
		}

		user.ID = result.InsertedID.(primitive.ObjectID)
		user.Password = "" // Don't return password

		// Generate JWT token
		// token, err := generateUserJWT(user.ID.Hex(), user.Phone)
		// if err != nil {
		// 	return c.Status(500).JSON(fiber.Map{"error": "Failed to generate token"})
		// }

		return c.Status(201).JSON(user)
	})

	// User Login (Phone + Password)
	auth.Post("/login", func(c *fiber.Ctx) error {
		var req models.UserLoginRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		if req.Phone == "" || req.Password == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Phone and password are required"})
		}

		// Validate phone format
		if len(req.Phone) != 13 || req.Phone[:4] != "+998" {
			return c.Status(400).JSON(fiber.Map{"error": "Phone must be in format +998XXXXXXXXX"})
		}

		collection := config.GetCollection(db, "users")

		// Find user by phone
		var user models.User
		err := collection.FindOne(context.TODO(), bson.M{"phone": req.Phone}).Decode(&user)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{"error": "Invalid credentials"})
		}

		// Check if user is active
		if !user.IsActive {
			return c.Status(401).JSON(fiber.Map{"error": "Account is deactivated. Please contact administrator."})
		}

		// Check password
		err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
		if err != nil {
			return c.Status(401).JSON(fiber.Map{"error": "Invalid credentials"})
		}

		// Update last login
		now := time.Now()
		collection.UpdateOne(context.TODO(), bson.M{"_id": user.ID}, bson.M{
			"$set": bson.M{
				"last_login": &now,
				"updated_at": now,
			},
		})
		user.LastLogin = &now

		user.Password = "" // Don't return password

		// Generate JWT token
		// token, err := generateUserJWT(user.ID.Hex(), user.Phone)
		// if err != nil {
		// 	return c.Status(500).JSON(fiber.Map{"error": "Failed to generate token"})
		// }

		return c.JSON(user)
	})

	// Get User Profile (protected route)
	auth.Get("/profile", func(c *fiber.Ctx) error {
		userID := c.Locals("user_id").(string)

		id, err := primitive.ObjectIDFromHex(userID)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
		}

		collection := config.GetCollection(db, "users")
		var user models.User
		err = collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&user)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "User not found"})
		}

		user.Password = "" // Don't return password
		return c.JSON(user)
	})

	// Update User Profile (protected route)
	auth.Put("/profile", func(c *fiber.Ctx) error {
		userID := c.Locals("user_id").(string)

		id, err := primitive.ObjectIDFromHex(userID)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
		}

		var updateData bson.M
		if err := c.BodyParser(&updateData); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		// Validate phone format if being updated
		if phone, exists := updateData["phone"]; exists && phone != "" {
			phoneStr := phone.(string)
			if len(phoneStr) != 13 || phoneStr[:4] != "+998" {
				return c.Status(400).JSON(fiber.Map{"error": "Phone must be in format +998XXXXXXXXX"})
			}

			// Check if phone already exists for another user
			collection := config.GetCollection(db, "users")
			var existingUser models.User
			err := collection.FindOne(context.TODO(), bson.M{
				"phone": phoneStr,
				"_id":   bson.M{"$ne": id},
			}).Decode(&existingUser)
			if err == nil {
				return c.Status(409).JSON(fiber.Map{"error": "Phone number already exists for another user"})
			}
		}

		// Hash password if provided
		if password, exists := updateData["password"]; exists && password != "" {
			hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password.(string)), bcrypt.DefaultCost)
			if err != nil {
				return c.Status(500).JSON(fiber.Map{"error": "Failed to hash password"})
			}
			updateData["password"] = string(hashedPassword)
		}

		// Don't allow users to change their active status
		delete(updateData, "is_active")
		delete(updateData, "_id")
		delete(updateData, "last_login")
		updateData["updated_at"] = time.Now()

		collection := config.GetCollection(db, "users")
		update := bson.M{"$set": updateData}

		result, err := collection.UpdateOne(context.TODO(), bson.M{"_id": id}, update)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update profile"})
		}

		if result.MatchedCount == 0 {
			return c.Status(404).JSON(fiber.Map{"error": "User not found"})
		}

		// Get updated user
		var user models.User
		collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&user)
		user.Password = "" // Don't return password

		return c.JSON(user)
	})

	// User Logout (optional - mainly for clearing tokens on frontend)
	auth.Post("/logout", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"message": "Logged out successfully"})
	})
}

// func generateUserJWT(userID, phone string) (string, error) {
// 	jwtSecret := os.Getenv("JWT_SECRET")
// 	if jwtSecret == "" {
// 		jwtSecret = "your-super-secret-jwt-key-here"
// 	}

// 	claims := jwt.MapClaims{
// 		"user_id": userID,
// 		"phone":   phone,
// 		"type":    "user",
// 		"exp":     time.Now().Add(time.Hour * 24 * 30).Unix(), // 30 days
// 	}

// 	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
// 	return token.SignedString([]byte(jwtSecret))
// }