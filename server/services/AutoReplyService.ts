// server/services/AutoReplyService.ts
//
// Optional B2B chat auto-responder. When a user messages a B2B seller who
// has enabled auto-reply, we insert a polite acknowledgement as a message
// FROM the seller TO the original sender.
//
// Safety:
// * Never blocks the original message send — the route fires this
//   fire-and-forget.
// * Infinite-loop guard: auto-reply messages are marked with
//   system_warning='auto_reply' and we skip if the triggering message
//   itself has that marker.
// * AI is optional: if GEMINI_API_KEY is missing, we fall back to a
//   hardcoded Latvian message.

import type { Server as SocketIOServer } from 'socket.io';
import db from '../pg';
import { getGenAI } from '../utils/ai';

const AUTO_REPLY_MARKER = 'auto_reply';
const FALLBACK_TEXT = 'Paldies par ziņu! Drīzumā ar Jums sazināsimies.';

interface Receiver {
  id: number;
  user_type: string | null;
  auto_reply_enabled: number | null;
  auto_reply_text: string | null;
}

export interface MaybeAutoReplyArgs {
  senderId: number;
  receiverId: number;
  listingId: number | null;
  content: string;
  sourceMessageWarning: string | null;
  io: SocketIOServer;
}

export async function maybeAutoReply(args: MaybeAutoReplyArgs): Promise<void> {
  const { senderId, receiverId, listingId, content, sourceMessageWarning, io } = args;

  // Skip triggering auto-reply from an auto-reply — prevents infinite loops.
  if (sourceMessageWarning === AUTO_REPLY_MARKER) return;
  if (!content || !content.trim()) return;
  if (senderId === receiverId) return;

  let receiver: Receiver | null = null;
  try {
    receiver = (await db.get(
      `SELECT id, user_type, auto_reply_enabled, auto_reply_text
       FROM users WHERE id = ?`,
      [receiverId],
    )) as Receiver | null;
  } catch (e) {
    console.error('[auto-reply] failed to load receiver', e);
    return;
  }

  if (!receiver) return;
  if (receiver.user_type !== 'b2b') return;
  if (!receiver.auto_reply_enabled) return;

  let replyText = FALLBACK_TEXT;
  const instructions = receiver.auto_reply_text?.trim();

  if (process.env.GEMINI_API_KEY && instructions) {
    try {
      const ai = getGenAI();
      const prompt = `Esi pieklājīgs B2B pārdevēja asistents. Atbildi īsi (1–3 teikumi) latviešu valodā uz klienta ziņu.
Klienta ziņa: "${content.slice(0, 500)}"
${listingId ? `Par sludinājumu ID: ${listingId}` : ''}
Pārdevēja pamatinstrukcijas: "${instructions.slice(0, 500)}"

Atbildi TIKAI atbildes tekstu, bez papildu paskaidrojumiem vai pēdiņām.`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      const text = (response.text || '').trim();
      if (text) replyText = text.slice(0, 1000);
    } catch (e) {
      console.error('[auto-reply] AI generation failed, using fallback', e);
    }
  } else if (instructions) {
    // No AI but custom text exists — use that verbatim.
    replyText = instructions;
  }

  try {
    const info = await db.run(
      `INSERT INTO messages (sender_id, receiver_id, listing_id, content, is_phishing_warning, system_warning)
       VALUES (?, ?, ?, ?, false, ?)`,
      [receiver.id, senderId, listingId, replyText, AUTO_REPLY_MARKER],
    );
    const newMessage = await db.get(
      `SELECT * FROM messages WHERE id = ?`,
      [info.lastInsertRowid],
    );
    io.to(`user_${senderId}`).emit('new_message', { ...(newMessage as any), sender: 'other' });
    // Light notification so the original sender notices the reply.
    await db.run(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES (?, 'auto_reply', ?, ?, ?)`,
      [
        senderId,
        'Auto-atbilde',
        replyText.slice(0, 200),
        listingId ? `/listing/${listingId}` : '/chat',
      ],
    );
  } catch (e) {
    console.error('[auto-reply] failed to insert message', e);
  }
}
