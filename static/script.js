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

// ==========================================
// Upload Excel
// ==========================================
analyzeBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) return alert("Please upload an Excel or CSV file");

  statusText.textContent = "⏳ Reading file...";

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  excelData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  renderTable();
});

// ==========================================
// Render Table + Pagination
// ==========================================
function renderTable() {
  dataHead.innerHTML = "";
  dataBody.innerHTML = "";

  const headers = excelData[0];
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
  const totalPages = Math.ceil(rows.length / pageSize);

  const start = (window.currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, rows.length);

  for (let i = start; i < end; i++) {
    const tr = document.createElement("tr");
    rows[i].forEach(cell => {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    });
    dataBody.appendChild(tr);
  }

  previewInfo.textContent = `Showing ${start + 1}-${end} of ${rows.length}`;
  document.getElementById("pageInfo").textContent =
    `Page ${window.currentPage} / ${totalPages}`;
}

// ==========================================
// Ask AI
// ==========================================
askBtn.addEventListener("click", async () => {
  const query = queryInput.value.trim();
  if (!query) return alert("Type your question");

  insightText.textContent = "⏳ Asking AI...";

  try {
    // Limit size before sending to backend
    let sendData = excelData;
    if (sendData.length > 200) {
      sendData = sendData.slice(0, 200); // Prevent huge payload
    }

    const response = await fetch("https://excel-analyzer-2-lvvk.onrender.com/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: query,
        excelData: sendData
      })
    });

    const data = await response.json();
    insightText.textContent = data.answer;

  } catch (err) {
    insightText.textContent = "❌ Cannot connect to backend.";
  }
});
