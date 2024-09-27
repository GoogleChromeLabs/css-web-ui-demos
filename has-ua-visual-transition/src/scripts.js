/**
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

window.addEventListener("popstate", (event) => {
    document.querySelector('output').innerText = event.hasUAVisualTransition ? 'true' : 'false';
    curPage = event.state?.curPage ?? 1;
    document.querySelector('a').innerText = `To page ${curPage + 1}`;
});

let curPage = 1;
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('a').addEventListener('click', (e) => {
        e.preventDefault();
        curPage++;
        history.pushState({ curPage }, '');
        document.querySelector('a').innerText = `To page ${curPage + 1}`;
    });
})