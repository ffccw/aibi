const state = {
  headers: [],
  rows: [],
};

const providedDataFile = "master_tourism_data_final%20(1).csv";

const elements = {
  fileInput: document.getElementById("csvFile"),
  rowsCount: document.getElementById("rowsCount"),
  columnsCount: document.getElementById("columnsCount"),
  numFieldCount: document.getElementById("numFieldCount"),
  categoryFieldCount: document.getElementById("categoryFieldCount"),
  categoriesOutput: document.getElementById("categoriesOutput"),
  insightsList: document.getElementById("insightsList"),
  askInput: document.getElementById("askInput"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  aiResponse: document.getElementById("aiResponse"),
  metricSelect: document.getElementById("metricSelect"),
  dimensionSelect: document.getElementById("dimensionSelect"),
  viewSelect: document.getElementById("viewSelect"),
  demoBtn: document.getElementById("demoBtn"),
  chartTooltip: document.getElementById("chartTooltip"),
};

const demoDataset = {
  headers: ["Region", "Category", "Revenue", "Orders", "Customer Satisfaction"],
  rows: [
    ["North", "A", "12000", "120", "8.2"],
    ["North", "B", "9500", "88", "7.9"],
    ["South", "A", "13500", "141", "8.5"],
    ["South", "B", "10100", "96", "8.1"],
    ["East", "A", "8900", "82", "7.7"],
    ["East", "B", "11200", "101", "8.0"],
    ["West", "A", "14800", "155", "8.8"],
    ["West", "B", "11600", "108", "8.3"],
  ],
};

function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell !== "")) {
      rows.push(currentRow);
    }
  }

  if (!rows.length) {
    return { headers: [], rows: [] };
  }

  const headers = rows[0].map((header, index) => header || `Column ${index + 1}`);
  const body = rows.slice(1).map((row) => {
    const normalized = [...row];
    while (normalized.length < headers.length) normalized.push("");
    if (normalized.length > headers.length) normalized.length = headers.length;
    return normalized;
  });

  return { headers, rows: body };
}

function isNumericValue(value) {
  if (value === null || value === undefined) return false;
  const cleaned = `${value}`.trim().replace(/,/g, "");
  return cleaned !== "" && !Number.isNaN(Number(cleaned));
}

function isTimeLikeHeader(header) {
  return /(year|date|month|quarter|time)/i.test(header || "");
}

function isTimeLikeValue(value) {
  if (!value) return false;
  return /^\d{4}$/.test(String(value).trim()) || /^\d{4}-\d{2}-\d{2}$/.test(String(value).trim());
}

