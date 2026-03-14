import React, { useState, useEffect, useCallback } from 'react';
import { Search, ChevronDown, Package, ShieldCheck, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 12;
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { profile, addToCart } = useStore();
  const isApproved = profile?.estatus === 'aprobado';

  // Fetch unique brands
  useEffect(() => {
    const fetchFilterData = async () => {
      const { data } = await supabase.from('productos').select('marca, proveedor, tipo, modelo, año_inicio, año_fin');
      if (data) {
        setAvailableBrands(Array.from(new Set(data.map((i: any) => i.marca).filter(Boolean))) as string[]);
        setAvailableProviders(Array.from(new Set(data.map((i: any) => i.proveedor).filter(Boolean))) as string[]);
        setAvailableTypes(Array.from(new Set(data.map((i: any) => i.tipo).filter(Boolean))) as string[]);
        setAvailableModels(Array.from(new Set(data.map((i: any) => i.modelo).filter(Boolean))) as string[]);
        
        const years = new Set<number>();
        data.forEach((p: any) => {
          if (p.año_inicio) years.add(p.año_inicio);
          if (p.año_fin) years.add(p.año_fin);
        });
        setAvailableYears(Array.from(years).sort((a, b) => b - a));
      }
    };
    fetchFilterData();
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('productos')
      .select('*');

    if (search) {
      query = query.or(`sku.ilike.%${search}%,nombre.ilike.%${search}%`);
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
      .order('creado_at', { ascending: false });
    
    if (data) setProducts(data);
    if (count !== null) setTotalCount(count);
    setLoading(false);
  }, [search, filters, page]);

  const exportToCSV = (data: Product[]) => {
    const headers = ['SKU', 'Nombre', 'Marca', 'Modelo', 'Proveedor', 'Tipo', 'Precio'];
    const rows = data.map(p => [
      `"${p.sku}"`,
      `"${p.nombre}"`,
      `"${p.marca}"`,
      `"${p.modelo || ''}"`,
      `"${p.proveedor || ''}"`,
      `"${p.tipo || ''}"`,
      p.precio
    ]);

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

  const getBase64ImageFromURL = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.setAttribute("crossOrigin", "anonymous");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL("image/png");
        resolve(dataURL);
      };
      img.onerror = (error) => reject(error);
      img.src = url;
    });
  };

  const exportToPDF = async (data: Product[]) => {
    const doc = new jsPDF();
    const config = useStore.getState().config;

    // Add Logo if available
    if (config?.logo_url) {
      try {
        const logoData = await getBase64ImageFromURL(config.logo_url);
        doc.addImage(logoData, 'PNG', 14, 10, 30, 30);
      } catch (e) {
        console.error("Could not add logo to PDF", e);
      }
    }

    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.setFont('helvetica', 'bold');
    doc.text(config?.platform_name || 'TecnosisMX', config?.logo_url ? 50 : 14, 20);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const headerX = config?.logo_url ? 50 : 14;
    doc.text(`${config?.footer_contact_address || ''}`, headerX, 26, { maxWidth: 140 });
    doc.text(`Tel: ${config?.footer_contact_phone || ''} | Email: ${config?.footer_contact_email || ''}`, headerX, 34);
    
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(14, 42, 196, 42);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Catálogo de Productos - ${new Date().toLocaleDateString()}`, 14, 50);
    doc.text(`Total: ${data.length} ítems`, 180, 50, { align: 'right' });
    
    const tableColumn = ["SKU", "Producto", "Marca", "Modelo", "Año", "Proveedor", "Precio"];
    const tableRows = data.map(p => [
      p.sku,
      p.nombre,
      p.marca,
      p.modelo || 'N/A',
      p.año_inicio && p.año_fin ? `${p.año_inicio}-${p.año_fin}` : (p.año_inicio || p.año_fin || 'N/A'),
      p.proveedor || 'N/A',
      `$${p.precio.toLocaleString()}`
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 55,
      styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { top: 55 },
      didDrawPage: (dataArg: any) => {
        // Simple footer
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(`Página ${dataArg.pageNumber} de ${pageCount}`, 196, 285, { align: 'right' });
      }
    });
    
    const fileName = `Catalogo_${config?.platform_name?.replace(/\s+/g, '_') || 'TecnosisMX'}_${new Date().getTime()}.pdf`;
    doc.save(fileName);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProducts();
  }, [fetchProducts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page on new search
    fetchProducts();
  };

  const totalPages = Math.ceil(totalCount / pageSize);

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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <select 
              className="input-rubi py-2 px-4 bg-white text-xs"
              value={filters.marca}
              onChange={(e) => setFilters({...filters, marca: e.target.value})}
            >
              <option value="">Marca</option>
              {availableBrands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
            <select 
              className="input-rubi py-2 px-4 bg-white text-xs"
              value={filters.proveedor}
              onChange={(e) => setFilters({...filters, proveedor: e.target.value})}
            >
              <option value="">Proveedor</option>
              {availableProviders.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select 
              className="input-rubi py-2 px-4 bg-white text-xs"
              value={filters.tipo}
              onChange={(e) => setFilters({...filters, tipo: e.target.value})}
            >
              <option value="">Tipo / Cat.</option>
              {availableTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select 
              className="input-rubi py-2 px-4 bg-white text-xs"
              value={filters.modelo}
              onChange={(e) => setFilters({...filters, modelo: e.target.value})}
            >
              <option value="">Modelo</option>
              {availableModels.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select 
              className="input-rubi py-2 px-4 bg-white text-xs"
              value={filters.año}
              onChange={(e) => setFilters({...filters, año: e.target.value})}
            >
              <option value="">Año</option>
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button type="submit" className="btn-primary py-2 px-6 text-sm">
              Buscar
            </button>
          </div>
        </form>
      </div>

      {isApproved && (
        <div className="flex justify-end space-x-3">
          <button 
            onClick={() => exportToCSV(products)}
            className="flex items-center space-x-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl border border-emerald-100 font-bold text-xs hover:bg-emerald-100 transition-colors"
          >
            <span>Exportar CSV</span>
          </button>
          <button 
            onClick={() => exportToPDF(products)}
            className="flex items-center space-x-2 bg-rose-50 text-rose-600 px-4 py-2 rounded-xl border border-rose-100 font-bold text-xs hover:bg-rose-100 transition-colors"
          >
            <span>Exportar PDF</span>
          </button>
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
            <div key={product.id} className="card-rubi flex flex-col group overflow-hidden p-0 h-full">
              <div 
                className="aspect-square bg-slate-100 flex items-center justify-center relative overflow-hidden cursor-pointer"
                onClick={() => setSelectedProduct(product)}
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
              </div>
              
              <div 
                className="p-6 flex-grow flex flex-col justify-between cursor-pointer"
                onClick={() => setSelectedProduct(product)}
              >
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
      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
          addToCart={addToCart}
          isApproved={isApproved}
        />
      )}
    </div>
  );
};

const ProductDetailModal = ({ product, onClose, addToCart, isApproved }: { 
  product: Product, 
  onClose: () => void, 
  addToCart: (p: any) => void,
  isApproved: boolean
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = product.imagenes && product.imagenes.length > 0 ? product.imagenes : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-secondary/60 backdrop-blur-md" onClick={onClose} />
      <div className="bg-white rounded-[40px] p-0 max-w-4xl w-full shadow-2xl relative animate-in zoom-in duration-300 overflow-hidden flex flex-col md:flex-row">
        <button 
          onClick={onClose}
          className="absolute right-6 top-6 z-10 p-2 text-slate-400 hover:text-secondary bg-white/80 backdrop-blur-sm rounded-xl transition-all shadow-sm"
        >
          <X size={20} />
        </button>

        {/* Image Gallery */}
        <div className="w-full md:w-1/2 bg-slate-50 relative group">
          <div className="aspect-square flex items-center justify-center overflow-hidden">
            {images.length > 0 ? (
              <img 
                src={images[currentImageIndex]} 
                alt={product.nombre} 
                className="w-full h-full object-cover transition-all duration-500"
              />
            ) : (
              <Package size={120} className="text-slate-200" />
            )}
          </div>

          {images.length > 1 && (
            <div className="absolute inset-x-0 bottom-6 px-6 z-20">
              <div className="flex items-center justify-center space-x-2 bg-white/20 backdrop-blur-md p-2 rounded-2xl border border-white/20 overflow-x-auto scrollbar-hide max-w-full">
                {images.map((img: string, idx: number) => (
                  <button 
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-12 h-12 rounded-xl border-2 transition-all flex-shrink-0 overflow-hidden ${idx === currentImageIndex ? 'border-primary ring-2 ring-primary/20' : 'border-white/50 hover:border-white'}`}
                  >
                    <img src={img} className="w-full h-full object-cover" alt="" />
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {images.length > 1 && (
            <>
              <button 
                onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur-sm text-secondary rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                onClick={() => setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur-sm text-secondary rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
        </div>

        {/* Product Info */}
        <div className="w-full md:w-1/2 p-10 flex flex-col justify-between bg-white">
          <div className="space-y-6">
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider">{product.sku}</span>
                <span className="bg-secondary/5 text-secondary text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">{product.marca}</span>
              </div>
              <h2 className="text-3xl font-black text-secondary uppercase tracking-tight leading-none mb-4">{product.nombre}</h2>
              <p className="text-slate-500 text-sm leading-relaxed">{product.descripcion}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Modelo</p>
                <p className="font-bold text-secondary">{product.modelo || 'Universal'}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Aplicación</p>
                <p className="font-bold text-secondary">
                  {product.año_inicio && product.año_fin ? `${product.año_inicio} - ${product.año_fin}` : 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Proveedor</p>
                <p className="font-bold text-secondary">{product.proveedor || 'N/A'}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tipo</p>
                <p className="font-bold text-secondary">{product.tipo || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-10 border-t border-slate-100">
            {isApproved ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Precio Unitario</p>
                  <p className="text-4xl font-black text-secondary tracking-tighter">${product.precio.toLocaleString()}</p>
                </div>
                <button 
                  onClick={() => {
                    addToCart(product);
                    onClose();
                  }}
                  className="btn-primary h-16 px-8 rounded-2xl shadow-xl shadow-primary/20 flex items-center space-x-3 group"
                >
                  <span className="font-black uppercase tracking-wider">Agregar</span>
                  <ChevronDown size={20} className="-rotate-90 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            ) : (
              <div className="w-full bg-slate-50 rounded-2xl p-6 flex items-center space-x-4 border border-slate-100">
                <ShieldCheck className="text-primary" size={32} />
                <div>
                  <p className="text-xs font-black text-secondary uppercase tracking-widest">Precios de Venta</p>
                  <p className="text-sm text-slate-500 font-medium">Inicia sesión como mayorista aprobado para ver precios y comprar.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Catalogue;
