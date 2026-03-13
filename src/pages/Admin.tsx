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

const Admin = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'products' | 'orders' | 'config'>('users');
  const [settings, setSettings] = useState<any>({
    smtp_host: '',
    smtp_port: '587',
    smtp_security: 'tls',
    smtp_sender_name: 'Refaccionaria Rubi',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
    site_url: window.location.origin,
    logo_url: ''
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
                      const { error } = await supabase.functions.invoke('admin-create-user', {
                        body: { test: true, settings }
                      });
                      if (error) throw error;
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
                <div className="grid grid-cols-2 gap-4">
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
    const { data } = await supabase.from('pedidos').select('*').order('creado_at', { ascending: false });
    if (data) setOrders(data);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const exportOrders = () => {
    const exportData = orders.flatMap(o => 
      o.items.map((item: any) => ({
        'Numero de Parte': item.sku,
        'Cantidad': item.cantidad,
        'Pedido ID': o.id,
        'Folio': o.folio || 'N/A'
      }))
    );
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Numero de Parte,Cantidad,Folio"].concat(exportData.map(e => `${e['Numero de Parte']},${e['Cantidad']},${e['Folio']}`)).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pedidos_rubi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-secondary flex items-center space-x-3">
          <div className="p-2 bg-secondary text-white rounded-lg"><ClipboardList size={20} /></div>
          <span>Historial de Pedidos</span>
        </h2>
        <button onClick={exportOrders} className="btn-secondary flex items-center space-x-2 py-2.5 px-6">
          <FileDown size={18} />
          <span>Exportar para Software</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-400 font-medium border-2 border-dashed border-slate-100 rounded-3xl">
            No hay pedidos registrados aún.
          </div>
        ) : orders.map((o) => (
          <div 
            key={o.id} 
            onClick={() => setSelectedOrder(o)}
            className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-primary/30 hover:bg-white hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm group-hover:bg-primary group-hover:text-white transition-all">
                  <Package size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                    {o.folio ? `Folio #${o.folio}` : `ID: #${o.id.slice(0,6)}`}
                  </p>
                  <p className="text-sm text-secondary font-bold">{new Date(o.creado_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-primary tracking-tight leading-none mb-1">${o.total.toLocaleString()}</p>
                <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${
                  o.estatus === 'entregado' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  {o.estatus}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
              {o.items.slice(0, 3).map((item: any, i: number) => (
                <span key={i} className="bg-white px-3 py-1.5 rounded-xl text-[9px] font-black border border-slate-200 text-secondary shadow-sm">
                  {item.sku} <span className="text-primary mx-0.5">×</span> {item.cantidad}
                </span>
              ))}
              {o.items.length > 3 && (
                <span className="bg-slate-100 px-3 py-1.5 rounded-xl text-[9px] font-black text-slate-500">
                  +{o.items.length - 3} más
                </span>
              )}
            </div>
          </div>
        ))}
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
                <p className="font-bold text-secondary text-xs truncate">ID: {selectedOrder.cliente_id}</p>
                <p className="text-[10px] text-slate-500 mt-1">Fecha: {new Date(selectedOrder.creado_at).toLocaleString()}</p>
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
                  onClick={() => window.print()} 
                  className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all"
                >
                  <FileDown size={20} />
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
