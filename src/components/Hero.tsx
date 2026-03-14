import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStore';

const Hero = () => {
  const config = useStore(state => state.config);
  const [activeImage, setActiveImage] = React.useState(0);

  React.useEffect(() => {
    if (config?.hero_images?.length > 1) {
      const timer = setInterval(() => {
        setActiveImage(prev => (prev + 1) % config.hero_images.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [config?.hero_images]);

  return (
    <div className="relative overflow-hidden bg-secondary py-20 lg:py-32">
      {/* Background patterns */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 skew-x-12 transform translate-x-20"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-left duration-1000">
            <div className="inline-flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-full border border-white/10">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              <span className="text-white text-xs font-bold uppercase tracking-widest">{config?.cms_version_text || 'Catálogo Disponible v2.0'}</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-black text-white leading-none tracking-tighter">
              {config?.hero_title_1 || 'LA PIEZA QUE'} <br />
              <span className="text-primary">{config?.hero_title_2 || 'TU MOTOR NECESITA'}</span>.
            </h1>
            
            <p className="text-slate-400 text-lg max-w-lg leading-relaxed whitespace-pre-line">
              {config?.hero_subtitle || 'Gestión profesional de refacciones para talleres y empresas. Búsqueda técnica instantánea y stock real garantizado.'}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#catalogo" className="btn-primary flex items-center justify-center space-x-2 group">
                <span>Explorar Catálogo</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </a>
              <a href="#nosotros" className="bg-white/5 text-white px-8 py-4 rounded-rubi font-bold border border-white/10 hover:bg-white/10 transition-colors text-center">
                Sobre Nosotros
              </a>
            </div>
          </div>
          
          <div className="relative mt-8 lg:mt-0">
             <div className="aspect-[4/3] sm:aspect-square bg-gradient-to-tr from-primary to-rose-500 rounded-[40px] sm:rounded-[80px] rotate-3 opacity-20 absolute inset-0"></div>
             <div className="aspect-[4/3] sm:aspect-square bg-slate-800 rounded-[40px] sm:rounded-[80px] -rotate-3 overflow-hidden border-4 border-white/10 relative group shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 z-10"></div>
                
                {config?.hero_images && config.hero_images.length > 0 ? (
                  <>
                    <img 
                       src={config.hero_images[activeImage]} 
                       className="w-full h-full object-cover animate-in fade-in zoom-in duration-700" 
                       alt="Hero Slider" 
                    />
                    {config.hero_images.length > 1 && (
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
                        {config.hero_images.map((_: any, i: number) => (
                          <button 
                            key={i} 
                            onClick={() => setActiveImage(i)}
                            className={`w-2 h-2 rounded-full transition-all ${i === activeImage ? 'bg-primary w-6' : 'bg-white/30'}`}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : config?.branding_images && config.branding_images.length > 0 ? (
                  <img 
                     src={config.branding_images[0]} 
                     className="w-full h-full object-cover" 
                     alt="Branding" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20 font-black text-7xl text-center px-6 uppercase">
                    {config?.abreviatura || config?.platform_name || 'TecnosisMX'}
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
