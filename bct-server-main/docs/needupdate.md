# BCT API Resource Guide

Ushbu hujjat `needupdate.json` faylida berilgan asosiy resurslar va ularning REST endpointlari bo'yicha qisqa ko'rsatma beradi. Har bir bo'limda mavjud maydonlar, ichki obyektlar strukturasi va yaratilishi talab qilinadigan so'rov tana (request body)lari yoritilgan.

## Umumiy Kelishuvlar
- `ISODate` — ISO 8601 formatidagi vaqt tamg'asi (`YYYY-MM-DDTHH:mm:ss.sssZ`).
- `ObjectId` — MongoDB uslubidagi 24 belgili identifikator.
- `enum('UZS','USD','EUR')` — faqat sanab o'tilgan qiymatlardan birini qabul qadi.

## Company

### Asosiy maydonlar
| Maydon | Tur | Izoh |
| --- | --- | --- |
| `id` | string | Unikal kompaniya identifikatori |
| `name` | string | Kompaniya nomi |
| `order_count` | number | Berilgan buyurtmalar soni |
| `total_amount` | number | Barcha buyurtmalar bo'yicha tushum |
| `email` | string | Kompaniya e-pochtasi |
| `inn` | string | Soliq to'lovchi identifikatsiya raqami |
| `address` | string | Yuridik yoki pochta manzil |
| `phone` | string | Aloqa telefoni |
| `comment` | string | Ichki izoh |
| `created_at` | ISODate | Yaratilgan vaqti |
| `updated_at` | ISODate | Oxirgi yangilanish vaqti |
| `order_history` | array | Har bir element kompaniya buyurtmasini bildiradi |

**Order history elementi**

| Maydon | Tur | Izoh |
| --- | --- | --- |
| `id` | string | Buyurtma identifikatori |
| `order_number` | string | Buyurtma raqami |
| `price` | number | Buyurtma umumiy summasi |
| `status` | string | Buyurtma holati |
| `created_at` | ISODate | Yaratilgan vaqt |
| `updated_at` | ISODate | Yangilangan vaqt |
| `products` | array | Buyurtmadagi mahsulotlar ro'yxati |

**Order history → product elementi**

| Maydon | Tur | Izoh |
| --- | --- | --- |
| `id` | string | Mahsulot identifikatori |
| `name` | string | Mahsulot nomi |
| `price` | number | Bir dona narxi |
| `quantity` | number | Buyurtmadagi dona soni |
| `serial_number` | string | Seriya raqami |
| `created_at` | ISODate | Yaratilgan vaqt |
| `updated_at` | ISODate | Yangilangan vaqt |

### Endpointlar
- `GET /companies` — mavjud kompaniyalarni ro'yxatlash.
- `GET /companies/{id}` — bitta kompaniya haqida ma'lumot olish.
- `POST /companies` — yangi kompaniya yaratish.
  
  ```json
  {
    "name": "string",
    "email": "string",
    "inn": "string",
    "address": "string",
    "phone": "string",
    "comment": "string (optional)"
  }
  ```
- `DELETE /companies/{id}` — kompaniyani o'chirish.

## Client

### Asosiy maydonlar
| Maydon | Tur | Izoh |
| --- | --- | --- |
| `id` | string | Mijoz identifikatori |
| `first_name` | string | Ism |
| `last_name` | string | Familiya |
| `email` | string | E-pochta |
| `phone` | string | Shaxsiy telefon |
| `company_phone` | string | Kompaniyadagi telefon |
| `company` | string | Tegishli kompaniya nomi |
| `address` | string | Manzil |
| `comment` | string | Ichki izoh |
| `created_at` | ISODate | Yaratilgan vaqt |
| `updated_at` | ISODate | Yangilangan vaqt |
| `order_history` | array | Buyurtmalar tarixi (company bilan bir xil strukturada) |

### Endpointlar
- `GET /clients` — mijozlar ro'yxati.
- `GET /clients/{id}` — bitta mijoz haqida ma'lumot.
- `POST /clients` — yangi mijoz qo'shish.
  
  ```json
  {
    "first_name": "string",
    "last_name": "string",
    "email": "string",
    "phone": "string",
    "company_phone": "string",
    "company": "string",
    "address": "string",
    "comment": "string (optional)"
  }
  ```
- `DELETE /clients/{id}` — mijozni o'chirish.

## Counterparty

### Asosiy maydonlar
| Maydon | Tur | Izoh |
| --- | --- | --- |
| `id` | string | Kontragent identifikatori |
| `first_name` | string | Vakilning ismi |
| `last_name` | string | Vakilning familiyasi |
| `email` | string | Aloqa e-pochtasi |
| `phone` | string | Aloqa telefoni |
| `company_phone` | string | Kompaniya telefoni |
| `company` | string | Kompaniya nomi |
| `address` | string | Manzil |
| `comment` | string | Izoh |
| `created_at` | ISODate | Yaratilgan |
| `updated_at` | ISODate | Yangilangan |
| `order_history` | array | Mijoznikiga teng struktura |

### Endpointlar
- `GET /counterparties` — kontragentlar ro'yxati.
- `GET /counterparties/{id}` — bitta kontragent.
- `POST /counterparties` — yangi kontragent qo'shish.
  
  ```json
  {
    "first_name": "string",
    "last_name": "string",
    "email": "string",
    "phone": "string",
    "company_phone": "string",
    "company": "string",
    "address": "string",
    "comment": "string (optional)"
  }
  ```
