import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Search, Package, ShieldCheck, X, ChevronLeft, ChevronRight, CheckCircle2, Info, ZoomIn, Share2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import toast from 'react-hot-toast';
import { generateCatalogPDF } from '../utils/pdfCatalogGenerator';

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
  proveedor?: string;
  tipo?: string;
}

const QuantitySelector = ({ quantity, setQuantity, maxStock, size = 'md' }: { 
  quantity: number, 
  setQuantity: (q: number) => void, 
  maxStock: number,
  size?: 'sm' | 'md'
}) => {
  return (
    <div className={`flex items-center bg-slate-100 rounded-xl p-0.5 shrink-0 ${size === 'sm' ? 'scale-90 origin-right' : ''}`}>
      <button 
        onClick={(e) => { e.stopPropagation(); setQuantity(Math.max(1, quantity - 1)); }}
        className={`${size === 'sm' ? 'w-7 h-7' : 'w-8 h-8'} flex items-center justify-center hover:bg-white rounded-lg transition-all text-secondary`}
      >
        <span className="text-xl font-bold">-</span>
      </button>
      <input 
        type="number" 
        min="1" 
        max={maxStock}
        value={quantity}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => { e.stopPropagation(); setQuantity(Math.min(maxStock, Math.max(1, parseInt(e.target.value) || 1))); }}
        className={`${size === 'sm' ? 'w-6' : 'w-8'} bg-transparent text-center font-black text-secondary text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
      />
      <button 
        onClick={(e) => { e.stopPropagation(); setQuantity(Math.min(maxStock, quantity + 1)); }}
        className={`${size === 'sm' ? 'w-7 h-7' : 'w-8 h-8'} flex items-center justify-center hover:bg-white rounded-lg transition-all text-secondary`}
      >
        <span className="text-xl font-bold">+</span>
      </button>
    </div>
  );
};

const ProductCard = ({ product, isApproved, addToCart, onSelect, onShare }: {
  product: Product,
  isApproved: boolean,
  addToCart: (p: any, q?: number) => void,
  onSelect: (p: Product) => void,
  onShare: (e: React.MouseEvent, p: Product) => void
}) => {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState<false | 'success' | 'limit'>(false);
  const { cart } = useStore();
  const currentInCart = cart.find(i => i.id === product.id)?.cantidad || 0;
  const isAtLimit = currentInCart >= product.stock;
  
  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.stock > 0) {
      if (isAtLimit) {
        setAdded('limit');
        setTimeout(() => setAdded(false), 2000);
        return;
      }
      addToCart(product, quantity);
      setAdded('success');
      setTimeout(() => setAdded(false), 2000);
    }
  };

  return (
    <div className="card-rubi flex flex-col group overflow-hidden p-0 h-full">
      <div 
        className="aspect-square bg-slate-100 flex items-center justify-center relative overflow-hidden cursor-pointer"
        onClick={() => onSelect(product)}
      >
        {product.imagenes && product.imagenes.length > 0 ? (
          <>
            <img 
              src={product.imagenes[0]} 
              alt={product.nombre} 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            {product.imagenes.length > 1 && (
              <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                1/{product.imagenes.length}
              </div>
            )}
          </>
        ) : (
          <Package size={48} className="text-slate-300" />
        )}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full border border-slate-100 flex items-center space-x-1">
          <span className="text-[10px] font-black text-secondary uppercase tracking-tight">{product.marca}</span>
        </div>
        {product.stock <= 0 && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-10">
            <span className="bg-rose-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg shadow-rose-500/20 uppercase tracking-widest ring-4 ring-rose-500/10 animate-in fade-in zoom-in duration-300">
              Sin Existencia
            </span>
          </div>
        )}
        <button 
          onClick={(e) => onShare(e, product)}
          className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-2 rounded-full border border-slate-100 text-slate-400 hover:text-primary transition-colors z-20 shadow-sm"
          title="Compartir producto"
        >
          <Share2 size={16} />
        </button>
      </div>
      
      <div 
        className="p-6 flex-grow flex flex-col justify-between cursor-pointer"
        onClick={() => onSelect(product)}
      >
        <div>
          <p className="text-xs font-bold text-primary mb-1">{product.sku}</p>
          <h3 className="font-bold text-secondary text-lg leading-tight mb-2 group-hover:text-primary transition-colors">
            {product.nombre}
          </h3>
          <p className="text-xs text-slate-500 line-clamp-2">{product.descripcion}</p>
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-50">
          {isApproved ? (
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Precio</p>
                  <p className="text-xl font-black text-secondary">
                    ${product.precio.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                {product.stock > 0 && (
                  <QuantitySelector 
                    quantity={quantity} 
                    setQuantity={setQuantity} 
                    maxStock={product.stock}
                    size="sm"
                  />
                )}
              </div>
              
              <button 
                onClick={handleAdd}
                disabled={added === 'success' || product.stock <= 0}
                className={`h-11 w-full ${
                  product.stock <= 0 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : added === 'success'
                      ? 'bg-emerald-500 text-white' 
                      : added === 'limit'
                        ? 'bg-amber-500 text-white'
                        : 'bg-primary text-white hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5'
                } rounded-xl flex items-center justify-center space-x-2 transition-all group/btn`}
              >
                {product.stock <= 0 ? (
                  <>
                    <X size={18} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Sin Existencia</span>
                  </>
                ) : added === 'success' ? (
                  <>
                    <CheckCircle2 size={18} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Agregado</span>
                  </>
                ) : added === 'limit' ? (
                  <>
                    <Package size={18} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Sin más existencia</span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-black uppercase tracking-wider">Agregar al Carrito</span>
                    <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
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
  );
};

const Catalogue = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ categoria: '', marca: '', proveedor: '', tipo: '', modelo: '', año: '' });
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [exporting, setExporting] = useState<false | 'csv' | 'pdf'>(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const { profile, config, addToCart } = useStore();
  const isApproved = profile?.estatus === 'aprobado';
  const catalogTopRef = useRef<HTMLDivElement>(null);

  const [searchParams] = useSearchParams();

  const handleShare = async (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}${window.location.pathname}?sku=${product.sku}`;
    const shareData = {
      title: product.nombre,
      text: `Mira esta refacción en Refaccionaria Rubi: ${product.nombre} (SKU: ${product.sku})`,
      url: shareUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.log('Error sharing:', err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('¡Enlace copiado al portapapeles!');
      } catch (err) {
        toast.error('No se pudo copiar el enlace');
      }
    }
  };

  // Deep linking: Open product if SKU is in URL
  useEffect(() => {
    const skuParam = searchParams.get('sku');
    if (skuParam) {
      const fetchProductBySku = async () => {
        const { data, error } = await supabase
          .from('productos')
          .select('*')
          .ilike('sku', skuParam)
          .single();
        
        if (data && !error) {
          setSelectedProduct(data);
          // Small delay to ensure the page has rendered before scrolling
          setTimeout(() => {
            const el = document.getElementById('catalogo');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }, 600);
        } else if (error) {
          console.error('Error fetching deep-linked product:', error);
        }
      };
      fetchProductBySku();
    }
  }, [searchParams]);

  // Fetch unique brands and other filter options
  // Uses RPC for high performance with large datasets, with a fallback to batch fetching
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        // 1. Try RPC first (Scalable solution for 15k+ products)
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_catalog_filters');
        
        if (rpcData && !rpcError) {
          setAvailableBrands(rpcData.marcas || []);
          setAvailableProviders(rpcData.proveedores || []);
          setAvailableTypes(rpcData.tipos || []);
          setAvailableModels(rpcData.modelos || []);
          setAvailableYears(rpcData.años || []);
          return;
        }

        // 2. Fallback to batch fetching if RPC fails or is not yet created
        let allData: any[] = [];
        let from = 0;
        const step = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('productos')
            .select('marca, proveedor, tipo, modelo, año_inicio, año_fin')
            .range(from, from + step - 1);
          
          if (error) {
            console.error('Error fetching filter data (batch):', error);
            hasMore = false;
            break;
          }

          if (data && data.length > 0) {
            allData = [...allData, ...data];
            from += step;
            if (data.length < step) hasMore = false;
          } else {
            hasMore = false;
          }
        }

        if (allData.length > 0) {
          setAvailableBrands(Array.from(new Set(allData.map((i: any) => i.marca).filter(Boolean))).sort() as string[]);
          setAvailableProviders(Array.from(new Set(allData.map((i: any) => i.proveedor).filter(Boolean))).sort() as string[]);
          setAvailableTypes(Array.from(new Set(allData.map((i: any) => i.tipo).filter(Boolean))).sort() as string[]);
          setAvailableModels(Array.from(new Set(allData.map((i: any) => i.modelo).filter(Boolean))).sort() as string[]);
          
          const years = new Set<number>();
          allData.forEach((p: any) => {
            if (p.año_inicio) years.add(p.año_inicio);
            if (p.año_fin) years.add(p.año_fin);
          });
          setAvailableYears(Array.from(years).sort((a, b) => b - a));
        }
      } catch (err) {
        console.error('Unexpected error in fetchFilterData:', err);
      }
    };
    fetchFilterData();
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('productos')
      .select('*', { count: 'exact' });

    if (search) {
      const formattedSearch = search
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(word => `${word}:*`)
        .join(' & ');

      query = query.textSearch('fts_vector', formattedSearch, { 
        config: 'spanish'
      });
    }

    if (filters.marca) query = query.eq('marca', filters.marca);
    if (filters.proveedor) query = query.eq('proveedor', filters.proveedor);
    if (filters.tipo) query = query.eq('tipo', filters.tipo);
    if (filters.modelo) query = query.eq('modelo', filters.modelo);
    if (filters.año) {
      const year = parseInt(filters.año);
      query = query.or(`and(año_inicio.lte.${year},año_fin.gte.${year}),and(año_inicio.lte.${year},año_fin.is.null),and(año_inicio.is.null,año_fin.gte.${year})`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count } = await query
      .range(from, to)
      .order('nombre', { ascending: true });
    
    if (data) setProducts(data);
    if (count !== null) setTotalCount(count);
    setLoading(false);
  }, [search, filters, page, pageSize]);

  const getFullFilteredData = async () => {
    let query = supabase.from('productos').select('*');

    if (search) {
      const formattedSearch = search
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(word => `${word}:*`)
        .join(' & ');

      query = query.textSearch('fts_vector', formattedSearch, { 
        config: 'spanish'
      });
    }

    if (filters.marca) query = query.eq('marca', filters.marca);
    if (filters.proveedor) query = query.eq('proveedor', filters.proveedor);
    if (filters.tipo) query = query.eq('tipo', filters.tipo);
    if (filters.modelo) query = query.eq('modelo', filters.modelo);
    if (filters.año) {
      const year = parseInt(filters.año);
      query = query.or(`and(año_inicio.lte.${year},año_fin.gte.${year}),and(año_inicio.lte.${year},año_fin.is.null),and(año_inicio.is.null,año_fin.gte.${year})`);
    }

    const { data, error } = await query.order('nombre', { ascending: true });
    if (error) {
      toast.error('Error al obtener datos para exportar: ' + error.message);
      return [];
    }
    return (data as Product[]) || [];
  };

  const exportToCSV = (data: Product[]) => {
    const headers = ['SKU', 'Nombre', 'Marca'];
    if (config?.show_modelo !== false) headers.push('Modelo');
    if (config?.show_proveedor !== false) headers.push('Proveedor');
    headers.push('Tipo', 'Precio');
    
    const rows = data.map(p => {
      const row = [
        `"${p.sku}"`,
        `"${p.nombre}"`,
        `"${p.marca}"`
      ];
      if (config?.show_modelo !== false) row.push(`"${p.modelo || ''}"`);
      if (config?.show_proveedor !== false) row.push(`"${p.proveedor || ''}"`);
      row.push(`"${p.tipo || ''}"`, p.precio.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      return row;
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Catalogo_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Export functions have been moved to ../utils/pdfCatalogGenerator.ts

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProducts();
    if (page > 1 || pageSize !== 25) { // Only scroll if not on initial load
      catalogTopRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [fetchProducts]);


  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page on new search
    fetchProducts();
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div ref={catalogTopRef} className="space-y-8">
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <select 
              className="input-rubi py-2 px-4 bg-white text-xs"
              value={filters.marca}
              onChange={(e) => {
                setFilters({...filters, marca: e.target.value});
                setPage(1);
              }}
            >
              <option value="">Marca</option>
              {availableBrands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
            {config?.show_proveedor !== false && (
              <select 
                className="input-rubi py-2 px-4 bg-white text-xs"
                value={filters.proveedor}
                onChange={(e) => {
                  setFilters({...filters, proveedor: e.target.value});
                  setPage(1);
                }}
              >
                <option value="">Proveedor</option>
                {availableProviders.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}
            <select 
              className="input-rubi py-2 px-4 bg-white text-xs"
              value={filters.tipo}
              onChange={(e) => {
                setFilters({...filters, tipo: e.target.value});
                setPage(1);
              }}
            >
              <option value="">Tipo / Cat.</option>
              {availableTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {config?.show_modelo !== false && (
              <select 
                className="input-rubi py-2 px-4 bg-white text-xs"
                value={filters.modelo}
                onChange={(e) => {
                  setFilters({...filters, modelo: e.target.value});
                  setPage(1);
                }}
              >
                <option value="">Modelo</option>
                {availableModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            )}
            <select 
              className="input-rubi py-2 px-4 bg-white text-xs"
              value={filters.año}
              onChange={(e) => {
                setFilters({...filters, año: e.target.value});
                setPage(1);
              }}
            >
              <option value="">Año</option>
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <select 
              className="input-rubi py-2 px-4 bg-slate-50 border-primary/20 text-primary font-bold text-xs"
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setPage(1);
              }}
            >
              <option value="25">Ver 25</option>
              <option value="50">Ver 50</option>
              <option value="100">Ver 100</option>
            </select>
            
            <button type="submit" className="btn-primary py-2 px-6 text-sm">
              Buscar
            </button>
          </div>
        </form>
      </div>

      <div className="flex items-center justify-between px-2 -mt-4">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Mostrando <span className="text-primary">{Math.min(totalCount, (page - 1) * pageSize + 1)}</span> - <span className="text-primary">{Math.min(totalCount, page * pageSize)}</span> de <span className="text-secondary font-black">{totalCount}</span> productos
        </p>
      </div>

      {profile && (
        <div className="flex flex-col items-center justify-center space-y-4 pt-2 pb-6">
          <div className="flex items-center space-x-2 text-slate-500 bg-white/50 backdrop-blur-sm px-6 py-2 rounded-full border border-white shadow-sm">
            <Info size={14} className="text-primary" />
            <p className="text-[10px] md:text-xs font-medium">
              Filtra los productos deseados y usa estos botones para exportar tu catálogo personalizado
            </p>
          </div>
          <div className="flex justify-center space-x-3">
            <button 
              onClick={async () => {
                setExporting('csv');
                const allData = await getFullFilteredData();
                if (allData.length > 0) exportToCSV(allData);
                setExporting(false);
              }}
              disabled={exporting !== false || loading}
              className="flex items-center space-x-2 bg-emerald-50 text-emerald-600 px-5 py-2.5 rounded-xl border border-emerald-100 font-bold text-xs hover:bg-emerald-100 transition-all hover:scale-105 active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting === 'csv' ? (
                <div className="w-4 h-4 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
              ) : null}
              <span>{exporting === 'csv' ? 'Generando...' : 'Exportar CSV'}</span>
            </button>
            <button 
              onClick={() => setShowExportModal(true)}
              disabled={exporting !== false || loading}
              className="flex items-center space-x-2 bg-rose-50 text-rose-600 px-5 py-2.5 rounded-xl border border-rose-100 font-bold text-xs hover:bg-rose-100 transition-all hover:scale-105 active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting === 'pdf' ? (
                <div className="w-4 h-4 border-2 border-rose-600/30 border-t-rose-600 rounded-full animate-spin" />
              ) : null}
              <span>{exporting === 'pdf' ? 'Generando...' : 'Exportar PDF'}</span>
            </button>
          </div>
        </div>
      )}

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
            <ProductCard 
              key={product.id}
              product={product}
              isApproved={isApproved}
              addToCart={addToCart}
              onSelect={setSelectedProduct}
              onShare={handleShare}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 pt-8">
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="p-2 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, i, arr) => (
                <React.Fragment key={p}>
                  {i > 0 && arr[i-1] !== p-1 && <span className="text-slate-300">...</span>}
                  <button
                    onClick={() => setPage(p)}
                    className={`w-10 h-10 rounded-xl font-bold text-xs transition-all ${
                      page === p 
                        ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                        : 'bg-white border border-slate-100 text-slate-500 hover:border-primary/50'
                    }`}
                  >
                    {p}
                  </button>
                </React.Fragment>
              ))}
          </div>

          <button 
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="p-2 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
      {/* Export Options Modal */}
      {showExportModal && (
        <PDFExportModal 
          isApproved={isApproved}
          isGenerating={exporting === 'pdf'}
          totalCount={totalCount}
          onClose={() => setShowExportModal(false)}
          onConfirm={async (options) => {
            try {
              setExporting('pdf');
              const allData = await getFullFilteredData();
              if (allData.length > 0) await generateCatalogPDF(allData, options, config);
            } catch (error) {
              console.error("Error exporting PDF:", error);
              toast.error("Error al generar el PDF");
            } finally {
              setExporting(false);
              setShowExportModal(false);
            }
          }}
        />
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
          addToCart={addToCart}
          isApproved={isApproved}
          onShare={handleShare}
        />
      )}
    </div>
  );
};

