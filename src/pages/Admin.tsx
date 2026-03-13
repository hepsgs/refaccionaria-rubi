import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Package, 
  ClipboardList, 
  Plus, 
  Check, 
  X,
  FileDown,
  Upload,
  Shield,
  ShieldCheck,
  Edit,
  Trash2,
  Search,
  Image as ImageIcon,
  ImagePlus,
  AlertTriangle,
  Settings
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Admin = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'products' | 'orders' | 'config' | 'cms'>('users');
  const [settings, setSettings] = useState<any>({
    smtp_host: '',
    smtp_port: '587',
    smtp_security: 'tls',
    smtp_sender_name: 'Refaccionaria Rubi',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
    site_url: window.location.origin,
    logo_url: '',
    hero_title_1: 'LA PIEZA QUE',
    hero_title_2: 'TU MOTOR NECESITA',
    hero_subtitle: 'Gestión profesional de refacciones para talleres y empresas. Búsqueda técnica instantánea y stock real garantizado.',
    about_title_1: 'Respaldando tu industria con',
    about_title_2: 'Precisión y Confianza',
    about_text: 'En Refaccionaria Rubi, nos especializamos en proveer soluciones integrales para el sector automotriz e industrial.'
  });
  const [testingSMTP, setTestingSMTP] = useState(false);
  const profile = useStore(state => state.profile);

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase.from('configuracion').select('*').single();
      if (data) setSettings(data);
    };
    fetchConfig();
  }, []);

  if (!profile?.es_admin) {
    return <div className="p-20 text-center font-bold">Acceso Denegado</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black text-secondary tracking-tighter uppercase">Panel de Control</h1>
          <p className="text-slate-500 font-medium italic">Gestión de Refaccionaria Rubi</p>
        </div>
        
        <div className="flex bg-white p-1.5 rounded-2xl shadow-soft border border-slate-100 overflow-x-auto max-w-full">
          {[
            { id: 'users', label: 'Usuarios', icon: Users },
            { id: 'products', label: 'Productos', icon: Package },
            { id: 'orders', label: 'Pedidos', icon: ClipboardList },
            { id: 'cms', label: 'Página Web', icon: ImagePlus },
            { id: 'config', label: 'Configuración', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id 
                ? 'bg-secondary text-white shadow-lg shadow-secondary/20' 
                : 'text-slate-400 hover:text-secondary'
              }`}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card-rubi p-8 min-h-[600px] border border-slate-100">
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'products' && <ProductManagement />}
        {activeTab === 'orders' && <OrderManagement />}
        {activeTab === 'cms' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <ImagePlus size={32} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-secondary tracking-tighter uppercase leading-none">CMS Landing Page</h2>
                  <p className="text-slate-500 font-medium text-sm">Modifica los textos principales de la página de inicio.</p>
                </div>
              </div>
              <button 
                onClick={async () => {
                  const { error } = await supabase.from('configuracion').upsert({ id: 1, ...settings });
                  if (!error) alert('Textos guardados correctamente.');
                  else alert('Error: ' + error.message);
                }}
                className="btn-primary px-8"
              >
                Guardar Cambios
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="card-rubi bg-white border-slate-100 space-y-6 p-6">
                <h3 className="font-bold text-secondary text-lg flex items-center space-x-2">
                  <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                  <span>Sección Principal (Hero)</span>
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Título (Parte 1 Blanca)</label>
                    <input 
                      className="input-rubi" 
                      value={settings.hero_title_1}
                      onChange={(e) => setSettings({...settings, hero_title_1: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Título (Parte 2 Color)</label>
                    <input 
                      className="input-rubi" 
                      value={settings.hero_title_2}
                      onChange={(e) => setSettings({...settings, hero_title_2: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Subtítulo</label>
                    <textarea 
                      className="input-rubi min-h-[100px] resize-none py-3" 
                      value={settings.hero_subtitle}
                      onChange={(e) => setSettings({...settings, hero_subtitle: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="card-rubi bg-white border-slate-100 space-y-6 p-6">
                <h3 className="font-bold text-secondary text-lg flex items-center space-x-2">
                  <span className="w-1.5 h-6 bg-secondary rounded-full"></span>
                  <span>Sección Nosotros</span>
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Título (Parte 1 Negra)</label>
                    <input 
                      className="input-rubi" 
                      value={settings.about_title_1}
                      onChange={(e) => setSettings({...settings, about_title_1: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Título (Parte 2 Color)</label>
                    <input 
                      className="input-rubi" 
                      value={settings.about_title_2}
                      onChange={(e) => setSettings({...settings, about_title_2: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Texto Descriptivo</label>
                    <textarea 
                      className="input-rubi min-h-[100px] resize-none py-3" 
                      value={settings.about_text}
                      onChange={(e) => setSettings({...settings, about_text: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="card-rubi bg-slate-50/50 border-slate-100 space-y-6 p-6 md:col-span-2">
                <h3 className="font-bold text-secondary text-lg flex items-center space-x-2">
                  <span className="w-1.5 h-6 bg-slate-800 rounded-full"></span>
                  <span>Configuración de Generales y Footer</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nombre de la Plataforma</label>
                    <input 
                      className="input-rubi" 
                      value={settings.platform_name || ''}
                      placeholder="Ej: Refaccionaria Rubi"
                      onChange={(e) => setSettings({...settings, platform_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Descripción (Footer)</label>
                    <input 
                      className="input-rubi" 
                      value={settings.footer_description || ''}
                      placeholder="Breve descripción de la empresa"
                      onChange={(e) => setSettings({...settings, footer_description: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Email de Contacto</label>
                    <input 
                      className="input-rubi" 
                      value={settings.footer_contact_email || ''}
                      placeholder="ventas@empresa.com"
                      onChange={(e) => setSettings({...settings, footer_contact_email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Teléfono de Contacto</label>
                    <input 
                      className="input-rubi" 
                      value={settings.footer_contact_phone || ''}
                      placeholder="+52 (000) 000 0000"
                      onChange={(e) => setSettings({...settings, footer_contact_phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Dirección Física</label>
                    <input 
                      className="input-rubi" 
                      value={settings.footer_contact_address || ''}
                      placeholder="Dirección completa de la sucursal"
                      onChange={(e) => setSettings({...settings, footer_contact_address: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'config' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <Settings size={32} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-secondary tracking-tighter uppercase leading-none">Ajustes SMTP</h2>
                  <p className="text-slate-500 font-medium text-sm">Configura las credenciales para el envío de correos automáticos.</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button 
                  onClick={async () => {
                    setTestingSMTP(true);
                    try {
                      const { data, error } = await supabase.functions.invoke('admin-create-user', {
                        body: { test: true, settings }
                      });
                      if (error) {
                        console.error('SMTP test function error:', error);
                        // Extract error message from Edge Function response format
                        let errorMessage = error.message;
                        if (error.context && error.context.json) {
                          try {
                            const errData = await error.context.json();
                            errorMessage = errData.error || errorMessage;
                          } catch (e) { /* ignore parse error */ }
                        }
                        throw new Error(errorMessage);
                      }
                      
                      // Check for internal success flag
                      if (data && !data.success) {
                         throw new Error(data.error || 'Error desconocido en la prueba SMTP.');
                      }

                      alert('Correo de prueba enviado correctamente.');
                    } catch (error: any) {
                      alert('Error: ' + error.message);
                    } finally {
                      setTestingSMTP(false);
                    }
                  }}
                  disabled={testingSMTP}
                  className="btn-secondary px-8 flex items-center space-x-2"
                >
                  {testingSMTP ? (
                    <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Check size={18} />
                  )}
                  <span>Probar Conexión</span>
                </button>
                <button 
                  onClick={async () => {
                    const { error } = await supabase.from('configuracion').upsert({ id: 1, ...settings });
                    if (!error) alert('Configuración guardada.');
                    else alert('Error: ' + error.message);
                  }}
                  className="btn-primary px-8"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="card-rubi bg-slate-50/50 border-slate-100 space-y-6 p-6">
                <h3 className="font-bold text-secondary text-lg flex items-center space-x-2">
                  <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                  <span>Servidor de Correo</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Host SMTP</label>
                    <input 
                      className="input-rubi" 
                      placeholder="smtp.gmail.com"
                      value={settings.smtp_host}
                      onChange={(e) => setSettings({...settings, smtp_host: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Puerto</label>
                    <input 
                      className="input-rubi" 
                      placeholder="587"
                      value={settings.smtp_port}
                      onChange={(e) => setSettings({...settings, smtp_port: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Modo de Seguridad</label>
                    <select 
                      className="input-rubi py-3"
                      value={settings.smtp_security}
                      onChange={(e) => setSettings({...settings, smtp_security: e.target.value})}
                    >
                      <option value="none">Sin Seguridad (Puerto 25/587)</option>
                      <option value="tls">STARTTLS (Puerto 587)</option>
                      <option value="ssl">SSL/TLS (Puerto 465)</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Usuario / Email</label>
                    <input 
                      className="input-rubi" 
                      placeholder="noreply@tuempresa.com"
                      value={settings.smtp_user}
                      onChange={(e) => setSettings({...settings, smtp_user: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Contraseña</label>
                    <input 
                      type="password"
                      className="input-rubi" 
                      placeholder="••••••••••••"
                      value={settings.smtp_pass}
                      onChange={(e) => setSettings({...settings, smtp_pass: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="card-rubi bg-white border-slate-100 space-y-6 p-6">
                <h3 className="font-bold text-secondary text-lg flex items-center space-x-2">
                  <span className="w-1.5 h-6 bg-secondary rounded-full"></span>
                  <span>Identidad y Envío</span>
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nombre del Remitente</label>
                    <input 
                      className="input-rubi" 
                      placeholder="Refaccionaria Rubi"
                      value={settings.smtp_sender_name}
                      onChange={(e) => setSettings({...settings, smtp_sender_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Email Remitente (De:)</label>
                    <input 
                      className="input-rubi" 
                      placeholder="ventas@rubi.com"
                      value={settings.smtp_from}
                      onChange={(e) => setSettings({...settings, smtp_from: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">URL del Sitio (Para enlaces en correos)</label>
                    <input 
                      className="input-rubi" 
                      placeholder="http://localhost:5173"
                      value={settings.site_url}
                      onChange={(e) => setSettings({...settings, site_url: e.target.value})}
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-50">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2 block">Logo de la Empresa</label>
                    <div className="flex items-center space-x-4">
                      <div className="w-24 h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden">
                        {settings.logo_url ? (
                          <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <ImageIcon size={32} className="text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          type="file"
                          id="logo-upload"
                          className="hidden"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            try {
                              const fileExt = file.name.split('.').pop();
                              const fileName = `logo-${Math.random()}.${fileExt}`;
                              
                              const { error: uploadError } = await supabase.storage
                                .from('branding')
                                .upload(fileName, file);

                              if (uploadError) throw uploadError;

                              const { data: { publicUrl } } = supabase.storage
                                .from('branding')
                                .getPublicUrl(fileName);

                              setSettings({ ...settings, logo_url: publicUrl });
                            } catch (error: any) {
                              alert('Error al subir logo: ' + error.message);
                            }
                          }}
                        />
                        <label 
                          htmlFor="logo-upload"
                          className="btn-secondary py-2 px-4 inline-flex items-center space-x-2 cursor-pointer text-xs"
                        >
                          <Upload size={14} />
                          <span>Cambiar Logo</span>
                        </label>
                        <p className="text-[10px] text-slate-400">Dimensión recomendada: 500x500px. PNG o SVG preferido.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const UserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('perfiles').select('*').order('creado_at', { ascending: false });
    if (data) setUsers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateStatus = async (uid: string, status: string) => {
    await supabase.from('perfiles').update({ estatus: status }).eq('id', uid);
    fetchUsers();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-secondary flex items-center space-x-3">
          <div className="p-2 bg-secondary text-white rounded-lg"><Users size={20} /></div>
          <span>Usuarios del Sistema</span>
        </h2>
        <button 
          onClick={() => setShowAddUser(true)}
          className="btn-primary py-2 px-5 flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-100">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-6 whitespace-nowrap">Usuario</th>
              <th className="py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-6 whitespace-nowrap">Empresa</th>
              <th className="py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-6 whitespace-nowrap">Rol</th>
              <th className="py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-6 whitespace-nowrap">Estatus</th>
              <th className="py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-6 text-right whitespace-nowrap">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={5} className="py-20 text-center text-slate-400 font-medium">Cargando usuarios...</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-5 px-6">
                  <div className="flex flex-col">
                    <span className="font-bold text-secondary">{u.nombre_completo}</span>
                    <span className="text-xs text-slate-400">ID: {u.id.slice(0,8)}</span>
                  </div>
                </td>
                <td className="py-5 px-6 text-slate-500 font-medium">{u.empresa}</td>
                <td className="py-5 px-6">
                  {u.es_admin ? (
                    <div className="flex items-center space-x-1.5 text-primary font-black uppercase text-[10px]">
                      <ShieldCheck size={14} />
                      <span>Admin</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1.5 text-slate-400 font-bold uppercase text-[10px]">
                      <Users size={14} />
                      <span>Taller / Cliente</span>
                    </div>
                  )}
                </td>
                <td className="py-5 px-6">
                  <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${
                    u.estatus === 'aprobado' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {u.estatus}
                  </span>
                </td>
                <td className="py-5 px-6 text-right flex items-center justify-end space-x-3">
                  {u.estatus === 'pendiente' && (
                    <button 
                      onClick={() => updateStatus(u.id, 'aprobado')}
                      className="p-2.5 bg-secondary text-white rounded-xl hover:bg-primary transition-all shadow-md shadow-secondary/10"
                      title="Aprobar Usuario"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <button 
                    onClick={async () => {
                      if (confirm('¿Estás seguro de eliminar este usuario?')) {
                        await supabase.from('perfiles').delete().eq('id', u.id);
                        fetchUsers();
                      }
                    }}
                    className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all" 
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddUser && <AddUserModal onClose={() => setShowAddUser(false)} onRefresh={fetchUsers} />}
    </div>
  );
};

const AddUserModal = ({ onClose, onRefresh }: { onClose: () => void, onRefresh: () => void }) => {
  const [form, setForm] = useState({
    nombre_completo: '',
    email: '',
    empresa: '',
    es_admin: false
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: form
      });

      if (error) throw error;
      
      console.log('User created:', data);
      alert('Usuario creado con éxito. Se ha enviado un correo con sus accesos.');
      onRefresh();
      onClose();
    } catch (error: any) {
      console.error('Error creating user:', error);
      alert('Error: ' + (error.message || 'No se pudo crear el usuario. Asegúrate de que la Edge Function esté desplegada.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-secondary/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-secondary p-8 text-white relative">
          <button onClick={onClose} className="absolute right-6 top-6 hover:rotate-90 transition-all">
            <X size={24} />
          </button>
          <div className="flex items-center space-x-3 mb-2">
            <Users />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Administración</span>
          </div>
          <h3 className="text-3xl font-black tracking-tighter uppercase">Nuevo Usuario</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Nombre Completo</label>
            <input 
              required 
              className="input-rubi py-2.5" 
              placeholder="Ej: Juan Pérez"
              value={form.nombre_completo}
              onChange={(e) => setForm({...form, nombre_completo: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Correo Electrónico</label>
            <input 
              type="email"
              required 
              className="input-rubi py-2.5" 
              placeholder="usuario@empresa.com"
              value={form.email}
              onChange={(e) => setForm({...form, email: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Empresa / Taller</label>
            <input 
              required 
              className="input-rubi py-2.5" 
              placeholder="Nombre del Taller"
              value={form.empresa}
              onChange={(e) => setForm({...form, empresa: e.target.value})}
            />
          </div>

          <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <input 
              type="checkbox"
              id="es_admin"
              className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
              checked={form.es_admin}
              onChange={(e) => setForm({...form, es_admin: e.target.checked})}
            />
            <label htmlFor="es_admin" className="text-sm font-bold text-secondary flex items-center space-x-2">
              <Shield size={16} className="text-primary" />
              <span>Convertir en Administrador</span>
            </label>
          </div>

          <div className="pt-5 flex space-x-3">
            <button type="button" onClick={onClose} className="flex-1 py-4 font-bold text-slate-400 hover:text-secondary transition-colors">Cancelar</button>
            <button disabled={saving} type="submit" className="flex-[2] btn-primary py-4 shadow-xl shadow-primary/20 flex items-center justify-center space-x-2">
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <Check size={18} />
                  <span>Crear y Enviar Accesos</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ProductManagement = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('productos').select('*').order('creado_at', { ascending: false });
    if (data) setProducts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      await supabase.from('productos').delete().eq('id', id);
      fetchProducts();
    }
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const productsToUpsert = lines.slice(1).map(line => {
        const parts = line.split(',');
        if (parts.length < 3) return null;
        const [sku, nombre, precio, stock, marca, modelo, año_inicio, año_fin, imagenes] = parts;
        if (!sku) return null;
        
        // Parse images if present (expecting a semicolon separated list or JSON string)
        let imageList: string[] = [];
        if (imagenes) {
          const trimmed = imagenes.trim();
          if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try { imageList = JSON.parse(trimmed); } catch (e) { console.error(e); }
          } else {
            imageList = trimmed.split(';').map(i => i.trim()).filter(i => i);
          }
        }

        return { 
          sku: sku.trim(), 
          nombre: nombre?.trim(), 
          precio: parseFloat(precio || '0'), 
          stock: stock ? parseInt(stock) : 0, 
          marca: marca?.trim() || '',
          modelo: modelo?.trim() || '',
          año_inicio: año_inicio ? parseInt(año_inicio) : null,
          año_fin: año_fin ? parseInt(año_fin) : null,
          imagenes: imageList
        };
      }).filter(p => p !== null);

      const { error } = await supabase.from('productos').upsert(productsToUpsert, { onConflict: 'sku' });
      if (!error) {
        alert('Importación completada con éxito');
        fetchProducts();
      } else {
        alert('Error en importación: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  const filteredProducts = products.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
        <h2 className="text-2xl font-black text-secondary flex items-center space-x-3">
          <div className="p-2 bg-secondary text-white rounded-lg"><Package size={20} /></div>
          <span>Gestión de Catálogo</span>
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por SKU o Nombre..."
              className="input-rubi pl-12 py-2.5 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <label className="btn-secondary flex items-center space-x-2 py-2.5 px-5 cursor-pointer text-sm">
            <Upload size={18} />
            <span>Importar CSV</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
          </label>
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center space-x-2 py-2.5 px-5 text-sm">
            <Plus size={18} />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto rounded-2xl border border-slate-100">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-6">SKU / Marca</th>
              <th className="py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-6">Descripción del Producto</th>
              <th className="py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-6">Stock</th>
              <th className="py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-6">Precio</th>
              <th className="py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-6 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={5} className="py-20 text-center text-slate-400 font-medium font-sans">Sincronizando inventario...</td></tr>
            ) : filteredProducts.length === 0 ? (
              <tr><td colSpan={5} className="py-20 text-center text-slate-400 font-medium">No se encontraron productos</td></tr>
            ) : filteredProducts.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-5 px-6">
                  <div className="flex items-center space-x-3">
                    {p.imagenes && p.imagenes.length > 0 ? (
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-100 flex-shrink-0">
                        <img src={p.imagenes[0]} alt={p.nombre} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 flex-shrink-0">
                        <ImageIcon size={16} />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-primary uppercase tracking-wider">{p.sku}</span>
                      <span className="text-xs font-bold text-slate-400">{p.marca || 'N/A'}</span>
                    </div>
                  </div>
                </td>
                <td className="py-5 px-6">
                  <span className="font-bold text-secondary line-clamp-1">{p.nombre}</span>
                  <div className="flex items-center space-x-2">
                    {p.modelo && <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded">{p.modelo}</span>}
                    {(p.año_inicio || p.año_fin) && (
                      <span className="text-[10px] text-slate-400 font-medium italic">
                        {p.año_inicio || '...'} - {p.año_fin || '...'}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-5 px-6">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${p.stock > 10 ? 'bg-green-500' : p.stock > 0 ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                    <span className="font-bold text-secondary text-sm">{p.stock} pz</span>
                  </div>
                </td>
                <td className="py-5 px-6">
                  <span className="font-black text-secondary">${p.precio.toLocaleString()}</span>
                </td>
                <td className="py-5 px-6 text-right flex items-center justify-end space-x-2">
                  <button 
                    onClick={() => setEditingProduct(p)}
                    className="p-2.5 text-slate-300 hover:text-secondary hover:bg-slate-100 rounded-xl transition-all" 
                    title="Editar"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(p.id)}
                    className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all" 
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(showAdd || editingProduct) && (
        <ProductModal 
          product={editingProduct} 
          onClose={() => { setShowAdd(false); setEditingProduct(null); }} 
          onRefresh={fetchProducts} 
        />
      )}
    </div>
  );
};

const ProductModal = ({ product, onClose, onRefresh }: { product?: any, onClose: () => void, onRefresh: () => void }) => {
  const [form, setForm] = useState({
    sku: product?.sku || '',
    nombre: product?.nombre || '',
    marca: product?.marca || '',
    modelo: product?.modelo || '',
    año_inicio: product?.año_inicio || '',
    año_fin: product?.año_fin || '',
    precio: product?.precio || 0,
    stock: product?.stock || 0,
    descripcion: product?.descripcion || '',
    imagenes: product?.imagenes || []
  });
  const [newImage, setNewImage] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg('');
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setForm({ ...form, imagenes: [...form.imagenes, publicUrl] });
    } catch (error: any) {
      console.error('Error uploading file:', error);
      setErrorMsg('Error al subir imagen: ' + (error.message || 'Verifica que el bucket "product-images" exista.'));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    
    // Prepare data (convert empty years to null)
    const productData = {
      ...form,
      año_inicio: form.año_inicio === '' ? null : form.año_inicio,
      año_fin: form.año_fin === '' ? null : form.año_fin
    };

    try {
      let error;
      if (product) {
        const { error: err } = await supabase.from('productos').update(productData).eq('id', product.id);
        error = err;
      } else {
        const { error: err } = await supabase.from('productos').insert(productData);
        error = err;
      }

      if (!error) {
        onRefresh();
        onClose();
      } else {
        throw error;
      }
    } catch (error: any) {
      console.error('Error saving product:', error);
      setErrorMsg('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-secondary/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-secondary p-8 text-white relative">
          <button onClick={onClose} className="absolute right-6 top-6 hover:rotate-90 transition-all">
            <X size={24} />
          </button>
          <div className="flex items-center space-x-3 mb-2">
            <Package />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Inventario</span>
          </div>
          <h3 className="text-3xl font-black tracking-tighter uppercase">{product ? 'Editar Producto' : 'Nuevo Producto'}</h3>
        </div>

        {errorMsg && (
          <div className="mx-8 mt-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start space-x-3 text-rose-600 animate-in fade-in slide-in-from-top-4 duration-300">
            <AlertTriangle className="flex-shrink-0" size={20} />
            <p className="text-xs font-bold leading-relaxed">{errorMsg}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">SKU</label>
              <input 
                required 
                className="input-rubi py-2.5" 
                placeholder="MOT-001"
                value={form.sku}
                onChange={(e) => setForm({...form, sku: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Marca</label>
              <input 
                className="input-rubi py-2.5" 
                placeholder="PRO-PARTS"
                value={form.marca}
                onChange={(e) => setForm({...form, marca: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-5">
            <div className="col-span-1 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Modelo</label>
              <input 
                className="input-rubi py-2.5" 
                placeholder="Tsuru"
                value={form.modelo}
                onChange={(e) => setForm({...form, modelo: e.target.value})}
              />
            </div>
            <div className="col-span-1 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Año Inicio (Opc)</label>
              <input 
                type="number"
                className="input-rubi py-2.5" 
                placeholder="1992"
                value={form.año_inicio}
                onChange={(e) => setForm({...form, año_inicio: e.target.value ? parseInt(e.target.value) : ''})}
              />
            </div>
            <div className="col-span-1 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Año Fin (Opc)</label>
              <input 
                type="number"
                className="input-rubi py-2.5" 
                placeholder="2017"
                value={form.año_fin}
                onChange={(e) => setForm({...form, año_fin: e.target.value ? parseInt(e.target.value) : ''})}
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Nombre Comercial</label>
            <input 
              required 
              className="input-rubi py-2.5" 
              placeholder="Ej: Balatas Cerámicas Delanteras"
              value={form.nombre}
              onChange={(e) => setForm({...form, nombre: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Imágenes</label>
            <div className="flex flex-col gap-3">
              <div className="flex space-x-2">
                <input 
                  className="input-rubi py-2.5 flex-1" 
                  placeholder="Pegar URL de imagen..."
                  value={newImage}
                  onChange={(e) => setNewImage(e.target.value)}
                />
                <button 
                  type="button"
                  onClick={() => {
                    if (newImage) {
                      setForm({...form, imagenes: [...form.imagenes, newImage]});
                      setNewImage('');
                    }
                  }}
                  className="p-2 bg-secondary text-white rounded-xl active:scale-95 transition-transform"
                >
                  <Plus size={20} />
                </button>
              </div>

              <label className="relative flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl p-6 hover:border-primary/50 hover:bg-slate-50 transition-all cursor-pointer group">
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <div className="flex flex-col items-center gap-2">
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                  ) : (
                    <ImagePlus className="text-slate-300 group-hover:text-primary transition-colors" size={24} />
                  )}
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {uploading ? 'Subiendo...' : 'Examinar Archivo'}
                  </span>
                </div>
              </label>
            </div>
            {form.imagenes.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {form.imagenes.map((img: string, idx: number) => (
                  <div key={idx} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                    <img src={img} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => setForm({...form, imagenes: form.imagenes.filter((_: any, i: number) => i !== idx)})}
                      className="absolute inset-0 bg-rose-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Precio ($)</label>
              <input 
                type="number" 
                required 
                className="input-rubi py-2.5" 
                value={form.precio}
                onChange={(e) => setForm({...form, precio: parseFloat(e.target.value)})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Stock (Opcional)</label>
              <input 
                type="number" 
                className="input-rubi py-2.5" 
                value={form.stock}
                onChange={(e) => setForm({...form, stock: e.target.value ? parseInt(e.target.value) : 0})}
              />
            </div>
          </div>

          <div className="pt-5 flex space-x-3">
            <button type="button" onClick={onClose} className="flex-1 py-4 font-bold text-slate-400 hover:text-secondary transition-colors">Cancelar</button>
            <button disabled={saving} type="submit" className="flex-[2] btn-primary py-4 shadow-xl shadow-primary/20">
              {saving ? 'Guardando...' : product ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const OrderManagement = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const fetchOrders = useCallback(async () => {
    // Select the order and also the joined client profile using the foreign key cliente_id -> id
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        perfiles!pedidos_cliente_id_fkey (
          nombre_completo,
          empresa,
          email_alternativo
        )
      `)
      .order('creado_at', { ascending: false });
      
    if (error) {
      console.error("Error fetching orders:", error);
    }
    if (data) setOrders(data);
      
    if (data) setOrders(data);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const exportSingleOrderCSV = (order: any) => {
    if (!order) return;
    const exportData = order.items.map((item: any) => ({
      'Numero de Parte': item.sku,
      'Cantidad': item.cantidad,
      'Pedido ID': order.id,
      'Folio': order.folio || 'N/A'
    }));
    
    // Add BOM for Excel UTF-8 recognition
    const BOM = "\uFEFF";
    const header = "Numero de Parte,Cantidad,Folio\n";
    const rows = exportData.map((e: any) => `"${e['Numero de Parte']}","${e['Cantidad']}","${e['Folio']}"`).join("\n");
    const csvContent = BOM + header + rows;
    
    // Create Blob to avoid URI constraints
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `pedido_${order.folio || order.id.slice(0,8)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSingleOrderPDF = (order: any) => {
    if (!order) return;
    
    // Explicitly define parameters to prevent corrupted generation in some environments
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('Refaccionaria Rubi', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('Detalle de Pedido', 14, 28);
    
    // Order Info
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`Folio: ${order.folio || 'N/A'}`, 14, 40);
    doc.text(`Fecha: ${new Date(order.creado_at).toLocaleString()}`, 14, 46);
    doc.text(`Estado: ${order.estatus.toUpperCase()}`, 14, 52);
    
    // Client Info
    const clientInfo = order.perfiles || {};
    doc.text('Cliente:', 100, 40);
    doc.setFontSize(10);
    doc.text(`Nombre: ${clientInfo.nombre_completo || 'N/A'}`, 100, 46);
    doc.text(`Empresa: ${clientInfo.empresa || 'N/A'}`, 100, 52);
    doc.text(`ID Cliente: ${order.cliente_id}`, 100, 58);

    // Table
    const tableColumn = ["SKU", "Cantidad", "Precio Unitario", "Subtotal"];
    const tableRows = order.items.map((item: any) => [
      item.sku,
      item.cantidad.toString(),
      `$${item.precio_unitario.toLocaleString()}`,
      `$${(item.precio_unitario * item.cantidad).toLocaleString()}`
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 70,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85] }, // slate-700
      columnStyles: {
        0: { cellWidth: 80 },
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 70;
    
    // Total
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total del Pedido: $${order.total.toLocaleString()}`, 14, finalY + 15);

    doc.save(`Pedido_${order.folio || order.id.slice(0,8)}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-secondary flex items-center space-x-3">
          <div className="p-2 bg-secondary text-white rounded-lg"><ClipboardList size={20} /></div>
          <span>Historial de Pedidos</span>
        </h2>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-100">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-6 whitespace-nowrap">Folio / ID</th>
              <th className="py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-6 whitespace-nowrap">Fecha</th>
              <th className="py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-6 whitespace-nowrap">Cliente</th>
              <th className="py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-6 whitespace-nowrap">Estatus</th>
              <th className="py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-6 whitespace-nowrap">Total</th>
              <th className="py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-6 text-right whitespace-nowrap">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {orders.length === 0 ? (
              <tr><td colSpan={6} className="py-20 text-center text-slate-400 font-medium border-2 border-dashed border-slate-100 rounded-3xl">No hay pedidos registrados aún.</td></tr>
            ) : orders.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => setSelectedOrder(o)}>
                <td className="py-5 px-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-100 group-hover:bg-primary group-hover:text-white transition-all">
                      <Package size={18} />
                    </div>
                    <div>
                      <span className="font-bold text-secondary uppercase tracking-widest block text-xs">{o.folio ? `Folio #${o.folio}` : `ID: #${o.id.slice(0,6)}`}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{o.items?.length || 0} items</span>
                    </div>
                  </div>
                </td>
                <td className="py-5 px-6 text-sm text-slate-500 font-medium">{new Date(o.creado_at).toLocaleDateString()}</td>
                <td className="py-5 px-6">
                  <span className="font-bold text-secondary block text-sm">{o.perfiles?.nombre_completo || 'Desconocido'}</span>
                  <span className="text-xs text-slate-400 block">{o.perfiles?.empresa || 'Empresa No Espec.'}</span>
                </td>
                <td className="py-5 px-6">
                  <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full tracking-wider ${
                    o.estatus === 'entregado' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {o.estatus}
                  </span>
                </td>
                <td className="py-5 px-6 text-primary font-black tracking-tight">${o.total.toLocaleString()}</td>
                <td className="py-5 px-6 text-right flex items-center justify-end space-x-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedOrder(o); }}
                    className="p-2.5 bg-slate-100 text-slate-500 rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
                    title="Ver Detalles"
                  >
                    <ClipboardList size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order Details Modal Admin */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-secondary/60 backdrop-blur-md" onClick={() => setSelectedOrder(null)} />
          <div className="bg-white rounded-[40px] p-8 max-w-2xl w-full shadow-2xl relative animate-in zoom-in duration-300">
            <button 
              onClick={() => setSelectedOrder(null)}
              className="absolute right-6 top-6 p-2 text-slate-400 hover:text-secondary bg-slate-50 rounded-xl transition-all"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <ClipboardList size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Detalle Maestro de Pedido</p>
                <h3 className="text-3xl font-black text-secondary uppercase tracking-tight">
                  {selectedOrder.folio ? `Folio #${selectedOrder.folio}` : `ID: ${selectedOrder.id.slice(0, 12)}...`}
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Información del Cliente</p>
                <p className="font-bold text-secondary text-base truncate">{selectedOrder.perfiles?.nombre_completo || 'Cliente Desconocido'}</p>
                <p className="font-bold text-slate-500 text-xs truncate mb-1">{selectedOrder.perfiles?.empresa || 'Empresa Desconocida'}</p>
                <p className="font-medium text-slate-400 text-[10px] truncate">ID: {selectedOrder.cliente_id}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estado del Pedido</p>
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${selectedOrder.estatus === 'entregado' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                  <span className="font-bold text-secondary uppercase text-sm">{selectedOrder.estatus}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Productos Solicitados</p>
              {selectedOrder.items?.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                      <Package size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-secondary">{item.sku}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Cant: {item.cantidad} <span className="mx-2 text-slate-200">|</span> Unit: ${item.precio_unitario}</p>
                    </div>
                  </div>
                  <p className="text-sm font-black text-primary">${(item.precio_unitario * item.cantidad).toLocaleString()}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monto Total</p>
                <p className="text-4xl font-black text-secondary tracking-tighter">${selectedOrder.total.toLocaleString()}</p>
              </div>
              <div className="flex space-x-3">
                <button 
                  onClick={() => exportSingleOrderCSV(selectedOrder)} 
                  className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all group flex items-center space-x-2"
                  title="Exportar a CSV"
                >
                  <FileDown size={20} />
                  <span className="text-xs font-bold uppercase tracking-widest hidden sm:block">CSV</span>
                </button>
                <button 
                  onClick={() => exportSingleOrderPDF(selectedOrder)} 
                  className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all group flex items-center space-x-2"
                  title="Exportar a PDF"
                >
                  <FileDown size={20} />
                  <span className="text-xs font-bold uppercase tracking-widest hidden sm:block">PDF</span>
                </button>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="btn-primary px-8 py-4 rounded-2xl shadow-xl shadow-primary/20"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
