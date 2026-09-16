'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Workflow,
  Zap,
  CheckCircle2,
  Copy,
  ExternalLink,
  Code2,
  Activity,
  Send,
} from 'lucide-react';

export default function AutomacoesPage() {
  const [selectedEvent, setSelectedEvent] = useState<string>('prospecting.sequence.started');

  const events = [
    {
      name: 'lead.created',
      description: 'Disparado assim que um novo lead é importado ou cadastrado manualmente.',
      examplePayload: {
        event: 'lead.created',
        timestamp: '2026-09-15T18:00:00Z',
        lead: { id: 'lead-1', name: 'Dr. Roberto Silva', company: 'Silva Advocacia', segment: 'Advocacia' },
      },
    },
    {
      name: 'prospecting.sequence.started',
      description: 'Inicia a régua de abordagem do nicho. O n8n envia a Etapa 1 via WhatsApp.',
      examplePayload: {
        event: 'prospecting.sequence.started',
        lead_id: 'lead-4',
        niche: 'Contabilidade',
        step: 1,
        message_text: 'Olá Marcos, tudo bem? Notei que a Contabilidade Nova Era tem forte atuação no Rio...',
        channel: 'whatsapp',
      },
    },
    {
      name: 'prospecting.followup.due',
      description: 'Disparado pelo EVOCRM quando o prazo de N dias da etapa vence sem resposta do lead.',
      examplePayload: {
        event: 'prospecting.followup.due',
        lead_id: 'lead-4',
        step: 2,
        step_name: 'Follow-up 1 (Insight de Conversão)',
        message_text: 'Marcos, passando rápido: na semana passada estruturamos um fluxo no WhatsApp...',
      },
    },
    {
      name: 'prospecting.lead.responded',
      description: 'Recebido do n8n quando o lead responde. Pausa automaticamente a sequência no EVOCRM.',
      examplePayload: {
        event: 'prospecting.lead.responded',
        lead_id: 'lead-2',
        response_text: 'Olá! Achei muito interessante. Vocês conseguem me enviar uma proposta?',
        action_taken: 'sequence_paused_automatically',
      },
    },
    {
      name: 'proposal.sent',
      description: 'Disparado ao emitir e enviar uma proposta comercial para o cliente.',
      examplePayload: {
        event: 'proposal.sent',
        code: 'PROP-2026-042',
        total: 3500.0,
        client: 'Dra. Camila Vasconcelos',
      },
    },
    {
      name: 'contract.signed',
      description: 'Notificação do provedor eletrônico (Clicksign). Move para criação automática do projeto.',
      examplePayload: {
        event: 'contract.signed',
        contract_code: 'CONT-2026-018',
        signed_at: '2026-08-16T14:20:00Z',
      },
    },
  ];

  const currentEvent = events.find((e) => e.name === selectedEvent) || events[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(218,241,222,0.06)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EB69B] uppercase tracking-wider mb-1">
            <Workflow className="w-3.5 h-3.5" />
            Integração n8n • Webhooks & Eventos
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[#E7ECE8] font-heading">
            Automações & Webhooks
          </h1>
          <p className="text-xs text-[#9BA6A0] mt-1">
            O EVOCRM atua como fonte da verdade e delega disparos e escuta de respostas ao n8n.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#8EB69B] animate-pulse" />
          <span className="text-xs font-mono text-[#8EB69B]">Webhook Listener Ativo</span>
        </div>
      </div>

      {/* Split: Lista de Eventos vs Payload Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-2">
          <span className="text-xs font-heading font-medium text-[#9BA6A0] uppercase tracking-wider px-1">
            Eventos do Sistema (Seção 38)
          </span>
          {events.map((evt) => {
            const isSelected = evt.name === currentEvent.name;
            return (
              <div
                key={evt.name}
                onClick={() => setSelectedEvent(evt.name)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#10201E] border-[rgba(241,249,161,0.25)] shadow-[0_0_20px_rgba(241,249,161,0.04)]'
                    : 'bg-[#0C1A19] border-[rgba(218,241,222,0.08)] hover:border-[rgba(218,241,222,0.16)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-mono font-semibold ${
                      isSelected ? 'text-[#F1F9A1]' : 'text-[#E7ECE8]'
                    }`}
                  >
                    {evt.name}
                  </span>
                  <Zap className={`w-3.5 h-3.5 ${isSelected ? 'text-[#F1F9A1]' : 'text-[#65706A]'}`} />
                </div>
                <p className="text-[11px] text-[#9BA6A0] mt-1 line-clamp-2">
                  {evt.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-7 space-y-4">
          <Card className="p-6 space-y-4 bg-[#0C1A19]">
            <div className="flex items-center justify-between border-b border-[rgba(218,241,222,0.06)] pb-4">
              <div>
                <span className="text-[10px] font-mono text-[#8EB69B] uppercase tracking-wider">
                  Inspector de Payload
                </span>
                <h3 className="text-sm font-semibold font-mono text-[#F1F9A1] mt-0.5">
                  {currentEvent.name}
                </h3>
              </div>

              <Button
                variant="secondary"
                size="sm"
                className="text-xs h-7 px-2.5 gap-1"
                onClick={() => {
                  navigator.clipboard?.writeText(JSON.stringify(currentEvent.examplePayload, null, 2));
                  alert('Payload JSON copiado para a área de transferência!');
                }}
              >
                <Copy className="w-3 h-3 text-[#8EB69B]" />
                <span>Copiar JSON</span>
              </Button>
            </div>

            <p className="text-xs text-[#9BA6A0] leading-relaxed">
              {currentEvent.description}
            </p>

            <div className="p-4 rounded-xl bg-[#07100F] border border-[rgba(218,241,222,0.06)] overflow-x-auto">
              <pre className="text-xs font-mono text-[#8EB69B] leading-relaxed">
                {JSON.stringify(currentEvent.examplePayload, null, 2)}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-[#E7ECE8] gap-1.5"
                onClick={() => alert(`Simulação de disparo do evento ${currentEvent.name} executada com sucesso!`)}
              >
                <Send className="w-3.5 h-3.5 text-[#8EB69B]" />
                <span>Disparar Evento de Teste</span>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
