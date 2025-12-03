// deno-lint-ignore-file no-explicit-any
declare const Deno: any;
// Supabase Edge Function: parse-revisao
// Recebe { prompt } e retorna { draft: {...} } com campos estruturados

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: any, init: number | ResponseInit = 200) {
  const status = typeof init === 'number' ? init : init?.status ?? 200;
  const headers = typeof init === 'number' ? {} : (init?.headers ?? {});

  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders, ...headers },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return json({ error: 'OPENAI_API_KEY not set' }, 500);

    const body = await req.json();
    const { prompt, contexto } = body || {};
    if (!prompt || typeof prompt !== 'string') return json({ error: 'prompt is required' }, 400);
    
    // Contexto opcional: array de revisões existentes
    const contextoStr = Array.isArray(contexto) && contexto.length > 0
      ? `\n\nCONTEXTO DAS REVISÕES EXISTENTES:\n${JSON.stringify(contexto, null, 2)}`
      : '';

    const system = `Você é um assistente que extrai campos de revisões de projetos para um sistema.\n\
Se o usuário mencionar MÚLTIPLAS revisões (ex: "3 revisões", "mais 3 revisões"), retorne um ARRAY de drafts.\n\
Retorne APENAS um JSON no formato a seguir e nada mais (sem comentários, sem texto extra):\n\
{\n  "drafts": [\n    {\n      "empreendimentoId": null,\n      "obraId": null,\n      "disciplinaId": null,\n      "projetistaId": null,\n      "empreendimentoNome": <string|null>,\n      "obraNome": <string|null>,\n      "disciplinaNome": <string|null>,\n      "projetistaNome": <string|null>,\n      "numeroRevisao": <number|null>,\n      "dataPrevistaEntrega": <yyyy-mm-dd|null>,\n      "dataEntrega": <yyyy-mm-dd|null>,\n      "dataPrevistaAnalise": null,\n      "dataAnalise": <yyyy-mm-dd|null>,\n      "justificativa": <string|null>\n    }\n  ]\n}\n\
Regras:\n\
- Use datas no formato ISO yyyy-mm-dd quando possível.\n\
- Se o usuário citar "revisão 2" ou "R02", extraia numeroRevisao = 2.\n\
- Se não houver informação, retorne null para o campo.\n\
- Não invente IDs; deixe-os null (serão selecionados na UI).\n\
- Preencha os Nomes (empreendimentoNome, obraNome, disciplinaNome, projetistaNome) exatamente como aparecerem no texto.\n\
- Não preencha dataPrevistaAnalise (será calculada no front).\n\
- Se o usuário mencionar múltiplas revisões, crie um objeto para cada uma no array "drafts".\n\
- Se mencionar apenas uma revisão, retorne um array com um único elemento.\n\
- **IMPORTANTE**: Se receber um CONTEXTO de revisões existentes, analise-o para determinar o próximo número de revisão.\n\
  - Exemplo: se o contexto mostrar revisões 0, 1, 3 para o mesmo empreendimento/obra/disciplina/projetista, e o usuário pedir "mais 3 revisões", sugira números 4, 5, 6.\n\
  - Se o usuário não especificar números, calcule automaticamente baseado no maior número existente no contexto para aquela combinação.\n\
  - Se não houver contexto ou não houver revisões para aquela combinação, comece do 0.`;

    const payload = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt + contextoStr },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    };

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      return json({ error: 'OpenAI parsing error', details: err }, res.status);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    let parsed: any = {};
    try {
      parsed = JSON.parse(content || '{}');
    } catch (_e) {
      return json({ error: 'Invalid JSON from model' }, 500);
    }

    const draftsRaw = parsed?.drafts ?? [];
    if (!Array.isArray(draftsRaw)) {
      return json({ error: 'Expected "drafts" array in response' }, 500);
    }

    // Normalização básica
    const norm = (v: any) => (v === undefined || v === null ? null : v);
    const safeDrafts = draftsRaw.map((draft: any) => ({
      empreendimentoId: norm(draft.empreendimentoId),
      obraId: norm(draft.obraId),
      disciplinaId: norm(draft.disciplinaId),
      projetistaId: norm(draft.projetistaId),
      empreendimentoNome: draft.empreendimentoNome || null,
      obraNome: draft.obraNome || null,
      disciplinaNome: draft.disciplinaNome || null,
      projetistaNome: draft.projetistaNome || null,
      numeroRevisao: typeof draft.numeroRevisao === 'number' ? draft.numeroRevisao : (draft.numeroRevisao ? Number(draft.numeroRevisao) : null),
      dataPrevistaEntrega: draft.dataPrevistaEntrega || null,
      dataEntrega: draft.dataEntrega || null,
      dataPrevistaAnalise: null,
      dataAnalise: draft.dataAnalise || null,
      justificativa: draft.justificativa || null,
    }));

    return json({ drafts: safeDrafts });
  } catch (err: any) {
    return json({ error: 'Unexpected error', details: String(err?.message || err) }, 500);
  }
});

export {};
