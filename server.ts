import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import db from "./server/db";
import { GoogleGenAI } from "@google/genai";

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
      res.json({ token, user: { id: info.lastInsertRowid, email, name, role: 'user' } });
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
      res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
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
      const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(decoded.userId);
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

  app.get("/api/users/me/favorites", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const favorites = db.prepare(`
        SELECT listings.*, users.name as author_name 
        FROM favorites
        JOIN listings ON favorites.listing_id = listings.id
        JOIN users ON listings.user_id = users.id
        WHERE favorites.user_id = ?
        ORDER BY favorites.created_at DESC
      `).all(decoded.userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching user favorites:", error);
      res.status(401).json({ error: 'Invalid token or server error' });
    }
  });

  // Favorites Routes
  app.post("/api/favorites/:id", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const listingId = req.params.id;
      
      db.prepare('INSERT OR IGNORE INTO favorites (user_id, listing_id) VALUES (?, ?)').run(decoded.userId, listingId);
      res.json({ message: 'Added to favorites' });
    } catch (error) {
      console.error("Error adding favorite:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.delete("/api/favorites/:id", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const listingId = req.params.id;
      
      db.prepare('DELETE FROM favorites WHERE user_id = ? AND listing_id = ?').run(decoded.userId, listingId);
      res.json({ message: 'Removed from favorites' });
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Reviews Routes
  app.get("/api/users/:id/reviews", (req, res) => {
    try {
      const sellerId = req.params.id;
      const reviews = db.prepare(`
        SELECT reviews.*, users.name as reviewer_name 
        FROM reviews 
        JOIN users ON reviews.reviewer_id = users.id 
        WHERE seller_id = ? 
        ORDER BY reviews.created_at DESC
      `).all(sellerId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post("/api/users/:id/reviews", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const sellerId = req.params.id;
      const { rating, comment } = req.body;

      if (decoded.userId.toString() === sellerId) {
        return res.status(400).json({ error: 'You cannot review yourself' });
      }

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }

      const stmt = db.prepare('INSERT INTO reviews (reviewer_id, seller_id, rating, comment) VALUES (?, ?, ?, ?)');
      const info = stmt.run(decoded.userId, sellerId, rating, comment);
      
      res.json({ id: info.lastInsertRowid, message: 'Review added successfully' });
    } catch (error) {
      console.error("Error adding review:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Listings Routes
  app.get("/api/listings/search", (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.json([]);
      }
      
      const listings = db.prepare(`
        SELECT listings.*, users.name as author_name 
        FROM listings_fts 
        JOIN listings ON listings_fts.id = listings.id
        JOIN users ON listings.user_id = users.id 
        WHERE listings_fts MATCH ?
        ORDER BY rank
      `).all(query + '*');
      res.json(listings);
    } catch (error) {
      console.error("Error searching listings:", error);
      res.status(500).json({ error: 'Server error searching listings' });
    }
  });

  app.get("/api/listings", (req, res) => {
    try {
      const { category, minPrice, maxPrice } = req.query;
      let query = `
        SELECT listings.*, users.name as author_name 
        FROM listings 
        JOIN users ON listings.user_id = users.id 
        WHERE 1=1
      `;
      const params: any[] = [];

      if (category) {
        query += ` AND category = ?`;
        params.push(category);
      }
      if (minPrice) {
        query += ` AND price >= ?`;
        params.push(Number(minPrice));
      }
      if (maxPrice) {
        query += ` AND price <= ?`;
        params.push(Number(maxPrice));
      }

      query += ` ORDER BY listings.created_at DESC`;
      
      const listings = db.prepare(query).all(...params);
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

  app.post("/api/generate-description", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    
    try {
      jwt.verify(token, JWT_SECRET); // just verify they are logged in
      const { category, brand, model, year, condition, features } = req.body;
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `Izveido profesionālu, pievilcīgu un strukturētu pārdošanas aprakstu latviešu valodā šādam sludinājumam:
      Kategorija: ${category}
      Marka/Ražotājs: ${brand || 'Nav norādīts'}
      Modelis: ${model || 'Nav norādīts'}
      Gads: ${year || 'Nav norādīts'}
      Stāvoklis: ${condition || 'Nav norādīts'}
      Papildus informācija/Ekstras: ${features || 'Nav norādīts'}
      
      Aprakstam jābūt pārliecinošam, viegli lasāmam un jāizceļ preces priekšrocības. Nelieto pārāk garus ievadus, uzreiz ķeries pie lietas.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      res.json({ description: response.text });
    } catch (error) {
      console.error("Error generating description:", error);
      res.status(500).json({ error: 'Server error generating description' });
    }
  });

  app.post("/api/listings", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const { title, description, price, category, image_url, attributes } = req.body;
      
      if (!title || !price || !category) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const stmt = db.prepare('INSERT INTO listings (user_id, title, description, price, category, image_url, attributes) VALUES (?, ?, ?, ?, ?, ?, ?)');
      const info = stmt.run(decoded.userId, title, description, price, category, image_url, attributes ? JSON.stringify(attributes) : null);
      
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
      res.status(500).json({ error: 'Server error while deleting listing' });
    }
  });

  // Bids API
  app.post("/api/listings/:id/bids", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const listingId = req.params.id;
      const { amount } = req.body;

      if (!amount || isNaN(amount)) {
        return res.status(400).json({ error: 'Invalid bid amount' });
      }

      // Check if listing exists and is an auction
      const listing = db.prepare('SELECT price, attributes, user_id FROM listings WHERE id = ?').get(listingId) as any;
      if (!listing) return res.status(404).json({ error: 'Listing not found' });
      
      if (listing.user_id === decoded.userId) {
        return res.status(400).json({ error: 'Cannot bid on your own listing' });
      }

      const attributes = listing.attributes ? JSON.parse(listing.attributes) : {};
      if (attributes.saleType !== 'auction') {
        return res.status(400).json({ error: 'This listing is not an auction' });
      }

      // Check if bid is higher than current highest bid or starting price
      const highestBid = db.prepare('SELECT MAX(amount) as maxAmount FROM bids WHERE listing_id = ?').get(listingId) as { maxAmount: number | null };
      const currentHighest = highestBid.maxAmount !== null ? highestBid.maxAmount : listing.price;

      if (amount <= currentHighest) {
        return res.status(400).json({ error: `Bid must be higher than current highest bid: €${currentHighest}` });
      }

      const stmt = db.prepare('INSERT INTO bids (listing_id, user_id, amount) VALUES (?, ?, ?)');
      stmt.run(listingId, decoded.userId, amount);
      
      res.json({ message: 'Bid placed successfully' });
    } catch (error) {
      console.error("Error placing bid:", error);
      res.status(500).json({ error: 'Server error while placing bid' });
    }
  });

  app.get("/api/listings/:id/bids", (req, res) => {
    try {
      const listingId = req.params.id;
      const stmt = db.prepare(`
        SELECT bids.*, users.name as bidder_name 
        FROM bids 
        JOIN users ON bids.user_id = users.id 
        WHERE listing_id = ? 
        ORDER BY amount DESC
      `);
      const bids = stmt.all(listingId);
      res.json(bids);
    } catch (error) {
      console.error("Error fetching bids:", error);
      res.status(500).json({ error: 'Server error fetching bids' });
    }
  });

  app.put("/api/listings/:id", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const listingId = req.params.id;
      const { title, description, price, category, image_url } = req.body;

      // Verify ownership
      const listing = db.prepare('SELECT user_id FROM listings WHERE id = ?').get(listingId) as { user_id: number } | undefined;
      
      if (!listing) return res.status(404).json({ error: 'Listing not found' });
      if (listing.user_id !== decoded.userId) return res.status(403).json({ error: 'Unauthorized to edit this listing' });

      db.prepare(`
        UPDATE listings 
        SET title = ?, description = ?, price = ?, category = ?, image_url = ?
        WHERE id = ?
      `).run(title, description, price, category, image_url, listingId);

      res.json({ message: 'Listing updated successfully' });
    } catch (error) {
      console.error("Error updating listing:", error);
      res.status(500).json({ error: 'Server error updating listing' });
    }
  });

  // Wallet API
  app.get("/api/wallet/balance", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(decoded.userId) as { balance: number } | undefined;
      
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ balance: user.balance || 0 });
    } catch (error) {
      console.error("Error fetching balance:", error);
      res.status(500).json({ error: 'Server error fetching balance' });
    }
  });

  app.post("/api/wallet/add-funds", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const { amount } = req.body;

      if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amount, decoded.userId);
      
      const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(decoded.userId) as { balance: number };
      res.json({ message: 'Funds added successfully', balance: user.balance });
    } catch (error) {
      console.error("Error adding funds:", error);
      res.status(500).json({ error: 'Server error adding funds' });
    }
  });

  app.post("/api/wallet/deduct", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const { amount, reason } = req.body;

      if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(decoded.userId) as { balance: number } | undefined;
      
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (user.balance < amount) {
        return res.status(400).json({ error: 'Insufficient funds' });
      }

      db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(amount, decoded.userId);
      
      const updatedUser = db.prepare('SELECT balance FROM users WHERE id = ?').get(decoded.userId) as { balance: number };
      res.json({ message: 'Funds deducted successfully', balance: updatedUser.balance });
    } catch (error) {
      console.error("Error deducting funds:", error);
      res.status(500).json({ error: 'Server error deducting funds' });
    }
  });

  // Admin API
  const isAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const user = db.prepare('SELECT role FROM users WHERE id = ?').get(decoded.userId) as { role: string } | undefined;
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admins only' });
      }
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  app.get("/api/admin/users", isAdmin, (req, res) => {
    try {
      const users = db.prepare('SELECT id, email, name, role, created_at, balance FROM users ORDER BY created_at DESC').all();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: 'Server error fetching users' });
    }
  });

  app.delete("/api/admin/users/:id", isAdmin, (req, res) => {
    try {
      db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: 'Server error deleting user' });
    }
  });

  app.get("/api/admin/listings", isAdmin, (req, res) => {
    try {
      const listings = db.prepare(`
        SELECT listings.*, users.name as author_name, users.email as author_email
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

  app.delete("/api/admin/listings/:id", isAdmin, (req, res) => {
    try {
      db.prepare('DELETE FROM listings WHERE id = ?').run(req.params.id);
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
