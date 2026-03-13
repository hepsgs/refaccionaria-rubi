import React from 'react';
import { ArrowRight } from 'lucide-react';

const Hero = () => {
  return (
    <div className="relative overflow-hidden bg-secondary py-20 lg:py-32">
      {/* Background patterns */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 skew-x-12 transform translate-x-20"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-left duration-1000">
            <div className="inline-flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-full border border-white/10">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              <span className="text-white text-xs font-bold uppercase tracking-widest">Catálogo Disponible v2.0</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-black text-white leading-none tracking-tighter">
              LA PIEZA QUE <br />
              <span className="text-primary">TU MOTOR NECESITA</span>.
            </h1>
            
            <p className="text-slate-400 text-lg max-w-lg leading-relaxed">
              Gestión profesional de refacciones para talleres y empresas. Búsqueda técnica instantánea y stock real garantizado.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#catalogo" className="btn-primary flex items-center justify-center space-x-2 group">
                <span>Explorar Catálogo</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </a>
              <button className="bg-white/5 text-white px-8 py-4 rounded-rubi font-bold border border-white/10 hover:bg-white/10 transition-colors">
                Sobre Nosotros
              </button>
            </div>
          </div>
          
          <div className="hidden lg:block relative">
             <div className="aspect-square bg-gradient-to-tr from-primary to-rose-500 rounded-[80px] rotate-3 opacity-20 absolute inset-0"></div>
             <div className="aspect-square bg-slate-800 rounded-[80px] -rotate-3 overflow-hidden border-4 border-white/10 relative">
               <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60"></div>
               <div className="w-full h-full flex items-center justify-center text-white/20 font-black text-9xl">
                 RUBI
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
