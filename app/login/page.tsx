
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type TelegramLoginData = {
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
    onTiaTelegramLogin?: (
      user: TelegramLoginData
    ) => void;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.onTiaTelegramLogin = async (user) => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          "/api/auth/browser",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "same-origin",
            body: JSON.stringify(user),
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Login failed"
          );
        }

        router.replace("/");
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Login failed"
        );
      } finally {
        setLoading(false);
      }
    };

    const widget = document.createElement("script");

    widget.src =
      "https://telegram.org/js/telegram-widget.js?22";
    widget.async = true;

    widget.setAttribute(
      "data-telegram-login",
      "TiaEarn_bot"
    );
    widget.setAttribute("data-size", "large");
    widget.setAttribute("data-radius", "10");
    widget.setAttribute(
      "data-request-access",
      "write"
    );
    widget.setAttribute(
      "data-onauth",
      "onTiaTelegramLogin(user)"
    );

    container.current?.appendChild(widget);

    return () => {
      widget.remove();
      delete window.onTiaTelegramLogin;
    };
  }, [router]);

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        background: "#f5f8f6",
      }}
    >
      <section
        style={{
          background: "white",
          padding: 28,
          borderRadius: 20,
          textAlign: "center",
          width: "100%",
          maxWidth: 380,
          boxShadow: "0 8px 30px #0000000d",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: "#119b57",
            color: "white",
            display: "grid",
            placeItems: "center",
            fontSize: 40,
            fontWeight: 700,
            margin: "0 auto 15px",
          }}
        >
          T
        </div>

        <h1 style={{ color: "#087843" }}>
          Tia Earn
        </h1>

        <p style={{ color: "#75847c" }}>
          Chrome Browser থেকে নিরাপদে লগইন করুন
        </p>

        <div
          ref={container}
          style={{
            display: "flex",
            justifyContent: "center",
            margin: "25px 0",
            minHeight: 45,
          }}
        />

        {loading && <p>লগইন যাচাই হচ্ছে...</p>}

        {error && (
          <p style={{ color: "#dc2626" }}>
            {error}
          </p>
        )}

        <p style={{ fontSize: 12, color: "#75847c" }}>
          Telegram Login ব্যবহার করে একই
          অ্যাকাউন্ট ও Wallet ব্যবহার করুন।
        </p>
      </section>
    </main>
  );
}
