# BalticMarket — Autentifikācijas plūsmas

Šis dokuments apraksta visas autentifikācijas plūsmas, kas pieejamas platformā, to HTTP kontraktus, drošības garantijas un operacionālās piezīmes. Kods atrodas [server/routes/auth.ts](../server/routes/auth.ts).

Automatizēts smoke tests: `npm run test:auth` — skat. [scripts/test-auth-flows.mjs](../scripts/test-auth-flows.mjs).

---

## 1. Email + parole login

**Endpoint:** `POST /api/auth/login`
**Fails:** [server/routes/auth.ts:285](../server/routes/auth.ts#L285)
**Rate limit:** `authLimiter` (skat. [server/middleware/rateLimit.ts](../server/middleware/rateLimit.ts))

**Request:**
```json
{ "email": "user@example.com", "password": "ParoleMinVarogs" }
```

**Response 200:**
```json
{
  "token": "<JWT, 7 dienas>",
  "user": { "id": "2", "email": "...", "role": "admin", "is_verified": 1, ... }
}
```

**Response 400:** `{ "error": "Invalid credentials" }` — gan nepareizs email, gan parole atgriež vienādu ziņojumu, nepaverot enumerāciju.

**Drošība:**
- Parole tiek hešēta ar bcrypt (10 salt rounds) pie reģistrācijas un reset
- JWT parakstīts ar `JWT_SECRET`, 7 dienu TTL
- Pilnīgs body validation caur `validateBody(loginSchema)` (Zod)

---

## 2. Email password reset (aizmirsta parole)

Divu soļu flow: `request-password-reset` → email ar saiti → `reset-password`.

### 2.1. Pieprasījums

**Endpoint:** `POST /api/auth/request-password-reset`
**Fails:** [server/routes/auth.ts:281](../server/routes/auth.ts#L281)

**Request:**
```json
{ "email": "user@example.com" }
```

**Response 200 (vienmēr, ja email formāts derīgs):**
```json
{
  "ok": true,
  "message": "Ja konts ar šo e-pastu eksistē, esam nosūtījuši paroles atjaunošanas saiti."
}
```

**Response 400:** tikai ja email sintakse nederīga.

**Ko tas dara iekšā:**
1. Meklē lietotāju ar `LOWER(email) = ?`
2. Ja lietotājs eksistē:
   - Atzīmē visus iepriekšējos neizmantotos tokens `used_at = NOW()` (lai derīga ir tikai jaunākā saite)
   - Ģenerē 32 baitu random token (`crypto.randomBytes(32).toString('hex')`) — 64 simboli URL'ā
   - SHA-256 hashē un saglabā `password_reset_tokens.token_hash` (DB satur tikai hash, nekad plaintext)
   - Ar `expires_at = NOW() + 1h` un `created_ip` no `X-Forwarded-For`/`socket.remoteAddress`
   - Sūta email ar saiti `${APP_URL}/reset-password?token=<raw>`
3. Ja lietotājs neeksistē: nedara neko — **tāds pats response** kā eksistences gadījumā → nav account enumeration

### 2.2. Reset

**Endpoint:** `POST /api/auth/reset-password`
**Fails:** [server/routes/auth.ts:341](../server/routes/auth.ts#L341)

**Request:**
```json
{ "token": "<hex 64 simboli>", "newPassword": "Mana jauna parole" }
```

**Response 200:** `{ "ok": true, "message": "Parole atjaunota..." }`

**Response 400:**
- `"Nederīga paroles atjaunošanas saite"` — token < 32 simboli
- `"Parolei jābūt vismaz 10 simbolus garai"` — min garums
- `"Parole pārāk gara"` — max 200 simboli
- `"Šī parole ir nopludināta publiskos datu noplūdes sarakstos..."` — haveibeenpwned match
- `"Saite nederīga vai novecojusi. Lūdzu, pieprasi jaunu."` — token nav DB / used_at IS NOT NULL / expires_at < NOW()

**Paroles politika** ([server/utils/passwordCheck.ts](../server/utils/passwordCheck.ts)):
- Min 10 simboli, max 200
- `haveibeenpwned.com` k-anonymity lookup — sūtam tikai SHA-1 hash pirmos 5 simbolus, scan response par atlikušajiem. **Parole nekad neaiziet ārā no servera.**
- Timeout 1.5s, fail open (ja API nereaģē, paroli atļaujam — drošāk nekā pilnīgi bloķēt reset, ja HTTPS uz ārpasaulē pagaidām nedarbojas)

**Transaction garantijas** (pēc veiksmīga reset):
1. `UPDATE users SET password_hash = ?`
2. `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?`
3. `UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL` — **anulē arī citus vēl aktīvus tokens** šim lietotājam (aizsargā, ja vairāki tokens tika izsniegti paralēli)

---

## 3. Phone OTP — login un register

Twilio Verify API ar SMS kanālu. Lokālā izstrādē (bez Twilio env) fallback uz hardcoded kodu `123456`.

### 3.1. Koda pieprasījums

**Endpoint:** `POST /api/auth/request-otp`
**Fails:** [server/routes/auth.ts:21](../server/routes/auth.ts#L21)

**Request:**
```json
{ "phone": "+37120000000" }
```

**Response 200:** `{ "message": "OTP sent successfully" }` vai `{ "message": "OTP sent (simulated)", "simulated": true }` (dev only).

**Produkcijā** (`NODE_ENV=production`) bez Twilio env — atgriež **503**, nevis simulē.

### 3.2. Koda apstiprināšana — `mode` parametrs

**Endpoint:** `POST /api/auth/verify-otp`
**Fails:** [server/routes/auth.ts:58](../server/routes/auth.ts#L58)

**Request (login):**
```json
{ "phone": "+37120000000", "code": "123456", "mode": "login" }
```

**Request (register, B2B):**
```json
{
  "phone": "+37120000000", "code": "123456", "mode": "register",
  "name": "Valdis", "user_type": "b2b",
  "company_name": "SIA Test", "company_reg_number": "40003123456", "company_vat": "LV40003123456"
}
```

**Response 200:**
```json
{ "token": "<JWT>", "user": { "id": "...", "phone": "...", "role": "user", ... } }
```

**Response 400 ar `code`:**
- `"NOT_REGISTERED"` — `mode=login` un telefons neeksistē. `hint: "register"` norāda, ka klientam vajadzētu piedāvāt reģistrāciju.
- `"ALREADY_REGISTERED"` — `mode=register` un telefons jau eksistē. `hint: "login"` norāda uz login pāreju.

**Backward compat:** Ja `mode` nav padots, endpoint veic **auto-create** kā iepriekš (vecie mobile app klienti turpina strādāt).

**Jauniem kontiem** (register mode vai legacy auto-create) `INSERT` ievada arī `user_type`, `company_name`, `company_reg_number`, `company_vat` un piešķir `50` reģistrācijas bonusa punktus ar `points_history` ierakstu.

### 3.3. Frontend integrācija

- [src/pages/Login.tsx](../src/pages/Login.tsx) sūta `mode: 'login'`. Pēc `NOT_REGISTERED` rāda `window.confirm` ar pāreju uz `/register?method=phone&phone=<prefill>`.
- [src/pages/Register.tsx](../src/pages/Register.tsx) sūta `mode: 'register'`. Pēc `ALREADY_REGISTERED` rāda pāreju uz `/login?method=phone&phone=<prefill>`.

---

## 4. Smart-ID (simulēts)

**Status:** Simulēts. Ražošanā prasa `SMART_ID_PROVIDER_URL` env; bez tā `smartIdGuard` middleware atgriež 503.

**Endpoints:**
- `POST /api/auth/smart-id/register/init` + `/status`
- `POST /api/auth/smart-id/login/init` + `/status`
- `POST /api/auth/smart-id/status` — verifikācijas completion (+ 300 punkti)

**Fails:** [server/routes/auth.ts:117](../server/routes/auth.ts#L117)

**Kas paliek ieviests:**
1. Īstas Dokobit / Smart-ID API integrācija
2. Session ID nodrošināšana caur Redis / DB (pašlaik tikai response payload)
3. Personas koda reāla validācija (LV/EE/LT checksum)

Frontend [src/pages/Profile.tsx:550](../src/pages/Profile.tsx#L550) jau prasa derīgu personas kodu (LV `^\d{6}-\d{5}$`) pirms sūta backend.

---

## 5. Drošības garantijas visām plūsmām

| Aspekts | Vērtība | Kur |
|---|---|---|
| JWT TTL | 7 dienas | auth.ts |
| bcrypt salt rounds | 10 | login + register + reset |
| Paroles min garums | 10 simboli | passwordCheck.ts |
| Paroles max garums | 200 simboli | passwordCheck.ts |
| Breached password check | haveibeenpwned.com k-anonymity | passwordCheck.ts |
| Reset token | 32 baiti random, SHA-256 DB | auth.ts |
| Reset token TTL | 60 minūtes | auth.ts `RESET_TOKEN_TTL_MINUTES` |
| Reset token vienreizējs | `used_at` timestamp | auth.ts |
| Rate limit | `authLimiter` uz visiem auth endpointiem | [middleware/rateLimit.ts](../server/middleware/rateLimit.ts) |
| Account enumeration aizsardzība | Generic 200 response uz request-password-reset | auth.ts |
| OTP dev fallback | `123456` tikai ne-produkcijā | auth.ts |
| Phone register/login intent | `mode` parametrs | auth.ts |
| Stripe webhook verification | `stripe.webhooks.constructEvent` | [server/routes/payments.ts](../server/routes/payments.ts) |

---

## 6. Env mainīgie

**Obligāti produkcijā:**
- `DATABASE_URL` — PostgreSQL (Neon)
- `JWT_SECRET` — JWT parakstīšanai
- `RESEND_API_KEY` — email sūtīšanai
- `RESEND_FROM_EMAIL` — From adrese
- `APP_URL` — reset saites bāzes URL

**Obligāti SMS:**
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`

**Ja nav Twilio** — `NODE_ENV !== 'production'` → simulēts OTP; produkcijā → 503.

**Smart-ID produkcijai:** `SMART_ID_PROVIDER_URL` (pagaidām placeholder — bez īstas integrācijas).

---

## 7. Automatizēta verifikācija

Palaist smoke testu pret lokālo dev serveri:

```bash
npm run dev      # vienā terminālā
npm run test:auth # citā terminālā
```

Testi pārklāj:
- Login (correct / wrong password / invalid token)
- `/me` auth middleware
- Password reset: enumeration protection, TTL, one-time, weak + breached password
- Phone mode: NOT_REGISTERED, ALREADY_REGISTERED, legacy backwards compat, B2B lauku saglabāšana

Pēc testiem tiek dzēsti visi sintētiskie test phones — DB paliek tīra.
