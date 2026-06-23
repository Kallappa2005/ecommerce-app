# E-Commerce Platform — Microservices Architecture

> **Stack**: Node.js · Express · MongoDB Atlas · RabbitMQ · AWS S3 · AWS SES · Stripe · Razorpay · Docker · GitHub Actions · AWS EC2

---

## Architecture Overview

```
                         ┌─────────────────┐
  Browser / Mobile  ───► │   API Gateway   │ :3000
                         │  (auth, proxy,  │
                         │  rate limiting) │
                         └────────┬────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          ▼                       ▼                       ▼
   ┌─────────────┐       ┌─────────────────┐     ┌──────────────┐
   │ user-svc    │       │  product-svc    │     │  cart-svc    │
   │ :4001       │       │  :4002          │     │  :4003       │
   └─────────────┘       └─────────────────┘     └──────────────┘

   ┌─────────────┐       ┌─────────────────┐
   │ order-svc   │       │  payment-svc    │
   │ :4004       │       │  :4005          │
   └──────┬──────┘       └───────┬─────────┘
          │                      │
          └──────────┬───────────┘
                     ▼
          ┌──────────────────────┐
          │   RabbitMQ Exchange  │  ecommerce.events (topic)
          └──────────┬───────────┘
                     │
        ┌────────────┼────────────┐
        ▼                         ▼
┌──────────────┐       ┌────────────────────────┐
│ email-svc    │       │  notification-svc       │
│ (AWS SES)    │       │  (app notifications)    │
└──────────────┘       └────────────────────────┘
```

---

## Services

| Service | Port | Database | Responsibilities |
|---------|------|----------|-----------------|
| **API Gateway** | 3000 | — | Auth, routing, rate limiting, CORS |
| **user-service** | 4001 | `ecommerce-users` | Register, login, admin auth |
| **product-service** | 4002 | `ecommerce-products` | Product CRUD, S3 image upload |
| **cart-service** | 4003 | `ecommerce-users` | Cart read/write |
| **order-service** | 4004 | `ecommerce-orders` | Order lifecycle, status updates |
| **payment-service** | 4005 | `ecommerce-orders` | Stripe, Razorpay, payment verification |
| **email-service** | — | — | AWS SES consumer, sends all emails |
| **notification-service** | 4007 | — | App notification consumer |

---

## RabbitMQ Event Flow

```
user-service     → user.registered      → email-service (welcome email)
order-service    → order.placed         → email-service (order confirmation)
payment-service  → payment.done         → email-service (payment receipt)
order-service    → order.status_updated → email-service + notification-service
```

**Exchange**: `ecommerce.events` (topic, durable)
**Queues**: `email.notifications`, `app.notifications`

---

## Quick Start (Local Development)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- AWS account (for S3 + SES) — see `.env.example`

### 1. Clone and configure

```bash
git clone https://github.com/YOUR_USERNAME/ecommerce-app.git
cd ecommerce-app

# Create root .env from example
cp .env.example .env
# Fill in all values in .env
```

### 2. Start all services

```bash
docker compose up --build
```

This starts:
- RabbitMQ management UI → http://localhost:15672 (guest/guest)
- API Gateway → http://localhost:3000
- Frontend → http://localhost:5173
- Admin panel → http://localhost:5174

### 3. Verify services are healthy

```bash
# Check all service health endpoints
curl http://localhost:3000/health         # Gateway
curl http://localhost:4001/health         # User service
curl http://localhost:4002/health         # Product service
curl http://localhost:4003/health         # Cart service
curl http://localhost:4004/health         # Order service
curl http://localhost:4005/health         # Payment service
```

---

## API Reference

