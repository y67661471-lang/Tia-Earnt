
"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  PlayCircle,
  ListTodo,
  Users,
  Wallet,
  UserRound,
  ShieldCheck,
  RefreshCw,
  Gift,
  Trophy,
  ArrowDownToLine,
  CalendarCheck,
  Dices,
  Ticket,
  Megaphone,
  LogOut,
  LoaderCircle,
} from "lucide-react";

type Tab =
  | "home"
  | "earn"
  | "tasks"
  | "referral"
  | "wallet"
  | "profile";

type Profile = {
  id: string;
  telegramId: string;
  firstName: string;
  lastName: string;
  username: string;
  status: string;
};

type Balance = {
  balance: string;
  totalEarned: string;
  totalWithdrawn: string;
};

type TelegramApp = {
  initData: string;
  ready: () => void;
  expand: () => void;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramApp;
    };
  }
}

const tabs = [
  { id: "home", title: "Home", icon: Home },
  { id: "earn", title: "Earn", icon: PlayCircle },
  { id: "tasks", title: "Tasks", icon: ListTodo },
  { id: "referral", title: "Refer", icon: Users },
  { id: "wallet", title: "Wallet", icon: Wallet },
  { id: "profile", title: "Profile", icon: UserRound },
] as const;

const features = [
  { title: "Watch Ads", icon: PlayCircle, tab: "earn" },
  { title: "Daily Tasks", icon: ListTodo, tab: "tasks" },
  { title: "Referral", icon: Users, tab: "referral" },
  { title: "Check-in", icon: CalendarCheck },
  { title: "Spin Wheel", icon: Dices },
  { title: "Lottery", icon: Ticket },
  { title: "Leaderboard", icon: Trophy },
  { title: "Channels", icon: Megaphone },
] as const;

function points(value: string) {
  try {
    return BigInt(value).toLocaleString("en-US");
  } catch {
    return "0";
  }
}

async function api(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    cache: "no-store",
    credentials: "same-origin",
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Request failed");
  }

  return result;
}

async function loadTelegramSdk() {
  if (window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }

  await new Promise<void>((resolve) => {
    const script = document.createElement("script");
    script.src =
      "https://telegram.org/js/telegram-web-app.js";
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });

  return window.Telegram?.WebApp;
}

