import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Key, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState(location.state?.email || '');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Verify OTP
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery'
      });

      if (verifyError) throw verifyError;

      // Step 2: Update Password (since we are now "logged in" by the OTP verification)
      const { error: updateError } = await supabase.auth.updateUser({
        password
      });

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="card-rubi p-12 text-center max-w-lg">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-3xl font-black text-secondary mb-4 uppercase tracking-tighter">¡LISTO!</h1>
          <p className="text-slate-500 font-medium mb-8">
            Tu contraseña ha sido restablecida correctamente. Serás redirigido al inicio de sesión en unos segundos...
          </p>
          <Link to="/login" className="btn-primary inline-block">Ir al Inicio de Sesión</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center space-x-2 text-slate-400 hover:text-primary transition-colors mb-8 font-bold">
          <ArrowLeft size={18} />
          <span>Volver al login</span>
        </Link>
        
        <div className="card-rubi p-8 md:p-12">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-secondary tracking-tighter uppercase leading-tight">Restablecer Contraseña</h1>
            <p className="text-slate-500 font-medium">Ingresa el código que enviamos a tu correo.</p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-6">Tu Email</label>
              <div className="relative">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type="email"
                  className="input-rubi pl-14"
                  placeholder="ejemplo@correo.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-6">Código de Seguridad</label>
              <div className="relative">
                <Key className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type="text"
                  maxLength={6}
                  className="input-rubi pl-14 font-black tracking-[0.5em] text-center"
                  placeholder="000000"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-6">Nueva Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    type="password"
                    className="input-rubi pl-14"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-6">Confirmar Nueva Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    type="password"
                    className="input-rubi pl-14"
                    placeholder="••••••••"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-500 text-xs font-bold p-4 rounded-2xl">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center space-x-2">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <span>Cambiar Contraseña</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
