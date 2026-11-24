CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  email_verified INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS auctions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT DEFAULT 'active',
  start_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,
  min_bid INTEGER NOT NULL,
  min_increment INTEGER NOT NULL,
  highest_bid_id INTEGER,
  winner_id INTEGER,
  winner_paid INTEGER DEFAULT 0,
  ad_data TEXT,
  ad_approved INTEGER DEFAULT 0,
  ad_active_until INTEGER,
  stripe_session_id TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS bids (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  auction_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (auction_id) REFERENCES auctions(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  ad_views INTEGER DEFAULT 0,
  ad_clicks INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS hall_of_fame (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  auction_id INTEGER NOT NULL,
  winner_email TEXT NOT NULL,
  winning_bid INTEGER NOT NULL,
  ad_data TEXT,
  ended_at INTEGER NOT NULL,
  FOREIGN KEY (auction_id) REFERENCES auctions(id)
);

CREATE INDEX IF NOT EXISTS idx_bids_auction ON bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_bids_amount ON bids(amount DESC);
CREATE INDEX IF NOT EXISTS idx_stats_date ON stats(date);