export default function Page() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("home");
  const [user, setUser] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<Balance | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const loadAccount = useCallback(async () => {
    const [profile, balance] = await Promise.all([
      api("/api/me"),
      api("/api/wallet"),
    ]);

    setUser(profile.user);
    setWallet(balance.wallet);
  }, []);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        // First use an existing verified session.
        await loadAccount();
      } catch {
        const webApp = await loadTelegramSdk();

        if (!webApp?.initData) {
          if (active) router.replace("/login");
          return;
        }

        try {
          webApp.ready();
          webApp.expand();

          await api("/api/auth/telegram", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              initData: webApp.initData,
            }),
          });

          if (active) await loadAccount();
        } catch (error) {
          if (active) {
            setNotice(
              error instanceof Error
                ? error.message
                : "Telegram login failed"
            );
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [loadAccount, router]);

  async function refresh() {
    try {
      await loadAccount();
      setNotice("ব্যালেন্স আপডেট হয়েছে");
    } catch {
      setNotice("ব্যালেন্স আপডেট করা যায়নি");
    }
  }

  async function logout() {
    try {
      await api("/api/auth/logout", {
        method: "POST",
      });
      setUser(null);
      setWallet(null);
      router.replace("/login");
    } catch {
      setNotice("Logout failed");
    }
  }

  function select(next: Tab) {
    setTab(next);
    setNotice("");
    window.scrollTo(0, 0);
  }

  if (loading) {
    return (
      <main className="center-screen">
        <div className="brand-logo">T</div>
        <h1>Tia Earn</h1>
        <LoaderCircle className="spinning" />
        <p>অ্যাকাউন্ট যাচাই হচ্ছে...</p>
      </main>
    );
  }

  if (!user || !wallet) {
    return (
      <main className="center-screen">
        <div className="brand-logo">T</div>
        <h1>Tia Earn</h1>
        <p>{notice || "Login required"}</p>
        <button
          className="primary-button"
          onClick={() => router.push("/login")}
        >
          Browser Login
        </button>
        <button
          className="small-button"
          onClick={() => window.location.reload()}
        >
          Retry Telegram Login
        </button>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-logo small">T</div>
          <div>
            <strong>Tia Earn</strong>
            <small>Secure Earning Platform</small>
          </div>
        </div>
        <span className="secure-tag">
          <ShieldCheck size={15} />
          Verified
        </span>
      </header>

      <section className="main-content">
        {notice && (
          <div className="notice" role="status">
            {notice}
            <button onClick={() => setNotice("")}>
              ×
            </button>
          </div>
        )}

        {tab === "home" && (
          <>
            <section className="welcome-section">
              <p>স্বাগতম 👋</p>
              <h2>{user.firstName}</h2>
              <span>আপনার Tia Earn Dashboard</span>
            </section>

            <section className="balance-card">
              <div className="balance-top">
                <span>Available Balance</span>
                <button
                  className="refresh-button"
                  onClick={() => void refresh()}
                  aria-label="Refresh balance"
                >
                  <RefreshCw size={19} />
                </button>
              </div>
              <div className="balance-number">
                {points(wallet.balance)}
                <small> Points</small>
              </div>
              <p>Database verified balance</p>
              <button
                className="balance-action"
                onClick={() => select("wallet")}
              >
                <Wallet size={17} />
                My Wallet
              </button>
            </section>

            <div className="stats-grid">
              <div className="stat-card">
                <Gift size={22} />
                <strong>
                  {points(wallet.totalEarned)}
                </strong>
                <small>Total Earned</small>
              </div>
              <div className="stat-card">
                <ArrowDownToLine size={22} />
                <strong>
                  {points(wallet.totalWithdrawn)}
                </strong>
                <small>Total Withdrawn</small>
              </div>
            </div>

            <h3 className="section-title">
              Quick Actions
            </h3>

            <div className="feature-grid">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <button
                    key={feature.title}
                    className="feature-card"
                    onClick={() => {
                      if ("tab" in feature) {
                        select(feature.tab);
                      } else {
                        setNotice(
                          `${feature.title} শিগগিরই চালু হবে`
                        );
                      }
                    }}
                  >
                    <span className="feature-icon">
                      <Icon size={23} />
                    </span>
                    <strong>{feature.title}</strong>
                    <small>
                      {"tab" in feature
                        ? "Open"
                        : "Coming Soon"}
                    </small>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {tab === "earn" && (
          <>
            <h2 className="page-heading">Earn Points</h2>
            <p className="page-description">
              বিজ্ঞাপন দেখার রিওয়ার্ড যাচাই ব্যবস্থা
            </p>
            {["Monetag", "Adsgram", "GigaPub"].map(
              (provider) => (
                <div className="list-card" key={provider}>
                  <span className="list-icon">
                    <PlayCircle size={24} />
                  </span>
                  <div className="list-info">
                    <strong>{provider} Ads</strong>
                    <small>
                      Verification integration pending
                    </small>
                  </div>
                  <button
                    className="small-button"
                    disabled
                  >
                    Soon
                  </button>
                </div>
              )
            )}
          </>
        )}

        {tab === "tasks" && (
          <div className="empty-card">
            <ListTodo size={42} />
            <h3>Daily Tasks</h3>
            <p>
              যাচাইকৃত টাস্ক ও রিওয়ার্ড সিস্টেম
              পরবর্তী ধাপে যুক্ত হবে।
            </p>
          </div>
        )}

        {tab === "referral" && (
          <div className="empty-card">
            <Users size={42} />
            <h3>Referral System</h3>
            <p>
              Referral tracking এবং bonus
              verification যুক্ত হওয়ার পর
              আপনার লিংক এখানে দেখা যাবে।
            </p>
          </div>
        )}

        {tab === "wallet" && (
          <>
            <h2 className="page-heading">My Wallet</h2>
            <section className="balance-card">
              <div className="balance-top">
                <span>Available Balance</span>
                <Wallet size={22} />
              </div>
              <div className="balance-number">
                {points(wallet.balance)}
                <small> Points</small>
              </div>
              <p>Secure PostgreSQL Wallet</p>
            </section>
            <div className="stats-grid">
              <div className="stat-card">
                <Gift size={22} />
                <strong>
                  {points(wallet.totalEarned)}
                </strong>
                <small>Total Earned</small>
              </div>
              <div className="stat-card">
                <ArrowDownToLine size={22} />
                <strong>
                  {points(wallet.totalWithdrawn)}
                </strong>
                <small>Total Withdrawn</small>
              </div>
            </div>
            <button
              className="primary-button full-width"
              disabled
            >
              Withdraw — Coming Soon
            </button>
          </>
        )}

        {tab === "profile" && (
          <>
            <h2 className="page-heading">My Profile</h2>
            <div className="profile-card">
              <div className="profile-avatar">
                {user.firstName.charAt(0).toUpperCase()}
              </div>
              <h3>
                {user.firstName} {user.lastName}
              </h3>
              <p>
                {user.username
                  ? `@${user.username}`
                  : "Telegram User"}
              </p>
              <span className="profile-verified">
                <ShieldCheck size={15} />
                Verified
              </span>
            </div>
            <div className="details-card">
              <div>
                <span>Telegram ID</span>
                <strong>{user.telegramId}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{user.status}</strong>
              </div>
            </div>
            <button
              className="logout-button"
              onClick={() => void logout()}
            >
              <LogOut size={19} />
              Logout
            </button>
          </>
        )}
      </section>

      <nav className="bottom-navigation">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={
                tab === item.id ? "active" : ""
              }
              onClick={() => select(item.id)}
            >
              <Icon size={21} />
              <span>{item.title}</span>
            </button>
          );
        })}
      </nav>
    </main>
  );
}
