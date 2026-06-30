import type { Dish } from '@/lib/dishes/types';

export interface ShareCardData {
  date: string;
  dishes: { nameYue: string; emoji: string }[];
  clearedCount: number;
  totalStars: number;
}

export function buildShareCardData(input: {
  dishes: Dish[];
  clearedDishIds: string[];
  stars: Record<string, number>;
  date?: Date;
}): ShareCardData {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(input.date ?? new Date());
  const dishes = input.clearedDishIds
    .map((id) => input.dishes.find((d) => d.id === id))
    .filter((d): d is Dish => Boolean(d))
    .map((d) => ({ nameYue: d.nameYue, emoji: d.emoji }));
  const totalStars = Object.values(input.stars).reduce((a, b) => a + b, 0);
  return { date, dishes, clearedCount: dishes.length, totalStars };
}

const WIDTH = 600;
const HEIGHT = 800;

// Palette — hex values from uiux-design/share-card.html (oklch tokens flattened).
const COLORS = {
  paper: '#F5EDE1',
  paper2: '#FAF6EE',
  border: '#C4B4A3',
  ink: '#271610',
  todo: '#71675D',
  rouge: '#751F1F',
  rougeDeep: '#4F0B08',
  rougeBottom: '#370502',
  stamp: '#9E1614',
  gold: '#D49838',
  goldBright: '#F3B94C',
  paperOnRouge: '#F5EDE1',
  dishLabel: '#9c8d7d',
} as const;

const FONT_STACK =
  '"Noto Sans HK", "PingFang HK", "PingFang SC", "Microsoft YaHei", sans-serif';

function safeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  // Some test mocks don't implement roundRect — fall back to a manual path.
  const anyCtx = ctx as unknown as { roundRect?: (...args: number[]) => void };
  if (typeof anyCtx.roundRect === 'function') {
    ctx.beginPath();
    anyCtx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  fillStyle: string,
): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function drawCornerMarks(ctx: CanvasRenderingContext2D): void {
  // Four gold corner clips at the inner frame's corners (replaces double-line ticket border).
  const armLen = 18;
  const inset = 16;
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2;
  ctx.lineCap = 'square';

  // top-left
  ctx.beginPath();
  ctx.moveTo(inset, inset + armLen);
  ctx.lineTo(inset, inset);
  ctx.lineTo(inset + armLen, inset);
  ctx.stroke();
  // top-right
  ctx.beginPath();
  ctx.moveTo(WIDTH - inset - armLen, inset);
  ctx.lineTo(WIDTH - inset, inset);
  ctx.lineTo(WIDTH - inset, inset + armLen);
  ctx.stroke();
  // bottom-left
  ctx.beginPath();
  ctx.moveTo(inset, HEIGHT - inset - armLen);
  ctx.lineTo(inset, HEIGHT - inset);
  ctx.lineTo(inset + armLen, HEIGHT - inset);
  ctx.stroke();
  // bottom-right
  ctx.beginPath();
  ctx.moveTo(WIDTH - inset - armLen, HEIGHT - inset);
  ctx.lineTo(WIDTH - inset, HEIGHT - inset);
  ctx.lineTo(WIDTH - inset, HEIGHT - inset - armLen);
  ctx.stroke();
}

