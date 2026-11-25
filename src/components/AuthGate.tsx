import React, { useState } from 'react';
import { Lock, ShieldCheck, UserCheck } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  createSessionModeUser,
  signInWithSupabase,
  signUpWithSupabase,
} from '../services/clinicalRepository';
import { AuthSessionUser } from '../types/clinical';
import { PROFESSIONAL_INFO } from '../utils/calculations';
import { Logo } from './Logo';

interface AuthGateProps {
  onAuthenticated: (user: AuthSessionUser) => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState(
    isSupabaseConfigured ? '' : 'dr.hugo@lezcanofisioterapia.com.br'
  );
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(PROFESSIONAL_INFO.therapistName);
  const [crefito, setCrefito] = useState(PROFESSIONAL_INFO.crefito);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!isSupabaseConfigured) {
      if (!email.trim() || !fullName.trim()) {
        setErrorMsg('Informe identificação profissional e e-mail para iniciar a sessão.');
        return;
      }
      onAuthenticated(createSessionModeUser(email, fullName, crefito));
      return;
    }

    if (!email.trim() || password.length < 6) {
      setErrorMsg('Informe um e-mail válido e senha com no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const user = await signInWithSupabase(email.trim(), password);
        onAuthenticated(user);
      } else {
        const res = await signUpWithSupabase(email.trim(), password, fullName, crefito);
        if (res.needsEmailConfirmation) {
          setInfoMsg(
            'Cadastro realizado. Confirme o link enviado ao seu e-mail antes de acessar o prontuário.'
          );
          setMode('login');
        } else if (res.user) {
          onAuthenticated(res.user);
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center px-4 py-10">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-7 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-3 border-b border-slate-100 pb-5">
            <Logo />
            <div>
              <h1 className="font-display text-xl font-bold text-[#0B1F3A]">
                Acesso Profissional ao Prontuário Digital
              </h1>
              <p className="mt-1 text-xs text-slate-600">
                Controle de acesso clínico em conformidade com a LGPD (Lei nº 13.709/2018) e normas do COFFITO/CREFITO.
              </p>
            </div>
          </div>

          {!isSupabaseConfigured && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-950 space-y-1">
              <div className="font-semibold">Ambiente sem credenciais Supabase ativas</div>
              <p className="leading-relaxed">
                As variáveis <code className="font-mono text-[11px]">VITE_SUPABASE_URL</code> e{' '}
                <code className="font-mono text-[11px]">VITE_SUPABASE_ANON_KEY</code> não estão configuradas neste runtime. A sessão operará exclusivamente em memória ativa (sem armazenamento em <code className="font-mono text-[11px]">localStorage</code>).
              </p>
            </div>
          )}

          {isSupabaseConfigured && (
            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg('');
                }}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                  mode === 'login' ? 'bg-white text-[#0B1F3A] shadow-sm' : 'text-slate-600'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg('');
                }}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                  mode === 'signup' ? 'bg-white text-[#0B1F3A] shadow-sm' : 'text-slate-600'
                }`}
              >
                Cadastrar Profissional
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {(!isSupabaseConfigured || mode === 'signup') && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fisioterapeuta Responsável
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registro Profissional (CREFITO)
                  </label>
                  <input
                    type="text"
                    value={crefito}
                    onChange={(e) => setCrefito(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-mono text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                E-mail Profissional
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="profissional@clinica.com.br"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
              />
            </div>

            {isSupabaseConfigured && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Senha de Acesso
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
                />
              </div>
            )}

            {errorMsg && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
                {errorMsg}
              </div>
            )}

            {infoMsg && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs text-blue-900">
                {infoMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B1F3A] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8] disabled:opacity-50 min-h-[44px]"
            >
              {isSupabaseConfigured ? (
                <Lock className="h-4 w-4" />
              ) : (
                <UserCheck className="h-4 w-4" />
              )}
              <span>
                {loading
                  ? 'Autenticando...'
                  : !isSupabaseConfigured
                    ? 'Iniciar Sessão Clínica Segura'
                    : mode === 'login'
                      ? 'Acessar Prontuário Digital'
                      : 'Criar Conta Profissional'}
              </span>
            </button>
          </form>

          <div className="flex items-start gap-2.5 border-t border-slate-100 pt-4 text-[11px] leading-relaxed text-slate-500">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#1D4ED8] mt-0.5" />
            <span>
              Acesso restrito ao fisioterapeuta autenticado com isolamento por conta (RLS), links temporários assinados para documentos PDF e registro auditável de datas.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
