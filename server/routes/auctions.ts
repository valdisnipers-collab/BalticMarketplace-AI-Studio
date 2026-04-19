import { Router } from 'express';
import db from '../pg';
import { requireAuth, JWT_SECRET } from '../utils/auth';
import { sendPushToUser } from '../services/push';
import type { Server as SocketIOServer } from 'socket.io';

// NOTE: Auction (bids) routes are handled in listings.ts:
//   POST /api/listings/:id/bids  — placeBid
//   GET  /api/listings/:id/bids  — getBids

export function createAuctionsRouter(deps: { io: SocketIOServer }) {
  const { io } = deps;
  const router = Router();

  // Future standalone auction routes will be added here.

  return router;
}
