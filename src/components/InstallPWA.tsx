import { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';
import { useStore } from '../store/useStore';

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'other'>('other');
  const { config } = useStore();

  useEffect(() => {
    // Detect platform
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isIOS) setPlatform('ios');
    else if (isAndroid) setPlatform('android');

    // Android: Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show if not already in standalone mode
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        setShowPrompt(true);
      }
    };

    // iOS: Check if already installed
    if (isIOS && !(window.navigator as any).standalone) {
      // Show prompt after a delay for better UX
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:left-8 md:right-auto md:max-w-sm w-auto z-[100] animate-in slide-in-from-bottom duration-500">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex items-center space-x-4 relative overflow-hidden">
        {/* Progress bar background for a premium feel */}
        <div className="absolute top-0 left-0 h-1 bg-primary/20 w-full" />
        
        <button 
          onClick={() => setShowPrompt(false)}
          className="absolute top-2 right-2 p-1 text-slate-300 hover:text-slate-500 rounded-full transition-colors"
        >
          <X size={16} />
        </button>

        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex-shrink-0 overflow-hidden border border-slate-100 flex items-center justify-center p-2">
          {config?.logo_url ? (
            <img src={config.logo_url} alt="Logo App" className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full bg-primary rounded-xl flex items-center justify-center text-white font-black text-xl">
              {config?.abreviatura?.charAt(0) || 'G'}
            </div>
          )}
        </div>

        <div className="flex-grow min-w-0">
          <h4 className="text-sm font-black text-secondary leading-tight uppercase truncate">
            {config?.platform_name || 'GML Importaciones'}
          </h4 >
          <p className="text-[10px] text-slate-400 font-medium leading-tight mt-1">
            {platform === 'ios' 
              ? 'Instala la app para un acceso más rápido.' 
              : 'Descarga nuestra app en tu pantalla de inicio.'}
          </p>
          
          {platform === 'ios' ? (
            <div className="flex items-center space-x-2 mt-2">
              <div className="flex items-center space-x-1 bg-slate-100 px-2 py-1 rounded-lg">
                <Share size={10} className="text-secondary" />
                <span className="text-[8px] font-bold text-secondary uppercase">Compartir</span>
              </div>
              <span className="text-[10px] text-slate-400">→</span>
              <div className="flex items-center space-x-1 bg-slate-100 px-2 py-1 rounded-lg">
                <PlusSquare size={10} className="text-secondary" />
                <span className="text-[8px] font-bold text-secondary uppercase">Añadir a Inicio</span>
              </div>
            </div>
          ) : (
            <button 
              onClick={handleInstallClick}
              className="mt-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl flex items-center space-x-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              <Download size={14} />
              <span>Instalar Aplicación</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstallPWA;
