import 'dotenv/config';
import express from "express";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";
import path from "path";
import db from "./server/pg";
import Stripe from "stripe";
import { checkRateLimit } from './server/services/redis';
import { initSearchIndex, reindexAllListings } from './server/services/search';
import { Server as SocketIOServer } from "socket.io";
import http from "http";
import { corsMiddleware, helmetMiddleware, generalLimiter, authLimiter, uploadLimiter } from './server/middleware/security';
import { verifyTokenForSocket } from './server/utils/auth';
import { runMigrations } from './server/migrations/runner';
import { createAuthRouter } from './server/routes/auth';
import { createUploadsRouter } from './server/routes/uploads';
import { createListingsRouter } from './server/routes/listings';
import { createUsersRouter } from './server/routes/users';
import { createMessagesRouter } from './server/routes/messages';
import { createOffersRouter } from './server/routes/offers';
import { createAuctionsRouter } from './server/routes/auctions';
import { createOrdersRouter } from './server/routes/orders';
import { createWalletRouter } from './server/routes/wallet';
import { createPushRouter } from './server/routes/push';
import { createNotificationsRouter } from './server/routes/notifications';
import { createStoresRouter } from './server/routes/stores';
import { createPaymentsRouter } from './server/routes/payments';
import { createAdminRouter } from './server/routes/admin';
import { createAdminExtendedRouter } from './server/routes/admin/index';
import { createPublicContentRouter } from './server/routes/content';
import { createDashboardRouter } from './server/routes/dashboard';


