import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    balance REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT,
    attributes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS favorites (
    user_id INTEGER NOT NULL,
    listing_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, listing_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (listing_id) REFERENCES listings (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reviewer_id INTEGER NOT NULL,
    seller_id INTEGER NOT NULL,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reviewer_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES users (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS bids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER,
    slug TEXT UNIQUE NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES categories (id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    listing_id INTEGER,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (listing_id) REFERENCES listings (id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL, -- 'deposit', 'withdrawal', 'payment', 'fee'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS points_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    points INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id INTEGER NOT NULL,
    buyer_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings (id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_id) REFERENCES users (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_id INTEGER NOT NULL,
    listing_id INTEGER,
    user_id INTEGER,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (listing_id) REFERENCES listings (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  );

  -- FTS5 Virtual Table for Search MVP
  CREATE VIRTUAL TABLE IF NOT EXISTS listings_fts USING fts5(
    id UNINDEXED,
    title,
    description,
    category,
    attributes,
    content='listings',
    content_rowid='id'
  );

  -- Triggers to keep FTS table in sync with listings
  CREATE TRIGGER IF NOT EXISTS listings_ai AFTER INSERT ON listings BEGIN
    INSERT INTO listings_fts(rowid, id, title, description, category, attributes)
    VALUES (new.id, new.id, new.title, new.description, new.category, new.attributes);
  END;

  CREATE TRIGGER IF NOT EXISTS listings_ad AFTER DELETE ON listings BEGIN
    INSERT INTO listings_fts(listings_fts, rowid, id, title, description, category, attributes)
    VALUES('delete', old.id, old.id, old.title, old.description, old.category, old.attributes);
  END;

  CREATE TRIGGER IF NOT EXISTS listings_au AFTER UPDATE ON listings BEGIN
    INSERT INTO listings_fts(listings_fts, rowid, id, title, description, category, attributes)
    VALUES('delete', old.id, old.id, old.title, old.description, old.category, old.attributes);
    INSERT INTO listings_fts(rowid, id, title, description, category, attributes)
    VALUES (new.id, new.id, new.title, new.description, new.category, new.attributes);
  END;
`);

try {
  db.exec('ALTER TABLE listings ADD COLUMN attributes TEXT');
} catch (e) {
  // Column might already exist
}

try {
  db.exec('ALTER TABLE users ADD COLUMN balance REAL DEFAULT 0');
} catch (e) {
  // Column might already exist
}

try {
  db.exec('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "user"');
} catch (e) {
  // Column might already exist
}

try {
  db.exec('ALTER TABLE users ADD COLUMN phone TEXT');
} catch (e) {
  // Column might already exist
}

try {
  db.exec('ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 0');
} catch (e) {
  // Column might already exist
}

try {
  db.exec('ALTER TABLE users ADD COLUMN user_type TEXT DEFAULT "c2c"'); // 'c2c' or 'b2b'
} catch (e) {
  // Column might already exist
}

try {
  db.exec('ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0');
} catch (e) {
  // Column might already exist
}

try {
  db.exec('ALTER TABLE listings ADD COLUMN status TEXT DEFAULT "active"'); // 'active', 'sold', 'expired', 'flagged'
} catch (e) {
  // Column might already exist
}

try {
  db.exec('ALTER TABLE listings ADD COLUMN views INTEGER DEFAULT 0');
} catch (e) {
  // Column might already exist
}

try {
  db.exec('ALTER TABLE listings ADD COLUMN is_highlighted BOOLEAN DEFAULT 0');
} catch (e) {
  // Column might already exist
}

try {
  db.exec('ALTER TABLE users ADD COLUMN early_access_until DATETIME');
} catch (e) {
  // Column might already exist
}

export default db;
