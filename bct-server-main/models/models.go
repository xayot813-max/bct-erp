package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// User model for authentication
type User struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Name      string             `json:"name" bson:"name"`
	Email     string             `json:"email,omitempty" bson:"email,omitempty"`
	Phone     string             `json:"phone" bson:"phone"`
	Password  string             `json:"password" bson:"password"`
	IsActive  bool               `json:"is_active" bson:"is_active"`
	LastLogin *time.Time         `json:"last_login,omitempty" bson:"last_login,omitempty"`
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time          `json:"updated_at" bson:"updated_at"`
}

// Updated login request to use phone instead of email
type UserLoginRequest struct {
	Phone    string `json:"phone"`
	Password string `json:"password"`
}

// Updated register request - phone is required, email is optional
type UserRegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email,omitempty"`
	Phone    string `json:"phone"`
	Password string `json:"password"`
}

type UserAuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

// OrderHistoryProduct documents goods associated with a company/client order.
type OrderHistoryProduct struct {
	ID           string      `json:"id" bson:"id"`
	Name         string      `json:"name" bson:"name"`
	Price        FlexFloat64 `json:"price" bson:"price"`
	Currency     string      `json:"currency,omitempty" bson:"currency,omitempty"`
	Quantity     int         `json:"quantity" bson:"quantity"`
	SerialNumber string      `json:"serial_number" bson:"serial_number"`
	ShtrixNumber string      `json:"shtrix_number,omitempty" bson:"shtrix_number,omitempty"`
	Guarantee    string      `json:"guarantee,omitempty" bson:"guarantee,omitempty"`
	CreatedAt    time.Time   `json:"created_at" bson:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at" bson:"updated_at"`
}

// OrderHistoryEntry captures order-level metadata for companies, clients, and counterparties.
type OrderHistoryEntry struct {
	ID          string                `json:"id" bson:"id"`
	OrderNumber string                `json:"order_number" bson:"order_number"`
	Price       FlexFloat64           `json:"price" bson:"price"`
	Currency    string                `json:"currency,omitempty" bson:"currency,omitempty"`
	Status      string                `json:"status" bson:"status"`
	CreatedAt   time.Time             `json:"created_at" bson:"created_at"`
	UpdatedAt   time.Time             `json:"updated_at" bson:"updated_at"`
	Products    []OrderHistoryProduct `json:"products" bson:"products"`
}

// Company model aligns with CRM requirements.
type Company struct {
	ID           primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	Name         string              `json:"name" bson:"name"`
	OrderCount   int                 `json:"order_count" bson:"order_count"`
	TotalAmount  FlexFloat64         `json:"total_amount" bson:"total_amount"`
	Email        string              `json:"email" bson:"email"`
	Inn          string              `json:"inn" bson:"inn"`
	Address      string              `json:"address" bson:"address"`
	Phone        string              `json:"phone" bson:"phone"`
	Comment      *string             `json:"comment,omitempty" bson:"comment,omitempty"`
	CreatedAt    time.Time           `json:"created_at" bson:"created_at"`
	UpdatedAt    time.Time           `json:"updated_at" bson:"updated_at"`
	OrderHistory []OrderHistoryEntry `json:"order_history" bson:"order_history"`
}

// Client model (CRM-centric)
type Client struct {
	ID           primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	FirstName    string              `json:"first_name" bson:"first_name"`
	LastName     string              `json:"last_name" bson:"last_name"`
	Email        string              `json:"email" bson:"email"`
	Phone        string              `json:"phone" bson:"phone"`
	CompanyPhone string              `json:"company_phone" bson:"company_phone"`
	Company      string              `json:"company" bson:"company"`
	Address      string              `json:"address" bson:"address"`
	Comment      *string             `json:"comment,omitempty" bson:"comment,omitempty"`
	CreatedAt    time.Time           `json:"created_at" bson:"created_at"`
	UpdatedAt    time.Time           `json:"updated_at" bson:"updated_at"`
	OrderHistory []OrderHistoryEntry `json:"order_history" bson:"order_history"`
}

