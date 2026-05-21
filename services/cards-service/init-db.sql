-- ================================================
-- Script para crear la base de datos cards_db
-- Ejecutar dentro del contenedor de Supabase
-- ================================================

-- 1. Crear el usuario del servicio
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'cards_svc') THEN
    CREATE ROLE cards_svc WITH LOGIN PASSWORD 'CardsSvc_2026_dev';
  END IF;
END
$$;

-- 2. Crear la base de datos
SELECT 'CREATE DATABASE cards_db OWNER cards_svc'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cards_db');
\gexec

-- 3. Otorgar permisos
GRANT ALL PRIVILEGES ON DATABASE cards_db TO cards_svc;

-- 4. Conectarse a cards_db para crear las tablas
\c cards_db

-- 5. Otorgar permisos en el schema
GRANT ALL ON SCHEMA public TO cards_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO cards_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO cards_svc;

-- 6. Crear tablas (como cards_svc)
SET ROLE cards_svc;

-- Tabla: athletes (datos sincronizados desde ESPN API)
CREATE TABLE IF NOT EXISTS athletes (
  athlete_id SERIAL PRIMARY KEY,
  espn_athlete_id INT UNIQUE NOT NULL,
  display_name VARCHAR(50) NOT NULL,
  weight DOUBLE PRECISION,
  height DOUBLE PRECISION,
  age INT,
  debut_year INT,
  position VARCHAR(20),
  jersey_num INT,
        headshot_url TEXT,
  athlete_status BOOLEAN DEFAULT TRUE,
  statistics_id INT
);

-- Tabla: athlete_statistics
CREATE TABLE IF NOT EXISTS athlete_statistics (
  id SERIAL PRIMARY KEY,
  athlete_id INT NOT NULL REFERENCES athletes(athlete_id) ON DELETE CASCADE,
  espn_statistics_id INT,
  passes DOUBLE PRECISION DEFAULT 0,
  p_yards INT DEFAULT 0,
  r_yards INT DEFAULT 0,
  interceptions INT DEFAULT 0,
  touchdowns INT DEFAULT 0,
  games_played INT DEFAULT 0
);

-- Tabla: cards (una carta por atleta)
CREATE TABLE IF NOT EXISTS cards (
  card_id SERIAL PRIMARY KEY,
  athlete_id INT NOT NULL REFERENCES athletes(athlete_id) ON DELETE CASCADE,
  card_image VARCHAR(100),
  rarity VARCHAR(20) NOT NULL DEFAULT 'common'
);

-- Tabla: user_cards (cartas desbloqueadas por usuario)
CREATE TABLE IF NOT EXISTS user_cards (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  card_id INT NOT NULL REFERENCES cards(card_id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, card_id)
);

-- Tabla: user_packs (sobres disponibles por usuario)
CREATE TABLE IF NOT EXISTS user_packs (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  packs_remaining INT DEFAULT 12
);

-- Tabla: cards_sync_log (registro de sincronizaciones con ESPN)
CREATE TABLE IF NOT EXISTS cards_sync_log (
  id SERIAL PRIMARY KEY,
  source VARCHAR(100) NOT NULL,
  sync_date TIMESTAMP NOT NULL DEFAULT NOW(),
  athletes_synced INT DEFAULT 0,
  status VARCHAR(50) NOT NULL
);

RESET ROLE;

-- ================================================
-- Listo! Verificar con: \dt para ver las tablas
-- ================================================
