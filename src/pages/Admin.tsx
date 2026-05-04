import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  Edit,
  Trash2,
  Search,
  ImageIcon,
  ImagePlus,
  AlertTriangle,
  Settings as SettingsIcon,
  Send,
  Download,
  FileText,
  ChevronLeft,
  Settings2,
  Smartphone,
  CheckCircle2,
  MessageSquare,
  Truck,
  Star,
  ShieldCheck,
  Award,
  Zap,
  Clock,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Info,
  Copy,
  ZoomIn
  //,HelpCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { optimizeImage } from '../utils/imageOptimizer';
import toast from 'react-hot-toast';
import { generateOrderPDF } from '../utils/pdfGenerator';

const downloadCSV = (content: string, filename: string) => {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const addWatermark = async (file: File, config: any): Promise<Blob> => {
  if (!config.watermark_enabled) return file;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);

        // Draw original image
        ctx.drawImage(img, 0, 0);

        if (config.watermark_type === 'image' && config.watermark_image_url) {
          const wImg = new Image();
          wImg.crossOrigin = "anonymous";
          wImg.onload = () => {
            const wWidth = canvas.width * 0.25;
            const wHeight = (wImg.height * wWidth) / wImg.width;

            // Apply opacity from config or default to 0.7
            ctx.globalAlpha = parseFloat(config.watermark_opacity) || 0.7;

            const padding = Math.max(20, canvas.width * 0.04);
            let x = canvas.width - wWidth - padding;
            let y = canvas.height - wHeight - padding;

            const pos = config.watermark_position || 'bottom-right';
            if (pos === 'top-left') { x = padding; y = padding; }
            else if (pos === 'top-right') { x = canvas.width - wWidth - padding; y = padding; }
            else if (pos === 'bottom-left') { x = padding; y = canvas.height - wHeight - padding; }
            else if (pos === 'center') { x = (canvas.width - wWidth) / 2; y = (canvas.height - wHeight) / 2; }

            ctx.drawImage(wImg, x, y, wWidth, wHeight);
            canvas.toBlob((blob) => blob ? resolve(blob) : resolve(file), file.type, 0.9);
          };
          wImg.onerror = () => resolve(file);
          wImg.src = config.watermark_image_url;
        } else if (config.watermark_text) {
          const fontSize = Math.max(20, canvas.width * 0.04);
          ctx.font = `bold ${fontSize}px sans-serif`;

          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;

          const opacity = parseFloat(config.watermark_opacity) || 0.7;
          ctx.fillStyle = `rgba(255,255,255,${opacity})`;

          const text = config.watermark_text;
          const padding = Math.max(20, canvas.width * 0.04);

          const pos = config.watermark_position || 'bottom-right';
          let x = canvas.width - padding;
          let y = canvas.height - padding;
          ctx.textAlign = 'right';

          if (pos === 'top-left') { x = padding; y = padding + fontSize; ctx.textAlign = 'left'; }
          else if (pos === 'top-right') { x = canvas.width - padding; y = padding + fontSize; ctx.textAlign = 'right'; }
          else if (pos === 'bottom-left') { x = padding; y = canvas.height - padding; ctx.textAlign = 'left'; }
          else if (pos === 'center') { x = canvas.width / 2; y = canvas.height / 2; ctx.textAlign = 'center'; }

          ctx.fillText(text, x, y);
          canvas.toBlob((blob) => blob ? resolve(blob) : resolve(file), file.type, 0.9);
        } else {
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

const MediaGallery = () => {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [skuMap, setSkuMap] = useState<Record<string, { sku: string, nombre: string }[]>>({});
  const [page, setPage] = useState(1);
  const pageSize = 24;
  const { config } = useStore();

  const removeAccents = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage.from('product-images').list('', {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'name', order: 'desc' }
      });
      if (error) throw error;
      setImages(data || []);

      const { data: products } = await supabase.from('productos').select('sku, nombre, imagenes').not('imagenes', 'is', null);
      const newMap: Record<string, { sku: string, nombre: string }[]> = {};
      if (products) {
        products.forEach(p => {
          if (p.imagenes && Array.isArray(p.imagenes)) {
            p.imagenes.forEach((url: string) => {
              if (!newMap[url]) newMap[url] = [];
              if (!newMap[url].find(existing => existing.sku === p.sku)) {
                newMap[url].push({ sku: p.sku, nombre: p.nombre });
              }
            });
          }
        });
      }
      setSkuMap(newMap);
    } catch (error: any) {
      toast.error('Error al cargar imágenes: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const watermarkedFile = await addWatermark(file, config);
      const processedFile = await optimizeImage(watermarkedFile as File);

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, processedFile);

      if (uploadError) throw uploadError;

      toast.success('Imagen subida correctamente');
      fetchImages();
    } catch (error: any) {
      toast.error('Error al subir: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const copyUrl = (name: string) => {
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(name);
    navigator.clipboard.writeText(publicUrl);
    toast.success('URL copiada al portapapeles');
  };

  const deleteImage = async (name: string) => {
    if (!confirm('¿Estás seguro de eliminar esta imagen?')) return;
    try {
      const { error } = await supabase.storage.from('product-images').remove([name]);
      if (error) throw error;
      toast.success('Imagen eliminada');
      fetchImages();
    } catch (error: any) {
      toast.error('Error al eliminar: ' + error.message);
    }
  };

  const filteredImages = images.filter(img => {
    if (!searchTerm) return true;
    
    const searchTerms = removeAccents(searchTerm).split(/\s+/).filter(Boolean);
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(img.name);
    const mappedList = skuMap[publicUrl];
    
    // Aggregate metadata for the image
    const contentToSearch = [
      img.name,
      ...(mappedList?.flatMap(m => [m.sku, m.nombre]) || [])
    ].map(s => removeAccents(s)).join(' ');

    return searchTerms.every(term => contentToSearch.includes(term));
  });

  const totalPages = Math.ceil(filteredImages.length / pageSize);
  const currentImages = filteredImages.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
          <h2 className="text-2xl font-black text-secondary flex items-center space-x-3 shrink-0">
            <div className="p-2 bg-secondary text-white rounded-lg"><ImageIcon size={20} /></div>
            <span>Galería de Medios</span>
            {filteredImages.length !== images.length && (
              <span className="text-sm font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                {filteredImages.length} resultados
              </span>
            )}
          </h2>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto flex-1 lg:justify-end">
            <div className="relative w-full sm:max-w-md flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input
                type="text"
                placeholder="Buscar por Nombre, SKU o Archivo..."
                className="input-rubi pl-12 py-2.5 text-sm w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <label className={`btn-primary py-2.5 px-6 flex items-center justify-center space-x-2 cursor-pointer w-full sm:w-auto shrink-0 min-w-max ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              {uploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" /> : <Upload size={18} className="shrink-0" />}
              <span className="shrink-0 whitespace-nowrap">{uploading ? 'Subiendo...' : 'Subir Imagen'}</span>
              <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {loading ? (
            <div className="col-span-full py-20 text-center text-slate-400 font-medium border-2 border-dashed border-slate-100 rounded-3xl">
              Cargando galería...
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-400 font-medium border-2 border-dashed border-slate-100 rounded-3xl">
              No se encontraron imágenes.
            </div>
          ) : (
            currentImages.map((img) => {
              const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(img.name);
              const mappedList = skuMap[publicUrl];
              return (
                <div key={img.name} className="group relative bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
                  <div 
                    className="aspect-square bg-slate-50 flex items-center justify-center overflow-hidden cursor-zoom-in relative"
                    onClick={() => setZoomedImage(publicUrl)}
                  >
                    <img 
                      src={publicUrl} 
                      alt={img.name} 
                      className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-500" 
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                      <div className="bg-white text-secondary p-3 rounded-2xl shadow-xl">
                        <ZoomIn size={24} />
                      </div>
                    </div>
                  </div>
                  <div className="p-3 border-t border-slate-100 bg-slate-50 flex flex-col gap-2 flex-grow">
                    <p className="text-[9px] font-bold text-slate-400 truncate text-center" title={img.name}>{img.name}</p>
                    
                    {mappedList && mappedList.length > 0 ? (
                      <div className="flex flex-col gap-1.5 w-full items-center">
                        <div className="flex items-center justify-center -space-x-1.5">
                          <div className="flex items-center h-5 px-2 bg-secondary text-white rounded-full shadow-sm z-10">
                            <span className="text-[8px] font-black uppercase tracking-widest leading-none">
                              {mappedList.length} {mappedList.length === 1 ? 'Prod' : 'Prods'}
                            </span>
                          </div>
                          {mappedList.length > 1 && (
                            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-slate-50 shadow-sm">
                              <Plus size={10} className="text-white" strokeWidth={4} />
                            </div>
                          )}
                        </div>
                        
                        <div 
                          className="w-full text-center px-2 py-1.5 bg-white/50 rounded-xl border border-slate-200/50 group-hover:border-primary/30 transition-all cursor-help"
                          title={mappedList.slice(0, 15).map(m => `• ${m.sku}: ${m.nombre}`).join('\n') + (mappedList.length > 15 ? `\n... y ${mappedList.length - 15} más` : '')}
                        >
                          <span className="text-[10px] font-black text-secondary uppercase block truncate leading-none mb-1">
                            {mappedList[0].sku}
                          </span>
                          <span className="text-[9px] font-bold text-slate-500 block truncate leading-none px-1" title={mappedList[0].nombre}>
                            {mappedList[0].nombre}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center w-full py-1.5 bg-slate-100/30 rounded-xl border border-dashed border-slate-200">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic leading-none">Sin asociar</span>
                      </div>
                    )}

                    <div className="flex gap-2 mt-auto pt-2 border-t border-slate-200/50">
                      <button onClick={() => copyUrl(img.name)} className="flex-1 py-1.5 bg-white text-secondary text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center justify-center space-x-1 hover:bg-slate-200 transition-all border border-slate-200">
                        <Copy size={12} />
                        <span className="hidden sm:inline">Copiar</span>
                      </button>
                      <button onClick={() => deleteImage(img.name)} className="flex-1 py-1.5 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center justify-center space-x-1 hover:bg-rose-100 transition-all border border-rose-100">
                        <Trash2 size={12} />
                        <span className="hidden sm:inline">Borrar</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2 pt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-secondary hover:border-secondary disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="flex items-center space-x-1 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
              {[...Array(totalPages)].map((_, i) => {
                const p = i + 1;
                if (totalPages > 7 && Math.abs(p - page) > 2 && p !== 1 && p !== totalPages) {
                  if (Math.abs(p - page) === 3) return <span key={p} className="px-2 text-slate-300">...</span>;
                  return null;
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-10 h-10 rounded-xl text-sm font-black transition-all ${
                      page === p 
                        ? 'bg-secondary text-white shadow-lg shadow-secondary/20' 
                        : 'text-slate-400 hover:bg-slate-50 hover:text-secondary'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-secondary hover:border-secondary disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen Zoom Overlay */}
      {zoomedImage && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 p-4 md:p-8 animate-in fade-in duration-200"
          onClick={() => setZoomedImage(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoomedImage(null);
            }}
            className="absolute top-4 right-4 md:top-8 md:right-8 z-50 p-2 md:p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all border border-white/20"
          >
            <X size={28} />
          </button>
          <img 
            src={zoomedImage} 
            alt="Zoomed Product" 
            className="max-w-full max-h-[90vh] object-contain cursor-zoom-out animate-in zoom-in duration-300 pointer-events-none"
          />
        </div>,
        document.body
      )}
    </>
  );
};

const Admin = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'products' | 'orders' | 'config' | 'cms' | 'media'>('users');
  const [settings, setSettings] = useState<any>({
    smtp_host: '',
    smtp_port: '587',
    smtp_security: 'tls',
    smtp_sender_name: 'TecnosisMX',
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
    about_text: 'En TecnosisMX, nos especializamos en proveer soluciones integrales para el sector automotriz e industrial.',
    platform_name: 'TecnosisMX',
    abreviatura: 'TMX',
    footer_description: 'Líderes en refacciones industriales y automotrices. Más de 15,000 productos a tu disposición con la mejor calidad y servicio técnico.',
    footer_contact_email: 'ventas@refaccionariarubi.com',
    footer_contact_phone: '+52 (000) 000 0000',
    footer_contact_address: 'Dirección de la empresa',
    whatsapp_number: '',
    whatsapp_message: 'Hola, me gustaría ',
    stats_products: '15K+',
    stats_clients: '500+',
    stats_years: '20+',
    cms_version_text: 'Catálogo Disponible v2.0',
    branding_images: [],
    privacy_policy: '',
    terms_conditions: '',
    hero_images: [],
    notificacion_registro_emails: '',
    notificacion_pedidos_emails: '',
    watermark_position: 'bottom-right',
    watermark_opacity: 0.7,
    whatsapp_koonetxa_api_key: '',
    whatsapp_koonetxa_session: '',
    whatsapp_koonetxa_enabled: false,
    whatsapp_notificacion_pedidos_numeros: '',
    whatsapp_notificacion_registro_numeros: '',
    whatsapp_template_pedido_cliente: '📦 *¡Gracias por tu pedido, {nombre}!* \n\nTu pedido *#{folio}* ha sido recibido con éxito. En breve nos pondremos en contacto contigo para coordinar el pago y la entrega.\n\n_Refaccionaria Rubi_',
    whatsapp_template_pedido_admin: '🚨 *NUEVO PEDIDO RECIBIDO* 🚨\n\n*Cliente:* {nombre}\n*Folio:* #{folio}\n*Total:* {total}\n\nRevisa los detalles en el panel de administración.',
    whatsapp_template_registro_admin: '🆕 *NUEVO REGISTRO DE CLIENTE* 🆕\n\nUn nuevo cliente se ha registrado en la plataforma:\n\n*Cliente:* {nombre}\n*Empresa:* {empresa}\n\nPor favor, revisa y aprueba su cuenta en el panel.',
    whatsapp_template_aprobacion_cliente: '✅ *¡CUENTA ACTIVADA!* ✅\n\n¡Buenas noticias, {nombre}! Tu cuenta en *{plataforma}* ya ha sido verificada y activada.\n\nYa puedes acceder a nuestro catálogo completo y realizar tus pedidos. ¡Te esperamos!',
    notify_order_email: true,
    notify_order_whatsapp: false,
    notify_register_email: true,
    notify_register_whatsapp: false,
    notify_activation_email: true,
    notify_activation_whatsapp: false,
    about_features: [],
    about_mision: '',
    about_vision: '',
    about_valores: [],
    social_proof_enabled: true,
    social_proof_show_image: true,
    social_proof_mode: 'random',
    social_proof_min_interval: 10,
    social_proof_max_interval: 30
  });

  const IconMap: Record<string, any> = {
    CheckCircle2,
    MessageSquare,
    Truck,
    Star,
    ShieldCheck,
    Award,
    Zap,
    Clock,
    Settings2
  };
  const [testEmail, setTestEmail] = useState('');
  const [testingSMTP, setTestingSMTP] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const { profile, config, setConfig } = useStore();

  const exportSingleOrderCSV = (order: any) => {
    if (!order) return;
    const exportData = order.items.map((item: any) => ({
      'Numero de Parte': item.sku,
      'Producto': item.nombre || 'N/A',
      'Cantidad': item.cantidad,
      'Folio': order.folio || 'N/A'
    }));
    const header = "Numero de Parte,Producto,Cantidad,Folio\n";
    const rows = exportData.map((e: any) => `"${e['Numero de Parte']}","${e['Producto']}","${e['Cantidad']}","${e['Folio']}"`).join("\n");
    downloadCSV(header + rows, `pedido_${order.folio || order.id.slice(0, 8)}.csv`);
  };

  const exportSingleOrderPDF = (order: any) => {
    generateOrderPDF(order, config);
  };



  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsPage, setProductsPage] = useState(1);
  const [productsPageSize, setProductsPageSize] = useState(25);
  const [totalProducts, setTotalProducts] = useState(0);
  const [productsSearch, setProductsSearch] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    const { data } = await supabase.from('perfiles').select('*').order('creado_at', { ascending: false });
    if (data) setUsers(data);
    setLoadingUsers(false);
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    let query = supabase.from('productos').select('*', { count: 'exact' });

    if (productsSearch) {
      const formattedSearch = productsSearch
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(word => `${word}:*`)
        .join(' & ');

      query = query.textSearch('fts_vector', formattedSearch, { 
        config: 'spanish'
      });
    }

    const from = (productsPage - 1) * productsPageSize;
    const to = from + productsPageSize - 1;

    const { data, count, error } = await query
      .order('nombre', { ascending: true })
      .range(from, to);

    if (error) {
      console.error("Error fetching products:", error);
    } else {
      if (data) setProducts(data);
      if (count !== null) setTotalProducts(count);
    }
    setLoadingProducts(false);
  }, [productsSearch, productsPage, productsPageSize]);

  useEffect(() => {
    fetchUsers();
    fetchProducts();
  }, [fetchUsers, fetchProducts]);

  // Update local settings state when global config changes
  useEffect(() => {
    if (config) {
      // Merge config with default templates if they are empty
      setSettings({
        ...config,
        whatsapp_template_pedido_cliente: config.whatsapp_template_pedido_cliente || '📦 *¡Gracias por tu pedido, {nombre}!* \n\nTu pedido *#{folio}* ha sido recibido con éxito. En breve nos pondremos en contacto contigo para coordinar el pago y la entrega.\n\n_Refaccionaria Rubi_',
        whatsapp_template_pedido_admin: config.whatsapp_template_pedido_admin || '🚨 *NUEVO PEDIDO RECIBIDO* 🚨\n\n*Cliente:* {nombre}\n*Folio:* #{folio}\n*Total:* {total}\n\nRevisa los detalles en el panel de administración.',
        whatsapp_template_registro_admin: config.whatsapp_template_registro_admin || '🆕 *NUEVO REGISTRO DE CLIENTE* 🆕\n\nUn nuevo cliente se ha registrado en la plataforma:\n\n*Cliente:* {nombre}\n*Empresa:* {empresa}\n\nPor favor, revisa y aprueba su cuenta en el panel.',
        whatsapp_template_aprobacion_cliente: config.whatsapp_template_aprobacion_cliente || '✅ *¡CUENTA ACTIVADA!* ✅\n\n¡Buenas noticias, {nombre}! Tu cuenta en *{plataforma}* ya ha sido verificada y activada.\n\nYa puedes acceder a nuestro catálogo completo y realizar tus pedidos. ¡Te esperamos!',
        about_mision: config.about_mision || '',
        about_vision: config.about_vision || '',
        about_valores: config.about_valores || []
      });
    }
  }, [config]);

  if (!profile || (profile.rol !== 'admin' && profile.rol !== 'empleado')) {
    return <div className="p-20 text-center font-bold">Acceso Denegado</div>;
  }

  // Determine available tabs based on role and permissions
  const availableTabs = [
    ...(profile.rol === 'admin' || (profile.rol === 'empleado' && (profile.permisos?.usuarios || profile.permisos?.aprobar_usuarios)) ? [{ id: 'users', label: 'Usuarios', icon: Users }] : []),
    ...(profile.rol === 'admin' || (profile.rol === 'empleado' && profile.permisos?.productos) ? [{ id: 'products', label: 'Productos', icon: Package }] : []),
    ...(profile.rol === 'admin' || (profile.rol === 'empleado' && profile.permisos?.pedidos) ? [{ id: 'orders', label: 'Pedidos', icon: ClipboardList }] : []),
    ...(profile.rol === 'admin' || (profile.rol === 'empleado' && profile.permisos?.configuracion) ? [
      { id: 'cms', label: 'Página Web', icon: ImagePlus },
      { id: 'config', label: 'Configuración', icon: SettingsIcon }
    ] : []),
    ...(profile.rol === 'admin' || (profile.rol === 'empleado' && (profile.permisos as any)?.galeria) ? [{ id: 'media', label: 'Galería', icon: ImageIcon }] : [])
  ];

  // If the active tab is not available, set it to the first available tab
  if (availableTabs.length > 0 && !availableTabs.find(t => t.id === activeTab)) {
    setActiveTab(availableTabs[0].id as any);
  }

  if (availableTabs.length === 0) {
    return <div className="p-20 text-center font-bold">No tienes permisos asignados. Acude con un administrador.</div>;
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black text-secondary tracking-tight">PANEL DE CONTROL</h1>
            <p className="text-slate-500 font-medium">Gestión de {settings.platform_name || 'TecnosisMX'}</p>
          </div>

          <div className="flex bg-white p-1.5 rounded-2xl shadow-soft border border-slate-100 overflow-x-auto max-w-full">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === tab.id
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

        <div className="card-rubi p-4 sm:p-6 md:p-8 min-h-[600px] border border-slate-100">
          {activeTab === 'users' && (
            <UserManagement
              users={users}
              loading={loadingUsers}
              onRefresh={fetchUsers}
              setShowAddUser={setShowAddUser}
              setEditingUser={setEditingUser}
            />
          )}
          {activeTab === 'products' && (
            <ProductManagement
              products={products}
              loading={loadingProducts}
              onRefresh={fetchProducts}
              setShowAdd={setShowAddProduct}
              setEditingProduct={setEditingProduct}
              page={productsPage}
              setPage={setProductsPage}
              pageSize={productsPageSize}
              setPageSize={setProductsPageSize}
              totalCount={totalProducts}
              searchTerm={productsSearch}
              setSearchTerm={setProductsSearch}
            />
          )}
          {activeTab === 'orders' && (
            <OrderManagement
              selectedOrder={selectedOrder}
              setSelectedOrder={setSelectedOrder}
            />
          )}
          {activeTab === 'media' && (
            <MediaGallery />
          )}
          {activeTab === 'cms' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
                    <FileText size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black text-secondary tracking-tighter uppercase leading-none">CMS Landing Page</h2>
                    <p className="text-slate-500 font-medium text-xs md:text-sm">Modifica los textos principales de la página de inicio.</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const { error } = await supabase.from('configuracion').upsert({ id: 1, ...settings });
                    if (!error) {
                      toast.success('Textos guardados correctamente.');
                      setConfig(settings);
                    } else {
                      toast.error('Error: ' + error.message);
                    }
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
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Galería Principal (Hero Slider)</label>
                      <div className="flex flex-wrap gap-2">
                        {settings.hero_images?.map((img: string, idx: number) => (
                          <div key={idx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                            <img src={img} alt="Hero" className="w-full h-full object-cover" />
                            <button
                              onClick={() => setSettings({ ...settings, hero_images: settings.hero_images.filter((_: any, i: number) => i !== idx) })}
                              className="absolute inset-0 bg-rose-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                        <label className="w-20 h-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-all text-slate-400 hover:text-primary hover:border-primary/50">
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                const fileExt = file.name.split('.').pop();
                                const fileName = `hero-${Math.random()}.${fileExt}`;
                                const processedFile = await optimizeImage(file);
                                const { error: uploadError } = await supabase.storage.from('branding').upload(fileName, processedFile);
                                if (uploadError) throw uploadError;
                                const { data: { publicUrl } } = supabase.storage.from('branding').getPublicUrl(fileName);
                                setSettings({ ...settings, hero_images: [...(settings.hero_images || []), publicUrl] });
                              } catch (error: any) { toast.error('Error: ' + error.message); }
                            }}
                          />
                          <Plus size={24} />
                        </label>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Título (Parte 1 Blanca)</label>
                      <input
                        className="input-rubi"
                        value={settings.hero_title_1}
                        onChange={(e) => setSettings({ ...settings, hero_title_1: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Título (Parte 2 Color)</label>
                      <input
                        className="input-rubi"
                        value={settings.hero_title_2}
                        onChange={(e) => setSettings({ ...settings, hero_title_2: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Subtítulo</label>
                      <textarea
                        className="input-rubi min-h-[100px] resize-none py-3"
                        value={settings.hero_subtitle}
                        onChange={(e) => setSettings({ ...settings, hero_subtitle: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="card-rubi bg-white border-slate-100 space-y-6 p-6">
                  <h3 className="font-bold text-secondary text-lg flex items-center space-x-2">
                    <span className="w-1.5 h-6 bg-secondary rounded-full"></span>
                    <span>Sección Nosotros e Imágenes</span>
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Título (Parte 1 Negra)</label>
                      <input
                        className="input-rubi"
                        value={settings.about_title_1}
                        onChange={(e) => setSettings({ ...settings, about_title_1: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Título (Parte 2 Color)</label>
                      <input
                        className="input-rubi"
                        value={settings.about_title_2}
                        onChange={(e) => setSettings({ ...settings, about_title_2: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Texto Descriptivo</label>
                      <textarea
                        className="input-rubi min-h-[100px] resize-none py-3"
                        value={settings.about_text}
                        onChange={(e) => setSettings({ ...settings, about_text: e.target.value })}
                      />
                    </div>

                    {/* Mission / Vision Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nuestra Misión</label>
                        <textarea
                          className="input-rubi min-h-[120px] resize-none py-3 text-sm"
                          value={settings.about_mision}
                          placeholder="Escribe la misión de la empresa..."
                          onChange={(e) => setSettings({ ...settings, about_mision: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nuestra Visión</label>
                        <textarea
                          className="input-rubi min-h-[120px] resize-none py-3 text-sm"
                          value={settings.about_vision}
                          placeholder="Escribe la visión de la empresa..."
                          onChange={(e) => setSettings({ ...settings, about_vision: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Values Editor */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nuestros Valores</label>
                        <button
                          onClick={() => setSettings({
                            ...settings,
                            about_valores: [...(settings.about_valores || []), { title: '', description: '', icon: 'Star' }]
                          })}
                          className="text-xs font-bold text-primary hover:text-primary/80 flex items-center space-x-1"
                        >
                          <Plus size={14} />
                          <span>Añadir Valor</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {(settings.about_valores || []).map((valor: any, idx: number) => (
                          <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 group relative">
                            <button
                              onClick={() => setSettings({
                                ...settings,
                                about_valores: (settings.about_valores || []).filter((_: any, i: number) => i !== idx)
                              })}
                              className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={14} />
                            </button>

                            <div className="flex items-center space-x-3">
                              <div className="relative">
                                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary pointer-events-none">
                                  {(() => {
                                    const Icon = IconMap[valor.icon] || Star;
                                    return <Icon size={16} />;
                                  })()}
                                </div>
                                <select
                                  value={valor.icon}
                                  onChange={(e) => {
                                    const newValues = [...settings.about_valores];
                                    newValues[idx].icon = e.target.value;
                                    setSettings({ ...settings, about_valores: newValues });
                                  }}
                                  className="appearance-none w-36 h-9 bg-white border border-slate-200 rounded-lg pl-8 pr-6 text-xs cursor-pointer hover:border-primary/50"
                                >
                                  {Object.keys(IconMap).map(iconName => (
                                    <option key={iconName} value={iconName}>{iconName}</option>
                                  ))}
                                </select>
                              </div>
                              <input
                                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold focus:outline-none focus:border-primary"
                                placeholder="Título del Valor (ej: Integridad)"
                                value={valor.title}
                                onChange={(e) => {
                                  const newValues = [...settings.about_valores];
                                  newValues[idx].title = e.target.value;
                                  setSettings({ ...settings, about_valores: newValues });
                                }}
                              />
                            </div>
                            <textarea
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs min-h-[60px] resize-none focus:outline-none focus:border-primary"
                              placeholder="Descripción corta del valor..."
                              value={valor.description}
                              onChange={(e) => {
                                const newValues = [...settings.about_valores];
                                newValues[idx].description = e.target.value;
                                setSettings({ ...settings, about_valores: newValues });
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Multiple About Images Gallery */}
                    <div className="space-y-2 pt-4 border-t border-slate-100">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Galería Bento (Sube 3 imágenes)</label>
                      <div className="flex flex-wrap gap-2">
                        {settings.about_images?.map((img: string, idx: number) => (
                          <div key={idx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                            <img src={img} alt="About" className="w-full h-full object-cover" />
                            <button
                              onClick={() => setSettings({ ...settings, about_images: settings.about_images.filter((_: any, i: number) => i !== idx) })}
                              className="absolute inset-0 bg-rose-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                        <label className="w-20 h-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-all text-slate-400 hover:text-primary hover:border-primary/50">
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                const fileExt = file.name.split('.').pop();
                                const fileName = `about-${Math.random()}.${fileExt}`;
                                const processedFile = await optimizeImage(file);
                                const { error: uploadError } = await supabase.storage.from('branding').upload(fileName, processedFile);
                                if (uploadError) throw uploadError;
                                const { data: { publicUrl } } = supabase.storage.from('branding').getPublicUrl(fileName);
                                setSettings({ ...settings, about_images: [...(settings.about_images || []), publicUrl] });
                              } catch (error: any) { toast.error('Error: ' + error.message); }
                            }}
                          />
                          <Plus size={24} />
                        </label>
                      </div>
                    </div>

                    {/* About Features (Editable Bullets) */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Características (Viñetas)</label>
                        <button
                          onClick={() => setSettings({
                            ...settings,
                            about_features: [...(settings.about_features || []), { text: '', icon: 'CheckCircle2' }]
                          })}
                          className="text-xs font-bold text-primary hover:text-primary/80 flex items-center space-x-1"
                        >
                          <Plus size={14} />
                          <span>Añadir Viñeta</span>
                        </button>
                      </div>
                      <div className="space-y-3">
                        {(settings.about_features || []).map((feature: any, idx: number) => (
                          <div key={idx} className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-100 group">
                            <div className="relative">
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none">
                                {(() => {
                                  const Icon = IconMap[feature.icon] || CheckCircle2;
                                  return <Icon size={18} />;
                                })()}
                              </div>
                              <select
                                value={feature.icon}
                                onChange={(e) => {
                                  const newFeatures = [...settings.about_features];
                                  newFeatures[idx].icon = e.target.value;
                                  setSettings({ ...settings, about_features: newFeatures });
                                }}
                                className="appearance-none w-48 h-10 bg-white border border-slate-200 rounded-lg pl-10 pr-8 text-sm cursor-pointer hover:border-primary/50 transition-colors"
                              >
                                <option value="CheckCircle2">Círculo Check</option>
                                <option value="MessageSquare">Mensaje</option>
                                <option value="Truck">Envío/Camión</option>
                                <option value="Star">Estrella</option>
                                <option value="ShieldCheck">Escudo</option>
                                <option value="Award">Premio</option>
                                <option value="Zap">Rayo</option>
                                <option value="Clock">Reloj</option>
                                <option value="Settings2">Ajustes</option>
                              </select>
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <ChevronDown size={14} />
                              </div>
                            </div>
                            <input
                              className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                              placeholder="Texto de la característica..."
                              value={feature.text}
                              onChange={(e) => {
                                const newFeatures = [...settings.about_features];
                                newFeatures[idx].text = e.target.value;
                                setSettings({ ...settings, about_features: newFeatures });
                              }}
                            />
                            <button
                              onClick={() => setSettings({
                                ...settings,
                                about_features: (settings.about_features || []).filter((_: any, i: number) => i !== idx)
                              })}
                              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card-rubi bg-white border-slate-100 space-y-6 p-6">
                  <h3 className="font-bold text-secondary text-lg flex items-center space-x-2">
                    <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                    <span>Sección Distribuidores</span>
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Título Línea 1</label>
                      <input
                        className="input-rubi"
                        value={settings.distributors_title_1}
                        onChange={(e) => setSettings({ ...settings, distributors_title_1: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Título Línea 2 (Color)</label>
                      <input
                        className="input-rubi"
                        value={settings.distributors_title_2}
                        onChange={(e) => setSettings({ ...settings, distributors_title_2: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Texto Informativo</label>
                      <textarea
                        className="input-rubi min-h-[100px] resize-none py-3"
                        value={settings.distributors_text}
                        onChange={(e) => setSettings({ ...settings, distributors_text: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Texto del Botón (CTA)</label>
                      <input
                        className="input-rubi"
                        value={settings.distributors_cta_text}
                        onChange={(e) => setSettings({ ...settings, distributors_cta_text: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Imagen de la Sección</label>
                      <div className="flex items-center space-x-4">
                        {settings.distributors_image_url ? (
                          <div className="relative group w-32 h-20 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
                            <img
                              src={settings.distributors_image_url}
                              alt="Distribuidores"
                              className="w-full h-full object-cover"
                            />
                            <label className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  try {
                                    const fileExt = file.name.split('.').pop();
                                    const fileName = `distributors-${Math.random()}.${fileExt}`;
                                    const processedFile = await optimizeImage(file);
                                    const { error: uploadError } = await supabase.storage.from('branding').upload(fileName, processedFile);
                                    if (uploadError) throw uploadError;
                                    const { data: { publicUrl } } = supabase.storage.from('branding').getPublicUrl(fileName);
                                    setSettings({ ...settings, distributors_image_url: publicUrl });
                                  } catch (error: any) { toast.error('Error: ' + error.message); }
                                }}
                              />
                              <Edit size={16} />
                            </label>
                          </div>
                        ) : (
                          <label className="w-32 h-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-all text-slate-400 hover:text-primary hover:border-primary/50">
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  const fileExt = file.name.split('.').pop();
                                  const fileName = `distributors-${Math.random()}.${fileExt}`;
                                  const { error: uploadError } = await supabase.storage.from('branding').upload(fileName, file);
                                  if (uploadError) throw uploadError;
                                  const { data: { publicUrl } } = supabase.storage.from('branding').getPublicUrl(fileName);
                                  setSettings({ ...settings, distributors_image_url: publicUrl });
                                } catch (error: any) { toast.error('Error: ' + error.message); }
                              }}
                            />
                            <Plus size={24} />
                          </label>
                        )}
                        <div className="flex-1">
                          <p className="text-[10px] text-slate-400 font-medium leading-tight">
                            Recomendado: Imagen horizontal (landscape) <br />
                            JPG o PNG, máx 2MB
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card-rubi bg-slate-50 border-slate-100 space-y-6 p-6 md:col-span-2">
                  <h3 className="font-bold text-secondary text-lg flex items-center space-x-2">
                    <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                    <span>Estadísticas y Versión</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Refacciones Stock</label>
                      <input
                        className="input-rubi"
                        value={settings.stats_products || ''}
                        placeholder="Ej: 15K+"
                        onChange={(e) => setSettings({ ...settings, stats_products: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Talleres Afiliados</label>
                      <input
                        className="input-rubi"
                        value={settings.stats_clients || ''}
                        placeholder="Ej: 500+"
                        onChange={(e) => setSettings({ ...settings, stats_clients: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Años Experiencia</label>
                      <input
                        className="input-rubi"
                        value={settings.stats_years || ''}
                        placeholder="Ej: 20+"
                        onChange={(e) => setSettings({ ...settings, stats_years: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Texto Versión Catálogo</label>
                      <input
                        className="input-rubi"
                        value={settings.cms_version_text || ''}
                        placeholder="Ej: v2.0"
                        onChange={(e) => setSettings({ ...settings, cms_version_text: e.target.value })}
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
                        onChange={(e) => setSettings({ ...settings, platform_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Descripción (Footer)</label>
                      <input
                        className="input-rubi"
                        value={settings.footer_description || ''}
                        placeholder="Breve descripción de la empresa"
                        onChange={(e) => setSettings({ ...settings, footer_description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Email de Contacto</label>
                      <input
                        className="input-rubi"
                        value={settings.footer_contact_email || ''}
                        placeholder="ventas@empresa.com"
                        onChange={(e) => setSettings({ ...settings, footer_contact_email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Teléfono de Contacto</label>
                      <input
                        className="input-rubi"
                        value={settings.footer_contact_phone || ''}
                        placeholder="+52 (000) 000 0000"
                        onChange={(e) => setSettings({ ...settings, footer_contact_phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Dirección Física</label>
                      <input
                        className="input-rubi"
                        value={settings.footer_contact_address || ''}
                        placeholder="Dirección completa de la sucursal"
                        onChange={(e) => setSettings({ ...settings, footer_contact_address: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'config' && (
            <>
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
                      <SettingsIcon size={32} />
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-black text-secondary tracking-tighter uppercase leading-none">Configuración General</h2>
                      <p className="text-slate-500 font-medium text-xs md:text-sm">Gestiona la identidad visual, contacto y servidor de correo.</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const { error } = await supabase.from('configuracion').upsert({ id: 1, ...settings });
                      if (!error) {
                        toast.success('Configuración guardada correctamente.');
                        setConfig(settings);
                      } else {
                        toast.error('Error: ' + error.message);
                      }
                    }}
                    className="btn-primary px-8"
                  >
                    Guardar Cambios
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Branding Section */}
                  <div className="card-rubi bg-white border-slate-100 space-y-6 p-6">
                    <h3 className="font-bold text-secondary text-lg flex items-center space-x-2">
                      <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                      <span>Branding y Logo</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nombre Comercial</label>
                        <input
                          className="input-rubi"
                          placeholder="Ej: Refaccionaria Rubi"
                          value={settings.platform_name || ''}
                          onChange={(e) => setSettings({ ...settings, platform_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Abreviatura (Logo/Header)</label>
                        <input
                          className="input-rubi"
                          placeholder="Ej: RUBI"
                          value={settings.abreviatura || ''}
                          onChange={(e) => setSettings({ ...settings, abreviatura: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">WhatsApp (Incluir 52 para México)</label>
                        <input
                          className="input-rubi"
                          placeholder="Ej: 529616075008"
                          value={settings.whatsapp_number || ''}
                          onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Mensaje WhatsApp</label>
                        <input
                          className="input-rubi"
                          placeholder="Hola, me gustaría..."
                          value={settings.whatsapp_message || ''}
                          onChange={(e) => setSettings({ ...settings, whatsapp_message: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Logo Principal</label>
                        <div className="flex items-center space-x-6">
                          <div className="w-20 h-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden">
                            {settings.logo_url ? (
                              <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                              <ImageIcon size={24} className="text-slate-300" />
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <input
                              type="file"
                              id="logo-upload-config"
                              className="hidden"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  const fileExt = file.name.split('.').pop();
                                  const fileName = `logo-${Math.random()}.${fileExt}`;
                                  const { error: uploadError } = await supabase.storage.from('branding').upload(fileName, file);
                                  if (uploadError) throw uploadError;
                                  const { data: publicUrlData } = supabase.storage.from('branding').getPublicUrl(fileName);
                                  setSettings({ ...settings, logo_url: publicUrlData.publicUrl });
                                } catch (error: any) { toast.error('Error: ' + error.message); }
                              }}
                            />
                            <label
                              htmlFor="logo-upload-config"
                              className="btn-secondary py-2 px-4 inline-flex items-center space-x-2 cursor-pointer text-xs"
                            >
                              <Upload size={14} />
                              <span>Subir Logo</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Favicon (Pestaña)</label>
                        <div className="flex items-center space-x-6">
                          <div className="w-12 h-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center overflow-hidden">
                            {settings.favicon_url ? (
                              <img src={settings.favicon_url} alt="Favicon" className="w-full h-full object-contain" />
                            ) : (
                              <div className="w-2 h-2 bg-slate-300 rounded-full" />
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <input
                              type="file"
                              id="favicon-upload-config"
                              className="hidden"
                              accept=".ico,.png,.svg,.jpg"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  const fileExt = file.name.split('.').pop();
                                  const fileName = `favicon-${Math.random()}.${fileExt}`;
                                  const { error: uploadError } = await supabase.storage.from('branding').upload(fileName, file);
                                  if (uploadError) throw uploadError;
                                  const { data: publicUrlData } = supabase.storage.from('branding').getPublicUrl(fileName);
                                  setSettings({ ...settings, favicon_url: publicUrlData.publicUrl });
                                } catch (error: any) { toast.error('Error: ' + error.message); }
                              }}
                            />
                            <label
                              htmlFor="favicon-upload-config"
                              className="btn-secondary py-2 px-4 inline-flex items-center space-x-2 cursor-pointer text-xs"
                            >
                              <Upload size={14} />
                              <span>Subir Favicon</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Galería Logotipos (Footer/Branding)</p>
                      <div className="flex flex-wrap gap-2">
                        {settings.branding_images?.map((img: string, idx: number) => (
                          <div key={idx} className="relative group w-14 h-14 rounded-lg overflow-hidden border border-slate-200">
                            <img src={img} alt="Brand" className="w-full h-full object-contain p-1" />
                            <button
                              onClick={() => setSettings({ ...settings, branding_images: settings.branding_images.filter((_: any, i: number) => i !== idx) })}
                              className="absolute inset-0 bg-rose-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        <label className="w-14 h-14 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-100 text-slate-400 hover:text-primary">
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                const fileExt = file.name.split('.').pop();
                                const fileName = `brand-${Math.random()}.${fileExt}`;
                                const processedFile = await optimizeImage(file);
                                const { error: uploadError } = await supabase.storage.from('branding').upload(fileName, processedFile);
                                if (uploadError) throw uploadError;
                                const { data: { publicUrl } } = supabase.storage.from('branding').getPublicUrl(fileName);
                                setSettings({ ...settings, branding_images: [...(settings.branding_images || []), publicUrl] });
                              } catch (error: any) { toast.error('Error: ' + error.message); }
                            }}
                          />
                          <Plus size={18} />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* SMTP Mailer Card */}
                  <div className="card-rubi bg-white border-slate-100 space-y-6 p-6">
                    <h3 className="font-bold text-secondary text-lg flex items-center space-x-2">
                      <span className="w-1.5 h-6 bg-secondary rounded-full"></span>
                      <span>Servidor de Correo (SMTP)</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Host SMTP</label>
                        <input className="input-rubi" value={settings.smtp_host || ''} onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })} placeholder="smtp.gmail.com" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Puerto</label>
                        <input className="input-rubi" value={settings.smtp_port || ''} onChange={(e) => setSettings({ ...settings, smtp_port: e.target.value })} placeholder="587" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Usuario SMTP</label>
                        <input className="input-rubi" value={settings.smtp_user || ''} onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })} placeholder="email@gmail.com" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Contraseña</label>
                        <input type="password" className="input-rubi" value={settings.smtp_pass || ''} onChange={(e) => setSettings({ ...settings, smtp_pass: e.target.value })} placeholder="••••••••" />
                      </div>
                      <div className="space-y-1">
                        <select
                          className="input-rubi py-2 text-sm"
                          value={settings.smtp_security || 'tls'}
                          onChange={(e) => setSettings({ ...settings, smtp_security: e.target.value })}
                        >
                          <option value="none">Ninguno (Puerto 25/587)</option>
                          <option value="tls">STARTTLS (Puerto 587)</option>
                          <option value="ssl">SSL/TLS (Port 465)</option>
                        </select>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Emails de Notificación de Registro (separados por comas)</label>
                        <input
                          className="input-rubi"
                          value={settings.notificacion_registro_emails || ''}
                          onChange={(e) => setSettings({ ...settings, notificacion_registro_emails: e.target.value })}
                          placeholder="admin@empresa.com, ventas@empresa.com"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Emails de Notificación de Pedidos (NUEVO - separados por comas)</label>
                        <input
                          className="input-rubi border-primary/20 bg-primary/[0.02]"
                          value={settings.notificacion_pedidos_emails || ''}
                          onChange={(e) => setSettings({ ...settings, notificacion_pedidos_emails: e.target.value })}
                          placeholder="pedidos@empresa.com, sucursal@empresa.com"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">URL del Sitio (Para links en correos)</label>
                        <input
                          className="input-rubi"
                          value={settings.site_url || ''}
                          onChange={(e) => setSettings({ ...settings, site_url: e.target.value })}
                          placeholder="https://tu-dominio.com"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-50 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Prueba de Envío</p>
                        <div className="flex space-x-2">
                          <input
                            type="email"
                            placeholder="Email destino..."
                            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none w-40"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                          />
                          <button
                            onClick={async () => {
                              if (!testEmail) return toast.error('Ingresa un email de destino');
                              setTestingSMTP(true);
                              try {
                                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                                if (sessionError || !session) {
                                  throw new Error("No se pudo obtener la sesión. Por favor, inicia sesión de nuevo.");
                                }

                                const { data, error } = await supabase.functions.invoke('test-smtp', {
                                  body: { settings, recipient: testEmail },
                                  headers: {
                                    Authorization: `Bearer ${session.access_token}`
                                  }
                                });

                                if (error) {
                                  console.error("Invoke error:", error);
                                  // Handle specific function errors
                                  const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
                                  throw new Error(`Error al llamar a la función: ${errorMsg}`);
                                }

                                if (data && !data.success) {
                                  throw new Error(data.error || 'Error desconocido en la prueba SMTP');
                                }

                                toast.success('¡Correo de prueba enviado con éxito!');
                              } catch (e: any) {
                                console.error('SMTP Test catch:', e);
                                toast.error('Error: ' + e.message);
                              }
                              finally { setTestingSMTP(false); }
                            }}
                            disabled={testingSMTP}
                            className="bg-secondary text-white p-1.5 rounded-lg hover:opacity-90 disabled:opacity-50"
                          >
                            {testingSMTP ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Marca de Agua - Now strictly independent and full width */}
                <div className="card-rubi bg-white border-slate-100 space-y-6 p-6">
                  <h3 className="font-bold text-secondary text-lg flex items-center space-x-2">
                    <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                    <span>Marca de Agua para Productos</span>
                  </h3>

                  <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" onClick={() => setSettings({ ...settings, watermark_enabled: !settings.watermark_enabled })}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.watermark_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                    <span className="text-sm font-bold text-secondary">{settings.watermark_enabled ? 'Activada' : 'Desactivada'}</span>
                    <p className="text-[10px] text-slate-400 font-medium ml-auto">Se aplica automáticamente al subir imágenes manuales.</p>
                  </div>

                  {settings.watermark_enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Tipo de Marca</label>
                        <select
                          className="input-rubi py-2 text-sm"
                          value={settings.watermark_type || 'text'}
                          onChange={(e) => setSettings({ ...settings, watermark_type: e.target.value })}
                        >
                          <option value="text">Texto Personalizado</option>
                          <option value="image">Logotipo / Imagen</option>
                        </select>
                      </div>

                      {settings.watermark_type === 'image' ? (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Imagen de Marca</label>
                          <div className="flex items-center space-x-4">
                            {settings.watermark_image_url ? (
                              <div className="relative group w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                                <img src={settings.watermark_image_url} alt="Watermark" className="w-full h-full object-contain p-1" />
                                <button
                                  onClick={() => setSettings({ ...settings, watermark_image_url: '' })}
                                  className="absolute inset-0 bg-rose-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <label className="w-12 h-12 bg-white border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-50 text-slate-400">
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    try {
                                      const fileExt = file.name.split('.').pop();
                                      const fileName = `watermark-${Math.random()}.${fileExt}`;
                                      const processedFile = await optimizeImage(file);
                                      const { error: uploadError } = await supabase.storage.from('branding').upload(fileName, processedFile);
                                      if (uploadError) throw uploadError;
                                      const { data: { publicUrl } } = supabase.storage.from('branding').getPublicUrl(fileName);
                                      setSettings({ ...settings, watermark_image_url: publicUrl });
                                    } catch (error: any) { toast.error('Error: ' + error.message); }
                                  }}
                                />
                                <Plus size={18} />
                              </label>
                            )}
                            <p className="text-[10px] text-slate-400 leading-tight italic">Usa un PNG con transparencia para mejores resultados.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Texto de la Marca</label>
                          <input
                            className="input-rubi"
                            value={settings.watermark_text || ''}
                            onChange={(e) => setSettings({ ...settings, watermark_text: e.target.value })}
                            placeholder="Ej: CONFIDENCIAL / COPIA"
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Posición</label>
                        <select
                          className="input-rubi py-2 text-sm"
                          value={settings.watermark_position || 'bottom-right'}
                          onChange={(e) => setSettings({ ...settings, watermark_position: e.target.value })}
                        >
                          <option value="top-left">Arriba Izquierda</option>
                          <option value="top-right">Arriba Derecha</option>
                          <option value="bottom-left">Abajo Izquierda</option>
                          <option value="bottom-right">Abajo Derecha</option>
                          <option value="center">Centro</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                          Opacidad ({Math.round((settings.watermark_opacity || 0.7) * 100)}%)
                        </label>
                        <div className="flex items-center space-x-3 px-2">
                          <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.05"
                            className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                            value={settings.watermark_opacity || 0.7}
                            onChange={(e) => setSettings({ ...settings, watermark_opacity: parseFloat(e.target.value) })}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 card-rubi bg-white border-slate-100 p-0 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
                        <Smartphone size={22} />
                      </div>
                      <div>
                        <h3 className="font-bold text-secondary text-lg leading-tight">Comunicaciones y WhatsApp</h3>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Servicio vía Koonetxa</p>
                      </div>
                    </div>
                    <div
                      className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors shadow-inner ${settings.whatsapp_koonetxa_enabled ? 'bg-green-500' : 'bg-slate-200'}`}
                      onClick={() => setSettings({ ...settings, whatsapp_koonetxa_enabled: !settings.whatsapp_koonetxa_enabled })}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${settings.whatsapp_koonetxa_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                  </div>

                  <div className="p-6 space-y-8">
                    {/* Instancia Section */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 text-slate-400">
                        <SettingsIcon size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Configuración de Instancia</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">API Key Koonetxa</label>
                          <input
                            type="password"
                            className="input-rubi font-mono text-xs bg-slate-50/50"
                            value={settings.whatsapp_koonetxa_api_key || ''}
                            onChange={(e) => setSettings({ ...settings, whatsapp_koonetxa_api_key: e.target.value })}
                            placeholder="XAiOiJKV1QiLCJhb..."
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Sesión (Session Name)</label>
                          <input
                            className="input-rubi bg-slate-50/50"
                            value={settings.whatsapp_koonetxa_session || ''}
                            onChange={(e) => setSettings({ ...settings, whatsapp_koonetxa_session: e.target.value })}
                            placeholder="testKN"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-slate-100" />

                    {/* Notification Blocks */}
                    <div className="grid grid-cols-1 gap-6">
                      {/* Pedidos Block */}
                      <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                        <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Package size={16} className="text-primary" />
                            <span className="text-xs font-bold text-secondary uppercase tracking-tight">Gestión de Pedidos</span>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${settings.notify_order_email ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}>Email</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${settings.notify_order_whatsapp ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>WhatsApp</span>
                          </div>
                        </div>
                        <div className="p-4 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center space-x-4 bg-white p-3 rounded-xl border border-slate-50">
                              <label className="flex items-center space-x-2 cursor-pointer group">
                                <input type="checkbox" checked={settings.notify_order_email} onChange={(e) => setSettings({ ...settings, notify_order_email: e.target.checked })} className="rounded text-primary focus:ring-primary h-4 w-4" />
                                <span className="text-xs font-semibold text-slate-600 group-hover:text-primary transition-colors">Notificar vía Email</span>
                              </label>
                              <label className="flex items-center space-x-2 cursor-pointer group">
                                <input type="checkbox" checked={settings.notify_order_whatsapp} onChange={(e) => setSettings({ ...settings, notify_order_whatsapp: e.target.checked })} className="rounded text-green-500 focus:ring-green-500 h-4 w-4" />
                                <span className="text-xs font-semibold text-slate-600 group-hover:text-green-600 transition-colors">Notificar vía WhatsApp</span>
                              </label>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Números para Notificar Pedidos</label>
                              <input
                                className="input-rubi py-1.5 text-xs"
                                value={settings.whatsapp_notificacion_pedidos_numeros || ''}
                                onChange={(e) => setSettings({ ...settings, whatsapp_notificacion_pedidos_numeros: e.target.value })}
                                placeholder="52155..."
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Mensaje para el Cliente</label>
                              <textarea
                                className="input-rubi text-xs min-h-[80px] leading-relaxed resize-none"
                                value={settings.whatsapp_template_pedido_cliente || ''}
                                onChange={(e) => setSettings({ ...settings, whatsapp_template_pedido_cliente: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Aviso para Administración</label>
                              <textarea
                                className="input-rubi text-xs min-h-[80px] leading-relaxed resize-none"
                                value={settings.whatsapp_template_pedido_admin || ''}
                                onChange={(e) => setSettings({ ...settings, whatsapp_template_pedido_admin: e.target.value })}
                              />
                            </div>
                          </div>

                          {/* WhatsApp Tags Guide */}
                          <div className="mt-2 bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
                            <div className="flex items-center space-x-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <Info size={12} className="text-primary" />
                              <span>Etiquetas Disponibles para Mensajes</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                              <div className="space-y-0.5">
                                <code className="text-[10px] font-bold text-primary">{'{nombre}'}</code>
                                <p className="text-[9px] text-slate-500 leading-tight">Nombre del cliente</p>
                              </div>
                              <div className="space-y-0.5">
                                <code className="text-[10px] font-bold text-primary">{'{folio}'}</code>
                                <p className="text-[9px] text-slate-500 leading-tight">ID o folio del pedido</p>
                              </div>
                              <div className="space-y-0.5">
                                <code className="text-[10px] font-bold text-primary">{'{total}'}</code>
                                <p className="text-[9px] text-slate-500 leading-tight">Total con signo $</p>
                              </div>
                              <div className="space-y-0.5">
                                <code className="text-[10px] font-bold text-primary">{'{detalles}'}</code>
                                <p className="text-[9px] text-slate-500 leading-tight">Lista de productos y cant.</p>
                              </div>
                              <div className="space-y-0.5">
                                <code className="text-[10px] font-bold text-primary">{'{telefono}'}</code>
                                <p className="text-[9px] text-slate-500 leading-tight">Teléfono del cliente</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Registro Block */}
                      <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                        <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Users size={16} className="text-amber-500" />
                            <span className="text-xs font-bold text-secondary uppercase tracking-tight">Nuevos Registros</span>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${settings.notify_register_email ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>Email</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${settings.notify_register_whatsapp ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>WhatsApp</span>
                          </div>
                        </div>
                        <div className="p-4 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center space-x-4 bg-white p-3 rounded-xl border border-slate-50">
                              <label className="flex items-center space-x-2 cursor-pointer group">
                                <input type="checkbox" checked={settings.notify_register_email} onChange={(e) => setSettings({ ...settings, notify_register_email: e.target.checked })} className="rounded text-amber-500 focus:ring-amber-500 h-4 w-4" />
                                <span className="text-xs font-semibold text-slate-600">Email</span>
                              </label>
                              <label className="flex items-center space-x-2 cursor-pointer group">
                                <input type="checkbox" checked={settings.notify_register_whatsapp} onChange={(e) => setSettings({ ...settings, notify_register_whatsapp: e.target.checked })} className="rounded text-green-500 focus:ring-green-500 h-4 w-4" />
                                <span className="text-xs font-semibold text-slate-600">WhatsApp</span>
                              </label>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Números para Notificar Registros</label>
                              <input
                                className="input-rubi py-1.5 text-xs"
                                value={settings.whatsapp_notificacion_registro_numeros || ''}
                                onChange={(e) => setSettings({ ...settings, whatsapp_notificacion_registro_numeros: e.target.value })}
                                placeholder="52155..."
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Aviso de Nuevo Cliente para Admin</label>
                            <textarea
                              className="input-rubi text-xs min-h-[80px] leading-relaxed resize-none"
                              value={settings.whatsapp_template_registro_admin || ''}
                              onChange={(e) => setSettings({ ...settings, whatsapp_template_registro_admin: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Activación Block */}
                      <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                        <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Check size={16} className="text-green-500" />
                            <span className="text-xs font-bold text-secondary uppercase tracking-tight">Activación de Cuenta</span>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${settings.notify_activation_email ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>Email</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${settings.notify_activation_whatsapp ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>WhatsApp</span>
                          </div>
                        </div>
                        <div className="p-4 space-y-4">
                          <div className="flex items-center space-x-4 bg-white p-3 rounded-xl border border-slate-50 max-w-max">
                            <label className="flex items-center space-x-2 cursor-pointer group">
                              <input type="checkbox" checked={settings.notify_activation_email} onChange={(e) => setSettings({ ...settings, notify_activation_email: e.target.checked })} className="rounded text-green-500 focus:ring-green-500 h-4 w-4" />
                              <span className="text-xs font-semibold text-slate-600">Email</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer group">
                              <input type="checkbox" checked={settings.notify_activation_whatsapp} onChange={(e) => setSettings({ ...settings, notify_activation_whatsapp: e.target.checked })} className="rounded text-green-500 focus:ring-green-500 h-4 w-4" />
                              <span className="text-xs font-semibold text-slate-600">WhatsApp</span>
                            </label>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Mensaje de Activación para el Cliente</label>
                            <textarea
                              className="input-rubi text-xs min-h-[80px] leading-relaxed resize-none"
                              value={settings.whatsapp_template_aprobacion_cliente || ''}
                              onChange={(e) => setSettings({ ...settings, whatsapp_template_aprobacion_cliente: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Social Proof Config Block */}
                      <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                        <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Zap size={16} className="text-primary" />
                            <span className="text-xs font-bold text-secondary uppercase tracking-tight">Prueba Social</span>
                          </div>
                          <button
                            onClick={async () => {
                              const { error } = await supabase.from('configuracion').upsert({
                                id: 1,
                                ...settings,
                                social_proof_enabled: settings.social_proof_enabled,
                                social_proof_show_image: settings.social_proof_show_image,
                                social_proof_mode: settings.social_proof_mode,
                                social_proof_content_type: settings.social_proof_content_type,
                                social_proof_min_interval: settings.social_proof_min_interval,
                                social_proof_max_interval: settings.social_proof_max_interval
                              });
                              if (!error) {
                                toast.success('Módulo de Prueba Social guardado');
                                setConfig({ ...settings });
                              } else {
                                toast.error('Error: ' + error.message);
                              }
                            }}
                            className="bg-primary hover:bg-primary-dark text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-sm flex items-center space-x-1"
                          >
                            <Check size={12} />
                            <span>Guardar Módulo</span>
                          </button>
                        </div>
                        <div className="p-4 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="flex items-center space-x-3 cursor-pointer group bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 hover:border-primary/20 transition-all">
                              <input
                                type="checkbox"
                                checked={settings.social_proof_enabled}
                                onChange={(e) => setSettings({ ...settings, social_proof_enabled: e.target.checked })}
                                className="rounded text-primary focus:ring-primary h-4 w-4"
                              />
                              <div>
                                <span className="block text-[11px] font-bold text-secondary leading-tight">Activar Módulo</span>
                                <span className="text-[9px] text-slate-500">Notificaciones flotantes</span>
                              </div>
                            </label>
                            <label className="flex items-center space-x-3 cursor-pointer group bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 hover:border-primary/20 transition-all">
                              <input
                                type="checkbox"
                                checked={settings.social_proof_show_image}
                                onChange={(e) => setSettings({ ...settings, social_proof_show_image: e.target.checked })}
                                className="rounded text-primary focus:ring-primary h-4 w-4"
                              />
                              <div>
                                <span className="block text-[11px] font-bold text-secondary leading-tight">Mostrar Imágenes</span>
                                <span className="text-[9px] text-slate-500">Miniaturas de productos</span>
                              </div>
                            </label>
                          </div>

                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Fuente de Productos</label>
                              <select 
                                className="input-rubi py-1.5 text-xs"
                                value={settings.social_proof_mode || 'random'}
                                onChange={(e) => setSettings({ ...settings, social_proof_mode: e.target.value })}
                              >
                                <option value="random">Todos los productos</option>
                                <option value="manual">Manual (Icono Rayo)</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo de Mensaje</label>
                              <select 
                                className="input-rubi py-1.5 text-xs"
                                value={settings.social_proof_content_type || 'viewing'}
                                onChange={(e) => setSettings({ ...settings, social_proof_content_type: e.target.value })}
                              >
                                <option value="viewing">Solo "Viendo ahora"</option>
                                <option value="purchasing">Solo "Compraron recientemente"</option>
                                <option value="mixed">Mixto (Aleatorio)</option>
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Intervalo Mín (seg)</label>
                                <input
                                  type="number"
                                  className="input-rubi py-1.5 text-xs"
                                  value={settings.social_proof_min_interval || 10}
                                  onChange={(e) => setSettings({ ...settings, social_proof_min_interval: parseInt(e.target.value) })}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Intervalo Máx (seg)</label>
                                <input
                                  type="number"
                                  className="input-rubi py-1.5 text-xs"
                                  value={settings.social_proof_max_interval || 30}
                                  onChange={(e) => setSettings({ ...settings, social_proof_max_interval: parseInt(e.target.value) })}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-rubi bg-white border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
                <div className="space-y-4">
                  <h3 className="font-bold text-secondary text-lg flex items-center space-x-2">
                    <span className="w-1.5 h-6 bg-slate-800 rounded-full"></span>
                    <span>Aviso de Privacidad</span>
                  </h3>
                  <textarea
                    className="input-rubi min-h-[300px] py-4 text-sm"
                    placeholder="Escribe el aviso de privacidad aquí..."
                    value={settings.privacy_policy || ''}
                    onChange={(e) => setSettings({ ...settings, privacy_policy: e.target.value })}
                  />
                </div>
                <div className="space-y-4">
                  <h3 className="font-bold text-secondary text-lg flex items-center space-x-2">
                    <span className="w-1.5 h-6 bg-slate-800 rounded-full"></span>
                    <span>Términos y Condiciones</span>
                  </h3>
                  <textarea
                    className="input-rubi min-h-[300px] py-4 text-sm"
                    placeholder="Escribe los términos y condiciones aquí..."
                    value={settings.terms_conditions || ''}
                    onChange={(e) => setSettings({ ...settings, terms_conditions: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {showAddUser && <AddUserModal onClose={() => setShowAddUser(false)} onRefresh={fetchUsers} />}
        {editingUser && <EditUserModal key={editingUser.id} user={editingUser} onClose={() => setEditingUser(null)} onRefresh={fetchUsers} />}

        {(showAddProduct || editingProduct) && (
          <ProductModal
            product={editingProduct}
            catalogues={{
              marcas: Array.from(new Set(products.map(p => p.marca).filter(Boolean))),
              proveedores: Array.from(new Set(products.map(p => p.proveedor).filter(Boolean))),
              tipos: Array.from(new Set(products.map(p => p.tipo).filter(Boolean))),
              modelos: Array.from(new Set(products.map(p => p.modelo).filter(Boolean))),
              años: Array.from(new Set([...products.map(p => p.año_inicio), ...products.map(p => p.año_fin)].filter(Boolean))).sort((a: any, b: any) => b - a)
            }}
            onClose={() => { setShowAddProduct(false); setEditingProduct(null); }}
            onRefresh={fetchProducts}
          />
        )}

        {selectedOrder && (
          <OrderDetailModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            exportCSV={exportSingleOrderCSV}
            exportPDF={exportSingleOrderPDF}
          />
        )}
      </div>
    </>
  );
};

const UserManagement = ({
  users,
  loading,
  onRefresh,
  setShowAddUser,
  setEditingUser
}: {
  users: any[],
  loading: boolean,
  onRefresh: () => void,
  setShowAddUser: (v: boolean) => void,
  setEditingUser: (v: any) => void
}) => {
  const { profile } = useStore();

  const updateStatus = async (uid: string, status: string) => {
    const { error } = await supabase.from('perfiles').update({ estatus: status }).eq('id', uid);
    if (!error && status === 'activo') {
      // Trigger activation notification
      supabase.functions.invoke('notify-user-status', {
        body: { type: 'activation', user_id: uid }
      }).catch(err => console.error('Error enviando notificación de activación:', err));
    }
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h2 className="text-xl md:text-2xl font-black text-secondary flex items-center space-x-3">
          <span className="p-2 bg-secondary text-white rounded-lg inline-flex shrink-0"><Users size={20} /></span>
          <span>Usuarios del Sistema</span>
        </h2>
        {profile && (profile.rol === 'admin' || profile.permisos?.usuarios) && (
          <button
            onClick={() => setShowAddUser(true)}
            className="btn-primary py-2 px-5 flex items-center space-x-2"
          >
            <Plus size={18} />
            <span>Nuevo Usuario</span>
          </button>
        )}
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
                    <span className="font-bold text-secondary text-base leading-tight">{u.nombre_completo}</span>
                    <span className="text-xs text-slate-400 font-medium">{u.email || `ID: ${u.id.slice(0, 8)}`}</span>
                  </div>
                </td>
                <td className="py-5 px-6 text-slate-500 font-medium">{u.empresa}</td>
                <td className="py-4 px-6">
                  {u.rol === 'admin' && (
                    <div className="flex items-center space-x-1 justify-center w-max px-3 py-1 bg-rose-50 text-rose-600 rounded-full">
                      <ShieldAlert size={12} />
                      <span className="text-[10px] font-black uppercase tracking-wider">Admin</span>
                    </div>
                  )}
                  {u.rol === 'empleado' && (
                    <div className="flex flex-col space-y-1 w-max">
                      <div className="flex items-center space-x-1 justify-center px-3 py-1 bg-amber-50 text-amber-600 rounded-full">
                        <Shield size={12} />
                        <span className="text-[10px] font-black uppercase tracking-wider">Empleado</span>
                      </div>
                      {u.permisos && (
                        <div className="flex space-x-1 mt-1">
                          {u.permisos.productos && <span className="text-[8px] px-1.5 py-0.5 bg-slate-100 rounded" title="Productos">PROD</span>}
                          {u.permisos.pedidos && <span className="text-[8px] px-1.5 py-0.5 bg-slate-100 rounded" title="Pedidos">PED</span>}
                          {u.permisos.usuarios && <span className="text-[8px] px-1.5 py-0.5 bg-slate-100 rounded" title="Usuarios">USR</span>}
                          {u.permisos.aprobar_usuarios && <span className="text-[8px] px-1.5 py-0.5 bg-slate-100 rounded" title="Aprobar Usuarios">APR</span>}
                          {u.permisos.configuracion && <span className="text-[8px] px-1.5 py-0.5 bg-slate-100 rounded" title="Ajustes">CONF</span>}
                        </div>
                      )}
                    </div>
                  )}
                  {u.rol === 'cliente' && (
                    <div className="flex items-center space-x-1 justify-center w-max px-3 py-1 bg-slate-50 text-slate-500 rounded-full">
                      <Users size={12} />
                      <span className="text-[10px] font-black uppercase tracking-wider">Cliente</span>
                    </div>
                  )}
                </td>
                <td className="py-5 px-6">
                  <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${u.estatus === 'aprobado' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                    {u.estatus}
                  </span>
                </td>
                <td className="py-5 px-6 text-right flex items-center justify-end space-x-3">
                  {u.estatus === 'pendiente' && profile && (profile.rol === 'admin' || profile.permisos?.usuarios || profile.permisos?.aprobar_usuarios) && (
                    <button
                      onClick={() => updateStatus(u.id, 'aprobado')}
                      className="p-2.5 bg-secondary text-white rounded-xl hover:bg-primary transition-all shadow-md shadow-secondary/10"
                      title="Aprobar Usuario"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  {profile && (profile.rol === 'admin' || profile.permisos?.usuarios) && (
                    <>
                      <button
                        onClick={() => setEditingUser(u)}
                        className="p-2.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                        title="Editar Permisos"
                      >
                        <Settings2 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          toast((t) => (
                            <div className="flex flex-col space-y-4 p-1">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center shrink-0">
                                  <Trash2 size={20} />
                                </div>
                                <div className="text-left">
                                  <p className="font-bold text-secondary text-sm">¿Eliminar usuario?</p>
                                  <p className="text-[10px] text-slate-500 font-medium leading-tight">Se borrará permanentemente el perfil de {u.nombre_completo}.</p>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={async () => {
                                    toast.dismiss(t.id);
                                    try {
                                      const { data: { session } } = await supabase.auth.getSession();
                                      if (!session) throw new Error("No hay sesión activa");

                                      const { data, error } = await supabase.functions.invoke('delete-user', {
                                        body: { userId: u.id },
                                        headers: {
                                          Authorization: `Bearer ${session.access_token}`
                                        }
                                      });

                                      if (error) throw error;
                                      if (data && !data.success) throw new Error(data.error);

                                      toast.success('Usuario eliminado permanentemente.');
                                      onRefresh();
                                    } catch (err: any) {
                                      toast.error('Error al eliminar: ' + err.message);
                                    }
                                  }}
                                  className="flex-1 py-2 bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-rose-600 transition-colors"
                                >
                                  Sí, eliminar
                                </button>
                                <button
                                  onClick={() => toast.dismiss(t.id)}
                                  className="flex-1 py-2 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-slate-200 transition-colors"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ), { duration: 6000, position: 'top-center', style: { borderRadius: '20px', padding: '16px', border: '1px solid #f1f5f9' } });
                        }}
                        className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals moved to Admin root */}
    </div>
  );
};

const AddUserModal = ({ onClose, onRefresh }: { onClose: () => void, onRefresh: () => void }) => {
  const [form, setForm] = useState({
    nombre_completo: '',
    email: '',
    empresa: '',
    telefono: '',
    rol: 'cliente',
    permisos: {
      productos: false,
      pedidos: false,
      configuracion: false,
      usuarios: false,
      aprobar_usuarios: false,
      galeria: false
    }
  });
  const [saving, setSaving] = useState(false);
  const settings = useStore(state => state.config);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.telefono.length !== 10) {
      toast.error('El teléfono debe tener exactamente 10 dígitos.');
      return;
    }
    setSaving(true);

    const promise = (async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error("No se pudo obtener la sesión. Por favor, inicia sesión de nuevo.");
      }

      const finalForm = { ...form };
      if ((form.rol === 'empleado' || form.rol === 'admin') && !form.empresa) {
        finalForm.empresa = settings?.platform_name || 'Refaccionaria';
      }

      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: finalForm,
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error || 'Error desconocido');
      return data;
    })();

    toast.promise(promise, {
      loading: 'Creando usuario y enviando accesos...',
      success: '¡Usuario creado y correo enviado con éxito!',
      error: (err) => `Error: ${err.message}`
    });

    try {
      await promise;
      onRefresh();
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-secondary/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 min-h-screen">
      <div className="bg-white rounded-2xl md:rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[95vh] md:max-h-[90vh] relative">
        <div className="bg-secondary p-8 text-white relative shrink-0">
          <button onClick={onClose} className="absolute right-6 top-6 hover:rotate-90 transition-all">
            <X size={24} />
          </button>
          <div className="flex items-center space-x-3 mb-2">
            <Users />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Administración</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">Nuevo Usuario</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5 overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Nombre Completo</label>
            <input
              required
              className="input-rubi py-2.5"
              placeholder="Ej: Juan Pérez"
              value={form.nombre_completo}
              onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
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
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Teléfono (10 dígitos)</label>
            <input
              required
              type="tel"
              maxLength={10}
              className="input-rubi py-2.5"
              placeholder="Ej: 5512345678"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value.replace(/\D/g, '') })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Empresa / Taller {(form.rol === 'empleado' || form.rol === 'admin') && '(Opcional)'}</label>
            <input
              required={form.rol === 'cliente'}
              className="input-rubi py-2.5"
              placeholder={form.rol === 'cliente' ? "Nombre del Taller" : `Por defecto: ${settings?.platform_name || 'Refaccionaria'}`}
              value={form.empresa}
              onChange={(e) => setForm({ ...form, empresa: e.target.value })}
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Rol del Usuario</label>
            <div className="grid grid-cols-3 gap-3">
              <label className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center space-y-2 ${form.rol === 'cliente' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                <input type="radio" name="rol" value="cliente" className="sr-only" checked={form.rol === 'cliente'} onChange={() => setForm({ ...form, rol: 'cliente' })} />
                <Users size={20} />
                <span className="text-xs font-bold">Cliente</span>
              </label>
              <label className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center space-y-2 ${form.rol === 'empleado' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                <input type="radio" name="rol" value="empleado" className="sr-only" checked={form.rol === 'empleado'} onChange={() => setForm({ ...form, rol: 'empleado' })} />
                <Shield size={20} />
                <span className="text-xs font-bold">Empleado</span>
              </label>
              <label className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center space-y-2 ${form.rol === 'admin' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                <input type="radio" name="rol" value="admin" className="sr-only" checked={form.rol === 'admin'} onChange={() => setForm({ ...form, rol: 'admin' })} />
                <ShieldAlert size={20} />
                <span className="text-xs font-bold">Admin</span>
              </label>
            </div>
          </div>

          {form.rol === 'empleado' && (
            <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Permisos de Empleado</label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center space-x-2 text-sm font-bold text-secondary">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={form.permisos.productos}
                    onChange={(e) => setForm({ ...form, permisos: { ...form.permisos, productos: e.target.checked } })}
                  />
                  <span>Productos</span>
                </label>
                <label className="flex items-center space-x-2 text-sm font-bold text-secondary">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={form.permisos.pedidos}
                    onChange={(e) => setForm({ ...form, permisos: { ...form.permisos, pedidos: e.target.checked } })}
                  />
                  <span>Pedidos</span>
                </label>
                <label className="flex items-center space-x-2 text-sm font-bold text-secondary">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={form.permisos.usuarios}
                    onChange={(e) => setForm({ ...form, permisos: { ...form.permisos, usuarios: e.target.checked } })}
                  />
                  <span>Usuarios</span>
                </label>
                <label className="flex items-center space-x-2 text-sm font-bold text-secondary">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={form.permisos.configuracion}
                    onChange={(e) => setForm({ ...form, permisos: { ...form.permisos, configuracion: e.target.checked } })}
                  />
                  <span>Configuración</span>
                </label>
                <label className="flex items-center space-x-2 text-sm font-bold text-secondary">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={form.permisos.aprobar_usuarios}
                    onChange={(e) => setForm({ ...form, permisos: { ...form.permisos, aprobar_usuarios: e.target.checked } })}
                  />
                  <span>Solo Aprobar Usuarios</span>
                </label>
                <label className="flex items-center space-x-2 text-sm font-bold text-secondary">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={(form.permisos as any).galeria}
                    onChange={(e) => setForm({ ...form, permisos: { ...form.permisos, galeria: e.target.checked } })}
                  />
                  <span>Galería de Medios</span>
                </label>
              </div>
            </div>
          )}

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

const EditUserModal = ({ user, onClose, onRefresh }: { user: any, onClose: () => void, onRefresh: () => void }) => {
  const [form, setForm] = useState(() => {
    const p = user.permisos || {};
    return {
      nombre_completo: user.nombre_completo,
      empresa: user.empresa,
      telefono: user.telefono || '',
      rol: user.rol,
      permisos: {
        productos: !!p.productos,
        pedidos: !!p.pedidos,
        configuracion: !!p.configuracion,
        usuarios: !!p.usuarios,
        aprobar_usuarios: !!p.aprobar_usuarios,
        galeria: !!p.galeria
      }
    };
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('perfiles')
        .update({
          nombre_completo: form.nombre_completo,
          empresa: form.empresa,
          telefono: form.telefono,
          rol: form.rol,
          permisos: form.permisos
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Usuario actualizado con éxito.');
      onRefresh();
      onClose();
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-secondary/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 min-h-screen">
      <div className="bg-white rounded-2xl md:rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[95vh] md:max-h-[90vh] relative">
        <div className="bg-slate-800 p-8 text-white relative shrink-0">
          <button onClick={onClose} className="absolute right-6 top-6 hover:rotate-90 transition-all text-white/50 hover:text-white">
            <X size={24} />
          </button>
          <div className="flex items-center space-x-3 mb-2">
            <Settings2 />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Configuración de Usuario</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">Editar Permisos</h3>
          <p className="text-slate-400 text-xs font-medium mt-1">{user.email || 'Usuario ID: ' + user.id.slice(0, 8)}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5 overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Nombre Completo</label>
            <input
              required
              className="input-rubi py-2.5"
              value={form.nombre_completo}
              onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Teléfono (10 dígitos)</label>
            <input
              required
              type="tel"
              maxLength={10}
              className="input-rubi py-2.5"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value.replace(/\D/g, '') })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Empresa / Taller</label>
            <input
              required
              className="input-rubi py-2.5"
              value={form.empresa}
              onChange={(e) => setForm({ ...form, empresa: e.target.value })}
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Rol del Usuario</label>
            <div className="grid grid-cols-3 gap-3">
              {(['cliente', 'empleado', 'admin'] as const).map((r) => (
                <label key={r} className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center space-y-2 ${form.rol === r ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                  <input type="radio" name="rol" value={r} className="sr-only" checked={form.rol === r} onChange={() => setForm({ ...form, rol: r })} />
                  {r === 'cliente' && <Users size={20} />}
                  {r === 'empleado' && <Shield size={20} />}
                  {r === 'admin' && <ShieldAlert size={20} />}
                  <span className="text-xs font-bold uppercase tracking-tight">{r}</span>
                </label>
              ))}
            </div>
          </div>

          {form.rol === 'empleado' && (
            <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Permisos Específicos</label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center space-x-2 text-sm font-bold text-secondary">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={form.permisos.productos}
                    onChange={(e) => setForm({ ...form, permisos: { ...form.permisos, productos: e.target.checked } })}
                  />
                  <span>Productos</span>
                </label>
                <label className="flex items-center space-x-2 text-sm font-bold text-secondary">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={form.permisos.pedidos}
                    onChange={(e) => setForm({ ...form, permisos: { ...form.permisos, pedidos: e.target.checked } })}
                  />
                  <span>Pedidos</span>
                </label>
                <label className="flex items-center space-x-2 text-sm font-bold text-secondary">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={form.permisos.usuarios}
                    onChange={(e) => setForm({ ...form, permisos: { ...form.permisos, usuarios: e.target.checked } })}
                  />
                  <span>Usuarios</span>
                </label>
                <label className="flex items-center space-x-2 text-sm font-bold text-secondary">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={form.permisos.configuracion}
                    onChange={(e) => setForm({ ...form, permisos: { ...form.permisos, configuracion: e.target.checked } })}
                  />
                  <span>Configuración</span>
                </label>
                <label className="flex items-center space-x-2 text-sm font-bold text-secondary">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={form.permisos.aprobar_usuarios}
                    onChange={(e) => setForm({ ...form, permisos: { ...form.permisos, aprobar_usuarios: e.target.checked } })}
                  />
                  <span>Solo Aprobar Usuarios</span>
                </label>
                <label className="flex items-center space-x-2 text-sm font-bold text-secondary">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={(form.permisos as any).galeria}
                    onChange={(e) => setForm({ ...form, permisos: { ...form.permisos, galeria: e.target.checked } })}
                  />
                  <span>Galería de Medios</span>
                </label>
              </div>
            </div>
          )}

          <div className="pt-5 flex space-x-3">
            <button type="button" onClick={onClose} className="flex-1 py-4 font-bold text-slate-400 hover:text-secondary transition-colors">Cancelar</button>
            <button disabled={saving} type="submit" className="flex-[2] btn-primary py-4 shadow-xl shadow-primary/20 flex items-center justify-center space-x-2">
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Check size={18} />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ProductManagement = ({
  products,
  loading,
  onRefresh,
  setShowAdd,
  setEditingProduct,
  page,
  setPage,
  pageSize,
  setPageSize,
  totalCount,
  searchTerm,
  setSearchTerm
}: {
  products: any[],
  loading: boolean,
  onRefresh: () => void,
  setShowAdd: (v: boolean) => void,
  setEditingProduct: (v: any) => void,
  page: number,
  setPage: (p: any) => void,
  pageSize: number,
  setPageSize: (s: number) => void,
  totalCount: number,
  searchTerm: string,
  setSearchTerm: (s: string) => void
}) => {
  const { config } = useStore();
  const [exporting, setExporting] = useState(false);

  const handleDelete = async (id: string, name: string) => {
    toast((t) => (
      <div className="flex flex-col space-y-4 p-1">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center shrink-0">
            <Trash2 size={20} />
          </div>
          <div className="text-left">
            <p className="font-bold text-secondary text-sm">¿Eliminar producto?</p>
            <p className="text-[10px] text-slate-500 font-medium leading-tight">Se borrará permanentemente "{name}".</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              const { error } = await supabase.from('productos').delete().eq('id', id);
              if (error) {
                toast.error('Error al eliminar: ' + error.message);
              } else {
                toast.success('Producto eliminado.');
                onRefresh();
              }
            }}
            className="flex-1 py-2 bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-rose-600 transition-colors"
          >
            Sí, eliminar
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-1 py-2 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    ), { duration: 6000, position: 'top-center', style: { borderRadius: '20px', padding: '16px', border: '1px solid #f1f5f9' } });
  };

  const handleClearAllProducts = () => {
    toast((t) => (
      <div className="flex flex-col space-y-4 p-1">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="text-left">
            <p className="font-bold text-secondary text-sm">¿VACIAR TODO EL CATÁLOGO?</p>
            <p className="text-[10px] text-slate-500 font-medium leading-tight">Esta acción eliminará TODOS los productos permanentemente.</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              const { error } = await supabase.from('productos').delete().neq('sku', '____NON_EXISTENT____');
              if (error) {
                toast.error('Error al vaciar: ' + error.message);
              } else {
                toast.success('Catálogo vaciado correctamente.');
                onRefresh();
              }
            }}
            className="flex-1 py-2 bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-rose-600 transition-colors"
          >
            SÍ, VACIAR TODO
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-1 py-2 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    ), { duration: 8000, position: 'top-center', style: { borderRadius: '20px', padding: '16px', border: '1px solid #f1f5f9' } });
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      let text = event.target?.result as string;
      if (text.startsWith('\uFEFF')) {
        text = text.substring(1);
      }
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) return toast.error('El archivo está vacío');

      // Robust CSV line parser that handles quoted values with commas
      const parseCSVLine = (line: string) => {
        const result = [];
        let curValue = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(curValue.trim());
            curValue = "";
          } else {
            curValue += char;
          }
        }
        result.push(curValue.trim());
        return result;
      };

      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/^"(.*)"$/, '$1'));
      const hasNombre = headers.includes('nombre');

      let productsToUpsert = lines.slice(1).map(line => {
        const parts = parseCSVLine(line);
        if (parts.length < 1) return null;

        const rowData: any = {};
        parts.forEach((part, index) => {
          if (headers[index]) {
            rowData[headers[index]] = part;
          }
        });

        if (!rowData.sku) return null;

        const cleanSku = rowData.sku
          .trim()
          .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, '-') // Normalizar guiones
          .replace(/\s+/g, '') // Quitar espacios internos y saltos de línea
          .toUpperCase();

        const updateData: any = { sku: cleanSku };

        if (rowData.nombre !== undefined) updateData.nombre = rowData.nombre.replace(/^"(.*)"$/, '$1');
        if (rowData.precio !== undefined && rowData.precio !== '') updateData.precio = parseFloat(rowData.precio);
        if (rowData.stock !== undefined && rowData.stock !== '') updateData.stock = parseInt(rowData.stock);
        if (rowData.marca !== undefined) updateData.marca = rowData.marca.replace(/^"(.*)"$/, '$1');
        if (rowData.modelo !== undefined) {
          const val = rowData.modelo.replace(/^"(.*)"$/, '$1').trim();
          updateData.modelo = val === '' ? null : val;
        }
        const yearStart = rowData.anio_inicio || rowData.año_inicio;
        const yearEnd = rowData.anio_fin || rowData.año_fin;
        if (yearStart !== undefined && yearStart !== '') updateData.año_inicio = parseInt(yearStart);
        if (yearEnd !== undefined && yearEnd !== '') updateData.año_fin = parseInt(yearEnd);
        if (rowData.proveedor !== undefined) {
          const val = rowData.proveedor.replace(/^"(.*)"$/, '$1').trim();
          updateData.proveedor = val === '' ? null : val;
        }
        if (rowData.tipo !== undefined) updateData.tipo = rowData.tipo.replace(/^"(.*)"$/, '$1');
        if (rowData.descripcion !== undefined) updateData.descripcion = rowData.descripcion.replace(/^"(.*)"$/, '$1');

        if (rowData.imagenes) {
          const cleanImg = rowData.imagenes.replace(/^"(.*)"$/, '$1');
          if (cleanImg.startsWith('[') && cleanImg.endsWith(']')) {
            try { updateData.imagenes = JSON.parse(cleanImg); } catch (e) { console.error(e); }
          } else {
            updateData.imagenes = cleanImg.split(';').map((i: string) => i.trim()).filter((i: string) => i);
          }
        }

        return Object.keys(updateData).length > 1 ? updateData : null;
      }).filter(p => p !== null);

      if (productsToUpsert.length === 0) return toast.error('No se encontraron datos válidos');

      // If nombre is missing, we must supplement it from existing records to satisfy Postgres NOT NULL constraints during upsert
      if (!hasNombre) {
        const skus = (productsToUpsert as any[]).map(p => p.sku);
        // Supabase select filter can handle large arrays but let's be safe and select what we need
        const { data: existingProducts } = await supabase
          .from('productos')
          .select('sku, nombre')
          .in('sku', skus);

        const existingMap = new Map(existingProducts?.map(p => [String(p.sku), p.nombre]) || []);
        const filteredToUpsert = (productsToUpsert as any[])
          .filter(p => existingMap.has(String(p.sku)))
          .map(p => ({
            ...p,
            nombre: existingMap.get(String(p.sku)) // Supplement with existing name
          }));

        if (filteredToUpsert.length === 0) {
          return toast.error('No se encontraron productos existentes para actualizar. Use la plantilla completa para agregar productos nuevos.');
        }

        if (filteredToUpsert.length < productsToUpsert.length) {
          toast.loading(`Actualizando ${filteredToUpsert.length} productos (se saltaron ${productsToUpsert.length - filteredToUpsert.length} no encontrados)...`, { duration: 3000 });
        }
        productsToUpsert = filteredToUpsert;
      }

      const { error } = await supabase.from('productos').upsert(productsToUpsert, { onConflict: 'sku' });
      if (!error) {
        toast.success('Importación completada con éxito');
        onRefresh();
      } else {
        if (error.code === '23502') {
          toast.error('Faltan datos obligatorios (Nombre). Use la plantilla completa para productos nuevos.');
        } else {
          toast.error('Error en importación: ' + error.message);
        }
      }
    };
    reader.readAsText(file);
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
        <h2 className="text-2xl font-black text-secondary flex items-center space-x-3">
          <span className="p-2 bg-secondary text-white rounded-lg inline-flex"><Package size={20} /></span>
          <span>Gestión de Catálogo</span>
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
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
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <form onSubmit={(e) => { e.preventDefault(); setPage(1); onRefresh(); }}>
              <input
                type="text"
                placeholder="Buscar por SKU o Nombre..."
                className="input-rubi pl-12 py-2.5 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </form>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => {
                const headers = ['sku', 'nombre', 'precio', 'stock', 'marca'];
                if (config?.show_modelo !== false) headers.push('modelo');
                headers.push('anio_inicio', 'anio_fin');
                if (config?.show_proveedor !== false) headers.push('proveedor');
                headers.push('tipo', 'descripcion', 'imagenes');
                downloadCSV(headers.join(",") + "\n", "plantilla_productos.csv");
              }}
              className="p-2 text-slate-500 hover:text-secondary hover:bg-white rounded-lg transition-all"
              title="Plantilla Nueva"
            >
              <FileText size={18} />
            </button>
            <button
              onClick={() => {
                const headers = ['sku', 'precio', 'stock'];
                downloadCSV(headers.join(",") + "\n", "actualizar_stock_precios.csv");
              }}
              className="p-2 text-slate-500 hover:text-secondary hover:bg-white rounded-lg transition-all"
              title="Plantilla Stock/Precio"
            >
              <Check size={18} />
            </button>
            <button
              onClick={async () => {
                setExporting(true);
                try {
                  let query = supabase.from('productos').select('*');
                  if (searchTerm) {
                    query = query.or(`sku.ilike.%${searchTerm}%,nombre.ilike.%${searchTerm}%`);
                  }
                  
                  const { data: allProducts, error } = await query.order('creado_at', { ascending: false });
                  
                  if (error) throw error;
                  if (!allProducts) return;

                  const headers = ['sku', 'nombre', 'precio', 'stock', 'marca'];
                  if (config?.show_modelo !== false) headers.push('modelo');
                  headers.push('anio_inicio', 'anio_fin');
                  if (config?.show_proveedor !== false) headers.push('proveedor');
                  headers.push('tipo', 'descripcion', 'imagenes');
                  
                  const rows = allProducts.map(p => {
                    const row = [
                      p.sku,
                      `"${p.nombre}"`,
                      p.precio,
                      p.stock,
                      `"${p.marca || ''}"`
                    ];
                    if (config?.show_modelo !== false) row.push(`"${p.modelo || ''}"`);
                    row.push(p.año_inicio || '', p.año_fin || '');
                    if (config?.show_proveedor !== false) row.push(`"${p.proveedor || ''}"`);
                    row.push(`"${p.tipo || ''}"`, `"${p.descripcion || ''}"`, `"${p.imagenes ? p.imagenes.join(';') : ''}"`);
                    return row.join(",");
                  });
                  downloadCSV(headers.join(",") + "\n" + rows.join("\n"), "catalogo_completo.csv");
                } catch (error: any) {
                  toast.error("Error al exportar: " + error.message);
                } finally {
                  setExporting(false);
                }
              }}
              disabled={exporting}
              className="p-2 text-slate-500 hover:text-secondary hover:bg-white rounded-lg transition-all disabled:opacity-50"
              title="Exportar Todo"
            >
              {exporting ? (
                <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
              ) : (
                <Download size={18} />
              )}
            </button>
          </div>

          <button
            onClick={handleClearAllProducts}
            className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
            title="Vaciar Catálogo"
          >
            <Trash2 size={20} />
          </button>

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

      <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl mb-6 flex items-start space-x-3">
        <div className="p-2 bg-amber-100 text-amber-600 rounded-lg shrink-0">
          <ShieldAlert size={18} />
        </div>
        <div>
          <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Nota importante de importación</p>
          <p className="text-[11px] text-amber-700 leading-relaxed">
            La importación de archivos CSV <strong>sustituye (reemplaza)</strong> las existencias y precios actuales basándose en el SKU.
            Asegúrate de que tu archivo contenga los datos más recientes de tu sistema externo.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between px-2 mb-4">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Mostrando <span className="text-secondary">{Math.min(totalCount, (page - 1) * pageSize + 1)}</span> - <span className="text-secondary">{Math.min(totalCount, page * pageSize)}</span> de <span className="text-secondary font-black">{totalCount}</span> productos
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-100">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-6 whitespace-nowrap">SKU / Marca</th>
              <th className="py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-6">Descripción</th>
              <th className="py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-6">{(config?.show_proveedor !== false) ? 'Proveedor / Tipo' : 'Tipo / Categoría'}</th>
              <th className="py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-6">Stock</th>
              <th className="py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-6">Precio</th>
              <th className="py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-6 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={6} className="py-20 text-center text-slate-400 font-medium font-sans">Sincronizando inventario...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={6} className="py-20 text-center text-slate-400 font-medium">No se encontraron productos</td></tr>
            ) : products.map((p) => (
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
                  <span className="font-bold text-secondary line-clamp-3 md:line-clamp-1 min-w-[160px] md:min-w-0">{p.nombre}</span>
                  <div className="flex items-center space-x-2 mt-1">
                    {config?.show_modelo !== false && p.modelo && <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded">{p.modelo}</span>}
                    {(p.año_inicio || p.año_fin) && (
                      <span className="text-[10px] text-slate-400 font-medium italic">
                        {p.año_inicio || '...'} - {p.año_fin || '...'}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-5 px-6">
                  <div className="flex flex-col">
                    {config?.show_proveedor !== false && <span className="text-xs font-bold text-secondary">{p.proveedor || 'S/P'}</span>}
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{p.tipo || 'General'}</span>
                  </div>
                </td>
                <td className="py-5 px-6">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${p.stock > 10 ? 'bg-green-500' : p.stock > 0 ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                    <span className="font-bold text-secondary text-sm">{p.stock} pz</span>
                  </div>
                </td>
                <td className="py-5 px-6">
                  <span className="font-black text-secondary">${p.precio.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </td>
                <td className="py-5 px-6 text-right flex items-center justify-end space-x-2">
                  <button
                    onClick={async () => {
                      const { error } = await supabase
                        .from('productos')
                        .update({ en_social_proof: !p.en_social_proof })
                        .eq('id', p.id);
                      if (!error) {
                        onRefresh();
                        toast.success(p.en_social_proof ? 'Eliminado de Prueba Social' : 'Añadido a Prueba Social');
                      }
                    }}
                    className={`p-2.5 rounded-xl transition-all ${p.en_social_proof ? 'text-primary bg-primary/10' : 'text-slate-300 hover:text-primary hover:bg-slate-100'}`}
                    title={p.en_social_proof ? "Quitar de Prueba Social" : "Añadir a Prueba Social"}
                  >
                    <Zap size={16} fill={p.en_social_proof ? "currentColor" : "none"} />
                  </button>
                  <button
                    onClick={() => setEditingProduct(p)}
                    className="p-2.5 text-slate-300 hover:text-secondary hover:bg-slate-100 rounded-xl transition-all"
                    title="Editar"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id, p.nombre)}
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

      {Math.ceil(totalCount / pageSize) > 1 && (
        <div className="flex justify-center items-center space-x-2 pt-8">
          <button 
            disabled={page === 1}
            onClick={() => setPage((p: number) => Math.max(1, p - 1))}
            className="p-2 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-secondary disabled:opacity-30 transition-all shadow-sm"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.ceil(totalCount / pageSize) }, (_, i) => i + 1)
              .filter(p => p === 1 || p === Math.ceil(totalCount / pageSize) || Math.abs(p - page) <= 1)
              .map((p, i, arr) => (
                <React.Fragment key={p}>
                  {i > 0 && arr[i-1] !== p-1 && <span className="text-slate-300">...</span>}
                  <button
                    onClick={() => setPage(p)}
                    className={`w-10 h-10 rounded-xl font-bold text-xs transition-all ${
                      page === p 
                        ? 'bg-secondary text-white shadow-lg shadow-secondary/20' 
                        : 'bg-white border border-slate-100 text-slate-500 hover:border-secondary/50'
                    }`}
                  >
                    {p}
                  </button>
                </React.Fragment>
              ))}
          </div>

          <button 
            disabled={page === Math.ceil(totalCount / pageSize)}
            onClick={() => setPage((p: number) => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
            className="p-2 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-secondary disabled:opacity-30 transition-all shadow-sm"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Modals moved to Admin root */}
    </div>
  );
};

const ProductModal = ({ product, catalogues, onClose, onRefresh }: { product?: any, catalogues: any, onClose: () => void, onRefresh: () => void }) => {
  const { config } = useStore();
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
    imagenes: product?.imagenes || [],
    proveedor: product?.proveedor || '',
    tipo: product?.tipo || ''
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

      const { config } = useStore.getState();
      const watermarkedFile = await addWatermark(file, config);
      const processedFile = await optimizeImage(watermarkedFile as File);
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, processedFile);

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

    const cleanSku = form.sku
      .trim()
      .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, '-')
      .replace(/\s+/g, '')
      .toUpperCase();

    // Prepare data (convert empty years to null)
    const productData = {
      ...form,
      sku: cleanSku,
      año_inicio: form.año_inicio === '' ? null : form.año_inicio,
      año_fin: form.año_fin === '' ? null : form.año_fin,
      modelo: form.modelo.trim() === '' ? null : form.modelo,
      proveedor: form.proveedor.trim() === '' ? null : form.proveedor
    };

    try {
      let error;
      if (product) {
        const { error: err } = await supabase.from('productos').update(productData).eq('id', product.id);
        error = err;
      } else {
        // Verificar si el SKU ya existe antes de insertar
        const { data: existing } = await supabase
          .from('productos')
          .select('id')
          .eq('sku', cleanSku)
          .maybeSingle();

        if (existing) {
          setSaving(false);
          return setErrorMsg(`El SKU "${cleanSku}" ya existe en el catálogo.`);
        }

        const { error: err } = await supabase.from('productos').insert(productData);
        error = err;
      }

      if (!error) {
        toast.success(product ? 'Producto actualizado correctamente.' : 'Producto creado con éxito.');
        onRefresh();
        onClose();
      } else {
        throw error;
      }
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error('Error al guardar: ' + error.message);
      setErrorMsg('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-secondary/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 min-h-screen">
      <div className="bg-white rounded-2xl md:rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[95vh] md:max-h-[90vh] relative">
        <div className="bg-secondary p-8 text-white relative shrink-0">
          <button onClick={onClose} className="absolute right-6 top-6 hover:rotate-90 transition-all">
            <X size={24} />
          </button>
          <div className="flex items-center space-x-3 mb-2">
            <Package />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Inventario</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">{product ? 'Editar Producto' : 'Nuevo Producto'}</h3>
        </div>

        {errorMsg && (
          <div className="mx-6 md:mx-8 mt-6 shrink-0 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start space-x-3 text-rose-600 animate-in fade-in slide-in-from-top-4 duration-300">
            <AlertTriangle className="flex-shrink-0" size={20} />
            <p className="text-xs font-bold leading-relaxed">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">SKU</label>
              <input
                required
                className="input-rubi py-2.5"
                placeholder="MOT-001"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Marca</label>
              <input
                className="input-rubi py-2.5"
                placeholder="PRO-PARTS"
                list="list-marcas"
                value={form.marca}
                onChange={(e) => setForm({ ...form, marca: e.target.value })}
              />
              <datalist id="list-marcas">
                {catalogues.marcas.map((m: string) => <option key={m} value={m} />)}
              </datalist>
            </div>
          </div>

          <div className={`grid ${config?.show_proveedor !== false ? 'grid-cols-2' : 'grid-cols-1'} gap-5`}>
            {config?.show_proveedor !== false && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Proveedor</label>
                <input
                  className="input-rubi py-2.5"
                  placeholder="Ej: Distribuidora GML"
                  list="list-proveedores"
                  value={form.proveedor}
                  onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
                />
                <datalist id="list-proveedores">
                  {catalogues.proveedores.map((p: string) => <option key={p} value={p} />)}
                </datalist>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Tipo / Categoría Técnica</label>
              <input
                className="input-rubi py-2.5"
                placeholder="Ej: Suspensión"
                list="list-tipos"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              />
              <datalist id="list-tipos">
                {catalogues.tipos.map((t: string) => <option key={t} value={t} />)}
              </datalist>
            </div>
          </div>

          <div className={`grid ${config?.show_modelo !== false ? 'grid-cols-3' : 'grid-cols-2'} gap-5`}>
            {config?.show_modelo !== false && (
              <div className="col-span-1 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Modelo</label>
                <input
                  className="input-rubi py-2.5"
                  placeholder="Tsuru"
                  list="list-modelos"
                  value={form.modelo}
                  onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                />
                <datalist id="list-modelos">
                  {catalogues.modelos.map((m: string) => <option key={m} value={m} />)}
                </datalist>
              </div>
            )}
            <div className="col-span-1 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Año Inicio (Opc)</label>
              <input
                className="input-rubi py-2.5"
                placeholder="1992"
                list="list-años"
                value={form.año_inicio}
                onChange={(e) => setForm({ ...form, año_inicio: e.target.value ? parseInt(e.target.value) : '' })}
              />
            </div>
            <div className="col-span-1 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Año Fin (Opc)</label>
              <input
                className="input-rubi py-2.5"
                placeholder="2017"
                list="list-años"
                value={form.año_fin}
                onChange={(e) => setForm({ ...form, año_fin: e.target.value ? parseInt(e.target.value) : '' })}
              />
              <datalist id="list-años">
                {catalogues.años.map((a: number) => <option key={a} value={a} />)}
              </datalist>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Nombre Comercial</label>
            <input
              required
              className="input-rubi py-2.5"
              placeholder="Ej: Balatas Cerámicas Delanteras"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Descripción Detallada (Ficha Técnica)</label>
            <textarea
              rows={4}
              className="input-rubi py-2.5 min-h-[100px] resize-y"
              placeholder="Ej: Balatas de cerámica de alta resistencia para Tsuru III. Incluye herrajes..."
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
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
                      setForm({ ...form, imagenes: [...form.imagenes, newImage] });
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
                      onClick={() => setForm({ ...form, imagenes: form.imagenes.filter((_: any, i: number) => i !== idx) })}
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
                onChange={(e) => setForm({ ...form, precio: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Stock (Opcional)</label>
              <input
                type="number"
                className="input-rubi py-2.5"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value ? parseInt(e.target.value) : 0 })}
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

const OrderManagement = ({ selectedOrder: _selectedOrder, setSelectedOrder }: { selectedOrder: any, setSelectedOrder: (v: any) => void }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [clientSearch, setClientSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    // Select the order and also the joined client profile using the foreign key cliente_id -> id
    // Re-writing the select to use the !inner join specifically when searching
    // To filter the PARENT rows based on CHILD rows, we use the !inner hint in select
    const selectStr = clientSearch
      ? `*, perfiles!pedidos_cliente_id_fkey!inner (nombre_completo, empresa, email_alternativo)`
      : `*, perfiles!pedidos_cliente_id_fkey (nombre_completo, empresa, email_alternativo)`;

    let query = supabase
      .from('pedidos')
      .select(selectStr, { count: 'exact' });

    if (clientSearch) {
      query = query.or(`nombre_completo.ilike.%${clientSearch}%,empresa.ilike.%${clientSearch}%`, { foreignTable: 'perfiles' });
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query
      .order('creado_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching orders:", error);
    }
    if (data) setOrders(data);
    if (count !== null) setTotalCount(count);
    setLoading(false);
  }, [clientSearch, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleClearAllOrders = () => {
    toast((t) => (
      <div className="flex flex-col space-y-4 p-1">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="text-left">
            <p className="font-bold text-secondary text-sm">¿ELIMINAR TODOS LOS PEDIDOS?</p>
            <p className="text-[10px] text-slate-500 font-medium leading-tight">Esta acción borrará TODO el historial permanentemente.</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              const { error } = await supabase.from('pedidos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
              if (error) {
                toast.error('Error al eliminar: ' + error.message);
              } else {
                toast.success('Pedidos eliminados correctamente.');
                fetchOrders();
              }
            }}
            className="flex-1 py-2 bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-rose-600 transition-colors"
          >
            SÍ, ELIMINAR TODO
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-1 py-2 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    ), { duration: 8000, position: 'top-center', style: { borderRadius: '20px', padding: '16px', border: '1px solid #f1f5f9' } });
  };

  const exportAllOrdersCSV = async () => {
    setLoading(true);
    // Use !inner join when searching to filter results correctly for export too
    const selectStr = clientSearch
      ? `*, perfiles!pedidos_cliente_id_fkey!inner (nombre_completo, empresa)`
      : `*, perfiles!pedidos_cliente_id_fkey (nombre_completo, empresa)`;

    let query = supabase
      .from('pedidos')
      .select(selectStr)
      .order('creado_at', { ascending: false });

    if (clientSearch) {
      query = query.or(`nombre_completo.ilike.%${clientSearch}%,empresa.ilike.%${clientSearch}%`, { foreignTable: 'perfiles' });
    }

    const { data: allOrders, error } = await query;
    setLoading(false);

    if (error) {
      toast.error("Error exportando pedidos: " + error.message);
      return;
    }

    const headers = "Folio,ID Cliente,Cliente,Empresa,Estatus,Total,Fecha\n";
    const rows = (allOrders || []).map((o: any) => {
      const client = o.perfiles?.nombre_completo || 'N/A';
      const company = o.perfiles?.empresa || 'N/A';
      return `"${o.folio || o.id}","${o.cliente_id}","${client}","${company}","${o.estatus}","${o.total}","${new Date(o.creado_at).toLocaleDateString()}"`;
    }).join("\n");
    downloadCSV(headers + rows, `pedidos_reporte_${new Date().getTime()}.csv`);
  };



  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-black text-secondary flex items-center space-x-3">
          <div className="p-2 bg-secondary text-white rounded-lg"><ClipboardList size={20} /></div>
          <span>Historial de Pedidos</span>
        </h2>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="relative flex-grow md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por cliente..."
              className="input-rubi pl-10 py-2 text-sm"
              value={clientSearch}
              onChange={(e) => {
                setClientSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <button
            onClick={handleClearAllOrders}
            className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
            title="Vaciar Historial"
          >
            <Trash2 size={18} />
          </button>

          <button
            onClick={exportAllOrdersCSV}
            className="btn-secondary py-2 px-4 flex items-center space-x-2 text-xs font-bold leading-none"
          >
            <Download size={14} />
            <span>Exportar CSV</span>
          </button>
        </div>
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
            {loading ? (
              <tr><td colSpan={6} className="py-20 text-center text-slate-400 font-medium border-2 border-dashed border-slate-100 rounded-3xl">Cargando pedidos...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={6} className="py-20 text-center text-slate-400 font-medium border-2 border-dashed border-slate-100 rounded-3xl">No hay pedidos registrados aún.</td></tr>
            ) : orders.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => setSelectedOrder(o)}>
                <td className="py-5 px-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-100 group-hover:bg-primary group-hover:text-white transition-all">
                      <Package size={18} />
                    </div>
                    <div>
                      <span className="font-bold text-secondary uppercase tracking-widest block text-xs">{o.folio ? `Folio #${o.folio}` : `ID: #${o.id.slice(0, 6)}`}</span>
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
                  <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full tracking-wider ${o.estatus === 'entregado' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                    {o.estatus}
                  </span>
                </td>
                <td className="py-5 px-6 text-primary font-black tracking-tight">${o.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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

      {/* Pagination Orders */}
      {Math.ceil(totalCount / pageSize) > 1 && (
        <div className="flex justify-center items-center space-x-2 pt-4">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="p-1.5 rounded-lg bg-white border border-slate-100 text-slate-400 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-slate-400">Página {page} de {Math.ceil(totalCount / pageSize)}</span>
          <button
            disabled={page >= Math.ceil(totalCount / pageSize)}
            onClick={() => setPage(p => p + 1)}
            className="p-1.5 rounded-lg bg-white border border-slate-100 text-slate-400 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>

  );
};

const OrderDetailModal = ({ order, onClose, exportCSV, exportPDF }: { order: any, onClose: () => void, exportCSV: (order: any) => void, exportPDF: (order: any) => void }) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 min-h-screen">
      <div className="absolute inset-0 bg-secondary/60 backdrop-blur-md" onClick={onClose} />
      <div className="bg-white rounded-2xl md:rounded-[40px] max-w-2xl w-full shadow-2xl relative animate-in zoom-in duration-300 flex flex-col max-h-[95vh] md:max-h-[90vh]">
        <div className="p-6 md:p-8 shrink-0 relative border-b border-slate-100">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 md:right-6 md:top-6 p-2 text-slate-400 hover:text-secondary bg-slate-50 rounded-xl transition-all"
          >
            <X size={20} />
          </button>

          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <ClipboardList size={24} className="md:w-[28px] md:h-[28px]" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Detalle Maestro de Pedido</p>
              <h3 className="text-xl md:text-3xl font-black text-secondary uppercase tracking-tight">
                {order.folio ? `Folio #${order.folio}` : `ID: ${order.id.slice(0, 12)}...`}
              </h3>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6 md:space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Información del Cliente</p>
              <p className="font-bold text-secondary text-base truncate">{order.perfiles?.nombre_completo || 'Cliente Desconocido'}</p>
              <p className="font-bold text-slate-500 text-xs truncate mb-1">{order.perfiles?.empresa || 'Empresa Desconocida'}</p>
              <p className="font-medium text-slate-400 text-[10px] truncate">ID: {order.cliente_id}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estado del Pedido</p>
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${order.estatus === 'entregado' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                <span className="font-bold text-secondary uppercase text-sm">{order.estatus}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Productos Solicitados</p>
            {order.items?.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                    <Package size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-secondary">{item.sku}</p>
                    <p className="text-[10px] font-bold text-slate-500 line-clamp-2">{item.nombre || 'Sin nombre'}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                      Cant: {item.cantidad}
                      <span className="mx-2 text-slate-200">|</span>
                      Unit: ${item.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-black text-primary">${(item.precio_unitario * item.cantidad).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 md:p-8 shrink-0 bg-slate-50 border-t border-slate-100 rounded-b-2xl md:rounded-b-[40px] flex flex-col md:flex-row items-center md:items-center justify-between gap-4">
          <div className="w-full md:w-auto text-center md:text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monto Total</p>
            <p className="text-3xl md:text-4xl font-black text-secondary tracking-tighter">${order.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="flex w-full md:w-auto justify-end space-x-3">
            <button
              onClick={() => exportCSV(order)}
              className="p-3 md:p-4 bg-slate-100 text-slate-600 rounded-xl md:rounded-2xl hover:bg-slate-200 transition-all group flex items-center space-x-2 shrink-0"
              title="Exportar a CSV"
            >
              <FileDown size={20} />
              <span className="text-xs font-bold uppercase tracking-widest hidden sm:block">CSV</span>
            </button>
            <button
              onClick={() => exportPDF(order)}
              className="p-3 md:p-4 bg-slate-100 text-slate-600 rounded-xl md:rounded-2xl hover:bg-slate-200 transition-all group flex items-center space-x-2 shrink-0"
              title="Exportar a PDF"
            >
              <FileDown size={20} />
              <span className="text-xs font-bold uppercase tracking-widest hidden sm:block">PDF</span>
            </button>
            <button
              onClick={onClose}
              className="flex-1 md:flex-none btn-primary px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl shadow-xl shadow-primary/20 uppercase text-xs md:text-sm tracking-widest font-black"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
