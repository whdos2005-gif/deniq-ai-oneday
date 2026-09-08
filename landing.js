import { canSubmitLive } from "./readiness.js";

const FALLBACK_HERO_IMAGE = "./assets/deniq-editorial-web.jpg";

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function text(selector, value) {
  const node = document.querySelector(selector);
  if (node && value !== null && value !== undefined && String(value).trim()) node.textContent = String(value).trim();
}

export function formatPrice(value) {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? `${Math.round(price).toLocaleString("ko-KR")}원` : "수업료 안내 예정";
}

export function formatSchedule(operations = {}) {
  if (!operations.date || !String(operations.date).trim()) return "일정 안내 예정";
  const time = [operations.startTime, operations.endTime].filter((value) => value && String(value).trim()).join("–");
  return [String(operations.date).trim(), time].filter(Boolean).join(" · ");
}

function renderAudience(items = []) {
  if (!items.length) return;
  document.querySelector("[data-audience-list]").innerHTML = items.map((item, index) => `
    <li><span>${String(index + 1).padStart(2, "0")}</span><p>${escapeHTML(item)}</p></li>`).join("");
}

function renderOutcomes(items = []) {
  document.querySelector("[data-outcomes]").innerHTML = items.map((item, index) => `
    <article><span>${String(index + 1).padStart(2, "0")}</span><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.body)}</p></article>`).join("");
}

function renderTeachingMethod(items = []) {
  if (!items.length) return;
  document.querySelector("[data-teaching-method]").innerHTML = items.map((item, index) => `
    <article><span>${String(index + 1).padStart(2, "0")}</span><div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.body)}</p>${item.example ? `<p class="method-example">예시 · ${escapeHTML(item.example)}</p>` : ""}</div></article>`).join("");
}

function renderRequestExample(example = {}) {
  text("[data-request-before]", example.before);
  text("[data-request-after]", example.after);
  text("[data-request-explanation]", example.explanation);
}

function renderJourney(items = []) {
  document.querySelector("[data-journey]").innerHTML = items.map((item, index) => {
    const activities = Array.isArray(item.activities) ? item.activities : [];
    return `<article class="journey-step">
      <div class="journey-number">${String(index + 1).padStart(2, "0")}</div>
      <div class="journey-summary"><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.body)}</p></div>
      <div class="journey-activities"><h4>직접 하는 일</h4><ul>${activities.map((activity) => `<li>${escapeHTML(activity)}</li>`).join("")}</ul></div>
      <div class="journey-result"><h4>이 단계에서 남는 것</h4><p>${escapeHTML(item.result)}</p></div>
    </article>${index === 2 && items.length > 3 ? `
      <aside class="journey-interlude" id="practice-break" aria-label="첫 제작을 시작하기 전에">
        <figure class="listening-photo editorial-photo">
          <img src="./assets/photo-listening-v1.jpg" alt="설명을 들으며 집중하는 사람의 뒷모습" width="1200" height="1200" loading="lazy" decoding="async">
        </figure>
        <div class="journey-interlude-copy">
          <p class="section-label">이해에서 제작으로</p>
          <h3>이제, 내 손으로<br>만드는 시간.</h3>
          <p>무엇을 만들지 정했다면,<br>작은 화면 하나부터 시작합니다.<br>만들고, 확인하고, 다시 고치며.</p>
        </div>
      </aside>` : ""}`;
  }).join("");
}

function renderDeliverables(course) {
  const items = course.deliverables?.length ? course.deliverables : course.outcomes ?? [];
  document.querySelector("[data-deliverables]").innerHTML = items.map((item, index) => `
    <article><span>${String(index + 1).padStart(2, "0")}</span><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.body)}</p></article>`).join("");
}

function renderMaterialsVisuals(items = []) {
  document.querySelector("[data-materials-visuals]").innerHTML = items.map((item) => `
    <a class="material-preview" href="${escapeHTML(item.image)}" target="_blank" rel="noopener">
      <figure><img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.alt)}" loading="lazy" decoding="async"><figcaption><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.body)}</p><span>이미지 크게 보기 ↗</span></figcaption></figure>
    </a>`).join("");
}

function renderPreparation(items = []) {
  if (!items.length) return;
  document.querySelector("[data-preparation]").innerHTML = items.map((item) => `<li>${escapeHTML(item)}</li>`).join("");
}

function renderFaq(items = []) {
  document.querySelector("[data-faq]").innerHTML = items.map((item) => `
    <details><summary>${escapeHTML(item.question)}</summary><p>${escapeHTML(item.answer)}</p></details>`).join("");
}

function renderOperations(operations = {}) {
  text('[data-operation="schedule"]', formatSchedule(operations));
  text('[data-operation="venue"]', operations.venue || operations.venueHint || "장소 안내 예정");
  text('[data-operation="price"]', formatPrice(operations.priceKRW));
  text('[data-operation="capacity"]', operations.capacity || operations.capacityHint || "인원 안내 예정");

  text("[data-refund-policy]", operations.refundPolicy || "환불 기준 안내 예정");
  text("[data-refund-after]", operations.refundAfterDeadline || "");
}

export function renderLanding(course) {
  document.title = course.title;
  text(".hero h1", course.slogan);
  text("[data-hero-eyebrow]", course.hero?.eyebrow || course.title);
  text("[data-hero-lead]", course.hero?.lead || course.description);
  text("[data-hero-detail]", course.hero?.detail);

  const heroImage = document.querySelector("[data-hero-image]");
  const requestedImage = typeof course.hero?.image === "string" ? course.hero.image.trim() : "";
  heroImage.alt = course.hero?.imageAlt || "웹페이지를 함께 만드는 과정을 표현한 DENIQ 콘셉트 이미지";
  if (requestedImage) heroImage.src = requestedImage;
  heroImage.addEventListener("error", () => { heroImage.src = FALLBACK_HERO_IMAGE; }, { once: true });

  document.querySelectorAll("[data-course-cta]").forEach((node) => {
    const target = node.querySelector("span") || node;
    target.textContent = course.cta;
  });
  renderAudience(course.audience);
  renderOutcomes(course.outcomes ?? []);
  renderRequestExample(course.requestExample);
  renderTeachingMethod(course.teachingMethod ?? []);
  renderJourney(course.journey ?? []);
  renderDeliverables(course);
  renderMaterialsVisuals(course.materialsVisuals ?? []);
  renderPreparation(course.preparation);
  renderOperations(course.operations);
  renderFaq(course.faq ?? []);
  text("[data-application-status]", canSubmitLive(course)
    ? "사전 질문지 제출은 참가 확정이 아닙니다. 최종 안내를 확인해주세요."
    : "현재 사전 질문지는 검토용이며 실제 접수되지 않습니다.");
}

async function loadCourse() {
  try {
    const response = await fetch("./course.json", { cache: "no-store" });
    if (!response.ok) throw new Error("course.json unavailable");
    renderLanding(await response.json());
  } catch (error) {
    console.error("Course configuration unavailable", error);
    document.querySelector("[data-config-alert]").hidden = false;
  }
}

if (typeof document !== "undefined") loadCourse();
