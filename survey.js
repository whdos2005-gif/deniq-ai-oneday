import { canSubmitLive } from "./readiness.js";
export { canSubmitLive } from "./readiness.js";

const EXPERIENCE_VALUES = new Set(["never", "tried", "regular"]);
const GOAL_VALUES = new Set(["understand", "use", "create", "solve", "unsure", "other"]);
const SUBMISSION_ID_KEY = "deniq.oneday.submissionId";

export const SURVEY_SCHEMA_VERSION = "deniq-oneday-survey/v2";
export const AI_TOOL_VALUES = Object.freeze(["none", "chatgpt", "claude", "gemini", "other"]);
export const AI_TASK_VALUES = Object.freeze(["conversation-writing", "image-video", "web-coding", "agent-automation"]);

const AI_TOOL_SET = new Set(AI_TOOL_VALUES);
const AI_TASK_SET = new Set(AI_TASK_VALUES);
const DEFAULT_AI_TOOL_OPTIONS = Object.freeze([
  { value: "none", label: "처음이에요" },
  { value: "chatgpt", label: "ChatGPT" },
  { value: "claude", label: "Claude" },
  { value: "gemini", label: "Gemini" },
  { value: "other", label: "기타 도구" },
]);
const DEFAULT_AI_TASK_OPTIONS = Object.freeze([
  { value: "conversation-writing", label: "대화하거나 글쓰기" },
  { value: "image-video", label: "이미지·영상 만들기" },
  { value: "web-coding", label: "웹페이지·코딩" },
  { value: "agent-automation", label: "에이전트·자동화" },
]);

export const SURVEY_FIELDS = ["name", "age", "occupation", "aiExperience", "learningGoals"];

function isV2Response(values) {
  return values?.surveyVersion === SURVEY_SCHEMA_VERSION
    || Array.isArray(values?.aiTools)
    || Array.isArray(values?.aiTasks);
}

function normalizedSelection(value, allowedValues) {
  if (!Array.isArray(value)) return [];
  const selected = new Set(value.filter((item) => allowedValues.includes(item)));
  return allowedValues.filter((item) => selected.has(item));
}

export function normalizedSurveyResponse(values) {
  const goals = normalizedSelection(values.learningGoals, [...GOAL_VALUES]);
  const common = {
    name: String(values.name ?? "").trim(),
    age: Number(values.age),
    occupation: String(values.occupation ?? "").trim(),
    learningGoals: goals,
    learningGoalOther: goals.includes("other") ? String(values.learningGoalOther ?? "").trim() : "",
    consent: values.consent === true,
  };

  if (!isV2Response(values)) {
    return { ...common, aiExperience: String(values.aiExperience ?? "") };
  }

  const aiTools = normalizedSelection(values.aiTools, AI_TOOL_VALUES);
  return {
    surveyVersion: SURVEY_SCHEMA_VERSION,
    name: common.name,
    age: common.age,
    occupation: common.occupation,
    aiTools,
    aiToolOther: aiTools.includes("other") ? String(values.aiToolOther ?? "").trim() : "",
    aiTasks: aiTools.includes("none") ? [] : normalizedSelection(values.aiTasks, AI_TASK_VALUES),
    learningGoals: common.learningGoals,
    learningGoalOther: common.learningGoalOther,
    consent: common.consent,
  };
}

