/**
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

window.addEventListener('pagereveal', (event) => {
    let hasUAVisualTransition;
    if (!('hasUAVisualTransition' in PageRevealEvent.prototype)) {
        hasUAVisualTransition = 'unsupported (PageRevealEvent.hasUAVisualTransition)';
    } else {
        hasUAVisualTransition = event.hasUAVisualTransition ? 'true' : 'false';
    }
    document.querySelector('output').innerText = hasUAVisualTransition;
});

document.addEventListener('DOMContentLoaded', (event) => {
    if (!('PageRevealEvent' in window)) {
        document.querySelector('output').innerText = 'unsupported (PageRevealEvent)';
    }
});