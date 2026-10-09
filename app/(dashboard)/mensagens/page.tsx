'use client';

import { loadRabiscoBoard, saveRabiscoBoard, type RabiscoBoard } from '@/lib/services/rabisco-storage';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MousePointer,
  Square,
  ArrowRight,
  PenTool,
  Eraser,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  RefreshCw,
  Palette,
  Check,
  X,
  Type,
  Move,
  Sparkles,
  Link2,
} from 'lucide-react';

export interface BoardCard {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  content: string;
  color: string;
  textColor?: string;
}

export interface BoardConnection {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
  color?: string;
}

export interface BoardStroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

const CARD_COLORS = [
  { name: 'Laranja / Coral', bg: '#FF9F5A', text: '#2A1202', border: '#EA8135' },
  { name: 'Rosa Pastel', bg: '#FFB2D2', text: '#2D0A1B', border: '#F48EBA' },
  { name: 'Azul Celeste', bg: '#77A7FF', text: '#0A1C40', border: '#538CF5' },
  { name: 'Verde Menta', bg: '#86EFAC', text: '#062E17', border: '#4ADE80' },
  { name: 'Amarelo Post-it', bg: '#FDE047', text: '#312A02', border: '#EAB308' },
  { name: 'Lilás / Roxo', bg: '#C084FC', text: '#260B45', border: '#A855F7' },
  { name: 'Evo Dark', bg: '#10201E', text: '#E7ECE8', border: '#8EB69B' },
];

const PEN_COLORS = [
  { name: 'Amarelo Evo', value: '#F1F9A1' },
  { name: 'Verde Evo', value: '#8EB69B' },
  { name: 'Branco', value: '#FFFFFF' },
  { name: 'Coral', value: '#FF7B72' },
  { name: 'Azul', value: '#58A6FF' },
];


// Modelo inicial inspirado na referência de quadro interativo (Miro)
const INITIAL_CARDS: BoardCard[] = [
  {
    id: 'card-1',
    x: 80,
    y: 280,
    width: 220,
    height: 140,
    title: 'Objetivos Comerciais',
    content: 'Funil principal de conversão e cadência de mensagens de alta retenção.',
    color: '#FF9F5A',
    textColor: '#2A1202',
  },
  {
    id: 'card-2',
    x: 400,
    y: 130,
    width: 200,
    height: 120,
    title: 'Abordagem Inicial',
    content: 'Apresentação cordial + pergunta provocativa sobre gargalos de conversão.',
    color: '#FFB2D2',
    textColor: '#2D0A1B',
  },
  {
    id: 'card-3',
    x: 400,
    y: 430,
    width: 210,
    height: 120,
    title: 'Oferta & Proposta',
    content: 'Apresentação do escopo claro, prazo de entrega e condições facilitadas.',
    color: '#77A7FF',
    textColor: '#0A1C40',
  },
  {
    id: 'card-4',
    x: 720,
    y: 60,
    width: 180,
    height: 90,
    title: 'Qualificação Rápida',
    content: 'Entender nicho, faturamento médio e urgência de entrega.',
    color: '#FDE047',
    textColor: '#312A02',
  },
  {
    id: 'card-5',
    x: 720,
    y: 190,
    width: 180,
    height: 90,
    title: 'Script WhatsApp',
    content: 'Áudio curto ou mensagem personalizada de 3 parágrafos.',
    color: '#FFB2D2',
    textColor: '#2D0A1B',
  },
  {
    id: 'card-6',
    x: 720,
    y: 370,
    width: 190,
    height: 90,
    title: 'Quebra de Objeções',
    content: 'Preço alto: mostrar ROI. Sem tempo: nós cuidamos de tudo.',
    color: '#86EFAC',
    textColor: '#062E17',
  },
  {
    id: 'card-7',
    x: 720,
    y: 500,
    width: 190,
    height: 90,
    title: 'Link de Entrada',
    content: 'Link Mercado Pago com valor de entrada 50% ou Pix.',
    color: '#77A7FF',
    textColor: '#0A1C40',
  },
  {
    id: 'card-8',
    x: 1000,
    y: 370,
    width: 180,
    height: 90,
    title: 'Follow-up 24h',
    content: 'Mensagem de repescagem caso o lead suma após a proposta.',
    color: '#86EFAC',
    textColor: '#062E17',
  },
];

