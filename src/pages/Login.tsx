import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center space-x-2 text-slate-400 hover:text-primary transition-colors mb-8 font-bold">
          <ArrowLeft size={18} />
          <span>Volver al inicio</span>
        </Link>
        
        <div className="card-rubi p-8 md:p-12">
          <div className="mb-8">
            <h1 className="text-4xl font-black text-secondary tracking-tighter">BIENVENIDO.</h1>
            <p className="text-slate-500 font-medium">Accede a tu cuenta de mayorista.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-6">Email</label>
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
              <div className="flex justify-between items-center pr-6">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-6">Contraseña</label>
                <button 
                  type="button"
                  onClick={async () => {
                    if (!email) {
                      setError('Por favor ingresa tu correo para enviarte el código.');
                      return;
                    }
                    setLoading(true);
                    const { error } = await supabase.auth.resetPasswordForEmail(email);
                    setLoading(false);
                    if (error) {
                      setError(error.message);
                    } else {
                      alert('Se ha enviado un código a tu correo para restablecer tu contraseña. Serás dirigido a la página de validación.');
                      navigate('/restablecer-password', { state: { email } });
                    }
                  }}
                  className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type="password"
                  className="input-rubi pl-14"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
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
                <>
                  <LogIn size={20} />
                  <span>Entrar al Sistema</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center pt-8 border-t border-slate-50">
            <p className="text-slate-400 text-sm">
              ¿No tienes una cuenta? <br />
              <Link to="/register" className="text-primary font-bold hover:underline">Regístrate como Taller / Mayorista</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
