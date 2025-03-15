# Site Limiter Chrome Extension

## Overview

Site Limiter is a Chrome extension designed to help users manage their time spent on specific websites. It allows you to set time limits for browsing certain sites and implements a focus mode to boost productivity.

## Features

- Set custom time limits for specified websites
- Automatic blocking of sites once the time limit is reached
- Focus mode to block all distracting sites for a set duration
- Cooldown period after time limit is reached
- Persistent timer across browser sessions
- Easy-to-use popup interface

## Installation

1. Clone this repository or download the source code.
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Enable "Developer mode" in the top right corner.
4. Click "Load unpacked" and select the directory containing the extension files.

## Usage

### Setting Time Limits

1. Click on the Site Limiter icon in your Chrome toolbar.
2. For each listed site, you'll see the remaining time (if a timer is active).
3. To set a new timer, visit the website and you'll be prompted to set a time limit. Default timers are presented as buttons. 

### Activating Focus Mode

1. Click on the Site Limiter icon.
2. Enter the number of minutes you want to focus in the "Focus Mode" section.
3. Click "Activate Focus Mode" or press enter to start.

## Configuration

To add or remove websites from the limiter:

1. Open `background.js`.
2. Modify the `BLOCKED_SITES` array.
3. Update the `host_permissions` in `manifest.json` accordingly.

## License

[MIT License](LICENSE)

## Support

If you encounter any issues or have questions, please file an issue on the GitHub repository.