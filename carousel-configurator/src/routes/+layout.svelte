<script>
  import './index.css';
</script>

<div class="app">
	<slot />
</div>

<style>
  .app {
    display: grid;
    place-items: center;
    gap: 10vmin;
    padding-block: 15vmin;
  }
</style>