- `DELETE /counterparties/{id}` — kontragentni o'chirish.

## Product

### Asosiy maydonlar
| Maydon | Tur | Izoh |
| --- | --- | --- |
| `id` | ObjectId | Mahsulot identifikatori |
| `name` | string | Mahsulot nomi |
| `ads_title` | string | Reklama sarlavhasi |
| `images` | array[string] | Rasm URL manzillari |
| `description` | string | Batafsil tavsif |
| `guarantee` | string | Kafolat shartlari |
| `serial_number` | string | Seriya raqami |
| `shtrix_number` | string | Shtrix (barcode) raqami |
| `price` | number | Asosiy narx |
| `discount` | number|null | Chegirma qiymati |
| `category_id` | ObjectId | Kategoriya identifikatori |
| `top_category_id` | ObjectId | Yuqori darajadagi kategoriya |
| `category_name` | string|null | Kategoriya nomi (opsional) |
| `top_category_name` | string|null | Yuqori kategoriya nomi |
| `count` | number | Ombordagi son |
| `NDC` | number|null | QQS (Value-Added tax) |
| `tax` | number | Qo'shimcha soliq |
| `created_at` | ISODate | Yaratilgan vaqt |
| `updated_at` | ISODate | Yangilangan vaqt |

### Endpointlar
- `GET /products` — mahsulotlarni ro'yxatlash.
- `GET /products/{id}` — bitta mahsulot tafsiloti.
- `POST /products` — mahsulot qo'shish.
  
  ```json
  {
    "name": "string",
    "ads_title": "string",
    "images": ["string"],
    "description": "string",
    "guarantee": "string",
    "serial_number": "string",
    "shtrix_number": "string",
    "price": "number",
    "NDC": "number|null",
    "discount": "number|null",
    "category_id": "ObjectId",
    "top_category_id": "ObjectId",
    "count": "number",
    "tax": "number"
  }
  ```
- `DELETE /products/{id}` — mahsulotni o'chirish.

## Contract

### Asosiy maydonlar
| Maydon | Tur | Izoh |
| --- | --- | --- |
| `id` | string | Shartnoma identifikatori |
| `client_id` | string | Mijoz identifikatori |
| `counterparty_id` | string | Kontragent identifikatori |
| `company_id` | string | Kompaniya identifikatori |
| `guarantee` | string | Kafolat shartlari |
| `comment` | string | Izoh |
| `deal_date` | ISODate | Bitim sanasi |
| `contract_amount` | number | Shartnoma summasi |
| `contract_currency` | enum | Valyuta (`UZS`, `USD`, `EUR`) |
| `pay_card` | number | Plastik orqali to'lov |
| `pay_cash` | number | Naqd to'lov |
| `created_at` | ISODate | Yaratilgan vaqt |
| `updated_at` | ISODate | Yangilangan vaqt |
| `products` | array | Shartnoma mahsulotlari |

**Contract → product elementi**

| Maydon | Tur | Izoh |
| --- | --- | --- |
| `product_id` | string | Mahsulot identifikatori |
| `price` | number | Bir dona narx |
| `quantity` | number | Miqdor |
| `discount` | number|null | Chegirma |
| `serial_number` | string | Seriya raqami |
| `shtrix_number` | string | Shtrix raqami |

### Endpointlar
- `GET /contracts` — shartnomalarni ro'yxatlash.
- `GET /contracts/{id}` — shartnoma tafsiloti.
- `POST /contracts` — shartnoma yaratish.
  
  ```json
  {
    "client_id": "string",
    "counterparty_id": "string",
    "company_id": "string",
    "guarantee": "string",
    "comment": "string",
    "deal_date": "ISODate",
    "contract_amount": "number",
    "contract_currency": "enum('UZS','USD','EUR')",
    "pay_card": "number",
    "pay_cash": "number",
    "products": [
      {
        "product_id": "string",
        "price": "number",
        "quantity": "number",
        "discount": "number|null",
        "serial_number": "string",
        "shtrix_number": "string"
      }
    ]
  }
  ```
- `DELETE /contracts/{id}` — shartnomani o'chirish.

## Funnel

### Asosiy maydonlar
| Maydon | Tur | Izoh |
| --- | --- | --- |
| `id` | string | Funnel bosqichi identifikatori |
| `name` | string | Bosqich nomi |
| `color` | string | HEX rang kodi |
| `comment` | string | Izoh |
| `order` | number | Bosqich tartib indeksi |
| `created_at` | ISODate | Yaratilgan vaqt |
| `updated_at` | ISODate | Yangilangan vaqt |

### Endpointlar
- `GET /funnels` — funnel bosqichlarini ro'yxatlash.
- `GET /funnels/{id}` — alohida bosqich tafsiloti.
- `POST /funnels` — yangi bosqich yaratish.
  
  ```json
  {
    "name": "string",
    "color": "string (HEX)",
    "comment": "string",
    "order": "number"
  }
  ```
- `DELETE /funnels/{id}` — funnel bosqichini o'chirish.

---

Shu kabi struktura yangi endpointlar qo'shilganda ham kengaytirilishi mumkin: maydonlar jadvali, ichki obyektlar tavsifi, so'rov tanasi va qisqa endpoint izohlari kiritilishi yetarli.
