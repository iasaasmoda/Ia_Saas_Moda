// ═══════════════════════════════════════════════════════════════════════════════
// PATCH FRONTEND — Cole isso no seu componente de chat (ex: ChatWidget.tsx)
// Resolve: sem memória entre mensagens + sem visitorId estável
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';

// ✅ FIX 1: Gera um visitorId estável salvo no localStorage
// (persiste mesmo após recarregar a página — a Luna "lembra" o cliente)
function getOrCreateVisitorId(): string {
  const key = 'luna_visitor_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

// ✅ FIX 2: Tipagem correta do histórico
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  stage?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useLunaChat
// Use este hook no seu componente de chat
// ═══════════════════════════════════════════════════════════════════════════════

export function useLunaChat(storeId: string) {
  // ✅ FIX 3: history armazenado no estado do componente (persiste durante a sessão)
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const visitorId = useRef<string>(getOrCreateVisitorId());

  async function sendMessage(message: string): Promise<string> {
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // ✅ FIX 4: Envia o visitorId estável no header — a Luna reconhece o cliente
          'x-visitor-id': visitorId.current,
        },
        body: JSON.stringify({
          message,
          storeId,
          // ✅ FIX 5: Envia TODO o histórico acumulado — garante memória de contexto
          history,
        }),
      });

      const data = await response.json();

      if (data.response) {
        // ✅ FIX 6: Atualiza o histórico com o retornado pelo backend
        // (o backend já inclui as novas mensagens no history retornado)
        setHistory(data.history || [
          ...history,
          { role: 'user', content: message },
          { role: 'assistant', content: data.response },
        ]);
        return data.response;
      }

      return 'Ops! Pode repetir? 😅';
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      return 'Eita! Deu um bug aqui. Tenta de novo? 😅';
    } finally {
      setIsLoading(false);
    }
  }

  function resetChat() {
    setHistory([]);
    // Não limpa o visitorId — mantém reconhecimento do cliente
  }

  return { history, sendMessage, isLoading, resetChat, visitorId: visitorId.current };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXEMPLO DE USO NO COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════════

/*
export function ChatWidget({ storeId }: { storeId: string }) {
  const { history, sendMessage, isLoading } = useLunaChat(storeId);
  const [input, setInput] = useState('');

  async function handleSend() {
    if (!input.trim()) return;
    const msg = input;
    setInput('');
    await sendMessage(msg);
  }

  return (
    <div>
      {history.map((msg, i) => (
        <div key={i} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
          {msg.content}
        </div>
      ))}
      <input value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={handleSend} disabled={isLoading}>Enviar</button>
    </div>
  );
}
*/
