# Privacy Policy for n8n-xtend

**Last updated:** February 2026

## Summary

**n8n-xtend does not collect, store, or transmit any personal or sensitive user data to external servers.** The extension operates entirely client-side within your browser.

## Data Collection

### What We Do NOT Collect

- Personal information (names, emails, addresses)
- Authentication credentials or passwords
- Financial or payment information
- Web browsing history or activity
- Website content from sites other than your n8n instance
- Analytics or usage statistics
- Any data for advertising purposes

### What We DO Store Locally

The extension stores minimal data in your browser:

| Data | Purpose | Storage Location |
|------|---------|------------------|
| Expanded folder IDs | Remember which folders you had open | Browser IndexedDB |
| Theme preference | Match n8n's dark/light mode | Read from n8n's localStorage |
| Extension toggle states | Remember which extensions are enabled/disabled | Browser IndexedDB |
| Self-hosted instance URLs | Register content scripts for your n8n instances | Chrome sync storage |

This data:
- Never leaves your device (Chrome sync storage syncs only to your own signed-in browsers)
- Is not transmitted to any external server
- Can be cleared by clearing your browser data or removing the extension

## How the Extension Works

n8n-xtend enhances your n8n workflow automation interface with additional features:

1. **Tree Navigation** — Displays your projects, folders, and workflows in a collapsible tree
2. **Workflow Capture** — Exports workflow diagrams as PNG/SVG images
3. **Variables Enhancement** — Improves variable syntax display with click-to-copy

### Network Requests

The extension makes API requests **only to your own n8n instance** (the same domain you're viewing). These requests:
- Use your existing authenticated session (browser cookies)
- Fetch folder/workflow structure for display
- Move items when you drag-and-drop

**No data is sent to the extension developer, third parties, or any external servers.**

## Permissions

### Required Permissions

| Permission | Purpose |
|------------|---------|
| `scripting` | Register content scripts for self-hosted n8n instances you add |
| `storage` | Save your list of self-hosted instance URLs and extension preferences |

### Host Permissions

**n8n Cloud (`*.n8n.cloud`)** — The extension has static access to all n8n Cloud instances. No action is required from you; it works automatically.

**Self-hosted instances** — The extension does **not** have access to any other websites by default. If you run n8n on your own domain, you explicitly grant permission to that specific URL through the extension popup. The browser will show a permission prompt confirming your choice.

These per-instance permissions are listed under `optional_host_permissions` in the manifest, meaning the extension can only access sites you have individually approved.

### Why This Model

n8n can be self-hosted on any domain, so the extension cannot know your URL in advance. Rather than requesting broad access to all websites, n8n-xtend asks you to add your specific instance URL. This gives you full control over which sites the extension can run on.

As an additional safety layer, the content script also verifies it is running on an n8n instance before activating.

## Data Security

- **No credentials stored** — Uses your existing n8n session
- **No external transmission** — All data stays between your browser and your n8n instance
- **No code evaluation** — No use of `eval()` or dynamic code execution
- **HTTPS only** — All n8n API communication uses your instance's existing secure connection

## Third Parties

This extension:
- Does NOT share data with third parties
- Does NOT contain analytics or tracking
- Does NOT serve advertisements
- Does NOT sell or monetize user data

### Bundled Dependencies

The extension includes one bundled library (`modern-screenshot`) for the workflow capture feature. This library runs entirely client-side and does not transmit any data.

## Limited Use Disclosure

In compliance with Chrome Web Store policies:

> n8n-xtend's use and transfer of information received from browser APIs adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements. The extension does not collect personal or sensitive user data. All functionality operates client-side, and the only network communication is with the user's own n8n instance using their existing authenticated session.

## Children's Privacy

This extension is not directed at children under 13 and does not knowingly collect any information from children.

## Changes to This Policy

Any changes to this privacy policy will be posted here with an updated date. Significant changes will be noted in extension update release notes.

## Contact

For questions about this privacy policy or the extension's data practices:
- Open an issue: [GitHub Issues](https://github.com/TBLgGamin/n8n-xtend/issues)
- Repository: [github.com/TBLgGamin/n8n-xtend](https://github.com/TBLgGamin/n8n-xtend)

## Source Code

This extension is open source. You can review exactly what the extension does:
[https://github.com/TBLgGamin/n8n-xtend](https://github.com/TBLgGamin/n8n-xtend)
