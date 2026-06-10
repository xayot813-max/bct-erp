# BCT ERP

Production-ready ERP workspace with:

- `ERP-BCT-main` - Next.js ERP dashboard frontend.
- `bct-server-main` - Go/Fiber API with MongoDB.
- `scripts` - local start/stop helpers.

## Local Start

Backend:

```bash
cd bct-server-main
docker compose up -d --build
```

Frontend:

```bash
cd ERP-BCT-main
npm install
npm run build
npm start
```

Default URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:9000`
- Health: `http://localhost:9000/health`

Default admin:

- Login: `admin`
- Password: `123`

## One-command Local Run

From repository root:

```bash
./scripts/start-local.sh
```

Stop:

```bash
./scripts/stop-local.sh
```

## Server Deploy

1. Install Docker, Docker Compose, Node.js 20+, and npm.
2. Clone the repository.
3. Start backend:

```bash
cd bct-server-main
docker compose up -d --build
```

4. Configure frontend API URL in `ERP-BCT-main/.env.local` if the backend is not on localhost.
5. Build and start frontend:

```bash
cd ../ERP-BCT-main
npm install
npm run build
npm start
```

## Verification

```bash
cd bct-server-main
go test ./...

cd ../ERP-BCT-main
npm run build
```

Warehouse API smoke:

```bash
curl http://localhost:9000/api/warehouses
```
