export function animateCounters(container: HTMLElement) {
  const counters = container.querySelectorAll('.metric-value');
  
  counters.forEach((counterRaw) => {
    const el = counterRaw as HTMLElement;
    // Don't animate twice if already animated
    if (el.hasAttribute('data-animated')) return;
    el.setAttribute('data-animated', 'true');

    const originalText = el.innerText.trim();
    
    // Regex to capture: prefix, number, suffix
    // Example: "+35%" -> prefix="+", number="35", suffix="%"
    // Example: "25%" -> prefix="", number="25", suffix="%"
    const match = originalText.match(/^([^\d]*)(\d+)([^\d]*)$/);
    if (!match) return;

    const prefix = match[1];
    const targetNum = parseInt(match[2], 10);
    const suffix = match[3];

    // Start 10 units behind, or from 0 if target is less than 10
    let currentNum = targetNum >= 10 ? targetNum - 10 : 0;
    
    // If the difference is 0, no need to animate
    if (currentNum >= targetNum) return;

    const duration = 1200; // 1.2s total animation time
    const steps = targetNum - currentNum;
    const stepTime = Math.max(20, Math.floor(duration / steps));

    const timer = setInterval(() => {
      currentNum += 1;
      el.innerText = `${prefix}${currentNum}${suffix}`;
      
      if (currentNum >= targetNum) {
        clearInterval(timer);
        el.innerText = originalText; // Restore original to be safe with any exact spacing
      }
    }, stepTime);
  });
}