export function validateSurvey(values) {
  const normalized = normalizedSurveyResponse(values);
  const fieldErrors = {};
  if (normalized.name.length < 1 || normalized.name.length > 50) {
    fieldErrors.name = "이름은 1~50자로 입력해 주세요.";
  }
  if (!Number.isInteger(normalized.age) || normalized.age < 1 || normalized.age > 120) {
    fieldErrors.age = "나이는 1~120 사이의 숫자로 입력해 주세요.";
  }
  if (normalized.occupation.length < 1 || normalized.occupation.length > 80) {
    fieldErrors.occupation = "현재 하는 일은 1~80자로 입력해 주세요.";
  }
  if (isV2Response(values)) {
    const rawTools = Array.isArray(values.aiTools) ? values.aiTools : [];
    const rawTasks = Array.isArray(values.aiTasks) ? values.aiTasks : [];
    const toolsHaveUnknown = rawTools.some((value) => !AI_TOOL_SET.has(value));
    const tasksHaveUnknown = rawTasks.some((value) => !AI_TASK_SET.has(value));
    const toolsHaveDuplicates = new Set(rawTools).size !== rawTools.length;
    const tasksHaveDuplicates = new Set(rawTasks).size !== rawTasks.length;

    if (values.surveyVersion !== SURVEY_SCHEMA_VERSION) {
      fieldErrors.aiExperience = "설문 버전을 확인해 주세요.";
    } else if (rawTools.length < 1 || toolsHaveUnknown || toolsHaveDuplicates) {
      fieldErrors.aiExperience = "사용해 본 AI 도구를 선택해 주세요.";
    } else if (rawTools.includes("none") && rawTools.length > 1) {
      fieldErrors.aiExperience = "처음이에요는 다른 도구와 함께 선택할 수 없습니다.";
    } else if (normalized.aiTools.includes("other") && (normalized.aiToolOther.length < 1 || normalized.aiToolOther.length > 80)) {
      fieldErrors.aiExperience = "기타 도구 이름을 80자 이하로 입력해 주세요.";
      fieldErrors.aiToolOther = fieldErrors.aiExperience;
    } else if (!normalized.aiTools.includes("none") && (rawTasks.length < 1 || tasksHaveUnknown || tasksHaveDuplicates)) {
      fieldErrors.aiExperience = "AI로 직접 해본 작업을 하나 이상 선택해 주세요.";
      fieldErrors.aiTasks = fieldErrors.aiExperience;
    } else if (normalized.aiTools.includes("none") && rawTasks.length > 0) {
      fieldErrors.aiExperience = "처음이에요를 선택하면 해본 작업은 비워 주세요.";
      fieldErrors.aiTasks = fieldErrors.aiExperience;
    }
  } else if (!EXPERIENCE_VALUES.has(normalized.aiExperience)) {
    fieldErrors.aiExperience = "AI 사용 경험을 하나 선택해 주세요.";
  }
  const rawGoals = Array.isArray(values.learningGoals) ? values.learningGoals : [];
  if (normalized.learningGoals.length < 1 || normalized.learningGoals.length > 3) {
    fieldErrors.learningGoals = "배우고 싶은 내용을 1~3개 선택해 주세요.";
  } else if (rawGoals.some((value) => !GOAL_VALUES.has(value)) || new Set(rawGoals).size !== rawGoals.length) {
    fieldErrors.learningGoals = "배우고 싶은 내용의 선택값을 확인해 주세요.";
  }
  if (normalized.learningGoals.includes("other") && (normalized.learningGoalOther.length < 1 || normalized.learningGoalOther.length > 300)) {
    fieldErrors.learningGoalOther = "직접 적기는 1~300자로 입력해 주세요.";
  }
  if (!normalized.consent) {
    fieldErrors.consent = "개인정보 수집·이용 안내에 동의해야 제출할 수 있습니다.";
  }
  return fieldErrors;
}

export function responseFingerprint(values) {
  return JSON.stringify(normalizedSurveyResponse(values));
}

