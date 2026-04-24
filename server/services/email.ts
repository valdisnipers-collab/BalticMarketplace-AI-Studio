import { Resend } from 'resend';

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.RESEND_FROM_EMAIL ?? 'BalticMarket <noreply@balticmarket.lv>';
const APP_URL = process.env.APP_URL ?? 'https://balticmarket.lv';

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!resend) {
    console.log(`[EMAIL SIMULATED] To: ${to} | Subject: ${subject}`);
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (e) {
    console.error('[EMAIL ERROR]', e);
  }
}

export const emailTemplates = {
  newListingMatch: (userName: string, listingTitle: string, listingPrice: number, listingId: number) => ({
    subject: 'Jauns sludinājums atbilst jūsu meklēšanai | BalticMarket',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #E64415;">Jauns sludinājums!</h2>
        <p>Sveiks, <strong>${esc(userName)}</strong>!</p>
        <p>Ir pievienots jauns sludinājums <strong>"${esc(listingTitle)}"</strong>
           par <strong>€${esc(String(listingPrice))}</strong>, kas atbilst jūsu saglabātajam meklējumam.</p>
        <a href="${APP_URL}/listing/${listingId}"
           style="display: inline-block; background: #E64415; color: white;
                  padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          Skatīt sludinājumu
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">
          BalticMarket — Latvijas sludinājumu portāls
        </p>
      </div>
    `,
  }),

  orderShipped: (buyerName: string, listingTitle: string, orderId: number) => ({
    subject: 'Jūsu pasūtījums ir nosūtīts | BalticMarket',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #E64415;">Pasūtījums nosūtīts!</h2>
        <p>Sveiks, <strong>${esc(buyerName)}</strong>!</p>
        <p>Jūsu pasūtījums <strong>"${esc(listingTitle)}"</strong> ir nodots piegādei.</p>
        <a href="${APP_URL}/profile?tab=orders"
           style="display: inline-block; background: #E64415; color: white;
                  padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          Skatīt pasūtījumu #${orderId}
        </a>
      </div>
    `,
  }),

  orderCompleted: (sellerName: string, listingTitle: string, amount: number) => ({
    subject: 'Pārdevums pabeigts — nauda ieskaitīta | BalticMarket',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #22c55e;">Nauda ieskaitīta!</h2>
        <p>Sveiks, <strong>${esc(sellerName)}</strong>!</p>
        <p>Pircējs apstiprinājis saņemšanu. <strong>€${esc(String(amount))}</strong>
           par "${esc(listingTitle)}" ir ieskaitīti jūsu kontā.</p>
        <a href="${APP_URL}/profile?tab=wallet"
           style="display: inline-block; background: #22c55e; color: white;
                  padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          Skatīt maku
        </a>
      </div>
    `,
  }),

  passwordReset: (userName: string, resetUrl: string, expiresInMinutes: number) => ({
    subject: 'Paroles atjaunošana | BalticMarket',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #E64415;">Paroles atjaunošana</h2>
        <p>Sveiks, <strong>${esc(userName)}</strong>!</p>
        <p>Saņemts pieprasījums atjaunot paroli Jūsu BalticMarket kontam. Ja tas biji Tu, nospied pogu zemāk, lai iestatītu jaunu paroli:</p>
        <a href="${resetUrl}"
           style="display: inline-block; background: #E64415; color: white;
                  padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          Iestatīt jaunu paroli
        </a>
        <p style="color: #666; font-size: 13px; margin-top: 24px;">
          Šī saite derīga <strong>${expiresInMinutes} minūtes</strong>. Ja Tu nepieprasīji paroles atjaunošanu, ignorē šo e-pastu — Tava parole paliks nemainīga.
        </p>
        <p style="color: #999; font-size: 11px; margin-top: 16px; word-break: break-all;">
          Ja poga nestrādā, iekopē šo saiti pārlūkā:<br>${esc(resetUrl)}
        </p>
      </div>
    `,
  }),

  disputeResolved: (userName: string, resolution: 'refund' | 'release', orderId: number) => ({
    subject: 'Strīds atrisināts | BalticMarket',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #E64415;">Strīds atrisināts</h2>
        <p>Sveiks, <strong>${esc(userName)}</strong>!</p>
        <p>${resolution === 'refund'
          ? 'Lēmums pieņemts jūsu labā — nauda tiek atmaksāta.'
          : 'Lēmums pieņemts pārdevēja labā — nauda pārskaitīta.'}
        </p>
        <a href="${APP_URL}/profile?tab=orders"
           style="display: inline-block; background: #E64415; color: white;
                  padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          Skatīt pasūtījumu #${orderId}
        </a>
      </div>
    `,
  }),
};
