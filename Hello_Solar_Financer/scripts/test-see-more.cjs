const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Simple DOM element mock
function createMockElement(tagName, id = "", classes = []) {
    const classListSet = new Set(classes);
    const attributes = {};
    const styles = {};
    const listeners = {};

    return {
        tagName: tagName.toUpperCase(),
        id,
        classList: {
            add: (c) => classListSet.add(c),
            remove: (c) => classListSet.delete(c),
            toggle: (c, force) => {
                if (force !== undefined) {
                    if (force) classListSet.add(c);
                    else classListSet.delete(c);
                    return force;
                }
                if (classListSet.has(c)) {
                    classListSet.delete(c);
                    return false;
                }
                classListSet.add(c);
                return true;
            },
            contains: (c) => classListSet.has(c)
        },
        dataset: {},
        hidden: false,
        textContent: "",
        innerHTML: "",
        value: "",
        style: {
            display: "",
            setProperty: (prop, val, priority) => { styles[prop] = val; },
            removeProperty: (prop) => { delete styles[prop]; },
            get display() { return styles['display'] !== undefined ? styles['display'] : ''; },
            set display(v) { if (v === '') delete styles['display']; else styles['display'] = v; }
        },
        setAttribute: (k, v) => { attributes[k] = String(v); },
        getAttribute: (k) => attributes[k] !== undefined ? attributes[k] : null,
        removeAttribute: (k) => { delete attributes[k]; },
        addEventListener: (event, handler) => {
            listeners[event] = listeners[event] || [];
            listeners[event].push(handler);
        },
        dispatchEvent: (event) => {
            const handlers = listeners[event.type] || [];
            handlers.forEach(h => h(event));
        },
        click: function() {
            this.dispatchEvent({ type: 'click', preventDefault: () => {}, stopPropagation: () => {} });
        }
    };
}

// 5 Approved sample loans from financer_data.json
const approvedLoans = [
    { appId: "APP-1107", contract: "HS-CTR-2026-1107", borrower: "David Tan", location: "Cebu City", merchant: "Visayas Green Energy" },
    { appId: "APP-1109", contract: "HS-CTR-2026-1109", borrower: "Patricia Santos", location: "Davao City", merchant: "Mindanao Solar Corp" },
    { appId: "APP-1111", contract: "HS-CTR-2026-1111", borrower: "Benjamin Alcantara", location: "Iloilo City", merchant: "SunPower Manila" },
    { appId: "APP-1112", contract: "HS-CTR-2026-1112", borrower: "Corazon Aquino-Lim", location: "Mandaluyong City", merchant: "Helios Solar PH" },
    { appId: "APP-1115", contract: "HS-CTR-2026-1115", borrower: "Manuel Pangilinan Jr.", location: "Pampanga", merchant: "Visayas Green Energy" }
];

const mockRows = approvedLoans.map((l, idx) => {
    const row = createMockElement("tr", "", ["loan-record-row"]);
    if (idx >= 3) {
        row.classList.add("app-row-extra", "is-hidden");
        row.hidden = true;
        row.setAttribute("hidden", "");
        row.style.setProperty("display", "none", "important");
    }
    row.dataset.appid = l.appId;
    row.dataset.contract = l.contract;
    row.dataset.borrower = l.borrower;
    row.dataset.location = l.location;
    row.dataset.merchant = l.merchant;
    row.textContent = `${l.appId} ${l.contract} ${l.borrower} ${l.location} ${l.merchant}`;
    return row;
});

const elements = {
    approvedTable: {
        querySelectorAll: (sel) => {
            if (sel.includes("tr.loan-record-row")) return mockRows;
            return [];
        },
        querySelector: (sel) => {
            if (sel === "tbody") return { innerHTML: "" };
            return null;
        }
    },
    approvedSearchInput: createMockElement("input", "approvedSearchInput"),
    merchantFilterSelect: createMockElement("select", "merchantFilterSelect"),
    approvedRecordsCount: createMockElement("span", "approvedRecordsCount"),
    toggleApprovedRowsBtn: createMockElement("button", "toggleApprovedRowsBtn", ["btn-toggle-see-more"]),
    toggleApprovedText: createMockElement("span", "toggleApprovedText"),
    approvedPaginationFooter: createMockElement("div", "approvedPaginationFooter"),
    approvedEmptyState: createMockElement("div", "approvedEmptyState")
};

elements.merchantFilterSelect.value = "all";
elements.toggleApprovedRowsBtn.setAttribute("aria-expanded", "false");
elements.toggleApprovedText.textContent = "See more (2 more loans)";

// Global environment
global.window = {
    addEventListener: () => {},
    HelloSolarStore: {
        getApprovedApplications: () => null // Use existing mock rows
    }
};
global.document = {
    getElementById: (id) => elements[id] || null,
    addEventListener: (ev, handler) => {
        if (ev === "DOMContentLoaded") {
            handler();
        }
    }
};

