# Admin Authentication Guide

The API exposes a dedicated set of endpoints for authenticating and managing the single admin account. All routes are served from the `/admin` prefix.

## 1. Log In

- **Endpoint:** `POST /admin/login`  
- **Body (JSON):**
  ```json
  {
    "name": "admin",
    "password": "your-password"
  }
  ```
- **Successful response:**
  ```json
  {
    "token": "<jwt-token>",
    "admin": {
      "id": "...",
      "name": "admin",
      "created_at": "...",
      "updated_at": "..."
    }
  }
  ```
- Save the returned JWT; every protected admin route requires it in the `Authorization: Bearer <token>` header.

## 2. Update Admin Credentials

- **Endpoint:** `PUT /admin/update`  
- **Headers:** `Authorization: Bearer <jwt>`  
- **Body (JSON):**
  ```json
  {
    "name": "new-admin-name",
    "password": "new-password"
  }
  ```
- On success, the response mirrors the login payload with a fresh token. The old token immediately becomes invalid because the payload includes the new admin details.

## 3. Fetch Admin Profile

- **Endpoint:** `GET /admin/profile`  
- **Headers:** `Authorization: Bearer <jwt>`  
- Returns the stored admin document (password omitted). Useful for showing current profile information in the dashboard.

## 4. Debug Endpoint (Optional)

- **Endpoint:** `GET /admin/debug`  
- Designed for troubleshooting on non-production environments. It reports whether an admin record exists and verifies the default password (`bct123`). Do not expose this endpoint publicly.

## Error Responses

- `400 Bad Request` — Missing name/password or malformed JSON.
- `401 Unauthorized` — Wrong credentials or missing/invalid JWT.
- `404 Not Found` — Admin record does not exist (should only happen before initial admin creation).
- `500 Internal Server Error` — Unexpected failure hashing passwords or issuing tokens.

## Quick Test With curl

```bash
curl -X POST http://localhost:9000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"name":"admin","password":"your-password"}'

curl http://localhost:9000/admin/profile \
  -H "Authorization: Bearer <jwt-from-login>"
```

Replace `localhost:9000` if the API is running elsewhere. Dispose of debug tokens carefully and rotate credentials if leakage is suspected.
