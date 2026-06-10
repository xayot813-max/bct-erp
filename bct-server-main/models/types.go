package models

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"

	"go.mongodb.org/mongo-driver/bson/bsontype"
	"go.mongodb.org/mongo-driver/x/bsonx/bsoncore"
)

// FlexFloat64 is a helper type that tolerates numeric values stored as strings
// in MongoDB while ensuring JSON represents them as numbers. It round-trips
// floats, integers, and decimal128 values without data loss.
type FlexFloat64 struct {
	Value *float64
}

// NewFlexFloat64 returns a FlexFloat64 with the provided value.
func NewFlexFloat64(v float64) FlexFloat64 {
	return FlexFloat64{Value: &v}
}

// Set updates the value reference.
func (f *FlexFloat64) Set(v float64) {
	if f == nil {
		return
	}
	f.Value = &v
}

// Clear removes the stored value making it a JSON/BSON null.
func (f *FlexFloat64) Clear() {
	if f == nil {
		return
	}
	f.Value = nil
}

// Float64 returns the dereferenced value or zero when nil.
func (f FlexFloat64) Float64() float64 {
	if f.Value == nil {
		return 0
	}
	return *f.Value
}

// Valid reports whether the value is non-nil.
func (f FlexFloat64) Valid() bool {
	return f.Value != nil
}

// MarshalJSON emits numbers when set, null otherwise.
func (f FlexFloat64) MarshalJSON() ([]byte, error) {
	if f.Value == nil {
		return []byte("null"), nil
	}
	return json.Marshal(*f.Value)
}

// UnmarshalJSON accepts numeric literals and nulls.
func (f *FlexFloat64) UnmarshalJSON(data []byte) error {
	data = bytes.TrimSpace(data)
	if bytes.Equal(data, []byte("null")) {
		f.Value = nil
		return nil
	}

	var v float64
	if err := json.Unmarshal(data, &v); err != nil {
		return err
	}
	f.Value = &v
	return nil
}

// MarshalBSONValue ensures numbers are stored consistently even when the
// incoming payload used a string representation.
func (f FlexFloat64) MarshalBSONValue() (bsontype.Type, []byte, error) {
	if f.Value == nil {
		return bsontype.Null, nil, nil
	}
	return bsontype.Double, bsoncore.AppendDouble(nil, *f.Value), nil
}

// UnmarshalBSONValue gracefully handles string, integer, decimal, and double
// MongoDB representations.
func (f *FlexFloat64) UnmarshalBSONValue(t bsontype.Type, data []byte) error {
	switch t {
	case bsontype.Null:
		f.Value = nil
		return nil
	case bsontype.Double:
		v, _, ok := bsoncore.ReadDouble(data)
		if !ok {
			return errors.New("failed to decode double value")
		}
		f.Value = &v
		return nil
	case bsontype.Int32:
		v, _, ok := bsoncore.ReadInt32(data)
		if !ok {
			return errors.New("failed to decode int32 value")
		}
		f.Set(float64(v))
		return nil
	case bsontype.Int64:
		v, _, ok := bsoncore.ReadInt64(data)
		if !ok {
			return errors.New("failed to decode int64 value")
		}
		f.Set(float64(v))
		return nil
	case bsontype.Decimal128:
		dec, _, ok := bsoncore.ReadDecimal128(data)
		if !ok {
			return errors.New("failed to decode decimal128 value")
		}
		str := dec.String()
		if str == "" {
			f.Value = nil
			return nil
		}
		v, err := strconv.ParseFloat(str, 64)
		if err != nil {
			return fmt.Errorf("cannot convert decimal128 %q to float64: %w", str, err)
		}
		f.Set(v)
		return nil
	case bsontype.String:
		str, _, ok := bsoncore.ReadString(data)
		if !ok {
			return errors.New("failed to decode string value")
		}
		if str == "" {
			f.Value = nil
			return nil
		}
		v, err := strconv.ParseFloat(str, 64)
		if err != nil {
			return fmt.Errorf("cannot convert string %q to float64: %w", str, err)
		}
		f.Set(v)
		return nil
	default:
		return fmt.Errorf("unsupported BSON type %s for FlexFloat64", t)
	}
}
