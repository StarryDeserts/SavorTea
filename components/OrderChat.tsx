'use client';

import { useState, type FormEvent } from 'react';
import { useTeahouseStore } from '@/lib/store/teahouseStore';
import { DISHES } from '@/lib/dishes/data';
import { checkOrder } from '@/lib/game/checker';
import { judgeOrder } from '@/lib/conversation/engine';
import { useLlmConfigStore } from '@/lib/settings/llmConfigStore';
import { buildJudgeFallback, type JudgeResult } from '@/lib/conversation/judge';
import type { OrderSkill } from '@/lib/dishes/types';
import { VoiceOrderButton } from './VoiceOrderButton';
import { ShadowingButton } from './ShadowingButton';

const GREETING = '好嘞,歡迎嚟到虛擬茶樓!跟住下面嘅目標,用粵語同姨嗌嘢飲茶啦。';

const SKILL_LABELS: Record<OrderSkill, string> = {
  name: '講出點心名',
  polite: '禮貌講法',
  quantity: '數量+量詞',
  modifier: '做法/限定',
  alias: '識別別名',
  price: '問價',
  multi: '一次兩樣',
  checkout: '埋單',
};

export function OrderChat() {
  const messages = useTeahouseStore((s) => s.messages);
  const clearedDishIds = useTeahouseStore((s) => s.clearedDishIds);
  const addMessage = useTeahouseStore((s) => s.addMessage);
  const clearLevel = useTeahouseStore((s) => s.clearLevel);

  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [result, setResult] = useState<{ pass: boolean; judge: JudgeResult } | null>(null);

  const dish = DISHES[clearedDishIds.length];

  if (!dish) {
    return (
      <section className="order-chat" data-all-cleared>
        <p className="quest-goal">十關全部叹晒!睇下你嘅「今日飲茶」成績單啦。</p>
      </section>
    );
  }

  async function attempt(transcript: string) {
    const text = transcript.trim();
    if (!text || pending) return;
    setInput('');
    setShowHint(false);
    addMessage({ role: 'user', content: text });
    const { pass } = checkOrder(text, dish);
    setPending(true);
    const llmConfig = useLlmConfigStore.getState();
    let judge: JudgeResult;
    try {
      judge = await judgeOrder({ dishId: dish.id, transcript: text, pass }, llmConfig);
    } catch {
      judge = buildJudgeFallback(dish, pass);
    }
    addMessage({ role: 'assistant', content: judge.reply });
    if (pass) clearLevel(dish.id, judge.stars);
    setResult({ pass, judge });
    setPending(false);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void attempt(input);
  }

  return (
    <section className="order-chat">
      <div className="quest">
        <span className="quest-level">第 {dish.task.level} 關 / 10</span>
        <ul className="quest-skill-list">
          {dish.task.skills.map((s) => (
            <li key={s} className="quest-skill">{SKILL_LABELS[s]}</li>
          ))}
        </ul>
        <p className="quest-goal">{dish.task.goal}</p>
      </div>

      <ul className="order-chat-messages">
        {messages.length === 0 && <li className="msg msg-assistant">{GREETING}</li>}
        {messages.map((m, i) => (
          <li key={i} className={`msg msg-${m.role}`}>{m.content}</li>
        ))}
      </ul>

      {result && (
        <div className="level-result" data-pass={result.pass}>
          <span className="stars" aria-label={`${result.judge.stars} 粒星`}>
            {[1, 2, 3].map((n) => (
              <span key={n} className="star" data-filled={n <= result.judge.stars} aria-hidden>★</span>
            ))}
          </span>
          {!result.pass && <p className="level-result-tip">{result.judge.tip}</p>}
        </div>
      )}

      <div className="order-hint">
        <button type="button" className="order-hint-button" onClick={() => setShowHint((v) => !v)}>
          唔識講?
        </button>
        {showHint && (
          <div className="order-hint-body">
            <p className="order-hint-phrase">{dish.task.hint}</p>
            <ShadowingButton targetPhrase={dish.task.hint} onResult={() => {}} />
          </div>
        )}
      </div>

      <form className="order-chat-form" onSubmit={submit}>
        <VoiceOrderButton onTranscript={(t) => void attempt(t)} disabled={pending} />
        <input
          className="order-chat-input"
          placeholder="同點心姨講…(例如:唔該嚟一籠蝦餃)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={pending}>{pending ? '…' : '嗌'}</button>
      </form>
    </section>
  );
}
