// MongoDB initialization script
db = db.getSiblingDB('ecommerce');

const seedKey = "bct-demo";
const now = new Date();
const topCategoryId = ObjectId();
const categoryId = ObjectId();
const productId = ObjectId();
const scannerCategoryId = ObjectId();
const printerCategoryId = ObjectId();
const productId2 = ObjectId();
const productId3 = ObjectId();
const productId4 = ObjectId();
const productId5 = ObjectId();
const reviewId = ObjectId();

// Create collections for existing models
db.createCollection('users');
db.createCollection('reviews');
db.createCollection('topcategories');
db.createCollection('categories');
db.createCollection('products');
db.createCollection('warehouses');
db.createCollection('sertificates');
db.createCollection('licenses');
db.createCollection('news');
db.createCollection('partners');
db.createCollection('admins');
db.createCollection('currencies');
db.createCollection('banners');
db.createCollection('select_reviews');
db.createCollection('backgrounds');
db.createCollection('contacts');
db.createCollection('banner_sorts');
db.createCollection('top_category_sorts');
db.createCollection('category_sorts');

// Create collections for new models from schema diagram
db.createCollection('clients');
db.createCollection('orders');
db.createCollection('about');
db.createCollection('vendors');
db.createCollection('projects');
db.createCollection('links');

// Create indexes for better performance

// User indexes
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "phone": 1 }, { unique: true });

// Client indexes
db.clients.createIndex({ "email": 1 });
db.clients.createIndex({ "phone": 1 });

// Product search indexes
db.products.createIndex({ "name": "text", "description": "text", "ads_title": "text" });
db.warehouses.createIndex({ "name": 1 });

// Relationship indexes
db.categories.createIndex({ "top_category_id": 1 });
db.products.createIndex({ "category_id": 1 });
db.orders.createIndex({ "client_id": 1 });
db.orders.createIndex({ "created_at": -1 });

// Banner indexes
db.banners.createIndex({ "top_category_id": 1 });
db.banners.createIndex({ "category_id": 1 });
db.banners.createIndex({ "product_id": 1 });
db.banners.createIndex({ "title": "text", "description": "text" });

// Sort indexes
db.banner_sorts.createIndex({ "unique_id": 1 });
db.banner_sorts.createIndex({ "banner_id": 1 });
db.top_category_sorts.createIndex({ "unique_id": 1 });
db.top_category_sorts.createIndex({ "top_category_id": 1 });
db.category_sorts.createIndex({ "unique_id": 1 });
db.category_sorts.createIndex({ "category_id": 1 });
db.category_sorts.createIndex({ "top_category_sort_id": 1 });

// Review indexes
db.select_reviews.createIndex({ "review_id": 1 });

// Time-based indexes
db.reviews.createIndex({ "created_at": -1 });
db.news.createIndex({ "created_at": -1 });
db.partners.createIndex({ "created_at": -1 });

// Clear existing admin and create the single default admin
db.admins.deleteMany({});

// Create the single admin user
// Username: "admin", Password: "123"
// This hash is generated with bcrypt cost 10 for password "123"
db.admins.insertOne({
    name: "admin",
    role: "admin",
    password: "$2a$10$HLjC0Amd/oTcHvQdhwzyguApEnT2n9XThdJXW.Ib1cBZveRAUe6T2", // bcrypt hash for "123"
    seed_key: seedKey,
    created_at: new Date(),
    updated_at: new Date()
});

