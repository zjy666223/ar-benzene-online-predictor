const riskDefaults = {
  benzene: 0.58,
  age: 58,
  sex: "Female",
  asthma: "No",
  smoke: "No",
  htn: "No",
};

const survDefaults = {
  age: 58,
  sex: "Female",
  smoke: "No",
  kdm: 0.8,
  benzene: 0.58,
  diabetes: "No",
};

const riskEls = {
  benzene: document.querySelector("#risk-benzene"),
  benzeneNumber: document.querySelector("#risk-benzene-number"),
  age: document.querySelector("#risk-age"),
  ageNumber: document.querySelector("#risk-age-number"),
  sex: document.querySelector("#risk-sex"),
  asthma: document.querySelector("#risk-asthma"),
  smoke: document.querySelector("#risk-smoke"),
  htn: document.querySelector("#risk-htn"),
  value: document.querySelector("#risk-value"),
  band: document.querySelector("#risk-band"),
  delta: document.querySelector("#risk-delta"),
  interpretation: document.querySelector("#risk-interpretation"),
  gauge: document.querySelector("#risk-gauge"),
  curve: document.querySelector("#risk-curve"),
  contrib: document.querySelector("#risk-contrib"),
  reset: document.querySelector("#risk-reset"),
};

const survEls = {
  age: document.querySelector("#surv-age"),
  ageNumber: document.querySelector("#surv-age-number"),
  sex: document.querySelector("#surv-sex"),
  smoke: document.querySelector("#surv-smoke"),
  kdm: document.querySelector("#surv-kdm"),
  kdmNumber: document.querySelector("#surv-kdm-number"),
  benzene: document.querySelector("#surv-benzene"),
  benzeneNumber: document.querySelector("#surv-benzene-number"),
  diabetes: document.querySelector("#surv-diabetes"),
  y3: document.querySelector("#surv-3y"),
  y5: document.querySelector("#surv-5y"),
  y8: document.querySelector("#surv-8y"),
  interpretation: document.querySelector("#surv-interpretation"),
  hr: document.querySelector("#surv-hr"),
  curve: document.querySelector("#survival-curve"),
  contrib: document.querySelector("#surv-contrib"),
  reset: document.querySelector("#surv-reset"),
};

const panelButtons = [...document.querySelectorAll(".switch-btn")];
const panels = [...document.querySelectorAll(".panel")];
const summaryOutput = document.querySelector("#summary-output");
const copySummaryBtn = document.querySelector("#copy-summary");
const copyLinkBtn = document.querySelector("#copy-link");

function logistic(x) {
  return 1 / (1 + Math.exp(-x));
}

