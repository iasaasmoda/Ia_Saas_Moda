import { Groq } from 'groq-sdk';
import { NextResponse } from 'next/server';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    const multimodalContent = [
      {
        type: 'text',
        text: 'Analise esta foto de corpo inteiro e identifique o biotipo predominante para fins de moda. Escolha apenas UMA das opções: "slim", "average", "athletic", "plus-size". Responda APENAS com a palavra da categoria escolhida.'
      },
      {
        type: 'image_url',
        image_url: { url: imageUrl }
      }
    ];

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: multimodalContent as any,
        }
      ],
      model: 'llama-3.2-11b-vision-preview',
    });

    const bodyType = completion.choices[0].message.content?.trim().toLowerCase();

    return NextResponse.json({ bodyType });

  } catch (error) {
    console.error('Analyze Body Error:', error);
    return NextResponse.json({ error: 'Falha ao analisar biotipo' }, { status: 500 });
  }
}
