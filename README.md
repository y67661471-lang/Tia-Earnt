# Tia-Earnt

Next.js Telegram Mini App with Telegram-authenticated sessions and a PostgreSQL wallet.

## Environment

Configure these variables in the hosting environment (never commit real credentials):

- `DATABASE_URL` — PostgreSQL connection string.
- `TELEGRAM_BOT_TOKEN` — bot token used only by server-side Telegram signature verification.
- `NEXT_PUBLIC_APP_URL` — canonical app origin used by the API origin check.
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` — Telegram bot username without the leading `@`.
- `ADMIN_TELEGRAM_IDS` — comma-separated numeric Telegram user IDs permitted to access `/admin` and `/api/admin/users`.

## Database setup

1. Create the base database using `database/schema.sql`.
2. Apply migrations in `database/migrations/` in filename order. The secure referral migration is `20261116_secure_referrals.sql`.
3. Restart the app after setting the environment variables.

The referral migration adds unique invite codes and a referral attribution table. It also assigns invite codes to existing accounts.

## Admin controls

1. Apply `20261116_admin_controls.sql` after the referral migration.
2. Set `ADMIN_TELEGRAM_IDS` to the numeric Telegram ID(s) of trusted administrators. Do not use usernames; keep this variable server-side and never prefix it with `NEXT_PUBLIC_`.
3. Open `/admin` while signed in with an allowlisted Telegram account. The API independently checks the authenticated session and allowlist on every request.
4. Admins can block or unblock accounts. Changes are transactional and written to `admin_audit_log`; an admin cannot change their own status. Blocking prevents the account from using its session.

The admin page does not approve tasks, issue rewards, change wallet balances, or make withdrawals. Those workflows remain separate and require their own verification and audit rules.

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
