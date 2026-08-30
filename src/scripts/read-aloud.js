/* Read aloud, on the browser's own speech synthesis.

   See components/ReadAloud.astro for why this exists and what it deliberately
   does not claim to be. This file is the part with the sharp edges in it. */

const wrap = document.querySelector('[data-read-aloud]');
const article = document.querySelector('.prose');
const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

if (wrap && article && supported) {
  wrap.hidden = false;

  const toggle = wrap.querySelector('[data-ra-toggle]');
  const stopBtn = wrap.querySelector('[data-ra-stop]');
  const label = wrap.querySelector('[data-ra-label]');
  const playIcon = wrap.querySelector('.ra-play');
  const pauseIcon = wrap.querySelector('.ra-pause');

  /* ── what to read ────────────────────────────────────────────────────────
     Document order, skipping anything that repeats a sentence already read or
     is not part of the writing:

     - .bigidea and .pq are lifted out of his prose by the enricher. Their words
       are display treatments of lines that sit in the flow; reading the page
       naively says them twice.
     - a scripture block carries every translation at once and hides all but
       one, so only the pane actually on screen is read, and the tab strip and
       the reference caption are not.
     - footnote markers read as stray numbers mid-sentence, so they go. */
  const SKIP = '.bigidea, .pq, .vs-tabs, .vs-cite, .vs-src, .footnotes';

  function collect() {
    const out = [];
    const walk = document.createTreeWalker(article, NodeFilter.SHOW_ELEMENT, {
      acceptNode(el) {
        if (el.closest(SKIP)) return NodeFilter.FILTER_REJECT;
        if (el.hidden || el.getAttribute('aria-hidden') === 'true') return NodeFilter.FILTER_REJECT;
        if (el.matches('p, h2, h3, h4, li, blockquote > p')) return NodeFilter.FILTER_ACCEPT;
        return NodeFilter.FILTER_SKIP;
      },
    });
    const seen = new Set();
    let node;
    while ((node = walk.nextNode())) {
      /* A hidden translation pane is inside a hidden blockquote, which the
         walker rejects above, so what survives here is the visible one. */
      const clone = node.cloneNode(true);
      clone.querySelectorAll('sup, .footnote-ref, a[data-footnote-ref]').forEach((n) => n.remove());
      const text = (clone.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text || seen.has(text)) continue;
      seen.add(text);
      /* A heading wants a beat after it, which a full stop buys for free. */
      out.push(/[.!?:;]$/.test(text) ? text : text + '.');
    }
    return out;
  }

  /* Chrome stops a single utterance after roughly fifteen seconds. A
     2,500 word essay handed over in one piece dies in its first paragraph, so
     everything is queued a sentence at a time. */
  function sentences(blocks) {
    const out = [];
    for (const b of blocks) {
      const parts = b.match(/[^.!?]+[.!?]+["'”’)]*\s*|[^.!?]+$/g) || [b];
      for (const p of parts) {
        const t = p.trim();
        if (t) out.push(t);
      }
    }
    return out;
  }

  let queue = [];
  let index = 0;
  let speaking = false;

  function paint(state) {
    speaking = state === 'playing';
    label.textContent =
      state === 'playing' ? 'Pause' : state === 'paused' ? 'Resume' : 'Listen to this essay';
    playIcon.hidden = state === 'playing';
    pauseIcon.hidden = state !== 'playing';
    stopBtn.hidden = state === 'idle';
  }

  function speakFrom(i) {
    if (i >= queue.length) { reset(); return; }
    index = i;
    const u = new SpeechSynthesisUtterance(queue[i]);
    u.rate = 1;
    u.pitch = 1;
    u.lang = document.documentElement.lang || 'en';
    u.onend = () => { if (speaking) speakFrom(index + 1); };
    /* An error mid-queue should not take the whole essay down with it. */
    u.onerror = () => { if (speaking) speakFrom(index + 1); };
    window.speechSynthesis.speak(u);
  }

  function reset() {
    window.speechSynthesis.cancel();
    queue = [];
    index = 0;
    paint('idle');
  }

  toggle.addEventListener('click', () => {
    const synth = window.speechSynthesis;
    if (!queue.length) {
      queue = sentences(collect());
      if (!queue.length) return;
      synth.cancel();
      paint('playing');
      speakFrom(0);
      return;
    }
    if (synth.paused) { synth.resume(); paint('playing'); return; }
    if (speaking) { synth.pause(); paint('paused'); return; }
    paint('playing');
    speakFrom(index);
  });

  stopBtn.addEventListener('click', reset);

  /* Leaving the page with a voice still going follows the reader around the
     site, which is startling. Chrome also keeps a cancelled queue alive across
     a back-forward restore, so this runs on pagehide rather than unload. */
  window.addEventListener('pagehide', () => window.speechSynthesis.cancel());
}
