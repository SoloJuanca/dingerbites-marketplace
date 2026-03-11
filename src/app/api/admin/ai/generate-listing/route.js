import { NextResponse } from 'next/server';
import { buildListingPrompts } from '../../../../../lib/ai/listingPrompt';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { images = [], contextText = '', currentFields = {} } = body || {};

    if ((!contextText || !contextText.trim()) && (!images || images.length === 0)) {
      return NextResponse.json(
        { error: 'Se requiere al menos texto de contexto o una imagen' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY || process.env.AI_PROVIDER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Configuración de IA no disponible (falta API key)' },
        { status: 500 }
      );
    }

    const { systemPrompt, userPrompt } = buildListingPrompts({
      contextText,
      images,
      currentFields
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('OpenAI API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Error al generar sugerencias con IA' },
        { status: 502 }
      );
    }

    const result = await response.json();
    const rawContent = result?.choices?.[0]?.message?.content || '';

    let parsed;
    try {
      const firstBrace = rawContent.indexOf('{');
      const lastBrace = rawContent.lastIndexOf('}');
      const jsonString = firstBrace !== -1 && lastBrace !== -1
        ? rawContent.slice(firstBrace, lastBrace + 1)
        : rawContent;
      parsed = JSON.parse(jsonString);
    } catch (e) {
      console.error('Error parsing AI JSON:', e, rawContent);
      return NextResponse.json(
        { error: 'La respuesta de IA no tuvo el formato esperado' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      title: parsed.title || '',
      shortDescription: parsed.shortDescription || '',
      description: parsed.description || '',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      suggestedCategory: parsed.suggestedCategory || ''
    });
  } catch (error) {
    console.error('Error in generate-listing route:', error);
    return NextResponse.json(
      { error: 'No se pudieron generar sugerencias en este momento' },
      { status: 500 }
    );
  }
}

