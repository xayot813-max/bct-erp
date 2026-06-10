package routes

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"fiber-ecommerce/models"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/mongo"
)

const (
	MaxFileSize = 50 * 1024 * 1024 // 50MB in bytes
)

var allowedImageExtensions = map[string]bool{
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
	".pdf":   true,
	".doc":   true,
	".docx":  true,
	".xls":   true,
	".xlsx":  true,
	".txt":   true,
}

var allowedImageExtensionList = []string{
	".jpg", ".jpeg", ".jfif", ".pjpeg", ".pjp",
	".png", ".apng", ".gif", ".webp", ".svg", ".avif",
	".heic", ".heif", ".bmp", ".dib", ".tif", ".tiff", ".ico",
	".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt",
}

func FileRoutes(app fiber.Router, db *mongo.Client) {
	files := app.Group("/files")

	// Upload single file
	files.Post("/upload", func(c *fiber.Ctx) error {
		// Check content length first
		if c.Request().Header.ContentLength() > MaxFileSize {
			return c.Status(413).JSON(fiber.Map{
				"error":            fmt.Sprintf("File too large. Maximum size allowed is %d MB", MaxFileSize/(1024*1024)),
				"max_size_mb":      MaxFileSize / (1024 * 1024),
				"received_size_mb": c.Request().Header.ContentLength() / (1024 * 1024),
			})
		}

		file, err := c.FormFile("file")
		if err != nil {
			// Provide more specific error messages
			if strings.Contains(err.Error(), "request body too large") || strings.Contains(err.Error(), "too large") {
				return c.Status(413).JSON(fiber.Map{
					"error":       fmt.Sprintf("File too large. Maximum size allowed is %d MB", MaxFileSize/(1024*1024)),
					"max_size_mb": MaxFileSize / (1024 * 1024),
				})
			}
			return c.Status(400).JSON(fiber.Map{
				"error":   "Failed to parse uploaded file",
				"details": err.Error(),
			})
		}

		// Additional file size check
		if file.Size > MaxFileSize {
			return c.Status(413).JSON(fiber.Map{
				"error":        fmt.Sprintf("File too large. Maximum size allowed is %d MB", MaxFileSize/(1024*1024)),
				"max_size_mb":  MaxFileSize / (1024 * 1024),
				"file_size_mb": file.Size / (1024 * 1024),
			})
		}

		ext := strings.ToLower(filepath.Ext(file.Filename))
		if !allowedImageExtensions[ext] {
			return c.Status(400).JSON(fiber.Map{
				"error":         "Invalid file type",
				"allowed_types": allowedImageExtensionList,
				"received_type": ext,
			})
		}

		// Generate unique filename
		filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
		uploadPath := filepath.Join("uploads", filename)

		// Create uploads directory if it doesn't exist
		if err := os.MkdirAll("uploads", 0755); err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error":   "Failed to create upload directory",
				"details": err.Error(),
			})
		}

		// Save file
		if err := c.SaveFile(file, uploadPath); err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error":   "Failed to save file",
				"details": err.Error(),
			})
		}

		// Return file URL
		fileURL := fmt.Sprintf("/uploads/%s", filename)

		return c.JSON(models.FileUploadResponse{
			URL:      fileURL,
			Filename: filename,
			Size:     file.Size,
		})
	})

	// Upload multiple files
	files.Post("/upload-multiple", func(c *fiber.Ctx) error {
		// Check content length first
		if c.Request().Header.ContentLength() > MaxFileSize {
			return c.Status(413).JSON(fiber.Map{
				"error":            fmt.Sprintf("Total upload size too large. Maximum size allowed is %d MB", MaxFileSize/(1024*1024)),
				"max_size_mb":      MaxFileSize / (1024 * 1024),
				"received_size_mb": c.Request().Header.ContentLength() / (1024 * 1024),
			})
		}

		form, err := c.MultipartForm()
		if err != nil {
			// Provide more specific error messages
			if strings.Contains(err.Error(), "request body too large") || strings.Contains(err.Error(), "too large") {
				return c.Status(413).JSON(fiber.Map{
					"error":       fmt.Sprintf("Upload too large. Maximum total size allowed is %d MB", MaxFileSize/(1024*1024)),
					"max_size_mb": MaxFileSize / (1024 * 1024),
				})
			}
			return c.Status(400).JSON(fiber.Map{
				"error":   "Failed to parse multipart form",
				"details": err.Error(),
			})
		}

		files := form.File["files"]
		if len(files) == 0 {
			return c.Status(400).JSON(fiber.Map{
				"error": "No files uploaded",
				"hint":  "Make sure to use 'files' as the form field name for multiple file uploads",
			})
		}

		var uploadedFiles []models.FileUploadResponse
		var failedFiles []fiber.Map
		var totalSize int64 = 0

		// Calculate total size first
		for _, file := range files {
			totalSize += file.Size
		}

		if totalSize > MaxFileSize {
			return c.Status(413).JSON(fiber.Map{
				"error":         fmt.Sprintf("Total upload size too large. Maximum size allowed is %d MB", MaxFileSize/(1024*1024)),
				"max_size_mb":   MaxFileSize / (1024 * 1024),
				"total_size_mb": totalSize / (1024 * 1024),
			})
		}

		// Create uploads directory if it doesn't exist
		if err := os.MkdirAll("uploads", 0755); err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error":   "Failed to create upload directory",
				"details": err.Error(),
			})
		}

		for i, file := range files {
			// Individual file size check
			if file.Size > MaxFileSize {
				failedFiles = append(failedFiles, fiber.Map{
					"filename": file.Filename,
					"error": fmt.Sprintf("File too large (%d MB). Maximum size per file is %d MB",
						file.Size/(1024*1024), MaxFileSize/(1024*1024)),
					"index": i,
				})
				continue
			}

			// Validate file type
			ext := strings.ToLower(filepath.Ext(file.Filename))
			if !allowedImageExtensions[ext] {
				failedFiles = append(failedFiles, fiber.Map{
					"filename": file.Filename,
					"error":    "Invalid file type: " + ext,
					"index":    i,
				})
				continue
			}

			// Generate unique filename
			filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
			uploadPath := filepath.Join("uploads", filename)

			// Save file
			if err := c.SaveFile(file, uploadPath); err != nil {
				failedFiles = append(failedFiles, fiber.Map{
					"filename": file.Filename,
					"error":    "Failed to save file: " + err.Error(),
					"index":    i,
				})
				continue
			}

			// Add to uploaded files list
			fileURL := fmt.Sprintf("/uploads/%s", filename)
			uploadedFiles = append(uploadedFiles, models.FileUploadResponse{
				URL:      fileURL,
				Filename: filename,
				Size:     file.Size,
			})
		}

		if len(uploadedFiles) == 0 {
			return c.Status(400).JSON(fiber.Map{
				"error":         "No valid files were uploaded",
				"failed_files":  failedFiles,
				"allowed_types": allowedImageExtensionList,
				"max_size_mb":   MaxFileSize / (1024 * 1024),
			})
		}

		response := fiber.Map{
			"files":           uploadedFiles,
			"count":           len(uploadedFiles),
			"success_count":   len(uploadedFiles),
			"total_attempted": len(files),
		}

		if len(failedFiles) > 0 {
			response["failed_files"] = failedFiles
			response["failed_count"] = len(failedFiles)
		}

		return c.JSON(response)
	})

	// Get upload limits info
	files.Get("/limits", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"max_file_size_bytes": MaxFileSize,
			"max_file_size_mb":    MaxFileSize / (1024 * 1024),
			"allowed_types":       allowedImageExtensionList,
			"upload_directory":    "uploads/",
		})
	})
}
