package routes

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"fiber-ecommerce/config"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Additional Admin Dashboard Routes
func AdminDashboardRoutes(app fiber.Router, db *mongo.Client) {
	dashboard := app.Group("/admin/dashboard")

	// Apply admin authentication middleware

	// Get comprehensive dashboard statistics
	dashboard.Get("/stats", func(c *fiber.Ctx) error {
		// Get collections
		usersCollection := config.GetCollection(db, "users")
		ordersCollection := config.GetCollection(db, "orders")
		productsCollection := config.GetCollection(db, "products")
		reviewsCollection := config.GetCollection(db, "reviews")

		// Time ranges
		now := time.Now()
		startOfToday := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		startOfWeek := startOfToday.AddDate(0, 0, -int(now.Weekday()))
		startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		// startOfYear := time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location())

		// User statistics
		totalUsers, _ := usersCollection.CountDocuments(context.TODO(), bson.M{})
		activeUsers, _ := usersCollection.CountDocuments(context.TODO(), bson.M{"is_active": true})
		newUsersToday, _ := usersCollection.CountDocuments(context.TODO(), bson.M{
			"created_at": bson.M{"$gte": startOfToday},
		})
		newUsersThisWeek, _ := usersCollection.CountDocuments(context.TODO(), bson.M{
			"created_at": bson.M{"$gte": startOfWeek},
		})
		newUsersThisMonth, _ := usersCollection.CountDocuments(context.TODO(), bson.M{
			"created_at": bson.M{"$gte": startOfMonth},
		})

		// Order statistics
		totalOrders, _ := ordersCollection.CountDocuments(context.TODO(), bson.M{})
		pendingOrders, _ := ordersCollection.CountDocuments(context.TODO(), bson.M{"status": "pending"})
		confirmedOrders, _ := ordersCollection.CountDocuments(context.TODO(), bson.M{"status": "confirmed"})
		shippedOrders, _ := ordersCollection.CountDocuments(context.TODO(), bson.M{"status": "shipped"})
		deliveredOrders, _ := ordersCollection.CountDocuments(context.TODO(), bson.M{"status": "delivered"})
		cancelledOrders, _ := ordersCollection.CountDocuments(context.TODO(), bson.M{"status": "cancelled"})

		ordersToday, _ := ordersCollection.CountDocuments(context.TODO(), bson.M{
			"created_at": bson.M{"$gte": startOfToday},
		})
		ordersThisWeek, _ := ordersCollection.CountDocuments(context.TODO(), bson.M{
			"created_at": bson.M{"$gte": startOfWeek},
		})
		ordersThisMonth, _ := ordersCollection.CountDocuments(context.TODO(), bson.M{
			"created_at": bson.M{"$gte": startOfMonth},
		})

		// Product statistics
		totalProducts, _ := productsCollection.CountDocuments(context.TODO(), bson.M{})
		discountedProducts, _ := productsCollection.CountDocuments(context.TODO(), bson.M{
			"discount": bson.M{"$ne": "", "$exists": true},
		})

		// Review statistics
		totalReviews, _ := reviewsCollection.CountDocuments(context.TODO(), bson.M{})
		reviewsThisMonth, _ := reviewsCollection.CountDocuments(context.TODO(), bson.M{
			"created_at": bson.M{"$gte": startOfMonth},
		})

		return c.JSON(fiber.Map{
			"users": fiber.Map{
				"total":          totalUsers,
				"active":         activeUsers,
				"inactive":       totalUsers - activeUsers,
				"new_today":      newUsersToday,
				"new_this_week":  newUsersThisWeek,
				"new_this_month": newUsersThisMonth,
			},
			"orders": fiber.Map{
				"total":      totalOrders,
				"pending":    pendingOrders,
				"confirmed":  confirmedOrders,
				"shipped":    shippedOrders,
				"delivered":  deliveredOrders,
				"cancelled":  cancelledOrders,
				"today":      ordersToday,
				"this_week":  ordersThisWeek,
				"this_month": ordersThisMonth,
			},
			"products": fiber.Map{
				"total":      totalProducts,
				"discounted": discountedProducts,
			},
			"reviews": fiber.Map{
				"total":      totalReviews,
				"this_month": reviewsThisMonth,
			},
			"timestamp": now,
		})
	})

	// Get recent activities
	dashboard.Get("/recent-activities", func(c *fiber.Ctx) error {
		limit, _ := strconv.Atoi(c.Query("limit", "20"))

		// Get recent users
		usersCollection := config.GetCollection(db, "users")
		usersCursor, _ := usersCollection.Find(context.TODO(), bson.M{},
			options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}).SetLimit(int64(limit/4)))

		var recentUsers []bson.M
		usersCursor.All(context.TODO(), &recentUsers)
		usersCursor.Close(context.TODO())

		// Get recent orders
		ordersCollection := config.GetCollection(db, "orders")
		ordersCursor, _ := ordersCollection.Find(context.TODO(), bson.M{},
			options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}).SetLimit(int64(limit/2)))

		var recentOrders []bson.M
		ordersCursor.All(context.TODO(), &recentOrders)
		ordersCursor.Close(context.TODO())

		// Get recent reviews
		reviewsCollection := config.GetCollection(db, "reviews")
		reviewsCursor, _ := reviewsCollection.Find(context.TODO(), bson.M{},
			options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}).SetLimit(int64(limit/4)))

		var recentReviews []bson.M
		reviewsCursor.All(context.TODO(), &recentReviews)
		reviewsCursor.Close(context.TODO())

		// Combine activities
		activities := []fiber.Map{}

		for _, user := range recentUsers {
			activities = append(activities, fiber.Map{
				"type":        "user_registration",
				"description": "New user registered: " + user["name"].(string),
				"timestamp":   user["created_at"],
				"data":        user,
			})
		}

		for _, order := range recentOrders {
			activities = append(activities, fiber.Map{
				"type":        "new_order",
				"description": "New order placed",
				"timestamp":   order["created_at"],
				"data":        order,
			})
		}

		for _, review := range recentReviews {
			activities = append(activities, fiber.Map{
				"type":        "new_review",
				"description": "New review from: " + review["name"].(string),
				"timestamp":   review["created_at"],
				"data":        review,
			})
		}

		return c.JSON(fiber.Map{
			"activities": activities,
			"total":      len(activities),
		})
	})

	// Get sales analytics
	dashboard.Get("/sales-analytics", func(c *fiber.Ctx) error {
		period := c.Query("period", "month") // day, week, month, year
		ordersCollection := config.GetCollection(db, "orders")

		var startDate time.Time
		var groupFormat string

		switch period {
		case "day":
			startDate = time.Now().AddDate(0, 0, -30) // Last 30 days
			groupFormat = "%Y-%m-%d"
		case "week":
			startDate = time.Now().AddDate(0, 0, -84) // Last 12 weeks
			groupFormat = "%Y-%U"
		case "year":
			startDate = time.Now().AddDate(-3, 0, 0) // Last 3 years
			groupFormat = "%Y"
		default: // month
			startDate = time.Now().AddDate(-1, 0, 0) // Last 12 months
			groupFormat = "%Y-%m"
		}

		pipeline := []bson.M{
			{
				"$match": bson.M{
					"created_at": bson.M{"$gte": startDate},
					"status":     bson.M{"$ne": "cancelled"},
				},
			},
			{
				"$group": bson.M{
					"_id": bson.M{
						"$dateToString": bson.M{
							"format": groupFormat,
							"date":   "$created_at",
						},
					},
					"total_orders": bson.M{"$sum": 1},
					"total_revenue": bson.M{
						"$sum": bson.M{
							"$toDouble": "$total_amount",
						},
					},
				},
			},
			{
				"$sort": bson.M{"_id": 1},
			},
		}

		cursor, err := ordersCollection.Aggregate(context.TODO(), pipeline)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to get sales analytics"})
		}
		defer cursor.Close(context.TODO())

		var results []bson.M
		cursor.All(context.TODO(), &results)

		return c.JSON(fiber.Map{
			"period": period,
			"data":   results,
		})
	})

	// Get top products
	dashboard.Get("/top-products", func(c *fiber.Ctx) error {
		limit, _ := strconv.Atoi(c.Query("limit", "10"))
		ordersCollection := config.GetCollection(db, "orders")

		pipeline := []bson.M{
			{
				"$unwind": "$products",
			},
			{
				"$group": bson.M{
					"_id":          "$products.product_id",
					"total_sold":   bson.M{"$sum": "$products.count"},
					"total_orders": bson.M{"$sum": 1},
				},
			},
			{
				"$sort": bson.M{"total_sold": -1},
			},
			{
				"$limit": int64(limit),
			},
			{
				"$lookup": bson.M{
					"from":         "products",
					"localField":   "_id",
					"foreignField": "_id",
					"as":           "product_info",
				},
			},
			{
				"$unwind": "$product_info",
			},
		}

		cursor, err := ordersCollection.Aggregate(context.TODO(), pipeline)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to get top products"})
		}
		defer cursor.Close(context.TODO())

		var results []bson.M
		cursor.All(context.TODO(), &results)

		return c.JSON(fiber.Map{
			"top_products": results,
		})
	})

	// Get user growth analytics
	dashboard.Get("/user-growth", func(c *fiber.Ctx) error {
		period := c.Query("period", "month")
		usersCollection := config.GetCollection(db, "users")

		var startDate time.Time
		var groupFormat string

		switch period {
		case "day":
			startDate = time.Now().AddDate(0, 0, -30)
			groupFormat = "%Y-%m-%d"
		case "week":
			startDate = time.Now().AddDate(0, 0, -84)
			groupFormat = "%Y-%U"
		case "year":
			startDate = time.Now().AddDate(-3, 0, 0)
			groupFormat = "%Y"
		default:
			startDate = time.Now().AddDate(-1, 0, 0)
			groupFormat = "%Y-%m"
		}

		pipeline := []bson.M{
			{
				"$match": bson.M{
					"created_at": bson.M{"$gte": startDate},
				},
			},
			{
				"$group": bson.M{
					"_id": bson.M{
						"$dateToString": bson.M{
							"format": groupFormat,
							"date":   "$created_at",
						},
					},
					"new_users": bson.M{"$sum": 1},
				},
			},
			{
				"$sort": bson.M{"_id": 1},
			},
		}

		cursor, err := usersCollection.Aggregate(context.TODO(), pipeline)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to get user growth analytics"})
		}
		defer cursor.Close(context.TODO())

		var results []bson.M
		cursor.All(context.TODO(), &results)

		return c.JSON(fiber.Map{
			"period": period,
			"data":   results,
		})
	})

	// Get low stock alerts (if you add inventory management)
	dashboard.Get("/alerts", func(c *fiber.Ctx) error {
		// This is a placeholder for future inventory management
		// You can expand this when you add stock tracking to products

		alerts := []fiber.Map{
			{
				"type":        "info",
				"title":       "System Status",
				"description": "All systems operational",
				"timestamp":   time.Now(),
			},
		}

		// Check for old pending orders (more than 7 days)
		ordersCollection := config.GetCollection(db, "orders")
		sevenDaysAgo := time.Now().AddDate(0, 0, -7)

		oldPendingOrders, _ := ordersCollection.CountDocuments(context.TODO(), bson.M{
			"status":     "pending",
			"created_at": bson.M{"$lt": sevenDaysAgo},
		})

		if oldPendingOrders > 0 {
			alerts = append(alerts, fiber.Map{
				"type":        "warning",
				"title":       "Old Pending Orders",
				"description": fmt.Sprintf("%d orders have been pending for more than 7 days", oldPendingOrders),
				"timestamp":   time.Now(),
				"count":       oldPendingOrders,
			})
		}

		// Check for inactive users with recent orders
		usersCollection := config.GetCollection(db, "users")
		thirtyDaysAgo := time.Now().AddDate(0, 0, -30)

		inactiveUsersWithRecentOrders, _ := usersCollection.CountDocuments(context.TODO(), bson.M{
			"is_active":  false,
			"last_login": bson.M{"$gte": thirtyDaysAgo},
		})

		if inactiveUsersWithRecentOrders > 0 {
			alerts = append(alerts, fiber.Map{
				"type":        "info",
				"title":       "Inactive Users with Recent Activity",
				"description": fmt.Sprintf("%d inactive users have logged in recently", inactiveUsersWithRecentOrders),
				"timestamp":   time.Now(),
				"count":       inactiveUsersWithRecentOrders,
			})
		}

		return c.JSON(fiber.Map{
			"alerts": alerts,
			"total":  len(alerts),
		})
	})
}
