import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Package, 
  ClipboardList, 
  Settings, 
  Download, 
  Plus, 
  Check, 
  X,
  FileDown,
  Upload
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';

const Admin = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'products' | 'orders'>('users');
  const profile = useStore(state => state.profile);

  if (!profile?.es_admin) {
    return <div className="p-20 text-center font-bold">Acceso Denegado</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black text-secondary tracking-tighter">PANEL DE CONTROL</h1>
          <p className="text-slate-500">Gestión de Refaccionaria Rubi</p>
        </div>
        
        <div className="flex bg-white p-1.5 rounded-2xl shadow-soft border border-slate-100">
          {[
            { id: 'users', label: 'Usuarios', icon: Users },
            { id: 'products', label: 'Productos', icon: Package },
            { id: 'orders', label: 'Pedidos', icon: ClipboardList },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
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

      <div className="card-rubi p-8 min-h-[600px]">
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'products' && <ProductManagement />}
        {activeTab === 'orders' && <OrderManagement />}
      </div>
    </div>
  );
};

const UserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase.from('perfiles').select('*').order('creado_at', { ascending: false });
    if (data) setUsers(data);
    setLoading(false);
  };

  const updateStatus = async (uid: string, status: string) => {
    await supabase.from('perfiles').update({ estatus: status }).eq('id', uid);
    fetchUsers();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-secondary">Aprobación de Talleres</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="pb-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-4">Nombre</th>
              <th className="pb-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-4">Empresa</th>
              <th className="pb-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-4">Estatus</th>
              <th className="pb-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-4 font-bold text-secondary">{u.nombre_completo}</td>
                <td className="py-4 px-4 text-slate-500">{u.empresa}</td>
                <td className="py-4 px-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                    u.estatus === 'aprobado' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {u.estatus}
                  </span>
                </td>
                <td className="py-4 px-4 text-right space-x-2">
                  {u.estatus === 'pendiente' && (
                    <button 
                      onClick={() => updateStatus(u.id, 'aprobado')}
                      className="p-2 bg-secondary text-white rounded-lg hover:bg-primary transition-colors"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <button className="p-2 text-slate-300 hover:text-rose-500">
                    <X size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ProductManagement = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from('productos').select('*').limit(50);
    if (data) setProducts(data);
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const productsToUpsert = lines.slice(1).map(line => {
        const [sku, nombre, precio, stock, marca] = line.split(',');
        if (!sku) return null;
        return { 
          sku: sku.trim(), 
          nombre: nombre?.trim(), 
          precio: parseFloat(precio), 
          stock: parseInt(stock), 
          marca: marca?.trim() 
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-secondary">Catálogo de Productos</h2>
        <div className="flex space-x-3">
          <label className="btn-secondary flex items-center space-x-2 py-2 cursor-pointer">
            <Upload size={18} />
            <span>Importar CSV</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
          </label>
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center space-x-2 py-2">
            <Plus size={18} />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p) => (
          <div key={p.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-primary">{p.sku}</p>
              <p className="font-bold text-secondary">{p.nombre}</p>
              <p className="text-xs text-slate-400">Stock: {p.stock}</p>
            </div>
            <p className="font-black text-secondary">${p.precio}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const OrderManagement = () => {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const { data } = await supabase.from('pedidos').select('*').order('creado_at', { ascending: false });
    if (data) setOrders(data);
  };

  const exportOrders = () => {
    // Logic for technical export format (SKU, Qty)
    const exportData = orders.flatMap(o => 
      o.items.map((item: any) => ({
        'Numero de Parte': item.sku,
        'Cantidad': item.cantidad,
        'Pedido ID': o.id
      }))
    );
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Numero de Parte,Cantidad"].concat(exportData.map(e => `${e['Numero de Parte']},${e['Cantidad']}`)).join("\n");
    
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
        <h2 className="text-2xl font-black text-secondary">Historial de Pedidos</h2>
        <button onClick={exportOrders} className="btn-secondary flex items-center space-x-2 py-2">
          <FileDown size={18} />
          <span>Exportar para Software</span>
        </button>
      </div>

      <div className="space-y-4">
        {orders.map((o) => (
          <div key={o.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pedido #{o.id.slice(0,8)}</p>
                <p className="text-sm text-slate-500 font-medium">{new Date(o.creado_at).toLocaleDateString()}</p>
              </div>
              <p className="text-xl font-black text-secondary">${o.total}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {o.items.map((item: any, i: number) => (
                <span key={i} className="bg-white px-3 py-1 rounded-lg text-[10px] font-bold border border-slate-200">
                  {item.sku} (x{item.cantidad})
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Admin;
