# Instagram Comments Exporter

A Tampermonkey userscript that lets you **export Instagram comments** from any post or reel directly from your browser.  
You can select which comment details to include (text, likes, timestamp, username, full name) and download them as a CSV file.

---

## Features

- Works on Instagram **posts** and **reels**
- Captures all comments (with optional limit)
- Choose which data fields to export:
  - Comment text
  - Like count
  - Creation date
  - Username
  - Full name
- Simple **Export Comments** button in the page
- Data saved as a CSV file

---

## Installation

1. Install the **Tampermonkey** extension:
   - [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey/)
   - [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

2. Click the link below to install the script in Tampermonkey:  
   [**Install Instagram Comments Exporter**](https://raw.githubusercontent.com/realSamy/instagram-comment-exporter/main/comment-exporter.user.js)

3. Tampermonkey will ask you to confirm installation. Click **Install**.

---

## Usage

1. Open **any Instagram post or reel** in your browser.
2. Scroll through comments at least once so the script can detect Instagram's comment request.
3. Click the **Export Comments** button (bottom right corner of the page).
4. In the popup, select the data fields you want to export and (optionally) set a maximum comment limit.
5. Click **Start Export**.
6. Wait until all comments are fetched.
7. A CSV file will be downloaded automatically.

---

## Notes

- If the button is disabled, scroll the comments section to allow the script to capture the request template.
- Large exports may take time due to Instagram rate limits.
- Works only when logged in to Instagram.

---

## License

[MIT License](https://github.com/realSamy/instagram-comment-exporter/blob/main/LICENSE) © 2025 [realSamy](https://github.com/realSamy)
