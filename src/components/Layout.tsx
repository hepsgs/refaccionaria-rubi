import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, User, Menu, X, LogOut, Shield, Package, Plus, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isCartOpen, setIsCartOpen] = React.useState(false);
  const [orderSuccess, setOrderSuccess] = React.useState(false);
  const { profile, cart, updateQuantity, removeFromCart } = useStore();
  const location = useLocation();

  React.useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location]);

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
      
      const { error } = await supabase.from('pedidos').insert({
        cliente_id: profile.id,
        items: cart.map(i => ({ sku: i.sku, cantidad: i.cantidad, precio_unitario: i.precio })),
        total: total,
        estatus: 'pendiente'
      }).select().single();

      if (error) throw error;
      
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
              {useStore.getState().config?.logo_url ? (
                <img 
                  src={useStore.getState().config.logo_url} 
                  alt="Logo" 
                  className="h-12 w-auto object-contain"
                />
              ) : (
                <>
                  <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                    <span className="text-white font-black text-xl">R</span>
                  </div>
                  <div>
                    <span className="text-secondary font-black text-xl tracking-tighter block leading-none">RUBI</span>
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Refaccionaria</span>
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

      {/* Footer */}
      <footer className="bg-secondary text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-black">R</span>
                </div>
                <span className="font-black text-xl tracking-tighter">RUBI</span>
              </div>
              <p className="text-slate-400 max-w-sm">
                Líderes en refacciones industriales y automotrices. Más de 15,000 productos a tu disposición con la mejor calidad y servicio técnico.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Empresa</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#nosotros" className="hover:text-primary transition-colors">Sobre Nosotros</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contacto</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Aviso de Privacidad</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Contacto</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li>ventas@refaccionariarubi.com</li>
                <li>+52 (000) 000 0000</li>
                <li>Dirección de la empresa</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-800 text-center text-slate-500 text-xs">
            © {new Date().getFullYear()} Refaccionaria Rubi. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
