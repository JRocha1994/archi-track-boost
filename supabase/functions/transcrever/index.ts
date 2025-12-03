// deno-lint-ignore-file no-explicit-any
declare const Deno: any;

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

async function base64ToBlob(base64: string, mimeType: string): Promise<Blob> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType || 'application/octet-stream' });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return json({ error: 'OPENAI_API_KEY not set' }, 500);

    const body = await req.json();
    const { audioBase64, filename, mimeType } = body || {};
    if (!audioBase64) return json({ error: 'audioBase64 is required' }, 400);

    const fileBlob = await base64ToBlob(audioBase64, mimeType || 'audio/mpeg');
    const form = new FormData();
    const fileName = filename || 'audio.webm';
    form.append('file', new File([fileBlob], fileName, { type: mimeType || 'application/octet-stream' }));
    form.append('model', 'whisper-1');
    form.append('response_format', 'json');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!res.ok) {
      const err = await res.text();
      return json({ error: 'OpenAI transcription error', details: err }, res.status);
    }

    const data = await res.json();
    const transcript = data?.text ?? '';
    return json({ transcript });
  } catch (err: any) {
    return json({ error: 'Unexpected error', details: String(err?.message || err) }, 500);
  }
});

export {};
