package main

import (
	"context"
	"log"
	"os"
	"strings"
	"time"

	"fiber-ecommerce/config"
	"fiber-ecommerce/routes"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
	// Initialize database
	db, err := config.ConnectDB()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer func() {
		if err = db.Disconnect(context.TODO()); err != nil {
			log.Println("Failed to disconnect from database:", err)
		}
	}()

	// Initialize Fiber app
	app := fiber.New(fiber.Config{
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		BodyLimit:    50 * 1024 * 1024, // 50MB for file uploads
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New())
	allowedOrigins := map[string]struct{}{
		"http://localhost:3000":              {},
		"http://127.0.0.1:3000":              {},
		"http://localhost:5173":              {},
		"https://bct-erp-nine.vercel.app":    {},
		"https://bct-admin-eight.vercel.app": {},
	}

	isAllowedLocalNetworkOrigin := func(origin string) bool {
		if !strings.HasPrefix(origin, "http://") {
			return false
		}

		hostWithPort := strings.TrimPrefix(origin, "http://")
		parts := strings.Split(hostWithPort, ":")
		if len(parts) != 2 {
			return false
		}

		host := parts[0]
		port := parts[1]
		if port != "3000" && port != "5173" {
			return false
		}

		if strings.HasPrefix(host, "192.168.") || strings.HasPrefix(host, "10.") {
			return true
		}

		private172Prefixes := []string{
			"172.16.", "172.17.", "172.18.", "172.19.",
			"172.20.", "172.21.", "172.22.", "172.23.",
			"172.24.", "172.25.", "172.26.", "172.27.",
			"172.28.", "172.29.", "172.30.", "172.31.",
		}
		for _, prefix := range private172Prefixes {
			if strings.HasPrefix(host, prefix) {
				return true
			}
		}

		return false
	}

	allowOriginFunc := func(origin string) bool {
		origin = strings.TrimSpace(origin)
		if origin == "" {
			return true
		}

		if _, ok := allowedOrigins[origin]; ok {
			return true
		}

		return isAllowedLocalNetworkOrigin(origin)
	}

	app.Use(cors.New(cors.Config{
		AllowOriginsFunc: allowOriginFunc,
		AllowMethods:     "GET,POST,PUT,DELETE,PATCH,OPTIONS,HEAD",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization,Access-Control-Allow-Origin,Access-Control-Allow-Headers,Access-Control-Allow-Methods,Access-Control-Allow-Credentials,X-Requested-With",
		AllowCredentials: true,
		ExposeHeaders:    "Content-Length,Access-Control-Allow-Origin,Access-Control-Allow-Headers,Cache-Control,Content-Language,Content-Type",
	}))

	// Static files for uploads
	app.Static("/uploads", "./uploads")

	// API Routes
	api := app.Group("/api")

	// Authentication routes
	routes.UserAuthRoutes(api, db)  // User authentication (email/password)
	routes.AdminAuthRoutes(api, db) // Admin authentication

	// User Management routes (Admin only)
	// routes.UserManagementRoutes(api, db) // Admin can monitor/manage users
	routes.AdminDashboardRoutes(api, db)

	// Core models CRUD routes
	routes.TopCategoryRoutes(api, db)
	routes.CategoryRoutes(api, db)
	routes.ProductRoutes(api, db) // Updated with category names and price
	routes.OrderRoutes(api, db)   // Updated to reference users instead of clients
	routes.CompanyRoutes(api, db)
	routes.ClientRoutes(api, db)
	routes.CounterpartyRoutes(api, db)
	routes.ContractRoutes(api, db)
	routes.FunnelRoutes(api, db)
	routes.WarehouseRoutes(api, db)
	routes.ERPTransactionRoutes(api, db)

	// Information pages (singleton models)
	routes.AboutRoutes(api, db)
	routes.LinksRoutes(api, db)
	routes.DiscountRoutes(api, db)
	routes.OfficialPartnerRoutes(api, db)

	// Media/Content routes
	routes.VendorRoutes(api, db)
	routes.ProjectRoutes(api, db)
	routes.VendorsAboutRoutes(api, db)
	routes.ExperimentsRoutes(api, db)
	routes.CompanyStatsRoutes(api, db)

	// Content CRUD routes
	routes.ReviewRoutes(api, db)
	routes.SertificateRoutes(api, db)
	routes.LicenseRoutes(api, db)
	routes.NewsRoutes(api, db)
	routes.PartnerRoutes(api, db)
	routes.AdminRoutes(api, db)
	routes.CurrencyRoutes(api, db)
	routes.BannerRoutes(api, db)
	routes.SelectReviewRoutes(api, db)
	routes.BackgroundRoutes(api, db)
	routes.ContactsRoutes(api, db)
	routes.BannerSortRoutes(api, db)
	routes.TopCategorySortRoutes(api, db)
	routes.CategorySortRoutes(api, db)

	// File upload route
	routes.FileRoutes(api, db)

	// Root endpoint
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"message": "Fiber E-commerce API",
			"version": "2.1.0",
			"status":  "running",
			"endpoints": fiber.Map{
				"health":           "/health",
				"api":              "/api/*",
				"uploads":          "/uploads/*",
				"user_register":    "/api/auth/register",
				"user_login":       "/api/auth/login",
				"user_profile":     "/api/auth/profile",
				"my_orders":        "/api/orders/my-orders",
				"admin_login":      "/api/admin/login",
				"user_management":  "/api/users (admin only)",
				"order_management": "/api/orders (admin only)",
				"documentation":    "See README.md for full API documentation",
			},
		})
	})

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":    "ok",
			"message":   "Server is running",
			"timestamp": time.Now().UTC(),
			"database":  "connected",
			"features": fiber.Map{
				"user_auth":        "enabled",
				"admin_auth":       "enabled",
				"user_management":  "enabled (admin only)",
				"order_management": "enabled",
				"file_upload":      "enabled",
			},
		})
	})

	// 404 handler for debugging
	app.Use(func(c *fiber.Ctx) error {
		return c.Status(404).JSON(fiber.Map{
			"error":   "Route not found",
			"path":    c.Path(),
			"method":  c.Method(),
			"message": "Please check the API documentation for available endpoints",
			"available_endpoints": fiber.Map{
				"auth":     "/api/auth/*",
				"admin":    "/api/admin/*",
				"users":    "/api/users/* (admin only)",
				"orders":   "/api/orders/*",
				"products": "/api/products/*",
				"files":    "/api/files/*",
			},
		})
	})

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "9000"
	}

	log.Printf("🚀 Server starting on port %s", port)
	log.Printf("📚 API documentation: http://localhost:%s/", port)
	log.Printf("🔍 Health check: http://localhost:%s/health", port)
	log.Printf("👤 User registration: http://localhost:%s/api/auth/register", port)
	log.Printf("👤 User login: http://localhost:%s/api/auth/login", port)
	log.Printf("👤 User profile: http://localhost:%s/api/auth/profile", port)
	log.Printf("📦 My orders: http://localhost:%s/api/orders/my-orders", port)
	log.Printf("🔐 Admin login: http://localhost:%s/api/admin/login", port)
	log.Printf("👥 User management: http://localhost:%s/api/users (admin only)", port)
	log.Printf("📋 Order management: http://localhost:%s/api/orders (admin only)", port)
	log.Printf("📁 File uploads: http://localhost:%s/uploads/", port)

	log.Fatal(app.Listen(":" + port))
}
