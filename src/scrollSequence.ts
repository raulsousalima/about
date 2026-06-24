const FRAME_COUNT = 101;
const FRAME_PATH = (i: number) => `/img/sequence/imagem_${String(i).padStart(3, '0')}.jpg`;
const SCROLL_COMPLETION_RATIO = 0.4;

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let section: HTMLElement | null = null;
let images: HTMLImageElement[] = [];
let currentFrame = -1;

function drawFrame(index: number) {
  const img = images[index];
  if (!ctx || !canvas || !img || !img.complete) return;
  if (index === currentFrame) return;
  currentFrame = index;

  const canvasRatio = canvas.width / canvas.height;
  const imgRatio = img.naturalWidth / img.naturalHeight;
  let drawWidth = canvas.width;
  let drawHeight = canvas.height;
  let offsetX = 0;
  let offsetY = 0;

  if (imgRatio > canvasRatio) {
    drawHeight = canvas.height;
    drawWidth = drawHeight * imgRatio;
    offsetX = (canvas.width - drawWidth) / 2;
  } else {
    drawWidth = canvas.width;
    drawHeight = drawWidth / imgRatio;
    offsetY = (canvas.height - drawHeight) / 2;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
}

function resizeCanvas() {
  if (!canvas || !section) return;
  canvas.width = section.clientWidth;
  canvas.height = section.clientHeight;
  currentFrame = -1;
  drawFrame(frameForScroll());
}

function frameForScroll(): number {
  if (!section) return 0;
  const rect = section.getBoundingClientRect();
  const rawProgress = -rect.top / Math.max(rect.height, 1);
  const progress = Math.min(Math.max(rawProgress / SCROLL_COMPLETION_RATIO, 0), 1);
  return Math.min(FRAME_COUNT - 1, Math.round(progress * (FRAME_COUNT - 1)));
}

function onScroll() {
  drawFrame(frameForScroll());
}

export function initScrollSequence() {
  section = document.getElementById('hero-sequence');
  canvas = document.getElementById('hero-sequence-canvas') as HTMLCanvasElement | null;
  if (!section || !canvas) return;

  ctx = canvas.getContext('2d');
  if (!ctx) return;

  images = Array.from({ length: FRAME_COUNT }, (_, i) => {
    const img = new Image();
    img.src = FRAME_PATH(i + 1);
    return img;
  });

  images[0].addEventListener('load', () => {
    resizeCanvas();
  }, { once: true });

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('scroll', onScroll, { passive: true });
}
