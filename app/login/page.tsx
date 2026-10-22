
"use client";

import {
  useEffect,
  useRef,
  useState
} from "react";

type TelegramLogin = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

declare global {
  interface Window {
    onTelegramAuth?: (
      user: TelegramLogin
    ) => void;
  }
}

export default function Login() {
  const containerRef =
    useRef<HTMLDivElement>(null);

  const [message, setMessage] = useState(
    "Telegram দিয়ে নিরাপদে লগইন করুন।"
  );

  useEffect(() => {
    window.onTelegramAuth = async (user) => {
      setMessage("যাচাই হচ্ছে...");

      try {
        const response = await fetch(
          "/api/auth/browser",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(user)
          }
        );

        const data = await response.json();

        if (!response.ok) {
          setMessage(
            "Login failed: " +
            (data.code || data.error)
          );
          return;
        }

        window.location.replace("/");
      } catch {
        setMessage("Server connection failed");
      }
    };

    const script =
      document.createElement("script");

    script.async = true;

    script.src =
      "https://telegram.org/js/telegram-widget.js?22";

    script.setAttribute(
      "data-telegram-login",
      "TiaEarn_bot"
    );

    script.setAttribute(
      "data-size",
      "large"
    );

    script.setAttribute(
      "data-onauth",
      "onTelegramAuth(user)"
    );

    script.setAttribute(
      "data-request-access",
      "write"
    );

    containerRef.current?.appendChild(script);

    return () => {
      delete window.onTelegramAuth;
      script.remove();
    };
  }, []);

  return (
    <main className="wrap">
      <header>
        <h1>🌿 Tia Earn</h1>
      </header>

      <section className="card">
        <h2>Browser Login</h2>

        <p>{message}</p>

        <div ref={containerRef} />

        <p className="hint">
          BotFather-এ /setdomain দিয়ে
          tia-earnt-pied.vercel.app
          সেট করুন।
        </p>
      </section>
    </main>
  );
}
