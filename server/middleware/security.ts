import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
  ? [
      'https://balticmarket.net',
      'https://www.balticmarket.net',
    ]
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:3000'];

export const corsMiddleware = cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'res.cloudinary.com', '*.cloudinary.com', 'images.unsplash.com', '*.unsplash.com', 'https:'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      connectSrc: ["'self'", 'wss:', 'ws:', 'https:'],
      mediaSrc: ["'self'", 'res.cloudinary.com', '*.cloudinary.com', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
});

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Pārāk daudz pieprasījumu. Mēģiniet vēlāk.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/assets') || req.path === '/favicon.ico',
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Pārāk daudz autentifikācijas mēģinājumu. Mēģiniet pēc 15 minūtēm.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { error: 'Augšupielāžu limits sasniegts. Mēģiniet pēc stundas.' },
  standardHeaders: true,
  legacyHeaders: false,
});
