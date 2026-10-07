# Rundori Receipt Web

Staff-only order management and private digital receipts for Rundori Shoe Care Studio, Tangerang. Next.js App Router, TypeScript, Tailwind, Supabase Auth/Postgres, private Cloudflare R2, optional Resend and Twilio WhatsApp.

## Access

- `/` and unknown URLs: minimal branded unavailable page. No public homepage or navigation.
- `/admin/login`: invited staff login. No signup or customer account.
- `/admin`: dashboard, orders, create/edit, per-item before/after photos, review and send, settings.
- `/r/<token>`: read-only receipt with 32 cryptographically random bytes encoded as a 43-character base64url token. Postgres stores only SHA-256; links expire after 365 days, can be revoked, and regenerate on reconfirmation.
- Every admin page and API verifies Supabase `getUser()` and an active `staff_members` row. RLS checks the live staff allowlist. A signed-in nonstaff user has no transaction access and cannot grant itself staff membership.
- The receipt lookup Edge Function validates the capability token and selects only customer-facing columns with its server-side credential. Anonymous table grants are revoked. Internal notes, contacts, token hashes, and delivery logs are excluded from public lookup.
- Public photo access uses ten-minute HMAC-signed GET URLs through a small Cloudflare Worker bound to a private R2 bucket. PUT/DELETE require their own method-specific signature. No bucket listing or public R2 domain. Photo URLs already issued can work until expiry after receipt revocation.
- No analytics, no receipt cache, `no-referrer`, `noindex`, frame denial. Hosting logs can still contain receipt path tokens; restrict log access/retention. The Worker redacts signed URL query strings.

## Local development

1. Node 24, `npm ci`.
2. Copy `.env.example` to `.env.local` and configure actual values. Never commit environment files.
3. `npm run dev`; staff entry is `http://127.0.0.1:3000/admin/login`.
4. `npm run typecheck`, `npm run build`, `npm test`.

The included Playwright tests verify anonymous route behavior and can exercise the full multi-item/photo/edit/confirm/rotate receipt workflow with a dedicated owner-provisioned test staff account. Set `TEST_STAFF_EMAIL` and `TEST_STAFF_PASSWORD` in ignored `.env.test.local`; set `TEST_BASE_URL` to run against a deployment. Do not use real customer contacts for automated tests. Fixtures are marked test images. Tests deliberately do not send email or WhatsApp messages.

## Supabase setup

Apply `supabase/migrations/20261007082947_rundori_receipts.sql` to the Rundori project. Deploy `supabase/functions/receipt-lookup/index.ts` as `receipt-lookup`, `verify_jwt=false`: its custom authentication is the 256-bit receipt token. Never enable anonymous receipt table reads.

Create/invite staff through Supabase Dashboard → Authentication → Users, then enroll the intended user in SQL Editor:

```sql
insert into public.staff_members(user_id)
select id from auth.users where email = 'YOUR_STAFF_EMAIL'
on conflict(user_id) do update set active = true;
```

Disable public signup in the Supabase Auth dashboard; the app has no signup interface and RLS denies unlisted accounts even if signup is enabled. To revoke staff access immediately, set `active=false`; also revoke sessions/ban the user in Auth. No browser or Next.js service-role credential is needed. If an invite is used, configure Auth Site URL and redirect allowlist to the intended staff entry; accept the invite and set the password using Supabase's dashboard/email flow. Existing password users can sign in directly.

After schema changes run security and performance advisors. Initial unused-index notices are expected before traffic; foreign-key and status indexes are retained intentionally.

The final security advisor reports only `auth_leaked_password_protection`: Supabase's breached-password check requires Pro ([documentation](https://supabase.com/docs/guides/auth/password-security)). It was left disabled to keep the requested Free plan. Table RLS and access checks have no security advisor findings.

## Verified workflow

On 7 October 2026, the owner-signed-in staff session created a marked sample with two items, Rp150,000 total, Rp50,000 paid and Rp100,000 outstanding. Four client-compressed photos were uploaded to private R2 (single before/after uploads and multiple selection), status was edited to ready, and confirmation produced a working customer receipt. Both token rotation and revocation were checked: superseded/revoked links became unavailable. The mobile receipt loaded its signed photos without horizontal overflow; internal staff notes were excluded. Optional paid-message providers were not exercised because credentials are absent.

## Cloudflare photo storage

Private Standard bucket: `rundori-shoe-photos` (APAC). Photo gateway: `rundori-photo-gateway` using `cloudflare/wrangler.jsonc`. Generate a 32-byte signing secret and save it as Worker `PHOTO_GATEWAY_SECRET` and Vercel sensitive env `PHOTO_GATEWAY_SECRET`. `PHOTO_GATEWAY_URL` is the gateway's workers.dev HTTPS origin. Do not put secrets in Wrangler config.

Photos are resized to a maximum 1600-pixel edge and compressed to WebP, targeting ≤500 KB. Uploads are per file with progress, retries can be selected manually, and partial failures preserve successful uploads. Server and gateway reject invalid WebP and payloads over 800 KB. Maximum 12 photos per phase per item in the application API; HEIC requires browser decoding support or conversion to JPEG. Removing an item removes its photo metadata; associated objects must be purged separately if needed. Set a lifecycle/retention policy appropriate for the business to avoid indefinite storage growth.

## Optional delivery setup

**Resend Free:** verify a domain you own in Resend, add its required DNS records, then set server-only `RESEND_API_KEY` and `RESEND_FROM=Rundori <receipts@verified-domain>`. Redeploy. Email without a configured provider is disabled in the confirmation UI; copying links remains available. HTML is escaped and a plain-text alternative is included.

**Twilio WhatsApp:** configure an approved sender, opt-in process, and approved transactional/utility Content template. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM=whatsapp:+...`, and `TWILIO_CONTENT_SID`. Template variables: `1` customer name, `2` receipt number, `3` the 43-character token used in the template's URL button (`https://YOUR_APP_DOMAIN/r/{{3}}`). Redeploy. Do not use free-form business-initiated WhatsApp outside the customer-service window. Provider acceptance is recorded, not a delivered/read confirmation. Provider webhooks are not implemented. If a request times out, check provider logs before retrying; reconfirming rotates the link and may invalidate a previously sent message. Resend receives an idempotency key; Twilio requests do not automatically retry.

**Manual WhatsApp:** works without a Twilio account or billing. Confirm, copy the private link, or open the prepared WhatsApp message; staff clicks Send in WhatsApp. Customer contact CTA defaults to the actual WhatsApp contact QR destination decoded from the flyer. Set `RUNDORI_WHATSAPP_NUMBER` to the studio's international number if a personalized order-reference message is desired.

## Deployment

GitHub: `medissl/rundori-receipt-web`. Vercel project: `rundori-receipt-web`, Node 24, Singapore functions. Set `APP_URL` to the canonical deployment origin. Supabase URL and publishable key are public configuration; the photo signing secret and delivery credentials must be sensitive/server-only. Customer receipts require disabling the outer Vercel authentication gate; the app still enforces staff auth and capability links.

Keep free plans; no purchases/upgrades are required for the configured core. Vercel plan eligibility for business use must be checked by the owner; migrate hosting if the selected plan's terms do not cover intended production use. R2 can charge beyond its included usage; no plan upgrade is performed by this app.

## Brand

`public/rundori-logo.png` is the actual artwork extracted from the uploaded A5 flyer, including the shoe-shaped R. The lime is matched to the supplied artwork. Flyer location, studio name, Instagram, and contact QR are reused. Screenshot references informed the receipt information hierarchy only.