// Counterparty model mirrors the client schema.
type Counterparty struct {
	ID           primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	FirstName    string              `json:"first_name" bson:"first_name"`
	LastName     string              `json:"last_name" bson:"last_name"`
	Email        string              `json:"email" bson:"email"`
	Phone        string              `json:"phone" bson:"phone"`
	CompanyPhone string              `json:"company_phone" bson:"company_phone"`
	Company      string              `json:"company" bson:"company"`
	Address      string              `json:"address" bson:"address"`
	Comment      *string             `json:"comment,omitempty" bson:"comment,omitempty"`
	CreatedAt    time.Time           `json:"created_at" bson:"created_at"`
	UpdatedAt    time.Time           `json:"updated_at" bson:"updated_at"`
	OrderHistory []OrderHistoryEntry `json:"order_history" bson:"order_history"`
}

// TopCategory model (updated)
type TopCategory struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Name      string             `json:"name" bson:"name"`
	Image     string             `json:"image" bson:"image"`
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time          `json:"updated_at" bson:"updated_at"`
}

// Category model (updated with top_category_name)
type Category struct {
	ID              primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	Name            string              `json:"name" bson:"name"`
	Image           string              `json:"image" bson:"image"`
	TopCategoryID   *primitive.ObjectID `json:"top_category_id" bson:"top_category_id"`
	TopCategoryName string              `json:"top_category_name,omitempty" bson:"top_category_name,omitempty"`
	CreatedAt       time.Time           `json:"created_at" bson:"created_at"`
	UpdatedAt       time.Time           `json:"updated_at" bson:"updated_at"`
}

// Product model (updated with minimal required fields)
// Required fields: name, images, description, price, category_id
type Product struct {
	ID               primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	Name             string              `json:"name" bson:"name"`
	AdsTitle         string              `json:"ads_title,omitempty" bson:"ads_title,omitempty"`
	Images           []string            `json:"images" bson:"image"`
	Description      string              `json:"description" bson:"description"`
	Guarantee        string              `json:"guarantee,omitempty" bson:"guarantee,omitempty"`
	SerialNumber     string              `json:"serial_number,omitempty" bson:"serial_number,omitempty"`
	ShtrixNumber     string              `json:"shtrix_number,omitempty" bson:"shtrix_number,omitempty"`
	Price            FlexFloat64         `json:"price" bson:"price"`
	Discount         FlexFloat64         `json:"discount,omitempty" bson:"discount,omitempty"`
	CategoryID       *primitive.ObjectID `json:"category_id" bson:"category_id"`
	TopCategoryID    *primitive.ObjectID `json:"top_category_id,omitempty" bson:"top_category_id,omitempty"`
	CategoryName     *string             `json:"category_name,omitempty" bson:"category_name,omitempty"`
	TopCategoryName  *string             `json:"top_category_name,omitempty" bson:"top_category_name,omitempty"`
	Count            int                 `json:"count,omitempty" bson:"count,omitempty"`
	WarehouseID      string              `json:"warehouse_id,omitempty" bson:"warehouse_id,omitempty"`
	Warehouse        string              `json:"warehouse,omitempty" bson:"warehouse,omitempty"`
	StockByWarehouse map[string]int      `json:"stock_by_warehouse,omitempty" bson:"stock_by_warehouse,omitempty"`
	NDC              FlexFloat64         `json:"NDC,omitempty" bson:"NDC,omitempty"`
	Tax              FlexFloat64         `json:"tax,omitempty" bson:"tax,omitempty"`
	CreatedAt        time.Time           `json:"created_at" bson:"created_at"`
	UpdatedAt        time.Time           `json:"updated_at" bson:"updated_at"`
}

// Warehouse is the ERP warehouse directory used by inventory operations.
type Warehouse struct {
	ID        string    `json:"id" bson:"_id,omitempty"`
	Name      string    `json:"name" bson:"name"`
	Address   string    `json:"address" bson:"address"`
	Comment   string    `json:"comment,omitempty" bson:"comment,omitempty"`
	IsActive  bool      `json:"is_active" bson:"is_active"`
	CreatedAt time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time `json:"updated_at" bson:"updated_at"`
}

