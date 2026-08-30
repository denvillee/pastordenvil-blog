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
     Document order, reading the essay and nothing else.

     The first version of this skipped .bigidea and .pq on the theory that a
     display treatment repeats a line already in the flow. That was wrong, and
     testing it against the real page is what showed it: the enricher MOVES
     those sentences out of the paragraph rather than copying them, so
     "Identity precedes activity" and the closing "Genesis says you are God's
     image" exist nowhere else. Skipping them dropped the essay's thesis and
     its last line. They are read, in place, and the thesis is heard twice
     because he wrote it twice.

     What is genuinely skipped:

     - the translation tab strip and the source credit, which are controls and
       attribution, not sentences. A scripture block also carries every
       translation at once with all but one hidden, and a hidden pane is
       rejected with its whole subtree, so only what is on screen is read.
     - the footnotes. Bibliographic citations spoken aloud are noise, and left
       in they mean the essay ends on a page number instead of on its last
       line.
     - footnote markers, which otherwise read as a stray number mid-sentence.

     The scripture reference itself IS read, after its passage, because a
     listener has no figcaption to glance at. */
  const SKIP = '.vs-tabs, .vs-src, .footnotes';

  function collect() {
    const out = [];
    const walk = document.createTreeWalker(article, NodeFilter.SHOW_ELEMENT, {
      acceptNode(el) {
        if (el.closest(SKIP)) return NodeFilter.FILTER_REJECT;
        if (el.hidden || el.getAttribute('aria-hidden') === 'true') return NodeFilter.FILTER_REJECT;
        if (el.matches('p, h2, h3, h4, li, cite.vs-ref')) return NodeFilter.FILTER_ACCEPT;
        return NodeFilter.FILTER_SKIP;
      },
    });
    let node;
    while ((node = walk.nextNode())) {
      /* A hidden translation pane is inside a hidden blockquote, which the
         walker rejects above, so what survives here is the visible one.

         Nothing is de-duplicated. An earlier version dropped any line it had
         already read, which quietly deleted the refrain: "Identity precedes
         activity" lands once as a claim and returns once as the payoff, and
         hearing it twice is the point. */
      const clone = node.cloneNode(true);
      clone.querySelectorAll('sup, .footnote-ref, a[data-footnote-ref]').forEach((n) => n.remove());
      const text = (clone.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) continue;
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
