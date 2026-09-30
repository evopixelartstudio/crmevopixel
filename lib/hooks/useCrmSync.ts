'use client';

import { useEffect, useState } from 'react';
import { crmService } from '@/lib/services/crm-service';

/**
 * Hook para subscrever aos eventos de sincronização do crmService com o Supabase.
 * Força um re-render do componente quando os dados remotos forem carregados ou alterados.
 */
export function useCrmSync() {
  const [, setTick] = useState(0);

  useEffect(() => {
    // Garante que o carregamento do Supabase foi disparado
    crmService.initFromSupabase();

    // Registra listener para atualizações
    const unsubscribe = crmService.subscribe(() => {
      setTick((t) => t + 1);
    });

    return unsubscribe;
  }, []);
}

