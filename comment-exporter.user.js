// ==UserScript==
// @name         Instagram Comments Exporter
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Export Instagram comments from a post/reel with options.
// @author       realSamy
// @downloadURL  https://raw.githubusercontent.com/realSamy/instagram-comment-exporter/main/comment-exporter.user.js
// @updateURL    https://raw.githubusercontent.com/realSamy/instagram-comment-exporter/main/comment-exporter.user.js
// @match        https://www.instagram.com/p/*
// @match        https://www.instagram.com/reel/*
// @match        https://www.instagram.com/*/reel/*
// ==/UserScript==

(function() {
    'use strict';

    // Store the original XMLHttpRequest before we hook into it.
    const OriginalXHR = XMLHttpRequest;

    let latestDocId = null;
    let latestMediaId = null;
    let exportBtn = null;
    let statusMessage = null;

    // We'll store the full, successful request body and headers to use as a template
    let latestRequestBodyTemplate = null;
    let latestRequestHeadersTemplate = {};

    const INSTAGRAM_GRAPHQL_APP_ID = "936619743392459";

    // ---- Inject Network Interceptors (Fetch and XHR) ----
    // This function hooks into Instagram's network requests to find the
    // necessary doc_id, media_id, and other dynamic parameters for the comments query.
    function hookNetwork() {
        // Intercept XMLHttpRequest
        const open = XMLHttpRequest.prototype.open;
        const send = XMLHttpRequest.prototype.send;
        const setRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

        XMLHttpRequest.prototype.open = function(method, url) {
            this._url = url;
            this._requestHeaders = {};
            return open.apply(this, arguments);
        };

        XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
            this._requestHeaders[header] = value;
            return setRequestHeader.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function(body) {
            try {
                if (this._url && this._url.includes('/graphql/query')) {
                    if (body) {
                        let bodyStr = typeof body === 'string' ? body : new TextDecoder().decode(body);
                        let bodyObj = new URLSearchParams(bodyStr);

                        let docId = bodyObj.get('doc_id');
                        let variables = JSON.parse(bodyObj.get('variables'));
                        let mediaId = variables?.media_id;

                        // Check if it's a comment pagination query and store the template
                        if (mediaId) {
                            latestDocId = docId;
                            latestMediaId = mediaId;
                            latestRequestBodyTemplate = bodyStr;
                            latestRequestHeadersTemplate = this._requestHeaders;
                            updateExportButtonState(false);
                            console.log('[Comments Exporter] Captured request template from XHR.');
                        }
                    }
                }
            } catch (err) {
                console.error('[Comments Exporter] XHR Hook Error:', err);
            }
            return send.apply(this, arguments);
        };

        // Intercept Fetch requests
        const origFetch = window.fetch;
        window.fetch = async function(...args) {
            const [input, init] = args;
            if (typeof input === "string" && input.includes('/graphql/query') && init && init.body) {
                try {
                    let bodyStr = typeof init.body === 'string' ? init.body : new TextDecoder().decode(init.body);
                    let bodyObj = new URLSearchParams(bodyStr);

                    let docId = bodyObj.get('doc_id');
                    let variables = JSON.parse(bodyObj.get('variables'));
                    let mediaId = variables?.media_id;

                    // Check if it's a comment pagination query and store the template
                    if (mediaId) {
                        latestDocId = docId;
                        latestMediaId = mediaId;
                        latestRequestBodyTemplate = bodyStr;
                        // Capture all headers from the original request
                        for (let [key, value] of init.headers.entries()) {
                            latestRequestHeadersTemplate[key] = value;
                        }
                        updateExportButtonState(false);
                        console.log('[Comments Exporter] Captured request template from Fetch.');
                    }
                } catch (err) {
                    console.error('[Comments Exporter] Fetch Hook Error:', err);
                }
            }
            return origFetch.apply(this, args);
        };
        console.log('%c[Comments Exporter] Network hooks installed', 'color: green; font-weight: bold; font-size: large;');
    }

    // ---- Add Export Button & Status Message ----
    function createExportButton() {
        // Inject a style block for the UI elements
        const style = document.createElement('style');
        style.innerHTML = `
            .export-btn {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 10px 15px;
                background-color: #3897f0;
                color: #fff;
                border: none;
                border-radius: 5px;
                font-weight: bold;
                z-index: 99999;
                cursor: pointer;
                transition: background-color 0.2s ease;
            }
            .export-btn:hover:enabled {
                background-color: #2c7bbd;
            }
            .export-btn:disabled {
                cursor: not-allowed;
                opacity: 0.6;
            }
            .status-message {
                position: fixed;
                bottom: 60px;
                right: 20px;
                padding: 8px 12px;
                background-color: rgba(0,0,0,0.7);
                color: #fff;
                border-radius: 5px;
                z-index: 99999;
                display: none;
            }
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 100000;
            }
            .modal-box {
                background: #fff;
                padding: 20px;
                border-radius: 8px;
                width: 300px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            .modal-box * {
                color: black !important;
            }
            .modal-box h3 {
                margin-top: 0;
                font-size: 1.2em;
                border-bottom: 1px solid #eee;
                padding-bottom: 10px;
            }
            .modal-box label {
                display: block;
                margin-bottom: 10px;
                font-size: 0.9em;
            }
            .modal-box input[type="number"] {
                width: 80px;
                padding: 5px;
                border: 1px solid #ccc;
                border-radius: 4px;
                margin-left: 5px;
            }
            .modal-button {
                padding: 8px 12px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
                transition: all 0.2s ease;
            }
            .modal-button.primary {
                background-color: #3897f0;
                color: #fff;
            }
            .modal-button.secondary {
                background-color: #f0f0f0;
                color: #333;
                margin-left: 10px;
            }
            .modal-button:hover.primary {
                background-color: #2c7bbd;
            }
            .modal-button:hover.secondary {
                background-color: #e0e0e0;
            }
        `;
        document.head.appendChild(style);


        // Create the button using a class
        exportBtn = document.createElement('button');
        exportBtn.innerText = 'Export Comments';
        exportBtn.className = 'export-btn';
        exportBtn.disabled = true;
        exportBtn.onclick = showExportModal;
        document.body.appendChild(exportBtn);

        // Create the status message element using a class
        statusMessage = document.createElement('div');
        statusMessage.className = 'status-message';
        document.body.appendChild(statusMessage);
    }

    function updateExportButtonState(disabled = false) {
        if (exportBtn) {
            exportBtn.disabled = disabled;
        }
    }

    function showStatus(message, show = true) {
        if (statusMessage) {
            statusMessage.innerText = message;
            statusMessage.style.display = show ? 'block' : 'none';
        }
    }

    // ---- Modal for options ----
    function showExportModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';

        const box = document.createElement('div');
        box.className = 'modal-box';
        box.innerHTML = `
            <h3>Export Options</h3>
            <label><input type="checkbox" id="optText" checked> Comment Text</label><br>
            <label><input type="checkbox" id="optLikes"> Comment Likes</label><br>
            <label><input type="checkbox" id="optCreated"> Created At</label><br>
            <label><input type="checkbox" id="optUsername" checked> Owner Username</label><br>
            <label>Max comments (empty = all): <input type="number" id="maxCount"></label><br><br>
            <button id="startExport" class="modal-button primary">Start Export</button>
            <button id="closeModal" class="modal-button secondary">Cancel</button>
        `;

        modal.appendChild(box);
        document.body.appendChild(modal);

        box.querySelector('#closeModal').onclick = () => modal.remove();
        box.querySelector('#startExport').onclick = () => {
            modal.remove();
            const opts = {
                text: box.querySelector('#optText').checked,
                likes: box.querySelector('#optLikes').checked,
                created: box.querySelector('#optCreated').checked,
                username: box.querySelector('#optUsername').checked,
                maxCount: parseInt(box.querySelector('#maxCount').value) || null
            };
            startExport(opts);
        };
    }

    // ---- Fetch comments & export ----
    async function startExport(opts) {
        if (!latestRequestBodyTemplate) {
            console.error('[Comments Exporter] Request template not captured. Try refreshing the page and scrolling down to load comments before exporting.');
            showStatus('Error: Request template not found. See console.', true);
            return;
        }

        console.log('[Comments Exporter] Starting export...', { latestDocId, latestMediaId, opts });
        updateExportButtonState(true);
        showStatus('Fetching comments (0)...');

        let hasNextPage = true;
        let endCursor = null;
        let results = [];
        let totalCommentsFetched = 0;

        while (hasNextPage && (!opts.maxCount || totalCommentsFetched < opts.maxCount)) {
            const variables = {
                media_id: latestMediaId,
                first: 50, // Fetch a larger batch for efficiency
                after: endCursor,
                sort_order: "popular",
                __relay_internal__pv__PolarisIsLoggedInrelayprovider: true
            };

            // Build the new request body by replacing the doc_id and variables in the template
            const bodyStr = latestRequestBodyTemplate
                .replace(/variables=.*&/, `variables=${encodeURIComponent(JSON.stringify(variables))}&`);

            try {
                // Use a standard XMLHttpRequest instead of GM_xmlhttpRequest
                // This allows you to debug the request directly in the browser's devtools Network tab.
                const response = await new Promise((resolve, reject) => {
                    const xhr = new OriginalXHR();
                    xhr.open("POST", "https://www.instagram.com/graphql/query", true);

                    // Set headers from the captured template
                    for (const header in latestRequestHeadersTemplate) {
                        if (latestRequestHeadersTemplate[header]) {
                             xhr.setRequestHeader(header, latestRequestHeadersTemplate[header]);
                        }
                    }

                    xhr.onload = function() {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            resolve(JSON.parse(xhr.responseText));
                        } else {
                            reject(new Error(xhr.statusText));
                        }
                    };
                    xhr.onerror = function() {
                        reject(new Error("Network Error"));
                    };

                    xhr.send(bodyStr);
                });

                const edges = response?.data?.xdt_api__v1__media__media_id__comments__connection?.edges || [];
                const pageInfo = response?.data?.xdt_api__v1__media__media_id__comments__connection?.page_info;

                for (let edge of edges) {
                    const node = edge.node;
                    let row = {};
                    if (opts.text) row.text = node.text;
                    if (opts.likes) row.likes = node.comment_like_count;
                    if (opts.created) row.created_at = new Date(node.created_at * 1000).toISOString();
                    if (opts.username) row.username = node.user.username;

                    results.push(row);
                    totalCommentsFetched++;

                    if (opts.maxCount && totalCommentsFetched >= opts.maxCount) {
                        hasNextPage = false;
                        break;
                    }
                }

                showStatus(`Fetching comments (${totalCommentsFetched})...`);

                hasNextPage = pageInfo?.has_next_page;
                endCursor = pageInfo?.end_cursor;

                // Add a small delay to prevent rate-limiting
                await new Promise(r => setTimeout(r, 500));

            } catch (error) {
                console.error('[Comments Exporter] Error during fetch:', error);
                showStatus('Export failed. Check the console for details.', true);
                updateExportButtonState(false);
                return;
            }
        }

        console.log('[Comments Exporter] Export Results:', results);
        showStatus(`Export complete! ${results.length} comments.`, true);

        const csv = toCSV(results);
        downloadFile('comments_export.csv', csv);
        updateExportButtonState(false);
    }

    function getCookie(name) {
        return document.cookie.split("; ")
            .find(row => row.startsWith(name + "="))
            ?.split("=")[1];
    }

    function toCSV(data) {
        if (data.length === 0) return '';
        const keys = Object.keys(data[0]);
        const rows = data.map(row => keys.map(k => {
            const value = (row[k] || '').toString();
            return `"${value.replace(/"/g, '""')}"`;
        }).join(','));
        return keys.join(',') + '\n' + rows.join('\n');
    }

    function downloadFile(filename, text) {
        const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ---- Init ----
    hookNetwork();
    createExportButton();

})();
