 ## Contract model
 ```json
  {
    "client_id": "string",
    "counterparty_id": "string",
    "company_id": "string",
    "guarantee": "string",
    "comment": "string",
    "deal_date": "ISODate",
    "contract_amount": "number",
    "funnel_id":"string", // new update
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