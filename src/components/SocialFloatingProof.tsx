import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { X, ShoppingBag, Eye, Package } from 'lucide-react';

const SocialFloatingProof = () => {
  const { config } = useStore();
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [viewers, setViewers] = useState(5);
  const [lastTime, setLastTime] = useState(2);
  const [activeType, setActiveType] = useState<'viewing' | 'purchasing'>('viewing');
  
  const mainTimeoutRef = useRef<any>(null);
  const hideTimeoutRef = useRef<any>(null);
  const cycleIndexRef = useRef(0);

  const clearAllTimeouts = () => {
    if (mainTimeoutRef.current) {
      clearTimeout(mainTimeoutRef.current);
      mainTimeoutRef.current = null;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const fetchProducts = useCallback(async () => {
    if (!config?.social_proof_enabled) return;

    let query = supabase.from('productos').select('id, nombre, imagenes, sku, es_destacado, en_social_proof');
    
    if (config.social_proof_mode === 'manual') {
      query = query.eq('en_social_proof', true);
    }

    const { data } = await query.limit(50);
    
    if (data && data.length > 0) {
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      setProducts(shuffled);
    }
  }, [config?.social_proof_enabled, config?.social_proof_mode]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (!config?.social_proof_enabled || products.length === 0) {
      setIsVisible(false);
      clearAllTimeouts();
      return;
    }

    const scheduleNext = (delay: number) => {
      clearAllTimeouts();
      mainTimeoutRef.current = setTimeout(showNext, delay);
    };

    const showNext = () => {
      if (!products.length) return;
      
      const product = products[cycleIndexRef.current % products.length];
      setCurrentProduct(product);
      
      const contentType = config.social_proof_content_type || 'viewing';
      let type: 'viewing' | 'purchasing' = 'viewing';
      
      if (contentType === 'purchasing') {
        type = 'purchasing';
      } else if (contentType === 'mixed') {
        type = Math.random() > 0.5 ? 'viewing' : 'purchasing';
      }
      
      setActiveType(type);
      
      if (type === 'viewing') {
        setViewers(Math.floor(Math.random() * 12) + 3);
        setLastTime(Math.floor(Math.random() * 45) + 2);
      } else {
        setViewers(Math.floor(Math.random() * 3) + 1);
        setLastTime(Math.floor(Math.random() * 120) + 5);
      }
      
      setIsVisible(true);
      cycleIndexRef.current++;

      // Duration: 6 seconds
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        
        // INTERVAL CALCULATION:
        // Ensures the next one starts after the configured quiet time
        const min = Number(config.social_proof_min_interval || 10);
        const max = Number(config.social_proof_max_interval || 30);
        const range = Math.max(1, max - min);
        const nextIntervalSeconds = Math.floor(Math.random() * range) + min;
        
        scheduleNext(nextIntervalSeconds * 1000);
      }, 6000);
    };

    // Start loop with a small initial delay
    scheduleNext(2000);

    return () => clearAllTimeouts();
  }, [
    config?.social_proof_enabled, 
    config?.social_proof_min_interval, 
    config?.social_proof_max_interval,
    config?.social_proof_content_type,
    products
  ]);

  if (!config?.social_proof_enabled || !currentProduct) return null;

  return (
    <div 
      className={`fixed bottom-6 left-6 z-[9999] max-w-[320px] transition-all duration-700 ease-out transform ${
        isVisible 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-12 opacity-0 pointer-events-none'
      }`}
    >
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-3 shadow-2xl border border-slate-100 flex items-center space-x-4 pr-10 relative overflow-hidden group">
        <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-12 -mt-12 transition-transform duration-1000 group-hover:scale-150 ${
          activeType === 'viewing' ? 'bg-primary/5' : 'bg-green-500/5'
        }`}></div>
        
        <button 
          onClick={() => {
            setIsVisible(false);
            clearAllTimeouts();
            // Restart cycle after a delay
            mainTimeoutRef.current = setTimeout(() => {
               // Logic to restart could go here if we wanted manual close to just skip the current item
            }, 5000);
          }}
          className="absolute top-2 right-2 p-1 text-slate-300 hover:text-slate-500 transition-colors z-10"
        >
          <X size={14} />
        </button>

        {config.social_proof_show_image && (
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0 shadow-sm relative">
            {currentProduct.imagenes?.[0] ? (
              <img 
                src={currentProduct.imagenes[0]} 
                alt={currentProduct.nombre} 
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-200 uppercase font-black text-[10px]">
                {currentProduct.sku?.substring(0, 3)}
              </div>
            )}
            
            <div className={`absolute -bottom-1 -right-1 bg-white p-1 rounded-lg border border-slate-100 shadow-sm`}>
              {activeType === 'viewing' ? (
                <Eye size={10} className="text-secondary" />
              ) : (
                <ShoppingBag size={10} className="text-green-600" />
              )}
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center space-x-1.5 mb-1">
            <div className="flex -space-x-1">
              {[1, 2, 3].map(i => (
                <div key={i} className={`w-2 h-2 rounded-full border border-white ring-1 ${
                  activeType === 'viewing' 
                    ? (i === 1 ? 'bg-primary ring-primary/20' : i === 2 ? 'bg-blue-400 ring-blue-400/20' : 'bg-indigo-400 ring-indigo-400/20')
                    : (i === 1 ? 'bg-green-500 ring-green-500/20' : i === 2 ? 'bg-emerald-400 ring-emerald-400/20' : 'bg-teal-400 ring-teal-400/20')
                }`}></div>
              ))}
            </div>
            <span className={`text-[9px] font-black uppercase tracking-wider ${
              activeType === 'viewing' ? 'text-primary' : 'text-green-600'
            }`}>
              {activeType === 'viewing' ? `${viewers} clientes viendo` : `${viewers} compraron hoy`}
            </span>
          </div>
          
          <h4 className="text-xs font-bold text-secondary truncate leading-tight group-hover:text-primary transition-colors">
            {currentProduct.nombre}
          </h4>
          
          <div className="flex items-center space-x-2 mt-1.5">
            <div className="flex items-center text-[10px] text-slate-500 font-medium whitespace-nowrap">
              {activeType === 'viewing' ? <Eye size={10} className="mr-1 text-slate-400" /> : <Package size={10} className="mr-1 text-slate-400" />}
              <span>{activeType === 'viewing' ? 'Visto hace' : 'Vendido hace'} {lastTime} min</span>
            </div>
            <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
            <span className={`text-[10px] font-black uppercase tracking-tighter ${
              activeType === 'viewing' ? 'text-primary' : 'text-green-600'
            }`}>
              {activeType === 'viewing' ? 'Popular' : 'Reciente'}
            </span>
          </div>
        </div>

        <div 
          className={`absolute bottom-0 left-0 h-0.5 transition-all duration-[6000ms] ease-linear rounded-full ${
            activeType === 'viewing' ? 'bg-gradient-to-r from-primary to-blue-500' : 'bg-gradient-to-r from-green-500 to-teal-500'
          }`}
          style={{ width: isVisible ? '100%' : '0%' }}
        ></div>
      </div>
    </div>
  );
};

export default SocialFloatingProof;
