'use client';

import React, { useState } from 'react';
import { crmService } from '@/lib/services/crm-service';
import { ServiceCategory } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  Layers,
  Plus,
  Clock,
  DollarSign,
  Globe,
  Bot,
  Search,
  CheckCircle2,
} from 'lucide-react';

export default function ServicosPage() {
  const [services, setServices] = useState(() => crmService.getServices());
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState<ServiceCategory>('WEBSITES');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDays, setNewServiceDays] = useState('');

  const categories: ('todos' | ServiceCategory)[] = [
    'todos',
    'WEBSITES',
    'AUTOMAÇÃO',
    'PRESENÇA DIGITAL',
  ];

  const handleOpenEdit = (service: any) => {
    setEditingServiceId(service.id);
    setNewServiceName(service.name);
    setNewServiceCategory(service.category);
    setNewServiceDesc(service.description);
    setNewServicePrice(service.base_price.toString());
    setNewServiceDays(service.delivery_time_days?.toString() || '');
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingServiceId(null);
    setNewServiceName('');
    setNewServiceCategory('WEBSITES');
    setNewServiceDesc('');
    setNewServicePrice('');
    setNewServiceDays('');
    setIsModalOpen(true);
  };

  const handleDeleteService = () => {
    if (editingServiceId && confirm('Tem certeza que deseja excluir este serviço?')) {
      crmService.deleteService(editingServiceId);
      setServices([...crmService.getServices()]);
      setIsModalOpen(false);
    }
  };

  const handleSaveService = () => {
    if (!newServiceName || !newServicePrice) {
      alert('Preencha o nome e o preço do serviço.');
      return;
    }
    
    if (editingServiceId) {
      crmService.updateService(editingServiceId, {
        name: newServiceName,
        category: newServiceCategory,
        description: newServiceDesc || 'Serviço padrão da EvoPixel',
        base_price: Number(newServicePrice),
        delivery_time_days: Number(newServiceDays) || 7,
      });
    } else {
      crmService.addService({
        name: newServiceName,
        category: newServiceCategory,
        description: newServiceDesc || 'Serviço padrão da EvoPixel',
        base_price: Number(newServicePrice),
        delivery_time_days: Number(newServiceDays) || 7,
        checklist: []
      });
    }
    
    setServices([...crmService.getServices()]);
    setIsModalOpen(false);
  };

  const filteredServices = services.filter((s) => {
    if (selectedCategory === 'todos') return true;
    return s.category === selectedCategory;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(218,241,222,0.06)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EB69B] uppercase tracking-wider mb-1">
            <Layers className="w-3.5 h-3.5" />
            Portfólio Comercial da EvoPixel
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[#E7ECE8] font-heading">
            Catálogo de Serviços
          </h1>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Soluções estruturadas com precificação base, prazos de entrega e sinergia multisserviço.
          </p>
        </div>

        <Button variant="primary" size="sm" className="gap-1.5" onClick={handleOpenCreate}>
          <Plus className="w-3.5 h-3.5 text-[#07100F]" />
          <span>Cadastrar Serviço</span>
        </Button>
      </div>

      {/* Filtro por Categorias */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-heading transition-all ${
              selectedCategory === cat
                ? 'bg-[#10201E] text-[#E7ECE8] border border-[rgba(218,241,222,0.12)] font-medium'
                : 'text-[#9BA6A0] hover:text-[#E7ECE8]'
            }`}
          >
            {cat === 'todos' ? 'Todos os Serviços' : cat}
          </button>
        ))}
      </div>

      {/* Grid de Serviços */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((service) => (
          <div
            key={service.id}
            className="p-6 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] hover:border-[rgba(218,241,222,0.16)] transition-all flex flex-col justify-between space-y-4 group shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-[#8EB69B] uppercase tracking-wider">
                  {service.category}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#10201E] text-[#8EB69B] font-mono">
                  {service.delivery_time_days} dias
                </span>
              </div>

              <h3 className="text-base font-semibold text-[#E7ECE8] font-heading group-hover:text-[#F1F9A1] transition-colors">
                {service.name}
              </h3>

              <p className="text-xs text-[#9BA6A0] mt-2 leading-relaxed">
                {service.description}
              </p>
            </div>

            <div className="pt-4 border-t border-[rgba(218,241,222,0.06)] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#65706A]">A partir de</span>
                <div className="text-base font-semibold font-mono text-[#F1F9A1]">
                  R$ {service.base_price.toLocaleString('pt-BR')}
                </div>
              </div>

              <Button variant="secondary" size="sm" className="text-xs h-7 px-2.5" onClick={() => handleOpenEdit(service)}>
                Editar
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingServiceId ? 'Editar Serviço' : 'Cadastrar Novo Serviço'}
        subtitle={editingServiceId ? 'Altere as informações do serviço' : 'Adicione um novo serviço ao catálogo da EvoPixel.'}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-[#9BA6A0] mb-1">Nome do Serviço</label>
            <input
              type="text"
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
              placeholder="Ex: Landing Page"
              className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[#9BA6A0] mb-1">Categoria</label>
            <select
              value={newServiceCategory}
              onChange={(e) => setNewServiceCategory(e.target.value as ServiceCategory)}
              className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
            >
              <option value="WEBSITES">Websites</option>
              <option value="AUTOMAÇÃO">Automação</option>
              <option value="PRESENÇA DIGITAL">Presença Digital</option>
            </select>
          </div>
          <div>
            <label className="block text-[#9BA6A0] mb-1">Descrição</label>
            <input
              type="text"
              value={newServiceDesc}
              onChange={(e) => setNewServiceDesc(e.target.value)}
              placeholder="Ex: Desenvolvimento web de alta performance..."
              className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#9BA6A0] mb-1">Preço Base (R$)</label>
              <input
                type="number"
                value={newServicePrice}
                onChange={(e) => setNewServicePrice(e.target.value)}
                placeholder="Ex: 3200"
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[#9BA6A0] mb-1">Prazo (Dias)</label>
              <input
                type="number"
                value={newServiceDays}
                onChange={(e) => setNewServiceDays(e.target.value)}
                placeholder="Ex: 14"
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              />
            </div>
          </div>

          <div className={`flex ${editingServiceId ? 'justify-between' : 'justify-end'} gap-2 pt-4 border-t border-[rgba(218,241,222,0.06)]`}>
            {editingServiceId && (
              <Button variant="outline" size="sm" className="text-red-400 hover:text-red-300 border-red-900/30 hover:bg-red-900/20" onClick={handleDeleteService}>
                Excluir
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveService}>
                Salvar Serviço
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
