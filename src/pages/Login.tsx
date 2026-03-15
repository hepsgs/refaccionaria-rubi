import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success('¡Bienvenido de nuevo!');
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
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-6">Contraseña</label>
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

            <div className="text-center pt-2">
              <button 
                type="button"
                onClick={async () => {
                  if (!email) {
                    toast.error('Por favor ingresa tu correo primero para enviarte el código.');
                    return;
                  }
                  setLoading(true);
                  const { error } = await supabase.auth.resetPasswordForEmail(email);
                  setLoading(false);
                  if (error) {
                    toast.error(error.message);
                  } else {
                    toast.success('Código de recuperación enviado.');
                    navigate('/restablecer-password', { state: { email } });
                  }
                }}
                className="text-xs font-bold text-primary hover:underline uppercase tracking-widest transition-all"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
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
