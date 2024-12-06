/**
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Keep track of the last successful navigation
navigation.lastSuccessfulEntry = navigation?.currentEntry;
navigation.addEventListener('navigatesuccess', e => {
	navigation.lastSuccessfulEntry = e.currentTarget.currentEntry;
});

// Turn our MPA into an SPA … WOOHOOW!
navigation.addEventListener("navigate", (e) => {

	// Don’t intercept when we shouldn’t
	if (shouldNotIntercept(e)) {
		return;
	}

	e.intercept({
		handler: async () => {

			// @TODO: show loading while fetch is running …

			// @TODO: Maybe I should move this whole fetch logic to the outside of e.intercept?
			// Because on slow connections you end up with an updated URL but with the old content still visible â€¦

			// Get new HTML
			const response = await fetch(e.destination.url, {
				signal: e.signal, // @ref https://developer.chrome.com/docs/web-platform/navigation-api/#abort_signals
			});
			const html = await response.text();
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, "text/html");
			const $body = doc.querySelector("body");
			const $title = doc.querySelector("head title");

			const update = (hasUAVisualTransition) => {
				document.title = $title.innerText;
				document.querySelector('body').replaceWith($body); // You do trust your own markup, right?
				document.querySelector('output').innerText = hasUAVisualTransition;
			};

			// The UA already provided us with a Visual Transition,
			// there is no need to do one ourselves.
			if (e.hasUAVisualTransition) {
				update(true);
			}

			// Go View Transitions, go!
			else {
				const t = document.startViewTransition(() => {
					update(false);
				});
			}
		}
	});
});

// Helper function to determine if a navigation should be intercepted or not
// @src https://developer.chrome.com/docs/web-platform/navigation-api/#deciding_how_to_handle_a_navigation
const shouldNotIntercept = (navigationEvent) => {
	return (
		!navigationEvent.canIntercept ||
		// If this is just a hashChange,
		// just let the browser handle scrolling to the content.
		navigationEvent.hashChange ||
		// If this is a download,
		// let the browser perform the download.
		navigationEvent.downloadRequest ||
		// If this is a form submission,
		// let that go to the server.
		navigationEvent.formData
	);
};
