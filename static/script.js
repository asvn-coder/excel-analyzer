/* static/script.js (FINAL CLEAN VERSION — FIXED INSIGHT PARSER) */

const fileInput = document.getElementById("fileInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const totalRowsEl = document.getElementById("totalRows");
const totalColsEl = document.getElementById("totalCols");
const statusText = document.getElementById("statusText");
const dataHead = document.getElementById("dataHead");
const dataBody = document.getElementById("dataBody");
const previewInfo = document.getElementById("previewInfo");
const askBtn = document.getElementById("askBtn");
const queryInput = document.getElementById("queryInput");
const insightText = document.getElementById("insightText");
const themeSwitch = document.getElementById("themeSwitch");
const yearEl = document.getElementById("year");

// Sections
const uploadSection = document.getElementById("uploadSection");
const analysisSection = document.getElementById("analysisSection");
const previewSection = document.getElementById("previewSection");
const querySection = document.getElementById("querySection");

// Hide all except upload
if (analysisSection) analysisSection.classList.add("hidden");
if (previewSection) previewSection.classList.add("hidden");
if (querySection) querySection.classList.add("hidden");

yearEl.textContent = new Date().getFullYear();

let excelData = [];
window.currentPage = 1;

/* -----------------------------
   Dark Mode
----------------------------- */
(function initTheme() {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.body.classList.add("dark-mode");
      if (themeSwitch) themeSwitch.checked = true;
    }
  } catch (e) {
    console.warn("Theme init error:", e);
  }

  if (themeSwitch) {
    themeSwitch.addEventListener("change", () => {
      if (themeSwitch.checked) {
        document.body.classList.add("dark-mode");
        localStorage.setItem("theme", "dark");
      } else {
        document.body.classList.remove("dark-mode");
        localStorage.setItem("theme", "light");
      }
    });
  }
})();

/* -----------------------------
   Upload Excel
----------------------------- */
analyzeBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) return alert("Please upload an Excel or CSV file");

  analyzeBtn.disabled = true;
  statusText.textContent = "⏳ Reading file...";

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    excelData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    window.currentPage = 1;
    renderTable();

    statusText.textContent = "⏳ Sending to backend...";
    await analyzeBackend();

    statusText.textContent = "✅ Analysis completed.";

  } catch (err) {
    console.error(err);
    statusText.textContent = "❌ Error reading file.";
  } finally {
    analyzeBtn.disabled = false;
  }
});

/* -----------------------------
   Backend Analyze (ONLY for AI query)
----------------------------- */
async function analyzeBackend() {
  try {
    let sendData = excelData;
    if (sendData.length > 151) sendData = sendData.slice(0, 151);

    await fetch("/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "", excelData: sendData })
    });

    // Show sections after upload
    if (analysisSection) analysisSection.classList.remove("hidden");
    if (previewSection) previewSection.classList.remove("hidden");
    if (querySection) querySection.classList.remove("hidden");

  } catch (error) {
    console.error(error);
    statusText.textContent = "❌ Backend error.";
  }
}

/* -----------------------------
   Render Table
----------------------------- */
function renderTable() {
  dataHead.innerHTML = "";
  dataBody.innerHTML = "";

  if (!excelData || excelData.length === 0) {
    totalRowsEl.textContent = 0;
    totalColsEl.textContent = 0;
    previewInfo.textContent = "No data available yet.";
    document.getElementById("pageInfo").textContent = `Page 0 / 0`;
    return;
  }

  const headers = excelData[0] || [];
  const rows = excelData.slice(1);

  totalRowsEl.textContent = rows.length;
  totalColsEl.textContent = headers.length;

  const headerRow = document.createElement("tr");
  headers.forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    headerRow.appendChild(th);
  });
  dataHead.appendChild(headerRow);

  const pageSize = 200;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  if (window.currentPage < 1) window.currentPage = 1;
  if (window.currentPage > totalPages) window.currentPage = totalPages;

  const start = (window.currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, rows.length);

  for (let i = start; i < end; i++) {
    const tr = document.createElement("tr");
    const row = Array.isArray(rows[i]) ? rows[i] : [];
    headers.forEach((_, colIndex) => {
      const td = document.createElement("td");
      td.textContent = row[colIndex] ?? "";
      tr.appendChild(td);
    });
    dataBody.appendChild(tr);
  }

  previewInfo.textContent = `Showing ${start + 1}-${end} of ${rows.length}`;
  document.getElementById("pageInfo").textContent =
    `Page ${window.currentPage} / ${totalPages}`;
}

/* -----------------------------
   Pagination
----------------------------- */
const prevBtn = document.getElementById("prevPage");
const nextBtn = document.getElementById("nextPage");

if (prevBtn) {
  prevBtn.addEventListener("click", () => {
    if (window.currentPage > 1) {
      window.currentPage--;
      renderTable();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
}

if (nextBtn) {
  nextBtn.addEventListener("click", () => {
    const rowsCount = excelData.length > 1 ? excelData.length - 1 : 0;
    const pageSize = 200;
    const totalPages = Math.max(1, Math.ceil(rowsCount / pageSize));

    if (window.currentPage < totalPages) {
      window.currentPage++;
      renderTable();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
}

/* -----------------------------
   Ask AI Query
----------------------------- */
askBtn.addEventListener("click", async () => {
  const query = queryInput.value.trim();
  if (!query) return alert("Type your question");

  insightText.textContent = "⏳ Asking AI...";
  askBtn.disabled = true;

  try {
    let sendData = excelData;
    if (sendData.length > 151) sendData = sendData.slice(0, 151);

    const response = await fetch("/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, excelData: sendData })
    });

    const data = await response.json();
    renderInsight(data.answer || "No response");

  } catch (err) {
    insightText.textContent = "❌ Cannot connect to backend.";
  } finally {
    askBtn.disabled = false;
  }
});

/* -----------------------------
   Render AI Insight  (FIXED)
----------------------------- */
function renderInsight(text) {
  if (!text) {
    insightText.textContent = "No insights returned.";
    return;
  }

  // FIX: ensure always string
  if (typeof text !== "string") {
    text = JSON.stringify(text, null, 2);
  }

  const lines = text.replace(/\r\n/g, "\n").trim().split("\n").filter(Boolean);

  const ul = document.createElement("ul");
  lines.forEach(l => {
    const li = document.createElement("li");
    li.textContent = l.replace(/^[-•*]\s*/, "");
    ul.appendChild(li);
  });

  insightText.innerHTML = "";
  insightText.appendChild(ul);
}
