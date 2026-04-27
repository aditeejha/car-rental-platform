-- =====================================================================
-- Trust-First Offline Car Rental Platform — initial schema
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- PostGIS is optional. Set HAS_POSTGIS=1 to enable geo queries.
-- CREATE EXTENSION IF NOT EXISTS "postgis";

-- ---------- USERS ----------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  phone         VARCHAR(32),
  role          VARCHAR(16) NOT NULL DEFAULT 'user'
                 CHECK (role IN ('user','owner','admin')),
  kyc_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  trust_score   NUMERIC(4,2) NOT NULL DEFAULT 80.00,
  wallet_cents  BIGINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- CARS ----------
CREATE TABLE IF NOT EXISTS cars (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  make            VARCHAR(64)  NOT NULL,
  model           VARCHAR(64)  NOT NULL,
  year            INTEGER      NOT NULL,
  category        VARCHAR(32)  NOT NULL, -- sedan|suv|hatchback|luxury|ev
  transmission    VARCHAR(16)  NOT NULL DEFAULT 'automatic',
  fuel_type       VARCHAR(16)  NOT NULL DEFAULT 'petrol',
  seats           SMALLINT     NOT NULL DEFAULT 5,
  luggage         SMALLINT     NOT NULL DEFAULT 2,
  base_price_cents INTEGER     NOT NULL,    -- per day
  current_price_cents INTEGER  NOT NULL,    -- updated by dynamic-pricing job
  city            VARCHAR(64)  NOT NULL,
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  hero_image_url  TEXT NOT NULL,
  gallery         JSONB NOT NULL DEFAULT '[]'::jsonb,
  features        JSONB NOT NULL DEFAULT '[]'::jsonb,
  safety_rating   NUMERIC(3,2) NOT NULL DEFAULT 4.50,
  available       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cars_city ON cars(city);
CREATE INDEX IF NOT EXISTS idx_cars_category ON cars(category);
CREATE INDEX IF NOT EXISTS idx_cars_price ON cars(current_price_cents);

-- ---------- BOOKINGS ----------
CREATE TABLE IF NOT EXISTS bookings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  car_id        UUID NOT NULL REFERENCES cars(id)  ON DELETE CASCADE,
  start_at      TIMESTAMPTZ NOT NULL,
  end_at        TIMESTAMPTZ NOT NULL,
  pickup_city   VARCHAR(64),
  total_cents   INTEGER NOT NULL,
  status        VARCHAR(16) NOT NULL DEFAULT 'confirmed'
                 CHECK (status IN ('pending','confirmed','active','completed','cancelled','disputed')),
  client_ref    VARCHAR(64) UNIQUE,    -- idempotency key from offline queue
  version       INTEGER NOT NULL DEFAULT 1, -- optimistic locking
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_dates CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_bookings_car_window
  ON bookings(car_id, start_at, end_at)
  WHERE status IN ('confirmed','active');
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);

-- ---------- TRIP IMAGES (pre-trip / post-trip evidence) ----------
CREATE TABLE IF NOT EXISTS trip_images (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id    UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  uploader_id   UUID NOT NULL REFERENCES users(id),
  phase         VARCHAR(16) NOT NULL CHECK (phase IN ('pre','post')),
  angle         VARCHAR(32) NOT NULL,   -- front|rear|left|right|odometer|interior
  image_url     TEXT NOT NULL,
  captured_at   TIMESTAMPTZ NOT NULL,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  hash          VARCHAR(128),           -- SHA256 of original bytes
  meta          JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_trip_images_booking ON trip_images(booking_id);

-- ---------- DISPUTES ----------
CREATE TABLE IF NOT EXISTS disputes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id    UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  raised_by     UUID NOT NULL REFERENCES users(id),
  reason        VARCHAR(64) NOT NULL,
  detail        TEXT,
  evidence      JSONB NOT NULL DEFAULT '[]'::jsonb,
  status        VARCHAR(16) NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open','reviewing','resolved','rejected')),
  ai_explanation TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);

-- ---------- SYNC QUEUE LOG (offline reconciliation audit) ----------
CREATE TABLE IF NOT EXISTS sync_log (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  client_ref    VARCHAR(64) NOT NULL,
  action_type   VARCHAR(32) NOT NULL,
  payload       JSONB NOT NULL,
  result        VARCHAR(16) NOT NULL,   -- accepted|conflict|rejected
  detail        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_ref, action_type)
);

-- ---------- WALLET TRANSACTIONS ----------
CREATE TABLE IF NOT EXISTS wallet_tx (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_cents  BIGINT NOT NULL,
  kind          VARCHAR(16) NOT NULL CHECK (kind IN ('topup','charge','refund','penalty')),
  ref_id        UUID,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- NOTIFICATIONS ----------
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel       VARCHAR(16) NOT NULL DEFAULT 'in_app',
  title         VARCHAR(255) NOT NULL,
  body          TEXT,
  data          JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
