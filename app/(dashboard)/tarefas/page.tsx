'use client';

import React, { useState } from 'react';
import { crmService } from '@/lib/services/crm-service';
import { Priority, TaskItem } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  CheckSquare,
  Plus,
  Calendar,
  Kanban,
  List,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export default function TarefasPage() {
  const [tasks, setTasks] = useState<TaskItem[]>(() => crmService.getTasks());
  const [viewMode, setViewMode] = useState<'lista' | 'kanban'>('lista');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newRelated, setNewRelated] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('alta');
  const [newDueDate, setNewDueDate] = useState('2026-09-22');

  const handleToggleTask = (id: string) => {
    crmService.toggleTaskStatus(id);
    setTasks([...crmService.getTasks()]);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    crmService.addTask({
      title: newTitle.trim(),
      related_to: newRelated.trim() || 'Operação EvoPixel',
      due_date: newDueDate,
      status: 'pendente',
      priority: newPriority,
    });

    setTasks([...crmService.getTasks()]);
    setNewTitle('');
    setNewRelated('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(218,241,222,0.06)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EB69B] uppercase tracking-wider mb-1">
            <CheckSquare className="w-3.5 h-3.5" />
            Produtividade & Operação Diária
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[#E7ECE8] font-heading">
            Tarefas & Entregas
          </h1>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Controle de atividades vinculadas a projetos, clientes e rotinas da EvoPixel.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Alternar Visualização */}
          <div className="inline-flex p-1 rounded-xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)]">
            <button
              onClick={() => setViewMode('lista')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'lista' ? 'bg-[#10201E] text-[#E7ECE8]' : 'text-[#65706A]'
              }`}
              title="Lista"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'kanban' ? 'bg-[#10201E] text-[#E7ECE8]' : 'text-[#65706A]'
              }`}
              title="Kanban"
            >
              <Kanban className="w-4 h-4" />
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            className="gap-1.5"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 text-[#07100F]" />
            <span>Nova Tarefa</span>
          </Button>
        </div>
      </div>

      {/* Lista de Tarefas */}
      {viewMode === 'lista' && (
        <Card className="p-6 space-y-3">
          {tasks.map((task) => {
            const isDone = task.status === 'concluida';
            return (
              <div
                key={task.id}
                className="p-4 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.06)] hover:border-[rgba(218,241,222,0.16)] transition-all flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleTask(task.id)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                      isDone
                        ? 'bg-[#8EB69B] border-[#8EB69B] text-[#07100F]'
                        : 'border-[rgba(218,241,222,0.2)] hover:border-[#F1F9A1]'
                    }`}
                  >
                    {isDone && <CheckCircle2 className="w-4 h-4" />}
                  </button>

                  <div>
                    <h4
                      className={`text-xs font-semibold font-heading transition-all ${
                        isDone ? 'line-through text-[#65706A]' : 'text-[#E7ECE8]'
                      }`}
                    >
                      {task.title}
                    </h4>
                    <div className="text-[11px] text-[#9BA6A0] mt-0.5">
                      Vinculado a: <span className="text-[#8EB69B]">{task.related_to}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <span className="font-mono text-[11px] text-[#65706A]">
                    {new Date(task.due_date).toLocaleDateString('pt-BR')}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                      task.priority === 'alta'
                        ? 'bg-[rgba(241,249,161,0.1)] text-[#F1F9A1]'
                        : 'bg-[#163832] text-[#8EB69B]'
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* Kanban de Tarefas */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { key: 'pendente', label: 'Pendente' },
            { key: 'em_andamento', label: 'Em Andamento' },
            { key: 'concluida', label: 'Concluída' },
          ].map((col) => {
            const colTasks = tasks.filter((t) =>
              col.key === 'concluida' ? t.status === 'concluida' : t.status !== 'concluida'
            );

            return (
              <div
                key={col.key}
                className="p-4 rounded-2xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] space-y-3 min-h-[300px]"
              >
                <div className="text-xs font-semibold text-[#E7ECE8] font-heading pb-2 border-b border-[rgba(218,241,222,0.06)] flex justify-between items-center">
                  <span>{col.label}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#10201E] text-[#9BA6A0]">
                    {colTasks.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handleToggleTask(task.id)}
                      className="p-3.5 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.06)] hover:border-[rgba(218,241,222,0.16)] text-xs space-y-1.5 cursor-pointer"
                    >
                      <div className="font-medium text-[#E7ECE8]">{task.title}</div>
                      <div className="text-[10px] text-[#8EB69B]">{task.related_to}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nova Tarefa */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Criar Nova Tarefa"
        subtitle="Atribua a um projeto, cliente ou rotina interna da EvoPixel."
      >
        <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#9BA6A0] mb-1 font-medium">Título da Atividade *</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ex: Otimizar imagens e Core Web Vitals"
              className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[#9BA6A0] mb-1 font-medium">Vinculado a (Projeto / Cliente)</label>
            <input
              type="text"
              value={newRelated}
              onChange={(e) => setNewRelated(e.target.value)}
              placeholder="Ex: Alcantara Cirurgia Plástica"
              className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">Prioridade</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              >
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>
            <div>
              <label className="block text-[#9BA6A0] mb-1 font-medium">Prazo</label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[rgba(218,241,222,0.06)]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Salvar Tarefa
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
