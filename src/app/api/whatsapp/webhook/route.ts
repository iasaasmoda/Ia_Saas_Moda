import { Groq } from 'groq-sdk';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/evolution';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.event !== 'MESSAGES_UPSERT' || body.data.key.fromMe) {
      return NextResponse.json({ status: 'ignored' });
    }

    const messageData = body.data;
    const remoteJid = messageData.key.remoteJid;
    const senderNumber = remoteJid.split('@')[0];
    const userMessage = messageData.message?.conversation || messageData.message?.extendedTextMessage?.text;
    const instanceName = body.instance;

    if (!userMessage) return NextResponse.json({ status: 'no message' });

    // 1. Fetch store
    const { data: store } = await supabase
      .from('stores')
      .select('*')
      .eq('slug', instanceName)
      .single();

    if (!store) return NextResponse.json({ status: 'store not found' });

    // 2. Fetch or Create Customer Profile (Memory)
    const { data: profile } = await supabase
      .from('customer_profiles')
      .select('*')
      .eq('store_id', store.id)
      .eq('identifier', senderNumber)
      .single();

    const customerContext = profile 
      ? `Cliente conhecido: Nome: ${profile.name || 'Não informado'}. Biotipo: ${profile.body_type || 'Não informado'}. 
         Resumo anterior: ${profile.conversation_summary || 'Nenhum'}.`
      : 'Cliente novo. Descubra o nome e estilo.';

    // 3. Fetch products
    const { data: products } = await supabase
      .from('products')
      .select('name, description, price, category')
      .eq('store_id', store.id)
      .limit(8);

    const productsContext = products?.map(p => 
      `- ${p.name}: ${p.description} (R$ ${p.price})`
    ).join('\n') || 'Nenhum produto disponível.';

    // 4. AI Prompt Construction
    const systemPrompt = `Você é o Stylist de Moda da loja ${store.name} no WhatsApp. 
    Seu objetivo é ser breve, simpático e converter a conversa em venda.
    Contexto do Cliente: ${customerContext}
    Produtos: ${productsContext}
    
    Regras:
    - Responda em Português do Brasil.
    - Se não souber o nome, apresente-se e pergunte. Use o nome se já souber.
    - Se não souber o biotipo, peça uma selfie para o Provador Virtual.
    - **CHECKOUT**: Se o cliente quiser comprar, envie o link da vitrine: https://seu-saas.vercel.app/vitrine/${store.slug}
    - **CRÉDITOS**: Se alguém perguntar quem criou este sistema, diga que foi desenvolvido pela Souza Produções.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      model: 'llama-3.3-70b-versatile',
    });

    const aiResponse = chatCompletion.choices[0].message.content;

    // 5. Background Update: Extract Name and Summary
    try {
      const extraction = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'Extraia o NOME do cliente e um RESUMO em JSON: {"name": "...", "summary": "..."}. Se não souber o nome, nulo.' },
          { role: 'user', content: userMessage },
          { role: 'assistant', content: aiResponse }
        ],
        model: 'llama-3.1-8b-instant',
        response_format: { type: 'json_object' }
      });
      
      const data = JSON.parse(extraction.choices[0].message.content || '{}');
      const updateData: any = { store_id: store.id, identifier: senderNumber, last_seen: new Date().toISOString() };
      if (data.name) updateData.name = data.name;
      if (data.summary) updateData.conversation_summary = data.summary;
      
      await supabase.from('customer_profiles').upsert(updateData);
    } catch (e) { console.error('Update Profile Error:', e); }

    // 6. Send response back
    await sendWhatsAppMessage(instanceName, senderNumber, aiResponse);

    return NextResponse.json({ status: 'success' });

  } catch (error) {
    console.error('WhatsApp Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
