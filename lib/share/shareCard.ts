import type { Dish } from '@/lib/dishes/types';

export interface ShareCardData {
  date: string;
  dishes: { nameYue: string; emoji: string }[];
  bestScore: number;
}

export function buildShareCardData(input: {
  dishes: Dish[];
  orderedDishIds: string[];
  bestScore: number;
  date?: Date;
}): ShareCardData {
  const date = (input.date ?? new Date()).toISOString().slice(0, 10);
  const dishes = input.orderedDishIds
    .map((id) => input.dishes.find((d) => d.id === id))
    .filter((d): d is Dish => Boolean(d))
    .map((d) => ({ nameYue: d.nameYue, emoji: d.emoji }));
  return { date, dishes, bestScore: input.bestScore };
}

const WIDTH = 600;
const HEIGHT = 800;

export function drawShareCard(ctx: CanvasRenderingContext2D, data: ShareCardData): void {
  ctx.fillStyle = '#f7f1e3';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = '#7a4a2b';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('今日飲茶', 48, 96);

  ctx.font = '24px sans-serif';
  ctx.fillText(data.date, 48, 144);

  ctx.font = '30px sans-serif';
  data.dishes.forEach((d, i) => {
    ctx.fillText(`${d.emoji}  ${d.nameYue}`, 48, 220 + i * 56);
  });

  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(`最佳發音 ${data.bestScore} 分`, 48, HEIGHT - 56);
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
