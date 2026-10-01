// FastAPI backend
const API_URL = "https://mansik-saltulan-score-2.onrender.com";

const form = document.getElementById("predict-form");
const btn = document.getElementById("submit-btn");

const panels = {
  empty: document.getElementById("result-empty"),
  loading: document.getElementById("result-loading"),
  error: document.getElementById("result-error"),
  ok: document.getElementById("result-ok"),
};

function show(name) {
  Object.entries(panels).forEach(([key, el]) => {
    el.hidden = key !== name;
  });
}

// Describe the predicted score
function describe(score) {
  if (score >= 7) {
    return {
      label: "Good",
      color: "var(--good)",
      advice: "Your habits point to healthy well-being. Keep it up."
    };
  }

  if (score >= 5) {
    return {
      label: "Moderate",
      color: "var(--mid)",
      advice: "Some habits may be affecting you. Better sleep and less screen time can help."
    };
  }

  return {
    label: "Needs attention",
    color: "var(--low)",
    advice: "Consider cutting screen time, sleeping more, and talking to someone you trust."
  };
}

function showScore(raw) {
  const score = Math.max(0, Math.min(10, Number(raw)));

  const info = describe(score);
  const fill = document.getElementById("gauge-fill");

  document.getElementById("score-value").textContent =
    score.toFixed(1);

  document.getElementById("score-label").textContent =
    info.label;

  document.getElementById("score-advice").textContent =
    info.advice;

  show("ok");

  fill.style.stroke = info.color;

  // Reset animation
  fill.style.strokeDashoffset = 100;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fill.style.strokeDashoffset = 100 - score * 10;
    });
  });
}

// Read FastAPI errors
function readError(data) {
  if (Array.isArray(data?.detail)) {
    return data.detail
      .map((d) => {
        const field = d.loc?.[d.loc.length - 1] || "field";
        return `${field}: ${d.msg}`;
      })
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
    "DailyUnlocks",
    "Daily_Unlocks",
    "Study_Hours",
    "Physical_Activity_Hours",
    "Sleep_Hours_Per_Night",
  ];

  const payload = {};

  for (const [key, value] of fd.entries()) {
    payload[key] = numbers.includes(key)
      ? Number(value)
      : value.trim();
  }

  console.log("Sending payload:", payload);

  btn.disabled = true;
  show("loading");

  try {

    // IMPORTANT: /predict is the FastAPI POST endpoint
    const res = await fetch(`${API_URL}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    console.log("Response status:", res.status);

    // Read response as text first
    // This prevents "Unexpected end of JSON input"
    const text = await res.text();

    console.log("Raw server response:", text);

    let data = {};

    if (text) {
      try {
        data = JSON.parse(text);
      } catch (jsonError) {
        throw new Error(
          `Server returned invalid JSON: ${text}`
        );
      }
    }

    if (!res.ok) {
      throw new Error(readError(data));
    }

    if (data.predicted_mental_health === undefined) {
      throw new Error("Server did not return a mental health score.");
    }

    showScore(data.predicted_mental_health);

  } catch (err) {

    console.error("Prediction error:", err);

    const offline = err instanceof TypeError;

    document.getElementById("error-text").textContent =
      offline
        ? "Can't reach the server. Check the FastAPI backend."
        : err.message;

    show("error");

  } finally {
    btn.disabled = false;
  }
});