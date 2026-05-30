# Google-Forms-to-Discord-Rhythia
A customizable Google Apps Script to seamlessly forward Google Form submissions to Discord channels via webhooks. Features fuzzy-match data parsing, automatic role pings, dynamic embed color-coding, and automatic image thumbnail attachments.

# Rhythia Map Submission Fetcher 🎵 Discord Webhook

A lightweight, automated Google Apps Script that intercepts Google Form submissions, parses the data, and dispatches beautifully formatted embeds directly to a Discord staff review channel.

## ✨ Features
* **Smart Fuzzy Match Engine:** Dynamically matches form questions containing keywords (like "link", "song", "creator", "stars") so question text changes won't break the script.
* **Dynamic Difficulty Tiers:** Automatically reads the star rating and changes the embed's color and emoji (🟢 Easy, 🟡 Medium, 🔴 Hard, 🟣 Logic, ⚫ Tasukete).
* **Automated Map Metadata:** Instantly extracts the unique Map ID from the URL and generates automated direct download links.
* **Cover Art Scraper:** Automatically crawls the map page to find and attach the Rhythia background image as the embed thumbnail.
* **Dual-Webhook System:** Features a dedicated pipeline for main submissions and a separate backend pipeline for system logs and crash diagnostics.

## 🚀 Setup Instructions

### 0.1 Form Questions (Only add the starred questions)
<img width="852" height="816" alt="image" src="https://github.com/user-attachments/assets/6218ecc9-c8e9-4c10-a44a-594ace7fcdd9" />

First setup your google forms like this


### 1. Form Script Installation
1. Open your Google Form.
2. Click the three dots (top right) ➔ **Script editor**.
3. Delete any default code and paste the `Code.gs` script from this repository.

### 2. Configuration
Update the configuration constants at the top of the script with your specific Discord server details:
- `webhookUrl`: The channel webhook where map submissions should go.
- `logWebhookUrl`: The staff/admin channel webhook where success logs and errors should go.
- `REVIEW_ROLE_ID`: The Discord Role ID you want to ping for new maps.

### 3. Setting Up the Automation Trigger
To make Google run this script automatically every time someone fills out the form:
1. Inside the Apps Script editor, click the **Clock Icon** (Triggers) on the left sidebar.
2. Click **+ Add Trigger** in the bottom right corner.
3. Configure the settings exactly like this:
   * **Choose which function to run:** `onFormSubmit`
   * **Choose which deployment should run:** `Head`
   * **Select event source:** `From form`
   * **Select event type:** `On form submit`
4. Click **Save** and accept the Google permission prompts.
