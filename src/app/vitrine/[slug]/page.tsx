'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Sparkles, ShoppingBag, Eye, X, Send, Camera, Shirt, Star, ChevronDown, ArrowRight } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Store {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  whatsapp?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url: string;
  views_count: number;
  description: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Gera um ID anônimo por sessão para memória do cliente
function getVisitorId() {
  if (typeof window === 'undefined') return 'anonymous';
  let id = localStorage.getItem('visitor_id');
  if (!id) {
    id = 'v_' + Math.random().toString(36).slice(2);
    localStorage.setItem('visitor_id', id);
  }
  return id;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function VitrinePage({ params }: { params: Promise<{ slug: string }> }) {
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Catálogo
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    async function load() {
      const { slug } = await params;

      // Página pública — sem verificação de auth
      const { data: storeData, error } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error || !storeData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setStore(storeData);

      const { data: prods } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeData.id)
        .order('created_at', { ascending: false });

      setProducts(prods || []);
      setLoading(false);
    }
    load();
  }, [params]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openChat = () => {
    setChatOpen(true);
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Olá! 👗 Sou o Stylist IA da ${store?.name}. Como posso te ajudar hoje? Me conta seu estilo ou o que está procurando!`
      }]);
    }
  };

  // Chama a rota real do projeto: /api/chat (route.ts com Groq)
  const handleSendMessage = async () => {
    if (!input.trim() || aiLoading || !store) return;
    const userMsg = input.trim();
    setInput('');

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setAiLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-visitor-id': getVisitorId(),
        },
        body: JSON.stringify({
          message: userMsg,
          storeId: store.id,
          history: chatHistory,
        }),
      });

      if (!res.ok) throw new Error();
      const data = await res.json();

      const assistantMsg = data.response || 'Desculpe, tente novamente.';
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMsg }]);

      // Atualiza o histórico completo retornado pela API (mantém memória)
      if (data.history) setChatHistory(data.history);

    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, estou com dificuldades técnicas agora. Explore nossos produtos enquanto isso! 😊'
      }]);
    } finally {
      setAiLoading(false);
    }
  };

  // Incrementa views via rota dedicada do projeto
  const handleProductClick = async (product: Product) => {
    setSelectedProduct(product);
    try {
      await fetch('/api/products/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      });
    } catch { /* silencioso */ }
  };

  const categories = ['Todos', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];
  const filteredProducts = selectedCategory === 'Todos'
    ? products
    : products.filter(p => p.category === selectedCategory);

  const whatsappNumber = store?.whatsapp?.replace(/\D/g, '');
  const whatsappBase = whatsappNumber ? `https://wa.me/${whatsappNumber}` : null;
  const whatsappGeneral = whatsappBase
    ? `${whatsappBase}?text=${encodeURIComponent(`Olá! Vi a vitrine da ${store?.name} e gostaria de mais informações.`)}`
    : null;

  // ─── LOADING ───
  if (loading) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-8 h-8 border border-white/10 border-t-white/60 rounded-full animate-spin" />
    </div>
  );

  // ─── 404 ───
  if (notFound) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="text-center">
        <p className="text-white/20 text-sm tracking-widest uppercase mb-4">404</p>
        <h1 className="text-2xl font-light">Vitrine não encontrada</h1>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080808] text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap');
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #222; }
        input, textarea { outline: none !important; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(100%); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseWa {
          0%,100% { box-shadow: 0 0 0 0 rgba(37,211,102,.45); }
          60%     { box-shadow: 0 0 0 10px rgba(37,211,102,0); }
        }
        .fade-up   { animation: fadeUp .55s ease forwards; }
        .fade-up-1 { animation: fadeUp .55s ease .1s forwards; opacity:0; }
        .fade-up-2 { animation: fadeUp .55s ease .22s forwards; opacity:0; }
        .slide-up  { animation: slideUp .38s cubic-bezier(.16,1,.3,1) forwards; }
        .wa-pulse  { animation: pulseWa 2.4s infinite; }

        .pcard { transition: transform .28s ease, box-shadow .28s ease; }
        .pcard:hover { transform: translateY(-5px); box-shadow: 0 24px 48px rgba(0,0,0,.55); }
        .pcard:hover .pimg { transform: scale(1.06); }
        .pimg { transition: transform .48s ease; }
        .poverlay { opacity:0; transition: opacity .28s ease; }
        .pcard:hover .poverlay { opacity:1; }
      `}</style>

      {/* ── HEADER ─────────────────────────────── */}
      <header className="border-b border-white/5 px-6 md:px-10 py-4 flex items-center justify-between sticky top-0 bg-[#080808]/95 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-lg">
            <Sparkles className="w-4 h-4 text-black" />
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif" }} className="text-xl font-normal italic">
            {store?.name}
          </h1>
        </div>
        <button
          onClick={openChat}
          className="flex items-center gap-2 border border-white/12 bg-white/6 px-4 py-2 rounded-full text-sm hover:bg-white hover:text-black transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline tracking-wide">Stylist IA</span>
        </button>
      </header>

      {/* ── HERO ────────────────────────────────── */}
      <section className="relative px-6 md:px-10 pt-16 pb-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[320px] bg-white/[0.025] rounded-full blur-3xl" />
        </div>
        <div className="relative text-center max-w-2xl mx-auto">
          <p className="fade-up text-[10px] tracking-[0.5em] uppercase text-white/25 mb-5">
            {store?.name} · Coleção
          </p>
          <h2
            style={{ fontFamily: "'Playfair Display', serif" }}
            className="fade-up-1 text-5xl md:text-6xl font-normal leading-tight mb-5"
          >
            Descubra seu<br />
            <em className="text-white/50">estilo perfeito</em>
          </h2>
          <p className="fade-up-2 text-white/35 text-sm max-w-md mx-auto leading-relaxed mb-8">
            Nossa IA analisa seu biotipo e estilo de vida para indicar as peças certas pra você.
          </p>
          <div className="fade-up-2 flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={openChat}
              className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full text-sm font-medium hover:bg-white/90 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Consultoria com IA
            </button>
            {whatsappGeneral && (
              <a
                href={whatsappGeneral}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 border border-white/15 px-6 py-3 rounded-full text-sm text-white/60 hover:border-[#25d366] hover:text-[#25d366] transition-all"
              >
                <WhatsAppIcon className="w-4 h-4" />
                Falar com a loja
              </a>
            )}
          </div>
        </div>
        <div className="flex justify-center mt-12 animate-bounce opacity-20">
          <ChevronDown className="w-5 h-5" />
        </div>
      </section>

      {/* ── PROVA VIRTUAL (placeholder) ─────────── */}
      <section className="px-6 md:px-10 pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="relative bg-gradient-to-br from-white/[0.04] to-transparent border border-white/8 rounded-3xl p-8 md:p-12 overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-white/[0.015] rounded-full -translate-y-1/3 translate-x-1/3 blur-3xl pointer-events-none" />
            <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-12">
              {/* Ícone avatar */}
              <div className="flex-shrink-0 relative w-32 h-40 bg-white/5 border border-dashed border-white/12 rounded-2xl flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 bg-white/8 rounded-full flex items-center justify-center">
                  <Shirt className="w-6 h-6 text-white/25" />
                </div>
                <Camera className="w-4 h-4 text-white/15" />
                <span className="absolute -top-2.5 -right-2.5 bg-white text-black text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full shadow">
                  Em breve
                </span>
              </div>

              {/* Texto */}
              <div className="flex-1 text-center md:text-left">
                <p className="text-[10px] tracking-[0.4em] uppercase text-white/25 mb-3">Novo recurso</p>
                <h3 style={{ fontFamily: "'Playfair Display', serif" }} className="text-2xl md:text-3xl font-normal mb-3">
                  Prova Virtual de Peças
                </h3>
                <p className="text-white/30 text-sm leading-relaxed mb-5 max-w-sm">
                  Em breve você poderá fazer upload de uma foto e visualizar como as peças ficam no seu corpo — antes de comprar.
                </p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  {['Upload de foto', 'IA de sobreposição', 'Múltiplas peças'].map(f => (
                    <span key={f} className="flex items-center gap-1.5 text-[11px] text-white/35 border border-white/8 px-3 py-1.5 rounded-full">
                      <Star className="w-2.5 h-2.5" /> {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* CTA WhatsApp "me avise" */}
              {whatsappGeneral && (
                <a
                  href={`${whatsappBase}?text=${encodeURIComponent('Quero ser avisado quando a Prova Virtual estiver disponível!')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 flex items-center gap-2 border border-white/10 px-5 py-2.5 rounded-full text-sm text-white/35 hover:border-[#25d366]/50 hover:text-[#25d366] transition-all"
                >
                  Quero ser avisado <ArrowRight className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRODUTOS ────────────────────────────── */}
      <section className="px-6 md:px-10 pb-32">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-[10px] tracking-[0.4em] uppercase text-white/25 mb-2">Catálogo</p>
              <h3 style={{ fontFamily: "'Playfair Display', serif" }} className="text-3xl font-normal">Produtos</h3>
            </div>
            <p className="text-white/25 text-sm">{filteredProducts.length} {filteredProducts.length === 1 ? 'peça' : 'peças'}</p>
          </div>

          {/* Filtros */}
          {categories.length > 1 && (
            <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs tracking-widest uppercase transition-all ${
                    selectedCategory === cat
                      ? 'bg-white text-black font-medium'
                      : 'border border-white/10 text-white/40 hover:border-white/25 hover:text-white/60'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-24 border border-white/5 rounded-3xl">
              <ShoppingBag className="w-10 h-10 text-white/10 mx-auto mb-4" />
              <p className="text-white/20 text-sm">Nenhum produto disponível ainda.</p>
              {whatsappGeneral && (
                <a href={whatsappGeneral} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-4 text-xs text-[#25d366]/50 hover:text-[#25d366] transition-colors">
                  <WhatsAppIcon className="w-3.5 h-3.5" /> Perguntar pelo WhatsApp
                </a>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="pcard cursor-pointer"
                  onClick={() => handleProductClick(product)}
                >
                  <div className="relative aspect-[3/4] bg-[#111] rounded-2xl overflow-hidden mb-3 border border-white/5">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="pimg w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-white/10" />
                      </div>
                    )}
                    {(product.views_count || 0) > 0 && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
                        <Eye className="w-2.5 h-2.5 text-white/50" />
                        <span className="text-[10px] text-white/50">{product.views_count}</span>
                      </div>
                    )}
                    <div className="poverlay absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-4">
                      <span className="text-xs tracking-widest uppercase border border-white/40 px-3 py-1.5 rounded-full">
                        Ver detalhes
                      </span>
                    </div>
                  </div>
                  <div className="px-1">
                    {product.category && (
                      <p className="text-[10px] tracking-[0.25em] uppercase text-white/25 mb-1">{product.category}</p>
                    )}
                    <p className="text-sm font-medium leading-snug mb-1.5 line-clamp-2">{product.name}</p>
                    <p className="text-white/50 text-sm font-light">
                      R$ {Number(product.price).toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── MODAL PRODUTO ────────────────────────── */}
      {selectedProduct && (
        <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center p-0 md:p-6">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
          <div className="relative slide-up w-full md:max-w-lg bg-[#0f0f0f] border border-white/10 rounded-t-3xl md:rounded-2xl overflow-hidden shadow-2xl">
            {selectedProduct.image_url && (
              <div className="aspect-video overflow-hidden">
                <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-6">
              {selectedProduct.category && (
                <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-2">{selectedProduct.category}</p>
              )}
              <h3 style={{ fontFamily: "'Playfair Display', serif" }} className="text-2xl font-normal mb-1">
                {selectedProduct.name}
              </h3>
              <p className="text-2xl text-white/75 font-light mb-4">
                R$ {Number(selectedProduct.price).toFixed(2).replace('.', ',')}
              </p>
              {selectedProduct.description && (
                <p className="text-white/35 text-sm leading-relaxed mb-5">{selectedProduct.description}</p>
              )}
              <div className="flex gap-3">
                {whatsappBase && (
                  <a
                    href={`${whatsappBase}?text=${encodeURIComponent(`Olá! Tenho interesse no produto "${selectedProduct.name}" da ${store?.name}. Pode me ajudar?`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-[#25d366] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#20c45e] transition-colors"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                    Pedir pelo WhatsApp
                  </a>
                )}
                <button
                  onClick={() => {
                    setSelectedProduct(null);
                    openChat();
                  }}
                  className="flex items-center justify-center gap-2 border border-white/10 px-4 py-3 rounded-xl text-white/40 hover:text-white hover:border-white/30 transition-colors text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">Pedir à IA</span>
                </button>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="px-4 py-3 border border-white/8 rounded-xl text-white/30 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BOTÃO WHATSAPP FIXO (canto inferior esquerdo) ── */}
      {whatsappGeneral && (
        <a
          href={whatsappGeneral}
          target="_blank"
          rel="noopener noreferrer"
          className="wa-pulse fixed bottom-6 left-6 z-30 flex items-center gap-0 bg-[#25d366] text-white rounded-full shadow-2xl hover:gap-2 hover:px-4 transition-all duration-300 w-14 h-14 hover:w-auto hover:h-auto hover:py-3 overflow-hidden justify-center"
        >
          <WhatsAppIcon className="w-6 h-6 flex-shrink-0" />
          <span className="text-sm font-medium whitespace-nowrap max-w-0 hover:max-w-none opacity-0 group-hover:opacity-100 transition-all overflow-hidden">
            Falar com a loja
          </span>
        </a>
      )}

      {/* ── BOTÃO STYLIST IA FIXO (canto inferior direito) ── */}
      <button
        onClick={openChat}
        className="fixed bottom-6 right-6 z-30 w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-transform"
        title="Stylist IA"
      >
        <Sparkles className="w-5 h-5 text-black" />
      </button>

      {/* ── CHAT STYLIST IA ──────────────────────── */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:justify-end p-0 md:p-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setChatOpen(false)} />
          <div className="relative slide-up w-full md:w-96 h-[75vh] md:h-[600px] bg-[#0f0f0f] border border-white/10 rounded-t-3xl md:rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-black" />
                </div>
                <div>
                  <p className="text-sm font-medium">Stylist IA</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    <p className="text-[11px] text-white/30">Online agora</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-white/30 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-white text-black rounded-br-sm'
                      : 'bg-white/[0.08] text-white/85 rounded-bl-sm border border-white/5'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/[0.08] border border-white/5 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1.5 items-center">
                    {[0, 150, 300].map(d => (
                      <div key={d} className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-4 border-t border-white/5 flex-shrink-0">
              <div className="flex gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus-within:border-white/25 transition-colors">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Me conta seu estilo..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-white/25"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || aiLoading}
                  className="text-white/40 hover:text-white disabled:opacity-30 transition-colors flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ──────────────────────────────── */}
      <footer className="text-center py-8 border-t border-white/5">
        <p className="text-[11px] text-white/12 tracking-widest uppercase">
          Souza Produções © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