const ProductDetailModal = ({ product, onClose, addToCart, isApproved, onShare }: { 
  product: Product, 
  onClose: () => void, 
  addToCart: (p: any, q?: number) => void,
  isApproved: boolean,
  onShare: (e: React.MouseEvent, p: Product) => void
}) => {
  const { config } = useStore();
  const [activeImage, setActiveImage] = useState(0);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isDeepZoom, setIsDeepZoom] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [added, setAdded] = useState<false | 'success' | 'limit'>(false);
  const [quantity, setQuantity] = useState(1);
  const { cart } = useStore();
  const currentInCart = cart.find(i => i.id === product.id)?.cantidad || 0;
  const isAtLimit = currentInCart >= product.stock;
  const images = product.imagenes && product.imagenes.length > 0 ? product.imagenes : [];

  const handleNextZoom = useCallback((e?: React.MouseEvent | KeyboardEvent) => {
    if (e) e.stopPropagation();
    setIsDeepZoom(false);
    setActiveImage((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const handlePrevZoom = useCallback((e?: React.MouseEvent | KeyboardEvent) => {
    if (e) e.stopPropagation();
    setIsDeepZoom(false);
    setActiveImage((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!zoomedImage) return;
      if (e.key === 'ArrowRight') handleNextZoom(e);
      if (e.key === 'ArrowLeft') handlePrevZoom(e);
      if (e.key === 'Escape') {
        setIsDeepZoom(false);
        setZoomedImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomedImage, handleNextZoom, handlePrevZoom]);

  useEffect(() => {
    if (images.length > 1 && !zoomedImage) {
      const timer = setInterval(() => {
        setActiveImage(prev => (prev + 1) % images.length);
      }, 4000);
      return () => clearInterval(timer);
    }
  }, [images.length, zoomedImage]);

  const handleAddToCart = () => {
    if (isAtLimit) {
      setAdded('limit');
      setTimeout(() => setAdded(false), 2000);
      return;
    }
    addToCart(product, quantity);
    setAdded('success');
    // Non-blocking UI feedback
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-secondary/80 backdrop-blur-md" 
        onClick={onClose} 
      />
      <div 
        className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl relative overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-[110] p-2 bg-white/80 backdrop-blur-md rounded-full text-secondary hover:text-rose-500 transition-all shadow-lg border border-slate-100"
        >
          <X size={24} />
        </button>

        {/* Share button */}
        <button 
          onClick={(e) => onShare(e, product)}
          className="absolute top-6 right-20 z-[110] p-2 bg-white/80 backdrop-blur-md rounded-full text-secondary hover:text-primary transition-all shadow-lg border border-slate-100 flex items-center space-x-2 px-4"
        >
          <Share2 size={18} />
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Compartir</span>
        </button>

        <div className="overflow-y-auto custom-scrollbar flex-grow">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left: Image Gallery */}
            <div className="p-6 sm:p-10 lg:pr-5 bg-slate-50/50">
              <div className="aspect-square bg-white rounded-[32px] overflow-hidden border border-slate-100 relative group shadow-inner">
                {images.length > 0 ? (
                  <div 
                    className="w-full h-full relative group cursor-zoom-in"
                    onClick={() => setZoomedImage(images[activeImage])}
                  >
                    <img 
                      src={images[activeImage]} 
                      alt={product.nombre} 
                      className="w-full h-full object-contain animate-in fade-in duration-500 p-4 transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-white/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]">
                      <div className="bg-white/90 p-3 rounded-2xl shadow-xl text-primary">
                        <ZoomIn size={32} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-200">
                    <Package size={80} />
                  </div>
                )}
                
                {images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-1.5 z-20">
                    {images.map((_: any, i: number) => (
                      <button 
                        key={i} 
                        onClick={() => setActiveImage(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeImage ? 'bg-primary w-4' : 'bg-primary/20'}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex space-x-3 overflow-x-auto mt-4 pb-2 custom-scrollbar">
                  {images.map((img: string, i: number) => (
                    <button 
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={`w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all flex-shrink-0 bg-white ${i === activeImage ? 'border-primary shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    >
                      <img src={img} className="w-full h-full object-contain p-1" alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Product Info */}
            <div className="p-6 sm:p-10 lg:pl-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider">{product.sku}</span>
                    <span className="bg-secondary/5 text-secondary text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">{product.marca}</span>
                  </div>
                  <h2 className="text-2xl font-black text-secondary uppercase tracking-tight leading-tight mb-2">{product.nombre}</h2>
                  <p className="text-slate-500 text-xs leading-relaxed line-clamp-3 overflow-y-auto">{product.descripcion}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tipo</p>
                    <p className="font-bold text-secondary text-xs truncate">{product.tipo || 'N/A'}</p>
                  </div>
                  
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Año</p>
                    <p className="font-bold text-secondary text-xs truncate">
                      {product.año_inicio && product.año_fin 
                        ? `${product.año_inicio} - ${product.año_fin}`
                        : product.año_inicio 
                          ? `Año ${product.año_inicio}` 
                          : 'N/A'}
                    </p>
                  </div>

                  {config?.show_modelo !== false && (
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Modelo</p>
                      <p className="font-bold text-secondary text-xs truncate">{product.modelo || 'Universal'}</p>
                    </div>
                  )}

                  {config?.show_proveedor !== false && (
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Proveedor</p>
                      <p className="font-bold text-secondary text-xs truncate">{product.proveedor || 'N/A'}</p>
                    </div>
                  )}

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden col-span-2">
                    <div className={`absolute top-0 right-0 w-1 h-full ${product.stock > 10 ? 'bg-green-500' : product.stock > 0 ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Existencia</p>
                    <p className={`font-bold text-xs truncate ${product.stock <= 0 ? 'text-rose-500' : 'text-secondary'}`}>
                      {product.stock > 0 ? `${product.stock} piezas disponibles` : 'Sin Existencia'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                {isApproved ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total</p>
                        <p className="text-3xl font-black text-secondary tracking-tighter">
                          ${(product.precio * quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <QuantitySelector 
                        quantity={quantity} 
                        setQuantity={setQuantity} 
                        maxStock={product.stock} 
                      />
                    </div>

                    <button 
                      onClick={() => product.stock > 0 && handleAddToCart()}
                      disabled={product.stock <= 0}
                      className={`${
                        product.stock <= 0
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-none shadow-none'
                          : added === 'success' 
                            ? 'bg-emerald-500 shadow-emerald-200 text-white translate-y-[-2px]' 
                            : added === 'limit'
                              ? 'bg-amber-500 text-white translate-y-[-2px]'
                              : 'btn-primary text-white shadow-xl group hover:translate-y-[-2px]'
                      } w-full h-14 rounded-2xl flex items-center justify-center space-x-3 transition-all`}
                    >
                      {product.stock <= 0 ? (
                        <>
                          <X size={24} />
                          <span className="font-black uppercase tracking-wider">Sin Existencia</span>
                        </>
                      ) : added === 'success' ? (
                        <>
                          <CheckCircle2 size={24} />
                          <span className="font-black uppercase tracking-wider text-sm tracking-widest">¡Agregado!</span>
                        </>
                      ) : added === 'limit' ? (
                        <>
                          <Package size={24} />
                          <span className="font-black uppercase tracking-wider text-sm tracking-widest">Sin más existencia</span>
                        </>
                      ) : (
                        <>
                          <span className="font-black uppercase tracking-wider text-sm tracking-widest">Agregar al Pedido</span>
                          <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="w-full bg-slate-50 rounded-2xl p-5 flex items-center space-x-4 border border-slate-100">
                    <ShieldCheck className="text-primary" size={28} />
                    <div>
                      <p className="text-xs font-black text-secondary uppercase tracking-tight">Precios Exclusivos</p>
                      <p className="text-[10px] text-slate-500 font-medium leading-none">Regístrate para ver precios y comprar</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Zoom Overlay */}
      {zoomedImage && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 p-4 md:p-8 animate-in fade-in duration-200 overflow-hidden"
          onClick={() => {
            setIsDeepZoom(false);
            setZoomedImage(null);
          }}
        >
          {/* Header Controls */}
          <div className="absolute top-0 inset-x-0 p-6 flex items-center justify-between z-50">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-white font-bold text-sm">
              {activeImage + 1} / {images.length}
            </div>
            
            <div className="flex items-center space-x-4">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest hidden md:block">
                {isDeepZoom ? 'Mueve el mouse para explorar' : 'Haz clic para ampliar detalles'}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDeepZoom(false);
                  setZoomedImage(null);
                }}
                className="p-3 bg-white/10 hover:bg-rose-500 text-white rounded-2xl backdrop-blur-md transition-all border border-white/10 group shadow-xl"
              >
                <X size={24} className="group-hover:rotate-90 transition-transform" />
              </button>
            </div>
          </div>

          {/* Navigation Buttons */}
          {images.length > 1 && !isDeepZoom && (
            <>
              <button 
                onClick={handlePrevZoom}
                className="absolute left-2 md:left-8 z-[100] p-4 rounded-full bg-black/50 md:bg-white/5 hover:bg-white/20 text-white transition-all backdrop-blur-md border border-white/10 hover:scale-110 active:scale-95 shadow-2xl"
              >
                <ChevronLeft size={28} className="md:w-8 md:h-8" />
              </button>
              <button 
                onClick={handleNextZoom}
                className="absolute right-2 md:right-8 z-[100] p-4 rounded-full bg-black/50 md:bg-white/5 hover:bg-white/20 text-white transition-all backdrop-blur-md border border-white/10 hover:scale-110 active:scale-95 shadow-2xl"
              >
                <ChevronRight size={28} className="md:w-8 md:h-8" />
              </button>
            </>
          )}

          {/* Image Container */}
          <div 
            className={`w-full h-full flex items-center justify-center transition-all duration-300 ${isDeepZoom ? 'cursor-zoom-out' : 'cursor-zoom-in p-4 md:p-12'}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!isDeepZoom) setMousePos({ x: 50, y: 50 });
              setIsDeepZoom(!isDeepZoom);
            }}
            onMouseMove={(e) => {
              if (!isDeepZoom) return;
              const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - left) / width) * 100;
              const y = ((e.clientY - top) / height) * 100;
              setMousePos({ x, y });
            }}
          >
            <img 
              src={images[activeImage]} 
              alt="Zoomed Product" 
              style={isDeepZoom ? {
                transform: 'scale(2.5)',
                transformOrigin: `${mousePos.x}% ${mousePos.y}%`
              } : {}}
              className={`max-w-full max-h-full object-contain transition-transform duration-300 select-none ${isDeepZoom ? 'animate-none' : 'animate-in zoom-in'}`}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const PDFExportModal = ({ 
  onClose, 
  onConfirm,
  isGenerating,
  isApproved,
  totalCount
}: { 
  onClose: () => void, 
  onConfirm: (options: { includeImages: boolean, includePrice: boolean, template: 'table' | 'grid' }) => void,
  isGenerating: boolean,
  isApproved: boolean,
  totalCount: number
}) => {
  const [options, setOptions] = useState<{
    includeImages: boolean, 
    includePrice: boolean, 
    template: 'table' | 'grid'
  }>({ 
    includeImages: totalCount <= 300, 
    includePrice: isApproved,
    template: 'table'
  });
  const isLargeExport = totalCount > 300;
  const isVeryLargeExport = totalCount > 1000;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-secondary/80 backdrop-blur-md" onClick={onClose} />
      <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl relative overflow-hidden animate-in zoom-in duration-300 p-8">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-rose-500 transition-colors">
          <X size={20} />
        </button>
        
        <div className="mb-6 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package size={32} />
          </div>
          <h3 className="text-xl font-black text-secondary mb-2">Opciones de Exportación</h3>
          <p className="text-xs text-slate-500">Personaliza tu catálogo PDF antes de descargar.</p>
        </div>

        <div className="space-y-4 mb-8">
          <label className={`flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-colors ${options.template === 'grid' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100'} group`}>
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg transition-colors ${options.includeImages ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-400'}`}>
                <Package size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-secondary">Incluir Imágenes</p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {options.template === 'grid' ? 'Obligatorio en formato Folleto' : 'Muestra la foto principal'}
                </p>
              </div>
            </div>
            <div className="relative">
              <input 
                type="checkbox" 
                checked={options.includeImages} 
                onChange={() => {
                  if (options.template !== 'grid') {
                    setOptions({ ...options, includeImages: !options.includeImages });
                  }
                }}
                className="sr-only peer"
              />
              <div className={`w-10 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${options.includeImages ? 'bg-rose-500' : ''}`}></div>
            </div>
          </label>

          <label className={`flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-colors ${!isApproved ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100'}`}>
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg transition-colors ${options.includePrice ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                <span className="font-bold text-sm">$</span>
              </div>
              <div>
                <p className="text-sm font-bold text-secondary">Incluir Precios</p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {!isApproved ? 'Solo para mayoristas autorizados' : 'Muestra el precio unitario'}
                </p>
              </div>
            </div>
            {isApproved && (
              <div className="relative">
                <input 
                  type="checkbox" 
                  checked={options.includePrice} 
                  onChange={() => setOptions({ ...options, includePrice: !options.includePrice })}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
              </div>
            )}
          </label>

          <div className="pt-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Plantilla de Diseño</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOptions({ ...options, template: 'table' })}
                className={`p-3 rounded-2xl border-2 transition-all text-left ${options.template === 'table' ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <p className="text-xs font-bold text-secondary">Tabla</p>
                <p className="text-[9px] text-slate-500 font-medium">Lista compacta</p>
              </button>
              <button
                type="button"
                onClick={() => setOptions({ ...options, template: 'grid', includeImages: true })}
                className={`p-3 rounded-2xl border-2 transition-all text-left ${options.template === 'grid' ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <p className="text-xs font-bold text-secondary">Grilla (Folleto)</p>
                <p className="text-[9px] text-slate-500 font-medium">5 items por fila</p>
              </button>
            </div>
          </div>

          {(options.includeImages && isLargeExport) && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-start space-x-2 animate-in fade-in slide-in-from-top-1">
              <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-[9px] text-amber-700 leading-tight">
                {isVeryLargeExport 
                  ? "Exportar más de 1000 imágenes puede agotar la memoria del navegador. Te recomendamos filtrar los productos antes de exportar."
                  : "Estás exportando un catálogo grande. El proceso puede tardar unos minutos debido al procesamiento de imágenes."}
              </p>
            </div>
          )}
        </div>

        <button 
          onClick={() => onConfirm(options)}
          disabled={isGenerating}
          className="w-full h-14 bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-rose-200 hover:bg-rose-600 hover:translate-y-[-2px] active:translate-y-0 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Generando Catálogo...</span>
            </>
          ) : (
            <span>Descargar PDF</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default Catalogue;
