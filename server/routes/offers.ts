import { Router } from 'express';
import db from '../pg';
import { requireAuth, JWT_SECRET } from '../utils/auth';
import { sendPushToUser } from '../services/push';
import { sendEmail, emailTemplates } from '../services/email';
import type { Server as SocketIOServer } from 'socket.io';

// NOTE: The primary offers routes are handled in listings.ts:
//   POST /api/listings/:id/offers  — createOffer
//
// The following routes were expected here but do not yet exist in the codebase
// and are reserved for future implementation:
//   GET  /api/users/me/offers/received
//   GET  /api/users/me/offers/sent
//   PATCH /api/offers/:id/status

export function createOffersRouter(deps: { io: SocketIOServer }) {
  const { io } = deps;
  const router = Router();

  // Future standalone offers routes will be added here.

  return router;
}