const INITIAL_CONNECTIONS: BoardConnection[] = [
  { id: 'conn-1', fromId: 'card-1', toId: 'card-2', label: 'Inicia com' },
  { id: 'conn-2', fromId: 'card-1', toId: 'card-3', label: 'Direciona para' },
  { id: 'conn-3', fromId: 'card-2', toId: 'card-4', label: 'Requer' },
  { id: 'conn-4', fromId: 'card-2', toId: 'card-5', label: 'Ação' },
  { id: 'conn-5', fromId: 'card-3', toId: 'card-6', label: 'Se hesitar' },
  { id: 'conn-6', fromId: 'card-3', toId: 'card-7', label: 'Fechamento' },
  { id: 'conn-7', fromId: 'card-6', toId: 'card-8', label: 'Sem resposta' },
];

export default function RabiscoPage() {
  // Dados do Quadro
  const [cards, setCards] = useState<BoardCard[]>([]);
  const [connections, setConnections] = useState<BoardConnection[]>([]);
  const [strokes, setStrokes] = useState<BoardStroke[]>([]);

  // Ferramenta Ativa
  const [tool, setTool] = useState<'select' | 'card' | 'connect' | 'pen' | 'eraser'>('select');
  const [selectedColor, setSelectedColor] = useState<string>(CARD_COLORS[0].bg);
  const [penColor, setPenColor] = useState<string>(PEN_COLORS[0].value);
  const [penWidth, setPenWidth] = useState<number>(3);

  // Zoom e Pan da Tela
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 40, y: 40 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Estado para Conexão entre Cards
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);

  // Estado de Arrastar Card
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Estado de Rabisco (Desenho Livre)
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<BoardStroke | null>(null);

  // Edição de Label de Conexão
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
  const [connectionLabelInput, setConnectionLabelInput] = useState('');

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(56);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const observer = new ResizeObserver(() => setHeaderHeight(header.offsetHeight));
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const [boardReady, setBoardReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'loading' | 'saving' | 'saved' | 'error'>('loading');
  const [storageError, setStorageError] = useState<string | null>(null);
  const boardRef = useRef<RabiscoBoard>({ cards: [], connections: [], strokes: [] });
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveRevision = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        let board = await loadRabiscoBoard();
        if (cancelled) return;
        if (!board) {
          board = { cards: INITIAL_CARDS, connections: INITIAL_CONNECTIONS, strokes: [] };
          await saveRabiscoBoard(board);
        }
        if (cancelled) return;
        boardRef.current = board;
        setCards(board.cards);
        setConnections(board.connections);
        setStrokes(board.strokes);
        setBoardReady(true);
        setSaveStatus('saved');

      } catch (error) {
        if (cancelled) return;
        setStorageError(error instanceof Error ? error.message : 'Não foi possível carregar o Rabisco.');
        setSaveStatus('error');
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const persistBoard = (patch: Partial<RabiscoBoard>) => {
    if (!boardReady) return;
    boardRef.current = { ...boardRef.current, ...patch };
    const snapshot = boardRef.current;
    const revision = ++saveRevision.current;
    setSaveStatus('saving');
    setStorageError(null);
    // Serializar gravações para uma resposta lenta não sobrescrever uma edição recente.
    saveQueue.current = saveQueue.current.then(async () => {
      try {
        await saveRabiscoBoard(snapshot);
        if (revision === saveRevision.current) setSaveStatus('saved');
      } catch (error) {
        if (revision === saveRevision.current) {
          setStorageError(error instanceof Error ? error.message : 'Não foi possível salvar.');
          setSaveStatus('error');
        }
      }
    });
  };

  useEffect(() => {
    const warnUnsaved = (event: BeforeUnloadEvent) => {
      if (boardReady && saveStatus !== 'saved') {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warnUnsaved);
    return () => window.removeEventListener('beforeunload', warnUnsaved);
  }, [boardReady, saveStatus]);

  const saveCards = (newCards: BoardCard[]) => {
    setCards(newCards);
    persistBoard({ cards: newCards });
  };
  const saveConnections = (newConns: BoardConnection[]) => {
    setConnections(newConns);
    persistBoard({ connections: newConns });
  };
  const saveStrokes = (newStrokes: BoardStroke[]) => {
    setStrokes(newStrokes);
    persistBoard({ strokes: newStrokes });
  };

  // Converter coordenadas da tela (mouse) para o canvas com zoom e pan
  const screenToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const x = (clientX - rect.left - pan.x) / zoom;
      const y = (clientY - rect.top - pan.y) / zoom;
      return { x, y };
    },
    [pan, zoom]
  );

  // Adicionar novo card
  const handleAddCard = (customX?: number, customY?: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const x = customX !== undefined ? customX : ((rect?.width || 800) / 2 - pan.x) / zoom - 100;
    const y = customY !== undefined ? customY : ((rect?.height || 600) / 2 - pan.y) / zoom - 60;

    const matchedPalette = CARD_COLORS.find((c) => c.bg === selectedColor) || CARD_COLORS[0];

    const newCard: BoardCard = {
      id: crypto.randomUUID(),
      x: Math.round(x),
      y: Math.round(y),
      width: 210,
      height: 130,
      title: 'Novo Rabisco',
      content: 'Escreva livremente aqui sua mensagem, argumento ou script de vendas...',
      color: matchedPalette.bg,
      textColor: matchedPalette.text,
    };

    const updated = [...cards, newCard];
    saveCards(updated);
    showToast('Card adicionado ao quadro!');
  };

  // Duplicar card
  const handleDuplicateCard = (card: BoardCard, e: React.MouseEvent) => {
    e.stopPropagation();
    const newCard: BoardCard = {
      ...card,
      id: crypto.randomUUID(),
      x: card.x + 30,
      y: card.y + 30,
      title: `${card.title} (Cópia)`,
    };
    saveCards([...cards, newCard]);
    showToast('Card duplicado com sucesso!');
  };

  // Excluir card e conexões associadas
  const handleDeleteCard = (cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedCards = cards.filter((c) => c.id !== cardId);
    const updatedConns = connections.filter((conn) => conn.fromId !== cardId && conn.toId !== cardId);
    saveCards(updatedCards);
    saveConnections(updatedConns);
    showToast('Card excluído do quadro.');
  };

  // Alterar cor de um card específico
  const handleChangeCardColor = (cardId: string, bg: string, textColor: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = cards.map((c) => (c.id === cardId ? { ...c, color: bg, textColor } : c));
    saveCards(updated);
  };

  // Iniciar ou completar conexão entre cards
  const handleCardConnectClick = (cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tool !== 'connect' && !connectingFromId) {
      setConnectingFromId(cardId);
      setTool('connect');
      showToast('Selecione o segundo card para conectar');
      return;
    }

    if (!connectingFromId) {
      setConnectingFromId(cardId);
      showToast('Selecione o segundo card para concluir a ligação');
      return;
    }

    if (connectingFromId === cardId) {
      setConnectingFromId(null);
      showToast('Conexão cancelada.');
      return;
    }

    // Criar nova conexão
    const newConn: BoardConnection = {
      id: `conn-${Date.now()}`,
      fromId: connectingFromId,
      toId: cardId,
      label: 'Conexão',
    };

    saveConnections([...connections, newConn]);
    setConnectingFromId(null);
    setTool('select');
    showToast('Cards conectados com sucesso!');
  };

  // Excluir conexão
  const handleDeleteConnection = (connId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = connections.filter((c) => c.id !== connId);
    saveConnections(updated);
    setEditingConnectionId(null);
    showToast('Conexão removida.');
  };

  // Atualizar label da conexão
  const handleSaveConnectionLabel = (connId: string) => {
    const updated = connections.map((c) =>
      c.id === connId ? { ...c, label: connectionLabelInput.trim() || undefined } : c
    );
    saveConnections(updated);
    setEditingConnectionId(null);
    showToast('Etiqueta da conexão atualizada!');
  };

  // Reiniciar quadro com o modelo padrão
  const handleResetBoard = () => {
    if (window.confirm('Deseja restaurar o modelo inicial com os cards e conexões? Todas as alterações serão substituídas.')) {
      saveCards(INITIAL_CARDS);
      saveConnections(INITIAL_CONNECTIONS);
      saveStrokes([]);
      setPan({ x: 40, y: 40 });
      setZoom(1);
      showToast('Quadro restaurado com sucesso!');
    }
  };

  // Limpar todo o quadro
  const handleClearBoard = () => {
    if (window.confirm('Tem certeza de que deseja limpar completamente este quadro?')) {
      saveCards([]);
      saveConnections([]);
      saveStrokes([]);
      showToast('Quadro limpo.');
    }
  };

  // Limpar apenas rabiscos
  const handleClearStrokes = () => {
    saveStrokes([]);
    showToast('Rabiscos apagados.');
  };

  // Exportar quadro como JSON
  const handleExportJSON = () => {
    const data = {
      cards,
      connections,
      strokes,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evopixel-quadro-mensagens-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Arquivo do quadro exportado!');
  };

  // Manipulação de Mouse / Toque no Canvas
  const handleMouseDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('input, textarea, button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    // Clique com botão do meio ou modo de seleção em área vazia -> Pan
    if (e.button === 1 || (tool === 'select' && e.target === containerRef.current)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    // Modo Card -> Criar card no local do clique
    if (tool === 'card') {
      const pos = screenToCanvas(e.clientX, e.clientY);
      handleAddCard(pos.x - 100, pos.y - 60);
      setTool('select');
      return;
    }

    // Modo Pen -> Iniciar rabisco
    if (tool === 'pen') {
      const pos = screenToCanvas(e.clientX, e.clientY);
      setIsDrawing(true);
      setCurrentStroke({
        id: `stroke-${Date.now()}`,
        points: [pos],
        color: penColor,
        width: penWidth,
      });
      return;
    }
  };

  const handleMouseMove = (e: React.PointerEvent) => {
    // Pan do canvas
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    // Arrastar Card
    if (draggingCardId) {
      const pos = screenToCanvas(e.clientX, e.clientY);
      const newX = Math.round(pos.x - dragOffset.x);
      const newY = Math.round(pos.y - dragOffset.y);

      setCards((prev) =>
        prev.map((c) => (c.id === draggingCardId ? { ...c, x: newX, y: newY } : c))
      );
      return;
    }

    // Desenhar Rabisco
    if (isDrawing && currentStroke) {
      const pos = screenToCanvas(e.clientX, e.clientY);
      setCurrentStroke((prev) => (prev ? { ...prev, points: [...prev.points, pos] } : null));
      return;
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }

    if (draggingCardId) {
      // Salvar estado final no Supabase
      saveCards(cards);
      setDraggingCardId(null);
    }

    if (isDrawing && currentStroke) {
      if (currentStroke.points.length > 1) {
        saveStrokes([...strokes, currentStroke]);
      }
      setIsDrawing(false);
      setCurrentStroke(null);
    }
  };

  // Zoom pelo scroll do mouse
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = container.getBoundingClientRect();
        const nextZoom = Math.min(2.5, Math.max(0.3, zoom * (e.deltaY < 0 ? 1.08 : 0.92)));
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setPan({ x: x - (x - pan.x) * nextZoom / zoom, y: y - (y - pan.y) * nextZoom / zoom });
        setZoom(nextZoom);
      } else {
        setPan(previous => ({ x: previous.x - e.deltaX, y: previous.y - e.deltaY }));
      }
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [pan, zoom]);

  // Calcular curva Bézier suave entre dois cards para conexões estilo Miro
  const getCurvePath = (c1: BoardCard, c2: BoardCard) => {
    const startX = c1.x + c1.width;
    const startY = c1.y + c1.height / 2;
    const endX = c2.x;
    const endY = c2.y + c2.height / 2;

    const dx = Math.abs(endX - startX) * 0.55;
    const cp1x = startX + Math.max(dx, 40);
    const cp1y = startY;
    const cp2x = endX - Math.max(dx, 40);
    const cp2y = endY;

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;

    return {
      d: `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`,
      midX,
      midY,
    };
  };

  return (
    <div className="relative w-full h-full min-h-0 bg-[#050706] overflow-hidden select-none flex flex-col font-sans">
      {!boardReady && <div className="absolute inset-0 z-50 bg-[#07100F] flex flex-col items-center justify-center gap-3 p-6 text-[#E7ECE8]">
        <p role="status">{storageError || 'Carregando Rabisco...'}</p>
        {storageError && <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-xl bg-[#10201E]">Tentar novamente</button>}
      </div>}
      {boardReady && <div className="absolute bottom-3 left-20 z-40 max-w-[calc(100%-6rem)] rounded-xl bg-[#10201E] px-3 py-2 text-xs text-[#E7ECE8]" role="status">
        {saveStatus === 'saved' ? 'Salvo no Supabase' : saveStatus === 'saving' ? 'Salvando no Supabase...' : storageError}
        {saveStatus === 'error' && <button onClick={() => persistBoard({})} className="ml-3 underline">Tentar salvar novamente</button>}

      </div>}
      {/* ========================================================================= */}
      {/* 1. BARRA SUPERIOR (HEADER ESTILO MIRO / EVOCRM)                           */}
      {/* ========================================================================= */}
      <div ref={headerRef} className="min-h-14 px-4 py-2 gap-2 flex-wrap bg-[#07100F] border-b border-[rgba(218,241,222,0.08)] flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.1)] text-[#F1F9A1]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-heading font-semibold text-[#E7ECE8] flex items-center gap-2">
              Rabisco
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#10201E] border border-[rgba(218,241,222,0.08)] text-[#8EB69B]">
                {cards.length} cards • {connections.length} conexões
              </span>
            </h1>
            <p className="text-[11px] text-[#9BA6A0]">
              Escreva livremente, conecte ideias, crie fluxos e rabisque no quadro.
            </p>
          </div>
        </div>

        {/* Controles da Direita */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}
              className="p-1.5 rounded-lg text-[#9BA6A0] hover:text-[#E7ECE8] hover:bg-[#10201E] transition-colors"
              title="Diminuir Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-[#8EB69B] px-1 min-w-[40px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))}
              className="p-1.5 rounded-lg text-[#9BA6A0] hover:text-[#E7ECE8] hover:bg-[#10201E] transition-colors"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPan({ x: 40, y: 40 });
              }}
              className="px-2 py-1 rounded-lg text-[10px] font-mono text-[#9BA6A0] hover:text-[#E7ECE8] hover:bg-[#10201E] transition-colors"
              title="Ajustar 100%"
            >
              Reset
            </button>
          </div>

          {/* Botões de Ação */}
          <button
            type="button"
            onClick={handleResetBoard}
            className="p-2 rounded-xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] text-[#9BA6A0] hover:text-[#E7ECE8] hover:border-[rgba(218,241,222,0.2)] transition-all"
            title="Restaurar modelo inicial de exemplo"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            className="p-2 rounded-xl bg-[#0C1A19] border border-[rgba(218,241,222,0.08)] text-[#9BA6A0] hover:text-[#E7ECE8] hover:border-[rgba(218,241,222,0.2)] transition-all"
            title="Exportar backup do quadro (JSON)"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => handleAddCard()}
            className="px-3.5 py-1.5 rounded-xl bg-[#F1F9A1] hover:bg-[#d8e08d] text-[#07100F] text-xs font-heading font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-[#07100F]" />
            <span>+ Novo Card</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BARRA LATERAL FLUTUANTE DE FERRAMENTAS (ESTILO MIRO)                    */}
      {/* ========================================================================= */}
      <div style={{ top: headerHeight + 16 }} className="absolute left-4 z-40 flex flex-col items-center bg-[#07100F]/95 backdrop-blur-md border border-[rgba(218,241,222,0.12)] p-2 rounded-2xl shadow-2xl gap-2">
        {/* Ferramenta: Selecionar / Mover */}
        <button
          type="button"
          onClick={() => {
            setTool('select');
            setConnectingFromId(null);
          }}
          className={`p-2.5 rounded-xl transition-all relative group ${
            tool === 'select'
              ? 'bg-[#10201E] text-[#F1F9A1] border border-[rgba(241,249,161,0.3)] shadow-sm'
              : 'text-[#9BA6A0] hover:text-[#E7ECE8] hover:bg-[#10201E]/60'
          }`}
          title="Selecionar / Mover Cards"
        >
          <MousePointer className="w-4 h-4" />
          <span className="sr-only">Mover</span>
        </button>

        {/* Ferramenta: Novo Card */}
        <button
          type="button"
          onClick={() => {
            setTool('card');
            setConnectingFromId(null);
          }}
          className={`p-2.5 rounded-xl transition-all relative group ${
            tool === 'card'
              ? 'bg-[#10201E] text-[#F1F9A1] border border-[rgba(241,249,161,0.3)] shadow-sm'
              : 'text-[#9BA6A0] hover:text-[#E7ECE8] hover:bg-[#10201E]/60'
          }`}
          title="Adicionar Card de Mensagem (Clique no quadro)"
        >
          <Square className="w-4 h-4" />
          <span className="sr-only">Card</span>
        </button>

        {/* Ferramenta: Conectar Cards */}
        <button
          type="button"
          onClick={() => {
            setTool('connect');
            setConnectingFromId(null);
            showToast('Clique no 1º card e depois no 2º para conectá-los');
          }}
          className={`p-2.5 rounded-xl transition-all relative group ${
            tool === 'connect'
              ? 'bg-[#10201E] text-[#F1F9A1] border border-[rgba(241,249,161,0.3)] shadow-sm'
              : 'text-[#9BA6A0] hover:text-[#E7ECE8] hover:bg-[#10201E]/60'
          }`}
          title="Conectar Cards com Setas e Linhas"
        >
          <Link2 className="w-4 h-4" />
          <span className="sr-only">Conectar</span>
        </button>

        {/* Ferramenta: Caneta / Rabiscar */}
        <button
          type="button"
          onClick={() => {
            setTool('pen');
            setConnectingFromId(null);
          }}
          className={`p-2.5 rounded-xl transition-all relative group ${
            tool === 'pen'
              ? 'bg-[#10201E] text-[#F1F9A1] border border-[rgba(241,249,161,0.3)] shadow-sm'
              : 'text-[#9BA6A0] hover:text-[#E7ECE8] hover:bg-[#10201E]/60'
          }`}
          title="Rabiscar / Desenhar Livremente no Quadro"
        >
          <PenTool className="w-4 h-4" />
          <span className="sr-only">Rabiscar</span>
        </button>

        {/* Seletor de Cores de Rabisco quando a ferramenta Pen está ativa */}
        {tool === 'pen' && (
          <div className="pt-2 border-t border-[rgba(218,241,222,0.1)] flex flex-col items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100">
            {PEN_COLORS.map((pc) => (
              <button
                key={pc.value}
                type="button"
                onClick={() => setPenColor(pc.value)}
                className={`w-4 h-4 rounded-full border transition-all ${
                  penColor === pc.value ? 'scale-125 border-white ring-2 ring-white/20' : 'border-transparent'
                }`}
                style={{ backgroundColor: pc.value }}
                title={pc.name}
              />
            ))}
            <div className="w-full h-px bg-[rgba(218,241,222,0.1)] my-1" />
            <button
              type="button"
              onClick={handleClearStrokes}
              className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
              title="Limpar todos os rabiscos"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="w-full h-px bg-[rgba(218,241,222,0.08)] my-1" />

        {/* Limpar Quadro */}
        <button
          type="button"
          onClick={handleClearBoard}
          className="p-2.5 rounded-xl text-[#9BA6A0] hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="Limpar Todo o Quadro"
        >
          <Trash2 className="w-4 h-4" />
          <span className="sr-only">Limpar</span>
        </button>
      </div>

      {/* Dica / Status da Ferramenta Ativa */}
      {tool === 'connect' && (
        <div style={{ top: headerHeight + 8 }} className="absolute left-20 right-3 sm:right-auto z-40 bg-[#10201E] border border-[rgba(241,249,161,0.3)] text-[#F1F9A1] px-3.5 py-1.5 rounded-xl text-xs font-mono shadow-xl flex items-center gap-2 animate-in fade-in">
          <Link2 className="w-3.5 h-3.5 text-[#F1F9A1]" />
          <span>
            {connectingFromId
              ? 'Card de origem selecionado. Clique no card de destino!'
              : 'Clique no primeiro card para iniciar a linha de conexão.'}
          </span>
          <button
            type="button"
            onClick={() => {
              setConnectingFromId(null);
              setTool('select');
            }}
            className="p-0.5 rounded text-[#9BA6A0] hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {tool === 'pen' && (
        <div style={{ top: headerHeight + 8 }} className="absolute left-20 right-3 sm:right-auto z-40 bg-[#10201E] border border-[rgba(142,182,155,0.3)] text-[#8EB69B] px-3.5 py-1.5 rounded-xl text-xs font-mono shadow-xl flex items-center gap-2 animate-in fade-in">
          <PenTool className="w-3.5 h-3.5" />
          <span>Modo Rabisco Ativo: Desenhe livremente com o mouse ou toque.</span>
        </div>
      )}

      {/* Toast Notificação */}
      {toastMsg && (
        <div className="absolute bottom-6 right-6 z-50 bg-[#10201E] border border-[#8EB69B]/40 text-[#E7ECE8] px-4 py-2 rounded-xl text-xs font-mono shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <Check className="w-3.5 h-3.5 text-[#8EB69B]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ÁREA DO QUADRO / CANVAS COM GRID DE PONTOS                             */}
      {/* ========================================================================= */}
      <div
        ref={containerRef}
        data-testid="rabisco-canvas"
        onPointerDown={handleMouseDown}
        onPointerMove={handleMouseMove}
        onPointerUp={handleMouseUp}
        onPointerCancel={handleMouseUp}
        className={`relative flex-1 min-h-0 w-full overflow-hidden touch-none cursor-${
          tool === 'pen' ? 'crosshair' : tool === 'card' ? 'copy' : isPanning ? 'grabbing' : 'default'
        }`}
        style={{
          backgroundColor: '#050706',
          backgroundImage: `radial-gradient(rgba(218, 241, 222, 0.12) 1px, transparent 1px)`,
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {/* CONTAINER COM ZOOM E PAN APLICADOS */}
        <div
          className="absolute inset-0 origin-top-left pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* ===================================================================== */}
          {/* 3.1. CAMADA SVG: CONEXÕES, SETAS E RABISCOS                          */}
          {/* ===================================================================== */}
          <svg className="absolute top-0 left-0 w-[5000px] h-[5000px] overflow-visible pointer-events-none">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="4"
                orient="auto"
              >
                <path d="M 0 0 L 8 4 L 0 8 Z" fill="#8EB69B" opacity="0.85" />
              </marker>
              <marker
                id="arrowhead-active"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="4"
                orient="auto"
              >
                <path d="M 0 0 L 8 4 L 0 8 Z" fill="#F1F9A1" />
              </marker>
            </defs>

            {/* Linhas de Conexão entre Cards */}
            {connections.map((conn) => {
              const c1 = cards.find((c) => c.id === conn.fromId);
              const c2 = cards.find((c) => c.id === conn.toId);
              if (!c1 || !c2) return null;

              const { d, midX, midY } = getCurvePath(c1, c2);

              return (
                <g key={conn.id} className="pointer-events-auto group/line">
                  {/* Linha invisível mais espessa para facilitar clique */}
                  <path
                    d={d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="18"
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingConnectionId(conn.id);
                      setConnectionLabelInput(conn.label || '');
                    }}
                  />

                  {/* Linha Curva Visível */}
                  <path
                    d={d}
                    fill="none"
                    stroke="#8EB69B"
                    strokeWidth="2.5"
                    strokeOpacity="0.8"
                    markerEnd="url(#arrowhead)"
                    className="transition-all group-hover/line:stroke-[#F1F9A1] group-hover/line:stroke-[3.5px]"
                  />

                  {/* Etiqueta / Label da Linha de Conexão */}
                  {conn.label && (
                    <g
                      transform={`translate(${midX}, ${midY})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingConnectionId(conn.id);
                        setConnectionLabelInput(conn.label || '');
                      }}
                      className="cursor-pointer"
                    >
                      <rect
                        x={-(conn.label.length * 3.5 + 12)}
                        y="-11"
                        width={conn.label.length * 7 + 24}
                        height="22"
                        rx="11"
                        fill="#0C1A19"
                        stroke="#8EB69B"
                        strokeWidth="1.2"
                        opacity="0.95"
                      />
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        fill="#E7ECE8"
                        fontSize="11"
                        fontFamily="ui-monospace, monospace"
                        fontWeight="500"
                      >
                        {conn.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Rabiscos Salvos (Strokes) */}
            {strokes.map((stroke) => {
              if (stroke.points.length < 2) return null;
              const pathData = stroke.points.reduce(
                (acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
                ''
              );
              return (
                <path
                  key={stroke.id}
                  d={pathData}
                  fill="none"
                  stroke={stroke.color}
                  strokeWidth={stroke.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.9"
                />
              );
            })}

            {/* Rabisco Atual sendo desenhado no momento */}
            {currentStroke && currentStroke.points.length > 1 && (
              <path
                d={currentStroke.points.reduce(
                  (acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
                  ''
                )}
                fill="none"
                stroke={currentStroke.color}
                strokeWidth={currentStroke.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.95"
              />
            )}
          </svg>

          {/* ===================================================================== */}
          {/* 3.2. CARDS / MENSAGENS INTERATIVAS (ESCREVER LIVREMENTE & ARRASTAR)   */}
          {/* ===================================================================== */}
          {cards.map((card) => {
            const isConnecting = connectingFromId === card.id;

            return (
              <div
                key={card.id}
                onPointerDown={(e) => {
                  if ((e.target as HTMLElement).closest('input, textarea, button')) return;
                  if (tool === 'connect') {
                    handleCardConnectClick(card.id, e);
                    return;
                  }
                  if (tool !== 'select') return;

                  // Iniciar arrasto se não estiver clicando em textarea ou botões
                  const target = e.target as HTMLElement;
                  if (
                    target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.tagName === 'BUTTON' ||
                    target.closest('button')
                  ) {
                    return;
                  }

                  const pos = screenToCanvas(e.clientX, e.clientY);
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDraggingCardId(card.id);
                  setDragOffset({ x: pos.x - card.x, y: pos.y - card.y });
                }}
                className={`absolute pointer-events-auto rounded-2xl shadow-xl transition-shadow flex flex-col group select-text ${
                  isConnecting
                    ? 'ring-4 ring-[#F1F9A1] shadow-2xl scale-[1.02]'
                    : 'hover:shadow-2xl hover:scale-[1.01]'
                }`}
                style={{
                  transform: `translate(${card.x}px, ${card.y}px)`,
                  width: `${card.width}px`,
                  minHeight: `${card.height}px`,
                  backgroundColor: card.color,
                  color: card.textColor || '#07100F',
                }}
              >
                {/* Cabeçalho do Card com Título Editável e Ações */}
                <div className="px-3.5 pt-3 pb-1 flex items-center justify-between gap-1 border-b border-black/10">
                  <input
                    aria-label="Título do rabisco"
                    type="text"
                    value={card.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      const updated = cards.map((c) =>
                        c.id === card.id ? { ...c, title: newTitle } : c
                      );
                      saveCards(updated);
                    }}
                    placeholder="Título da Mensagem..."
                    className="w-full bg-transparent font-heading font-semibold text-xs focus:outline-none focus:bg-white/30 rounded px-1 -ml-1 transition-colors"
                    style={{ color: card.textColor || '#07100F' }}
                  />

                  {/* Ações do Card */}
                  <div className="flex items-center gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity shrink-0">
                    {/* Botão de Conectar Rápido */}
                    <button
                      type="button"
                      onClick={(e) => handleCardConnectClick(card.id, e)}
                      className="p-1 rounded hover:bg-black/15 transition-colors"
                      title="Conectar a outro card"
                    >
                      <Link2 className="w-3 h-3" />
                    </button>

                    {/* Duplicar Card */}
                    <button
                      type="button"
                      onClick={(e) => handleDuplicateCard(card, e)}
                      className="p-1 rounded hover:bg-black/15 transition-colors"
                      title="Duplicar Card"
                    >
                      <Copy className="w-3 h-3" />
                    </button>

                    {/* Excluir Card */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCard(card.id, e)}
                      className="p-1 rounded hover:bg-black/15 hover:text-red-700 transition-colors"
                      title="Excluir Card"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Conteúdo / Texto Livre da Mensagem */}
                <div className="p-3 flex-1 flex flex-col">
                  <textarea
                    aria-label="Texto do rabisco"
                    value={card.content}
                    onChange={(e) => {
                      const newContent = e.target.value;
                      const updated = cards.map((c) =>
                        c.id === card.id ? { ...c, content: newContent } : c
                      );
                      saveCards(updated);
                    }}
                    placeholder="Escreva livremente aqui o texto da mensagem, gatilhos, scripts ou anotações..."
                    rows={4}
                    className="w-full flex-1 bg-transparent resize-none text-[11px] leading-relaxed focus:outline-none focus:bg-white/20 rounded p-1 -m-1 transition-colors"
                    style={{ color: card.textColor || '#07100F' }}
                  />
                </div>

                {/* Rodapé do Card com Seletor Rápido de Cor */}
                <div className="px-3 pb-2.5 pt-1 flex items-center justify-between text-[10px] opacity-25 group-hover:opacity-100 transition-opacity">
                  <span className="font-mono text-[9px] uppercase tracking-wider">
                    Evo Card
                  </span>

                  <div className="flex items-center gap-1">
                    {CARD_COLORS.map((col) => (
                      <button
                        key={col.bg}
                        type="button"
                        onClick={(e) => handleChangeCardColor(card.id, col.bg, col.text, e)}
                        className={`w-3.5 h-3.5 rounded-full border transition-all ${
                          card.color === col.bg
                            ? 'scale-125 border-black/60 shadow-sm'
                            : 'border-black/20 hover:scale-110'
                        }`}
                        style={{ backgroundColor: col.bg }}
                        title={col.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL PARA EDITAR OU EXCLUIR RÓTULO DE CONEXÃO                         */}
      {/* ========================================================================= */}
      {editingConnectionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-[#0C1A19] border border-[rgba(218,241,222,0.15)] rounded-2xl p-5 shadow-2xl space-y-4 text-[#E7ECE8]">
            <div className="flex items-center justify-between border-b border-[rgba(218,241,222,0.06)] pb-3">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-[#8EB69B]" />
                <h3 className="text-sm font-heading font-semibold text-[#E7ECE8]">
                  Editar Conexão
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingConnectionId(null)}
                className="p-1 rounded-lg text-[#9BA6A0] hover:text-[#E7ECE8]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#9BA6A0] block">
                Texto / Etiqueta da Conexão:
              </label>
              <input
                type="text"
                value={connectionLabelInput}
                onChange={(e) => setConnectionLabelInput(e.target.value)}
                placeholder="Ex: Includes, Requer, Follow-up, Se responder..."
                className="w-full px-3 py-2 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.1)] text-xs text-[#E7ECE8] placeholder-[#65706A] focus:outline-none focus:border-[#8EB69B]"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={(e) => handleDeleteConnection(editingConnectionId, e)}
                className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-medium border border-red-500/30 flex items-center gap-1.5 transition-all"
              >
                <Trash2 className="w-3 h-3" />
                Excluir Conexão
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingConnectionId(null)}
                  className="px-3 py-1.5 rounded-xl bg-[#10201E] text-[#9BA6A0] hover:text-[#E7ECE8] text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveConnectionLabel(editingConnectionId)}
                  className="px-4 py-1.5 rounded-xl bg-[#8EB69B] hover:bg-[#a1cca8] text-[#07100F] text-xs font-heading font-semibold transition-colors"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
