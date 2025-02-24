<script>
  import Switch from './Switch.svelte'

  let buttons = 'No';
  let dots = 'No';
  let paged = 'No';
  let inerted = 'No';
</script>

<div class="settings">
  <Switch bind:value={buttons} label="Scroll Buttons" design="multi" options={['No', 'Yes']}/>
  <Switch bind:value={dots} label="Dot Navigation" design="multi" options={['No', 'Yes']}/>
  <Switch bind:value={paged} label="Auto Pages" design="multi" options={['No', 'Yes']}/>
  <Switch bind:value={inerted} label="Inert" design="multi" options={['No', 'Yes']}/>
</div>

<ul 
  class="carousel"
  class:with-buttons={buttons === 'Yes'}
  class:with-dots={dots === 'Yes'}
  class:with-pages={paged === 'Yes'}
  class:with-inert={inerted === 'Yes'}
>
  <li>
    <div class="card" tabindex=0>1</div>
  </li>
  <li>
    <div class="card" tabindex=0>2</div>
  </li>
  <li>
    <div class="card" tabindex=0>3</div>
  </li>
  <li>
    <div class="card" tabindex=0>4</div>
  </li>
  <li>
    <div class="card" tabindex=0>5</div>
  </li>
  <li>
    <div class="card" tabindex=0>6</div>
  </li>
  <li>
    <div class="card" tabindex=0>7</div>
  </li>
  <li>
    <div class="card" tabindex=0>8</div>
  </li>
  <li>
    <div class="card" tabindex=0>9</div>
  </li>
  <li>
    <div class="card" tabindex=0>10</div>
  </li>
  <li>
    <div class="card" tabindex=0>11</div>
  </li>
  <li>
    <div class="card" tabindex=0>12</div>
  </li>
  <li>
    <div class="card" tabindex=0>13</div>
  </li>
  <li>
    <div class="card" tabindex=0>14</div>
  </li>
  <li>
    <div class="card" tabindex=0>15</div>
  </li>
  <li>
    <div class="card" tabindex=0>16</div>
  </li>
</ul>

<div class="example-code">
  <section>
    <h3>HTML</h3>
    <pre><code>{`<ul class="carousel">
  <li>…</li>
  <li>…</li>
  <li>…</li>
  <li>…</li>
  <li>…</li>
  …
<ul>`}</section>
  <section>
    <h3>CSS</h3>
    <div>
      <p>Snap Scroller</p>
      {#if paged === 'No'}<pre><code>{`.carousel {
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  anchor-name: --carousel;

  > li {
    scroll-snap-align: center;
  }
}
`}</code></pre>{/if}
      {#if paged === 'Yes'}<pre><code>{`.carousel {
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  anchor-name: --carousel;
  
  columns: 1;
  block-size: 10lh;
  text-align: center;

  &::column {
    scroll-snap-align: center;
  }
}`}</code></pre>{/if}
    </div>
    
    {#if buttons === 'Yes'}<div>
      <p>Scroll Buttons</p>
      <pre><code>{`.carousel {
  &::scroll-button(*) {
    position: fixed;
    position-anchor: --carousel;
    font-family: "Material Symbols Outlined";
  }

  &::scroll-button(right) {
    position-area: inline-end center;
    content: 'arrow_forward' / 'Next';
  }
  
  &::scroll-button(left) {
    position-area: inline-start center;
    content: 'arrow_back' / 'Previous';
  }
}
`}</code></pre></div>{/if}

  {#if dots === 'Yes'}<div>
      <p>Scroll Markers</p>
      <pre><code>{`.carousel {
  scroll-marker-group: after;

  &::scroll-marker-group {
    position: fixed;
    position-anchor: --carousel;
    position-area: block-end;
    margin: 10px;

    display: grid;
    grid-auto-columns: 20px;
    grid-auto-flow: column;
    gap: 20px;
  }

  `}{#if paged === 'No'}{`& > li::scroll-marker {
    content: ' ';

    &:target-current {
      background: var(--accent);
    }
  }
}`}{/if}{#if paged === 'Yes'}{`&::column::scroll-marker {
    content: ' ';

    &:target-current {
      background: var(--accent);
    }
  }
}`}{/if}
</code></pre></div>{/if}

{#if inerted === 'Yes'}
  <div>
      <p>Inert Interactivity</p>
      {#if paged === 'No'}<pre><code>{`.carousel {
  > li {
    container-type: scroll-state;

    > .card {
      @container not scroll-state(snapped: x) {
        interactivity: inert;
        opacity: .25;
      }
    }
  }
}
`}</code></pre>{/if}
      {#if paged === 'Yes'}<pre><code>{`.carousel {
  [tabindex] {
    animation: offscreen-inert linear both;
    animation-timeline: view(x);
  }
}

