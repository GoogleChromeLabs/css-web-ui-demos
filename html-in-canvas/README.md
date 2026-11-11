# HTML-in-Canvas Examples

The [HTML-in-Canvas API](https://github.com/WICG/html-in-canvas) lets you draw DOM content directly into a `<canvas>` or a WebGL and WebGPU texture while keeping the UI interactable, accessible, and hooked up to your favorite browser features.

## 🛠️ Setup & Requirements

To view these examples, you must use **Chrome 148** or later and enable the following flag:
- `chrome://flags/#canvas-draw-element`

## 💻 How to Run Locally

1. Make sure you'e in the right directory:
   ```bash
   cd html-in-canvas
   ```

2. Start a local server serving the `public` directory. You can use any static file server, for example:

   **Using Node.js (npx):**
   ```bash
   npx serve public
   ```

   **Using Python:**
   ```bash
   python3 -m http.server --directory public
   ```

3. Open the URL provided by the server in Chrome 148 or later with the `chrome://flags/#canvas-draw-element` flag enabled.


## 📖 Basic Implementation Pattern

```html
<canvas id="my-canvas" layoutsubtree>
  <!-- DOM content lives inside, processed by layout engine but not rendered -->
  <div id="ui-overlay">Hello World</div>
</canvas>

<script>
  const canvas = document.getElementById('my-canvas');
  const ctx = canvas.getContext('2d');
  const el = document.getElementById('ui-overlay');

  canvas.onpaint = () => {
    ctx.reset();
    // Draw the HTML element at (100, 100)
    const transform = ctx.drawElementImage(el, 100, 100);
    // Sync DOM for hit-testing
    el.style.transform = transform.toString();
  };
</script>
```

## 🟦 TypeScript Demos

[`demos/html-in-canvas-typescript.html`](public/demos/html-in-canvas-typescript.html) is written in strict TypeScript ([`src/html-in-canvas-typescript.ts`](src/html-in-canvas-typescript.ts)) and typed by [`@types/dom-html-in-canvas`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/dom-html-in-canvas) from DefinitelyTyped, enabled in [`tsconfig.json`](tsconfig.json) with `"types": ["dom-html-in-canvas"]`. It runs in Chrome 157 or later, no flags needed.

The compiled JavaScript in `public/js/` is committed, so the demos can be served as they are. After you change the TypeScript source, rebuild it:

```bash
npm install
npm run typecheck  # tsc --noEmit
npm run build      # compiles src/*.ts to public/js/
```

> [!NOTE]
> **TEMPORARY:** `@types/dom-html-in-canvas` isn't published to npm yet. Until it is, `npm install` installs it from the [`dom-html-in-canvas-package`](https://github.com/ewewraw/DefinitelyTyped/tree/dom-html-in-canvas-package) branch of ewewraw/DefinitelyTyped, a package-only split of [`types/dom-html-in-canvas`](https://github.com/ewewraw/DefinitelyTyped/tree/html-in-canvas/types/dom-html-in-canvas) on the DefinitelyTyped PR branch `html-in-canvas`.
>
> Once it's published, replace the devDependency with `npm install --save-dev @types/dom-html-in-canvas` and remove this note. `tsconfig.json` doesn't need to change.

## ⚖️ License

Apache 2.0 License. See the root [LICENSE](../LICENSE) for details.

## Disclaimer

This is not an officially supported Google product. This project is not eligible for the [Google Open Source Software Vulnerability Rewards Program](https://bughunters.google.com/open-source-security). This project is intended for demonstration purposes only. It is not intended for use in a production environment.

## Credits & Attribution

This project incorporates 3D models from several creators. Below is the attribution list for the assets used:

### 3D Model Assets
| Asset | Author / Creator | Original Source | License |
| :--- | :--- | :--- | :--- |
| **Littlest Tokyo** | [Glen Fox](https://www.artstation.com/glenatron) | [Sketchfab](https://skfb.ly/6R7XY) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| **Round Spectacles** | [James Ray Cock](https://polyhaven.com/a/round_spectacles) | [Poly Haven](https://polyhaven.com/) | [CC0 (Public Domain)](https://creativecommons.org/publicdomain/zero/1.0/) |
| **Stanford Dragon** | [Stanford University](http://graphics.stanford.edu/data/3Dscanrep/) | [Three.js Assets](https://github.com/mrdoob/three.js/) | Attribution Requested |
| **Mammoth** | [Smithsonian Institution](https://3d.si.edu/) | [Three.js Assets](https://github.com/mrdoob/three.js/) | [CC0 (Public Domain)](https://creativecommons.org/publicdomain/zero/1.0/) |