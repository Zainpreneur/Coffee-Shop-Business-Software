import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, Input, Label } from "../components/ui";

export function LoginPage() {
  const { user, login, loading } = useAuth();
  const [email, setEmail] = useState("admin@coffeeshop.test");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Login failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-espresso-700 to-espresso-900 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-espresso-800 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">☕</div>
          <h1 className="text-xl font-bold text-espresso-800 dark:text-cream-100">Brew Base</h1>
          <p className="text-sm text-espresso-500 dark:text-espresso-200">Coffee Shop Business Suite</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <div className="mt-6 text-xs text-espresso-400 dark:text-espresso-300 border-t border-espresso-100 dark:border-espresso-700 pt-4 space-y-1">
          <p className="font-semibold">Demo accounts (password: password123)</p>
          <p>admin@coffeeshop.test — Admin</p>
          <p>manager@coffeeshop.test — Manager</p>
          <p>cashier@coffeeshop.test — Cashier</p>
        </div>
      </div>
    </div>
  );
}