function drawHeader(ctx: CanvasRenderingContext2D, date: string): void {
  // Red-velvet plaque, 0,0 → 600,210, with a 160deg gradient rouge → deep → bottom.
  const grad = ctx.createLinearGradient(0, 0, WIDTH, 210);
  grad.addColorStop(0, COLORS.rouge);
  grad.addColorStop(0.7, COLORS.rougeDeep);
  grad.addColorStop(1, COLORS.rougeBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, 210);

  // Gold accent strip along the bottom edge of the plaque.
  const stripGrad = ctx.createLinearGradient(0, 0, WIDTH, 0);
  stripGrad.addColorStop(0, 'rgba(243,185,76,0)');
  stripGrad.addColorStop(0.18, COLORS.goldBright);
  stripGrad.addColorStop(0.5, COLORS.gold);
  stripGrad.addColorStop(0.82, COLORS.goldBright);
  stripGrad.addColorStop(1, 'rgba(243,185,76,0)');
  ctx.fillStyle = stripGrad;
  ctx.fillRect(0, 205, WIDTH, 5);

  // Kicker: two thin gold rules with 「虛擬茶樓」 between them.
  const kickerY = 60;
  ctx.fillStyle = COLORS.goldBright;
  ctx.font = `700 13px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const kicker = '虛 擬 茶 樓';
  ctx.fillText(kicker, WIDTH / 2, kickerY);
  // Measure kicker so the rules sit neatly on either side.
  const kickerW = (() => {
    try {
      return ctx.measureText(kicker).width;
    } catch {
      return 96;
    }
  })();
  const ruleY = kickerY;
  const ruleLen = 46;
  const gap = 14;
  const leftRuleEnd = WIDTH / 2 - kickerW / 2 - gap;
  const rightRuleStart = WIDTH / 2 + kickerW / 2 + gap;

  const leftRule = ctx.createLinearGradient(leftRuleEnd - ruleLen, 0, leftRuleEnd, 0);
  leftRule.addColorStop(0, 'rgba(243,185,76,0)');
  leftRule.addColorStop(0.5, COLORS.goldBright);
  leftRule.addColorStop(1, 'rgba(243,185,76,0)');
  ctx.fillStyle = leftRule;
  ctx.fillRect(leftRuleEnd - ruleLen, ruleY - 0.5, ruleLen, 1);

  const rightRule = ctx.createLinearGradient(rightRuleStart, 0, rightRuleStart + ruleLen, 0);
  rightRule.addColorStop(0, 'rgba(243,185,76,0)');
  rightRule.addColorStop(0.5, COLORS.goldBright);
  rightRule.addColorStop(1, 'rgba(243,185,76,0)');
  ctx.fillStyle = rightRule;
  ctx.fillRect(rightRuleStart, ruleY - 0.5, ruleLen, 1);

  // Title 「今日飲茶」 — gold, large, tracked.
  ctx.fillStyle = COLORS.goldBright;
  ctx.font = `900 54px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Soft drop shadow approximated by drawing once in semi-transparent black.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillText('今 日 飲 茶', WIDTH / 2, 116 + 2);
  ctx.fillStyle = COLORS.goldBright;
  ctx.fillText('今 日 飲 茶', WIDTH / 2, 116);

  // Date, tracked, dim ivory.
  ctx.fillStyle = COLORS.paperOnRouge;
  ctx.globalAlpha = 0.82;
  ctx.font = `400 18px ${FONT_STACK}`;
  ctx.fillText(date, WIDTH / 2, 166);
  ctx.globalAlpha = 1;
}

function drawStamp(ctx: CanvasRenderingContext2D): void {
  // Right-upper red square stamp 「叹」 — rotated -13deg, drawn around its center.
  const cx = WIDTH - 42 - 52; // right:42px, half of 104.
  const cy = 150 + 52;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-13 * Math.PI) / 180);

  const size = 104;
  // Translucent paper wash inside.
  ctx.fillStyle = 'rgba(245,237,225,0.10)';
  safeRoundRect(ctx, -size / 2, -size / 2, size, size, 14);
  ctx.fill();
  // Thick stamp border.
  ctx.strokeStyle = COLORS.stamp;
  ctx.lineWidth = 4;
  safeRoundRect(ctx, -size / 2, -size / 2, size, size, 14);
  ctx.stroke();
  // 「叹」
  ctx.fillStyle = COLORS.stamp;
  ctx.font = `900 58px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('叹', 0, 4);
  ctx.restore();
}

function drawDishesLabel(ctx: CanvasRenderingContext2D, clearedCount: number): void {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COLORS.dishLabel;
  ctx.font = `700 13px ${FONT_STACK}`;
  const prefix = '叹过嘅点心 · ';
  ctx.fillText(prefix, 46, 252);
  // Measure prefix so the bold count sits right after, in stamp red.
  let prefixWidth = 0;
  try {
    prefixWidth = ctx.measureText(prefix).width;
  } catch {
    prefixWidth = 110;
  }
  ctx.fillStyle = COLORS.rouge;
  ctx.font = `800 13px ${FONT_STACK}`;
  ctx.fillText(`共 ${clearedCount} 道`, 46 + prefixWidth, 252);
}

function drawDishes(
  ctx: CanvasRenderingContext2D,
  dishes: ShareCardData['dishes'],
): void {
  // Grid: 2 cols, row height 70, gap 24, left:46, top:276, width:508
  const left = 46;
  const top = 276;
  const colW = (508 - 24) / 2; // 242
  const rowH = 70;
  const maxRows = 5;
  const count = Math.min(dishes.length, maxRows * 2);

  for (let i = 0; i < count; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = left + col * (colW + 24);
    const y = top + row * rowH;

    // Dashed divider at the bottom of each cell.
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    if (typeof ctx.setLineDash === 'function') ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x + 4, y + rowH - 1);
    ctx.lineTo(x + colW - 4, y + rowH - 1);
    ctx.stroke();
    if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);

    // Round emoji medallion.
    const medCx = x + 4 + 21;
    const medCy = y + rowH / 2;
    ctx.beginPath();
    ctx.arc(medCx, medCy, 21, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.paper2;
    ctx.fill();
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Emoji centered in the medallion.
    ctx.fillStyle = COLORS.stamp;
    ctx.font = `400 26px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(dishes[i].emoji, medCx, medCy + 1);

    // Name, ink, left-aligned to the right of the medallion.
    ctx.fillStyle = COLORS.ink;
    ctx.font = `700 22px ${FONT_STACK}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(dishes[i].nameYue, medCx + 21 + 14, medCy);

    // Tabular index (01, 02 ...) flushed right.
    ctx.fillStyle = COLORS.todo;
    ctx.font = `400 13px ${FONT_STACK}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1).padStart(2, '0'), x + colW - 4, medCy);
  }
  if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);
}

