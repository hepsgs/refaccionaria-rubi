import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, User, Menu, X, LogOut, Shield, Package, Plus, CheckCircle2, MessageCircle, ArrowUp } from 'lucide-react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isCartOpen, setIsCartOpen] = React.useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = React.useState(false);
  const [isTermsOpen, setIsTermsOpen] = React.useState(false);
  const [orderSuccess, setOrderSuccess] = React.useState(false);
  const [showScrollTop, setShowScrollTop] = React.useState(false);
  const { profile, cart, updateQuantity, removeFromCart, config } = useStore();
  const location = useLocation();

  React.useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  React.useEffect(() => {
    if (location.hash) {
      const id = location.hash.substring(1);
      if (id === 'privacidad') {
        setIsPrivacyOpen(true);
        return;
      }
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location]);

  // Handle dynamic document title and favicon
  React.useEffect(() => {
    if (config?.platform_name) {
      document.title = config.platform_name;
    }
    
    if (config?.favicon_url) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = config.favicon_url;
    }
  }, [config]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleCheckout = async () => {
    if (!profile) {
      alert('Por favor inicia sesión para realizar pedidos.');
      return;
    }
    
    if (cart.length === 0) return;

    try {
      const total = cart.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
      
      const { data: orderData, error } = await supabase.from('pedidos').insert({
        cliente_id: profile.id,
        items: cart.map(i => ({ sku: i.sku, cantidad: i.cantidad, precio_unitario: i.precio })),
        total: total,
        estatus: 'pendiente'
      }).select().single();

      if (error) throw error;

      // Send confirmation email asynchronously
      if (orderData?.id) {
        supabase.functions.invoke('send-order-confirmation', {
          body: { order_id: orderData.id }
        }).catch(err => console.error('Error sending confirmation email:', err));
      }
      
      setOrderSuccess(true);
      // Clear cart
      cart.forEach(item => removeFromCart(item.id));
      setIsCartOpen(false);
    } catch (error: any) {
      console.error('Error:', error);
      alert('Error al procesar el pedido: ' + error.message);
    }
  };

  const navLinks = [
    { name: 'Inicio', path: '/' },
    { name: 'Catálogo', path: '/', hash: '#catalogo' }, // Home and scroll
    { name: 'Nosotros', path: '/', hash: '#nosotros' },
  ];

  const cartCount = cart.reduce((acc, item) => acc + item.cantidad, 0);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <Link to="/" className="flex items-center space-x-2">
              {config?.logo_url ? (
                <img 
                  src={config.logo_url} 
                  alt="Logo" 
                  className="h-12 w-auto object-contain"
                />
              ) : (
                <>
                  <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                    <span className="text-white font-black text-xl">
                      {config?.abreviatura?.charAt(0) || config?.platform_name?.charAt(0) || 'R'}
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary font-black text-xl tracking-tighter block leading-none">
                      {config?.abreviatura || config?.platform_name?.toUpperCase() || 'TECNOSISMX'}
                    </span>
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{config?.abreviatura ? 'Refaccionaria' : 'Soluciones'}</span>
                  </div>
                </>
              )}
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path + (link.hash || '')}
                  className="text-secondary font-medium hover:text-primary transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Actions */}
            <div className="hidden md:flex items-center space-x-4">
              {profile?.es_admin && (
                <Link to="/admin" className="p-2 text-secondary hover:text-primary transition-colors" title="Panel Admin">
                  <Shield size={24} />
                </Link>
              )}
              <div 
                className="relative cursor-pointer p-2 group" 
                onClick={() => setIsCartOpen(true)}
              >
                <ShoppingCart className="text-secondary group-hover:text-primary transition-colors" size={24} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                    {cartCount}
                  </span>
                )}
              </div>
              {profile ? (
                <div className="flex items-center space-x-4">
                  <Link to="/perfil" className="flex items-center space-x-3 group">
                    <div className="text-right">
                      <p className="text-xs font-bold text-secondary leading-none group-hover:text-primary transition-colors">{profile.nombre_completo}</p>
                      <p className="text-[10px] text-slate-400 uppercase">{profile.empresa}</p>
                    </div>
                    <div className="p-2 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-primary/10 group-hover:text-primary transition-all">
                      <User size={18} />
                    </div>
                  </Link>
                  <div className="w-px h-8 bg-slate-100 mx-2" />
                  <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                    <LogOut size={20} />
                  </button>
                </div>
              ) : (
                <Link to="/login" className="btn-primary py-2 px-6 flex items-center space-x-2">
                  <User size={18} />
                  <span>Acceder</span>
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-secondary">
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-100 p-4 space-y-4 shadow-xl">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path + (link.hash || '')}
                className="block text-secondary font-medium px-4 py-2 hover:bg-slate-50 rounded-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-4 border-t border-slate-100 flex flex-col space-y-3">
              {!profile && (
                <Link to="/login" className="btn-primary text-center">Acceder</Link>
              )}
              {profile?.es_admin && (
                <Link to="/admin" className="btn-secondary text-center">Panel Admin</Link>
              )}
              <button 
                onClick={() => { setIsCartOpen(true); setIsMenuOpen(false); }}
                className="btn-secondary flex items-center justify-center space-x-2"
              >
                <ShoppingCart size={20} />
                <span>Carrito ({cartCount})</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Cart Drawer */}
      <div 
        className={`fixed inset-0 z-[100] transition-opacity duration-300 ${isCartOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <div className="absolute inset-0 bg-secondary/40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
        <div 
          className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl transition-transform duration-500 transform ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <ShoppingCart size={20} />
                </div>
                <div>
                  <h3 className="font-black text-secondary uppercase tracking-tight">Tu Pedido</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{cartCount} Artículos</p>
                </div>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 space-y-6">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                    <ShoppingCart size={40} />
                  </div>
                  <p className="text-slate-500 font-medium">Tu carrito está vacío</p>
                  <button onClick={() => setIsCartOpen(false)} className="btn-secondary px-6">Ver catálogo</button>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex space-x-4 group animate-in slide-in-from-right-4 duration-300">
                    <div className="w-20 h-20 bg-slate-50 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-100">
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Package size={24} />
                      </div>
                    </div>
                    <div className="flex-grow space-y-1">
                      <p className="text-[10px] font-bold text-primary tracking-widest uppercase">{item.sku}</p>
                      <h4 className="text-sm font-bold text-secondary leading-tight line-clamp-2">{item.nombre}</h4>
                      <p className="text-sm font-black text-secondary">${item.precio}</p>
                      
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center border border-slate-100 rounded-lg p-1">
                          <button 
                            onClick={() => updateQuantity(item.id, item.cantidad - 1)}
                            className="w-6 h-6 flex items-center justify-center hover:bg-slate-50 rounded-md transition-colors"
                          >
                            <span className="text-slate-400">-</span>
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-secondary">{item.cantidad}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.cantidad + 1)}
                            className="w-6 h-6 flex items-center justify-center hover:bg-slate-50 rounded-md transition-colors"
                          >
                            <span className="text-slate-400">+</span>
                          </button>
                        </div>
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="text-[10px] font-bold text-rose-400 hover:text-rose-500 uppercase tracking-widest px-2"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Estimado</p>
                    <p className="text-3xl font-black text-secondary leading-none">
                      ${cart.reduce((acc, item) => acc + item.precio * item.cantidad, 0)}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleCheckout}
                  className="w-full btn-primary py-4 flex items-center justify-center space-x-3 shadow-xl shadow-primary/20 group"
                >
                  <span className="font-black uppercase tracking-widest text-sm">Generar Orden</span>
                  <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cart Drawer */}
      <div 
        className={`fixed inset-0 z-[100] transition-opacity duration-300 ${isCartOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <div className="absolute inset-0 bg-secondary/40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
        <div 
          className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl transition-transform duration-500 transform ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <ShoppingCart size={20} />
                </div>
                <div>
                  <h3 className="font-black text-secondary uppercase tracking-tight">Tu Pedido</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{cartCount} Artículos</p>
                </div>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 space-y-6">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                    <ShoppingCart size={40} />
                  </div>
                  <p className="text-slate-500 font-medium">Tu carrito está vacío</p>
                  <button onClick={() => setIsCartOpen(false)} className="btn-secondary px-6">Ver catálogo</button>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex space-x-4 group animate-in slide-in-from-right-4 duration-300">
                    <div className="w-20 h-20 bg-slate-50 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-100">
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Package size={24} />
                      </div>
                    </div>
                    <div className="flex-grow space-y-1">
                      <p className="text-[10px] font-bold text-primary tracking-widest uppercase">{item.sku}</p>
                      <h4 className="text-sm font-bold text-secondary leading-tight line-clamp-2">{item.nombre}</h4>
                      <p className="text-sm font-black text-secondary">${item.precio}</p>
                      
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center border border-slate-100 rounded-lg p-1">
                          <button 
                            onClick={() => updateQuantity(item.id, item.cantidad - 1)}
                            className="w-6 h-6 flex items-center justify-center hover:bg-slate-50 rounded-md transition-colors"
                          >
                            <span className="text-slate-400">-</span>
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-secondary">{item.cantidad}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.cantidad + 1)}
                            className="w-6 h-6 flex items-center justify-center hover:bg-slate-50 rounded-md transition-colors"
                          >
                            <span className="text-slate-400">+</span>
                          </button>
                        </div>
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="text-[10px] font-bold text-rose-400 hover:text-rose-500 uppercase tracking-widest px-2"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Estimado</p>
                    <p className="text-3xl font-black text-secondary leading-none">
                      ${cart.reduce((acc, item) => acc + item.precio * item.cantidad, 0)}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleCheckout}
                  className="w-full btn-primary py-4 flex items-center justify-center space-x-3 shadow-xl shadow-primary/20 group"
                >
                  <span className="font-black uppercase tracking-widest text-sm">Generar Orden</span>
                  <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Success Modal */}
      {orderSuccess && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-secondary/60 backdrop-blur-md" onClick={() => setOrderSuccess(false)} />
          <div className="bg-white rounded-[40px] p-12 max-w-sm w-full text-center shadow-2xl relative animate-in zoom-in duration-300">
            <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <CheckCircle2 size={48} />
            </div>
            <h3 className="text-3xl font-black text-secondary uppercase tracking-tight mb-2">¡Pedido Generado!</h3>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
              Tu pedido ha sido registrado con éxito. Te contactaremos pronto para la entrega.
            </p>
            <button 
              onClick={() => setOrderSuccess(false)}
              className="w-full btn-primary py-4 rounded-2xl shadow-xl shadow-primary/20"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Floating Buttons */}
      <div className="fixed bottom-8 right-8 z-[60] flex flex-col space-y-4">
        {showScrollTop && (
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-14 h-14 bg-white text-secondary rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all border border-slate-100 group"
          >
            <ArrowUp size={24} className="group-hover:-translate-y-1 transition-transform" />
          </button>
        )}
        <a 
          href={`https://wa.me/${config?.whatsapp_number || '5212345678'}?text=${encodeURIComponent(config?.whatsapp_message || 'Hola, me gustaría más información.')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-14 h-14 bg-[#25D366] text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
        >
          <MessageCircle size={32} />
        </a>
      </div>

      {/* Privacy Modal */}
      {isPrivacyOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-secondary/60 backdrop-blur-md" onClick={() => setIsPrivacyOpen(false)} />
          <div className="bg-white rounded-[40px] w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl relative animate-in zoom-in duration-300 flex flex-col">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-2xl font-black text-secondary uppercase tracking-tight">Aviso de Privacidad</h3>
              <button onClick={() => setIsPrivacyOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            <div className="p-10 overflow-y-auto text-slate-600 leading-relaxed whitespace-pre-line text-sm">
              {config?.privacy_policy || 'Contenido legal no configurado todavía.'}
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
              <button 
                onClick={() => setIsPrivacyOpen(false)}
                className="btn-primary py-3 px-12 rounded-2xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terms Modal */}
      {isTermsOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-secondary/60 backdrop-blur-md" onClick={() => setIsTermsOpen(false)} />
          <div className="bg-white rounded-[40px] w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl relative animate-in zoom-in duration-300 flex flex-col">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-2xl font-black text-secondary uppercase tracking-tight">Términos y Condiciones</h3>
              <button onClick={() => setIsTermsOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            <div className="p-10 overflow-y-auto text-slate-600 leading-relaxed whitespace-pre-line text-sm">
              {config?.terms_conditions || 'Contenido legal no configurado todavía.'}
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
              <button 
                onClick={() => setIsTermsOpen(false)}
                className="btn-primary py-3 px-12 rounded-2xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Allied Brands Slider */}
      {config?.branding_images && config.branding_images.length > 0 && (
        <section className="bg-white py-12 border-t border-slate-50 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Nuestras Marcas Aliadas</p>
          </div>
          <div className="flex animate-marquee">
            <div className="flex items-center gap-12 px-6 flex-none min-w-max">
              {config.branding_images.map((img: string, i: number) => (
                <img key={i} src={img} alt={`Marca ${i}`} className="h-24 w-auto grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all object-contain flex-none" />
              ))}
            </div>
            <div className="flex items-center gap-12 px-6 flex-none min-w-max">
              {config.branding_images.map((img: string, i: number) => (
                <img key={`dup-${i}`} src={img} alt={`Marca Dup ${i}`} className="h-24 w-auto grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all object-contain flex-none" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-secondary text-white py-12 mt-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <Link to="/" className="flex items-center space-x-3 mb-6">
                {config?.logo_url ? (
                  <img 
                    src={config.logo_url} 
                    alt="Logo Footer" 
                    className="h-16 w-auto object-contain" 
                  />
                ) : (
                  <span className="text-white font-black text-2xl tracking-tighter block leading-none">
                    {config?.abreviatura || config?.platform_name?.toUpperCase() || 'TECNOSISMX'}
                  </span>
                )}
              </Link>
              <p className="text-slate-400 max-w-sm text-sm">
                {config?.footer_description || 'Líderes en soluciones industriales y automotrices.'}
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white">Empresa</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link to="/#nosotros" className="hover:text-primary transition-colors">Sobre Nosotros</Link></li>
                <li><Link to="/#contacto" className="hover:text-primary transition-colors">Contacto</Link></li>
                <li><button onClick={() => setIsPrivacyOpen(true)} className="hover:text-primary transition-colors text-left">Aviso de Privacidad</button></li>
                <li><button onClick={() => setIsTermsOpen(true)} className="hover:text-primary transition-colors text-left">Términos y Condiciones</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white">Contacto</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li className="flex items-center space-x-2">
                  <span>{config?.footer_contact_email}</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span>{config?.footer_contact_phone}</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="line-clamp-2">{config?.footer_contact_address}</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center text-slate-500 text-xs text-center md:text-left">
            <p>© {new Date().getFullYear()} {config?.platform_name}. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
