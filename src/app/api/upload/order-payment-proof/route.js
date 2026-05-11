import { NextResponse } from 'next/server';
import { uploadImage, validateImageFile } from '../../../../lib/blobStorage';

// POST /api/upload/order-payment-proof — comprobante del anticipo (checkout, sin auth)
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No se envió ninguna imagen' }, { status: 400 });
    }

    const validation = validateImageFile(file, 5, ['image/jpeg', 'image/png', 'image/webp']);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.errors?.[0] || 'Archivo no válido' },
        { status: 400 }
      );
    }

    const result = await uploadImage(file, 'order-payment-proofs');

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error al subir la imagen' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: result.url,
      message: 'Comprobante subido correctamente'
    });
  } catch (error) {
    console.error('Error uploading order payment proof:', error);
    return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 });
  }
}
