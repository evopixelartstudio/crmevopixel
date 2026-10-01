'use client';

import React, { useState, useEffect } from 'react';
import { crmService } from '@/lib/services/crm-service';
import { Priority, TaskItem } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import {
  CheckSquare,
  Plus,
  Kanban,
  List,
  FolderKanban,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

export default function TarefasPage() {
  const [tasks, setTasks] = useState<TaskItem[]>(() => [...crmService.getTasks()]);
  const [viewMode, setViewMode] = useState<'projetos' | 'lista' | 'kanban'>('projetos');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newRelated, setNewRelated] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('alta');
  const [newDueDate, setNewDueDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setTasks([...crmService.getTasks()]);
    const unsubscribe = crmService.subscribe(() => {
      setTasks([...crmService.getTasks()]);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleTask = (id: string) => {
    crmService.toggleTaskStatus(id);
    setTasks([...crmService.getTasks()]);
  };

  const handleDeleteTask = (id: string) => {
    crmService.deleteTask(id);
    setTasks([...crmService.getTasks()]);
  };

  const handleCreateStandardChecklist = (projectName: string) => {
    if (!projectName.trim()) return;
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const standardItems = [
      'Briefing',
      'Jogar no ar',
      'Testar botões e adaptabilidade',
      'Cadastrar no Google Analytics',
    ];
    [...standardItems].reverse().forEach((item) => {
      const exists = crmService
        .getTasks()
        .some(
          (t) =>
            (t.related_to || '').trim().toLowerCase() === projectName.trim().toLowerCase() &&
            (t.title || '').trim().toLowerCase() === item.toLowerCase()
        );
      if (!exists) {
        crmService.addTask({
          title: item,
          related_to: projectName.trim(),
          due_date: dueDate,
          status: 'pendente',
          priority: 'alta',
        });
      }
    });
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

  // Agrupamento por Projeto / Cliente
  const groupedByProject = tasks.reduce<Record<string, TaskItem[]>>((acc, task) => {
    const key = (task.related_to || 'Operação EvoPixel').trim();
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  const projectGroups = Object.entries(groupedByProject);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(218,241,222,0.06)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8EB69B] uppercase tracking-wider mb-1">
            <CheckSquare className="w-3.5 h-3.5" />
            Produtividade &amp; Operação Diária
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[#E7ECE8] font-heading">
            Tarefas &amp; Entregas
          </h1>
          <p className="text-xs text-[#9BA6A0] mt-1">
            Checklists automáticos gerados ao mover oportunidades para &ldquo;Projeto em andamento&rdquo; (Briefing, Jogar no ar, Testar botões e adaptabilidade, Cadastrar no Google Analytics).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Alternar Visualização */}
          <div className="inline-flex p-1 rounded-xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)]">
            <button
              onClick={() => setViewMode('projetos')}
              className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all ${
                viewMode === 'projetos' ? 'bg-[#10201E] text-[#E7ECE8] font-medium' : 'text-[#65706A]'
              }`}
              title="Agrupado por Projeto / Cliente"
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>Por Projeto</span>
            </button>
            <button
              onClick={() => setViewMode('lista')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'lista' ? 'bg-[#10201E] text-[#E7ECE8]' : 'text-[#65706A]'
              }`}
              title="Lista Geral"
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
            onClick={() => {
              setNewRelated('');
              setIsModalOpen(true);
            }}
          >
            <Plus className="w-3.5 h-3.5 text-[#07100F]" />
            <span>Nova Tarefa</span>
          </Button>
        </div>
      </div>

      {/* Visualização Agrupada por Projeto (Cliente) */}
      {viewMode === 'projetos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projectGroups.length === 0 ? (
            <Card className="p-12 text-center md:col-span-2">
              <div className="w-12 h-12 rounded-2xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] flex items-center justify-center text-[#8EB69B] mx-auto mb-3">
                <CheckSquare className="w-6 h-6" />
              </div>
              <h4 className="text-base font-semibold text-[#E7ECE8] font-heading">
                Nenhuma tarefa pendente
              </h4>
              <p className="text-xs text-[#9BA6A0] max-w-sm mx-auto mt-1 mb-4">
                Quando um lead entrar em &ldquo;Projeto em andamento&rdquo; no Pipeline, a lista com Briefing, Jogar no ar, Testar botões e adaptabilidade e Cadastrar no Google Analytics será criada aqui automaticamente.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="gap-1.5 text-xs mx-auto"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus className="w-3.5 h-3.5 text-[#07100F]" />
                <span>Criar Primeira Tarefa</span>
              </Button>
            </Card>
          ) : (
            projectGroups.map(([projectName, projectTasks]) => {
              const completedCount = projectTasks.filter((t) => t.status === 'concluida').length;
              const totalCount = projectTasks.length;
              const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

              return (
                <Card
                  key={projectName}
                  className="p-5 space-y-4 flex flex-col justify-between border border-[rgba(218,241,222,0.08)]"
                >
                  <div className="space-y-3">
                    {/* Header do Card do Projeto/Cliente */}
                    <div className="flex items-start justify-between gap-3 border-b border-[rgba(218,241,222,0.06)] pb-3">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#8EB69B]">
                          Projeto / Cliente
                        </span>
                        <h3 className="text-base font-semibold text-[#E7ECE8] font-heading mt-0.5">
                          {projectName}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono px-2 py-0.5 rounded-lg bg-[#10201E] text-[#F1F9A1] border border-[rgba(241,249,161,0.15)]">
                          {completedCount}/{totalCount} ({progressPct}%)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setNewRelated(projectName);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-[#10201E] text-[#8EB69B] hover:text-[#F1F9A1] border border-[rgba(218,241,222,0.08)] transition-all"
                          title="Adicionar item a este projeto"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Barra de progresso */}
                    <div className="w-full h-1.5 rounded-full bg-[#10201E] overflow-hidden">
                      <div
                        className="h-full bg-[#8EB69B] transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    {/* Breve Lista de Tarefas do Projeto */}
                    <div className="space-y-2 pt-1">
                      {projectTasks.map((task) => {
                        const isDone = task.status === 'concluida';
                        return (
                          <div
                            key={task.id}
                            className="p-3 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.06)] hover:border-[rgba(218,241,222,0.16)] transition-all flex items-center justify-between gap-3 group"
                          >
                            <div
                              onClick={() => handleToggleTask(task.id)}
                              className="flex items-center gap-3 flex-1 cursor-pointer"
                            >
                              <button
                                type="button"
                                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                                  isDone
                                    ? 'bg-[#8EB69B] border-[#8EB69B] text-[#07100F]'
                                    : 'border-[rgba(218,241,222,0.25)] hover:border-[#F1F9A1]'
                                }`}
                              >
                                {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                              </button>
                              <span
                                className={`text-xs font-medium transition-all ${
                                  isDone ? 'line-through text-[#65706A]' : 'text-[#E7ECE8]'
                                }`}
                              >
                                {task.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-[#65706A]">
                                {new Date(task.due_date).toLocaleDateString('pt-BR')}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#65706A] hover:text-red-400 transition-all"
                                title="Excluir tarefa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Lista Geral de Tarefas */}
      {viewMode === 'lista' && (
        <Card className="p-6 space-y-3">
          {tasks.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] flex items-center justify-center text-[#8EB69B] mx-auto mb-3">
                <CheckSquare className="w-6 h-6" />
              </div>
              <h4 className="text-base font-semibold text-[#E7ECE8] font-heading">
                Nenhuma tarefa pendente
              </h4>
            </div>
          ) : (
            tasks.map((task) => {
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
                        Projeto / Cliente: <span className="text-[#8EB69B]">{task.related_to}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
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
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1 rounded text-[#65706A] hover:text-red-400 transition-all"
                      title="Excluir tarefa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
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
        subtitle="Atribua a um projeto, cliente ou gere o checklist padrão de entrega."
      >
        <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#9BA6A0] mb-1 font-medium">Projeto / Cliente *</label>
            <input
              type="text"
              value={newRelated}
              onChange={(e) => setNewRelated(e.target.value)}
              placeholder="Ex: Clínica Vida"
              className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[#9BA6A0] mb-1 font-medium">Título da Atividade *</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ex: Briefing, Jogar no ar, Testar botões e adaptabilidade..."
              className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#E7ECE8] focus:outline-none"
            />
          </div>

          {newRelated.trim() && (
            <div className="p-3 rounded-xl bg-[#10201E]/70 border border-[rgba(142,182,155,0.2)] flex items-center justify-between gap-2">
              <span className="text-[11px] text-[#9BA6A0]">
                Deseja criar a lista padrão completa para <strong className="text-[#E7ECE8]">{newRelated}</strong>?
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="text-[11px] shrink-0"
                onClick={() => {
                  handleCreateStandardChecklist(newRelated);
                  setNewRelated('');
                  setNewTitle('');
                  setIsModalOpen(false);
                }}
              >
                Gerar 4 Etapas Padrão
              </Button>
            </div>
          )}

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
