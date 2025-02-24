<script>
  import Configurator from "../components/Configurator.svelte";
</script>

<svelte:head>
  <title>CSS Carousel Configurator</title>
  <meta
    name="description"
    content="Learn about CSS carousel features by changing options and seeing code change."
  />
  <meta name="theme-color" content="Canvas" />
</svelte:head>

<div class="support-banner">
  <h2>Experimental Feature</h2>
  <h3>⚠️ Unsupported ⚠️</h3>
  <p>
    This configurator requires a few CSS features that aren't present in your
    current browser.
  </p>
  <p>
    To try this out, download Canary and visit <a
      href="chrome://flags/#enable-experimental-web-platform-features"
      >chrome://flags/#enable-experimental-web-platform-features</a
    > in a tab, enable it, and reload this page.
  </p>
</div>

<header>
  <h1>Carousel Configurator</h1>
  <p>
    A builder-like experience to help visualize the capabilities of a <b
      >CSS only Carousel</b
    >: <a href="https://flackr.github.io/carousel/scroll-button/">buttons</a>,
    <a href="https://flackr.github.io/carousel/scroll-marker/">markers</a>,
    <a href="https://flackr.github.io/carousel/fragmentation/">paging</a>
    and <a href="https://flackr.github.io/carousel/inert/">inertness</a>.
  </p>
	<p><a href="https://drafts.csswg.org/css-overflow-5/">Overflow 5 CSS Spec</a></p>
</header>

<Configurator />

<style>
  header {
    display: grid;
    gap: var(--size-2);
  }

  h1 {
    text-align: center;
    margin-inline: auto;
    font-size: var(--font-size-5);
  }

  p {
    max-inline-size: var(--size-content-2);
    text-align: center;
    margin-inline: auto;
  }

  .support-banner {
    display: none;

    border: 1px solid var(--surface-3);
    padding-inline: var(--size-8);
    padding-block: var(--size-7);
    box-shadow: var(--shadow-5);

    @supports not selector(::scroll-marker) {
      display: grid;
      gap: var(--size-3);
    }

    & > :is(h2, h3) {
      text-align: center;
    }
  }
</style>
