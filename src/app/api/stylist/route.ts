import { Groq } from 'groq-sdk';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    const { message, storeId, history = [] } = await req.json();

    const { data: products } = await supabase
      .from('products')
      .select('name, description, price, category, image_url')
      .eq('store_id', storeId)
      .limit(3);

    const productsContext = products && products.length > 0
      ? products.map((p: any) => 
          `• ${p.name} | R$ ${p.price} | Link: ${p.image_url}`
        ).join('\n')
      : 'Nenhum produto cadastrado.';

    const systemPrompt = `Você é Luna, Stylist de Moda Humana.
    
ESTOQUE REAL:
${productsContext}

REGRAS CRÍTICAS DE FORMATAÇÃO:
1. Se o cliente apenas disse o nome, NÃO mostre produtos.
2. LINKS: Use SEMPRE o formato Markdown colado ao texto: [Ver Foto](URL). 
3. PROIBIDO: Nunca coloque parênteses extras ou quebras de linha que separem o [Ver Foto] da (URL).
4. O link deve ser uma linha única: "Produto - R$ 100 [Ver Foto](URL)"
5. Máximo 2 frases curtas.`;

    const chat = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.slice(-3),
        { role: 'user', content: message },
      ],
      model: 'llama-3.3-70b-versatile',
      max_tokens: 250,
      temperature: 0.3,
    });

    const responseText = chat.choices[0].message.content;

    return NextResponse.json({ 
      response: responseText,
      history: [...history, 
        { role: 'user', content: message }, 
        { role: 'assistant', content: responseText }
      ]
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
