import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { productId } = await req.json();

    if (!productId) {
      return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
    }

    // Tenta usar RPC (recomendado - mais seguro)
    const { error: rpcError } = await supabase.rpc('increment_product_views', { row_id: productId });
    
    if (rpcError) {
      // Fallback: Fetch + incremento manual
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('views_count')
        .eq('id', productId)
        .single();

      if (fetchError || !product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      // Incrementa corretamente
      const newCount = (product.views_count || 0) + 1;
      await supabase
        .from('products')
        .update({ views_count: newCount })
        .eq('id', productId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Track views error:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
