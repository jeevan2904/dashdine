-- ═══════════════════════════════════════════════════════════
-- DashDine — PostgreSQL Database Initialization
-- ═══════════════════════════════════════════════════════════
-- This script runs ONCE when the PostgreSQL container is first created.
-- It creates a separate database for each microservice.
--
-- WHY DATABASE-PER-SERVICE?
-- Each service owns its data. No service can accidentally
-- query another service's tables. This enforces the microservice
-- boundary at the database level, not just at the code level.
-- ═══════════════════════════════════════════════════════════

-- dashdine_auth is already created by POSTGRES_DB env var
-- Create the remaining service databases:

CREATE DATABASE dashdine_users;
CREATE DATABASE dashdine_orders;
CREATE DATABASE dashdine_payments;
CREATE DATABASE dashdine_delivery;
CREATE DATABASE dashdine_settlements;
CREATE DATABASE dashdine_analytics;
CREATE DATABASE dashdine_promos;
CREATE DATABASE dashdine_search;

-- Grant the dashdine user full access to all databases
GRANT ALL PRIVILEGES ON DATABASE dashdine_auth TO dashdine;
GRANT ALL PRIVILEGES ON DATABASE dashdine_users TO dashdine;
GRANT ALL PRIVILEGES ON DATABASE dashdine_orders TO dashdine;
GRANT ALL PRIVILEGES ON DATABASE dashdine_payments TO dashdine;
GRANT ALL PRIVILEGES ON DATABASE dashdine_delivery TO dashdine;
GRANT ALL PRIVILEGES ON DATABASE dashdine_settlements TO dashdine;
GRANT ALL PRIVILEGES ON DATABASE dashdine_analytics TO dashdine;
GRANT ALL PRIVILEGES ON DATABASE dashdine_promos TO dashdine;
GRANT ALL PRIVILEGES ON DATABASE dashdine_search TO dashdine;
