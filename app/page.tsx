
"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
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
  CircleDollarSign,
  ArrowDownToLine,
  CalendarCheck,
  Dices,
  Ticket,
  Megaphone,
  LogOut,
  ChevronRight,
  AlertCircle,
  LoaderCircle,
  CheckCircle2,
} from "lucide-react";

type Tab =
  | "home"
  | "earn"
  | "tasks"
  | "referral"
  | "wallet"
  | "profile";

type UserData = {
  id: string;
  telegramId: string;
  firstName: string;
  lastName: string;
  username: string;
  photoUrl: string;
  status: string;
};

type WalletData = {
  balance: string;
  totalEarned: string;
  totalWithdrawn: string;
};

type TelegramWebApp = {
  initData: string;
  ready: () => void;
  expand: () => void;
  colorScheme?: string;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

const navigation = [
  { id: "home", title: "Home", icon: Home },
  { id: "earn", title: "Earn", icon: PlayCircle },
  { id: "tasks", title: "Tasks", icon: ListTodo },
  { id: "referral", title: "Refer", icon: Users },
  { id: "wallet", title: "Wallet", icon: Wallet },
  { id: "profile", title: "Profile", icon: UserRound },
] as const;

function formatPoints(value: string) {
  try {
    return BigInt(value).toLocaleString("en-US");
  } catch {
    return "0";
  }
}

async function getJson(
  url: string,
  options?: RequestInit
) {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || "Request failed"
    );
  }

  return data;
}

function FeatureCard({
  icon: Icon,
  title,
  subtitle,
  onClick,
  disabled = false,
}: {
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
  }>;
  title: string;
  subtitle: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="feature-card"
      onClick={onClick}
      disabled={disabled}
    >
      <span className="feature-icon">
        <Icon size={23} strokeWidth={2} />
      </span>
      <strong>{title}</strong>
      <small>{subtitle}</small>
    </button>
  );
}