// Execute approved.js
const approvedCode = fs.readFileSync(path.join(__dirname, '../js/approved.js'), 'utf8');
eval(approvedCode);

console.log("=== Testing Approved Loans See More / See Less Behavior ===");

function getVisibleRows() {
    return mockRows.filter(r => !r.hidden && !r.classList.contains("is-hidden") && r.style.display !== "none");
}

// 1. Initial State Check
console.log(`Total mock rows: ${mockRows.length}`);
let visible = getVisibleRows();
console.log(`Initial visible rows: ${visible.length}`);
assert.strictEqual(visible.length, 3, "Initial state must show exactly 3 rows");
assert.strictEqual(elements.toggleApprovedText.textContent, "See more (2 more loans)", "Button label must be 'See more (2 more loans)'");
assert.strictEqual(elements.toggleApprovedRowsBtn.getAttribute("aria-expanded"), "false", "aria-expanded must be false");
assert(!elements.toggleApprovedRowsBtn.classList.contains("expanded"), "toggle button must not have expanded class");
console.log("✓ Initial 3 rows visible, See More button properly labeled.");

// 2. Click See More
console.log("\nSimulating Click on See More button...");
elements.toggleApprovedRowsBtn.click();

visible = getVisibleRows();
console.log(`Visible rows after click: ${visible.length}`);
assert.strictEqual(visible.length, 5, "Expanded view must show all 5 approved loans");
assert.strictEqual(elements.toggleApprovedText.textContent, "See less", "Button label must be 'See less'");
assert.strictEqual(elements.toggleApprovedRowsBtn.getAttribute("aria-expanded"), "true", "aria-expanded must be true");
assert(elements.toggleApprovedRowsBtn.classList.contains("expanded"), "toggle button must have expanded class");
console.log("✓ All 5 rows successfully visible, button shows 'See less' with expanded styling!");

// 3. Click See Less
console.log("\nSimulating Click on See Less button...");
elements.toggleApprovedRowsBtn.click();

visible = getVisibleRows();
console.log(`Visible rows after See Less: ${visible.length}`);
assert.strictEqual(visible.length, 3, "Collapsed view must return to 3 rows");
assert.strictEqual(elements.toggleApprovedText.textContent, "See more (2 more loans)", "Button label must return to 'See more (2 more loans)'");
assert.strictEqual(elements.toggleApprovedRowsBtn.getAttribute("aria-expanded"), "false", "aria-expanded must return to false");
assert(!elements.toggleApprovedRowsBtn.classList.contains("expanded"), "toggle button must remove expanded class");
console.log("✓ Correctly returned to initial 3 rows with 'See more (2 more loans)'!");

// 4. Test Search for a row originally hidden (Corazon Aquino-Lim, APP-1112)
console.log("\nSimulating Search for 'Corazon' (initially hidden row)...");
elements.approvedSearchInput.value = "Corazon";
elements.approvedSearchInput.dispatchEvent({ type: 'input' });

visible = getVisibleRows();
console.log(`Visible rows matching 'Corazon': ${visible.length}`);
assert.strictEqual(visible.length, 1, "Exactly 1 loan should match");
assert.strictEqual(visible[0].dataset.appid, "APP-1112", "Matching row must be APP-1112");
assert.strictEqual(elements.approvedPaginationFooter.style.display, "none", "Pagination footer hidden when <= 3 matches");
console.log("✓ Search query successfully displays hidden row without being blocked!");

// 5. Clear Search
console.log("\nSimulating clearing search...");
elements.approvedSearchInput.value = "";
elements.approvedSearchInput.dispatchEvent({ type: 'input' });

visible = getVisibleRows();
console.log(`Visible rows after clearing search: ${visible.length}`);
assert.strictEqual(visible.length, 3, "Clearing search returns to initial 3 rows");
assert.strictEqual(elements.toggleApprovedText.textContent, "See more (2 more loans)");
console.log("✓ Clearing search cleanly restores initial 3 rows with See More toggle!");

// 6. Test Merchant Filter (Visayas Green Energy)
console.log("\nSimulating merchant filter 'Visayas Green Energy'...");
elements.merchantFilterSelect.value = "Visayas Green Energy";
elements.merchantFilterSelect.dispatchEvent({ type: 'change' });

visible = getVisibleRows();
console.log(`Visible rows for Visayas Green Energy: ${visible.length}`);
assert.strictEqual(visible.length, 2, "2 loans match Visayas Green Energy (David Tan & Manuel Pangilinan Jr.)");
assert.strictEqual(elements.approvedPaginationFooter.style.display, "none", "Footer hidden when matches <= 3");
console.log("✓ Merchant filter works smoothly!");

console.log("\nALL APPROVED LOANS SEE MORE / SEE LESS TESTS PASSED! ✓\n");
