/**
 * Hello Solar Customer Portal - Required Documents (Installment customers only)
 *
 * Shared document store keyed by APP ID (localStorage "hello_solar_shared_documents").
 * The Financer portal reads/updates the same records, so it reviews the exact files uploaded here.
 *
 * Record shape:
 *   { appId, paymentType, updatedAt, documents: [
 *       { id, name, status, note, submitted, fileName, fileType, fileSize, fileData, uploadedAt, reviewedAt }
 *   ] }
 * status: NOT_SUBMITTED | SUBMITTED | UNDER_REVIEW | ACCEPTED | REUPLOAD_REQUIRED
 */
(function () {
    const STORE_KEY = "hello_solar_shared_documents";
    const MAX_FILE_BYTES = 2 * 1024 * 1024;
    const ACCEPT_TYPES = ["application/pdf", "image/jpeg", "image/png"];

    const STATUS = {
        NOT_SUBMITTED: { label: "Not Submitted", cls: "not-submitted" },
        SUBMITTED: { label: "Submitted", cls: "submitted" },
        UNDER_REVIEW: { label: "Under Review", cls: "under-review" },
        ACCEPTED: { label: "Accepted", cls: "accepted" },
        REUPLOAD_REQUIRED: { label: "Re-upload Required", cls: "reupload" }
    };
    const UPLOADABLE = ["NOT_SUBMITTED", "REUPLOAD_REQUIRED"];
    // Short display names (by document id). The shared record keeps its full names, which the Financer and
    // Super Admin match on.
    const DISPLAY_NAME = {
        gov_id_front: "Government ID Front",
        gov_id_back: "Government ID Back",
        proof_of_income: "Proof of Income",
        proof_of_billing: "Proof of Billing",
        bank_statement: "Bank Statement",
        other_requested: "Other Document"
    };
    const displayName = doc => DISPLAY_NAME[doc.id] || doc.name;
    // The document request list, status rules and record creation live in the shared layer
    // (HSShared.documentRecordFor) so the Financer review and Super Admin use the exact same record.

    function readStore() {
        if (window.HSShared && window.HSShared.readDocumentStore) return window.HSShared.readDocumentStore();
        try {
            const raw = localStorage.getItem(STORE_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch (e) {
            console.warn("Error reading shared documents:", e);
            return {};
        }
    }

    function writeStore(store) {
        if (window.HSShared && window.HSShared.writeDocumentStore) return window.HSShared.writeDocumentStore(store);
        localStorage.setItem(STORE_KEY, JSON.stringify(store)); // throws on quota — callers handle
    }

    function isInstallment(pkg) {
        return !!pkg && String(pkg.paymentType || "").toLowerCase() !== "full_payment";
    }

    // Public API over the shared APP document record (same record the Financer portal and Super Admin use)
    const api = {
        STORE_KEY,
        STATUS,
        getRecord(appId) {
            return window.HSShared ? window.HSShared.documentsFor(appId) : null;
        },
        ensureRecord(pkg) {
            if (!pkg || !pkg.appId || !window.HSShared) return null;
            return window.HSShared.documentRecordFor(pkg.appId);
        },
        // Review action (Financer / Super Admin): UNDER_REVIEW / ACCEPTED / REUPLOAD_REQUIRED with an optional note
        setStatus(appId, docId, status, note) {
            const doc = window.HSShared ? window.HSShared.setDocumentStatus(appId, docId, status, note) : null;
            if (doc) notify(appId);
            return doc;
        },
        uploadDocument(appId, docId, file, fileData) {
            // Shared layer: local mode stores the file in the document record; api mode uploads it to the backend
            if (window.HSShared && window.HSShared.uploadDocument) {
                let res;
                try {
                    res = window.HSShared.uploadDocument(appId, docId, file, fileData);
                } catch (e) {
                    throw new Error("Storage is full. Please upload a smaller file.");
                }
                if (!res.ok) throw new Error(res.error || "Document request not found.");
                notify(appId);
                return res.document;
            }
            const store = readStore();
            const doc = store[appId]?.documents?.find(d => d.id === docId);
            if (!doc) throw new Error("Document request not found.");
            const backup = JSON.stringify(doc);
            Object.assign(doc, {
                status: "SUBMITTED",
                submitted: true,
                note: "",
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                fileData: fileData,
                uploadedAt: new Date().toISOString()
            });
            store[appId].updatedAt = doc.uploadedAt;
            try {
                writeStore(store);
            } catch (e) {
                Object.assign(doc, JSON.parse(backup));
                throw new Error("Storage is full. Please upload a smaller file.");
            }
            notify(appId);
            return doc;
        }
    };
    window.HelloSolarSharedDocs = api;

    function notify(appId) {
        try { window.dispatchEvent(new CustomEvent("hellosolar:documents-updated", { detail: { appId } })); } catch (_) {}
    }

    // ---------------------------------------------------------------- UI
    let currentPkg = null;

    function escapeHtml(s) {
        return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    function formatSize(bytes) {
        if (!bytes) return "";
        return bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(bytes / 1024)) + " KB";
    }

    function formatDate(iso) {
        if (!iso) return "";
        const d = new Date(iso);
        return isNaN(d) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    }

    function render(pkg) {
        const section = document.getElementById("requiredDocumentsSection");
        if (!section) return;
        currentPkg = pkg || null;

        if (!isInstallment(pkg) || !pkg.appId) {
            section.hidden = true;
            return;
        }

        const rec = api.ensureRecord(pkg);
        const docs = rec?.documents || [];
        section.hidden = false;

        const appIdEl = document.getElementById("requiredDocsAppId");
        if (appIdEl) appIdEl.textContent = pkg.appId;

        const requiredDocs = docs.filter(d => !d.optional);
        const accepted = requiredDocs.filter(d => d.status === "ACCEPTED").length;
        const actionNeeded = docs.filter(d => d.status === "REUPLOAD_REQUIRED" ||
            (!d.optional && d.status === "NOT_SUBMITTED")).length;
        const summaryEl = document.getElementById("requiredDocsSummary");
        if (summaryEl) {
            summaryEl.textContent = actionNeeded
                ? `${actionNeeded} to upload · ${accepted} of ${requiredDocs.length} accepted`
                : `${accepted} of ${requiredDocs.length} accepted`;
        }

        const list = document.getElementById("requiredDocsList");
        if (!list) return;
        list.innerHTML = docs.map(doc => {
            const meta = STATUS[doc.status];
            const canUpload = UPLOADABLE.includes(doc.status);
            const btnLabel = doc.status === "REUPLOAD_REQUIRED" ? "Re-upload" : "Upload";
            const fileLine = doc.fileName
                ? `<span class="req-doc-file">${doc.fileData
                    ? `<a href="#" data-view-doc="${escapeHtml(doc.id)}">${escapeHtml(doc.fileName)}</a>`
                    : escapeHtml(doc.fileName)}${doc.fileSize ? ` · ${formatSize(doc.fileSize)}` : ""}${doc.uploadedAt ? ` · ${formatDate(doc.uploadedAt)}` : ""}</span>`
                : "";
            const note = doc.note ? `<span class="req-doc-note">${escapeHtml(doc.note)}</span>` : "";
            return `
                <li class="req-doc-item" data-doc-id="${escapeHtml(doc.id)}">
                    <div class="req-doc-info">
                        <span class="req-doc-name">${escapeHtml(displayName(doc))}${doc.optional ? ` <span class="req-doc-optional">If applicable</span>` : ""}</span>
                        ${fileLine}${note}
                    </div>
                    <div class="req-doc-actions">
                        <span class="req-doc-badge req-doc-badge--${meta.cls}">${meta.label}</span>
                        ${canUpload ? `<button type="button" class="req-doc-upload-btn" data-upload-doc="${escapeHtml(doc.id)}"
                            aria-label="${btnLabel} ${escapeHtml(displayName(doc))}">${btnLabel}</button>` : ""}
                    </div>
                </li>`;
        }).join("");
    }

    function showMessage(text, type) {
        const el = document.getElementById("requiredDocsMessage");
        if (!el) return;
        el.textContent = text;
        el.dataset.type = type || "info";
        el.hidden = !text;
    }

    let pendingDocId = null;

    document.addEventListener("click", (e) => {
        const uploadBtn = e.target.closest("[data-upload-doc]");
        if (uploadBtn) {
            pendingDocId = uploadBtn.dataset.uploadDoc;
            const input = document.getElementById("requiredDocsFileInput");
            if (input) { input.value = ""; input.click(); }
            return;
        }
        const viewLink = e.target.closest("[data-view-doc]");
        if (viewLink && currentPkg) {
            e.preventDefault();
            const doc = api.getRecord(currentPkg.appId)?.documents.find(d => d.id === viewLink.dataset.viewDoc);
            if (doc?.fileData) {
                const win = window.open();
                if (win) {
                    const isPdf = doc.fileType === "application/pdf";
                    win.document.title = doc.fileName;
                    win.document.body.style.margin = "0";
                    win.document.body.innerHTML = isPdf
                        ? `<iframe src="${doc.fileData}" style="border:0;width:100vw;height:100vh"></iframe>`
                        : `<img src="${doc.fileData}" alt="" style="max-width:100%">`;
                }
            }
        }
    });

    document.addEventListener("change", (e) => {
        if (e.target.id !== "requiredDocsFileInput") return;
        const file = e.target.files && e.target.files[0];
        if (!file || !pendingDocId || !currentPkg) return;
        if (!ACCEPT_TYPES.includes(file.type)) {
            showMessage("Please upload a PDF, JPG, or PNG file.", "error");
            return;
        }
        if (file.size > MAX_FILE_BYTES) {
            showMessage("File is too large. Maximum size is 2 MB.", "error");
            return;
        }
        const docId = pendingDocId;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const doc = api.uploadDocument(currentPkg.appId, docId, file, reader.result);
                showMessage(`${displayName(doc)} uploaded. Awaiting review.`, "success");
            } catch (err) {
                showMessage(err.message || "Upload failed. Please try again.", "error");
            }
            render(currentPkg);
        };
        reader.onerror = () => showMessage("Could not read the file. Please try again.", "error");
        reader.readAsDataURL(file);
    });

    // Re-render when the Financer updates statuses (other tab) or this tab changes data
    window.addEventListener("storage", (e) => {
        if (e.key === STORE_KEY && currentPkg) render(currentPkg);
    });
    window.addEventListener("hellosolar:documents-updated", () => { if (currentPkg) render(currentPkg); });

    window.renderRequiredDocuments = function (pkg) {
        showMessage("", "info");
        render(pkg);
    };
})();
