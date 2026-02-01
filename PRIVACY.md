# Privacy Policy for n8n-xtend

**Last updated:** January 2025

## Overview

n8n-xtend is a browser extension that adds client-side enhancements to n8n workflow automation instances. This policy explains how the extension handles your data.

## Data Collection

**n8n-xtend does not collect, store, or transmit any personal data.**

## How the Extension Works

The extension operates entirely within your browser:

1. **Authentication**: The extension uses your existing n8n session. It does not store, access, or transmit your credentials. When making API requests to display folders and workflows, the browser automatically includes your session cookies.

2. **Local Storage**: The extension stores only UI preferences (which folders are expanded/collapsed) in your browser's local storage. This data never leaves your device.

3. **Network Requests**: All API requests are made directly to your n8n instance (the same domain you're viewing). No data is sent to any third-party servers.

## Permissions

The extension requires access to n8n domains to:
- Inject the folder tree UI into the n8n sidebar
- Make API calls to fetch your folder and workflow structure

## Data Security

- No credentials are stored or handled by the extension
- No data is transmitted to external servers
- All communication uses your existing authenticated session
- The extension performs read-only operations

## Third Parties

This extension does not share any data with third parties. There are no analytics, tracking, or advertising components.

## Changes to This Policy

Any changes to this privacy policy will be reflected in the extension update notes.

## Contact

For questions about this privacy policy, please open an issue on the GitHub repository.
