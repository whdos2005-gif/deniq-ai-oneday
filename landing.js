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

function headingText(value) {
  return escapeHTML(String(value ?? "").trim().replace(/[.。]+$/, ""));
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
    <article><span>${String(index + 1).padStart(2, "0")}</span><h3>${headingText(item.title)}</h3><p>${escapeHTML(item.body)}</p></article>`).join("");
}

function renderTeachingMethod(items = []) {
  if (!items.length) return;
  document.querySelector("[data-teaching-method]").innerHTML = items.map((item, index) => `
    <article><span>${String(index + 1).padStart(2, "0")}</span><div><h3>${headingText(item.title)}</h3><p>${escapeHTML(item.body)}</p>${item.example ? `<p class="method-example">예시 · ${escapeHTML(item.example)}</p>` : ""}</div></article>`).join("");
}

function renderRequestExample(example = {}) {
  text("[data-request-before]", example.before);
  text("[data-request-after]", example.after);
  text("[data-request-explanation]", example.explanation);
}

function renderJourney(items = []) {
  const phases = ["이해·기획", "이해·기획", "준비", "제작·수정", "제작·수정", "저장·공유", "저장·공유"];
  document.querySelector("[data-journey]").innerHTML = items.map((item, index) => {
    const activities = Array.isArray(item.activities) ? item.activities : [];
    const number = String(index + 1).padStart(2, "0");
    return `<details class="journey-step" id="journey-${number}">
      <summary class="journey-summary">
        <h3><span class="journey-number">${number}</span>
        <span class="journey-summary-copy"><span class="journey-phase">${phases[index] || "실습"}</span><span class="journey-title">${headingText(item.title)}</span></span>
        <span class="journey-toggle" aria-hidden="true">+</span></h3>
      </summary>
      <div class="journey-content">
        <p class="journey-description">${escapeHTML(item.body)}</p>
        <div class="journey-activities"><h4>직접 하는 일</h4><ul>${activities.map((activity) => `<li>${escapeHTML(activity)}</li>`).join("")}</ul></div>
        <div class="journey-result"><h4>이 단계에서 남는 것</h4><p>${escapeHTML(item.result)}</p></div>
      </div>
    </details>`;
  }).join("");
}
function renderDeliverables(course) {
  const items = course.deliverables?.length ? course.deliverables : course.outcomes ?? [];
  const symbols = [
    '<rect x="18" y="12" width="84" height="52" rx="3"/><path d="M46 76h28M60 64v12M30 27h24M30 39h40"/><circle cx="86" cy="46" r="9"/><path d="m82 46 3 3 5-6"/>',
    '<path d="M36 10h40l14 14v53H36zM76 10v16h14M25 22H17v55h9M46 42h29M46 53h29M46 64h18"/>',
    '<rect x="10" y="25" width="32" height="38" rx="3"/><path d="M17 35h18M17 45h13M42 44h16"/><rect x="76" y="25" width="32" height="38" rx="3"/><path d="M84 35h16M84 45h11M64 39l-6 5 6 5M69 44h7"/>',
    '<path d="M60 22c-12-9-27-11-44-7v54c17-4 32-2 44 7 12-9 27-11 44-7V15c-17-4-32-2-44 7ZM60 22v54M27 29l20 4M27 42l20 4M74 33l18-4M74 46l18-4"/>'
  ];
  const labels = ["내 계정", "제작 파일", "저장·공유", "수업 교재"];
  document.querySelector("[data-deliverables]").innerHTML = items.map((item, index) => `
    <article class="deliverable-card">
      <span class="deliverable-number">${String(index + 1).padStart(2, "0")}</span>
      <div class="deliverable-symbol" aria-hidden="true"><svg viewBox="0 0 120 88" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${symbols[index] || symbols[1]}</svg><span>${labels[index] || "결과물"}</span></div>
      <h3>${headingText(item.title)}</h3><p>${escapeHTML(item.body)}</p>
      ${index === 3 ? '<a class="deliverable-materials-link" href="#materials">실제 교재 보기 ↓</a>' : ""}
    </article>`).join("");
}
function renderMaterialsVisuals(items = []) {
  document.querySelector("[data-materials-visuals]").innerHTML = items.map((item) => `
    <a class="material-preview" href="${escapeHTML(item.image)}" target="_blank" rel="noopener">
      <figure><img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.alt)}" loading="lazy" decoding="async"><figcaption><h3>${headingText(item.title)}</h3><p>${escapeHTML(item.body)}</p><span>이미지 크게 보기 ↗</span></figcaption></figure>
    </a>`).join("");
}

function renderPreparation(items = []) {
  if (!items.length) return;
  document.querySelector("[data-preparation]").innerHTML = items.map((item) => `<li>${escapeHTML(item)}</li>`).join("");
}

function renderFaq(items = []) {
  document.querySelector("[data-faq]").innerHTML = items.map((item) => `
    <details class="faq-item${item.highlight === true ? " faq-highlight" : ""}"><summary><span class="faq-marker" aria-hidden="true">Q</span><span class="faq-question">${escapeHTML(item.question)}</span></summary><p>${escapeHTML(item.answer)}</p></details>`).join("");
}

function renderInstructor(instructor = {}) {
  text("[data-instructor-name]", instructor.name);
  text("[data-instructor-role]", instructor.role);
  text("[data-instructor-quote]", instructor.quote);
  text("[data-instructor-summary]", instructor.summary);
  const credits = Array.isArray(instructor.credits) ? instructor.credits : [];
  if (credits.length) {
    document.querySelector("[data-instructor-credits]").innerHTML = credits.map((credit, index) => `
      <li><span class="instructor-credit-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span><p class="instructor-credit-line"><strong class="instructor-credit-title">${escapeHTML(credit.title)}</strong><span aria-hidden="true"> · </span><span class="instructor-credit-detail">${escapeHTML(credit.detail)}</span></p></li>`).join("");
  }
}

function renderOperations(operations = {}) {
  text('[data-operation="schedule"]', formatSchedule(operations));
  text('[data-operation="venue"]', (operations.venue || operations.venueHint || "장소 안내 예정").replace(/\s+도보\s+/, '\n도보 '));
  text('[data-operation="price"]', formatPrice(operations.priceKRW));
  text('[data-operation="capacity"]', operations.capacity || operations.capacityHint || "인원 안내 예정");

  document.querySelectorAll('[data-payment-amount]').forEach(node => { node.textContent = formatPrice(operations.priceKRW); });

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
  document.querySelectorAll('.curriculum-overview a[href^="#journey-"]').forEach((link) => {
    link.addEventListener('click', () => {
      const step = document.getElementById(link.hash.slice(1));
      if (step?.matches('details.journey-step')) step.open = true;
    });
  });
  renderDeliverables(course);
  renderMaterialsVisuals(course.materialsVisuals ?? []);
  renderInstructor(course.instructor);
  renderPreparation(course.preparation);
  renderOperations(course.operations);
  if (!canSubmitLive(course)) {
    text('.depositor-guide','사전 질문지의 실제 접수 연결을 준비하고 있습니다. 접수가 열리면 질문지 작성 후 입금해주세요.');
    document.querySelectorAll('[data-course-cta]').forEach(node=>{(node.querySelector('span')||node).textContent='사전 질문지 미리보기';});
  }
  renderFaq(course.faq ?? []);
  text("[data-application-status]", canSubmitLive(course)
    ? "질문지 제출 후 입금해주세요. 입금 확인 후 안내 문자를 보내드립니다."
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