let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    stripeClient = new Stripe(key, { apiVersion: '2026-03-25.dahlia' as any });
  }
  return stripeClient;
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);

  // Security middleware — applied first so every request is protected
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(generalLimiter);

  const PORT = 3000;
  const httpServer = http.createServer(app);

  const SOCKET_ORIGINS = process.env.NODE_ENV === 'production'
    ? ['https://balticmarket.net', 'https://www.balticmarket.net']
    : ['http://localhost:5173', 'http://localhost:3000'];

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: SOCKET_ORIGINS,
      methods: ["GET", "POST"],
      credentials: true,
    }
  });

  // Socket.io auth: accept a JWT in handshake.auth.token so authenticated
  // users can be auto-joined to their private `user_<id>` room. Anonymous
  // sockets are still allowed so visitors can subscribe to public auction
  // rooms, but they cannot spoof a user room via a client-sent payload.
  io.use((socket, next) => {
    const token = (socket.handshake.auth as { token?: string } | undefined)?.token;
    const userId = token ? verifyTokenForSocket(token) : null;
    if (userId) (socket.data as { userId: number }).userId = userId;
    next();
  });

  io.on("connection", (socket) => {
    const userId = (socket.data as { userId?: number }).userId;
    if (userId) socket.join(`user_${userId}`);

    socket.on("join_auction", (listingId) => {
      const id = Number(listingId);
      if (Number.isInteger(id) && id > 0) socket.join(`auction_${id}`);
    });

    socket.on("disconnect", () => {
      // room cleanup is automatic on disconnect
    });
  });

  // Apply any pending SQL migrations before serving traffic. Runner is
  // idempotent: already-applied files are skipped via `schema_migrations`.
  try {
    const { applied, skipped } = await runMigrations();
    console.log(`[startup] migrations: applied=${applied.length} skipped=${skipped.length}`);
  } catch (e) {
    console.error('[startup] migration failure — aborting boot', e);
    throw e;
  }

  // Initialize Meilisearch and sync all listings from PostgreSQL
  if (process.env.MEILISEARCH_HOST) {
    initSearchIndex()
      .then(() => reindexAllListings())
      .catch(e => console.error('[SEARCH INIT ERROR]', e));
  }

  // Payments router — webhook MUST be mounted BEFORE express.json()
  app.use('/api', createPaymentsRouter({ getStripe, io }));

  // Rate limiting middleware
  app.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path === '/api/health' || !req.path.startsWith('/api/')) return next();

    const identifier = req.ip ?? 'unknown';
    const isAuthEndpoint = req.path.startsWith('/api/auth/');
    const limit = isAuthEndpoint ? 10 : 200;
    const window = 60;

    const { allowed, remaining, resetIn } = await checkRateLimit(
      `${identifier}:${isAuthEndpoint ? 'auth' : 'api'}`,
      limit,
      window
    );

    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetIn);

    if (!allowed) {
      return res.status(429).json({
        error: 'Pārāk daudz pieprasījumu. Mēģiniet vēlāk.',
        resetIn,
      });
    }
    next();
  });

  // Middleware to parse JSON bodies + cookies (cookies are read by the
  // OAuth state verifier in server/utils/oauthState.ts).
  app.use(express.json());
  app.use(cookieParser());

  // Upload Routes
  app.use('/api/upload', createUploadsRouter({ uploadLimiter }));

  // API routes FIRST
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth Routes
  app.use('/api/auth', createAuthRouter({ authLimiter }));
  app.use('/api/listings', createListingsRouter({ io }));

  // User Routes
  app.use('/api/users', createUsersRouter({ io }));

  // Messages Routes
  app.use('/api/messages', createMessagesRouter({ io }));

  // Offers Routes
  app.use('/api', createOffersRouter({ io }));

  // Auctions Routes
  app.use('/api', createAuctionsRouter({ io }));

  // Domain routers (after express.json())
  app.use('/api/orders', createOrdersRouter({ io }));
  app.use('/api', createWalletRouter({ getStripe }));
  app.use('/api/push', createPushRouter());
  app.use('/api/notifications', createNotificationsRouter());
  app.use('/api/stores', createStoresRouter());
  app.use('/api/seller', createDashboardRouter());
  app.use('/api', createAdminRouter({ io }));
  // Admin Control Center (15-module extended admin surface)
  app.use('/api', createAdminExtendedRouter({ io }));
  // Public read of admin-editable content and settings
  app.use('/api/content', createPublicContentRouter());

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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is starting...`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Server running on http://localhost:${PORT}`);

    // Start background task for auctions
    setInterval(checkEndedAuctions, 60 * 1000); // Check every minute
    checkEndedAuctions(); // Run once on startup
  });

  // Single in-flight guard: a slow DB pass must not stack up with the next tick.
  let auctionCheckInFlight = false;
  async function checkEndedAuctions() {
    if (auctionCheckInFlight) return;
    auctionCheckInFlight = true;
    try {
      // Find all active listings
      const activeListings = await db.all("SELECT id, user_id, title, attributes FROM listings WHERE status = 'active'", []) as any[];

      const now = new Date();

      for (const listing of activeListings) {
        if (!listing.attributes) continue;

        try {
          const attributes = JSON.parse(listing.attributes);
          if (attributes.saleType === 'auction' && attributes.auctionEndDate) {
            const endDate = new Date(attributes.auctionEndDate);

            if (endDate <= now) {
              // Auction has ended
              console.log(`Auction ${listing.id} has ended. Processing...`);

              // Get highest bid
              const highestBid = await db.get(`
                SELECT b.id, b.user_id, b.amount, u.name as bidder_name
                FROM bids b
                JOIN users u ON b.user_id = u.id
                WHERE b.listing_id = ?
                ORDER BY b.amount DESC LIMIT 1
              `, [listing.id]) as any;

              if (highestBid) {
                // Update listing status to sold
                await db.run("UPDATE listings SET status = 'sold' WHERE id = ?", [listing.id]);

                // Notify winner
                await db.run(`
                  INSERT INTO notifications (user_id, type, title, message, link)
                  VALUES (?, 'auction_won', 'Apsveicam! Jūs uzvarējāt izsolē', ?, ?)
                `, [
                  highestBid.user_id,
                  `Jūs uzvarējāt izsolē "${listing.title}" ar solījumu €${highestBid.amount}.`,
                  `/listing/${listing.id}`
                ]);

                // Notify seller
                await db.run(`
                  INSERT INTO notifications (user_id, type, title, message, link)
                  VALUES (?, 'auction_ended', 'Jūsu izsole ir noslēgusies', ?, ?)
                `, [
                  listing.user_id,
                  `Izsole "${listing.title}" ir noslēgusies. Uzvarētājs: ${highestBid.bidder_name} ar solījumu €${highestBid.amount}.`,
                  `/listing/${listing.id}`
                ]);

                // Emit real-time update to auction room subscribers only
                io.to(`auction_${listing.id}`).emit('auction_ended', {
                  listingId: listing.id,
                  winnerId: highestBid.user_id,
                  amount: highestBid.amount
                });

              } else {
                // Update listing status to expired
                await db.run("UPDATE listings SET status = 'expired' WHERE id = ?", [listing.id]);

                // Notify seller
                await db.run(`
                  INSERT INTO notifications (user_id, type, title, message, link)
                  VALUES (?, 'auction_ended', 'Jūsu izsole ir noslēgusies bez solījumiem', ?, ?)
                `, [
                  listing.user_id,
                  `Izsole "${listing.title}" ir noslēgusies, bet neviens neveica solījumus.`,
                  `/listing/${listing.id}`
                ]);

                // Emit real-time update to auction room subscribers only
                io.to(`auction_${listing.id}`).emit('auction_ended', {
                  listingId: listing.id,
                  winnerId: null,
                  amount: null
                });
              }
            }
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
    } catch (error) {
      console.error('Error checking ended auctions:', error);
    } finally {
      auctionCheckInFlight = false;
    }
  }
}

console.log("Initializing server...");
startServer().catch(err => {
  console.error("Failed to start server:", err);
});
