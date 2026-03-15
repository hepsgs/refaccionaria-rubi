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
  ChevronRight,
  ShieldAlert,
  Settings2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

const Admin = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'products' | 'orders' | 'config' | 'cms'>('users');
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
    watermark_position: 'bottom-right',
    watermark_opacity: 0.7
  });
  const [testEmail, setTestEmail] = useState('');
  const [testingSMTP, setTestingSMTP] = useState(false);
  const { profile, config, setConfig } = useStore();

  // Update local settings state when global config changes
  useEffect(() => {
    if (config) {
      setSettings(config);
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
    ] : [])
  ];

  // If the active tab is not available, set it to the first available tab
  if (availableTabs.length > 0 && !availableTabs.find(t => t.id === activeTab)) {
    setActiveTab(availableTabs[0].id as any);
  }

  if (availableTabs.length === 0) {
    return <div className="p-20 text-center font-bold">No tienes permisos asignados. Acude con un administrador.</div>;
  }

  return (
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
                              onClick={() => setSettings({...settings, hero_images: settings.hero_images.filter((_: any, i: number) => i !== idx)})}
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
                                const { error: uploadError } = await supabase.storage.from('branding').upload(fileName, file);
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
                  <span>Sección Nosotros e Imágenes</span>
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
                  
                  {/* Multiple About Images */}
                  <div className="space-y-2 pt-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Galería (Sección Nosotros)</label>
                    <div className="flex flex-wrap gap-2">
                      {settings.about_images?.map((img: string, idx: number) => (
                        <div key={idx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                          <img src={img} alt="About" className="w-full h-full object-cover" />
                          <button 
                            onClick={() => setSettings({...settings, about_images: settings.about_images.filter((_: any, i: number) => i !== idx)})}
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
                              const { error: uploadError } = await supabase.storage.from('branding').upload(fileName, file);
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
                      onChange={(e) => setSettings({...settings, distributors_title_1: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Título Línea 2 (Color)</label>
                    <input 
                      className="input-rubi" 
                      value={settings.distributors_title_2}
                      onChange={(e) => setSettings({...settings, distributors_title_2: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Texto Informativo</label>
                    <textarea 
                      className="input-rubi min-h-[100px] resize-none py-3" 
                      value={settings.distributors_text}
                      onChange={(e) => setSettings({...settings, distributors_text: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Texto del Botón (CTA)</label>
                    <input 
                      className="input-rubi" 
                      value={settings.distributors_cta_text}
                      onChange={(e) => setSettings({...settings, distributors_cta_text: e.target.value})}
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
                                  const { error: uploadError } = await supabase.storage.from('branding').upload(fileName, file);
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
                      onChange={(e) => setSettings({...settings, stats_products: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Talleres Afiliados</label>
                    <input 
                      className="input-rubi" 
                      value={settings.stats_clients || ''}
                      placeholder="Ej: 500+"
                      onChange={(e) => setSettings({...settings, stats_clients: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Años Experiencia</label>
                    <input 
                      className="input-rubi" 
                      value={settings.stats_years || ''}
                      placeholder="Ej: 20+"
                      onChange={(e) => setSettings({...settings, stats_years: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Texto Versión Catálogo</label>
                    <input 
                      className="input-rubi" 
                      value={settings.cms_version_text || ''}
                      placeholder="Ej: v2.0"
                      onChange={(e) => setSettings({...settings, cms_version_text: e.target.value})}
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
            <div className="flex items-center justify-between pb-6 border-b border-slate-100">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <SettingsIcon size={32} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-secondary tracking-tighter uppercase leading-none">Configuración General</h2>
                  <p className="text-slate-500 font-medium text-sm">Gestiona la identidad visual, contacto y servidor de correo.</p>
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
                  <span>Branding y WhatsApp</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nombre Comercial</label>
                    <input 
                      className="input-rubi" 
                      placeholder="Ej: Refaccionaria Rubi"
                      value={settings.platform_name || ''}
                      onChange={(e) => setSettings({...settings, platform_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Abreviatura (Logo/Header)</label>
                    <input 
                      className="input-rubi" 
                      placeholder="Ej: RUBI"
                      value={settings.abreviatura || ''}
                      onChange={(e) => setSettings({...settings, abreviatura: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">WhatsApp (10 dígitos)</label>
                    <input 
                      className="input-rubi" 
                      placeholder="Ej: 5212345678"
                      value={settings.whatsapp_number || ''}
                      onChange={(e) => setSettings({...settings, whatsapp_number: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Mensaje WhatsApp</label>
                    <input 
                      className="input-rubi" 
                      placeholder="Hola, me gustaría..."
                      value={settings.whatsapp_message || ''}
                      onChange={(e) => setSettings({...settings, whatsapp_message: e.target.value})}
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
                            onClick={() => setSettings({...settings, branding_images: settings.branding_images.filter((_: any, i: number) => i !== idx)})}
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
                              const { error: uploadError } = await supabase.storage.from('branding').upload(fileName, file);
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
                    <input className="input-rubi" value={settings.smtp_host || ''} onChange={(e) => setSettings({...settings, smtp_host: e.target.value})} placeholder="smtp.gmail.com" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Puerto</label>
                    <input className="input-rubi" value={settings.smtp_port || ''} onChange={(e) => setSettings({...settings, smtp_port: e.target.value})} placeholder="587" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Usuario SMTP</label>
                    <input className="input-rubi" value={settings.smtp_user || ''} onChange={(e) => setSettings({...settings, smtp_user: e.target.value})} placeholder="email@gmail.com" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Contraseña</label>
                    <input type="password" className="input-rubi" value={settings.smtp_pass || ''} onChange={(e) => setSettings({...settings, smtp_pass: e.target.value})} placeholder="••••••••" />
                  </div>
                  <div className="space-y-1">
                    <select 
                      className="input-rubi py-2 text-sm" 
                      value={settings.smtp_security || 'tls'}
                      onChange={(e) => setSettings({...settings, smtp_security: e.target.value})}
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
                      onChange={(e) => setSettings({...settings, notificacion_registro_emails: e.target.value})} 
                      placeholder="admin@empresa.com, ventas@empresa.com" 
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">URL del Sitio (Para links en correos)</label>
                    <input 
                      className="input-rubi" 
                      value={settings.site_url || ''} 
                      onChange={(e) => setSettings({...settings, site_url: e.target.value})} 
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

                <div className="pt-6 border-t border-slate-50 space-y-6">
                  <h3 className="font-bold text-secondary text-lg flex items-center space-x-2">
                    <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                    <span>Marca de Agua para Productos</span>
                  </h3>
                  
                  <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" onClick={() => setSettings({...settings, watermark_enabled: !settings.watermark_enabled})}>
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
                          onChange={(e) => setSettings({...settings, watermark_type: e.target.value})}
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
                                  onClick={() => setSettings({...settings, watermark_image_url: ''})}
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
                                      const { error: uploadError } = await supabase.storage.from('branding').upload(fileName, file);
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
                            onChange={(e) => setSettings({...settings, watermark_text: e.target.value})} 
                            placeholder="Ej: CONFIDENCIAL / COPIA" 
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Posición</label>
                        <select 
                          className="input-rubi py-2 text-sm" 
                          value={settings.watermark_position || 'bottom-right'}
                          onChange={(e) => setSettings({...settings, watermark_position: e.target.value})}
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
                            onChange={(e) => setSettings({...settings, watermark_opacity: parseFloat(e.target.value)})}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 card-rubi bg-white border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
                <div className="space-y-4">
                  <h3 className="font-bold text-secondary text-lg flex items-center space-x-2">
                    <span className="w-1.5 h-6 bg-slate-800 rounded-full"></span>
                    <span>Aviso de Privacidad</span>
                  </h3>
                  <textarea 
                    className="input-rubi min-h-[300px] py-4 text-sm" 
                    placeholder="Escribe el aviso de privacidad aquí..."
                    value={settings.privacy_policy || ''}
                    onChange={(e) => setSettings({...settings, privacy_policy: e.target.value})}
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
                    onChange={(e) => setSettings({...settings, terms_conditions: e.target.value})}
                  />
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
  const [editingUser, setEditingUser] = useState<any>(null);
  const { profile } = useStore();

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
          <span className="p-2 bg-secondary text-white rounded-lg inline-flex"><Users size={20} /></span>
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
                    <span className="text-xs text-slate-400 font-medium">{u.email || `ID: ${u.id.slice(0,8)}`}</span>
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
                  <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${
                    u.estatus === 'aprobado' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
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
                                      fetchUsers();
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

      {showAddUser && <AddUserModal onClose={() => setShowAddUser(false)} onRefresh={fetchUsers} />}
      {editingUser && <EditUserModal key={editingUser.id} user={editingUser} onClose={() => setEditingUser(null)} onRefresh={fetchUsers} />}
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
      aprobar_usuarios: false
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
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Teléfono (10 dígitos)</label>
            <input 
              required 
              type="tel"
              maxLength={10}
              className="input-rubi py-2.5" 
              placeholder="Ej: 5512345678"
              value={form.telefono}
              onChange={(e) => setForm({...form, telefono: e.target.value.replace(/\D/g, '')})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Empresa / Taller {(form.rol === 'empleado' || form.rol === 'admin') && '(Opcional)'}</label>
            <input 
              required={form.rol === 'cliente'}
              className="input-rubi py-2.5" 
              placeholder={form.rol === 'cliente' ? "Nombre del Taller" : `Por defecto: ${settings?.platform_name || 'Refaccionaria'}`}
              value={form.empresa}
              onChange={(e) => setForm({...form, empresa: e.target.value})}
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Rol del Usuario</label>
            <div className="grid grid-cols-3 gap-3">
              <label className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center space-y-2 ${form.rol === 'cliente' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                <input type="radio" name="rol" value="cliente" className="sr-only" checked={form.rol === 'cliente'} onChange={() => setForm({...form, rol: 'cliente'})} />
                <Users size={20} />
                <span className="text-xs font-bold">Cliente</span>
              </label>
              <label className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center space-y-2 ${form.rol === 'empleado' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                <input type="radio" name="rol" value="empleado" className="sr-only" checked={form.rol === 'empleado'} onChange={() => setForm({...form, rol: 'empleado'})} />
                <Shield size={20} />
                <span className="text-xs font-bold">Empleado</span>
              </label>
              <label className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center space-y-2 ${form.rol === 'admin' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                <input type="radio" name="rol" value="admin" className="sr-only" checked={form.rol === 'admin'} onChange={() => setForm({...form, rol: 'admin'})} />
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
                    onChange={(e) => setForm({...form, permisos: {...form.permisos, productos: e.target.checked}})}
                  />
                  <span>Productos</span>
                </label>
                <label className="flex items-center space-x-2 text-sm font-bold text-secondary">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={form.permisos.pedidos}
                    onChange={(e) => setForm({...form, permisos: {...form.permisos, pedidos: e.target.checked}})}
                  />
                  <span>Pedidos</span>
                </label>
                <label className="flex items-center space-x-2 text-sm font-bold text-secondary">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={form.permisos.usuarios}
                    onChange={(e) => setForm({...form, permisos: {...form.permisos, usuarios: e.target.checked}})}
                  />
                  <span>Usuarios</span>
                </label>
                <label className="flex items-center space-x-2 text-sm font-bold text-secondary">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={form.permisos.configuracion}
                    onChange={(e) => setForm({...form, permisos: {...form.permisos, configuracion: e.target.checked}})}
                  />
                  <span>Configuración</span>
                </label>
                <label className="flex items-center space-x-2 text-sm font-bold text-secondary">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={form.permisos.aprobar_usuarios}
                    onChange={(e) => setForm({...form, permisos: {...form.permisos, aprobar_usuarios: e.target.checked}})}
                  />
                  <span>Solo Aprobar Usuarios</span>
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
        aprobar_usuarios: !!p.aprobar_usuarios
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
    <div className="fixed inset-0 bg-secondary/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-slate-800 p-8 text-white relative">
          <button onClick={onClose} className="absolute right-6 top-6 hover:rotate-90 transition-all text-white/50 hover:text-white">
            <X size={24} />
          </button>
          <div className="flex items-center space-x-3 mb-2">
            <Settings2 />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Configuración de Usuario</span>
          </div>
          <h3 className="text-3xl font-black tracking-tighter uppercase">Editar Permisos</h3>
          <p className="text-slate-400 text-xs font-medium mt-1">{user.email || 'Usuario ID: ' + user.id.slice(0,8)}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Nombre Completo</label>
            <input 
              required 
              className="input-rubi py-2.5" 
              value={form.nombre_completo}
              onChange={(e) => setForm({...form, nombre_completo: e.target.value})}
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
              onChange={(e) => setForm({...form, telefono: e.target.value.replace(/\D/g, '')})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Empresa / Taller</label>
            <input 
              required
              className="input-rubi py-2.5" 
              value={form.empresa}
              onChange={(e) => setForm({...form, empresa: e.target.value})}
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Rol del Usuario</label>
            <div className="grid grid-cols-3 gap-3">
              {(['cliente', 'empleado', 'admin'] as const).map((r) => (
                <label key={r} className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center space-y-2 ${form.rol === r ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                  <input type="radio" name="rol" value={r} className="sr-only" checked={form.rol === r} onChange={() => setForm({...form, rol: r})} />
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
                    onChange={(e) => setForm({...form, permisos: {...form.permisos, productos: e.target.checked}})}
                  />
                  <span>Productos</span>
                </label>
                <label className="flex items-center space-x-2 text-sm font-bold text-secondary">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={form.permisos.pedidos}
                    onChange={(e) => setForm({...form, permisos: {...form.permisos, pedidos: e.target.checked}})}
                  />
                  <span>Pedidos</span>
                </label>
                <label className="flex items-center space-x-2 text-sm font-bold text-secondary">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={form.permisos.usuarios}
                    onChange={(e) => setForm({...form, permisos: {...form.permisos, usuarios: e.target.checked}})}
                  />
                  <span>Usuarios</span>
                </label>
                <label className="flex items-center space-x-2 text-sm font-bold text-secondary">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={form.permisos.configuracion}
                    onChange={(e) => setForm({...form, permisos: {...form.permisos, configuracion: e.target.checked}})}
                  />
                  <span>Configuración</span>
                </label>
                <label className="flex items-center space-x-2 text-sm font-bold text-secondary">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={form.permisos.aprobar_usuarios}
                    onChange={(e) => setForm({...form, permisos: {...form.permisos, aprobar_usuarios: e.target.checked}})}
                  />
                  <span>Solo Aprobar Usuarios</span>
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
                fetchProducts();
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

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      let text = event.target?.result as string;
      // Remove UTF-8 BOM if present
      if (text.startsWith('\uFEFF')) {
        text = text.substring(1);
      }
      const lines = text.split('\n');
      const productsToUpsert = lines.slice(1).map(line => {
        const parts = line.split(',');
        if (parts.length < 1) return null;
        const [sku, nombre, precio, stock, marca, modelo, año_inicio, año_fin, proveedor, tipo, descripcion, imagenes] = parts.map(p => p?.trim());
        if (!sku) return null;
        
        const updateData: any = { sku };
        
        if (nombre !== undefined) updateData.nombre = nombre.replace(/^"(.*)"$/, '$1');
        if (precio !== undefined && precio !== '') updateData.precio = parseFloat(precio);
        if (stock !== undefined && stock !== '') updateData.stock = parseInt(stock);
        if (marca !== undefined) updateData.marca = marca.replace(/^"(.*)"$/, '$1');
        if (modelo !== undefined) updateData.modelo = modelo.replace(/^"(.*)"$/, '$1');
        if (año_inicio !== undefined && año_inicio !== '') updateData.año_inicio = parseInt(año_inicio);
        if (año_fin !== undefined && año_fin !== '') updateData.año_fin = parseInt(año_fin);
        if (proveedor !== undefined) updateData.proveedor = proveedor.replace(/^"(.*)"$/, '$1');
        if (tipo !== undefined) updateData.tipo = tipo.replace(/^"(.*)"$/, '$1');
        if (descripcion !== undefined) updateData.descripcion = descripcion.replace(/^"(.*)"$/, '$1');
        
        if (imagenes) {
          const cleanImg = imagenes.replace(/^"(.*)"$/, '$1');
          if (cleanImg.startsWith('[') && cleanImg.endsWith(']')) {
            try { updateData.imagenes = JSON.parse(cleanImg); } catch (e) { console.error(e); }
          } else {
            updateData.imagenes = cleanImg.split(';').map(i => i.trim()).filter(i => i);
          }
        }

        return Object.keys(updateData).length > 1 ? updateData : null;
      }).filter(p => p !== null);

      if (productsToUpsert.length === 0) return toast.error('No se encontraron datos válidos');

      const { error } = await supabase.from('productos').upsert(productsToUpsert, { onConflict: 'sku' });
      if (!error) {
        toast.success('Importación completada con éxito');
        fetchProducts();
      } else {
        toast.error('Error en importación: ' + error.message);
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
          <span className="p-2 bg-secondary text-white rounded-lg inline-flex"><Package size={20} /></span>
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
          
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => {
                const headers = ['sku', 'nombre', 'precio', 'stock', 'marca', 'modelo', 'año_inicio', 'año_fin', 'proveedor', 'tipo', 'descripcion', 'imagenes'];
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
              onClick={() => {
                const headers = ['sku', 'nombre', 'precio', 'stock', 'marca', 'modelo', 'año_inicio', 'año_fin', 'proveedor', 'tipo', 'imagenes'];
                const rows = products.map(p => [
                  p.sku, 
                  `"${p.nombre}"`, 
                  p.precio, 
                  p.stock, 
                  `"${p.marca || ''}"`, 
                  `"${p.modelo || ''}"`, 
                  p.año_inicio || '', 
                  p.año_fin || '', 
                  `"${p.proveedor || ''}"`,
                  `"${p.tipo || ''}"`,
                  `"${p.imagenes ? p.imagenes.join(';') : ''}"`
                ].join(","));
                downloadCSV(headers.join(",") + "\n" + rows.join("\n"), "catalogo_completo.csv");
              }}
              className="p-2 text-slate-500 hover:text-secondary hover:bg-white rounded-lg transition-all"
              title="Exportar Todo"
            >
              <Download size={18} />
            </button>
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
              <th className="py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-6 whitespace-nowrap">SKU / Marca</th>
              <th className="py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-6">Descripción</th>
              <th className="py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-6">Proveedor / Tipo</th>
              <th className="py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-6">Stock</th>
              <th className="py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-6">Precio</th>
              <th className="py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest px-6 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={6} className="py-20 text-center text-slate-400 font-medium font-sans">Sincronizando inventario...</td></tr>
            ) : filteredProducts.length === 0 ? (
              <tr><td colSpan={6} className="py-20 text-center text-slate-400 font-medium">No se encontraron productos</td></tr>
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
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-secondary">{p.proveedor || 'S/P'}</span>
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

      {(showAdd || editingProduct) && (
        <ProductModal 
          product={editingProduct} 
          catalogues={{
            marcas: Array.from(new Set(products.map(p => p.marca).filter(Boolean))),
            proveedores: Array.from(new Set(products.map(p => p.proveedor).filter(Boolean))),
            tipos: Array.from(new Set(products.map(p => p.tipo).filter(Boolean))),
            modelos: Array.from(new Set(products.map(p => p.modelo).filter(Boolean))),
            años: Array.from(new Set([...products.map(p => p.año_inicio), ...products.map(p => p.año_fin)].filter(Boolean))).sort((a: any, b: any) => b - a)
          }}
          onClose={() => { setShowAdd(false); setEditingProduct(null); }} 
          onRefresh={fetchProducts} 
        />
      )}
    </div>
  );
};

const ProductModal = ({ product, catalogues, onClose, onRefresh }: { product?: any, catalogues: any, onClose: () => void, onRefresh: () => void }) => {
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
      const processedFile = await addWatermark(file, config);
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
                list="list-marcas"
                value={form.marca}
                onChange={(e) => setForm({...form, marca: e.target.value})}
              />
              <datalist id="list-marcas">
                {catalogues.marcas.map((m: string) => <option key={m} value={m} />)}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Proveedor</label>
              <input 
                className="input-rubi py-2.5" 
                placeholder="Ej: Distribuidora GML"
                list="list-proveedores"
                value={form.proveedor}
                onChange={(e) => setForm({...form, proveedor: e.target.value})}
              />
              <datalist id="list-proveedores">
                {catalogues.proveedores.map((p: string) => <option key={p} value={p} />)}
              </datalist>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Tipo / Categoría Técnica</label>
              <input 
                className="input-rubi py-2.5" 
                placeholder="Ej: Suspensión"
                list="list-tipos"
                value={form.tipo}
                onChange={(e) => setForm({...form, tipo: e.target.value})}
              />
              <datalist id="list-tipos">
                {catalogues.tipos.map((t: string) => <option key={t} value={t} />)}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-5">
            <div className="col-span-1 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Modelo</label>
              <input 
                className="input-rubi py-2.5" 
                placeholder="Tsuru"
                list="list-modelos"
                value={form.modelo}
                onChange={(e) => setForm({...form, modelo: e.target.value})}
              />
              <datalist id="list-modelos">
                {catalogues.modelos.map((m: string) => <option key={m} value={m} />)}
              </datalist>
            </div>
            <div className="col-span-1 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Año Inicio (Opc)</label>
              <input 
                className="input-rubi py-2.5" 
                placeholder="1992"
                list="list-años"
                value={form.año_inicio}
                onChange={(e) => setForm({...form, año_inicio: e.target.value ? parseInt(e.target.value) : ''})}
              />
            </div>
            <div className="col-span-1 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Año Fin (Opc)</label>
              <input 
                className="input-rubi py-2.5" 
                placeholder="2017"
                list="list-años"
                value={form.año_fin}
                onChange={(e) => setForm({...form, año_fin: e.target.value ? parseInt(e.target.value) : ''})}
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
              onChange={(e) => setForm({...form, nombre: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Descripción Detallada (Ficha Técnica)</label>
            <textarea 
              rows={4}
              className="input-rubi py-2.5 min-h-[100px] resize-y" 
              placeholder="Ej: Balatas de cerámica de alta resistencia para Tsuru III. Incluye herrajes..."
              value={form.descripcion}
              onChange={(e) => setForm({...form, descripcion: e.target.value})}
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

    const { data: allOrders, error } = await query.limit(1000); 
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
    downloadCSV(header + rows, `pedido_${order.folio || order.id.slice(0,8)}.csv`);
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
    const tableColumn = ["SKU", "Producto", "Cantidad", "Precio Unitario", "Subtotal"];
    const tableRows = order.items.map((item: any) => [
      item.sku,
      item.nombre || 'N/A',
      item.cantidad.toString(),
      `$${item.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `$${(item.precio_unitario * item.cantidad).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 70,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85] }, // slate-700
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 70 },
        2: { halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'right' }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 70;
    
    // Total
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total del Pedido: $${order.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, finalY + 15);

    doc.save(`Pedido_${order.folio || order.id.slice(0,8)}.pdf`);
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
                      <p className="text-[10px] font-bold text-slate-500 line-clamp-1">{item.nombre || 'Sin nombre'}</p>
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

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monto Total</p>
                <p className="text-4xl font-black text-secondary tracking-tighter">${selectedOrder.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
