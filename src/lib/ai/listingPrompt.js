export function buildListingPrompts({ contextText, images, currentFields }) {
  const safeContext = (contextText || '').trim();
  const hasImages = Array.isArray(images) && images.length > 0;

  const marketplaceContext = `
Estás ayudando a un administrador de un marketplace mexicano a crear la ficha de un producto.
Debes responder SIEMPRE en español neutro, tono profesional pero cercano.
Tu objetivo es generar:
- Un título atractivo pero claro para el producto.
- Una descripción corta (máx. 160 caracteres) optimizada para listados.
- Una descripción larga orientada a conversión (beneficios, usos, materiales, etc.).
- Una lista de etiquetas (tags) descriptivas y útiles para búsqueda interna.
- Una categoría sugerida que sea lo más específica posible.

Reglas importantes:
- No inventes datos técnicos que no se deduzcan claramente del contexto.
- Evita palabras absolutas como "el mejor del mundo" a menos que el contexto lo diga explícitamente.
- No incluyas precios ni descuentos en los textos.
- Usa un lenguaje claro, sin tecnicismos innecesarios.
- Si el contexto es ambiguo, mantén las descripciones generales pero útiles.
- Enfoca la descripción en el producto: qué es, para quién es, beneficios reales, materiales/características y usos recomendados.
- Si hay datos en "campos_actuales" o imágenes, priorízalos para mantener coherencia con el producto real.
- Incluye emojis en "shortDescription" y "description" para dar vida al texto, pero con moderación (2 a 4 en total), relevantes al producto y sin saturar.
- No uses listas extensas ni formato markdown; la descripción debe ser fluida y fácil de leer.
`;

  const structuredContext = {
    contexto_admin: safeContext || null,
    campos_actuales: {
      nombre: currentFields?.name || null,
      descripcion_corta: currentFields?.short_description || null,
      descripcion_larga: currentFields?.description || null,
      tags: currentFields?.tags || null
    },
    imagenes: hasImages
      ? images.map((img, index) => ({
          indice: index,
          url: img.url || null,
          alt: img.alt || null
        }))
      : []
  };

  const userPrompt = `
Con la siguiente información del producto, genera una propuesta completa de contenido.

Información estructurada (JSON):
${JSON.stringify(structuredContext, null, 2)}

Responde EXCLUSIVAMENTE en el siguiente formato JSON, sin texto adicional:
{
  "title": "título atractivo y claro",
  "shortDescription": "máximo 160 caracteres",
  "description": "descripción larga orientada a conversión",
  "tags": ["tag1", "tag2", "tag3"],
  "suggestedCategory": "nombre de categoría sugerida"
}
`;

  return {
    systemPrompt: marketplaceContext,
    userPrompt
  };
}

