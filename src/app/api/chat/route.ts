import { Groq } from 'groq-sdk';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ═══════════════════════════════════════════════════════════════════════════════
// 🚨 REGRAS DE PERSONALIDADE (LUNA 6.0 - FOCO EM LINKS BLINDADOS)
// ═══════════════════════════════════════════════════════════════════════════════

const STRICT_RULES = {
  MAX_SENTENCES: 2,
  MAX_EMOJIS: 2,
  ONE_QUESTION: true,
  NO_DEFENSIVE: true,
  NO_FILLERS: true,
  SHORT_MAX_CHARS: 200,
};

interface CustomerProfile {
  id?: string;
  store_id: string;
  identifier: string;
  name: string | null;
}

type SalesStage = 'AWAKENING' | 'DISCOVERY' | 'QUALIFICATION' | 'PRESENTATION' | 'CLOSING';

const STAGE_PROMPTS: Record<SalesStage, string> = {
  AWAKENING: `Você é Luna, stylist humana. Se o cliente disser apenas o nome, responda: "Olá [Nome]! 👋 O que você está procurando hoje?" NÃO mostre produtos agora.`,
  DISCOVERY: `Você é Luna. O cliente disse o que quer. Valide o gosto dele e pergunte algo simples para ajudar na escolha (ocasião ou estilo). NÃO mostre o catálogo ainda.`,
  QUALIFICATION: `Você é Luna. O cliente deu detalhes. Agora você pode sugerir 1 ou 2 itens.`,
  PRESENTATION: `Você é Luna. O cliente pediu para ver ou deu detalhes. 
REGRAS DE LINK:
- Use EXATAMENTE este formato: Nome do Produto - R$ Valor [Ver Foto](URL)
- O link DEVE estar na mesma linha do nome.
- NUNCA coloque quebras de linha entre o texto e o link.`,
  CLOSING: `Você é Luna. O cliente quer comprar. Confirme e pergunte a forma de pagamento.`,
};

function determineStage(message: string, history: any[]): SalesStage {
  const msg = message.toLowerCase();
  const userMessages = history.filter(h => h.role === 'user').length;
  if (/quero comprar|levar|pagar|pix|cartão|valor|preço/i.test(msg)) return 'CLOSING';
  if (/mostre|ver|tem aí|estoque|opções|catálogo|sugestões/i.test(msg)) return 'PRESENTATION';
  if (userMessages === 0 || (userMessages === 1 && message.length < 15)) return 'AWAKENING';
  return 'DISCOVERY';
}

async function getStock(storeId: string) {
  const { data } = await supabase
    .from('products')
    .select('name, price, image_url, category')
    .eq('store_id', storeId)
    .limit(3);
  return data || [];
}

export async function POST(req: Request) {
  try {
    const { message, storeId, history = [] } = await req.json();
    const visitorId = req.headers.get('x-visitor-id') || 'anonymous';

    const [{ data: profile }, products] = await Promise.all([
      supabase.from('customer_profiles').select('*').eq('store_id', storeId).eq('identifier', visitorId).single(),
      getStock(storeId)
    ]);

    const stage = determineStage(message, history);
    
    const stockContext = products.length > 0 
      ? products.map(p => `• ${p.name} | R$ ${p.price} | Link: ${p.image_url}`).join('\n')
      : 'Estoque vazio.';

    const systemPrompt = `Você é Luna, Stylist de Moda Humana.
    
ESTOQUE REAL:
${stockContext}

REGRAS CRÍTICAS DE FORMATAÇÃO:
1. Se o cliente apenas disse o nome, NÃO mostre produtos.
2. LINKS: Use SEMPRE o formato Markdown colado ao texto: [Ver Foto](URL). 
3. PROIBIDO: Nunca coloque parênteses extras ou quebras de linha que separem o [Ver Foto] da (URL).
4. O link deve ser uma linha única: "Produto - R$ 100 [Ver Foto](URL)"
5. Máximo 2 frases curtas.

${STAGE_PROMPTS[stage]}`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.slice(-3),
        { role: 'user', content: message }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3, // Baixado para ser mais preciso na formatação
      max_tokens: 250,
    });

    let responseText = completion.choices[0].message.content || '';

    // Salva Nome se detectado
    let currentName = profile?.name;
    if (!currentName && stage === 'AWAKENING' && message.length < 15 && !/oi|olá/i.test(message)) {
        currentName = message.trim();
    }

    await supabase.from('customer_profiles').upsert({
      store_id: storeId,
      identifier: visitorId,
      name: currentName,
      last_seen: new Date().toISOString(),
    }, { onConflict: 'store_id,identifier' });

    return NextResponse.json({
      response: responseText,
      history: [...history, { role: 'user', content: message }, { role: 'assistant', content: responseText }]
    });

  } catch (error) {
    return NextResponse.json({ response: 'Ops! Pode repetir? 😊' });
  }
}
