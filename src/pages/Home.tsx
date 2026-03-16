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
  Zap 
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { label: 'Refacciones en Stock', value: config?.stats_products || '15K+', icon: Warehouse },
            { label: 'Talleres Afiliados', value: config?.stats_clients || '500+', icon: Settings2 },
            { label: 'Años de Experiencia', value: config?.stats_years || '20+', icon: Clock },
          ].map((stat, i) => (
            <div key={i} className="card-rubi flex items-center space-x-6">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
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

      {/* About Us Section */}
      <section id="nosotros" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative">
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
            <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-primary rounded-rubi -z-10 opacity-10"></div>
          </div>
          <div className="space-y-6">
            <h2 className="text-4xl md:text-5xl font-black text-secondary leading-tight">
              {config?.about_title_1 || 'Respaldando tu industria con'} <span className="text-primary">{config?.about_title_2 || 'Precisión y Confianza'}</span>.
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed whitespace-pre-line">
              {config?.about_text || `En ${config?.platform_name || 'nuestra empresa'}, nos especializamos en proveer soluciones integrales para el sector automotriz e industrial. Con una trayectoria sólida, hemos construido una plataforma diseñada para las necesidades reales de los expertos.`}
            </p>
            <ul className="space-y-4">
              {(config?.about_features && config.about_features.length > 0) ? (
                config.about_features.map((feature: any, idx: number) => {
                  const Icon = IconMap[feature.icon] || CheckCircle2;
                  return (
                    <li key={idx} className="flex items-center space-x-4 text-secondary font-semibold group">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0 transition-transform group-hover:scale-110">
                        <Icon size={20} />
                      </div>
                      <span className="text-lg">{feature.text}</span>
                    </li>
                  );
                })
              ) : (
                ['Calidad certificada en cada pieza', 'Atención técnica personalizada', 'Entrega eficiente y garantizada'].map((item) => (
                  <li key={item} className="flex items-center space-x-3 text-secondary font-semibold">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>{item}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* Distributors Section */}
      <section className="bg-secondary py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-primary rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-in slide-in-from-left duration-700">
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
                  className="btn-primary py-4 px-10 shadow-xl shadow-primary/20 flex items-center space-x-3 group"
                >
                  <span className="font-black uppercase tracking-widest">{config?.distributors_cta_text || 'Regístrate'}</span>
                </Link>
              </div>
            </div>
            
            <div className="relative animate-in zoom-in duration-700 delay-100">
              <div className="aspect-[16/10] rounded-[30px] overflow-hidden shadow-2xl border-4 border-white/10 relative">
                {config?.distributors_image_url ? (
                  <img src={config.distributors_image_url} alt="Distribuidores" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                    <Warehouse size={120} className="text-slate-700 animate-pulse" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-secondary/60 to-transparent" />
              </div>
              
              {/* Floating Badge */}
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 hidden md:block animate-bounce duration-[3000ms]">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Socios Activos</p>
                <p className="text-3xl font-black text-secondary">{config?.stats_clients || '500+'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Catalogue Section */}
      <section id="catalogo" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24 space-y-12">
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
