import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAppMeta() {
  const { data } = useQuery({
    queryKey: ['app-meta'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_config')
        .select('key, value')
        .in('key', ['company_name', 'company_logo_url']);
      const map: Record<string, string> = {};
      (data || []).forEach((r: { key: string; value: string }) => {
        map[r.key] = r.value;
      });
      return map;
    },
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (data?.company_name) {
      document.title = data.company_name;
    }
  }, [data?.company_name]);

  useEffect(() => {
    if (!data?.company_logo_url) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = data.company_logo_url;
  }, [data?.company_logo_url]);
}