export default function HomePage() {
  const [tab, setTab] = useState<Tab>("home");
  const [user, setUser] = useState<UserData | null>(
    null
  );
  const [wallet, setWallet] =
    useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadAccount = useCallback(async () => {
    const [profile, balance] = await Promise.all([
      getJson("/api/me"),
      getJson("/api/wallet"),
    ]);

    setUser(profile.user);
    setWallet(balance.wallet);
  }, []);

  const authenticate = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const webApp = window.Telegram?.WebApp;

      if (!webApp?.initData) {
        throw new Error(
          "এই অ্যাপটি Telegram Bot-এর Mini App থেকে খুলুন।"
        );
      }

      webApp.ready();
      webApp.expand();

      try {
        await loadAccount();
      } catch {
        await getJson("/api/auth/telegram", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            initData: webApp.initData,
          }),
        });

        await loadAccount();
      }
    } catch (err) {
      setUser(null);
      setWallet(null);
      setError(
        err instanceof Error
          ? err.message
          : "Login failed"
      );
    } finally {
      setLoading(false);
    }
  }, [loadAccount]);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      const scriptId = "telegram-webapp-sdk";

      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src =
          "https://telegram.org/js/telegram-web-app.js";
        script.async = true;

        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () =>
            reject(new Error("Telegram SDK failed"));
          document.head.appendChild(script);
        }).catch(() => {});
      }

      if (!cancelled) {
        await authenticate();
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [authenticate]);

  async function refreshWallet() {
    setRefreshing(true);
    setNotice("");

    try {
      await loadAccount();
      setNotice("ব্যালেন্স আপডেট হয়েছে");
    } catch {
      setNotice("ব্যালেন্স আপডেট করা যায়নি");
    } finally {
      setRefreshing(false);
    }
  }

  async function logout() {
    try {
      await getJson("/api/auth/logout", {
        method: "POST",
      });
      setUser(null);
      setWallet(null);
      setError("আপনি লগআউট করেছেন।");
    } catch {
      setNotice("Logout failed");
    }
  }

  function showUpcoming(feature: string) {
    setNotice(
      `${feature} ফিচারটি Backend Verification যুক্ত হওয়ার পর চালু হবে।`
    );
  }

  const goTo = (nextTab: Tab) => {
    setTab(nextTab);
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <main className="center-screen">
        <div className="brand-logo">T</div>
        <h1>Tia Earn</h1>
        <LoaderCircle
          className="spinning"
          size={30}
        />
        <p>নিরাপদ লগইন যাচাই হচ্ছে...</p>
      </main>
    );
  }

  if (!user || !wallet) {
    return (
      <main className="center-screen">
        <div className="brand-logo">T</div>
        <h1>Tia Earn</h1>
        <AlertCircle size={32} />
        <p>{error || "Login required"}</p>
        <button
          className="primary-button"
          onClick={() => void authenticate()}
        >
          আবার চেষ্টা করুন
        </button>
        <small>
          Telegram Mini App থেকে অ্যাপটি খুলতে হবে।
        </small>
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
            <AlertCircle size={17} />
            <span>{notice}</span>
            <button
              onClick={() => setNotice("")}
              aria-label="Close notice"
            >
              ×
            </button>
          </div>
        )}

        {tab === "home" && (
          <>
            <section className="welcome-section">
              <p>স্বাগতম 👋</p>
              <h2>{user.firstName}</h2>
              <span>
                আপনার Tia Earn ড্যাশবোর্ড
              </span>
            </section>

            <section className="balance-card">
              <div className="balance-top">
                <span>Available Balance</span>
                <button
                  className="refresh-button"
                  onClick={() => void refreshWallet()}
                  disabled={refreshing}
                  aria-label="Refresh balance"
                >
                  <RefreshCw
                    size={19}
                    className={
                      refreshing ? "spinning" : ""
                    }
                  />
                </button>
              </div>
              <div className="balance-number">
                {formatPoints(wallet.balance)}
                <small> Points</small>
              </div>
              <p>Database verified balance</p>
              <button
                className="balance-action"
                onClick={() => goTo("wallet")}
              >
                <Wallet size={17} />
                My Wallet
                <ChevronRight size={17} />
              </button>
            </section>

            <div className="stats-grid">
              <div className="stat-card">
                <CircleDollarSign size={22} />
                <strong>
                  {formatPoints(wallet.totalEarned)}
                </strong>
                <small>Total Earned</small>
              </div>
              <div className="stat-card">
                <ArrowDownToLine size={22} />
                <strong>
                  {formatPoints(wallet.totalWithdrawn)}
                </strong>
                <small>Total Withdrawn</small>
              </div>
            </div>

            <h3 className="section-title">
              Quick Actions
            </h3>
            <div className="feature-grid">
              <FeatureCard
                icon={PlayCircle}
                title="Watch Ads"
                subtitle="Earn Points"
                onClick={() => goTo("earn")}
              />
              <FeatureCard
                icon={ListTodo}
                title="Daily Tasks"
                subtitle="Complete Tasks"
                onClick={() => goTo("tasks")}
              />
              <FeatureCard
                icon={Users}
                title="Referral"
                subtitle="Invite Friends"
                onClick={() => goTo("referral")}
              />
              <FeatureCard
                icon={CalendarCheck}
                title="Check-in"
                subtitle="Daily Reward"
                onClick={() =>
                  showUpcoming("Daily Check-in")
                }
              />
              <FeatureCard
                icon={Dices}
                title="Spin Wheel"
                subtitle="Coming Soon"
                onClick={() =>
                  showUpcoming("Spin Wheel")
                }
              />
              <FeatureCard
                icon={Ticket}
                title="Lottery"
                subtitle="Coming Soon"
                onClick={() =>
                  showUpcoming("Lottery")
                }
              />
              <FeatureCard
                icon={Trophy}
                title="Leaderboard"
                subtitle="Coming Soon"
                onClick={() =>
                  showUpcoming("Leaderboard")
                }
              />
              <FeatureCard
                icon={Megaphone}
                title="Channels"
                subtitle="Coming Soon"
                onClick={() =>
                  showUpcoming("Channels")
                }
              />
            </div>
          </>
        )}

        {tab === "earn" && (
          <>
            <h2 className="page-heading">Earn Points</h2>
            <p className="page-description">
              বিজ্ঞাপন দেখে পয়েন্ট অর্জনের সিস্টেম
            </p>

            {[
              "Monetag Ads",
              "Adsgram Ads",
              "GigaPub Ads",
            ].map((name) => (
              <div className="list-card" key={name}>
                <div className="list-icon">
                  <PlayCircle size={24} />
                </div>
                <div className="list-info">
                  <strong>{name}</strong>
                  <small>
                    Provider verification pending
                  </small>
                </div>
                <button
                  className="small-button"
                  onClick={() =>
                    showUpcoming(name)
                  }
                >
                  Soon
                </button>
              </div>
            ))}
          </>
        )}

        {tab === "tasks" && (
          <>
            <h2 className="page-heading">Daily Tasks</h2>
            <p className="page-description">
              যাচাইকৃত টাস্ক সম্পন্ন করে পয়েন্ট পান
            </p>

            <div className="empty-card">
              <ListTodo size={42} />
              <h3>Tasks Coming Soon</h3>
              <p>
                Admin Panel থেকে টাস্ক প্রকাশ ও
                যাচাই করার সিস্টেম যুক্ত হবে।
              </p>
            </div>
          </>
        )}

        {tab === "referral" && (
          <>
            <h2 className="page-heading">
              Invite & Earn
            </h2>
            <p className="page-description">
              বন্ধুদের আমন্ত্রণ জানান
            </p>

            <div className="empty-card">
              <Gift size={46} />
              <h3>Referral System</h3>
              <p>
                Referral tracking ও commission
                verification যুক্ত হওয়ার পর
                আপনার ব্যক্তিগত referral link
                এখানে দেখা যাবে।
              </p>
            </div>
          </>
        )}

        {tab === "wallet" && (
          <>
            <h2 className="page-heading">My Wallet</h2>

            <section className="balance-card">
              <div className="balance-top">
                <span>Available Balance</span>
                <Wallet size={21} />
              </div>
              <div className="balance-number">
                {formatPoints(wallet.balance)}
                <small> Points</small>
              </div>
              <p>Secure PostgreSQL Wallet</p>
            </section>

            <div className="stats-grid">
              <div className="stat-card">
                <CircleDollarSign size={22} />
                <strong>
                  {formatPoints(wallet.totalEarned)}
                </strong>
                <small>Total Earned</small>
              </div>
              <div className="stat-card">
                <ArrowDownToLine size={22} />
                <strong>
                  {formatPoints(wallet.totalWithdrawn)}
                </strong>
                <small>Total Withdrawn</small>
              </div>
            </div>

            <button
              className="primary-button full-width"
              onClick={() =>
                showUpcoming("Withdraw")
              }
            >
              <ArrowDownToLine size={19} />
              Withdraw — Coming Soon
            </button>

            <div className="info-card">
              Withdraw চালু হলে যাচাইকৃত
              পেমেন্ট মেথড, ন্যূনতম ব্যালেন্স
              ও ট্রানজ্যাকশন হিস্ট্রি এখানে থাকবে।
            </div>
          </>
        )}

        {tab === "profile" && (
          <>
            <h2 className="page-heading">
              My Profile
            </h2>

            <div className="profile-card">
              <div className="profile-avatar">
                {user.firstName
                  .charAt(0)
                  .toUpperCase()}
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
                <CheckCircle2 size={15} />
                Telegram Verified
              </span>
            </div>

            <div className="details-card">
              <div>
                <span>Telegram ID</span>
                <strong>{user.telegramId}</strong>
              </div>
              <div>
                <span>Account Status</span>
                <strong>{user.status}</strong>
              </div>
              <div>
                <span>Account Type</span>
                <strong>Telegram User</strong>
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

      <nav
        className="bottom-navigation"
        aria-label="Main navigation"
      >
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              className={
                tab === item.id ? "active" : ""
              }
              onClick={() => goTo(item.id)}
              aria-current={
                tab === item.id ? "page" : undefined
              }
            >
              <Icon size={21} strokeWidth={2} />
              <span>{item.title}</span>
            </button>
          );
        })}
      </nav>
    </main>
  );
}
