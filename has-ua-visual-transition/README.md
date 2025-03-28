# hasUAVisualTransition

Testpages for `PopStateEvent#hasUAVisualTransition` and `NavigateEvent#hasUAVisualTransition`

## Instructions

- Launch the project
- Choose the flavor you want to test
- Click the link a few times
- Navigate back, using the UA back button or using a swipe gesture.
- Check the reported value for `hasUAVisualTransition`

## Launching the project

### Locally

- Run `npx serve src`
- Visit http://localhost:3000

### Online

- Visit https://chrome.dev/has-ua-visual-transition/

## Publication

This demo gets published to https://chrome.dev/. Publishing is only possible by Googlers with proper access.

```
gcloud auth login
gsutil -m rsync -rd src gs://chrome-dev-demos/public/has-ua-visual-transition
```