// Typewriter configuration
const TYPE_SPEED = 90;
const DELETE_SPEED = 55;
const PAUSE_AFTER = 1800;
const PAUSE_BEFORE = 380;

let typewriterTextEl: HTMLElement | null = null;
let wordsSourceEl: HTMLElement | null = null;

let wordIndex = 0;
let charIndex = 0;
let isDeleting = false;
let timeoutId: ReturnType<typeof setTimeout> | null = null;

/** Reads words from the hidden translation container */
function getWords(): string[] {
  if (wordsSourceEl) {
    const raw = wordsSourceEl.innerText || wordsSourceEl.textContent || '';
    return raw.split(',').map(w => w.trim()).filter(w => w.length > 0);
  }
  return [];
}

/** The typing/deleting recursive loop */
function type() {
  const currentWords = getWords();
  if (currentWords.length === 0) {
     timeoutId = setTimeout(type, 500); 
     return;
  }

  // Handle index safety if words list changes length
  if (wordIndex >= currentWords.length) {
    wordIndex = 0;
    charIndex = 0;
  }

  const word = currentWords[wordIndex];
  if (!word) {
    wordIndex = 0;
    charIndex = 0;
    timeoutId = setTimeout(type, PAUSE_BEFORE);
    return;
  }

  if (!isDeleting) {
    charIndex++;
    if (typewriterTextEl) {
      typewriterTextEl.textContent = word.slice(0, charIndex);
    }

    if (charIndex === word.length) {
      isDeleting = true;
      timeoutId = setTimeout(type, PAUSE_AFTER);
      return;
    }
    timeoutId = setTimeout(type, TYPE_SPEED);
  } else {
    charIndex--;
    if (typewriterTextEl) {
      typewriterTextEl.textContent = word.slice(0, charIndex);
    }

    if (charIndex === 0) {
      isDeleting = false;
      wordIndex = (wordIndex + 1) % currentWords.length;
      timeoutId = setTimeout(type, PAUSE_BEFORE);
      return;
    }
    timeoutId = setTimeout(type, DELETE_SPEED);
  }
}

/** Initialize typewriter: hook elements and start loop */
export function initTypewriter() {
  typewriterTextEl = document.getElementById('typewriter-text');
  wordsSourceEl = document.getElementById('typewriter-words-source');

  if (!typewriterTextEl || !wordsSourceEl) return;

  if (timeoutId) clearTimeout(timeoutId);
  
  // Initial delay to ensure i18n has applied translations
  setTimeout(() => {
    type();
    
    // Observer to handle language changes
    const observer = new MutationObserver(() => {
        isDeleting = false;
        charIndex = 0;
        // Optionally restart entirely or just let it pick up new words
    });
    
    if (wordsSourceEl) {
        observer.observe(wordsSourceEl, { childList: true, characterData: true, subtree: true });
    }
  }, 100);
}
