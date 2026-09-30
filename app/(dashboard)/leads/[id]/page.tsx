'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LeadProfilePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/leads');
  }, [router]);

  return (
    <div className="p-12 text-center text-xs text-[#9BA6A0]">
      Redirecionando para a lista de Leads...
    </div>
  );
}
