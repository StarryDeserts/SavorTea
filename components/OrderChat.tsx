'use client';

import { useState, type FormEvent } from 'react';
import { useTeahouseStore } from '@/lib/store/teahouseStore';
import { sendChat, detectOrderedDishes } from '@/lib/conversation/engine';
import { DISHES } from '@/lib/dishes/data';

export function OrderChat() {
  const messages = useTeahouseStore((s) => s.messages);
  const addMessage = useTeahouseStore((s) => s.addMessage);
  const markOrdered = useTeahouseStore((s) => s.markOrdered);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || pending) return;
    setInput('');
    addMessage({ role: 'user', content: text });
    detectOrderedDishes(text, DISHES).forEach((d) => markOrdered(d.id));
    setPending(true);
    const history = [...useTeahouseStore.getState().messages];
    const reply = await sendChat(history);
    addMessage({ role: 'assistant', content: reply });
    setPending(false);
  }

  return (
    <section className="order-chat">
      <ul className="order-chat-messages">
        {messages.map((m, i) => (
          <li key={i} className={`msg msg-${m.role}`}>
            {m.content}
          </li>
        ))}
      </ul>
      <form className="order-chat-form" onSubmit={submit}>
        <input
          className="order-chat-input"
          placeholder="同點心姨講…(例如:唔該嚟一籠蝦餃)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={pending}>
          {pending ? '…' : '嗌'}
        </button>
      </form>
    </section>
  );
}
