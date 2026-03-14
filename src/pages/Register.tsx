import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, Building2, UserPlus, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import toast from 'react-hot-toast';

const Register = () => {
  const [form, setForm] = useState({
    nombre_completo: '',
    empresa: '',
    telefono: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const config = useStore(state => state.config);


  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.telefono.length !== 10) {
      toast.error('El teléfono debe tener exactamente 10 dígitos.');
      return;
    }
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (authError) {
      toast.error(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Create profile
      const { error: profileError } = await supabase
        .from('perfiles')
        .insert({
          id: data.user.id,
          nombre_completo: form.nombre_completo,
          empresa: form.empresa,
          telefono: form.telefono,
          estatus: 'pendiente',
          rol: 'cliente'
        });

      if (profileError) {
        toast.error(profileError.message);
        setLoading(false);
      } else {
        toast.success('¡Registro enviado! Revisaremos tu cuenta pronto.');
        setSuccess(true);
        setLoading(false);
      }
    }
  };

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="card-rubi p-12 text-center max-w-lg">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <UserPlus size={40} />
          </div>
          <h1 className="text-3xl font-black text-secondary mb-4">¡REGISTRO EXITOSO!</h1>
          <p className="text-slate-500 font-medium mb-8">
            Tu cuenta ha sido creada y está en **estatus pendiente**. Un administrador revisará tus datos y te dará acceso a los precios mayoristas pronto.
          </p>
          <Link to="/" className="btn-primary inline-block">Volver al Inicio</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-xl">
        <Link to="/" className="inline-flex items-center space-x-2 text-slate-400 hover:text-primary transition-colors mb-8 font-bold">
          <ArrowLeft size={18} />
          <span>Volver al inicio</span>
        </Link>
        
        <div className="card-rubi p-8 md:p-12">
          <div className="mb-8">
            <h1 className="text-4xl font-black text-secondary tracking-tighter uppercase">Únete a {config?.abreviatura || config?.platform_name || 'Nosotros'}.</h1>
            <p className="text-slate-500 font-medium">Registro exclusivo para Talleres y Mayoristas.</p>
          </div>

          <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-6">Nombre Completo</label>
              <div className="relative">
                <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type="text"
                  className="input-rubi pl-14"
                  placeholder="Juan Pérez"
                  required
                  value={form.nombre_completo}
                  onChange={(e) => setForm({...form, nombre_completo: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-6">Teléfono (10 dígitos)</label>
              <div className="relative">
                <input
                  type="tel"
                  maxLength={10}
                  className="input-rubi py-3.5 px-6"
                  placeholder="5512345678"
                  required
                  value={form.telefono}
                  onChange={(e) => setForm({...form, telefono: e.target.value.replace(/\D/g, '')})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-6">Empresa / Taller</label>
              <div className="relative">
                <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type="text"
                  className="input-rubi pl-14"
                  placeholder="Tu Empresa S.A."
                  required
                  value={form.empresa}
                  onChange={(e) => setForm({...form, empresa: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-6">Email Corporativo</label>
              <div className="relative">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type="email"
                  className="input-rubi pl-14"
                  placeholder="contacto@empresa.com"
                  required
                  value={form.email}
                  onChange={(e) => setForm({...form, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-6">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type="password"
                  className="input-rubi pl-14"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({...form, password: e.target.value})}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary md:col-span-2 flex items-center justify-center space-x-2 mt-4 py-4">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <UserPlus size={20} />
                  <span>Enviar Solicitud de Registro</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-10 text-center pt-8 border-t border-slate-50">
            <p className="text-slate-400 text-sm">
              ¿Ya tienes cuenta? <br />
              <Link to="/login" className="text-primary font-bold hover:underline">Inicia Sesión</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