// Demo seed data for local testing
db.topcategories.deleteMany({ seed_key: seedKey });
db.categories.deleteMany({ seed_key: seedKey });
db.products.deleteMany({ seed_key: seedKey });
db.warehouses.deleteMany({ seed_key: seedKey });
db.reviews.deleteMany({ seed_key: seedKey });
db.select_reviews.deleteMany({ seed_key: seedKey });
db.partners.deleteMany({ seed_key: seedKey });
db.news.deleteMany({ seed_key: seedKey });
db.licenses.deleteMany({ seed_key: seedKey });
db.sertificates.deleteMany({ seed_key: seedKey });
db.backgrounds.deleteMany({ seed_key: seedKey });
db.banners.deleteMany({ seed_key: seedKey });
db.contacts.deleteMany({ seed_key: seedKey });
db.links.deleteMany({ seed_key: seedKey });
db.about.deleteMany({ seed_key: seedKey });
db.vendors.deleteMany({ seed_key: seedKey });
db.projects.deleteMany({ seed_key: seedKey });
db.clients.deleteMany({ seed_key: seedKey });
db.counterparties.deleteMany({ seed_key: seedKey });
db.companies.deleteMany({ seed_key: seedKey });
db.orders.deleteMany({ seed_key: seedKey });
db.currencies.deleteMany({ seed_key: seedKey });

db.topcategories.insertOne({
    _id: topCategoryId,
    name: "Equipment",
    image: "/uploads/demo/top-category-equipment.webp",
    seed_key: seedKey,
    created_at: now,
    updated_at: now
});

db.categories.insertOne({
    _id: categoryId,
    name: "POS Systems",
    image: "/uploads/demo/category-pos.webp",
    top_category_id: topCategoryId,
    top_category_name: "Equipment",
    seed_key: seedKey,
    created_at: now,
    updated_at: now
});

db.categories.insertMany([
    {
        _id: scannerCategoryId,
        name: "Barcode Scanners",
        image: "/uploads/demo/category-scanners.webp",
        top_category_id: topCategoryId,
        top_category_name: "Equipment",
        seed_key: seedKey,
        created_at: now,
        updated_at: now
    },
    {
        _id: printerCategoryId,
        name: "Label Printers",
        image: "/uploads/demo/category-printers.webp",
        top_category_id: topCategoryId,
        top_category_name: "Equipment",
        seed_key: seedKey,
        created_at: now,
        updated_at: now
    }
]);

db.warehouses.insertMany([
    {
        _id: "warehouse-1",
        name: "Склад 1",
        address: "Ташкент, основной склад",
        comment: "Основной склад для прихода и продаж",
        is_active: true,
        seed_key: seedKey,
        created_at: now,
        updated_at: now
    },
    {
        _id: "warehouse-2",
        name: "Склад 2",
        address: "Ташкент, резервный склад",
        comment: "Резервная зона хранения",
        is_active: true,
        seed_key: seedKey,
        created_at: now,
        updated_at: now
    },
    {
        _id: "warehouse-3",
        name: "Склад 3",
        address: "Самарканд, филиал",
        comment: "Региональный склад",
        is_active: true,
        seed_key: seedKey,
        created_at: now,
        updated_at: now
    },
    {
        _id: "warehouse-4",
        name: "Склад 4",
        address: "Андижан, филиал",
        comment: "Региональный склад",
        is_active: true,
        seed_key: seedKey,
        created_at: now,
        updated_at: now
    },
    {
        _id: "warehouse-5",
        name: "Склад 5",
        address: "Бухара, филиал",
        comment: "Склад для перемещений",
        is_active: true,
        seed_key: seedKey,
        created_at: now,
        updated_at: now
    }
]);

