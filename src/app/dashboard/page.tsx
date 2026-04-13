'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ShoppingBag, Users, TrendingUp, Eye, Plus, Settings,
  BarChart2, Package, MessageSquare, LogOut, ChevronRight,
  Sparkles, Trash2, Upload, X, ImageIcon
} from 'lucide-react';

interface Store { id: string; name: string; slug: string; }
interface Product { id: string; name: string; price: number; category: string; image_url: string; views_count: number; description: string; }
interface Profile { id: string; name: string; body_type: string; last_seen: string; conversation_summary: string; }

export default function DashboardPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'customers' | 'settings'>('overview');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', category: '', description: '', image_url: '' });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Upload de imagem
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }

      const { data: storeData } = await supabase.from('stores').select('*').eq('owner_id', user.id).single();
      if (storeData) {
        setStore(storeData);
        const [{ data: prods }, { data: profs }] = await Promise.all([
          supabase.from('products').select('*').eq('store_id', storeData.id).order('created_at', { ascending: false }),
          supabase.from('customer_profiles').select('*').eq('store_id', storeData.id).order('last_seen', { ascending: false })
        ]);
        setProducts(prods || []);
        setProfiles(profs || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Seleciona arquivo e mostra preview
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // Faz upload no Supabase Storage e retorna a URL pública
  const uploadImage = async (): Promise<string> => {
    if (!imageFile) return newProduct.image_url;
    setUploadingImage(true);
    try {
      const ext = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from('products')
        .upload(fileName, imageFile, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from('products').getPublicUrl(fileName);
      return urlData.publicUrl;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddProduct = async () => {
    if (!store || !newProduct.name) return;
    setSaveStatus('saving');

    try {
      // Faz upload da imagem se houver arquivo selecionado
      const finalImageUrl = imageFile ? await uploadImage() : newProduct.image_url;

      const { data } = await supabase.from('products').insert({
        store_id: store.id,
        name: newProduct.name,
        price: parseFloat(newProduct.price) || 0,
        category: newProduct.category,
        description: newProduct.description,
        image_url: finalImageUrl,
      }).select().single();

      if (data) {
        setProducts(prev => [data, ...prev]);
        setNewProduct({ name: '', price: '', category: '', description: '', image_url: '' });
        setImageFile(null);
        setImagePreview('');
        setIsAddingProduct(false);
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
      setSaveStatus('idle');
      alert('Erro ao salvar produto. Verifique se o bucket "products" foi criado no Supabase Storage.');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const resetForm = () => {
    setIsAddingProduct(false);
    setNewProduct({ name: '', price: '', category: '', description: '', image_url: '' });
    setImageFile(null);
    setImagePreview('');
  };

  const totalViews = products.reduce((sum, p) => sum + (p.views_count || 0), 0);
  const topProduct = [...products].sort((a, b) => (b.views_count || 0) - (a.views_count || 0))[0];

  if (loading) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-8 h-8 border border-white/10 border-t-white/60 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080808] text-white flex" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=Playfair+Display:ital,wght@0,400;1,400&display=swap');
        ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #222; }
        input, textarea { outline: none !important; }
        .stat-card:hover { border-color: rgba(255,255,255,0.1); }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
        .slide-in { animation: slideIn 0.3s ease forwards; }
        .upload-zone:hover { border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.05); }
      `}</style>

      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 flex flex-col py-8 px-4 fixed h-full">
        <div className="px-3 mb-10">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/20 mb-1">Painel</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif" }} className="text-lg font-normal">
            {store?.name || 'Minha Loja'}
          </h1>
        </div>

        <nav className="flex-1 space-y-1">
          {[
            { id: 'overview', label: 'Visão Geral', icon: BarChart2 },
            { id: 'products', label: 'Produtos', icon: Package },
            { id: 'customers', label: 'Clientes', icon: Users },
            { id: 'settings', label: 'Configurações', icon: Settings },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                activeTab === id ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {activeTab === id && <ChevronRight className="w-3 h-3 ml-auto" />}
            </button>
          ))}
        </nav>

        <div className="space-y-2 border-t border-white/5 pt-4">
          <a
            href={`/vitrine/${store?.slug}`}
            target="_blank"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
          >
            <Eye className="w-4 h-4" />
            Ver Vitrine
          </a>
          <button
            onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/20 hover:text-red-400 hover:bg-red-400/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-64 flex-1 p-8 overflow-auto">

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="slide-in">
            <div className="mb-10">
              <p className="text-xs tracking-[0.3em] uppercase text-white/20 mb-2">Hoje</p>
              <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-3xl font-normal">Visão Geral</h2>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Produtos', value: products.length, icon: Package, change: 'ativos' },
                { label: 'Clientes', value: profiles.length, icon: Users, change: 'cadastrados' },
                { label: 'Visualizações', value: totalViews, icon: Eye, change: 'total' },
                { label: 'Em Alta', value: products.filter(p => (p.views_count || 0) > 10).length, icon: TrendingUp, change: 'produtos' },
              ].map(({ label, value, icon: Icon, change }) => (
                <div key={label} className="stat-card bg-[#111] border border-white/5 rounded-2xl p-5 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-xs text-white/30 tracking-widest uppercase">{label}</p>
                    <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
                      <Icon className="w-4 h-4 text-white/40" />
                    </div>
                  </div>
                  <p className="text-3xl font-light mb-1">{value}</p>
                  <p className="text-xs text-white/20">{change}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
                <p className="text-xs tracking-[0.3em] uppercase text-white/20 mb-4">Produto em Destaque</p>
                {topProduct ? (
                  <div className="flex gap-4 items-center">
                    <div className="w-16 h-20 bg-white/5 rounded-xl overflow-hidden flex-shrink-0">
                      {topProduct.image_url
                        ? <img src={topProduct.image_url} alt={topProduct.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-5 h-5 text-white/20" /></div>
                      }
                    </div>
                    <div>
                      <p className="font-medium mb-1">{topProduct.name}</p>
                      <p className="text-white/40 text-sm mb-2">R$ {topProduct.price}</p>
                      <div className="flex items-center gap-1.5">
                        <Eye className="w-3 h-3 text-white/30" />
                        <p className="text-xs text-white/30">{topProduct.views_count} visualizações</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-white/20 text-sm">Nenhum produto ainda</p>
                )}
              </div>

              <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
                <p className="text-xs tracking-[0.3em] uppercase text-white/20 mb-4">Clientes Recentes</p>
                {profiles.slice(0, 4).map(p => (
                  <div key={p.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                    <div className="w-7 h-7 bg-white/5 rounded-full flex items-center justify-center">
                      <Users className="w-3 h-3 text-white/30" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{p.name || 'Anônimo'}</p>
                      <p className="text-[11px] text-white/30">{p.body_type || 'biotipo não identificado'}</p>
                    </div>
                    <p className="text-[11px] text-white/20">{new Date(p.last_seen).toLocaleDateString('pt-BR')}</p>
                  </div>
                ))}
                {profiles.length === 0 && <p className="text-white/20 text-sm">Nenhum cliente ainda</p>}
              </div>
            </div>

            <div className="mt-4 bg-gradient-to-r from-white/5 to-transparent border border-white/5 rounded-2xl p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-black" />
                </div>
                <div>
                  <p className="font-medium mb-0.5">Stylist IA Ativado</p>
                  <p className="text-white/30 text-xs">Seus clientes têm acesso ao atendimento por IA 24/7</p>
                </div>
              </div>
              <a
                href={`/vitrine/${store?.slug}`}
                target="_blank"
                className="text-xs tracking-widest uppercase border border-white/20 px-4 py-2 rounded-full hover:bg-white hover:text-black transition-all"
              >
                Ver vitrine →
              </a>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="slide-in">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs tracking-[0.3em] uppercase text-white/20 mb-2">Gerenciar</p>
                <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-3xl font-normal">Produtos</h2>
              </div>
              <button
                onClick={() => setIsAddingProduct(true)}
                className="flex items-center gap-2 bg-white text-black text-xs px-4 py-2.5 rounded-full tracking-widest uppercase font-medium hover:bg-white/90 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Novo Produto
              </button>
            </div>

            {/* Formulário de novo produto */}
            {isAddingProduct && (
              <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-6">
                <p className="text-xs tracking-[0.3em] uppercase text-white/20 mb-6">Novo Produto</p>

                {/* Upload de imagem */}
                <div className="mb-5">
                  <label className="text-[11px] text-white/30 tracking-widest uppercase block mb-2">Foto do Produto</label>

                  {imagePreview ? (
                    // Preview da imagem selecionada
                    <div className="relative w-32 h-40 rounded-xl overflow-hidden border border-white/10">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        onClick={() => { setImageFile(null); setImagePreview(''); }}
                        className="absolute top-2 right-2 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    // Zona de upload
                    <label className="upload-zone flex flex-col items-center justify-center w-full h-32 border border-dashed border-white/15 rounded-xl cursor-pointer transition-all">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageSelect}
                      />
                      <Upload className="w-6 h-6 text-white/20 mb-2" />
                      <p className="text-sm text-white/30">Clique para escolher foto</p>
                      <p className="text-[11px] text-white/15 mt-1">JPG, PNG, WEBP — até 5MB</p>
                    </label>
                  )}

                  {/* Ou usar URL */}
                  {!imagePreview && (
                    <div className="mt-3">
                      <p className="text-[11px] text-white/20 mb-1.5">ou cole uma URL de imagem:</p>
                      <input
                        value={newProduct.image_url}
                        onChange={e => setNewProduct(prev => ({ ...prev, image_url: e.target.value }))}
                        placeholder="https://..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-white/30 transition-colors"
                      />
                    </div>
                  )}
                </div>

                {/* Campos do produto */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {[
                    { key: 'name', label: 'Nome', placeholder: 'Ex: Vestido Floral' },
                    { key: 'price', label: 'Preço (R$)', placeholder: 'Ex: 129.90' },
                    { key: 'category', label: 'Categoria', placeholder: 'Ex: Vestidos' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="text-[11px] text-white/30 tracking-widest uppercase block mb-2">{label}</label>
                      <input
                        value={(newProduct as any)[key]}
                        onChange={e => setNewProduct(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-white/30 transition-colors"
                      />
                    </div>
                  ))}
                </div>

                <div className="mb-5">
                  <label className="text-[11px] text-white/30 tracking-widest uppercase block mb-2">Descrição</label>
                  <textarea
                    value={newProduct.description}
                    onChange={e => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição do produto..."
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-white/30 transition-colors resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleAddProduct}
                    disabled={saveStatus === 'saving' || uploadingImage}
                    className="bg-white text-black text-xs px-6 py-2.5 rounded-full tracking-widest uppercase font-medium hover:bg-white/90 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {uploadingImage ? (
                      <><div className="w-3 h-3 border border-black/30 border-t-black rounded-full animate-spin" /> Enviando foto...</>
                    ) : saveStatus === 'saving' ? (
                      'Salvando...'
                    ) : saveStatus === 'saved' ? (
                      '✓ Salvo'
                    ) : (
                      'Salvar Produto'
                    )}
                  </button>
                  <button
                    onClick={resetForm}
                    className="text-white/30 text-xs px-4 py-2.5 rounded-full hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Tabela de produtos */}
            <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-white/5">
                {['Foto', 'Produto', 'Preço', 'Views', 'Ações'].map(h => (
                  <p key={h} className="text-[10px] tracking-widest uppercase text-white/20">{h}</p>
                ))}
              </div>
              {products.length === 0 ? (
                <div className="text-center py-16">
                  <Package className="w-8 h-8 text-white/10 mx-auto mb-3" />
                  <p className="text-white/20 text-sm">Nenhum produto cadastrado</p>
                  <button
                    onClick={() => setIsAddingProduct(true)}
                    className="mt-4 text-xs text-white/30 hover:text-white underline transition-colors"
                  >
                    Adicionar primeiro produto
                  </button>
                </div>
              ) : (
                products.map(product => (
                  <div key={product.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-4 border-b border-white/5 last:border-0 items-center hover:bg-white/[0.02] transition-colors">
                    <div className="w-10 h-12 bg-white/5 rounded-lg overflow-hidden">
                      {product.image_url
                        ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-3 h-3 text-white/20" /></div>
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-white/30">{product.category || '—'}</p>
                    </div>
                    <p className="text-sm font-medium">R$ {product.price}</p>
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-3 h-3 text-white/20" />
                      <p className="text-sm text-white/40">{product.views_count || 0}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="text-white/20 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div className="slide-in">
            <div className="mb-10">
              <p className="text-xs tracking-[0.3em] uppercase text-white/20 mb-2">CRM</p>
              <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-3xl font-normal">Clientes</h2>
            </div>
            <div className="space-y-3">
              {profiles.length === 0 ? (
                <div className="text-center py-24 border border-white/5 rounded-2xl">
                  <Users className="w-8 h-8 text-white/10 mx-auto mb-3" />
                  <p className="text-white/20 text-sm">Nenhum cliente ainda. Compartilhe sua vitrine!</p>
                </div>
              ) : (
                profiles.map(profile => (
                  <div key={profile.id} className="bg-[#111] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-white/30" />
                        </div>
                        <div>
                          <p className="font-medium">{profile.name || 'Cliente Anônimo'}</p>
                          <div className="flex items-center gap-3 mt-1">
                            {profile.body_type && (
                              <span className="text-[10px] tracking-widest uppercase bg-white/5 px-2 py-0.5 rounded-full text-white/40">
                                {profile.body_type}
                              </span>
                            )}
                            <p className="text-[11px] text-white/20">
                              Última visita: {new Date(profile.last_seen).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {profile.conversation_summary && (
                      <div className="mt-4 pl-14">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-3 h-3 text-white/20 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-white/30 leading-relaxed">{profile.conversation_summary}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="slide-in">
            <div className="mb-10">
              <p className="text-xs tracking-[0.3em] uppercase text-white/20 mb-2">Loja</p>
              <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-3xl font-normal">Configurações</h2>
            </div>
            <div className="max-w-lg space-y-4">
              <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
                <p className="text-xs tracking-[0.3em] uppercase text-white/20 mb-6">Informações da Loja</p>
                <div className="space-y-4">
                  {[
                    { label: 'Nome da Loja', value: store?.name || '' },
                    { label: 'Link da Vitrine', value: store ? `ia-saas-moda.vercel.app/vitrine/${store.slug}` : '' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <label className="text-[11px] text-white/30 tracking-widest uppercase block mb-2">{label}</label>
                      <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/60">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
                <p className="text-xs tracking-[0.3em] uppercase text-white/20 mb-4">Link da Vitrine</p>
                <a
                  href={`/vitrine/${store?.slug}`}
                  target="_blank"
                  className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all group"
                >
                  <span className="text-sm text-white/60">/vitrine/{store?.slug}</span>
                  <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white transition-colors" />
                </a>
              </div>

              <div className="bg-gradient-to-br from-white/5 to-transparent border border-white/5 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles className="w-4 h-4 text-white/60" />
                  <p className="text-sm font-medium">Tecnologia Souza Produções</p>
                </div>
                <p className="text-xs text-white/30 leading-relaxed">
                  Sistema de vitrine com IA desenvolvido pela Souza Produções.
                  Para suporte ou novas funcionalidades, entre em contato via WhatsApp.
                </p>
                <a
                  href="https://wa.me/5562991444852"
                  target="_blank"
                  className="inline-flex items-center gap-2 mt-4 text-xs tracking-widest uppercase border border-white/20 px-4 py-2 rounded-full hover:bg-white hover:text-black transition-all"
                >
                  Contato →
                </a>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
