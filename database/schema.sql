
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  username TEXT,
  photo_url TEXT,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallets (
  user_id BIGINT PRIMARY KEY
    REFERENCES users(id) ON DELETE RESTRICT,
  balance BIGINT NOT NULL DEFAULT 0
    CHECK (balance >= 0),
  total_earned BIGINT NOT NULL DEFAULT 0
    CHECK (total_earned >= 0),
  total_withdrawn BIGINT NOT NULL DEFAULT 0
    CHECK (total_withdrawn >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL
    REFERENCES users(id) ON DELETE RESTRICT,
  amount BIGINT NOT NULL
    CHECK (amount <> 0),
  transaction_type TEXT NOT NULL
    CHECK (
      transaction_type IN (
        'reward',
        'withdrawal',
        'refund',
        'adjustment'
      )
    ),
  reference_id TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, reference_id)
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user
ON wallet_transactions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL
    REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user
ON auth_sessions(user_id);
