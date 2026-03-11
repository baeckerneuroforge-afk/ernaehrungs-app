"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Leaf, Mail, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(
          error.message === "Invalid login credentials"
            ? "E-Mail oder Passwort ist falsch."
            : error.message
        );
      } else {
        router.push("/chat");
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        setSuccess(
          "Registrierung erfolgreich! Bitte bestätige deine E-Mail-Adresse."
        );
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary-bg flex items-center justify-center mx-auto mb-4">
              <Leaf className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">
              {isLogin ? "Willkommen zurück" : "Konto erstellen"}
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              {isLogin
                ? "Melde dich an um deine Beratung fortzusetzen"
                : "Starte jetzt mit deiner persönlichen Ernährungsberatung"}
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  E-Mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                    placeholder="deine@email.de"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Passwort
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                    placeholder="Mindestens 6 Zeichen"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">
                  {error}
                </div>
              )}
              {success && (
                <div className="text-sm text-primary bg-primary-bg rounded-xl px-4 py-2.5">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-2.5 rounded-xl font-medium text-sm hover:bg-primary-light transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {isLogin ? "Anmelden" : "Registrieren"}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-gray-100 text-center">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                  setSuccess("");
                }}
                className="text-sm text-gray-500 hover:text-primary transition"
              >
                {isLogin
                  ? "Noch kein Konto? Jetzt registrieren"
                  : "Schon registriert? Anmelden"}
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
