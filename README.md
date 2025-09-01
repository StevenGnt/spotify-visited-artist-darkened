# About

This script darkens the tiles of artists whose Spotify (web) page you already visited.

It **only works once you've installed the script**, and it **resets when you clear the Spotify browser data** (namely, the local storage).

# How to install

1. Install an extension to run custom scripts (such as Tampermonkey, Violentmonkey ...).
2. Install the script in that extension (see example below)
3. You're done.

# How to use
- Visited pages automatically detected
- Double tap "Ctrl" to toggle the dimming on/off
- Double tap "Shift" to toggle the dimming on/off for a certain page (kept in memory)

# Install example

With Tampermonkey
1. Open the extension's menu in the browser
2. "Create a script"
3. Replace the content of the editor with the content from `script.ts` and save it
4. Ensure that the script is enabled and that the extension has the right pemissions to run (see [Tampermonkey's FAQ](https://www.tampermonkey.net/faq.php#Q209)).