// Order model (from schema diagram)
type Order struct {
	ID                primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	Phone             string              `json:"phone" bson:"phone"`
	PayType           string              `json:"pay_type" bson:"pay_type"`
	ProductsWithCount []ProductWithCount  `json:"products" bson:"products"`
	ClientID          *primitive.ObjectID `json:"client_id" bson:"client_id"`
	CreatedAt         time.Time           `json:"created_at" bson:"created_at"`
	UpdatedAt         time.Time           `json:"updated_at" bson:"updated_at"`
}

type ProductWithCount struct {
	ProductID primitive.ObjectID `json:"product_id" bson:"product_id"`
	Count     int                `json:"count" bson:"count"`
}

// ContractProduct details individual goods in a contract agreement.
type ContractProduct struct {
	ProductID    primitive.ObjectID `json:"product_id" bson:"product_id"`
	Price        FlexFloat64        `json:"price" bson:"price"`
	Quantity     int                `json:"quantity" bson:"quantity"`
	Discount     FlexFloat64        `json:"discount" bson:"discount,omitempty"`
	SerialNumber string             `json:"serial_number" bson:"serial_number"`
	ShtrixNumber string             `json:"shtrix_number,omitempty" bson:"shtrix_number,omitempty"`
	Guarantee    string             `json:"guarantee,omitempty" bson:"guarantee,omitempty"`
}

// Contract represents agreements among clients, counterparties, and companies.
type Contract struct {
	ID               primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	ContractNumber   string             `json:"contract_number,omitempty" bson:"contract_number,omitempty"`
	ClientID         primitive.ObjectID `json:"client_id" bson:"client_id"`
	ClientName       *string            `json:"client_name,omitempty" bson:"client_name,omitempty"`
	CounterpartyID   primitive.ObjectID `json:"counterparty_id" bson:"counterparty_id"`
	CounterpartyName *string            `json:"counterparty_name,omitempty" bson:"counterparty_name,omitempty"`
	CompanyID        primitive.ObjectID `json:"company_id" bson:"company_id"`
	CompanyName      *string            `json:"company_name,omitempty" bson:"company_name,omitempty"`
	FunnelID         primitive.ObjectID `json:"funnel_id" bson:"funnel_id"`
	Guarantee        string             `json:"guarantee" bson:"guarantee"`
	Comment          string             `json:"comment" bson:"comment"`
	DealDate         time.Time          `json:"deal_date" bson:"deal_date"`
	ContractAmount   FlexFloat64        `json:"contract_amount" bson:"contract_amount"`
	ContractCurrency string             `json:"contract_currency" bson:"contract_currency"`
	PayCard          FlexFloat64        `json:"pay_card" bson:"pay_card"`
	PayCash          FlexFloat64        `json:"pay_cash" bson:"pay_cash"`
	Documents        []string           `json:"documents" bson:"documents"`
	CreatedAt        time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt        time.Time          `json:"updated_at" bson:"updated_at"`
	Products         []ContractProduct  `json:"products" bson:"products"`
}

// About model (from schema diagram)
type About struct {
	ID           primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Creation     string             `json:"creation" bson:"creation"`
	Clients      string             `json:"clients" bson:"clients"`
	Partners     string             `json:"partners" bson:"partners"`
	Technologies string             `json:"technologies" bson:"technologies"`
	Scaners      string             `json:"scaners" bson:"scaners"`
	Scales       string             `json:"scales" bson:"scales"`
	Printers     string             `json:"printers" bson:"printers"`
	Cashiers     string             `json:"cashiers" bson:"cashiers"`
	CreatedAt    time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt    time.Time          `json:"updated_at" bson:"updated_at"`
}

// Vendor model (from schema diagram)
type Vendor struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Image     string             `json:"image" bson:"image"`
	URL       string             `json:"url" bson:"url"`
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time          `json:"updated_at" bson:"updated_at"`
}

