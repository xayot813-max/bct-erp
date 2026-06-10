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