@keyframes offscreen-inert {
  entry 0%, entry 19%, exit 100% {
    interactivity: inert;
    opacity: .25;
  }
  entry 20%, exit 99% {
    interactivity: auto;
    opacity: 1;
  }
}`}</code></pre>{/if}
    </div>
{/if}
</div>

{@html `<style>${`
  .with-inert .card {
    transition: opacity .5s ease;

    @container not scroll-state(snapped: x) {
      interactivity: inert;
      opacity: .25;
    }
  }

  .with-inert.with-pages .card {
    animation: offscreen-inert linear both;
    animation-timeline: view(x);
  }

  @keyframes offscreen-inert {
    entry 0%, entry 19%, exit 100% {
      interactivity: inert;
      opacity: .25;
    }
    entry 20%, exit 99% {
      interactivity: auto;
      opacity: 1;
    }
  }
}`}</style>`}

<style>
  .carousel {
    /* Scrolling behavior. */
    overflow-x: auto;
    scroll-behavior: smooth;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    scroll-snap-type: x mandatory;

    /* Reset list styles */
    list-style-type: none;
    counter-reset: item;
    
    /* Styles and layout */
    padding: var(--size-3);
    scroll-padding: var(--size-3);
    
    container-type: inline-size scroll-state;
    inline-size: 1024px;
    max-inline-size: 100vw;

    anchor-name: --carousel;

    &.with-pages {
      columns: 1;
      block-size: 13lh;
      resize: both;
      text-align: center;

      & > li {
        block-size: 100%;
        margin: var(--size-2);
      }

      &::column {
        scroll-snap-align: center;
        container-type: scroll-state;
      }
    }

    &:not(.with-pages) {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: var(--size-content-1);
      gap: var(--size-4);

      & > li {
        scroll-snap-align: center;
        container-type: scroll-state;
      }
    }

    & li {
      container-type: scroll-state;
      padding: 0;
      display: inline-grid;
      counter-increment: item;
    }

    & .card {
      display: inline-flex;
      place-items: center;
      place-content: center;

      aspect-ratio: var(--ratio-portrait);

      border: 1px solid var(--surface-3);
      box-shadow: var(--shadow-2);
      border-radius: var(--radius-2);

      font-family: var(--font-antique);
      font-size: var(--font-size-5);
      
      &:focus {
        outline: 2px solid var(--link);
      }
    }

    /* Scroll marker pages */
    &.with-dots {
      scroll-marker-group: after;

      &::scroll-marker-group {
        position: fixed;
        position-anchor: --carousel;
        position-area: block-end;
        margin-block-start: var(--size-3);

        display: grid;
        grid-auto-columns: var(--size-3);
        grid-auto-flow: column;
        gap: var(--size-3);
        align-items: center;
        justify-content: center;
      }
    }

    /* Scroll markers */
    &.with-pages::column::scroll-marker {
      content: ' ';
      aspect-ratio: 1;
      border-radius: var(--radius-round);
      border: 1px solid var(--surface-4);
    }

    &.with-pages::column::scroll-marker:target-current {
      background: var(--link);
      border-color: var(--link);
    }

    &:not(.with-pages) > li {
      &::scroll-marker {
        content: ' ';
        cursor: pointer;
        aspect-ratio: 1;
        border-radius: var(--radius-round);
        border: 1px solid var(--surface-4);
      }

      &::scroll-marker:target-current {
        background: var(--link);
        border-color: var(--link);
      }

      &::scroll-marker:focus-visible {
        outline-offset: 2px;
        outline: 2px solid var(--link);
      }
    }
    
    /* Scroll icon buttons */
    &.with-buttons {
      &::scroll-button(right), &::scroll-button(left) {
        cursor: pointer;

        position: fixed;
        position-anchor: --carousel;

        font-size: var(--font-size-3);
        inline-size: 44px;

        font-family: "Material Symbols Outlined";
        line-height: 1;
        font-variation-settings:
          'FILL' 0,
          'wght' 100,
          'GRAD' 0,
          'opsz' 24;

        display: flex;
        place-items: center;
        place-content: center;
        aspect-ratio: 1;
        background: var(--surface-1);
        color: var(--text-2);
        border: 1px solid var(--surface-3);
        border-radius: var(--radius-round);
      }
      &::scroll-button(right):not(:disabled):hover,
      &::scroll-button(left):not(:disabled):hover {
        border-color: var(--surface-4);
        color: var(--text-1);
        font-variation-settings: 'opsz' 30;
      }
      &::scroll-button(right):focus-visible,
      &::scroll-button(left):focus-visible {
        outline-offset: 2px;
        outline: 2px solid var(--link);
      }
      &::scroll-button(right):disabled,
      &::scroll-button(left):disabled {
        cursor: not-allowed;
        opacity: .25;
      }
      &::scroll-button(right) {
        --_inner: center span-inline-start;
        --_outer: inline-end center;

        position-area: var(--_outer);
        content: 'arrow_forward' / 'Next';
      }
      &::scroll-button(left) {
        --_inner: center span-inline-end;
        --_outer: inline-start center;

        position-area: var(--_outer);
        content: 'arrow_back' / 'Previous';
      }

      @media (width < 1200px) {
        &::scroll-button(right) {
          position-area: var(--_inner);
        }
        &::scroll-button(left) {
          position-area: var(--_inner);
        }
      }
    }
  }

  .settings {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    justify-items: center;
    gap: max(var(--size-7), 5vmin);
    padding-inline: var(--size-5);
    text-align: center;
  }

  .example-code {
    display: flex;
    flex-wrap: wrap;
    place-items: start;
    gap: var(--size-4);
    padding: var(--size-5);

    & > section {
      display: grid;
      gap: var(--size-8);

      & > div {
        display: grid;
        align-items: start;

        & > * {
          grid-area: 1/1;
        }
      }

      & p {
        z-index: 1;
        margin-block-start: -.75lh;
        margin-inline-start: .5lh;
        max-inline-size: max-content;
        padding-inline: 1ch;
        padding-block: .25ch;
        background: var(--link);
        color: light-dark(white, black);
        border-radius: var(--radius-round);
        box-shadow: var(--shadow-3);
      }
    }

    & h3 {
      font-weight: 200;
    }
  }
</style>