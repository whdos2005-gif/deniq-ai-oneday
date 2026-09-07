import { canSubmitLive } from "./readiness.js";

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function operationText(operations, key, fallback) {
  const direct = operations?.[key];
  const hint = operations?.[`${key}Hint`];
  if (direct !== null && direct !== undefined && String(direct).trim()) return String(direct);
  if (hint) return String(hint);
  return fallback;
}

function renderCourse(course) {
  document.title = course.title;
  document.querySelector(".hero h1").textContent = course.slogan;
  document.querySelector("[data-course-description]").textContent = course.description;
  document.querySelectorAll("[data-course-cta]").forEach((node) => {
    const textTarget = node.matches(".apply-survey") ? node.querySelector("strong") : node;
    textTarget.textContent = course.cta;
  });

  const operations = course.operations ?? {};
  const date = operationText(operations, "date", "일정 안내 예정");
  const time = operations.startTime && operations.endTime
    ? `${operations.startTime}–${operations.endTime}`
    : "";
  document.querySelector('[data-operation="date"]').textContent = [date, time].filter(Boolean).join(" · ");
  document.querySelector('[data-operation="venue"]').textContent = operationText(operations, "venue", "장소 안내 예정");
  document.querySelector('[data-operation="capacity"]').textContent = operationText(operations, "capacity", "소규모 수업 예정");

  document.querySelector("[data-audience-list]").innerHTML = course.audience.map((item, index) => `
    <article><span>${String(index + 1).padStart(2, "0")}</span><h3>${escapeHTML(item)}</h3></article>
  `).join("");

  document.querySelector("[data-outcomes]").innerHTML = course.outcomes.map((item, index) => `
    <article>
      <span>${String(index + 1).padStart(2, "0")}</span>
      <h3>${escapeHTML(item.title)}</h3>
      <p>${escapeHTML(item.body)}</p>
    </article>
  `).join("");

  document.querySelector("[data-journey]").innerHTML = course.journey.map((item, index) => `
    <article>
      <div class="journey-label" data-index="${String(index + 1).padStart(2, "0")}"><span>STEP ${String(index + 1).padStart(2, "0")}</span></div>
      <div class="journey-copy"><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.body)}</p></div>
      <div class="journey-result"><span>RESULT</span><strong>${escapeHTML(item.result)}</strong></div>
    </article>
  `).join("");

  document.querySelector("[data-preparation]").innerHTML = course.preparation
    .map((item) => `<li>${escapeHTML(item)}</li>`)
    .join("");

  document.querySelector("[data-faq]").innerHTML = course.faq.map((item) => `
    <details>
      <summary>${escapeHTML(item.question)}</summary>
      <p>${escapeHTML(item.answer)}</p>
    </details>
  `).join("");

  const liveReady = canSubmitLive(course);
  const reviewChip = document.querySelector("[data-review-chip]");
  reviewChip.hidden = liveReady;
  document.querySelector("[data-application-status]").textContent = liveReady
    ? "질문지는 수업 준비를 위한 자료이며, 제출만으로 참가나 결제가 확정되지 않습니다."
    : "현재는 실제 접수가 아닌 검토용 화면입니다. 입력 내용은 서버로 전송되지 않습니다.";
}

async function loadCourse() {
  try {
    const response = await fetch("./course.json", { cache: "no-store" });
    if (!response.ok) throw new Error("course.json을 불러오지 못했습니다.");
    renderCourse(await response.json());
  } catch (error) {
    console.error("Course configuration unavailable", error);
    document.querySelector("[data-review-chip]").textContent = "수업 정보 확인 중 · 신청/결제 아님";
  }
}

loadCourse();
