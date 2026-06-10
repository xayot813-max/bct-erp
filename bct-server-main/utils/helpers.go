// utils/helpers.go - Create this new file
package utils

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Email validation
func IsValidEmail(email string) bool {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email)
}

// Phone validation (Uzbekistan format)
func IsValidUzbekPhone(phone string) bool {
	phoneRegex := regexp.MustCompile(`^\+998[0-9]{9}$`)
	return phoneRegex.MatchString(phone)
}

// Password strength validation
func IsStrongPassword(password string) (bool, string) {
	if len(password) < 6 {
		return false, "Password must be at least 6 characters long"
	}

	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
	hasDigit := regexp.MustCompile(`[0-9]`).MatchString(password)

	if !hasUpper {
		return false, "Password must contain at least one uppercase letter"
	}
	if !hasLower {
		return false, "Password must contain at least one lowercase letter"
	}
	if !hasDigit {
		return false, "Password must contain at least one digit"
	}

	return true, ""
}

// Sanitize string input
func SanitizeString(input string) string {
	// Remove leading/trailing whitespace
	input = strings.TrimSpace(input)

	// Remove multiple consecutive spaces
	spaceRegex := regexp.MustCompile(`\s+`)
	input = spaceRegex.ReplaceAllString(input, " ")

	return input
}

// Validate ObjectID string
func IsValidObjectID(id string) bool {
	_, err := primitive.ObjectIDFromHex(id)
	return err == nil
}

// Parse pagination parameters
func ParsePaginationParams(c *fiber.Ctx) (int, int, int) {
	page := 1
	limit := 10

	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	skip := (page - 1) * limit
	return page, limit, skip
}

// Validate price format
func IsValidPrice(price string) bool {
	priceRegex := regexp.MustCompile(`^[0-9]+(\.[0-9]{1,2})?$`)
	return priceRegex.MatchString(price) && price != "0" && price != "0.00"
}

// Validate discount format (percentage or amount)
func IsValidDiscount(discount string) bool {
	if discount == "" {
		return true // Optional field
	}

	// Check percentage format (e.g., "10%", "25%")
	percentageRegex := regexp.MustCompile(`^[0-9]{1,2}%$`)
	if percentageRegex.MatchString(discount) {
		return true
	}

	// Check amount format (e.g., "50000", "100000")
	amountRegex := regexp.MustCompile(`^[0-9]+$`)
	return amountRegex.MatchString(discount)
}

// Format time for consistent API responses
func FormatTime(t time.Time) string {
	return t.Format("2006-01-02T15:04:05Z")
}

// Get current timestamp
func Now() time.Time {
	return time.Now().UTC()
}

// Validate order status
func IsValidOrderStatus(status string) bool {
	validStatuses := map[string]bool{
		"pending":   true,
		"confirmed": true,
		"shipped":   true,
		"delivered": true,
		"cancelled": true,
	}
	return validStatuses[status]
}

// Generate pagination response
func PaginationResponse(data interface{}, total int64, page, limit int) fiber.Map {
	totalPages := int((total + int64(limit) - 1) / int64(limit))

	return fiber.Map{
		"data": data,
		"pagination": fiber.Map{
			"current_page": page,
			"per_page":     limit,
			"total":        total,
			"total_pages":  totalPages,
			"has_next":     page < totalPages,
			"has_prev":     page > 1,
		},
	}
}

// Error response helper
func ErrorResponse(message string, code ...int) fiber.Map {
	statusCode := 400
	if len(code) > 0 {
		statusCode = code[0]
	}

	return fiber.Map{
		"error": fiber.Map{
			"message":   message,
			"code":      statusCode,
			"timestamp": Now(),
		},
	}
}

// Success response helper
func SuccessResponse(data interface{}, message ...string) fiber.Map {
	msg := "Operation successful"
	if len(message) > 0 {
		msg = message[0]
	}

	return fiber.Map{
		"success":   true,
		"message":   msg,
		"data":      data,
		"timestamp": Now(),
	}
}

// Validate file extension for uploads
func IsValidImageExtension(filename string) bool {
	validExtensions := map[string]bool{
		".jpg":   true,
		".jpeg":  true,
		".jfif":  true,
		".pjpeg": true,
		".pjp":   true,
		".png":   true,
		".apng":  true,
		".gif":   true,
		".webp":  true,
		".svg":   true,
		".avif":  true,
		".heic":  true,
		".heif":  true,
		".bmp":   true,
		".dib":   true,
		".tif":   true,
		".tiff":  true,
		".ico":   true,
	}

	// Get file extension
	parts := strings.Split(filename, ".")
	if len(parts) < 2 {
		return false
	}

	ext := "." + strings.ToLower(parts[len(parts)-1])
	return validExtensions[ext]
}

// Calculate file size in human readable format
func HumanFileSize(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}

// Generate search filter for MongoDB
func GenerateSearchFilter(searchTerm string, fields []string) bson.M {
	if searchTerm == "" || len(fields) == 0 {
		return bson.M{}
	}

	var orConditions []bson.M
	for _, field := range fields {
		orConditions = append(orConditions, bson.M{
			field: bson.M{
				"$regex":   searchTerm,
				"$options": "i", // case insensitive
			},
		})
	}

	return bson.M{"$or": orConditions}
}

// Validate and parse date range
func ParseDateRange(startDateStr, endDateStr string) (time.Time, time.Time, error) {
	var startDate, endDate time.Time
	var err error

	if startDateStr != "" {
		startDate, err = time.Parse("2006-01-02", startDateStr)
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("invalid start date format, use YYYY-MM-DD")
		}
	}

	if endDateStr != "" {
		endDate, err = time.Parse("2006-01-02", endDateStr)
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("invalid end date format, use YYYY-MM-DD")
		}
		// Add 24 hours to include the entire end date
		endDate = endDate.Add(24 * time.Hour)
	}

	if !startDate.IsZero() && !endDate.IsZero() && startDate.After(endDate) {
		return time.Time{}, time.Time{}, fmt.Errorf("start date cannot be after end date")
	}

	return startDate, endDate, nil
}
