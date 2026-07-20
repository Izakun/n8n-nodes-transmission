<img src="nodes/Transmission/transmission.svg" width="90" align="right" alt="Transmission" />

# n8n-nodes-transmission

[![npm version](https://img.shields.io/npm/v/n8n-nodes-transmission.svg)](https://www.npmjs.com/package/n8n-nodes-transmission)
[![npm downloads](https://img.shields.io/npm/dm/n8n-nodes-transmission.svg)](https://www.npmjs.com/package/n8n-nodes-transmission)
[![License: MIT](https://img.shields.io/npm/l/n8n-nodes-transmission.svg)](./LICENSE)
[![n8n verified](https://img.shields.io/badge/n8n-verified%20community%20node-EA4B71)](https://docs.n8n.io/integrations/community-nodes/installation/verified-install/)

Community node for **n8n** to interact with **Transmission**. It lets you automate
Transmission directly from your n8n workflows using a secure stored credential.

> ✅ **Verified community node** — installable directly from the n8n node panel
> (self-hosted **and** n8n Cloud).

## Installation

This is a **verified** community node: in n8n click **+ (Add node)**, search for
**Transmission**, and add it — no manual install needed.

<details>
<summary>Manual install (older n8n, or as an unverified package)</summary>

Go to **Settings → Community Nodes → Install** and enter `n8n-nodes-transmission`.
</details>

## Operations

| Operation | Description |
|---|---|
| **Add Torrent** | Add a torrent from a magnet or URL |
| **Get Free Space** | Get the free disk space |
| **Get Session** | Get the session settings |
| **Get Session Stats** | Get the session stats |
| **Get Torrents** | Get many torrents |
| **Remove Torrent** | Remove a torrent |
| **Start Torrent** | Start a torrent |
| **Stop Torrent** | Stop a torrent |
| **Test Port** | Test whether the port is open |
| **Verify Torrent** | Verify a torrent |

## Authentication

This node uses the **Transmission API** credential. In n8n, go to **Credentials → New**, pick
**Transmission API**, and fill in:

- **Base URL** — the address of your instance, e.g. `http://transmission:9091` (no trailing slash).
- **Username** — your account username.
- **Password** — your account password.

HTTP Basic authentication (username + password).

**Where to find it:** See the service documentation: https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md

The credential's **Test** button verifies the connection before you save.

## Usage

1. Add the **Transmission** node to a workflow (after a trigger such as *When clicking 'Test workflow'* or a Schedule Trigger).
2. Select your **Transmission API** credential.
3. Pick an **Operation** and run the workflow — the response is returned as JSON for the next node.

## Compatibility

Requires n8n **1.0** or newer. Built and linted with the official `@n8n/node-cli`, and
published to npm with a build-provenance attestation.

## Resources

- [Transmission](https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](./LICENSE)