function pct(v, digits = 1) {
  return `${(v * 100).toFixed(digits)}%`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function riskInputs() {
  return {
    benzene: Number(riskEls.benzene.value),
    age: Number(riskEls.age.value),
    sex: riskEls.sex.value,
    asthma: riskEls.asthma.value,
    smoke: riskEls.smoke.value,
    htn: riskEls.htn.value,
  };
}

function survInputs() {
  return {
    age: Number(survEls.age.value),
    sex: survEls.sex.value,
    smoke: survEls.smoke.value,
    kdm: Number(survEls.kdm.value),
    benzene: Number(survEls.benzene.value),
    diabetes: survEls.diabetes.value,
  };
}

function computeRisk(values) {
  const terms = [
    { name: "Benzene", value: 1.9 * (values.benzene - 0.43) },
    { name: "Age", value: 0.12 * ((values.age - 58) / 10) },
    { name: "Male sex", value: values.sex === "Male" ? -0.14 : 0 },
    { name: "Asthma", value: values.asthma === "Yes" ? 0.95 : 0 },
    { name: "Current smoking", value: values.smoke === "Yes" ? 0.31 : 0 },
    { name: "Hypertension", value: values.htn === "Yes" ? 0.21 : 0 },
  ];

  const intercept = -4.2;
  const lp = intercept + terms.reduce((sum, item) => sum + item.value, 0);
  const prob = logistic(lp);
  const baseProb = logistic(intercept);
  return {
    lp,
    prob,
    delta: prob - baseProb,
    terms,
  };
}

function computeSurvival(values) {
  const terms = [
    { name: "Age", value: 0.39 * ((values.age - 58) / 10) },
    { name: "Current smoking", value: values.smoke === "Yes" ? 0.64 : 0 },
    { name: "KDM", value: 0.28 * values.kdm },
    { name: "Benzene", value: 0.19 * ((values.benzene - 0.43) / 0.075) },
    { name: "Diabetes", value: values.diabetes === "Yes" ? 0.34 : 0 },
    { name: "Male sex", value: values.sex === "Male" ? 0.17 : 0 },
  ];

  const lp = terms.reduce((sum, item) => sum + item.value, 0);
  const hrProxy = Math.exp(lp);
  const base5 = 0.965;
  const h0 = -Math.log(base5) / 5;
  const survAt = (year) => Math.exp(-h0 * year * hrProxy);

  return {
    lp,
    hrProxy,
    s3: survAt(3),
    s5: survAt(5),
    s8: survAt(8),
    curve: Array.from({ length: 11 }, (_, i) => ({ year: i, value: survAt(i) })),
    terms,
  };
}

function riskBand(prob) {
  if (prob < 0.01) return "Low";
  if (prob < 0.02) return "Intermediate";
  return "High";
}

function riskBandText(prob) {
  if (prob < 0.01) return "Low risk";
  if (prob < 0.02) return "Intermediate risk";
  return "High risk";
}

function survivalBandText(s5) {
  if (s5 > 0.96) return "Favorable survival profile";
  if (s5 > 0.92) return "Intermediate survival profile";
  return "Higher follow-up risk";
}

function updateGauge(prob) {
  const cap = 0.08;
  const deg = clamp((prob / cap) * 300, 8, 300);
  riskEls.gauge.style.background = `
    radial-gradient(circle at center, rgba(255,252,247,1) 54%, transparent 55%),
    conic-gradient(var(--rose) ${deg}deg, rgba(232,75,138,0.14) ${deg}deg)
  `;
}

function renderContrib(container, terms) {
  container.innerHTML = "";
  const maxAbs = Math.max(...terms.map((t) => Math.abs(t.value)), 0.01);

  terms
    .slice()
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .forEach((item) => {
      const row = document.createElement("div");
      row.className = "contrib-item";

      const name = document.createElement("div");
      name.className = "contrib-name";
      name.textContent = item.name;

      const bar = document.createElement("div");
      bar.className = "contrib-bar";

      const fill = document.createElement("div");
      fill.className = `contrib-fill ${item.value >= 0 ? "pos" : "neg"}`;
      const widthPct = (Math.abs(item.value) / maxAbs) * 50;
      fill.style.width = `${widthPct}%`;
      fill.style.left = item.value >= 0 ? "50%" : `${50 - widthPct}%`;

      const value = document.createElement("div");
      value.className = "contrib-value";
      value.textContent = `${item.value >= 0 ? "+" : ""}${item.value.toFixed(2)}`;

      bar.appendChild(fill);
      row.append(name, bar, value);
      container.appendChild(row);
    });
}

function svgFrame(width, height, margin) {
  return {
    width,
    height,
    margin,
    xMin: margin.left,
    xMax: width - margin.right,
    yMin: margin.top,
    yMax: height - margin.bottom,
  };
}

function linePath(points, xScale, yScale) {
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.x).toFixed(2)} ${yScale(p.y).toFixed(2)}`)
    .join(" ");
}

function clearSvg(svg) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
}

function addSvg(svg, tag, attrs = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  svg.appendChild(node);
  return node;
}

function drawAxes(svg, frame, xTicks, yTicks, xFormat, yFormat) {
  addSvg(svg, "rect", {
    x: 0,
    y: 0,
    width: frame.width,
    height: frame.height,
    fill: "transparent",
  });

  xTicks.forEach((tick) => {
    const x = tick.position;
    addSvg(svg, "line", {
      x1: x,
      y1: frame.yMin,
      x2: x,
      y2: frame.yMax,
      stroke: "rgba(31,45,40,0.08)",
      "stroke-width": 1,
    });
    const text = addSvg(svg, "text", {
      x,
      y: frame.height - 12,
      "text-anchor": "middle",
      fill: "#5f6e69",
      "font-size": "11",
    });
    text.textContent = xFormat(tick.value);
  });

  yTicks.forEach((tick) => {
    const y = tick.position;
    addSvg(svg, "line", {
      x1: frame.xMin,
      y1: y,
      x2: frame.xMax,
      y2: y,
      stroke: "rgba(31,45,40,0.08)",
      "stroke-width": 1,
    });
    const text = addSvg(svg, "text", {
      x: 38,
      y: y + 4,
      "text-anchor": "end",
      fill: "#5f6e69",
      "font-size": "11",
    });
    text.textContent = yFormat(tick.value);
  });
}

function renderRiskCurve(values) {
  const svg = riskEls.curve;
  clearSvg(svg);
  const frame = svgFrame(420, 180, { top: 14, right: 16, bottom: 28, left: 44 });
  const xMin = 0.2;
  const xMax = 1.2;
  const points = [];
  for (let x = xMin; x <= xMax + 1e-8; x += 0.02) {
    const result = computeRisk({ ...values, benzene: Number(x.toFixed(2)) });
    points.push({ x, y: result.prob });
  }
  const yMin = 0;
  const yMax = Math.max(...points.map((d) => d.y), values.prob) * 1.08;

  const xScale = (x) => frame.xMin + ((x - xMin) / (xMax - xMin)) * (frame.xMax - frame.xMin);
  const yScale = (y) => frame.yMax - ((y - yMin) / (yMax - yMin)) * (frame.yMax - frame.yMin);

  drawAxes(
    svg,
    frame,
    [0.2, 0.43, 0.7, 1.0].map((v) => ({ value: v, position: xScale(v) })),
    [0, yMax / 3, (2 * yMax) / 3, yMax].map((v) => ({ value: v, position: yScale(v) })),
    (v) => v.toFixed(2),
    (v) => `${(v * 100).toFixed(1)}%`
  );

  addSvg(svg, "path", {
    d: linePath(points, xScale, yScale),
    fill: "none",
    stroke: "#e84b8a",
    "stroke-width": 3,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  });

  addSvg(svg, "line", {
    x1: xScale(values.benzene),
    y1: frame.yMin,
    x2: xScale(values.benzene),
    y2: frame.yMax,
    stroke: "rgba(15,118,110,0.35)",
    "stroke-width": 1.5,
    "stroke-dasharray": "4 4",
  });

  addSvg(svg, "circle", {
    cx: xScale(values.benzene),
    cy: yScale(computeRisk(values).prob),
    r: 5,
    fill: "#0f766e",
  });
}

function renderSurvivalCurve(result) {
  const svg = survEls.curve;
  clearSvg(svg);
  const frame = svgFrame(420, 220, { top: 16, right: 14, bottom: 30, left: 44 });
  const xMin = 0;
  const xMax = 10;
  const yMin = Math.min(...result.curve.map((d) => d.value)) - 0.05;
  const yMax = 1;

  const xScale = (x) => frame.xMin + ((x - xMin) / (xMax - xMin)) * (frame.xMax - frame.xMin);
  const yScale = (y) => frame.yMax - ((y - yMin) / (yMax - yMin)) * (frame.yMax - frame.yMin);

  drawAxes(
    svg,
    frame,
    [0, 2, 4, 6, 8, 10].map((v) => ({ value: v, position: xScale(v) })),
    [yMin, (yMin + yMax) / 2, yMax].map((v) => ({ value: v, position: yScale(v) })),
    (v) => `${v}`,
    (v) => `${(v * 100).toFixed(0)}%`
  );

  const pathPoints = result.curve.map((d) => ({ x: d.year, y: d.value }));
  addSvg(svg, "path", {
    d: linePath(pathPoints, xScale, yScale),
    fill: "none",
    stroke: "#0f766e",
    "stroke-width": 3,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  });

  [3, 5, 8].forEach((year) => {
    const value = year === 3 ? result.s3 : year === 5 ? result.s5 : result.s8;
    addSvg(svg, "circle", {
      cx: xScale(year),
      cy: yScale(value),
      r: 4.5,
      fill: "#d97706",
    });
  });
}

function syncPair(rangeEl, numberEl, digits = null) {
  const updateFromRange = () => {
    numberEl.value = digits === null ? rangeEl.value : Number(rangeEl.value).toFixed(digits);
  };
  const updateFromNumber = () => {
    rangeEl.value = numberEl.value;
  };
  rangeEl.addEventListener("input", updateFromRange);
  numberEl.addEventListener("input", updateFromNumber);
}

function updateSummary() {
  const activePanel = document.querySelector(".panel.active")?.id;
  if (activePanel === "survival-panel") {
    const v = survInputs();
    const r = computeSurvival(v);
    summaryOutput.value = [
      "AR survival summary",
      `Age: ${v.age}`,
      `Sex: ${v.sex}`,
      `Current smoking: ${v.smoke}`,
      `KDM: ${v.kdm.toFixed(1)}`,
      `Benzene: ${v.benzene.toFixed(2)} μg/m³`,
      `Diabetes: ${v.diabetes}`,
      `3-year survival: ${pct(r.s3)}`,
      `5-year survival: ${pct(r.s5)}`,
      `8-year survival: ${pct(r.s8)}`,
      `HR proxy: ${r.hrProxy.toFixed(2)}`,
      `Interpretation: ${survivalBandText(r.s5)}`,
    ].join("\n");
  } else {
    const v = riskInputs();
    const r = computeRisk(v);
    summaryOutput.value = [
      "AR risk summary",
      `Benzene: ${v.benzene.toFixed(2)} μg/m³`,
      `Age: ${v.age}`,
      `Sex: ${v.sex}`,
      `Asthma: ${v.asthma}`,
      `Current smoking: ${v.smoke}`,
      `Hypertension: ${v.htn}`,
      `Predicted risk: ${pct(r.prob)}`,
      `Interpretation: ${riskBandText(r.prob)}`,
    ].join("\n");
  }
}

function updateRisk() {
  const values = riskInputs();
  const result = computeRisk(values);
  riskEls.value.textContent = pct(result.prob);
  riskEls.band.textContent = riskBand(result.prob);
  riskEls.delta.textContent = `${result.delta >= 0 ? "+" : ""}${(result.delta * 100).toFixed(2)} pct`;
  riskEls.interpretation.textContent = riskBandText(result.prob);
  updateGauge(result.prob);
  renderRiskCurve(values);
  renderContrib(riskEls.contrib, result.terms);
  updateSummary();
  syncUrl();
}

function updateSurvival() {
  const values = survInputs();
  const result = computeSurvival(values);
  survEls.y3.textContent = pct(result.s3);
  survEls.y5.textContent = pct(result.s5);
  survEls.y8.textContent = pct(result.s8);
  survEls.interpretation.textContent = survivalBandText(result.s5);
  survEls.hr.textContent = `HR proxy ${result.hrProxy.toFixed(2)}`;
  renderSurvivalCurve(result);
  renderContrib(survEls.contrib, result.terms);
  updateSummary();
  syncUrl();
}

function attachRiskEvents() {
  [
    riskEls.benzene,
    riskEls.benzeneNumber,
    riskEls.age,
    riskEls.ageNumber,
    riskEls.sex,
    riskEls.asthma,
    riskEls.smoke,
    riskEls.htn,
  ].forEach((el) => el.addEventListener("input", updateRisk));

  riskEls.reset.addEventListener("click", () => {
    riskEls.benzene.value = riskDefaults.benzene;
    riskEls.benzeneNumber.value = riskDefaults.benzene;
    riskEls.age.value = riskDefaults.age;
    riskEls.ageNumber.value = riskDefaults.age;
    riskEls.sex.value = riskDefaults.sex;
    riskEls.asthma.value = riskDefaults.asthma;
    riskEls.smoke.value = riskDefaults.smoke;
    riskEls.htn.value = riskDefaults.htn;
    updateRisk();
  });
}

function attachSurvEvents() {
  [
    survEls.age,
    survEls.ageNumber,
    survEls.sex,
    survEls.smoke,
    survEls.kdm,
    survEls.kdmNumber,
    survEls.benzene,
    survEls.benzeneNumber,
    survEls.diabetes,
  ].forEach((el) => el.addEventListener("input", updateSurvival));

  survEls.reset.addEventListener("click", () => {
    survEls.age.value = survDefaults.age;
    survEls.ageNumber.value = survDefaults.age;
    survEls.sex.value = survDefaults.sex;
    survEls.smoke.value = survDefaults.smoke;
    survEls.kdm.value = survDefaults.kdm;
    survEls.kdmNumber.value = survDefaults.kdm;
    survEls.benzene.value = survDefaults.benzene;
    survEls.benzeneNumber.value = survDefaults.benzene;
    survEls.diabetes.value = survDefaults.diabetes;
    updateSurvival();
  });
}

function syncUrl() {
  const active = document.querySelector(".switch-btn.active")?.dataset.target || "risk-panel";
  const params = new URLSearchParams();
  params.set("tab", active);

  const risk = riskInputs();
  Object.entries(risk).forEach(([k, v]) => params.set(`r_${k}`, v));

  const surv = survInputs();
  Object.entries(surv).forEach(([k, v]) => params.set(`s_${k}`, v));

  history.replaceState({}, "", `${location.pathname}?${params.toString()}`);
}

function loadFromUrl() {
  const params = new URLSearchParams(location.search);
  const target = params.get("tab");
  if (target) activatePanel(target, false);

  const riskMap = {
    benzene: riskEls.benzene,
    age: riskEls.age,
    sex: riskEls.sex,
    asthma: riskEls.asthma,
    smoke: riskEls.smoke,
    htn: riskEls.htn,
  };
  Object.entries(riskMap).forEach(([key, el]) => {
    const value = params.get(`r_${key}`);
    if (value !== null) el.value = value;
  });
  riskEls.benzeneNumber.value = riskEls.benzene.value;
  riskEls.ageNumber.value = riskEls.age.value;

  const survMap = {
    age: survEls.age,
    sex: survEls.sex,
    smoke: survEls.smoke,
    kdm: survEls.kdm,
    benzene: survEls.benzene,
    diabetes: survEls.diabetes,
  };
  Object.entries(survMap).forEach(([key, el]) => {
    const value = params.get(`s_${key}`);
    if (value !== null) el.value = value;
  });
  survEls.ageNumber.value = survEls.age.value;
  survEls.kdmNumber.value = survEls.kdm.value;
  survEls.benzeneNumber.value = survEls.benzene.value;
}

function activatePanel(targetId, update = true) {
  panelButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.target === targetId));
  panels.forEach((panel) => panel.classList.toggle("active", panel.id === targetId));
  if (update) updateSummary();
}

panelButtons.forEach((btn) =>
  btn.addEventListener("click", () => {
    activatePanel(btn.dataset.target);
    syncUrl();
  })
);

copySummaryBtn.addEventListener("click", async () => {
  await navigator.clipboard.writeText(summaryOutput.value);
  copySummaryBtn.textContent = "Copied";
  setTimeout(() => {
    copySummaryBtn.textContent = "Copy summary";
  }, 1400);
});

copyLinkBtn.addEventListener("click", async () => {
  await navigator.clipboard.writeText(location.href);
  copyLinkBtn.textContent = "Copied";
  setTimeout(() => {
    copyLinkBtn.textContent = "Copy link";
  }, 1400);
});

syncPair(riskEls.benzene, riskEls.benzeneNumber, 2);
syncPair(riskEls.age, riskEls.ageNumber);
syncPair(survEls.age, survEls.ageNumber);
syncPair(survEls.kdm, survEls.kdmNumber, 1);
syncPair(survEls.benzene, survEls.benzeneNumber, 2);

loadFromUrl();
attachRiskEvents();
attachSurvEvents();
updateRisk();
updateSurvival();
