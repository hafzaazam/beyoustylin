import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Favorite {
  id: string;
  service_id: string | null;
  deal_id: string | null;
  created_at: string;
}

export const useFavorites = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setFavorites([]); setLoading(false); return; }
    const { data } = await supabase.from('favorites').select('*').eq('user_id', user.id);
    setFavorites((data || []) as Favorite[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const isFavorite = (type: 'service' | 'deal', id: string) =>
    favorites.some(f => (type === 'service' ? f.service_id === id : f.deal_id === id));

  const toggle = async (type: 'service' | 'deal', id: string) => {
    if (!user) return { requiresAuth: true };
    const existing = favorites.find(f => (type === 'service' ? f.service_id === id : f.deal_id === id));
    if (existing) {
      await supabase.from('favorites').delete().eq('id', existing.id);
      setFavorites(p => p.filter(f => f.id !== existing.id));
    } else {
      const payload = type === 'service'
        ? { user_id: user.id, service_id: id, deal_id: null }
        : { user_id: user.id, service_id: null, deal_id: id };
      const { data } = await supabase.from('favorites').insert(payload).select().single();
      if (data) setFavorites(p => [...p, data as Favorite]);
    }
    return { requiresAuth: false };
  };

  return { favorites, loading, isFavorite, toggle, reload: load };
};
