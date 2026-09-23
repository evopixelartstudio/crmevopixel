'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import * as xlsx from 'xlsx';
import { crmService } from '@/lib/services/crm-service';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  Sparkles,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  Zap,
  Filter,
  Layers,
  Send,
  MessageSquare,
  Flame,
} from 'lucide-react';

export default function ProspeccaoPage() {
  const niches = crmService.getNiches();
  const leads = crmService.getLeads();

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<number>(1);
  const [importStats, setImportStats] = useState({ total: 0, imported: 0 });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = xlsx.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = xlsx.utils.sheet_to_json(worksheet);

        let importedCount = 0;
        jsonData.forEach((row: any) => {
          // Flexible key mapping
          const name = row['Nome'] || row['Name'] || row['nome'] || row['Contato'] || '';
          const company = row['Empresa'] || row['Company'] || row['empresa'] || row['Organização'] || name || 'Sem Empresa';
          const phone = row['Telefone'] || row['WhatsApp'] || row['telefone'] || row['Phone'] || row['Celular'] || '';
          const segment = row['Nicho'] || row['Segmento'] || row['nicho'] || 'Geral';
          const email = row['Email'] || row['E-mail'] || row['email'] || '';
          const city = row['Cidade'] || row['City'] || row['cidade'] || 'Não informada';

          if (company || name) {
            // Updated to add to Prospects instead of Leads
            crmService.addProspect({
              nome: name || company,
              empresa: company,
              segment: segment,
              email: email,
              telefone: phone,
              whatsapp: phone,
              cidade: city,
              estado: 'N/A', // ou mapear da planilha se existir
              icp_score: 50,
              opportunity_score: 50,
              digital_presence_score: 50,
              source: 'Importação XLSX/CSV',
              suggested_service: 'A definir',
              identified_signals: [],
              status: 'new',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } as any); // using any to avoid partial missing fields type errors if any exist, but providing all typical fields
            importedCount++;
          }
        });

        setImportStats({ total: jsonData.length, imported: importedCount });
        setStep(2);
      } catch (err) {
        console.error(err);
        alert('Erro ao ler a planilha. Verifique o formato.');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(218,241,222,0.06)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EB69B] uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            Módulo de Prospecção IA & Qualificação
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[#E7ECE8] font-heading">
            Prospecção & Inteligência de Mercado
          </h1>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Importe listas CSV/XLSX, classifique nichos, mapeie ICPs e vincule réguas automáticas do n8n.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/prospeccao/mensagens">
            <Button variant="secondary" size="sm" className="gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#8EB69B]" />
              <span>Banco de Mensagens</span>
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            className="gap-1.5"
            onClick={() => setIsUploadModalOpen(true)}
          >
            <Upload className="w-3.5 h-3.5 text-[#07100F]" />
            <span>Importar Lista (CSV/XLSX)</span>
          </Button>
        </div>
      </div>

      {/* Fluxo de Prospecção Visual (Seção 18) */}
      <div className="p-6 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)]">
        <div className="text-[10px] font-mono text-[#8EB69B] uppercase tracking-wider mb-4">
          Fluxo Contínuo de Prospecção Ativa
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 text-center text-xs">
          {[
            '01. Upload',
            '02. Mapear',
            '03. ICP',
            '04. Analisar',
            '05. Qualificar',
            '06. Priorizar',
            '07. Oportunidades',
            '08. Abordagem',
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-[#10201E]/60 border border-[rgba(218,241,222,0.05)] text-[#9BA6A0] font-heading font-medium flex items-center justify-center"
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Destaque das Réguas de Nicho Ativas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#8EB69B]">NICHO: CONTABILIDADE</span>
            <Badge variant="accent" className="text-[10px]">
              Ativa
            </Badge>
          </div>
          <h4 className="text-sm font-semibold text-[#E7ECE8]">
            Prospecção Ativa BPO & Contabilidade
          </h4>
          <p className="text-xs text-[#9BA6A0] leading-relaxed">
            Abordagem focada no gargalo de triagem manual do WhatsApp. 34% de taxa de conversão no Follow-up 1.
          </p>
          <div className="pt-2 border-t border-[rgba(218,241,222,0.06)] flex justify-between items-center text-xs">
            <span className="text-[#65706A]">4 etapas cadastradas</span>
            <Link href="/prospeccao/mensagens" className="text-[#8EB69B] hover:text-[#F1F9A1]">
              Editar sequência →
            </Link>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#8EB69B]">NICHO: CLÍNICAS</span>
            <Badge variant="accent" className="text-[10px]">
              Ativa
            </Badge>
          </div>
          <h4 className="text-sm font-semibold text-[#E7ECE8]">
            Captação & Agendamento Particular
          </h4>
          <p className="text-xs text-[#9BA6A0] leading-relaxed">
            Foco na velocidade de resposta e agendamento instantâneo 24h para procedimentos estéticos.
          </p>
          <div className="pt-2 border-t border-[rgba(218,241,222,0.06)] flex justify-between items-center text-xs">
            <span className="text-[#65706A]">3 etapas cadastradas</span>
            <Link href="/prospeccao/mensagens" className="text-[#8EB69B] hover:text-[#F1F9A1]">
              Editar sequência →
            </Link>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#8EB69B]">NICHO: ADVOCACIA</span>
            <Badge variant="accent" className="text-[10px]">
              Ativa
            </Badge>
          </div>
          <h4 className="text-sm font-semibold text-[#E7ECE8]">
            Posicionamento Jurídico & OAB
          </h4>
          <p className="text-xs text-[#9BA6A0] leading-relaxed">
            Estratégia institucional em estrita conformidade com provimento da OAB e autoridade corporativa.
          </p>
          <div className="pt-2 border-t border-[rgba(218,241,222,0.06)] flex justify-between items-center text-xs">
            <span className="text-[#65706A]">2 etapas cadastradas</span>
            <Link href="/prospeccao/mensagens" className="text-[#8EB69B] hover:text-[#F1F9A1]">
              Editar sequência →
            </Link>
          </div>
        </Card>
      </div>

      {/* Leads em Prospecção Ativa */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[rgba(218,241,222,0.06)] pb-4">
          <div>
            <h3 className="text-base font-medium text-[#E7ECE8] font-heading">
              Leads em Régua de Disparo Automático (n8n)
            </h3>
            <p className="text-xs text-[#9BA6A0] mt-0.5">
              Acompanhamento de disparos, leituras e respostas sem efeito de caixa preta.
            </p>
          </div>
          <Link href="/leads" className="text-xs text-[#8EB69B] hover:text-[#F1F9A1]">
            Ver todos os leads →
          </Link>
        </div>

        <div className="space-y-3">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="p-4 rounded-xl bg-[#10201E]/60 border border-[rgba(218,241,222,0.06)] flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#E7ECE8] font-heading">
                    {lead.company_name}
                  </span>
                  <Badge temperature={lead.temperature} className="text-[10px] py-0 px-1.5">
                    {lead.temperature}
                  </Badge>
                  <span className="text-[10px] font-mono text-[#8EB69B]">
                    Nicho: {lead.segment}
                  </span>
                </div>
                <div className="text-xs text-[#9BA6A0]">
                  {lead.sequence_progress?.sequence_name || 'Sem sequência ativa'} —{' '}
                  <span className="text-[#E7ECE8]">
                    {lead.sequence_progress?.current_step_name || 'Aguardando início'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-[#9BA6A0]">
                  Status: {lead.sequence_progress?.status || 'novo'}
                </span>
                <Link href={`/leads/${lead.id}`}>
                  <Button variant="secondary" size="sm" className="text-xs h-7 px-2.5">
                    Gerenciar
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Modal Importar CSV/XLSX (Seção 18) */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setStep(1);
        }}
        title="Importação Inteligente de Leads"
        subtitle="Suporta planilhas CSV e XLSX. Detecção automática de colunas, telefones e nichos."
      >
        <div className="space-y-5 text-xs">
          {step === 1 && (
            <div className="space-y-4">
              <label className="relative p-8 border-2 border-dashed border-[rgba(218,241,222,0.12)] hover:border-[rgba(218,241,222,0.25)] rounded-2xl flex flex-col items-center justify-center text-center bg-[#10201E]/40 cursor-pointer overflow-hidden transition-colors w-full">
                <input 
                  type="file" 
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                />
                <FileSpreadsheet className="w-8 h-8 text-[#8EB69B] mb-3" />
                <span className="text-xs font-medium text-[#E7ECE8] mb-1">
                  {isProcessing ? 'Processando planilha...' : 'Clique ou arraste seu arquivo CSV/XLSX aqui'}
                </span>
                <span className="text-[11px] text-[#65706A]">
                  Detecção automática de Nome, Empresa, Telefone, WhatsApp, Cidade e Nicho
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsUploadModalOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.06)] space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#8EB69B]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{importStats.imported} leads importados com sucesso!</span>
                </div>
                <p className="text-[11px] text-[#9BA6A0]">
                  Foram encontradas {importStats.total} linhas no arquivo e {importStats.imported} novos leads foram adicionados à sua base (ignorando campos vazios).
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    alert('Leads incorporados com sucesso à base!');
                    setIsUploadModalOpen(false);
                    setStep(1);
                  }}
                >
                  Confirmar e Ir para Leads
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
