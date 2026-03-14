import React, { useState, useEffect } from 'react';
import { User, Building, Mail, Save, Clock, Package, CheckCircle2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';

const Profile = () => {
  const { profile, setProfile } = useStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [form, setForm] = useState({
    nombre_completo: '',
    empresa: '',
    telefono: '',
    email_alternativo: '',
    password: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    const initProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserEmail(user.email || '');
      
      if (profile) {
        setForm({
          nombre_completo: profile.nombre_completo || '',
          empresa: profile.empresa || '',
          telefono: profile.telefono || '',
          email_alternativo: profile.email_alternativo || '',
          password: '',
          confirmPassword: ''
        });
        fetchOrders();
      }
    };
    initProfile();
  }, [profile]);

  const fetchOrders = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .eq('cliente_id', profile.id)
      .order('creado_at', { ascending: false })
      .limit(5);
    
    if (data) setOrders(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const { error } = await supabase
        .from('perfiles')
        .update({
          nombre_completo: form.nombre_completo,
          empresa: form.empresa,
          telefono: form.telefono,
          email_alternativo: form.email_alternativo
        })
        .eq('id', profile?.id);

      if (error) throw error;

      setProfile({
        ...profile!,
        nombre_completo: form.nombre_completo,
        empresa: form.empresa,
        telefono: form.telefono,
        email_alternativo: form.email_alternativo
      } as any);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      alert('Error al actualizar el perfil: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      alert('Las contraseñas no coinciden.');
      return;
    }

    setPasswordLoading(true);
    setPasswordSuccess(false);

    try {
      const { error } = await supabase.auth.updateUser({
        password: form.password
      });

      if (error) throw error;

      setPasswordSuccess(true);
      setForm({ ...form, password: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (error: any) {
      alert('Error al actualizar la contraseña: ' + error.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Info & Form */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
            <div className="bg-secondary p-8 text-white relative">
              <div className="flex items-center space-x-4 mb-2">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                  <User size={32} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Mi Perfil</span>
                  <h1 className="text-3xl font-black tracking-tighter uppercase leading-tight">Configuración de Cuenta</h1>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Nombre Completo</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">
                      <User size={18} />
                    </div>
                    <input 
                      required 
                      className="input-rubi py-3 pl-12" 
                      placeholder="Tu nombre completo"
                      value={form.nombre_completo}
                      onChange={(e) => setForm({...form, nombre_completo: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Empresa / Taller</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">
                      <Building size={18} />
                    </div>
                    <input 
                      required 
                      className="input-rubi py-3 pl-12" 
                      placeholder="Nombre de tu taller"
                      value={form.empresa}
                      onChange={(e) => setForm({...form, empresa: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Teléfono (10 dígitos)</label>
                  <div className="relative group">
                    <input 
                      required 
                      className="input-rubi py-3 px-6" 
                      placeholder="Ej: 5512345678"
                      maxLength={10}
                      value={form.telefono}
                      onChange={(e) => setForm({...form, telefono: e.target.value.replace(/\D/g, '')})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Correo Electrónico (Principal)</label>
                  <div className="relative group opacity-60">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                      <Mail size={18} />
                    </div>
                    <input 
                      readOnly 
                      className="input-rubi py-3 pl-12 bg-slate-50 cursor-not-allowed" 
                      value={userEmail}
                      placeholder="Principal"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Correo Alternativo (Opcional)</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">
                      <Mail size={18} opacity={0.5} />
                    </div>
                    <input 
                      className="input-rubi py-3 pl-12" 
                      placeholder="Email de respaldo"
                      value={form.email_alternativo}
                      onChange={(e) => setForm({...form, email_alternativo: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <p className="text-xs text-slate-400 font-medium italic">
                  * Estos datos se usarán para generar tus facturas y pedidos.
                </p>
                <button 
                  disabled={loading}
                  className={`btn-primary px-8 py-3 flex items-center space-x-2 transition-all ${success ? 'bg-green-500 hover:bg-green-600' : ''}`}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : success ? (
                    <>
                      <CheckCircle2 size={18} />
                      <span>¡Guardado!</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Password Change Section */}
          <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 p-6 border-b border-slate-100">
              <h2 className="text-xl font-black text-secondary uppercase tracking-tight">Seguridad</h2>
              <p className="text-xs text-slate-400 font-medium">Actualiza tu contraseña de acceso.</p>
            </div>
            
            <form onSubmit={handlePasswordUpdate} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Nueva Contraseña</label>
                  <input 
                    type="password"
                    required 
                    minLength={6}
                    className="input-rubi py-3 px-6" 
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({...form, password: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Confirmar Contraseña</label>
                  <input 
                    type="password"
                    required 
                    className="input-rubi py-3 px-6" 
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({...form, confirmPassword: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button 
                  disabled={passwordLoading}
                  className={`btn-primary px-8 py-3 flex items-center space-x-2 transition-all ${passwordSuccess ? 'bg-green-500 hover:bg-green-600' : ''}`}
                >
                  {passwordLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : passwordSuccess ? (
                    <>
                      <CheckCircle2 size={18} />
                      <span>¡Contraseña Actualizada!</span>
                    </>
                  ) : (
                    <span>Actualizar Contraseña</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-8">
          <div className="bg-white rounded-3xl p-8 shadow-soft border border-slate-100 space-y-6">
            <h3 className="font-black text-secondary uppercase tracking-tight flex items-center space-x-2">
              <div className="w-8 h-8 bg-secondary/5 rounded-lg flex items-center justify-center text-secondary">
                <Clock size={16} />
              </div>
              <span>Pedidos Recientes</span>
            </h3>
            
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-400 text-sm italic">No tienes pedidos aún.</p>
                </div>
              ) : (
                orders.map((order) => (
                  <div 
                    key={order.id} 
                    onClick={() => setSelectedOrder(order)}
                    className="group p-4 bg-slate-50 hover:bg-white hover:shadow-md rounded-2xl border border-transparent hover:border-slate-100 transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <Package size={14} className="text-primary" />
                        <span className="text-[10px] font-black uppercase text-secondary">
                          {order.folio ? `Folio #${order.folio}` : `#${order.id.slice(0, 8)}`}
                        </span>
                      </div>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                        order.estatus === 'entregado' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        {order.estatus}
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <p className="text-xs text-slate-400">{new Date(order.creado_at).toLocaleDateString()}</p>
                      <p className="text-sm font-black text-secondary">${order.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                ))
              )}
              
              <button className="w-full py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-2 border-dashed border-slate-100 rounded-2xl hover:border-primary/30 hover:text-primary transition-all">
                Ver todos los pedidos
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-secondary/60 backdrop-blur-md" onClick={() => setSelectedOrder(null)} />
          <div className="bg-white rounded-[40px] p-8 max-w-lg w-full shadow-2xl relative animate-in zoom-in duration-300">
            <button 
              onClick={() => setSelectedOrder(null)}
              className="absolute right-6 top-6 p-2 text-slate-400 hover:text-secondary bg-slate-50 rounded-xl transition-all"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <Package size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Detalles del Pedido</p>
                <h3 className="text-2xl font-black text-secondary uppercase tracking-tight">
                  {selectedOrder.folio ? `Folio #${selectedOrder.folio}` : `Pedido #${selectedOrder.id.slice(0, 8)}`}
                </h3>
              </div>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {selectedOrder.items?.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 text-slate-400">
                      <Package size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-secondary uppercase">{item.sku}</p>
                      <p className="text-[10px] text-slate-400">Cantidad: {item.cantidad}</p>
                    </div>
                  </div>
                  <p className="text-sm font-black text-secondary">${(item.precio_unitario * item.cantidad).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="flex justify-between items-center mb-6 px-2">
                <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">Total del Pedido</span>
                <span className="text-3xl font-black text-primary tracking-tighter">${selectedOrder.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="w-full btn-primary py-4 rounded-2xl shadow-xl shadow-primary/20"
              >
                Cerrar Detalles
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
