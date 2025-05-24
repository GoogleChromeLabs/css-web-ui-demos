<script>
  import Switch from './Switch.svelte'

  let buttons = 'No';
  let dots = 'No';
  let paged = 'No';
  let inerted = 'No';
</script>

<section>
  <pre><code>{`<div class="carousel`}{#if buttons === 'Yes'} carousel--scroll-buttons{/if}{#if dots === 'Yes'} carousel--scroll-markers{/if}{#if inerted === 'Yes'} carousel--inert{/if}{`">
  <div class="carousel__slide" data-label="Slide 1">…</div>
  <div class="carousel__slide" data-label="Slide 2">…</div>
  <div class="carousel__slide" data-label="Slide 3">…</div>
  …
<div>`}</section>

<div class="settings">
  <Switch bind:value={buttons} label="Scroll Buttons" design="multi" options={['No', 'Yes']}/>
  <Switch bind:value={dots} label="Dot Navigation (markers)" design="multi" options={['No', 'Yes']}/>
  <Switch bind:value={paged} label="Auto Pages" design="multi" options={['No', 'Yes']}/>
  <Switch bind:value={inerted} label="Inert" design="multi" options={['No', 'Yes']}/>
</div>

<div
  class="carousel"
  class:carousel--buttons={buttons === 'Yes'}
  class:carousel--markers={dots === 'Yes'}
  class:carousel--paged={paged === 'Yes'}
  class:carousel--inert={inerted === 'Yes'}
  tabindex=0
>
  <div class="carousel__slide" data-label="Slide 1">
    <div class="card">1</div>
  </div>
  <div class="carousel__slide" data-label="Slide 2">
    <div class="card">2</div>
  </div>
  <div class="carousel__slide" data-label="Slide 3">
    <div class="card">3</div>
  </div>
  <div class="carousel__slide" data-label="Slide 4">
    <div class="card">4</div>
  </div>
  <div class="carousel__slide" data-label="Slide 5">
    <div class="card">5</div>
  </div>
  <div class="carousel__slide" data-label="Slide 6">
    <div class="card">6</div>
  </div>
  <div class="carousel__slide" data-label="Slide 7">
    <div class="card">7</div>
  </div>
  <div class="carousel__slide" data-label="Slide 8">
    <div class="card">8</div>
  </div>
  <div class="carousel__slide" data-label="Slide 9">
    <div class="card">9</div>
  </div>
  <div class="carousel__slide" data-label="Slide 10">
    <div class="card">10</div>
  </div>
  <div class="carousel__slide" data-label="Slide 11">
    <div class="card">11</div>
  </div>
  <div class="carousel__slide" data-label="Slide 12">
    <div class="card">12</div>
  </div>
  <div class="carousel__slide" data-label="Slide 13">
    <div class="card">13</div>
  </div>
  <div class="carousel__slide" data-label="Slide 14">
    <div class="card">14</div>
  </div>
  <div class="carousel__slide" data-label="Slide 15">
    <div class="card">15</div>
  </div>
  <div class="carousel__slide" data-label="Slide 16">
    <div class="card">16</div>
  </div>
</div>

<div class="example-code">
  <section>
    <div>
      <p>Base Carousel styles</p>
      {#if paged === 'No'}<pre><code>{`.carousel {
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  anchor-name: --carousel;

  > .carousel__slide {
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
    </div></section>

    {#if buttons === 'Yes'}<section><div>
      <p>Scroll Button styles</p>
      <pre><code>{`.carousel--scroll-buttons {
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
`}</code></pre></div></section>{/if}

  {#if dots === 'Yes'}<section><div>
      <p>Scroll Marker styles</p>
      <pre><code>{`.carousel--scroll-markers {
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

  `}{#if paged === 'No'}{`> .carousel__slide {
    &::scroll-marker {
      content: '' / attr(data-label);
    }

    &::scroll-marker:target-current {
      background: var(--accent);
    }
  }
}`}{/if}{#if paged === 'Yes'}{`&::column::scroll-marker {
    content: ' ';
  }
  &::column::scroll-marker:target-current {
    background: var(--accent);
  }
}`}{/if}
</code></pre></div></section>{/if}

{#if inerted === 'Yes'}
  <section><div>
      <p>Inert Interactivity styles</p>
      {#if paged === 'No'}<pre><code>{`.carousel--inert {
  > .carousel__slide {
    container-type: scroll-state;

    > .card {
      @container not scroll-state(snapped) {
        interactivity: inert;
        opacity: .25;
      }
    }
  }
}
`}</code></pre>{/if}
      {#if paged === 'Yes'}<pre><code>{`.carousel--inert {
  [tabindex] {
    animation: offscreen-inert linear both;
    animation-timeline: view(x);
  }
}

@keyframes offscreen-inert {
  entry 0%, exit 100% {
    interactivity: inert;
  }
  entry 100%, exit 0% {
    interactivity: auto;
  }
}`}</code></pre>{/if}
    </div></section>
{/if}
</div>

{@html `<style>${`
  .carousel--inert {
    transition: opacity .5s ease;
  }

  .carousel--inert:not(.carousel--paged) .card {
    @container not scroll-state(snapped) {
      interactivity: inert;
      opacity: .25;
    }
  }

  .carousel--inert.carousel--paged .card {
    animation: offscreen-inert linear both;
    animation-timeline: view(x);
  }

  @keyframes offscreen-inert {
    entry 0%, exit 100% {
      interactivity: inert;
      opacity: .25;
    }
    entry 100%, exit 0% {
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

    /* Styles and layout */
    padding: var(--size-3);
    scroll-padding: var(--size-3);

    container-type: inline-size scroll-state;
    inline-size: 1024px;
    max-inline-size: 100vw;

    anchor-name: --carousel;

    &.carousel--paged {
      columns: 1;
      block-size: 13lh;
      resize: both;
      text-align: center;

      & > .carousel__slide {
        block-size: 100%;
        margin: var(--size-2);
      }

      &::column {
        scroll-snap-align: center;
        container-type: scroll-state;
      }
    }

    &:not(.carousel--paged) {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: var(--size-content-1);
      gap: var(--size-4);

      & > .carousel__slide {
        scroll-snap-align: center;
        container-type: scroll-state;
      }
    }

    & .carousel__slide {
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

      background: light-dark(white, var(--surface-2));
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
    &.carousel--markers {
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
    &.carousel--paged::column::scroll-marker {
      content: ' ';
      aspect-ratio: 1;
      border-radius: var(--radius-round);
      border: 1px solid var(--surface-4);
    }

    &.carousel--paged::column::scroll-marker:target-current {
      background: var(--link);
      border-color: var(--link);
    }

    &.carousel--paged::column::scroll-marker:focus-visible {
      outline-offset: 2px;
      outline: 2px solid var(--link);
    }

    &:not(.carousel--paged) > .carousel__slide {
      &::scroll-marker {
        content: '' / attr(data-label);
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
    &.carousel--buttons {
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
        margin: var(--size-3);
      }
      &::scroll-button(right):not(:disabled):hover,
      &::scroll-button(left):not(:disabled):hover {
        background: light-dark(white, var(--surface-2));
        border-color: var(--surface-4);
        color: var(--text-1);
        font-variation-settings: 'opsz' 30;
      }
      &::scroll-button(right):focus-visible,
      &::scroll-button(left):focus-visible {
        background: light-dark(white, var(--surface-2));
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
    flex-flow: row wrap;
    place-items: start center;
    place-content: start center;
    gap: var(--size-9) var(--size-7);
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
