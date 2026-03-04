# 🚀 DashDine

**Multi-city food delivery platform** — connecting customers, restaurants, and delivery riders.

## Tech Stack

- **Frontend:** React.js (Vite) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Node.js + TypeScript + Fastify (microservices)
- **Databases:** PostgreSQL (Drizzle ORM) + MongoDB (Mongoose) + Redis
- **Message Queue:** RabbitMQ
- **Infrastructure:** Docker + Kubernetes (AWS EKS) + Terraform
- **CI/CD:** GitHub Actions
- **Monorepo:** pnpm workspaces + Turborepo

## Prerequisites

- Node.js >= 22.0.0
- pnpm >= 10.0.0
- Docker & Docker Compose
- Git

## Getting Started

```bash
# Clone the repository
git clone https://github.com/your-username/dashdine.git
cd dashdine

# Install dependencies (pnpm reads pnpm-workspace.yaml automatically)
pnpm install

# Start infrastructure (databases, Redis, RabbitMQ)
docker compose up -d

# Start all services in development mode
pnpm dev

# Or start a specific service
pnpm dev --filter=order-service
```

## Project Structure

```
dashdine/
├── apps/                  # Frontend applications
│   ├── customer-web/      # Customer-facing React SPA
│   ├── rider-web/         # Delivery rider React SPA
│   ├── restaurant-web/    # Restaurant owner React SPA
│   └── admin-web/         # Admin dashboard React SPA
├── services/              # Backend microservices
│   ├── customer-bff/      # Customer Backend-For-Frontend
│   ├── rider-bff/         # Rider Backend-For-Frontend
│   ├── restaurant-bff/    # Restaurant Backend-For-Frontend
│   ├── admin-bff/         # Admin Backend-For-Frontend
│   ├── auth-service/      # Authentication & Authorization
│   ├── user-service/      # User Profiles & Addresses
│   ├── restaurant-service/# Restaurant & Menu Management
│   ├── order-service/     # Order Lifecycle Management
│   ├── payment-service/   # Payment Processing (Razorpay)
│   ├── delivery-service/  # Rider Assignment & Tracking
│   ├── search-service/    # Search & Discovery
│   ├── notification-service/ # Push, SMS, Email, In-App
│   ├── settlement-service/# Payouts & Commission
│   ├── analytics-service/ # Metrics & Reporting
│   ├── media-service/     # Image Upload & CDN
│   └── promo-service/     # Promo Codes & Discounts
├── packages/              # Shared libraries
│   ├── types/             # Shared TypeScript types
│   ├── utils/             # Shared utility functions
│   ├── validators/        # Shared Zod validation schemas
│   ├── constants/         # Shared enums & constants
│   ├── db-postgres/       # Shared PostgreSQL client (Drizzle)
│   ├── db-mongo/          # Shared MongoDB client (Mongoose)
│   ├── queue/             # Shared RabbitMQ publisher/consumer
│   ├── logger/            # Structured logging library
│   ├── auth-middleware/   # JWT validation middleware
│   └── api-client/        # Typed HTTP client for inter-service calls
├── infra/                 # Infrastructure configs
│   ├── docker/            # Dockerfiles
│   ├── k8s/               # Kubernetes manifests
│   ├── terraform/         # AWS infrastructure as code
│   └── scripts/           # Utility scripts
├── package.json           # Root workspace config
├── pnpm-workspace.yaml    # Workspace package locations
├── turbo.json             # Turborepo pipeline config
└── tsconfig.base.json     # Base TypeScript config
```

## Available Scripts

| Command           | Description                                  |
| ----------------- | -------------------------------------------- |
| `pnpm install`    | Install all dependencies across the monorepo |
| `pnpm dev`        | Start all services in development mode       |
| `pnpm build`      | Build all packages and services              |
| `pnpm lint`       | Run ESLint across all packages               |
| `pnpm type-check` | Run TypeScript type checking                 |
| `pnpm test`       | Run all tests                                |
| `pnpm format`     | Format all code with Prettier                |
| `pnpm clean`      | Remove all build artifacts and caches        |

## Architecture

DashDine follows a **microservices architecture** with a **BFF (Backend-For-Frontend)** pattern:

- **4 Frontend SPAs** → each talks to its dedicated BFF gateway
- **4 BFF Gateways** → aggregate data from microservices for their frontend
- **12 Microservices** → each owns its domain, database, and business logic
- **Event-driven** → async communication via RabbitMQ for loose coupling
- **Real-time** → WebSocket for order tracking and rider broadcasts

## License

Private — All rights reserved.
