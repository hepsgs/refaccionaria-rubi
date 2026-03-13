import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, User, Menu, X, LogOut, Shield } from 'lucide-react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const { profile, cart } = useStore();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleCheckout = async () => {
    if (!profile) {
      alert('Por favor inicia sesión para realizar pedidos.');
      return;
    }
    
    if (cart.length === 0) return;

    const total = cart.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    
    const { data, error } = await supabase.from('pedidos').insert({
      cliente_id: profile.id,
      items: cart.map(i => ({ sku: i.sku, cantidad: i.cantidad, precio_unitario: i.precio })),
      total: total,
      estatus: 'pendiente'
    }).select().single();

    if (!error) {
      alert(`¡Pedido #${data.id.slice(0,8)} realizado con éxito!`);
      useStore.getState().clearCart();
    } else {
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
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <span className="text-white font-black text-xl">R</span>
              </div>
              <div>
                <span className="text-secondary font-black text-xl tracking-tighter block leading-none">RUBI</span>
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Refaccionaria</span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
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
              <div className="relative cursor-pointer p-2 group" onClick={handleCheckout}>
                <ShoppingCart className="text-secondary group-hover:text-primary transition-colors" size={24} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                    {cartCount}
                  </span>
                )}
              </div>
              {profile ? (
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-xs font-bold text-secondary leading-none">{profile.nombre_completo}</p>
                    <p className="text-[10px] text-slate-400 uppercase">{profile.empresa}</p>
                  </div>
                  <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-primary transition-colors">
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
                to={link.path}
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
            </div>
          </div>
        )}
      </nav>

      {/* Content */}
      <main className="flex-grow">
        {children}
      </main>

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
