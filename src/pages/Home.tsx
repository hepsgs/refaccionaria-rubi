import { Warehouse, Clock, Settings2 } from 'lucide-react';
import Hero from '../components/Hero';
import Catalogue from '../components/Catalogue';
import { useStore } from '../store/useStore';

const Home = () => {
  const config = useStore(state => state.config);
  const stats = { products: '15K+', clients: '500+', years: '20+' };

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <Hero />

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { label: 'Refacciones en Stock', value: stats.products, icon: Warehouse },
            { label: 'Talleres Afiliados', value: stats.clients, icon: Settings2 },
            { label: 'Años de Experiencia', value: stats.years, icon: Clock },
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
            <div className="aspect-[4/3] bg-slate-200 rounded-rubi overflow-hidden">
               <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-400">
                 [Imagen Industrial Rubi]
               </div>
            </div>
            <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-primary rounded-rubi -z-10 opacity-10"></div>
          </div>
          <div className="space-y-6">
            <h2 className="text-4xl md:text-5xl font-black text-secondary leading-tight">
              {config?.about_title_1 || 'Respaldando tu industria con'} <span className="text-primary">{config?.about_title_2 || 'Precisión y Confianza'}</span>.
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed whitespace-pre-line">
              {config?.about_text || 'En Refaccionaria Rubi, nos especializamos en proveer soluciones integrales para el sector automotriz e industrial. Con una trayectoria sólida, hemos construido una plataforma diseñada para las necesidades reales de los expertos.'}
            </p>
            <ul className="space-y-3">
              {['Calidad certificada en cada pieza', 'Atención técnica personalizada', 'Entrega eficiente y garantizada'].map((item) => (
                <li key={item} className="flex items-center space-x-3 text-secondary font-semibold">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
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
