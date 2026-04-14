# Liquid Glass Reference

This folder contains the extracted sources for the "Liquid Glass" effect from [kube.io](https://kube.io/blog/liquid-glass-css-svg/).

## Contents

- `index.html`: Contains the HTML structure for the "Switch" demo and the "Music Player" demo. The "Switch" demo is fully functional using the extracted SVG filters and CSS. The "Music Player" demo is a reference structure demonstrating how the filter is applied.
- `styles.css`: The full stylesheet extracted from the website, containing all the utility classes (Tailwind-like) used in the HTML.
- `*.png`: Displacement and specular maps used by the SVG filters.

## How it works

The effect is achieved using an SVG `filter` with `feDisplacementMap`.

1. **Displacement Map**: A grayscale image (`displacement-map-*.png`) is used to distort the background.
2. **Backdrop Filter**: The filter is applied via CSS `backdrop-filter: url(#filter-id)`.
3. **SVG Filter**: The filter uses `feImage` to load the displacement map and `feDisplacementMap` to apply it.
4. **Specular Map**: An optional specular map (`specular-map-*.png`) is used to add highlights/reflections, composited using `feComposite` and `feBlend`.

## Usage

Open `index.html` in a browser to view the extracted demos.
