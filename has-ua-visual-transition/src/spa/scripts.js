/**
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

window.addEventListener("popstate", (event) => {
    console.log('popstate');
    let hasUAVisualTransition;
    if (!('hasUAVisualTransition' in PopStateEvent.prototype)) {
        hasUAVisualTransition = 'unsupported';
    } else {
        hasUAVisualTransition = event.hasUAVisualTransition ? 'true' : 'false';
    }

    document.querySelector('output').innerText = hasUAVisualTransition;
    curPage = event.state?.curPage ?? 1;
    document.querySelector('#curPage').innerText = `${curPage}`;
    document.querySelector('a').innerText = `To page ${curPage + 1}`;
});

let curPage = 1;
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('a').addEventListener('click', (e) => {
        e.preventDefault();

        // Update page
        curPage++;

        // Reflect page in UI
        history.pushState({ curPage }, '');
        document.querySelector('#curPage').innerText = `${curPage}`;
        document.querySelector('a').innerText = `To page ${curPage + 1}`;

        // Update hasUAVisualTransition
        let hasUAVisualTransition;
        if (!('hasUAVisualTransition' in PopStateEvent.prototype)) {
            hasUAVisualTransition = 'unsupported';
        } else {
            hasUAVisualTransition = 'false'; // Because we navigated, it is always false
        }
        document.querySelector('output').innerText = hasUAVisualTransition;
    });
})