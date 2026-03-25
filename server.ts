import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import db from "./server/db";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-dev-key-change-in-production";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, name } = req.body;
    try {
      const hash = await bcrypt.hash(password, 10);
      const stmt = db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)');
      const info = stmt.run(email, hash, name);
      
      const token = jwt.sign({ userId: info.lastInsertRowid }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: info.lastInsertRowid, email, name } });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ error: 'Email already exists' });
      } else {
        res.status(500).json({ error: 'Server error' });
      }
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
      if (!user) return res.status(400).json({ error: 'Invalid credentials' });

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(decoded.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user });
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  // User Profile Routes
  app.get("/api/users/me/listings", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const listings = db.prepare(`
        SELECT * FROM listings 
        WHERE user_id = ? 
        ORDER BY created_at DESC
      `).all(decoded.userId);
      res.json(listings);
    } catch (error) {
      console.error("Error fetching user listings:", error);
      res.status(401).json({ error: 'Invalid token or server error' });
    }
  });

  // Listings Routes
  app.get("/api/listings", (req, res) => {
    try {
      const listings = db.prepare(`
        SELECT listings.*, users.name as author_name 
        FROM listings 
        JOIN users ON listings.user_id = users.id 
        ORDER BY listings.created_at DESC
      `).all();
      res.json(listings);
    } catch (error) {
      console.error("Error fetching listings:", error);
      res.status(500).json({ error: 'Server error fetching listings' });
    }
  });

  app.get("/api/listings/:id", (req, res) => {
    try {
      const listing = db.prepare(`
        SELECT listings.*, users.name as author_name, users.email as author_email 
        FROM listings 
        JOIN users ON listings.user_id = users.id 
        WHERE listings.id = ?
      `).get(req.params.id);
      
      if (!listing) return res.status(404).json({ error: 'Listing not found' });
      res.json(listing);
    } catch (error) {
      console.error("Error fetching listing:", error);
      res.status(500).json({ error: 'Server error fetching listing' });
    }
  });

  app.post("/api/listings", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const { title, description, price, category, image_url } = req.body;
      
      if (!title || !price || !category) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const stmt = db.prepare('INSERT INTO listings (user_id, title, description, price, category, image_url) VALUES (?, ?, ?, ?, ?, ?)');
      const info = stmt.run(decoded.userId, title, description, price, category, image_url);
      
      res.json({ id: info.lastInsertRowid, message: 'Listing created successfully' });
    } catch (error) {
      console.error("Error creating listing:", error);
      res.status(500).json({ error: 'Server error while creating listing' });
    }
  });

  app.delete("/api/listings/:id", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const listingId = req.params.id;

      // Verify ownership
      const listing = db.prepare('SELECT user_id FROM listings WHERE id = ?').get(listingId) as { user_id: number } | undefined;
      
      if (!listing) return res.status(404).json({ error: 'Listing not found' });
      if (listing.user_id !== decoded.userId) return res.status(403).json({ error: 'Unauthorized to delete this listing' });

      db.prepare('DELETE FROM listings WHERE id = ?').run(listingId);
      res.json({ message: 'Listing deleted successfully' });
    } catch (error) {
      console.error("Error deleting listing:", error);
      res.status(500).json({ error: 'Server error deleting listing' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
