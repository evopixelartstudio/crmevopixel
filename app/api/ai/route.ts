import { NextResponse } from 'next/server';
import { requireCrmApi } from '@/lib/server/crm-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const denied = await requireCrmApi(request);
  if (denied) return denied;
  return NextResponse.json({ gemini: !!process.env.GEMINI_API_KEY, claude: !!process.env.ANTHROPIC_API_KEY });
}

export async function POST(request: Request) {
  const denied = await requireCrmApi(request);
  if (denied) return denied;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 262144) return NextResponse.json({ error: 'Contexto muito grande.' }, { status: 413 });
    const body = JSON.parse(raw);
    if (!['gemini', 'claude'].includes(body.provider) || !['test', 'completion'].includes(body.action) || typeof body.model !== 'string' || !/^[a-zA-Z0-9_.-]{1,100}$/.test(body.model)) return NextResponse.json({ error: 'Provedor ou modelo inválido.' }, { status: 400 });
    const key = body.provider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.ANTHROPIC_API_KEY;
    if (!key) return NextResponse.json({ error: 'Solicite ao administrador a configuração da chave de IA no servidor.' }, { status: 503 });
    const test = body.action === 'test';
    if (!test && (typeof body.userPrompt !== 'string' || typeof body.systemPrompt !== 'string')) return NextResponse.json({ error: 'Mensagem inválida.' }, { status: 400 });
    const prompt = test ? 'Responda apenas OK.' : body.userPrompt;
    const system = test ? '' : `${body.systemPrompt}\n\n[CONTEXTO ATUAL DO CRM]:\n${JSON.stringify(body.contextData || {})}`;
    const temperature = typeof body.temperature === 'number' && Number.isFinite(body.temperature) ? Math.max(0, Math.min(1, body.temperature)) : 0.4;
    const gemini = body.provider === 'gemini';
    const response = await fetch(gemini ? `https://generativelanguage.googleapis.com/v1beta/models/${body.model}:generateContent` : 'https://api.anthropic.com/v1/messages', {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(30000),
      headers: gemini ? { 'Content-Type': 'application/json', 'x-goog-api-key': key } : { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(gemini ? { ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}), contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature, maxOutputTokens: test ? 25 : 800 } } : { model: body.model, ...(system ? { system } : {}), max_tokens: test ? 25 : 800, temperature, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!response.ok) return NextResponse.json({ error: `O provedor de IA retornou HTTP ${response.status}. Revise o modelo e a configuração do servidor.` }, { status: 502 });
    const data = await response.json();
    const reply = gemini ? data.candidates?.[0]?.content?.parts?.[0]?.text : data.content?.[0]?.text;
    if (typeof reply !== 'string') return NextResponse.json({ error: 'O provedor não retornou uma resposta.' }, { status: 502 });
    return NextResponse.json({ text: reply.trim(), provider: gemini ? 'Google Gemini' : 'Anthropic Claude', model: body.model });
  } catch { return NextResponse.json({ error: 'Não foi possível acessar o provedor de IA. Tente novamente.' }, { status: 503 }); }
}
