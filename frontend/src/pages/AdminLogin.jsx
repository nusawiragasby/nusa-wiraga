import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import Seo from "@/components/Seo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { api, formatApiError, setToken } from "@/lib/api";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setToken(data.token);
      toast.success("Selamat datang, Admin!");
      navigate("/admin");
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0B0E] px-4 text-slate-50 grain relative" data-testid="admin-login-page">
      <Seo title="Admin Portal — Nusa Wiraga 2026" siteName="Nusa Wiraga" description="Portal manajemen panitia Kejuaraan Pencak Silat Nusa Wiraga." />
      <div className="w-full max-w-md rounded-3xl border border-[#2E2E3A] bg-[#13131A] p-8">
        <div className="flex flex-col items-center">
          <img src="/logo-nusawiraga-144.webp" alt="Logo Nusa Wiraga" className="h-12 w-12 rounded-2xl object-cover glow-gold" />
          <h1 className="mt-4 text-xl font-extrabold sm:text-2xl">Admin Portal <span className="text-gold-gradient">Nusa Wiraga</span></h1>
          <p className="mt-1 text-sm text-slate-400">Khusus panitia kejuaraan</p>
        </div>
        <form onSubmit={submit} className="mt-8 space-y-5" data-testid="admin-login-form">
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email</Label>
            <Input id="admin-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              data-testid="admin-login-email-input" placeholder="admin@nusawiraga.id"
              className="border-[#2E2E3A] bg-[#0B0B0E] text-slate-100 focus-visible:ring-amber-500" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Kata Sandi</Label>
            <Input id="admin-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              data-testid="admin-login-password-input" placeholder="********"
              className="border-[#2E2E3A] bg-[#0B0B0E] text-slate-100 focus-visible:ring-amber-500" />
          </div>
          {error && <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-400" data-testid="admin-login-error">{error}</p>}
          <Button type="submit" disabled={loading} data-testid="admin-login-submit-btn"
            className="h-11 w-full rounded-xl bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 font-display font-extrabold text-stone-900 hover:opacity-90">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Masuk Dashboard"}
          </Button>
        </form>
        <Link to="/" className="mt-6 block text-center text-sm text-slate-400 hover:text-amber-400" data-testid="admin-login-back-link">
          &larr; Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
