import React, { useState, useEffect, useCallback } from 'react';
import { Search, ChevronDown, Package, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';

interface Product {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string;
  marca: string;
  modelo: string;
  año_inicio: number;
  año_fin: number;
  precio: number;
  stock: number;
  imagenes: string[];
}

const Catalogue = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ categoria: '', marca: '', año: '' });
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  
  const { profile, addToCart } = useStore();
  const isApproved = profile?.estatus === 'aprobado';

  // Fetch unique brands
  useEffect(() => {
    const fetchBrands = async () => {
      const { data } = await supabase.from('productos').select('marca');
      if (data) {
        const brands = Array.from(new Set(data.map(i => i.marca).filter(Boolean)));
        setAvailableBrands(brands as string[]);
      }
    };
    fetchBrands();
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('productos')
      .select('*');

    if (search) {
      query = query.or(`sku.ilike.%${search}%,nombre.ilike.%${search}%`);
    }

    if (filters.marca) {
      query = query.eq('marca', filters.marca);
    }

    const { data } = await query.limit(20);
    
    if (data) setProducts(data);
    setLoading(false);
  }, [search, filters.marca]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProducts();
  }, [fetchProducts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  return (
    <div className="space-y-8">
      {/* Search and Filter Bar */}
      <div className="card-rubi p-2 sm:p-4 bg-white/50 backdrop-blur-xl border border-white">
        <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Número de parte (SKU) o nombre..."
              className="input-rubi pl-14 bg-white shadow-inner"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <select 
              className="input-rubi py-2 px-4 bg-white text-sm"
              value={filters.marca}
              onChange={(e) => setFilters({...filters, marca: e.target.value})}
            >
              <option value="">Marca</option>
              {availableBrands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
            <select className="input-rubi py-2 px-4 bg-white text-sm">
              <option value="">Año</option>
              {Array.from({length: 30}, (_, i) => 2024 - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <button type="submit" className="btn-primary py-2 px-6 lg:w-auto col-span-2 sm:col-span-1">
              Buscar
            </button>
          </div>
        </form>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="card-rubi h-80 animate-pulse bg-slate-100"></div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <Package size={64} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-500 font-medium">No se encontraron productos con estos criterios.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <div key={product.id} className="card-rubi flex flex-col group overflow-hidden p-0 h-full">
              <div className="aspect-square bg-slate-100 flex items-center justify-center relative overflow-hidden">
                {product.imagenes && product.imagenes.length > 0 ? (
                  <img 
                    src={product.imagenes[0]} 
                    alt={product.nombre} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <Package size={48} className="text-slate-300" />
                )}
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full border border-slate-100 flex items-center space-x-1">
                  <span className="text-[10px] font-black text-secondary uppercase tracking-tight">{product.marca}</span>
                </div>
              </div>
              
              <div className="p-6 flex-grow flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-primary mb-1">{product.sku}</p>
                  <h3 className="font-bold text-secondary text-lg leading-tight mb-2 group-hover:text-primary transition-colors">
                    {product.nombre}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2">{product.descripcion}</p>
                </div>
                
                <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                  {isApproved ? (
                    <>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Precio</p>
                        <p className="text-xl font-black text-secondary">${product.precio}</p>
                      </div>
                      <button 
                        onClick={() => addToCart(product)}
                        className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95 shadow-lg shadow-primary/20"
                      >
                        <ChevronDown size={24} className="-rotate-90" />
                      </button>
                    </>
                  ) : (
                    <div className="w-full bg-slate-50 rounded-2xl p-4 flex items-center space-x-3">
                      <ShieldCheck className="text-slate-400" size={20} />
                      <p className="text-[10px] text-slate-400 font-bold leading-tight">
                        PRECIOS PRIVADOS<br />
                        <span className="text-primary">SOLO MAYORISTAS</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Catalogue;