// Project model (from schema diagram)
type Project struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Image     string             `json:"image" bson:"image"`
	URL       string             `json:"url" bson:"url"`
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time          `json:"updated_at" bson:"updated_at"`
}

// Links model (from schema diagram)
type Links struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Facebook  string             `json:"facebook" bson:"facebook"`
	Instagram string             `json:"instagram" bson:"instagram"`
	LinkedIn  string             `json:"linkedin" bson:"linkedin"`
	YouTube   string             `json:"youtube" bson:"youtube"`
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time          `json:"updated_at" bson:"updated_at"`
}

// Existing models from your code (keeping as they are)

// Reviews model
type Reviews struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Name      string             `json:"name" bson:"name"`
	Phone     string             `json:"phone" bson:"phone"`
	Email     string             `json:"email" bson:"email"`
	Message   string             `json:"message" bson:"message"`
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
}

// Sertificate model
type Sertificate struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Name      string             `json:"name" bson:"name"`
	Image     string             `json:"image" bson:"image"`
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time          `json:"updated_at" bson:"updated_at"`
}

// License model
type License struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Name      string             `json:"name" bson:"name"`
	Image     string             `json:"image" bson:"image"`
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time          `json:"updated_at" bson:"updated_at"`
}

// News model
type News struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Name      string             `json:"name" bson:"name"`
	Image     string             `json:"image" bson:"image"`
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time          `json:"updated_at" bson:"updated_at"`
}

// Partner model
type Partner struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Name      string             `json:"name" bson:"name"`
	Image     string             `json:"image" bson:"image"`
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time          `json:"updated_at" bson:"updated_at"`
}

// Admin model
type Admin struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Name        string             `json:"name" bson:"name"`
	Role        string             `json:"role" bson:"role"`
	Permissions []string           `json:"permissions" bson:"permissions"`
	Password    string             `json:"password" bson:"password"`
	CreatedAt   time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at" bson:"updated_at"`
}

// Currency model
type Currency struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Sum       string             `json:"sum" bson:"sum"`
	CreatedAt time.Time          `json:"created_at" bsom:"created_at"`
	UpdatedAt time.Time          `json:"updated_at" bson:"updated_at"`
}

// Banner model
type Banner struct {
	ID            primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	Image         string              `json:"image" bson:"image"`
	Title         string              `json:"title" bson:"title"`
	Description   string              `json:"description" bson:"description"`
	TopCategoryID *primitive.ObjectID `json:"top_category_id" bson:"top_category_id"`
	CategoryID    *primitive.ObjectID `json:"category_id" bson:"category_id"`
	ProductID     *primitive.ObjectID `json:"product_id" bson:"product_id"`
	CreatedAt     time.Time           `json:"created_at" bson:"created_at"`
	UpdatedAt     time.Time           `json:"updated_at" bson:"updated_at"`
}

// SelectReview model
type SelectReview struct {
	ID        primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	ReviewID  *primitive.ObjectID `json:"review_id" bson:"review_id"`
	Name      string              `json:"name" bson:"name"`
	Phone     string              `json:"phone" bson:"phone"`
	Email     string              `json:"email" bson:"email"`
	Message   string              `json:"message" bson:"message"`
	CreatedAt time.Time           `json:"created_at" bson:"created_at"`
}

// Background model
type Background struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Name      string             `json:"name" bson:"name"`
	Image     string             `json:"image" bson:"image"`
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time          `json:"updated_at" bson:"updated_at"`
}

