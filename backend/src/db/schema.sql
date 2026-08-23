-- TurPoint database schema
-- Task 1: run via `node src/db/index.js` to create all tables.
 
CREATE TABLE IF NOT EXISTS operators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),   -- owning account; null for demo/seed operators
  name TEXT NOT NULL,
  description TEXT,
  languages TEXT,             -- comma-separated, e.g. "az,en,ru"
  photo_url TEXT,
  vehicle_features TEXT,      -- e.g. "wifi,ac,charging,luggage"
  rating REAL DEFAULT 0,
  completed_tours_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
 
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
 
CREATE TABLE IF NOT EXISTS tours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operator_id INTEGER NOT NULL REFERENCES operators(id),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  category TEXT,              -- nature, history, entertainment, ...
  route TEXT,
  price REAL NOT NULL,
  date TEXT NOT NULL,
  duration_days INTEGER DEFAULT 1,
  min_participants INTEGER DEFAULT 1,
  max_participants INTEGER DEFAULT 10,
  interest_score TEXT,        -- JSON: {"nature":0.8,"history":0.2}
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
 
CREATE TABLE IF NOT EXISTS group_formations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id INTEGER NOT NULL REFERENCES tours(id),
  total_cost REAL NOT NULL,
  min_participants INTEGER NOT NULL,
  current_participants INTEGER DEFAULT 0,
  price_per_person REAL,
  status TEXT DEFAULT 'waiting',   -- waiting | forming | confirmed | cancelled
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
 
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id INTEGER NOT NULL REFERENCES tours(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  group_formation_id INTEGER REFERENCES group_formations(id),
  seats INTEGER DEFAULT 1,
  total_price REAL NOT NULL,
  status TEXT DEFAULT 'confirmed', -- confirmed | cancelled
  ticket_code TEXT UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
 
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id INTEGER NOT NULL REFERENCES tours(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
 
CREATE TABLE IF NOT EXISTS last_minute_deals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id INTEGER NOT NULL REFERENCES tours(id),
  discount_percent REAL NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
 
