"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// As metas foram incorporadas ao planejamento anual: cada meta virou um objetivo do ano,
// com resultados-chave, prazo e plano. A tabela antiga `goals` ficou intacta como backup.
export default function Metas() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/ano?ano=${new Date().getFullYear()}`);
  }, [router]);

  return <div className="page-loading">As metas agora ficam no planejamento do ano...</div>;
}