function drawScoreBar(
  ctx: CanvasRenderingContext2D,
  clearedCount: number,
  totalStars: number,
): void {
  const top = 656;
  const h = 144;

  // Soft ivory gradient.
  const grad = ctx.createLinearGradient(0, top, 0, top + h);
  grad.addColorStop(0, COLORS.paper2);
  grad.addColorStop(1, COLORS.paper);
  ctx.fillStyle = grad;
  ctx.fillRect(0, top, WIDTH, h);

  // Gold separator on top.
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(0, top, WIDTH, 3);

  // Score line: 叹咗 N 道 · M 粒星
  // Draw the whole literal in one call (test asserts substrings); decorative digits painted on top.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.rouge;
  ctx.font = `800 22px ${FONT_STACK}`;
  const scoreLine = `叹咗 ${clearedCount} 道 · ${totalStars} 粒星`;
  ctx.fillText(scoreLine, WIDTH / 2, top + 48);

  // Stars row — up to 10, gold filled, the rest are dimmed border-color outlines.
  const starCount = 10;
  const filled = Math.min(starCount, Math.max(0, totalStars));
  const starSize = 13; // outer radius
  const starGap = 7;
  const rowW = starCount * (starSize * 2) + (starCount - 1) * starGap;
  const startX = WIDTH / 2 - rowW / 2 + starSize;
  const starY = top + 96;
  for (let i = 0; i < starCount; i++) {
    const cx = startX + i * (starSize * 2 + starGap);
    if (i < filled) {
      drawStar(ctx, cx, starY, starSize, starSize * 0.45, COLORS.goldBright);
    } else {
      ctx.save();
      ctx.globalAlpha = 0.5;
      drawStar(ctx, cx, starY, starSize, starSize * 0.45, COLORS.border);
      ctx.restore();
    }
  }

  // Brand/hook line above the bottom edge.
  ctx.fillStyle = COLORS.rouge;
  ctx.font = `900 14px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const brand = '叹茶 · 虛擬茶樓   |   你叹到第几道?';
  ctx.fillText(brand, WIDTH / 2, HEIGHT - 24);
}

export function drawShareCard(ctx: CanvasRenderingContext2D, data: ShareCardData): void {
  // Reset alignment defaults — tests pass a minimal mock and we don't want stale state.
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = 1;

  // Paper background.
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Inner bamboo-white frame (1.5px, inset 16px).
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(16, 16, WIDTH - 32, HEIGHT - 32);

  // Gold corner clips on the inner frame.
  drawCornerMarks(ctx);

  // Top red-velvet plaque with title + date.
  drawHeader(ctx, data.date);

  // Tilted red stamp at the right.
  drawStamp(ctx);

  // Dish list label + grid.
  drawDishesLabel(ctx, data.clearedCount);
  drawDishes(ctx, data.dishes);

  // Bottom score bar + stars + brand hook.
  drawScoreBar(ctx, data.clearedCount, data.totalStars);
}

export async function generateShareCardBlob(data: ShareCardData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  drawShareCard(ctx, data);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png');
  });
}
