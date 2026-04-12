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
          <div className="space-y-8 reveal reveal-left">
            <div className="inline-flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-full border border-white/10 hover:bg-white/20 transition-all cursor-default">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              <span className="text-white text-xs font-bold uppercase tracking-widest">{config?.cms_version_text || 'Catálogo Disponible v2.0'}</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-black text-white leading-none tracking-tighter">
              {config?.hero_title_1 || 'LA PIEZA QUE'} <br />
              <span className="text-primary">{config?.hero_title_2 || 'TU MOTOR NECESITA'}</span>.
            </h1>
            
            <p className="text-slate-400 text-lg max-w-lg leading-relaxed whitespace-pre-line font-medium">
              {config?.hero_subtitle || 'Gestión profesional de refacciones para talleres y empresas. Búsqueda técnica instantánea y stock real garantizado.'}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#catalogo" className="btn-primary flex items-center justify-center space-x-2 group active:scale-95 shadow-xl shadow-primary/20">
                <span>Explorar Catálogo</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </a>
              <a href="#nosotros" className="bg-white/5 text-white px-8 py-4 rounded-rubi font-bold border border-white/10 hover:bg-white/10 transition-all text-center hover-float">
                Sobre Nosotros
              </a>
            </div>
          </div>
          
          <div className="relative mt-8 lg:mt-0 reveal reveal-right group">
             {/* Decorative base with pulse */}
             <div className="aspect-[4/3] sm:aspect-square bg-gradient-to-tr from-primary/30 to-rose-500/30 rounded-[40px] sm:rounded-[80px] rotate-3 absolute inset-0 animate-pulse-subtle blur-2xl"></div>
             
             {/* Main Image Container */}
             <div className="aspect-[4/3] sm:aspect-square bg-slate-900 rounded-[40px] sm:rounded-[80px] -rotate-2 overflow-hidden border-2 border-white/10 relative shadow-2xl transition-all duration-700 hover:rotate-0 hover:scale-[1.02]">
                
                {/* Shine Animation Overlay */}
                <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
                  <div className="absolute top-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:animate-[shine_1.5s_ease-in-out_infinite] animate-[shine_4s_ease-in-out_infinite]" 
                       style={{ animationDelay: '2s' }} />
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                
                {config?.hero_images && config.hero_images.length > 0 ? (
                  <div className="relative w-full h-full">
                    {/* Blurred Background Layer (Premium fix for different aspect ratios) */}
                    <img 
                       src={config.hero_images[activeImage]} 
                       className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110 transition-opacity duration-1000" 
                       alt="" 
                    />
                    
                    {/* Main Image with Cross-fade */}
                    {config.hero_images.map((img: string, idx: number) => (
                      <img 
                        key={idx}
                        src={img} 
                        className={`absolute inset-0 w-full h-full object-contain p-4 transition-all duration-1000 ease-in-out ${
                          idx === activeImage ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
                        }`}
                        alt={`Hero Slide ${idx}`} 
                      />
                    ))}

                    {/* Indicators */}
                    {config.hero_images.length > 1 && (
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
                        {config.hero_images.map((_: any, i: number) => (
                          <button 
                            key={i} 
                            onClick={(e) => {
                              e.preventDefault();
                              setActiveImage(i);
                            }}
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                              i === activeImage ? 'bg-primary w-8' : 'bg-white/20 hover:bg-white/40 w-1.5'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900">
                    <div className="text-white/10 font-black text-6xl text-center px-6 uppercase tracking-tighter">
                      {config?.abreviatura || config?.platform_name || 'TecnosisMX'}
                    </div>
                  </div>
                )}
             </div>
             
             {/* Floating decorative elements */}
             <div className="absolute -top-4 -right-4 w-12 h-12 bg-primary rounded-full blur-xl animate-pulse delay-700" />
             <div className="absolute -bottom-8 -left-8 w-16 h-16 bg-rose-600/20 rounded-full blur-2xl animate-float" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
