import type { ReactNode } from 'react';
import type { Dish } from '@/lib/dishes/types';

// Phase 2: open-design 已交付 10 个茶点 SVG（统一 viewBox=0 0 64 64，主体 currentColor，每图 1 处点缀色）。
// 未映射的 dish.id 仍回退到 dish.emoji。
const DISH_SVGS: Record<string, ReactNode> = {
  'har-gow': (
    <svg viewBox="0 0 64 64" role="img" aria-label="蝦餃">
      <path d="M9 40c6-13 17-19 23-19s17 6 23 19c-7 5-15 7-23 7s-16-2-23-7z" fill="currentColor" opacity="0.14" />
      <path
        d="M11 40c5-11 15-16 21-16s16 5 21 16c-6 4-13 6-21 6s-15-2-21-6z"
        fill="#fff"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M21 27c2-3 5-4 7-2M30 25c2-3 5-3 7-1M38 27c2-2 5-2 6 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M28 33c2 3.4 8 3.4 10 0"
        fill="none"
        stroke="var(--har-red)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  'siu-mai': (
    <svg viewBox="0 0 64 64" role="img" aria-label="燒賣">
      <path
        d="M18 26c0-4 6-7 14-7s14 3 14 7l-2 22c0 3-5 5-12 5s-12-2-12-5z"
        fill="#fff"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M18 26c0-4 6-7 14-7s14 3 14 7c0 4-6 6-14 6s-14-2-14-6z"
        fill="currentColor"
        opacity="0.12"
      />
      <path
        d="M24 38c5 1.5 11 1.5 16 0M23 44c6 1.6 12 1.6 18 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
      <circle cx="32" cy="23.5" r="4.6" fill="var(--yolk-gold)" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  'char-siu-bao': (
    <svg viewBox="0 0 64 64" role="img" aria-label="叉燒包">
      <path
        d="M14 38c0-12 8-19 18-19s18 7 18 19c0 6-8 9-18 9s-18-3-18-9z"
        fill="#fff"
        stroke="currentColor"
        strokeWidth="2.4"
      />
      <path
        d="M32 19c-4 6-10 8-15 9M32 19c4 6 10 8 15 9M32 19v19"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.4"
      />
      <ellipse cx="32" cy="47" rx="18" ry="4" fill="currentColor" opacity="0.1" />
      <path
        d="M26 31c2 3 10 3 12 0"
        fill="none"
        stroke="var(--har-red)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  ),
  'fung-zaau': (
    <svg viewBox="0 0 64 64" role="img" aria-label="鳳爪">
      <path
        d="M32 52c-2-6-3-10-3-14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M29 38c-1-5-4-9-9-12-2-1.5-1-4 1.5-3.4 6 1.6 10 6 11 14"
        fill="#fff"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M32 38c0-6 1-11 3-15 1-2.4 4-1.6 3.6 1-1 5-0.6 9 0.4 14"
        fill="#fff"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M35 38c2-5 6-8 11-9 2.6-0.5 3 2 1 3.2-5 3-7 6-7 11"
        fill="#fff"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="50" r="4.2" fill="var(--har-red)" />
    </svg>
  ),
  'cheung-fan': (
    <svg viewBox="0 0 64 64" role="img" aria-label="腸粉">
      <path
        d="M12 26c4-3 10-3 14 0s10 3 14 0 10-3 14 0v14c-4 3-10 3-14 0s-10-3-14 0-10 3-14 0z"
        fill="#fff"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M18 33c3 2 7 2 10 0M28 33c3 2 7 2 10 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        opacity="0.42"
      />
      <path
        d="M20 40c8 5.5 16 5.5 24 0"
        fill="none"
        stroke="var(--har-red)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  'daan-taat': (
    <svg viewBox="0 0 64 64" role="img" aria-label="蛋撻">
      <path
        d="M12 30h40l-4 6c-1 8-7 12-16 12s-15-4-16-12z"
        fill="#fff"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M16 35h32M19 40h26"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        opacity="0.4"
      />
      <ellipse cx="32" cy="30" rx="14" ry="5" fill="var(--yolk-gold)" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  'no-mai-gai': (
    <svg viewBox="0 0 64 64" role="img" aria-label="糯米雞">
      <path
        d="M32 13c11 0 19 8 19 19s-8 20-19 20-19-9-19-20S21 13 32 13z"
        fill="currentColor"
        opacity="0.12"
      />
      <path
        d="M32 16c8.5 0 16 7 16 16s-7 16-16 16-16-7-16-16 7.5-16 16-16z"
        fill="#fff"
        stroke="currentColor"
        strokeWidth="2.4"
      />
      <path
        d="M21 22c5 4 7 11 6 19M43 22c-5 4-7 11-6 19M16 32c10-2 22-2 32 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.4"
      />
      <path
        d="M24 20c4 6 4 18 0 24"
        fill="none"
        stroke="var(--leaf-green)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  ),
  'lau-sa-bao': (
    <svg viewBox="0 0 64 64" role="img" aria-label="流沙包">
      <path
        d="M14 36c0-12 8-18 18-18s18 6 18 18c0 6-8 9-18 9s-18-3-18-9z"
        fill="#fff"
        stroke="currentColor"
        strokeWidth="2.4"
      />
      <path
        d="M28 22c-2 4-7 6-12 7M36 22c2 4 7 6 12 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.38"
      />
      <path
        d="M24 34c3 7 13 7 16 0 3 5-2 12-8 12s-11-7-8-12z"
        fill="var(--yolk-gold)"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  ),
  'maa-laai-gou': (
    <svg viewBox="0 0 64 64" role="img" aria-label="馬拉糕">
      <path
        d="M16 28c0-3 7-6 16-6s16 3 16 6v16c0 3-7 5-16 5s-16-2-16-5z"
        fill="#fff"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M16 28c0-3 7-6 16-6s16 3 16 6c0 3-7 5-16 5s-16-2-16-5z"
        fill="currentColor"
        opacity="0.1"
      />
      <path
        d="M16 28c0-3 7-6 16-6s16 3 16 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
      />
      <path
        d="M23 41c1.5 1.5 4 1.5 6 0M35 39c1.5 1.5 4 1.5 6 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.4"
      />
      <circle cx="32" cy="38" r="2.4" fill="var(--yolk-gold)" />
    </svg>
  ),
  'teng-zai-zuk': (
    <svg viewBox="0 0 64 64" role="img" aria-label="艇仔粥">
      <path
        d="M10 33h44c-1 9-10 17-22 17S11 42 10 33z"
        fill="#fff"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M14 33c4 2 8 2 12 0s8-2 12 0 8 2 12 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        opacity="0.45"
      />
      <path
        d="M22 25c2-3 6-3 8 0M34 23c2-3 6-3 8 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M40 20l-2 11" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="26" cy="40" r="1.8" fill="var(--leaf-green)" />
      <circle cx="34" cy="42" r="1.8" fill="var(--leaf-green)" />
      <circle cx="40" cy="39" r="1.6" fill="var(--leaf-green)" />
    </svg>
  ),
};

export function DishIcon({ dish, className }: { dish: Dish; className?: string }) {
  const svg = DISH_SVGS[dish.id];
  return (
    <span className={`dish-icon${className ? ` ${className}` : ''}`} data-dish-id={dish.id}>
      {svg ?? (
        <span className="dish-emoji" aria-hidden>
          {dish.emoji}
        </span>
      )}
    </span>
  );
}
