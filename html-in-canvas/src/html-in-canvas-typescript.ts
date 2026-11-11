/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 *
 * HTML-in-Canvas, written in TypeScript.
 *
 * Every HTML-in-Canvas API used below (`canvas.onpaint`, `CanvasPaintEvent`,
 * `ctx.drawElementImage()`, `canvas.requestPaint()`, ...) is typed by the
 * `@types/dom-html-in-canvas` package from DefinitelyTyped, enabled in
 * ../tsconfig.json with `"types": ["dom-html-in-canvas"]`. No casts, no `any`.
 *
 * Compile with `npm run build` (outputs ../public/js/html-in-canvas-typescript.js).
 */

const canvas = document.querySelector<HTMLCanvasElement>('#canvas');
const card = document.querySelector<HTMLElement>('#card');
const angleInput = document.querySelector<HTMLInputElement>('#angle');
const greetForm = document.querySelector<HTMLFormElement>('#greet-form');
const nameInput = document.querySelector<HTMLInputElement>('#name');
const greeting = document.querySelector<HTMLOutputElement>('#greeting');
const statusOutput = document.querySelector<HTMLOutputElement>('#status');
const fallback = document.querySelector<HTMLElement>('#fallback');

// Feature detection. The types describe Chrome 157+, but at runtime the API
// may be missing, so check before using it.
function isHtmlInCanvasSupported(): boolean {
  return (
    'requestPaint' in HTMLCanvasElement.prototype &&
    'drawElementImage' in CanvasRenderingContext2D.prototype
  );
}

function main(): void {
  if (
    !canvas || !card || !angleInput || !greetForm ||
    !nameInput || !greeting || !statusOutput || !fallback
  ) {
    throw new Error('Demo markup is missing an element.');
  }

  if (!isHtmlInCanvasSupported()) {
    fallback.hidden = false;
    canvas.hidden = true;
    statusOutput.value = 'HTML-in-Canvas is not supported in this browser.';
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context is not available.');
  }

  // Keep the canvas backing store in sync with its on-screen size, in device
  // pixels, so the drawn HTML stays crisp.
  new ResizeObserver(([entry]) => {
    const size = entry?.devicePixelContentBoxSize[0];
    if (!size) return;
    canvas.width = size.inlineSize;
    canvas.height = size.blockSize;
    // Resizing clears the canvas: ask for a fresh paint event.
    canvas.requestPaint();
  }).observe(canvas, { box: 'device-pixel-content-box' });

  let paintCount = 0;

  // `onpaint` receives a typed `CanvasPaintEvent`. It fires whenever a
  // `drawable` child's rendering changes (typing, focus rings, hover, ...)
  // and whenever `canvas.requestPaint()` is called.
  canvas.onpaint = () => {
    const angle = (angleInput.valueAsNumber * Math.PI) / 180;

    // `getElementImageDefaultSize()` returns `ElementImageDefaultSize`, whose
    // `width` and `height` are optional, so strict mode makes us handle
    // `undefined`.
    const { width = 0, height = 0 } = canvas.getElementImageDefaultSize(card);

    ctx.reset();

    // Draw the card rotated around the canvas center. Since Chrome 155 the
    // browser syncs the element's hit-testing geometry with the current canvas
    // transform automatically, so the form keeps working where it is drawn.
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(angle);
    ctx.drawElementImage(card, -width / 2, -height / 2);

    // Draw a small, unrotated preview of the same element in the corner. The
    // typed `DrawElementImageOptions` lets us keep the hit-testing geometry
    // from the main draw above.
    ctx.resetTransform();
    ctx.globalAlpha = 0.6;
    ctx.drawElementImage(card, 16, 16, width / 4, height / 4, { preserveElementGeometry: true });
    ctx.globalAlpha = 1;

    // `getElementTransform()` returns the `DOMMatrix` the browser applied to
    // the element for hit-testing, in CSS pixels.
    const { a, b, c, d, e, f } = canvas.getElementTransform(card);
    const matrix = [a, b, c, d, e, f].map((n) => n.toFixed(2)).join(', ');
    paintCount++;
    statusOutput.dataset.paintCount = String(paintCount);
    statusOutput.value =
      `paint events: ${paintCount}\n` +
      `default size: ${width} × ${height}\n` +
      `element transform: matrix(${matrix})`;
  };

  // `addEventListener('paint', ...)` is typed too: `event` is a
  // `CanvasPaintEvent`, so `changedElements` is a `ReadonlyArray<Element>`.
  canvas.addEventListener('paint', (event) => {
    const changed = event.changedElements.map((el) => `#${el.id || el.tagName.toLowerCase()}`);
    console.log('paint, changedElements:', changed.join(', ') || '(none)');
  });

  // The angle slider lives outside the canvas, so changing it doesn't change
  // the card's rendering. Request a paint event explicitly.
  angleInput.addEventListener('input', () => canvas.requestPaint());

  // Regular DOM events work, because the form is real HTML.
  greetForm.addEventListener('submit', (event) => {
    event.preventDefault();
    greeting.value = `Hello, ${nameInput.value || 'stranger'}! 👋`;
  });
}

main();

// Make this file an ES module, so its top-level names stay out of the global scope.
export {};