export function summarizeAIExperience(values, toolOptions = DEFAULT_AI_TOOL_OPTIONS, taskOptions = DEFAULT_AI_TASK_OPTIONS) {
  const normalized = normalizedSurveyResponse(values);
  if (!("aiTools" in normalized)) return normalized.aiExperience;
  if (normalized.aiTools.includes("none")) return "사용 도구: 처음이에요\n해본 작업: 아직 없음";

  const label = (options, value) => options.find((option) => option.value === value)?.label ?? value;
  const tools = normalized.aiTools.map((value) => (
    value === "other" ? `기타 도구 (${normalized.aiToolOther})` : label(toolOptions, value)
  ));
  const tasks = normalized.aiTasks.map((value) => label(taskOptions, value));
  return `사용 도구: ${tools.join(" · ")}\n해본 작업: ${tasks.join(" · ")}`;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createSubmissionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function safeSessionGet() {
  try { return sessionStorage.getItem(SUBMISSION_ID_KEY); } catch { return null; }
}

function safeSessionSet(value) {
  try { sessionStorage.setItem(SUBMISSION_ID_KEY, value); } catch { /* In-memory retry still works. */ }
}

function safeSessionRemove() {
  try { sessionStorage.removeItem(SUBMISSION_ID_KEY); } catch { /* Nothing to clear. */ }
}

class SurveyApp {
  constructor(root, actions, liveStatus) {
    this.root = root;
    this.actions = actions;
    this.liveStatus = liveStatus;
    this.course = null;
    this.step = -1;
    this.values = {
      surveyVersion: SURVEY_SCHEMA_VERSION,
      name: "",
      age: "",
      occupation: "",
      aiTools: [],
      aiToolOther: "",
      aiTasks: [],
      learningGoals: [],
      learningGoalOther: "",
      consent: false,
    };
    this.submissionId = safeSessionGet();
    this.lastAttemptFingerprint = null;
    this.result = null;
  }

  async init() {
    try {
      const response = await fetch("./course.json", { cache: "no-store" });
      if (!response.ok) throw new Error("course.json을 불러오지 못했습니다.");
      this.course = await response.json();
      document.title = `${this.course.title} · 사전 질문지`;
      this.renderIntro();
    } catch (error) {
      console.error("Survey configuration unavailable", error);
      this.renderConfigError();
    }
  }

  renderIntro() {
    this.step = -1;
    this.setAIStep(false);
    this.setPreviewBadge(false);
    this.setProgress(false);
    this.actions.hidden = true;
    this.root.innerHTML = `
      <section class="intro-screen" aria-labelledby="intro-title">
        <span class="intro-index" aria-hidden="true">05</span>
        <p class="eyebrow">${canSubmitLive(this.course) ? "PRE-CLASS QUESTIONS" : "REVIEW PREVIEW"}</p>
        <h1 class="intro-title" id="intro-title">${escapeHTML(this.course.survey.title)}</h1>
        <p class="intro-manifesto"><strong>질문이 제작이 되는 경험.</strong><br>${escapeHTML(this.course.survey.intro)}</p>
        <div class="intro-facts" aria-label="질문지 안내">
          <span><b>05</b>QUESTIONS</span><span><b>03</b>MINUTES</span><span><b>01</b>PREVIEW</span>
        </div>
        <p class="intro-copy">SNS 계정·휴대전화·이메일은 묻지 않습니다. 입력한 내용은 이 브라우저에 저장하지 않습니다.</p>
        <p class="privacy-copy">사전 질문지는 수업 준비를 위한 자료이며, 제출만으로 참가나 결제가 확정되지 않습니다.</p>
        <button class="intro-start" type="button" data-start><span>다섯 가지 질문 시작하기</span><b aria-hidden="true">→</b></button>
        <p class="intro-foot">BEGIN · ASK · JUDGE · REVISE · APPLY</p>
      </section>`;
    this.root.querySelector("[data-start]").addEventListener("click", () => {
      this.step = 0;
      this.renderQuestion();
    });
    this.focusScreen();
  }

  renderQuestion() {
    const renderers = [
      () => this.renderTextQuestion("name", "이름을 알려주세요.", "질문지 확인에 사용할 이름", "이름", 50),
      () => this.renderAgeQuestion(),
      () => this.renderTextQuestion("occupation", "지금 어떤 일을 하고 있나요?", "현재 역할을 가장 잘 나타내는 말로 적어주세요.", "예: 브랜드 디자이너, 마케팅 담당자, 외식업 경영자", 80),
      () => this.renderExperienceQuestion(),
      () => this.renderGoalsQuestion(),
    ];
    this.setAIStep(this.step === 3);
    this.setPreviewBadge(false);
    this.setProgress(true);
    this.root.innerHTML = renderers[this.step]();
    this.bindQuestionInput();
    this.renderQuestionActions();
    this.focusScreen();
  }

  questionShell(title, help, body, { compact = false } = {}) {
    return `
      <section class="question-screen${compact ? " question-screen--ai" : ""}" aria-labelledby="question-title">
        <span class="question-index" aria-hidden="true">${String(this.step + 1).padStart(2, "0")}</span>
        <p class="eyebrow">QUESTION ${String(this.step + 1).padStart(2, "0")}</p>
        <p class="section-label">5개 중 ${this.step + 1}번째 · 필수</p>
        <h1 class="question-title" id="question-title">${escapeHTML(title)}</h1>
        <p class="question-help">${escapeHTML(help)}</p>
        <div class="answer-area">${body}</div>
      </section>`;
  }

  renderTextQuestion(field, title, help, placeholder, maxlength) {
    const value = escapeHTML(this.values[field]);
    return this.questionShell(title, help, `
      <label class="field-label" for="${field}">${title}</label>
      <input id="${field}" name="${field}" type="text" value="${value}" maxlength="${maxlength}" autocomplete="${field === "name" ? "name" : "organization-title"}" placeholder="${escapeHTML(placeholder)}">
      <div class="field-meta"><span data-count>${String(this.values[field]).length} / ${maxlength}</span></div>
      <p class="field-error" id="${field}-error" data-error hidden></p>`);
  }

  renderAgeQuestion() {
    return this.questionShell("나이를 알려주세요.", "수업 설명의 난이도와 예시를 준비하는 데 참고합니다.", `
      <label class="field-label" for="age">나이</label>
      <input id="age" name="age" type="number" value="${escapeHTML(this.values.age)}" min="1" max="120" step="1" inputmode="numeric" autocomplete="off" placeholder="예: 31">
      <p class="field-error" id="age-error" data-error hidden></p>`);
  }

  renderExperienceQuestion() {
    const toolOptions = this.experienceOptions("aiToolOptions", DEFAULT_AI_TOOL_OPTIONS, AI_TOOL_VALUES);
    const taskOptions = this.experienceOptions("aiTaskOptions", DEFAULT_AI_TASK_OPTIONS, AI_TASK_VALUES);
    const hasExperience = this.values.aiTools.some((value) => value !== "none");
    const body = `
      <div class="experience-group">
        <div class="group-heading"><h2>사용해 본 도구</h2><span>복수 선택</span></div>
        <fieldset class="option-list compact-options"><legend class="sr-only">사용해 본 AI 도구</legend>${toolOptions.map((option, index) => this.optionHTML({
      type: "checkbox",
      name: "aiTools",
      value: option.value,
      label: option.label,
      checked: this.values.aiTools.includes(option.value),
      index,
    })).join("")}</fieldset>
        <div class="other-field compact-other" data-ai-tool-other ${this.values.aiTools.includes("other") ? "" : "hidden"}>
          <label class="field-label" for="aiToolOther">기타 도구 이름</label>
          <input id="aiToolOther" name="aiToolOther" type="text" maxlength="80" value="${escapeHTML(this.values.aiToolOther)}" placeholder="예: Perplexity">
        </div>
      </div>
      <div class="experience-group task-group" data-ai-task-group ${hasExperience ? "" : "hidden"}>
        <div class="group-heading"><h2>AI로 직접 해본 작업</h2><span>해당 항목 모두</span></div>
        <fieldset class="option-list compact-options"><legend class="sr-only">AI로 직접 해본 작업</legend>${taskOptions.map((option, index) => this.optionHTML({
      type: "checkbox",
      name: "aiTasks",
      value: option.value,
      label: option.label,
      checked: this.values.aiTasks.includes(option.value),
      index,
    })).join("")}</fieldset>
      </div>
      <p class="field-error" id="aiExperience-error" data-error hidden></p>`;
    return this.questionShell("AI를 어떻게 사용해 봤나요?", "써본 도구와 해본 작업을 모두 골라주세요.", body, { compact: true });
  }

  experienceOptions(configKey, fallback, allowedValues) {
    const configured = this.course?.survey?.[configKey];
    if (!Array.isArray(configured)) return fallback;
    const byValue = new Map(configured
      .filter((option) => option && allowedValues.includes(option.value) && typeof option.label === "string")
      .map((option) => [option.value, { value: option.value, label: option.label }]));
    return fallback.map((option) => byValue.get(option.value) ?? option);
  }

  renderGoalsQuestion() {
    const options = this.course.survey.learningGoalOptions;
    const selected = this.values.learningGoals;
    const body = `
      <div class="selection-count"><span>배우고 싶은 내용을 선택하세요.</span><b data-selection-count>${selected.length} / 3</b></div>
      <fieldset class="option-list"><legend class="sr-only">배우고 싶은 내용</legend>${options.map((option, index) => this.optionHTML({
        type: "checkbox",
        name: "learningGoals",
        value: option.value,
        label: option.label,
        checked: selected.includes(option.value),
        disabled: selected.length >= 3 && !selected.includes(option.value),
        index,
      })).join("")}</fieldset>
      <div class="other-field" data-other-field ${selected.includes("other") ? "" : "hidden"}>
        <label class="field-label" for="learningGoalOther">직접 적기</label>
        <textarea id="learningGoalOther" name="learningGoalOther" maxlength="300" placeholder="배워보고 싶은 내용을 적어주세요.">${escapeHTML(this.values.learningGoalOther)}</textarea>
        <p class="char-count"><span data-other-count>${this.values.learningGoalOther.length}</span> / 300</p>
      </div>
      <p class="field-error" id="learningGoals-error" data-error hidden></p>`;
    return this.questionShell("무엇을 배워보고 싶나요?", "가장 중요한 항목을 1~3개 선택해 주세요.", body);
  }

  optionHTML({ type, name, value, label, checked, disabled = false, index }) {
    return `<label class="option${checked ? " selected" : ""}${disabled ? " is-locked" : ""}">
      <input type="${type}" name="${name}" value="${escapeHTML(value)}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}>
      <span class="option-index">${String(index + 1).padStart(2, "0")}</span>
      <span class="option-label">${escapeHTML(label)}</span>
      <span class="option-check" aria-hidden="true">✓</span>
    </label>`;
  }

  bindQuestionInput() {
    const textInput = this.root.querySelector('input[type="text"], input[type="number"]');
    if (textInput) {
      textInput.addEventListener("input", (event) => {
        this.updateValue(event.target.name, event.target.value);
        const counter = this.root.querySelector("[data-count]");
        if (counter) counter.textContent = `${event.target.value.length} / ${event.target.maxLength}`;
        this.clearVisibleError();
      });
    }

    this.root.querySelectorAll('input[type="checkbox"][name="aiTools"]').forEach((input) => {
      input.addEventListener("change", (event) => {
        const selected = new Set(this.values.aiTools);
        if (event.target.value === "none" && event.target.checked) {
          selected.clear();
          selected.add("none");
        } else {
          selected.delete("none");
          event.target.checked ? selected.add(event.target.value) : selected.delete(event.target.value);
        }
        this.updateValue("aiTools", AI_TOOL_VALUES.filter((value) => selected.has(value)));
        if (this.values.aiTools.includes("none")) {
          this.updateValue("aiTasks", []);
          this.updateValue("aiToolOther", "");
        }
        this.updateExperienceControls();
        this.clearVisibleError();
      });
    });

    this.root.querySelectorAll('input[type="checkbox"][name="aiTasks"]').forEach((input) => {
      input.addEventListener("change", (event) => {
        const selected = new Set(this.values.aiTasks);
        event.target.checked ? selected.add(event.target.value) : selected.delete(event.target.value);
        this.updateValue("aiTasks", AI_TASK_VALUES.filter((value) => selected.has(value)));
        this.updateOptionStyles();
        this.clearVisibleError();
      });
    });

    const aiToolOther = this.root.querySelector("#aiToolOther");
    if (aiToolOther) {
      aiToolOther.addEventListener("input", (event) => {
        this.updateValue("aiToolOther", event.target.value);
        this.clearVisibleError();
      });
    }

    this.root.querySelectorAll('input[type="checkbox"][name="learningGoals"]').forEach((input) => {
      input.addEventListener("change", (event) => {
        const selected = new Set(this.values.learningGoals);
        event.target.checked ? selected.add(event.target.value) : selected.delete(event.target.value);
        this.updateValue("learningGoals", [...selected]);
        this.updateGoalControls();
        this.clearVisibleError();
      });
    });

    const other = this.root.querySelector("#learningGoalOther");
    if (other) {
      other.addEventListener("input", (event) => {
        this.updateValue("learningGoalOther", event.target.value);
        this.root.querySelector("[data-other-count]").textContent = event.target.value.length;
        this.clearVisibleError();
      });
    }
  }

  updateValue(field, value) {
    this.values[field] = value;
    if (this.lastAttemptFingerprint && responseFingerprint(this.values) !== this.lastAttemptFingerprint) {
      this.submissionId = null;
      this.lastAttemptFingerprint = null;
      safeSessionRemove();
    }
  }

  updateOptionStyles() {
    this.root.querySelectorAll(".option").forEach((label) => {
      label.classList.toggle("selected", label.querySelector("input").checked);
    });
  }

  updateExperienceControls() {
    this.root.querySelectorAll('input[name="aiTools"]').forEach((input) => {
      input.checked = this.values.aiTools.includes(input.value);
    });
    this.root.querySelectorAll('input[name="aiTasks"]').forEach((input) => {
      input.checked = this.values.aiTasks.includes(input.value);
    });
    const hasExperience = this.values.aiTools.some((value) => value !== "none");
    const taskGroup = this.root.querySelector("[data-ai-task-group]");
    if (taskGroup) taskGroup.hidden = !hasExperience;
    const otherField = this.root.querySelector("[data-ai-tool-other]");
    if (otherField) otherField.hidden = !this.values.aiTools.includes("other");
    if (!this.values.aiTools.includes("other")) this.values.aiToolOther = "";
    if (!hasExperience) this.values.aiTasks = [];
    this.updateOptionStyles();
  }

  updateGoalControls() {
    const selected = this.values.learningGoals;
    this.root.querySelector("[data-selection-count]").textContent = `${selected.length} / 3`;
    this.root.querySelectorAll('input[name="learningGoals"]').forEach((input) => {
      const lock = selected.length >= 3 && !input.checked;
      input.disabled = lock;
      input.closest(".option").classList.toggle("is-locked", lock);
    });
    this.updateOptionStyles();
    const otherField = this.root.querySelector("[data-other-field]");
    otherField.hidden = !selected.includes("other");
    if (!selected.includes("other")) this.values.learningGoalOther = "";
  }

  renderQuestionActions() {
    this.actions.hidden = false;
    this.actions.className = "actions";
    this.actions.innerHTML = `<button type="button" data-back>이전</button><button class="primary" type="button" data-next>${this.step === 4 ? "내용 확인" : "다음"}</button>`;
    this.actions.querySelector("[data-back]").addEventListener("click", () => {
      if (this.step === 0) return this.renderIntro();
      this.step -= 1;
      this.renderQuestion();
    });
    this.actions.querySelector("[data-next]").addEventListener("click", () => this.next());
  }

  next() {
    const stepField = SURVEY_FIELDS[this.step];
    const errors = validateSurvey({ ...this.values, consent: true });
    const message = stepField === "learningGoals"
      ? errors.learningGoals ?? errors.learningGoalOther
      : errors[stepField];
    if (message) {
      const focusField = stepField === "aiExperience"
        ? errors.aiToolOther ? "aiToolOther" : errors.aiTasks ? "aiTasks" : "aiTools"
        : stepField === "learningGoals" ? "learningGoals" : stepField;
      return this.showVisibleError(message, focusField);
    }
    if (this.step < 4) {
      this.step += 1;
      this.renderQuestion();
    } else {
      this.step = 5;
      this.renderReview();
    }
  }

  renderReview() {
    this.setAIStep(false);
    this.setProgress(false);
    const toolOptions = this.experienceOptions("aiToolOptions", DEFAULT_AI_TOOL_OPTIONS, AI_TOOL_VALUES);
    const taskOptions = this.experienceOptions("aiTaskOptions", DEFAULT_AI_TASK_OPTIONS, AI_TASK_VALUES);
    const experience = summarizeAIExperience(this.values, toolOptions, taskOptions);
    const goals = this.values.learningGoals.map((value) => this.labelFor("learningGoals", value));
    if (this.values.learningGoals.includes("other")) goals.push(this.values.learningGoalOther);
    const items = [
      ["이름", this.values.name, 0],
      ["나이", `${this.values.age}세`, 1],
      ["현재 하는 일", this.values.occupation, 2],
      ["AI 사용 경험", experience, 3],
      ["배우고 싶은 내용", goals.join(" · "), 4],
    ];
    const privacy = this.course.privacy;
    const liveReady = canSubmitLive(this.course);
    this.setPreviewBadge(!liveReady, "미리보기 · 실제 접수되지 않습니다");
    this.root.innerHTML = `
      <section class="review-screen" aria-labelledby="review-title">
        <p class="eyebrow">REVIEW</p>
        <h1 id="review-title">입력한 내용을<br>확인해 주세요.</h1>
        <p class="review-intro">수정할 항목이 있으면 바로 돌아갈 수 있습니다.</p>
        <div class="review-list">${items.map(([label, value, step], index) => `
          <article class="review-item">
            <div class="review-heading"><span>${String(index + 1).padStart(2, "0")}</span><h2>${escapeHTML(label)}</h2></div>
            <p>${escapeHTML(value)}</p><button class="text-button" type="button" data-edit="${step}">수정</button>
          </article>`).join("")}</div>
        <div class="consent-box">
          <label class="consent-label"><input type="checkbox" name="consent" ${this.values.consent ? "checked" : ""}><span>개인정보 수집·이용 안내를 확인했으며 수업 준비를 위한 이용에 동의합니다.</span></label>
          <p class="privacy-note">목적: ${escapeHTML(privacy.purpose)}<br>${liveReady ? `관리자: ${escapeHTML(privacy.controller)} · 보관 기간: ${escapeHTML(privacy.retention)} · 문의: ${escapeHTML(privacy.contact)}` : "개인정보 처리 안내가 아직 확정되지 않아 실제 접수할 수 없습니다."}</p>
          <p class="field-error" id="consent-error" data-error hidden></p>
        </div>
      </section>`;
    this.root.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => {
      this.step = Number(button.dataset.edit);
      this.renderQuestion();
    }));
    this.root.querySelector('[name="consent"]').addEventListener("change", (event) => {
      this.updateValue("consent", event.target.checked);
      this.clearVisibleError();
    });
    this.actions.hidden = false;
    this.actions.className = "actions";
    this.actions.innerHTML = `<button type="button" data-back>이전</button><button class="primary" type="submit">${liveReady ? "질문지 제출하기" : "저장 없이 검토 결과 보기"}</button>`;
    this.actions.querySelector("[data-back]").addEventListener("click", () => {
      this.step = 4;
      this.renderQuestion();
    });
    this.focusScreen();
  }

  labelFor(field, value) {
    const options = field === "aiExperience"
      ? this.course.survey.aiExperienceOptions
      : this.course.survey.learningGoalOptions;
    return options.find((option) => option.value === value)?.label ?? value;
  }

  async submit() {
    if (this.step >= 0 && this.step <= 4) return this.next();
    if (this.step !== 5) return;
    const errors = validateSurvey(this.values);
    if (Object.keys(errors).length) {
      if (errors.consent && Object.keys(errors).length === 1) return this.showVisibleError(errors.consent, "consent");
      const firstField = SURVEY_FIELDS.find((field) => errors[field] || (field === "learningGoals" && errors.learningGoalOther));
      this.step = Math.max(0, SURVEY_FIELDS.indexOf(firstField));
      this.renderQuestion();
      const field = firstField === "aiExperience"
        ? errors.aiToolOther ? "aiToolOther" : errors.aiTasks ? "aiTasks" : "aiTools"
        : firstField === "learningGoals" ? "learningGoals" : firstField;
      return this.showVisibleError(errors[firstField] ?? errors.learningGoalOther, field);
    }

    if (!canSubmitLive(this.course)) {
      return this.renderResult({ type: "preview" });
    }

    const fingerprint = responseFingerprint(this.values);
    if (!this.submissionId) {
      this.submissionId = createSubmissionId();
      safeSessionSet(this.submissionId);
    }
    this.lastAttemptFingerprint = fingerprint;
    const payload = { ...normalizedSurveyResponse(this.values), submissionId: this.submissionId };
    this.renderSubmitting();

    try {
      const response = await fetch(this.course.survey.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        if (data?.code === "CONFLICT") {
          this.submissionId = null;
          safeSessionRemove();
        }
        if (data?.fieldErrors) Object.assign(errors, data.fieldErrors);
        throw new Error(data?.message || "질문지를 전송하지 못했습니다.");
      }
      if (!["ACCEPTED", "ALREADY_ACCEPTED"].includes(data.code)) throw new Error("알 수 없는 응답을 받았습니다.");
      this.renderResult({ type: "success", code: data.code, submissionId: data.submissionId });
    } catch (error) {
      this.renderResult({ type: "error", message: error.message || "잠시 후 다시 시도해 주세요." });
    }
  }

  renderSubmitting() {
    this.setAIStep(false);
    this.setPreviewBadge(false);
    this.setProgress(false);
    this.actions.hidden = true;
    this.root.innerHTML = `<section class="status-card" aria-labelledby="status-title"><p class="eyebrow">SENDING</p><div class="status-symbol" aria-hidden="true">···</div><h1 id="status-title">질문지를<br>전송하고 있습니다.</h1><p class="status-note">창을 닫지 말고 잠시 기다려 주세요.</p></section>`;
    this.announce("질문지를 전송하고 있습니다.");
    this.focusScreen();
  }

  renderResult(result) {
    this.result = result;
    this.step = 6;
    this.setAIStep(false);
    this.setPreviewBadge(false);
    this.setProgress(false);
    const copy = {
      preview: {
        eyebrow: "REVIEW COMPLETE",
        symbol: "",
        title: "미리보기를<br>마쳤습니다.",
        note: "실제 접수되지 않았습니다. 입력한 내용은 서버로 전송하거나 저장하지 않았습니다.",
      },
      success: {
        eyebrow: result.code === "ALREADY_ACCEPTED" ? "ALREADY RECEIVED" : "RECEIVED",
        symbol: "✓",
        title: result.code === "ALREADY_ACCEPTED" ? "이미 접수된<br>질문지입니다." : "질문지를<br>접수했습니다.",
        note: "사전 질문지는 수업 준비를 위한 자료입니다. 제출만으로 참가나 결제가 확정되지는 않습니다.",
      },
      error: {
        eyebrow: "TRY AGAIN",
        symbol: "!",
        title: "전송을<br>완료하지 못했습니다.",
        note: escapeHTML(result.message || "네트워크 상태를 확인한 뒤 다시 시도해 주세요."),
      },
    }[result.type];
    this.root.innerHTML = `
      <section class="status-card ${result.type}" aria-labelledby="status-title">
        <p class="eyebrow ${result.type === "error" || result.type === "preview" ? "warning" : ""}">${copy.eyebrow}</p>
        ${copy.symbol ? `<div class="status-symbol" aria-hidden="true">${copy.symbol}</div>` : ""}
        <h1 id="status-title">${copy.title}</h1>
        <p class="status-note">${copy.note}</p>
      </section>`;
    this.actions.hidden = false;
    if (result.type === "error") {
      this.actions.className = "actions";
      this.actions.innerHTML = `<button type="button" data-edit>내용 수정</button><button class="primary" type="button" data-retry>다시 시도</button>`;
      this.actions.querySelector("[data-edit]").addEventListener("click", () => { this.step = 5; this.renderReview(); });
      this.actions.querySelector("[data-retry]").addEventListener("click", () => { this.step = 5; this.submit(); });
    } else {
      this.actions.className = "actions one";
      this.actions.innerHTML = `<button class="primary" type="button" data-home>수업 소개로 돌아가기</button>`;
      this.actions.querySelector("[data-home]").addEventListener("click", () => { window.location.href = "./index.html"; });
    }
    this.announce(result.type === "preview" ? "미리보기를 마쳤습니다. 실제 접수되지 않았습니다." : result.type === "success" ? "질문지를 접수했습니다." : "전송을 완료하지 못했습니다. 다시 시도할 수 있습니다.");
    this.focusScreen();
  }

  renderConfigError() {
    this.setAIStep(false);
    this.setPreviewBadge(false);
    this.setProgress(false);
    this.actions.hidden = false;
    this.actions.className = "actions one";
    this.root.innerHTML = `<section class="status-card error" aria-labelledby="status-title"><p class="eyebrow warning">CONFIGURATION ERROR</p><div class="status-symbol" aria-hidden="true">!</div><h1 id="status-title">질문지를<br>열 수 없습니다.</h1><p class="status-note">수업 정보를 불러오지 못했습니다. 잠시 후 페이지를 새로고침해 주세요.</p></section>`;
    this.actions.innerHTML = `<button class="primary" type="button" data-reload>새로고침</button>`;
    this.actions.querySelector("[data-reload]").addEventListener("click", () => window.location.reload());
    this.focusScreen();
  }

  setProgress(visible) {
    const region = document.querySelector("[data-progress-region]");
    region.hidden = !visible;
    if (!visible) return;
    const position = this.step + 1;
    const progress = region.querySelector(".progress");
    progress.setAttribute("aria-valuenow", position);
    progress.setAttribute("aria-valuetext", `5개 중 ${position}번째 질문`);
    document.querySelector("[data-progress-bar]").style.width = `${position * 20}%`;
    document.querySelector("[data-progress-label]").textContent = `${String(position).padStart(2, "0")} / 05`;
  }

  setAIStep(active) {
    document.body.classList.toggle("is-ai-step", active);
  }

  setPreviewBadge(visible, message = "") {
    const badge = document.querySelector("[data-preview-badge]");
    badge.hidden = !visible;
    if (visible && message) badge.textContent = message;
  }

  showVisibleError(message, field) {
    const error = this.root.querySelector("[data-error]");
    if (!error) return;
    error.hidden = false;
    error.textContent = message;
    const input = field === "consent"
      ? this.root.querySelector('[name="consent"]')
      : this.root.querySelector(`[name="${field}"]`);
    input?.setAttribute("aria-invalid", "true");
    input?.setAttribute("aria-describedby", error.id);
    input?.focus();
    this.announce(message);
  }

  clearVisibleError() {
    const error = this.root.querySelector("[data-error]");
    if (error) { error.hidden = true; error.textContent = ""; }
    this.root.querySelectorAll('[aria-invalid="true"]').forEach((node) => node.removeAttribute("aria-invalid"));
  }

  focusScreen() {
    this.root.focus({ preventScroll: true });
  }

  announce(message) {
    this.liveStatus.textContent = "";
    requestAnimationFrame(() => { this.liveStatus.textContent = message; });
  }
}

if (typeof document !== "undefined") {
  const form = document.querySelector("#survey-form");
  const app = new SurveyApp(
    document.querySelector("#survey-main"),
    document.querySelector("[data-actions]"),
    document.querySelector("[data-live-status]"),
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    app.submit();
  });
  app.init();
}
