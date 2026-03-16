import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Warehouse, 
  Clock, 
  Settings2, 
  CheckCircle2, 
  MessageSquare, 
  Truck, 
  Star, 
  ShieldCheck, 
  Award, 
  Zap,
  Target,
  Eye,
  History,
  ChevronRight
} from 'lucide-react';
import Hero from '../components/Hero';
import Catalogue from '../components/Catalogue';
import { useStore } from '../store/useStore';

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

const Home = () => {
  const config = useStore(state => state.config);
  const [activeTab, setActiveTab] = useState<'historia' | 'mision' | 'vision'>('historia');
  const [currentAboutIndex, setCurrentAboutIndex] = useState(0);
  const aboutImages = config?.about_images || [];

  useEffect(() => {
    if (aboutImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentAboutIndex((prev) => (prev + 1) % aboutImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [aboutImages.length]);

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <Hero />

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 reveal reveal-up">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { label: 'Refacciones en Stock', value: config?.stats_products || '15K+', icon: Warehouse },
            { label: 'Talleres Afiliados', value: config?.stats_clients || '500+', icon: Settings2 },
            { label: 'Años de Experiencia', value: config?.stats_years || '20+', icon: Clock },
          ].map((stat, i) => (
            <div key={i} className="card-rubi flex items-center space-x-6 group">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500 hover-float">
                <stat.icon size={32} />
              </div>
              <div>
                <p className="text-3xl font-black text-secondary leading-tight">{stat.value}</p>
                <p className="text-slate-500 font-medium text-sm">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* About Us Section - Redesigned */}
      <section id="nosotros" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24 space-y-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Side: Original Image Carousel */}
          <div className="lg:col-span-5 relative reveal reveal-left">
            <div className="aspect-[4/3] bg-slate-100 rounded-rubi overflow-hidden shadow-2xl relative">
              {aboutImages.length > 0 ? (
                <>
                  {aboutImages.map((img: string, i: number) => (
                    <div
                      key={i}
                      className={`absolute inset-0 transition-opacity duration-1000 ${
                        i === currentAboutIndex ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      <img src={img} alt={`Nosotros ${i}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  
                  {aboutImages.length > 1 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
                      {aboutImages.map((_: any, i: number) => (
                        <button
                          key={i}
                          onClick={() => setCurrentAboutIndex(i)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            i === currentAboutIndex ? 'bg-primary w-8' : 'bg-white/50 hover:bg-white'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-400">
                  <Warehouse size={64} />
                </div>
              )}
            </div>
            <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-primary rounded-rubi -z-10 opacity-10 animate-pulse-subtle"></div>
          </div>

          {/* Right Side: Content with Tabs */}
          <div className="lg:col-span-7 space-y-8 reveal reveal-right">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-black text-secondary leading-tight uppercase tracking-tighter">
                {config?.about_title_1 || 'Respaldando tu industria con'} <br />
                <span className="text-primary">{config?.about_title_2 || 'Precisión y Confianza'}</span>
              </h2>
              <div className="w-20 h-2 bg-primary rounded-full animate-marquee" style={{ width: '80px', animation: 'none' }} />
              <div className="w-20 h-2 bg-primary rounded-full" />
            </div>

            {/* Tabs Trigger */}
            <div className="flex p-1.5 bg-slate-100 rounded-2xl w-max overflow-x-auto max-w-full">
              {[
                { id: 'historia', label: 'Historia', icon: History },
                { id: 'mision', label: 'Misión', icon: Target },
                { id: 'vision', label: 'Visión', icon: Eye },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold transition-all duration-300 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-white text-secondary shadow-lg scale-105'
                      : 'text-slate-400 hover:text-secondary'
                  }`}
                >
                  <tab.icon size={16} className={activeTab === tab.id ? 'animate-float' : ''} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[200px] relative">
              <div className={`transition-all duration-500 ${activeTab === 'historia' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 absolute inset-0 pointer-events-none'}`}>
                <p className="text-slate-600 text-lg leading-relaxed whitespace-pre-line">
                  {config?.about_text || `En ${config?.platform_name || 'nuestra empresa'}, nos especializamos en proveer soluciones integrales para el sector automotriz e industrial.`}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {(config?.about_features || []).slice(0, 4).map((f: any, i: number) => {
                    const Icon = IconMap[f.icon] || CheckCircle2;
                    return (
                      <div key={i} className="flex items-center space-x-3 text-secondary font-bold text-sm bg-white p-3 rounded-2xl shadow-sm border border-slate-50 hover-float">
                        <div className="p-2 bg-primary/5 rounded-lg text-primary"><Icon size={14} /></div>
                        <span>{f.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`transition-all duration-500 ${activeTab === 'mision' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 absolute inset-0 pointer-events-none'}`}>
                <div className="bg-primary/5 p-8 rounded-[32px] border border-primary/10 shadow-inner">
                  <p className="text-secondary text-xl font-medium leading-relaxed italic">
                    "{config?.about_mision || 'Escribe aquí la misión de tu empresa...'}"
                  </p>
                </div>
              </div>

              <div className={`transition-all duration-500 ${activeTab === 'vision' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 absolute inset-0 pointer-events-none'}`}>
                <div className="bg-secondary p-8 rounded-[32px] shadow-2xl relative overflow-hidden group">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-all duration-1000" />
                  <p className="text-white text-xl font-medium leading-relaxed relative z-10">
                    {config?.about_vision || 'Escribe aquí la visión de tu empresa...'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Our Values */}
        {config?.about_valores && config.about_valores.length > 0 && (
          <div className="space-y-10 reveal reveal-up">
            <div className="text-center space-y-2">
              <h3 className="text-sm font-black text-primary uppercase tracking-[0.3em]">Nuestros Cimientos</h3>
              <p className="text-3xl font-black text-secondary">Valores que nos Definen</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.isArray(config.about_valores) && config.about_valores.map((valor: any, idx: number) => {
                const Icon = IconMap[valor.icon] || Star;
                return (
                  <div key={idx} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-soft hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group reveal reveal-up" style={{ transitionDelay: `${idx * 100}ms` }}>
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-500">
                      <Icon size={28} className="group-hover:animate-float" />
                    </div>
                    <h4 className="text-xl font-black text-secondary mb-3">{valor.title}</h4>
                    <p className="text-slate-500 leading-relaxed text-sm">
                      {valor.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Distributors Section */}
      <section className="bg-secondary py-20 relative overflow-hidden reveal">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-primary rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl animate-pulse-subtle" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary rounded-full translate-x-1/2 translate-y-1/2 blur-3xl animate-pulse-subtle" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 reveal reveal-left">
              <h2 className="text-4xl md:text-6xl font-black text-white leading-tight">
                {config?.distributors_title_1 || '¿Quieres unirte a nuestro'} <br />
                <span className="text-primary">{config?.distributors_title_2 || 'Grupo de Distribuidores?'}</span>
              </h2>
              <p className="text-slate-300 text-lg leading-relaxed max-w-xl">
                {config?.distributors_text || 'Ofrecemos beneficios exclusivos para socios comerciales, talleres y empresas del sector automotriz. Accede a precios preferenciales, stock garantizado y soporte técnico prioritario.'}
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <Link 
                  to="/register"
                  className="btn-primary py-4 px-10 shadow-xl shadow-primary/20 flex items-center space-x-3 group active:scale-95"
                >
                  <span className="font-black uppercase tracking-widest">{config?.distributors_cta_text || 'Regístrate'}</span>
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
            
            <div className="relative reveal reveal-right">
              <div className="aspect-[16/10] rounded-[30px] overflow-hidden shadow-2xl border-4 border-white/10 relative group">
                {config?.distributors_image_url ? (
                  <img src={config.distributors_image_url} alt="Distribuidores" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                    <Warehouse size={120} className="text-slate-700 animate-pulse" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-secondary/60 to-transparent opacity-60" />
              </div>
              
              {/* Floating Badge */}
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 hidden md:block animate-float">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Socios Activos</p>
                <p className="text-3xl font-black text-secondary">{config?.stats_clients || '500+'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Catalogue Section */}
      <section id="catalogo" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24 space-y-12 reveal reveal-up">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h2 className="text-4xl font-black text-secondary">Nuestro Catálogo</h2>
          <p className="text-slate-500">Busca entre miles de refacciones por número de parte o especificaciones técnicas del vehículo.</p>
        </div>
        
        <Catalogue />
      </section>
    </div>
  );
};

export default Home;
