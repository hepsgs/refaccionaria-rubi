import { useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useStore } from './store/useStore';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import ResetPassword from './pages/ResetPassword';

function App() {
  const { setProfile, setConfig } = useStore();

  const fetchConfig = useCallback(async () => {
    const { data } = await supabase.from('configuracion').select('*').single();
    if (data) setConfig(data);
  }, [setConfig]);

  const fetchProfile = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', uid)
      .single();
    
    if (data && !error) {
      setProfile(data);
    }
  }, [setProfile]);

  useEffect(() => {
    fetchConfig();

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, fetchConfig, setProfile]);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/restablecer-password" element={<ResetPassword />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
