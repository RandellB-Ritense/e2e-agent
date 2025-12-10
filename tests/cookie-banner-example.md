# Cookie Banner Test Example

## Goal
Navigate to a website, automatically dismiss the cookie consent banner, then explore the main navigation links.

## Starting URL
https://example.com

## Max Steps
10

## Auto Dismiss Cookies
true

## Success Criteria
- Cookie banner dismissed automatically (if present)
- Main navigation links are accessible
- Page content is visible and interactive

## Notes
The "Auto Dismiss Cookies" option is enabled by default. This test explicitly sets it to
demonstrate the feature. The agent will automatically look for and click common cookie
consent buttons like "Accept All", "I Agree", etc. before starting the main test actions.

You can disable this by setting "Auto Dismiss Cookies" to false.