// Contacts model
type Contacts struct {
	ID             primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	CompanyName    string             `json:"company_name" bson:"company_name"`
	Phone1         string             `json:"phone1" bson:"phone1"`
	Phone2         string             `json:"phone2" bson:"phone2"`
	WorkHours      string             `json:"work_hours" bson:"work_hours"`
	Email          string             `json:"email" bson:"email"`
	Address        string             `json:"address" bson:"address"`
	Telegram       string             `json:"telegram" bson:"telegram"`
	TelegramBot    string             `json:"telegram_bot" bson:"telegram_bot"`
	Facebook       string             `json:"facebook" bson:"facebook"`
	Instagram      string             `json:"instagram" bson:"instagram"`
	Youtube        string             `json:"youtube" bson:"youtube"`
	FooterInfo     string             `json:"footer_info" bson:"footer_info"`
	ExperienceInfo string             `json:"experience_info" bson:"experience_info"`
	CreatedAt      time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt      time.Time          `json:"updated_at" bson:"updated_at"`
}

// BannerSort model
type BannerSort struct {
	ID            primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	UniqueID      *int                `json:"unique_id" bson:"unique_id"`
	BannerID      *primitive.ObjectID `json:"banner_id" bson:"banner_id"`
	Image         string              `json:"image" bson:"image"`
	TopCategoryID *primitive.ObjectID `json:"top_category_id" bson:"top_category_id"`
	CategoryID    *primitive.ObjectID `json:"category_id" bson:"category_id"`
	ProductID     *primitive.ObjectID `json:"product_id" bson:"product_id"`
	CreatedAt     time.Time           `json:"created_at" bson:"created_at"`
	UpdatedAt     time.Time           `json:"updated_at" bson:"updated_at"`
}

// TopCategorySort model
type TopCategorySort struct {
	ID            primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	Name          string              `json:"name" bson:"name"`
	TopCategoryID *primitive.ObjectID `json:"top_category_id" bson:"top_category_id"`
	UniqueID      *int                `json:"unique_id" bson:"unique_id"`
	CreatedAt     time.Time           `json:"created_at" bson:"created_at"`
	UpdatedAt     time.Time           `json:"updated_at" bson:"updated_at"`
}

// CategorySort model
type CategorySort struct {
	ID                primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UniqueID          int                `json:"unique_id" bson:"unique_id"`
	CategoryID        primitive.ObjectID `json:"category_id" bson:"category_id"`
	TopCategorySortID int                `json:"top_category_sort_id" bson:"top_category_sort_id"`
	Name              string             `json:"name" bson:"name"`
	CreatedAt         time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt         time.Time          `json:"updated_at" bson:"updated_at"`
}

// File upload response
type FileUploadResponse struct {
	URL      string `json:"url"`
	Filename string `json:"filename"`
	Size     int64  `json:"size"`
}

// Discount model (singleton)
type Discount struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Title     string             `json:"title" bson:"title"`
	ProductID string             `json:"product_id" bson:"product_id"`
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time          `json:"updated_at" bson:"updated_at"`
}

// Vendors_about model
type Vendors_about struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Name        string             `json:"name" bson:"name"`
	Description string             `json:"description" bson:"description"`
	Image       string             `json:"image" bson:"image"`
	CreatedAt   time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at" bson:"updated_at"`
}

// Official_partner model (singleton)
type Official_partner struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Name        string             `json:"name" bson:"name"`
	Image       string             `json:"image" bson:"image"`
	Description string             `json:"description" bson:"description"`
	CreatedAt   time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at" bson:"updated_at"`
}

// Experiments model
type Experiments struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Count       string             `json:"count" bson:"count"`
	Title       string             `json:"title" bson:"title"`
	Description string             `json:"description" bson:"description"`
	CreatedAt   time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at" bson:"updated_at"`
}

// Company_stats model
type Company_stats struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Count       string             `json:"count" bson:"count"`
	Title       string             `json:"title" bson:"title"`
	Description string             `json:"description" bson:"description"`
	Image       string             `json:"image" bson:"image"`
	CreatedAt   time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at" bson:"updated_at"`
}

// Funnel represents CRM funnel stages.
type Funnel struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Name      string             `json:"name" bson:"name"`
	Color     string             `json:"color" bson:"color"`
	Comment   string             `json:"comment" bson:"comment"`
	Order     int                `json:"order" bson:"order"`
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time          `json:"updated_at" bson:"updated_at"`
}
