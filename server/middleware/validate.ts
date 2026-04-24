import { z, ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validācijas kļūda',
        details: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data;
    next();
  };
}

export const registerSchema = z.object({
  email: z.string().email('Nederīga e-pasta adrese').max(255),
  password: z.string().min(8, 'Parole jābūt vismaz 8 simboliem').max(100),
  name: z.string().min(2, 'Vārds jābūt vismaz 2 simboliem').max(50),
  phone: z.string().max(20).optional().nullable(),
  user_type: z.enum(['c2c', 'b2b']).optional(),
  company_name: z.string().max(100).optional().nullable(),
  company_reg_number: z.string().max(20).optional().nullable(),
  company_vat: z.string().max(20).optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().email('Nederīga e-pasta adrese'),
  password: z.string().min(1, 'Parole ir obligāta'),
});

export const listingSchema = z.object({
  title: z.string().min(3, 'Nosaukumam jābūt vismaz 3 simboliem').max(100),
  description: z.string().max(5000).optional().nullable(),
  price: z.number({ error: 'Cenai jābūt skaitlim' }).min(0).max(10_000_000),
  category: z.string().min(1, 'Kategorija ir obligāta'),
  image_url: z.string().optional().nullable(),
  attributes: z.record(z.string(), z.unknown()).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  is_auction: z.boolean().optional(),
  auction_end_date: z.string().datetime({ offset: true }).optional().nullable(),
  listing_type: z.enum(['sale', 'rent', 'auction', 'free', 'exchange', 'giveaway', 'offer']).optional(),
  exchange_for: z.string().max(200).optional().nullable(),
  video_url: z.string().url().optional().nullable(),
});
