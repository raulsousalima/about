export function initGalleryMosaic() {
  const lightbox = document.getElementById('gallery-lightbox');
  const lightboxImg = document.getElementById('gallery-lightbox-img') as HTMLImageElement | null;
  const closeBtn = lightbox?.querySelector('.gallery-lightbox-close');
  const tracks = document.querySelectorAll<HTMLElement>('.gallery-track');
  const items = document.querySelectorAll<HTMLImageElement>('.gallery-item');

  if (!lightbox || !lightboxImg || items.length === 0) return;

  function pauseTracks() {
    tracks.forEach((track) => track.classList.add('is-paused'));
  }

  function resumeTracks() {
    tracks.forEach((track) => track.classList.remove('is-paused'));
  }

  function openLightbox(src: string, alt: string) {
    lightboxImg!.src = src;
    lightboxImg!.alt = alt;
    lightbox!.classList.add('is-open');
    pauseTracks();
  }

  function closeLightbox() {
    lightbox!.classList.remove('is-open');
    resumeTracks();
  }

  items.forEach((img) => {
    img.addEventListener('click', () => openLightbox(img.src, img.alt));
  });

  closeBtn?.addEventListener('click', closeLightbox);

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox!.classList.contains('is-open')) closeLightbox();
  });
}
