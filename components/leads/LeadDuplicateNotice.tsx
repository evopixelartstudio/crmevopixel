'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { duplicateLocationLabels, type LeadDuplicate, type LeadImportResult } from '@/lib/services/lead-deduplication';

export function LeadDuplicateNotice({ duplicates, title = 'Este telefone já está cadastrado no CRM.' }: {
  duplicates: LeadDuplicate[];
  title?: string;
}) {
  if (duplicates.length === 0) return null;

  return (
    <div role="alert" className="rounded-xl border border-amber-300/25 bg-amber-300/5 p-3 space-y-2 text-xs text-amber-100">
      <p className="flex items-start gap-2 font-medium">
        <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
        {title}
      </p>
      <ul className="space-y-2">
        {duplicates.slice(0, 20).map((duplicate, index) => (
          <li key={`${duplicate.entity_type}-${duplicate.entity_id}-${index}`} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 break-words">
            <span className="min-w-0 [overflow-wrap:anywhere]">
              <span className="font-medium">{duplicate.company_name || duplicate.name || 'Cadastro sem nome'}</span>
              {duplicate.name && duplicate.company_name && duplicate.name !== duplicate.company_name && ` · ${duplicate.name}`}
              <span className="block text-amber-100/80">{duplicateLocationLabels[duplicate.location]} · +{duplicate.phone_key}</span>
            </span>
            {duplicate.location !== 'trash' && duplicate.url?.startsWith('/') && !duplicate.url.startsWith('//') && (
              <Link href={duplicate.url} className="shrink-0 underline underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-100">
                Abrir cadastro existente
              </Link>
            )}
          </li>
        ))}
      </ul>
      {duplicates.length > 20 && <p>Mais {duplicates.length - 20} ocorrências de telefone já cadastrado foram ignoradas.</p>}
      {duplicates.some(duplicate => duplicate.location === 'trash') && (
        <p>Os cadastros na Lixeira foram preservados e continuam bloqueando novos cadastros com o mesmo telefone.</p>
      )}
    </div>
  );
}

export function LeadImportSummary({ result, sourceTotal, sourceLabel = 'contatos da planilha' }: {
  result: LeadImportResult;
  sourceTotal?: number;
  sourceLabel?: string;
}) {
  return (
    <div className="space-y-3 text-xs">
      <div role="status" className="p-4 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] space-y-2">
        <p className="font-semibold text-[#E7ECE8]">Importação concluída</p>
        <p className="text-[#9BA6A0]">{sourceTotal ?? result.total} {sourceLabel} lidos.</p>
        <dl className="space-y-1 text-[#E7ECE8]">
          <div className="flex justify-between gap-4"><dt>Novos leads salvos</dt><dd className="font-medium tabular-nums">{result.created.length}</dd></div>
          <div className="flex justify-between gap-4"><dt>Telefones já cadastrados: ignorados</dt><dd className="font-medium tabular-nums">{result.duplicates.length}</dd></div>
          <div className="flex justify-between gap-4"><dt>Sem confirmação de salvamento</dt><dd className="font-medium tabular-nums">{result.failed.length}</dd></div>
        </dl>
      </div>
      {!!result.withoutPhone && <p className="text-[#9BA6A0]">A conferência por telefone não foi possível para {result.withoutPhone} contatos sem número completo.</p>}
      <LeadDuplicateNotice duplicates={result.duplicates} title="Estes telefones já estavam no CRM ou se repetiram nesta importação." />
      {result.failed.length > 0 && (
        <div role="alert" className="rounded-xl border border-red-400/25 bg-red-400/5 p-3 space-y-2 text-red-200">
          <p className="font-medium">Revise os contatos com erro antes de tentar importá-los novamente.</p>
          <ul className="space-y-1 break-words">
            {result.failed.slice(0, 20).map((failure, index) => <li key={`${failure.index}-${index}`}>Contato {failure.index + 1}: {failure.message}</li>)}
          </ul>
          {result.failed.length > 20 && <p>Mais {result.failed.length - 20} contatos ficaram sem confirmação de salvamento.</p>}
        </div>
      )}
    </div>
  );
}
