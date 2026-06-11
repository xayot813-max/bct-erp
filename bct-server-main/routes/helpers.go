package routes

import (
	"strconv"
	"strings"
)

func toFloat64(value interface{}) (float64, bool) {
	switch v := value.(type) {
	case float64:
		return v, true
	case float32:
		return float64(v), true
	case int:
		return float64(v), true
	case int32:
		return float64(v), true
	case int64:
		return float64(v), true
	case string:
		if strings.TrimSpace(v) == "" {
			return 0, false
		}
		num, err := strconv.ParseFloat(v, 64)
		if err != nil {
			return 0, false
		}
		return num, true
	default:
		return 0, false
	}
}

func toInt(value interface{}) (int, bool) {
	switch v := value.(type) {
	case int:
		return v, true
	case int32:
		return int(v), true
	case int64:
		return int(v), true
	case float64:
		return int(v), true
	case float32:
		return int(v), true
	case string:
		if strings.TrimSpace(v) == "" {
			return 0, false
		}
		num, err := strconv.Atoi(v)
		if err != nil {
			return 0, false
		}
		return num, true
	default:
		return 0, false
	}
}

func normalizeCurrency(value string) (string, bool) {
	if value == "" {
		return "", false
	}
	switch strings.ToUpper(value) {
	case "UZS", "USD", "EUR":
		return strings.ToUpper(value), true
	default:
		return "", false
	}
}

var allAdminPermissions = []string{
	"dashboard",
	"clients",
	"products",
	"warehouse",
	"deals",
	"finance",
	"settings",
	"access",
}

func defaultPermissionsForRole(role string) []string {
	switch normalizeAdminRole(role) {
	case "admin":
		return append([]string{}, allAdminPermissions...)
	case "warehouse":
		return []string{"dashboard", "warehouse", "products"}
	case "finance":
		return []string{"dashboard", "finance", "deals"}
	case "viewer":
		return []string{"dashboard"}
	default:
		return []string{"dashboard", "clients", "products", "deals"}
	}
}

func normalizeAdminPermissions(role string, permissions []string) []string {
	if normalizeAdminRole(role) == "admin" {
		return append([]string{}, allAdminPermissions...)
	}
	allowed := map[string]struct{}{}
	for _, permission := range allAdminPermissions {
		allowed[permission] = struct{}{}
	}
	seen := map[string]struct{}{}
	result := []string{}
	for _, permission := range permissions {
		permission = strings.TrimSpace(strings.ToLower(permission))
		if _, ok := allowed[permission]; !ok {
			continue
		}
		if _, exists := seen[permission]; exists {
			continue
		}
		seen[permission] = struct{}{}
		result = append(result, permission)
	}
	if len(result) == 0 {
		return defaultPermissionsForRole(role)
	}
	return result
}

func normalizePermissionsFromInput(role string, value interface{}) []string {
	items := []string{}
	switch typed := value.(type) {
	case []string:
		items = typed
	case []interface{}:
		for _, item := range typed {
			if text, ok := item.(string); ok {
				items = append(items, text)
			}
		}
	}
	return normalizeAdminPermissions(role, items)
}
