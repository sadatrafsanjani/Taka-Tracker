---
layout: default
title: Taka Tracker
---

# Taka Tracker

**Live Bangladeshi Taka exchange rates and a 7-day trend chart, one click away in your browser toolbar.**

[Features](#features) · [How it works](#how-it-works) · [Privacy Policy](#privacy-policy) · [Contact](#contact)

![Taka Tracker popup showing the rates table and the 7-day trend chart](../screenshot/screenshot.png)

---

## Features

| | |
|---|---|
| **Live rates** | Buy and sell rates published by Bangladesh Bank, shown in a compact table |
| **7-day trend** | A clean line chart for any currency, with USD selected by default |
| **Low, High, Change** | A one-line summary of the period under the chart |
| **One-click switching** | Click any row in the table to change the chart |
| **Manual refresh** | Fetch the latest rates on demand |
| **Reliable history** | Automatic backup sources and saved history keep the chart available |

---

## How it works

1. The extension fetches the current buy and sell rates from the Bangladesh Bank exchange-rate page.
2. For the trend chart, it requests recent reference rates from the Frankfurter API.
3. If that source is unavailable, it switches to a backup source, and then to the last saved history on your device.

> **Note:** The trend chart shows market reference rates, so its values can differ slightly from the buy and sell rates in the table.

---

## Privacy Policy

*Last updated: October 2, 2026*

**Taka Tracker does not collect, store or share any personal information.**

### Information we collect

None. The extension has no accounts, no sign-in and no analytics. It does not record your browsing activity, and it does not send any data about you to the developer.

### Data the extension requests

| Purpose | Source | What is sent |
|---|---|---|
| Current buy and sell rates | Bangladesh Bank (`www.bb.org.bd`) | A standard request for the public rates page |
| 7-day trend chart (primary) | Frankfurter API (`api.frankfurter.dev`) | Currency codes and a date |
| 7-day trend chart (backup) | fawazahmed0 Currency API, served by jsDelivr (`cdn.jsdelivr.net`) and Cloudflare Pages (`currency-api.pages.dev`) | A date |

All requests are read-only requests for public exchange-rate data. They are made directly from your browser.

### Data stored on your device

The extension uses your browser's local extension storage (`chrome.storage.local`) for two short-lived caches:

- **Rates page:** kept for about 5 minutes, so the popup opens quickly.
- **Chart history:** kept for up to 6 hours, so the chart still works if a data source is temporarily unavailable.

This is public exchange-rate data. It stays on your device and is never sent to us. Removing the extension deletes it.

### Permissions

| Permission | Why it is needed |
|---|---|
| `storage` | To keep the two caches described above |
| Access to `www.bb.org.bd` | To fetch the current buy and sell rates |
| Access to `api.frankfurter.dev` | To fetch history for the trend chart |
| Access to `cdn.jsdelivr.net` and `*.currency-api.pages.dev` | To fetch history from the backup source |

### Third parties

The websites listed above receive your requests and, as with any website, can see your IP address. Their handling of that information is governed by their own policies, which we do not control.

We do not operate any servers. The extension contains no advertising, tracking or analytics, and it does not load or run remotely hosted code.

### Children's privacy

The extension collects no personal information from anyone, including children.

### Changes to this policy

If this policy changes, the updated version will be posted on this page with a new date.

---

## Disclaimer

Rates are shown for information only and may be delayed or differ from the rates offered by banks and exchange houses. Do not use this extension as the sole basis for financial decisions.

---

## Contact

Questions about this policy or the extension: [sadatrafsanjani.github.io](https://sadatrafsanjani.github.io)

---

<sub>Taka Tracker is released under the MIT License. Developed by Sadat Rafsanjani.</sub>
