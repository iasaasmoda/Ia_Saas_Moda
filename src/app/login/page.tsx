'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Sparkles, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('Email ou senha incorretos.');
      setLoading(false);
    } else {
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Playfair+Display:ital,wght@1,400&display=swap');
        input { outline: none !important; }
      `}</style>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif" }} className="text-3xl text-white font-normal italic mb-2">
            Fashion IA
          </h1>
          <p className="text-white/30 text-sm">Acesse seu painel de controle</p>
        </div>

        {/* Form */}
        <div className="space-y-3">
          <div>
            <label className="text-[10px] tracking-[0.3em] uppercase text-white/20 block mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/20 focus:border-white/30 transition-colors"
            />
          </div>

          <div>
            <label className="text-[10px] tracking-[0.3em] uppercase text-white/20 block mb-2">Senha</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/20 focus:border-white/30 transition-colors pr-12"
              />
              <button
                onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400/80 text-xs text-center py-1">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-white text-black py-3.5 rounded-xl text-sm font-medium tracking-widest uppercase hover:bg-white/90 transition-all disabled:opacity-50 mt-2"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>

        <p className="text-center text-white/15 text-xs mt-10 tracking-widest uppercase">
          Souza Produções © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