db.products.insertMany([
    {
        _id: productId,
        name: "BCT Smart Terminal",
        ads_title: "Fast checkout for retail and wholesale",
        image: [
            "/uploads/demo/product-terminal-1.webp",
            "/uploads/demo/product-terminal-2.webp"
        ],
        description: "A demo product for testing catalog, pricing, and image rendering in the frontend.",
        guarantee: "12 months",
        serial_number: "BCT-TERM-001",
        shtrix_number: "9988776655443",
        price: 2499000,
        discount: 199000,
        category_id: categoryId,
        top_category_id: topCategoryId,
        category_name: "POS Systems",
        top_category_name: "Equipment",
        count: 7,
        warehouse_id: "warehouse-1",
        warehouse: "Склад 1",
        stock_by_warehouse: { "warehouse-1": 7 },
        NDC: 0,
        tax: 12,
        seed_key: seedKey,
        created_at: now,
        updated_at: now
    },
    {
        _id: productId2,
        name: "Honeywell Voyager 1470g",
        ads_title: "Reliable barcode scanner",
        image: ["/uploads/demo/product-scanner.webp"],
        description: "Handheld scanner for daily retail and warehouse operations.",
        guarantee: "12 months",
        serial_number: "BCT-SCN-1470",
        shtrix_number: "4607001122334",
        price: 890000,
        discount: 0,
        category_id: scannerCategoryId,
        top_category_id: topCategoryId,
        category_name: "Barcode Scanners",
        top_category_name: "Equipment",
        count: 22,
        warehouse_id: "warehouse-2",
        warehouse: "Склад 2",
        stock_by_warehouse: { "warehouse-2": 22 },
        NDC: 0,
        tax: 12,
        seed_key: seedKey,
        created_at: now,
        updated_at: now
    },
    {
        _id: productId3,
        name: "Zebra ZD220 Label Printer",
        ads_title: "Compact label printing",
        image: ["/uploads/demo/product-printer.webp"],
        description: "Thermal label printer for barcode labels and shelf tags.",
        guarantee: "12 months",
        serial_number: "BCT-PRN-220",
        shtrix_number: "4607004455667",
        price: 1780000,
        discount: 120000,
        category_id: printerCategoryId,
        top_category_id: topCategoryId,
        category_name: "Label Printers",
        top_category_name: "Equipment",
        count: 4,
        warehouse_id: "warehouse-3",
        warehouse: "Склад 3",
        stock_by_warehouse: { "warehouse-3": 4 },
        NDC: 0,
        tax: 12,
        seed_key: seedKey,
        created_at: now,
        updated_at: now
    },
    {
        _id: productId4,
        name: "Cash Drawer CD-410",
        ads_title: "Secure cashier drawer",
        image: ["/uploads/demo/product-cash-drawer.webp"],
        description: "Metal cash drawer for POS checkout desks.",
        guarantee: "6 months",
        serial_number: "BCT-CD-410",
        shtrix_number: "4607007788991",
        price: 620000,
        discount: 0,
        category_id: categoryId,
        top_category_id: topCategoryId,
        category_name: "POS Systems",
        top_category_name: "Equipment",
        count: 0,
        warehouse_id: "warehouse-1",
        warehouse: "Склад 1",
        stock_by_warehouse: {},
        NDC: 0,
        tax: 12,
        seed_key: seedKey,
        created_at: now,
        updated_at: now
    },
    {
        _id: productId5,
        name: "Receipt Printer RP-80",
        ads_title: "Fast receipt printing",
        image: ["/uploads/demo/product-receipt-printer.webp"],
        description: "80mm receipt printer for busy checkout lines.",
        guarantee: "12 months",
        serial_number: "BCT-RP-80",
        shtrix_number: "4607009988776",
        price: 940000,
        discount: 50000,
        category_id: printerCategoryId,
        top_category_id: topCategoryId,
        category_name: "Label Printers",
        top_category_name: "Equipment",
        count: 13,
        warehouse_id: "warehouse-4",
        warehouse: "Склад 4",
        stock_by_warehouse: { "warehouse-4": 13 },
        NDC: 0,
        tax: 12,
        seed_key: seedKey,
        created_at: now,
        updated_at: now
    }
]);

db.reviews.insertOne({
    _id: reviewId,
    name: "Azizbek",
    phone: "+998901112233",
    email: "azizbek@example.com",
    message: "Great demo project for testing the dashboard and API.",
    seed_key: seedKey,
    created_at: now
});

