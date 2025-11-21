// static/script.js
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

yearEl.textContent = new Date().getFullYear();

let excelData = [];
window.currentPage = 1;

// -----------------------------
// Dark mode: initialize & persist
// -----------------------------
(function initTheme() {
  try {
    const saved = localStorage.getItem("theme");

    if (saved === "dark") {
      document.body.classList.add("dark-mode");
      if (themeSwitch) themeSwitch.checked = true;
    } else {
      if (themeSwitch) themeSwitch.checked = false;
    }
  } catch (e) {
    console.warn("Theme init error:", e);
  }

  if (themeSwitch) {
    themeSwitch.addEventListener("change", () => {
      if (themeSwitch.checked) {
        document.body.classList.add("dark-mode");
        try { localStorage.setItem("theme", "dark"); } catch(e){}
      } else {
        document.body.classList.remove("dark-mode");
        try { localStorage.setItem("theme", "light"); } catch(e){}
      }
    });
  }
})();

// ==========================================
// Upload Excel
// ==========================================
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

    statusText.textContent = "✅ File loaded.";
  } catch (err) {
    console.error(err);
    statusText.textContent = "❌ Error reading file.";
    alert("Error reading file. Make sure it's a valid .xlsx, .xls, or .csv");
  } finally {
    analyzeBtn.disabled = false;
  }
});

// ==========================================
// Render Table + Pagination + Prev/Next
// ==========================================
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
    const rowsCount = (excelData && excelData.length > 1) ? excelData.length - 1 : 0;
    const pageSize = 200;
    const totalPages = Math.max(1, Math.ceil(rowsCount / pageSize));

    if (window.currentPage < totalPages) {
      window.currentPage++;
      renderTable();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
}

// ==========================================
// Ask AI
// ==========================================
askBtn.addEventListener("click", async () => {
  const query = queryInput.value.trim();
  if (!query) return alert("Type your question");

  insightText.textContent = "⏳ Asking AI...";
  askBtn.disabled = true;

  try {
    let sendData = excelData;
    if (sendData.length > 151) {
      sendData = sendData.slice(0, 151);
    }

    const response = await fetch("/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: query,
        excelData: sendData
      })
    });

    const data = await response.json();
    const raw = data.answer || "No response";
    renderInsight(raw);

  } catch (err) {
    console.error(err);
    insightText.textContent = "❌ Cannot connect to backend.";
  } finally {
    askBtn.disabled = false;
  }
});

function renderInsight(text) {
  if (!text) {
    insightText.textContent = "No insights returned.";
    return;
  }

  const normalized = text.replace(/\r\n/g, "\n").trim();

  if (normalized.includes("\n") || normalized.match(/[-•*]\s+/)) {
    const lines = normalized.split("\n").map(l => l.trim()).filter(Boolean);
    const cleanLines = lines.map(l => l.replace(/^[-•*]\s*/, ""));

    const ul = document.createElement("ul");
    cleanLines.forEach(l => {
      const li = document.createElement("li");
      li.textContent = l;
      ul.appendChild(li);
    });

    insightText.innerHTML = "";
    insightText.appendChild(ul);
    return;
  }

  insightText.textContent = normalized;
}