function countFrequency(values) {
  return values.reduce((acc, value) => {
    const key = String(value || "").trim();
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function getTopItems(map, limit = 4) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function getColumnSummary(dataset) {
  const numericColumns = [];
  const categoricalColumns = [];
  const timeColumns = [];

  dataset.headers.forEach((header, index) => {
    const values = dataset.rows.map((row) => row[index] || "");
    const nonEmptyValues = values.filter((value) => String(value).trim() !== "");
    const allNumeric = nonEmptyValues.length > 0 && nonEmptyValues.every((value) => isNumericValue(value));
    const looksLikeTime = isTimeLikeHeader(header) && values.every((value) => isTimeLikeValue(value));

    if (allNumeric && looksLikeTime) {
      timeColumns.push({ header, values, index, time: true });
    } else if (allNumeric) {
      numericColumns.push({ header, values, index });
    } else {
      categoricalColumns.push({ header, values, index });
    }
  });

  const fallbackCategory = categoricalColumns.length === 0 && timeColumns.length === 0 && dataset.rows.length > 0
    ? [{
        header: "Row Index",
        values: dataset.rows.map((_, index) => String(index + 1)),
        index: -1,
        synthetic: true,
      }]
    : [];

  const effectiveCategories = [...timeColumns, ...categoricalColumns, ...fallbackCategory];

  const categoryDetails = effectiveCategories.map((column) => {
    if (column.synthetic) {
      return `${column.header}: auto-generated from row order`;
    }

    const counts = countFrequency(column.values);
    const top = getTopItems(counts, 3)
      .map(([name, count]) => `${name} (${count})`)
      .join(", ");
    return `${column.header}: ${top || "No values"}`;
  });

  return { numericColumns, categoricalColumns: effectiveCategories, timeColumns, categoryDetails };
}

function renderSummary(dataset) {
  const summary = getColumnSummary(dataset);

  elements.rowsCount.textContent = dataset.rows.length;
  elements.columnsCount.textContent = dataset.headers.length;
  elements.numFieldCount.textContent = summary.numericColumns.length;
  elements.categoryFieldCount.textContent = summary.categoricalColumns.length;
  elements.categoriesOutput.textContent = summary.categoryDetails.length
    ? summary.categoryDetails.join(" • ")
    : "No categories detected.";

  return summary;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatNumber(value, fractionDigits = 2) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function showChartTooltip(event, html) {
  const tooltip = elements.chartTooltip;
  if (!tooltip) return;

  tooltip.innerHTML = html;
  tooltip.classList.add("visible");
  tooltip.style.left = `${event.clientX + 14}px`;
  tooltip.style.top = `${event.clientY + 14}px`;
}

function hideChartTooltip() {
  const tooltip = elements.chartTooltip;
  if (!tooltip) return;

  tooltip.classList.remove("visible");
}

function attachChartInteractions(container) {
  if (!container) return;

  const nodes = container.querySelectorAll("[data-chart-node]");
  nodes.forEach((node) => {
    const label = node.dataset.label || "Value";
    const value = node.dataset.value || "0";
    const meta = node.dataset.meta || "Metric";

    const onMove = (event) => {
      showChartTooltip(event, `<strong>${escapeHtml(label)}</strong><br>${escapeHtml(meta)}: ${escapeHtml(value)}`);
    };

    node.addEventListener("mouseenter", onMove);
    node.addEventListener("mousemove", onMove);
    node.addEventListener("mouseleave", hideChartTooltip);
    node.addEventListener("focus", (event) => showChartTooltip(event, `<strong>${escapeHtml(label)}</strong><br>${escapeHtml(meta)}: ${escapeHtml(value)}`));
    node.addEventListener("blur", hideChartTooltip);
    node.addEventListener("click", () => {
      elements.aiResponse.textContent = `Selected ${meta}: ${label} → ${value}`;
    });
  });
}

function getPreferredMetric(summary) {
  const preferred = summary.numericColumns.find((column) => /(支出|營收|收入|revenue|sales|amount|total|profit|cost|spend)/i.test(column.header));
  return preferred || summary.numericColumns[0];
}

function fillSelectors(dataset) {
  const summary = getColumnSummary(dataset);
  const preferredMetric = getPreferredMetric(summary);
  const preferredDimension = summary.categoricalColumns[0] || { header: "Row Index" };

  const numericOptions = summary.numericColumns.map((column) => `<option value="${escapeHtml(column.header)}">${escapeHtml(column.header)}</option>`).join("");
  const dimensionOptions = summary.categoricalColumns
    .map((column) => `<option value="${escapeHtml(column.header)}">${escapeHtml(column.header)}</option>`)
    .join("");

  elements.metricSelect.innerHTML = numericOptions || '<option value="">No numeric field</option>';
  elements.dimensionSelect.innerHTML = dimensionOptions || '<option value="">No category field</option>';

  if (preferredMetric) {
    elements.metricSelect.value = preferredMetric.header;
  }
  if (preferredDimension) {
    elements.dimensionSelect.value = preferredDimension.header;
  }
}

function average(values) {
  const clean = values.map((item) => Number(item)).filter((item) => Number.isFinite(item));
  if (!clean.length) return 0;
  return clean.reduce((sum, item) => sum + item, 0) / clean.length;
}

function buildGroupedData(dataset, dimensionHeader, metricHeader) {
  const dimensionIndex = dataset.headers.indexOf(dimensionHeader);
  const metricIndex = dataset.headers.indexOf(metricHeader);

  const groups = dataset.rows.reduce((acc, row, rowIndex) => {
    const dim = dimensionIndex >= 0 ? row[dimensionIndex] || "Unknown" : `Row ${rowIndex + 1}`;
    const metricValue = Number(row[metricIndex] || 0);
    if (!acc[dim]) acc[dim] = { count: 0, total: 0 };
    acc[dim].count += 1;
    acc[dim].total += metricValue;
    return acc;
  }, {});

  return Object.entries(groups)
    .map(([label, data]) => ({ label, value: data.total / data.count }))
    .sort((a, b) => b.value - a.value);
}

function getPaletteColor(index) {
  const palette = ["#60a5fa", "#34d399", "#f59e0b", "#f472b6", "#a78bfa", "#fb7185"];
  return palette[index % palette.length];
}

function drawBarChart(containerId, title, labels, values, xAxisLabel = "Category", yAxisLabel = "Value") {
  const container = document.getElementById(containerId);
  if (!container) return;

  const width = 340;
  const height = 220;
  const padding = { top: 22, right: 18, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...values, 1);
  const step = chartWidth / Math.max(labels.length, 1);
  const barWidth = Math.max(16, step * 0.58);

  const gridLines = [0, 0.25, 0.5, 0.75, 1]
    .map((ratio) => {
      const y = padding.top + chartHeight - ratio * chartHeight;
      const value = maxValue * ratio;
      return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="rgba(255,255,255,0.12)" stroke-dasharray="3 4" />
              <text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" font-size="10" fill="#bdd7ff">${formatCompactNumber(value)}</text>`;
    })
    .join("");

  const bars = labels
    .map((label, index) => {
      const value = values[index] || 0;
      const barHeight = Math.max((value / maxValue) * chartHeight, 8);
      const x = padding.left + index * step + (step - barWidth) / 2;
      const y = padding.top + chartHeight - barHeight;
      const shortLabel = label.length > 8 ? `${label.slice(0, 8)}…` : label;
      const color = getPaletteColor(index);

      return `<g class="chart-node" tabindex="0" data-chart-node="bar" data-label="${escapeHtml(label)}" data-value="${escapeHtml(formatCompactNumber(value))}" data-meta="${escapeHtml(yAxisLabel)}" style="cursor:pointer;">
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="8" fill="${color}" opacity="0.92" />
        <text x="${x + barWidth / 2}" y="${y - 6}" font-size="10" fill="#d8e7ff" text-anchor="middle">${escapeHtml(shortLabel)}</text>
      </g>`;
    })
    .join("");

  container.innerHTML = `<div class="chart-meta">${escapeHtml(title)}</div><svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
    <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${width - padding.right}" y2="${padding.top + chartHeight}" stroke="rgba(255,255,255,0.3)" />
    <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}" stroke="rgba(255,255,255,0.3)" />
    ${gridLines}
    ${bars}
    <text x="${width / 2}" y="${height - 12}" text-anchor="middle" font-size="11" fill="#bdd7ff">${escapeHtml(xAxisLabel)}</text>
    <text x="20" y="${height / 2}" text-anchor="middle" font-size="11" fill="#bdd7ff" transform="rotate(-90 20 ${height / 2})">${escapeHtml(yAxisLabel)}</text>
  </svg>`;
  attachChartInteractions(container);
}

function drawLineChart(containerId, title, labels, values, xAxisLabel = "Time", yAxisLabel = "Value") {
  const container = document.getElementById(containerId);
  if (!container) return;

  const width = 340;
  const height = 220;
  const padding = { top: 22, right: 18, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const valueRange = Math.max(maxValue - minValue, 1);
  const step = chartWidth / Math.max(labels.length - 1, 1);

  const gridLines = [0, 0.25, 0.5, 0.75, 1]
    .map((ratio) => {
      const y = padding.top + chartHeight - ratio * chartHeight;
      const value = minValue + ratio * valueRange;
      return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="rgba(255,255,255,0.12)" stroke-dasharray="3 4" />
              <text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" font-size="10" fill="#bdd7ff">${formatCompactNumber(value)}</text>`;
    })
    .join("");

  const points = values
    .map((value, index) => {
      const x = padding.left + index * step;
      const y = padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;
      return { x, y, value };
    });

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;
  const pointDots = points.map((point, index) => `<circle class="chart-node" tabindex="0" cx="${point.x}" cy="${point.y}" r="4" fill="#34d399" stroke="#08111f" stroke-width="2" data-chart-node="point" data-label="${escapeHtml(labels[index])}" data-value="${escapeHtml(formatCompactNumber(point.value))}" data-meta="${escapeHtml(yAxisLabel)}"></circle>`).join("");
  const labelsMarkup = labels
    .map((label, index) => {
      const x = padding.left + index * step;
      return `<text x="${x}" y="${height - 26}" font-size="10" fill="#d8e7ff" text-anchor="middle">${escapeHtml(label)}</text>`;
    })
    .join("");

  container.innerHTML = `<div class="chart-meta">${escapeHtml(title)}</div><svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="lineArea-${containerId}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="rgba(52,211,153,0.45)" />
        <stop offset="100%" stop-color="rgba(52,211,153,0.03)" />
      </linearGradient>
    </defs>
    <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${width - padding.right}" y2="${padding.top + chartHeight}" stroke="rgba(255,255,255,0.3)" />
    <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}" stroke="rgba(255,255,255,0.3)" />
    ${gridLines}
    <path d="${areaPath}" fill="url(#lineArea-${containerId})"></path>
    <path d="${linePath}" fill="none" stroke="#34d399" stroke-width="3" stroke-linecap="round"></path>
    ${pointDots}
    ${labelsMarkup}
    <text x="${width / 2}" y="${height - 12}" text-anchor="middle" font-size="11" fill="#bdd7ff">${escapeHtml(xAxisLabel)}</text>
    <text x="20" y="${height / 2}" text-anchor="middle" font-size="11" fill="#bdd7ff" transform="rotate(-90 20 ${height / 2})">${escapeHtml(yAxisLabel)}</text>
  </svg>`;
  attachChartInteractions(container);
}

function drawDonutChart(containerId, title, labels, values) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  const circumference = 352;
  const segments = values.map((value, index) => {
    const segmentLength = (value / total) * circumference;
    const offset = index === 0 ? 0 : values.slice(0, index).reduce((sum, item) => sum + item, 0) / total * circumference;
    return `<circle cx="110" cy="95" r="56" fill="none" stroke="${getPaletteColor(index)}" stroke-width="18" stroke-linecap="round" stroke-dasharray="${segmentLength} ${circumference - segmentLength}" stroke-dashoffset="${-offset}" transform="rotate(-90 110 95)" />`;
  }).join("");

  const legend = labels
    .map((label, index) => `<div class="chart-row chart-node" tabindex="0" data-chart-node="donut" data-label="${escapeHtml(label)}" data-value="${escapeHtml(formatCompactNumber(values[index]))}" data-meta="Share"><span class="legend-dot" style="background:${getPaletteColor(index)}"></span><span class="chart-value">${escapeHtml(label)}</span> · ${formatCompactNumber(values[index])}</div>`)
    .join("");

  container.innerHTML = `<div class="chart-meta">${escapeHtml(title)}</div><svg viewBox="0 0 260 190" preserveAspectRatio="xMidYMid meet"><circle cx="110" cy="95" r="56" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="18" />${segments}</svg><div class="chart-legend">${legend}</div>`;
  attachChartInteractions(container);
}

function buildSourceMarketComparison(dataset) {
  const marketColumns = dataset.headers
    .filter((header) => /^國籍_/.test(header))
    .map((header) => {
      const index = dataset.headers.indexOf(header);
      const total = dataset.rows.reduce((sum, row) => sum + Number(row[index] || 0), 0);
      return {
        label: header.replace(/^國籍_/, ""),
        value: total,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return marketColumns;
}

function buildForecast(series) {
  if (series.length < 2) return null;

  const years = series.map((item) => item.year);
  const values = series.map((item) => item.value);
  const xMean = average(years);
  const yMean = average(values);
  const numerator = years.reduce((sum, year, index) => sum + (year - xMean) * (values[index] - yMean), 0);
  const denominator = years.reduce((sum, year) => sum + (year - xMean) ** 2, 0);

  if (!denominator) return null;

  const slope = numerator / denominator;
  const intercept = yMean - slope * xMean;
  const nextYear = years[years.length - 1] + 1;
  const nextValue = intercept + slope * nextYear;
  const latestValue = values[values.length - 1];
  const changePct = ((nextValue - latestValue) / Math.max(latestValue, 1)) * 100;

  return {
    year: nextYear,
    value: nextValue,
    changePct,
  };
}

function renderDashboard(dataset) {
  const summary = getColumnSummary(dataset);
  const metricHeader = elements.metricSelect.value;
  const dimensionHeader = elements.dimensionSelect.value;
  const viewType = elements.viewSelect.value;

  const metricColumn = summary.numericColumns.find((column) => column.header === metricHeader) || summary.numericColumns[0];
  const dimensionColumn = summary.categoricalColumns.find((column) => column.header === dimensionHeader) || summary.categoricalColumns[0];

  if (!metricColumn) {
    document.getElementById("chart1").textContent = "Need at least one numeric column to build BI views.";
    document.getElementById("chart2").textContent = "Need at least one numeric column to build BI views.";
    document.getElementById("chart3").textContent = "Need at least one numeric column to build BI views.";
    document.getElementById("chart4").textContent = "Need at least one numeric column to build BI views.";
    return;
  }

  const grouped = buildGroupedData(dataset, dimensionColumn?.header, metricColumn.header);
  const topResults = grouped.slice(0, 4);
  const sourceComparison = buildSourceMarketComparison(dataset);
  const analysis = getBusinessAnalysis(dataset);

  if (viewType === "bar") {
    drawBarChart("chart1", `${metricColumn.header} by ${dimensionColumn.header}`, topResults.map((item) => item.label), topResults.map((item) => item.value), dimensionColumn.header, metricColumn.header);
  } else if (viewType === "line") {
    const lineLabels = dataset.rows.slice(0, Math.min(dataset.rows.length, 8)).map((_, index) => `R${index + 1}`);
    const lineValues = dataset.rows.slice(0, Math.min(dataset.rows.length, 8)).map((row) => Number(row[dataset.headers.indexOf(metricColumn.header)] || 0));
    drawLineChart("chart1", `${metricColumn.header} trend`, lineLabels, lineValues, analysis?.timeHeader || "Time", metricColumn.header);
  } else {
    drawDonutChart("chart1", `${dimensionColumn.header} share`, topResults.map((item) => item.label), topResults.map((item) => item.value));
  }

  const trendLabels = dataset.rows.map((_, index) => `R${index + 1}`);
  const trendValues = dataset.rows.map((row) => Number(row[dataset.headers.indexOf(metricColumn.header)] || 0));
  drawLineChart("chart2", `${metricColumn.header} trend`, trendLabels, trendValues, analysis?.timeHeader || "Time", metricColumn.header);

  drawBarChart("chart3", `${metricColumn.header} per ${dimensionColumn.header}`, grouped.map((item) => item.label), grouped.map((item) => item.value), dimensionColumn.header, metricColumn.header);

  if (sourceComparison.length) {
    drawBarChart("chart4", "Source Market Comparison", sourceComparison.map((item) => item.label), sourceComparison.map((item) => item.value), "Source Market", `${metricColumn.header} total`);
  } else {
    const previewRows = dataset.rows.slice(0, 5).map((row) => `<div class="chart-legend">${row.map((cell) => escapeHtml(cell)).join(" • ")}</div>`).join("");
    document.getElementById("chart4").innerHTML = `<div class="chart-meta">Preview rows</div>${previewRows}`;
  }
}

function getBusinessAnalysis(dataset) {
  const summary = getColumnSummary(dataset);
  const metric = getPreferredMetric(summary);
  const timeColumn = summary.categoricalColumns.find((column) => column.header === "Year" || column.time) || null;

  if (!metric || !timeColumn) {
    return null;
  }

  const metricIndex = dataset.headers.indexOf(metric.header);
  const timeIndex = dataset.headers.indexOf(timeColumn.header);

  const series = dataset.rows
    .map((row, index) => {
      const year = Number(row[timeIndex] || index + 1);
      const value = Number(row[metricIndex] || 0);
      if (!Number.isFinite(year) || !Number.isFinite(value)) {
        return null;
      }
      return { year, value };
    })
    .filter(Boolean)
    .sort((a, b) => a.year - b.year);

  if (!series.length) {
    return null;
  }

  const peak = series.reduce((best, current) => (current.value > best.value ? current : best), series[0]);
  const trough = series.reduce((worst, current) => (current.value < worst.value ? current : worst), series[0]);
  const latest = series[series.length - 1];
  const first = series[0];
  const previous = series[series.length - 2] || latest;
  const forecast = buildForecast(series);

  const nationalityColumns = dataset.headers
    .filter((header) => /^國籍_/.test(header))
    .map((header) => {
      const total = dataset.rows.reduce((sum, row) => sum + Number(row[dataset.headers.indexOf(header)] || 0), 0);
      return { header, total };
    })
    .sort((a, b) => b.total - a.total);

  const stayHeader = dataset.headers.find((header) => /每一旅客平均在臺停留夜數/.test(header));
  const dailySpendHeader = dataset.headers.find((header) => /每一旅客每日平均消費額/.test(header));

  const avgStay = stayHeader
    ? average(dataset.rows.map((row) => row[dataset.headers.indexOf(stayHeader)] || 0))
    : 0;
  const avgDailySpend = dailySpendHeader
    ? average(dataset.rows.map((row) => row[dataset.headers.indexOf(dailySpendHeader)] || 0))
    : 0;

  return {
    metricHeader: metric.header,
    timeHeader: timeColumn.header,
    peak,
    trough,
    latest,
    previous,
    forecast,
    durationChangePct: ((latest.value - first.value) / Math.max(first.value, 1)) * 100,
    peakDropPct: ((peak.value - trough.value) / Math.max(peak.value, 1)) * 100,
    recoveryPct: ((latest.value - trough.value) / Math.max(trough.value, 1)) * 100,
    latestVsPreviousPct: ((latest.value - previous.value) / Math.max(previous.value, 1)) * 100,
    dominantNationality: nationalityColumns[0],
    avgStay,
    avgDailySpend,
  };
}

function renderInsights(dataset) {
  const summary = getColumnSummary(dataset);
  const insights = [];
  const syntheticCategory = summary.categoricalColumns.find((column) => column.synthetic);
  const preferredMetric = getPreferredMetric(summary);
  const analysis = getBusinessAnalysis(dataset);

  if (analysis) {
    const peakText = `${analysis.metricHeader} was strongest in ${analysis.peak.year} at ${formatCompactNumber(analysis.peak.value)}.`;
    const troughText = `It then fell to the lowest point in ${analysis.trough.year} at ${formatCompactNumber(analysis.trough.value)}, a ${formatNumber(Math.abs(analysis.peakDropPct), 1)}% drop from the peak.`;
    const recoveryText = `By ${analysis.latest.year}, it had recovered to ${formatCompactNumber(analysis.latest.value)}, which is ${formatNumber(Math.abs(analysis.recoveryPct), 1)}% above the trough.`;
    const sourceText = `The dominant visitor source is ${analysis.dominantNationality.header.replace(/^國籍_/, "")} with a total contribution of ${formatCompactNumber(analysis.dominantNationality.total)}.`;
    const stayText = `Average stay length is ${formatNumber(analysis.avgStay, 2)} nights, with average daily spend around ${formatNumber(analysis.avgDailySpend, 2)} USD.`;

    if (analysis.forecast) {
      insights.push(`Forecast for ${analysis.forecast.year}: ${formatCompactNumber(analysis.forecast.value)} with ${formatNumber(Math.abs(analysis.forecast.changePct), 1)}% ${analysis.forecast.changePct >= 0 ? "upside" : "downside"} momentum vs the latest observed year.`);
    }

    insights.push(peakText);
    insights.push(troughText);
    insights.push(recoveryText);
    insights.push(sourceText);
    insights.push(stayText);
    insights.push(`Action plan: prioritize ${analysis.dominantNationality.header.replace(/^國籍_/, "")} and the next-highest source markets, while keeping a recovery buffer for volatile arrival periods.`);
  } else {
    if (syntheticCategory) {
      insights.push(`No explicit category field was detected, so the dashboard automatically used ${syntheticCategory.header} as the default grouping dimension.`);
    } else if (summary.categoricalColumns.length) {
      const firstCategory = summary.categoricalColumns[0];
      const counts = countFrequency(firstCategory.values);
      const top = getTopItems(counts, 1)[0];
      insights.push(`The strongest category signal is ${top[0]} with ${top[1]} records in ${firstCategory.header}.`);
    }

    if (preferredMetric) {
      const avgValue = average(preferredMetric.values);
      insights.push(`Average ${preferredMetric.header} is ${avgValue.toFixed(2)}, which gives a quick KPI baseline for this dataset.`);
    }
  }

  elements.insightsList.innerHTML = insights.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function generateAnswer(dataset, prompt) {
  if (!dataset.headers.length || !dataset.rows.length) {
    return "Please upload a CSV file before asking analysis questions.";
  }

  const analysis = getBusinessAnalysis(dataset);
  const lowerPrompt = prompt.toLowerCase();

  if (analysis) {
    if (lowerPrompt.includes("forecast") || lowerPrompt.includes("predict") || lowerPrompt.includes("預測")) {
      return `The current linear trend implies a forecast of ${formatCompactNumber(analysis.forecast.value)} in ${analysis.forecast.year}, which is ${formatNumber(Math.abs(analysis.forecast.changePct), 1)}% ${analysis.forecast.changePct >= 0 ? "above" : "below"} the latest observation. This is useful for planning capacity and budget allocation.`;
    }

    if (lowerPrompt.includes("action") || lowerPrompt.includes("recommend") || lowerPrompt.includes("建議") || lowerPrompt.includes("方案")) {
      return `Action recommendation: focus the next campaign on ${analysis.dominantNationality.header.replace(/^國籍_/, "")}, keep the recovery momentum in the top-performing source markets, and prepare contingency support for volatile quarters when arrivals fall sharply.`;
    }

    if (lowerPrompt.includes("trend") || lowerPrompt.includes("pattern") || lowerPrompt.includes("趨勢")) {
      return `${analysis.metricHeader} shows a sharp cycle over time: it peaked in ${analysis.peak.year} at ${formatCompactNumber(analysis.peak.value)} and dropped to ${analysis.trough.year} at ${formatCompactNumber(analysis.trough.value)}. The latest value in ${analysis.latest.year} is ${formatCompactNumber(analysis.latest.value)}, indicating a ${formatNumber(Math.abs(analysis.recoveryPct), 1)}% recovery from the trough.`;
    }

    if (lowerPrompt.includes("anomaly") || lowerPrompt.includes("outlier") || lowerPrompt.includes("異常")) {
      return `The most visible anomaly is the collapse from ${analysis.peak.year} to ${analysis.trough.year}: ${analysis.metricHeader} declined by ${formatNumber(Math.abs(analysis.peakDropPct), 1)}%. That kind of shock is stronger than a normal year-over-year fluctuation and should be treated as a business-risk signal.`;
    }

    return `I analyzed the dataset and found that ${analysis.metricHeader} peaked in ${analysis.peak.year}, bottomed out in ${analysis.trough.year}, and recovered to ${formatCompactNumber(analysis.latest.value)} by ${analysis.latest.year}. The strongest source market is ${analysis.dominantNationality.header.replace(/^國籍_/, "")}, and the average stay is ${formatNumber(analysis.avgStay, 2)} nights.`;
  }

  const summary = getColumnSummary(dataset);
  const metric = summary.numericColumns[0]?.header || "the numeric field";
  const dimension = summary.categoricalColumns[0]?.header || "category field";
  const averageValue = summary.numericColumns[0] ? average(summary.numericColumns[0].values).toFixed(2) : "N/A";

  if (lowerPrompt.includes("trend") || lowerPrompt.includes("pattern")) {
    return `This dataset looks good for trend analysis. The primary metric is ${metric}, and the top grouping dimension is ${dimension}. The average ${metric} is ${averageValue}, so the dashboard can focus on segment performance and movement across rows.`;
  }

  if (lowerPrompt.includes("anomaly") || lowerPrompt.includes("outlier")) {
    return `To detect anomalies, compare the selected metric against the average baseline. In the current data profile, ${metric} is the clearest numeric signal and ${dimension} is the best segmentation field for spotting unusual behavior.`;
  }

  return `I analyzed the uploaded dataset and found ${dataset.rows.length} rows with ${dataset.headers.length} columns. The most useful BI view is to compare ${metric} across ${dimension}, then drill into row-level trend behavior from the preview panel.`;
}

function loadDataset(dataset) {
  state.headers = dataset.headers;
  state.rows = dataset.rows;

  renderSummary(state);
  fillSelectors(state);
  renderDashboard(state);
  renderInsights(state);
  elements.aiResponse.textContent = `Dashboard refreshed. ${state.rows.length} rows loaded and ${state.headers.length} columns detected.`;
}

function getProvidedDataCandidates() {
  const stamp = Date.now();
  const normalized = [
    `${providedDataFile}?t=${stamp}`,
    `./${providedDataFile}?t=${stamp}`,
    `${encodeURI(providedDataFile)}?t=${stamp}`,
    `./${encodeURI(providedDataFile)}?t=${stamp}`,
  ];

  return [...new Set(normalized)];
}

async function loadProvidedDataset() {
  let lastError = null;

  for (const candidate of getProvidedDataCandidates()) {
    try {
      const response = await fetch(candidate, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
      const parsed = parseCSV(text);

      if (!parsed.headers.length || !parsed.rows.length) {
        throw new Error("Parsed dataset is empty");
      }

      loadDataset(parsed);
      elements.aiResponse.textContent = `BI dashboard generated from provided dataset: ${providedDataFile}`;
      return;
    } catch (error) {
      lastError = error;
    }
  }

  elements.aiResponse.textContent = `Unable to load the provided CSV from the current deployment path. The dashboard is waiting for the real file to be deployed at the same site root. Error: ${lastError?.message || "Unknown fetch error"}`;
}

function handleFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const parsed = parseCSV(String(reader.result || ""));
    if (!parsed.headers.length || !parsed.rows.length) {
      elements.aiResponse.textContent = "The uploaded file could not be parsed. Please verify that the CSV is in the expected row/column format.";
      return;
    }

    loadDataset(parsed);
  };

  reader.readAsText(file);
}

function wireEvents() {
  elements.fileInput.addEventListener("change", handleFileUpload);
  elements.metricSelect.addEventListener("change", () => loadDataset(state));
  elements.dimensionSelect.addEventListener("change", () => loadDataset(state));
  elements.viewSelect.addEventListener("change", () => loadDataset(state));

  elements.analyzeBtn.addEventListener("click", () => {
    const prompt = elements.askInput.value.trim();
    elements.aiResponse.textContent = generateAnswer(state, prompt || "Summarize this dataset");
  });

  elements.demoBtn.addEventListener("click", () => {
    loadProvidedDataset();
  });
}

wireEvents();
loadProvidedDataset();