db.select_reviews.insertOne({
    review_id: reviewId,
    name: "Azizbek",
    phone: "+998901112233",
    email: "azizbek@example.com",
    message: "Great demo project for testing the dashboard and API.",
    seed_key: seedKey,
    created_at: now
});

db.partners.insertOne({
    name: "BCT Partner",
    image: "/uploads/demo/partner.webp",
    seed_key: seedKey,
    created_at: now,
    updated_at: now
});

db.news.insertOne({
    name: "BCT platform demo is ready",
    image: "/uploads/demo/news.webp",
    seed_key: seedKey,
    created_at: now,
    updated_at: now
});

db.licenses.insertOne({
    name: "Official Trade License",
    image: "/uploads/demo/license.webp",
    seed_key: seedKey,
    created_at: now,
    updated_at: now
});

db.sertificates.insertOne({
    name: "Quality Certificate",
    image: "/uploads/demo/certificate.webp",
    seed_key: seedKey,
    created_at: now,
    updated_at: now
});

db.backgrounds.insertOne({
    name: "Dashboard Background",
    image: "/uploads/demo/background.webp",
    seed_key: seedKey,
    created_at: now,
    updated_at: now
});

db.banners.insertOne({
    image: "/uploads/demo/banner.webp",
    title: "Launch your ERP faster",
    description: "Demo banner for the frontend homepage.",
    top_category_id: topCategoryId,
    category_id: categoryId,
    product_id: productId,
    seed_key: seedKey,
    created_at: now,
    updated_at: now
});

db.contacts.insertOne({
    company_name: "BCT Demo LLC",
    phone1: "+998712223344",
    phone2: "+998712223355",
    work_hours: "Mon-Fri 09:00-18:00",
    email: "info@bct-demo.uz",
    address: "Tashkent, Uzbekistan",
    telegram: "@bct_demo",
    telegram_bot: "@bct_demo_bot",
    facebook: "https://facebook.com/bctdemo",
    instagram: "https://instagram.com/bctdemo",
    youtube: "https://youtube.com/@bctdemo",
    footer_info: "Demo contact data for local testing.",
    experience_info: "10+ years in retail automation",
    seed_key: seedKey,
    created_at: now,
    updated_at: now
});

db.links.insertOne({
    facebook: "https://facebook.com/bctdemo",
    instagram: "https://instagram.com/bctdemo",
    linkedin: "https://linkedin.com/company/bctdemo",
    youtube: "https://youtube.com/@bctdemo",
    seed_key: seedKey,
    created_at: now,
    updated_at: now
});

db.about.insertOne({
    creation: "2014",
    clients: "1200+",
    partners: "80+",
    technologies: "Go, Next.js, MongoDB",
    scaners: "48",
    scales: "24",
    printers: "36",
    cashiers: "52",
    seed_key: seedKey,
    created_at: now,
    updated_at: now
});

db.vendors.insertOne({
    image: "/uploads/demo/vendor.webp",
    url: "https://example.com/vendor",
    seed_key: seedKey,
    created_at: now,
    updated_at: now
});

db.projects.insertOne({
    image: "/uploads/demo/project.webp",
    url: "https://example.com/project",
    seed_key: seedKey,
    created_at: now,
    updated_at: now
});

db.currencies.insertOne({
    sum: "UZS",
    seed_key: seedKey,
    created_at: now,
    updated_at: now
});

print('Database initialized successfully!');
print('Collections created for all models from schema diagram:');
print('  - clients, orders, about, vendors, projects, links');
print('  - topcategories, categories, products');
print('  - warehouses, stock operations');
print('  - reviews, sertificates, licenses, news, partners');
print('  - admins, currencies, banners, backgrounds, contacts');
print('  - banner_sorts, top_category_sorts, category_sorts, select_reviews');
print('');
print('Single admin created:');
print('  Username: admin');
print('  Password: 123');
print('Demo data seed key: ' + seedKey);