All requests go through the gateway at `:3000`. 

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/user/register` | None | Register new user |
| POST | `/api/user/login` | None | Login user |
| POST | `/api/user/admin` | None | Admin login |
| GET | `/api/product/list` | None | List all products |
| POST | `/api/product/single` | None | Get single product |
| POST | `/api/product/add` | Admin | Add product + S3 upload |
| POST | `/api/product/remove` | Admin | Delete product |
| POST | `/api/cart/get` | User JWT | Get cart |
| POST | `/api/cart/add` | User JWT | Add to cart |
| POST | `/api/cart/update` | User JWT | Update cart item |
| POST | `/api/order/place` | User JWT | Place COD order |
| POST | `/api/order/stripe` | User JWT | Create Stripe session |
| POST | `/api/order/verifyStripe` | User JWT | Verify Stripe payment |
| POST | `/api/order/razorpay` | User JWT | Create Razorpay order |
| POST | `/api/order/verifyRazorpay` | User JWT | Verify Razorpay payment |
| POST | `/api/order/userorders` | User JWT | Get user's orders |
| POST | `/api/order/list` | Admin | Get all orders |
| POST | `/api/order/status` | Admin | Update order status |

---

## Project Structure

```
ecommerce-app/
│
├── frontend/              React + Vite (unchanged)
├── admin/                 React + Vite (unchanged)
├── backend/               Legacy monolith (backup, disabled in compose)
│
├── gateway/               API Gateway (port 3000)
│   ├── src/middleware/    auth, rateLimiter, requestLogger
│   ├── src/routes/        proxy route config
│   └── server.js
│
├── services/
│   ├── user-service/      Port 4001 — ecommerce-users DB
│   ├── product-service/   Port 4002 — ecommerce-products DB
│   ├── cart-service/      Port 4003 — ecommerce-users DB
│   ├── order-service/     Port 4004 — ecommerce-orders DB
│   ├── payment-service/   Port 4005 — ecommerce-orders DB
│   ├── email-service/     SES consumer, no HTTP port
│   └── notification-svc/  Port 4007 — RabbitMQ consumer
│
├── shared/                Shared libraries (imported by all services)
│   ├── config/            mongodb.js, rabbitmq.js
│   ├── middlewares/       auth.js, adminAuth.js
│   ├── utils/             logger.js, responseHelper.js, errorHandler.js, s3Upload.js
│   └── events/            eventKeys.js (routing key constants)
│
├── docker/
│   └── nginx/             nginx.conf, Dockerfile
│
├── .github/workflows/     deploy.yml — CI/CD pipeline
├── docker-compose.yml     Development (all services)
├── docker-compose.prod.yml Production (with Nginx, no local MongoDB)
└── .env.example           Master environment variable reference
```

---

## CI/CD Pipeline

On every push to `main`:

```
Push to main
    │
    ▼
Build Docker images (all services, cached)
    │
    ▼
Push to Docker Hub (tagged with SHA + latest)
    │
    ▼
SSH into EC2
    │
    ├── git pull origin main
    ├── docker compose pull
    ├── docker compose up -d --remove-orphans
    ├── Health check (curl /health)
    └── docker image prune -f
```

**GitHub Secrets required**:
- `DOCKER_USERNAME`, `DOCKER_PASSWORD`
- `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`, `EC2_APP_DIR`

---

## EC2 Production Deployment

```bash
# On EC2 (first time setup)
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
git clone https://github.com/YOUR_USERNAME/ecommerce-app.git
cd ecommerce-app
cp .env.example .env
# Edit .env with production values
nano .env

# Start in production mode
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f gateway
```

---

## Environment Variables

See [`.env.example`](./.env.example) for the complete reference.

Each service also has its own `.env.example` with only the variables it needs.

---

## Legacy Backend

The original monolithic `backend/` is preserved as a rollback option.

```bash
# Start legacy backend alongside new services
docker compose --profile legacy up -d backend

# Or run standalone
cd backend && node server.js
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 |
| Framework | Express.js v5 |
| Database | MongoDB Atlas (Mongoose) |
| Message Broker | RabbitMQ 3 |
| Email | AWS SES (SDK v3) |
| Storage | AWS S3 (SDK v3) |
| Payments | Stripe + Razorpay |
| Auth | JWT (jsonwebtoken) |
| Container | Docker + Docker Compose |
| Proxy | Nginx |
| CI/CD | GitHub Actions |
| Cloud | AWS EC2 |
