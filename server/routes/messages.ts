import { Router } from 'express';
import db from '../pg';
import { requireAuth } from '../utils/auth';
import { sendPushToUser } from '../services/push';
import { maybeAutoReply } from '../services/AutoReplyService';
import { getGenAI } from '../utils/ai';
import type { Server as SocketIOServer } from 'socket.io';

export function createMessagesRouter(deps: { io: SocketIOServer }) {
  const { io } = deps;
  const router = Router();

  // All message routes require a valid session — apply once instead of
  // re-implementing JWT parsing per handler.
  router.use(requireAuth);

  // GET /api/messages/unread-count
  router.get('/unread-count', async (req: any, res) => {
    try {
      const userId = req.userId as number;

      const result = await db.get(`
        SELECT COUNT(*) as count
        FROM messages
        WHERE receiver_id = ? AND is_read = 0
      `, [userId]) as { count: number | string };

      res.json({ count: Number(result.count) });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ error: 'Server error fetching unread count' });
    }
  });

  // GET /api/messages/conversations
  router.get('/conversations', async (req: any, res) => {
    try {
      const userId = req.userId as number;

      const conversations = await db.all(`
        SELECT
          m.id,
          CASE WHEN m.content = '' AND m.image_url IS NOT NULL THEN 'Attēls' ELSE m.content END as lastMessage,
          m.created_at as time, m.is_read,
          CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END as other_user_id,
          u.name as other_user_name,
          l.id as listing_id, l.title as item,
          (SELECT COUNT(*) FROM messages WHERE receiver_id = ? AND sender_id = other_user_id AND is_read = 0) as unread
        FROM messages m
        JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
        LEFT JOIN listings l ON m.listing_id = l.id
        WHERE m.id IN (
          SELECT MAX(id)
          FROM messages
          WHERE sender_id = ? OR receiver_id = ?
          GROUP BY CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END, listing_id
        )
        ORDER BY m.created_at DESC
      `, [userId, userId, userId, userId, userId, userId]);

      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ error: 'Server error fetching conversations' });
    }
  });

  // GET /api/messages/:otherUserId
  router.get('/:otherUserId', async (req: any, res) => {
    try {
      const userId = req.userId as number;
      const otherUserId = req.params.otherUserId;
      const listingId = req.query.listingId;

      let query = `
        SELECT m.*,
          CASE WHEN m.sender_id = ? THEN 'me' ELSE 'other' END as sender,
          o.amount as offer_amount, o.status as offer_status
        FROM messages m
        LEFT JOIN offers o ON m.offer_id = o.id
        WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
      `;
      const params: any[] = [userId, userId, otherUserId, otherUserId, userId];

      if (listingId) {
        query += ` AND m.listing_id = ?`;
        params.push(listingId);
      }

      query += ` ORDER BY m.created_at ASC`;

      const messages = await db.all(query, params);

      // Mark as read
      let updateQuery = `UPDATE messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ?`;
      const updateParams: any[] = [userId, otherUserId];
      if (listingId) {
        updateQuery += ` AND listing_id = ?`;
        updateParams.push(listingId);
      }
      await db.run(updateQuery, updateParams);

      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Server error fetching messages' });
    }
  });

  // POST /api/messages
  router.post('/', async (req: any, res) => {
    try {
      const senderId = req.userId as number;
      const { receiverId, listingId, content, image_url } = req.body;

      if (!receiverId || (!content && !image_url)) {
        return res.status(400).json({ error: 'Receiver and content or image are required' });
      }

      // Verify the recipient exists so we don't create orphaned message rows.
      const receiver = await db.get('SELECT id FROM users WHERE id = ?', [receiverId]);
      if (!receiver) return res.status(404).json({ error: 'Saņēmējs nav atrasts' });

      let isPhishingWarning = 0;
      let systemWarning = null;

      // Phishing check
      if (content && process.env.GEMINI_API_KEY) {
        try {
          const ai = getGenAI();
          const prompt = `Analyze this chat message for phishing or scams in a marketplace context.
          Message: "${content}"

          Respond ONLY with JSON:
          {
            "action": "allow" | "block" | "warn",
            "reason": "If warn or block, explain briefly in Latvian why."
          }

          Block if it contains obvious fake courier links (e.g. DPD/Omniva fake links).
          Warn if it asks to transfer money in advance ("pārskaiti avansu", "drošības nauda").
          Allow otherwise.`;

          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
          });

          const resultText = response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || '{}';
          const result = JSON.parse(resultText);

          if (result.action === 'block') {
            return res.status(400).json({ error: 'Ziņa bloķēta drošības apsvērumu dēļ: ' + result.reason });
          } else if (result.action === 'warn') {
            isPhishingWarning = 1;
            systemWarning = result.reason;
          }
        } catch (aiError) {
          console.error('AI Phishing check error:', aiError);
        }
      }

      const info = await db.run(
        'INSERT INTO messages (sender_id, receiver_id, listing_id, content, image_url, is_phishing_warning, system_warning) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [senderId, receiverId, listingId || null, content || '', image_url || null, isPhishingWarning, systemWarning]
      );

      const message = await db.get(`
        SELECT m.*, 'me' as sender
        FROM messages m
        WHERE id = ?
      `, [info.lastInsertRowid]);

      // Emit the message to the receiver
      io.to(`user_${receiverId}`).emit('new_message', {
        ...(message as any),
        sender: 'other', // from the receiver's perspective, the sender is 'other'
      });

      if (content) {
        sendPushToUser(receiverId, {
          title: 'Jauna ziņa',
          body: content.length > 60 ? content.slice(0, 60) + '...' : content,
          url: `/chat`,
        }).catch(e => console.error('Push error:', e));
      }

      // Fire-and-forget B2B auto-responder. Must not block or fail the
      // original message send.
      maybeAutoReply({
        senderId,
        receiverId,
        listingId: listingId || null,
        content: content || '',
        sourceMessageWarning: systemWarning,
        io,
      }).catch(e => console.error('[auto-reply] unexpected', e));

      res.json(message);
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ error: 'Server error sending message' });
    }
  });

  return router;
}
