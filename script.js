// Change this if your FastAPI server runs somewhere else
const API_URL = "https://mansik-saltulan-score-1.onrender.com";

const form = document.getElementById("predict-form");
const btn = document.getElementById("submit-btn");

const panels = {
  empty: document.getElementById("result-empty"),
  loading: document.getElementById("result-loading"),
  error: document.getElementById("result-error"),
  ok: document.getElementById("result-ok"),
};

function show(name) {
  Object.entries(panels).forEach(([key, el]) => (el.hidden = key !== name));
}

// The model returns a score; we assume a 1-10 scale (higher = better mental health).
function describe(score) {
  if (score >= 7) {
    return { label: "Good", color: "var(--good)", advice: "Your habits point to healthy well-being. Keep it up." };
  }
  if (score >= 5) {
    return { label: "Moderate", color: "var(--mid)", advice: "Some habits may be affecting you. Better sleep and less screen time can help." };
  }
  return { label: "Needs attention", color: "var(--low)", advice: "Consider cutting screen time, sleeping more, and talking to someone you trust." };
}

function showScore(raw) {
  const score = Math.max(0, Math.min(10, raw));
  const info = describe(score);
  const fill = document.getElementById("gauge-fill");

  document.getElementById("score-value").textContent = score.toFixed(1);
  document.getElementById("score-label").textContent = info.label;
  document.getElementById("score-advice").textContent = info.advice;

  show("ok");

  fill.style.stroke = info.color;
  fill.style.strokeDashoffset = 100; // reset so the animation replays
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fill.style.strokeDashoffset = 100 - score * 10;
    });
  });
}

// FastAPI returns validation errors as {detail: [{loc: [...], msg: "..."}]}
function readError(data) {
  if (Array.isArray(data?.detail)) {
    return data.detail
      .map((d) => `${d.loc[d.loc.length - 1]}: ${d.msg}`)
      .join(" | ");
  }
  return data?.detail || "Something went wrong.";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const fd = new FormData(form);
  const numbers = [
    "Age",
    "Avg_Daily_Usage_Hours",
    "Daily_Unlocks",
    "Study_Hours",
    "Physical_Activity_Hours",
    "Sleep_Hours_Per_Night",
  ];

  const payload = {};
  for (const [key, value] of fd.entries()) {
    payload[key] = numbers.includes(key) ? Number(value) : value.trim();
  }

  btn.disabled = true;
  show("loading");

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(readError(data));
    }

    showScore(data.predicted_mental_health);
  } catch (err) {
    const offline = err instanceof TypeError;
    document.getElementById("error-text").textContent = offline
      ? "Can't reach the server. Check that FastAPI is running at " + API_URL
      : err.message;
    show("error");
  } finally {
    btn.disabled = false;
  }
});
