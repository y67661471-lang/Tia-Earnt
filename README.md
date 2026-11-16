# Tia-Earnt

Next.js Telegram Mini App with Telegram-authenticated sessions and a PostgreSQL wallet.

## Environment

Configure these variables in the hosting environment (never commit real credentials):

- `DATABASE_URL` — PostgreSQL connection string.
- `TELEGRAM_BOT_TOKEN` — bot token used only by server-side Telegram signature verification.
- `NEXT_PUBLIC_APP_URL` — canonical app origin used by the API origin check.
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` — Telegram bot username without the leading `@`.

## Database setup

1. Create the base database using `database/schema.sql`.
2. Apply migrations in `database/migrations/` in filename order. The secure referral migration is `20261116_secure_referrals.sql`.
3. Restart the app after setting the environment variables.

The referral migration adds unique invite codes and a referral attribution table. It also assigns invite codes to existing accounts.

## Referral behavior

- Invite links use Telegram Mini App deep links with a `startapp=ref_<code>` parameter.
- Attribution is accepted only from Telegram `initData` after its HMAC signature and freshness are verified.
- Only first-time Telegram accounts are attributed; a referred account can be linked once, and self-referrals are rejected.
- Referral counts are read from the authenticated API. Registration alone does not credit a wallet reward.
- Qualification and reward issuance are intentionally not enabled until an anti-abuse policy and trusted verification/admin approval workflow are configured.

## Development

- `npm run dev` — local development server.
- `npm run build` — production build.
- `npm start` — production server.

There is currently no automated test or lint script configured in `package.json`.
