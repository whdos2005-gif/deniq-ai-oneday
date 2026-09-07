function isValidEndpoint(value) {
  if (typeof value !== "string") return false;
  const endpoint = value.trim();
  if (!endpoint || endpoint.startsWith("//") || /^javascript:/i.test(endpoint) || /[\s\\]/.test(endpoint)) return false;
  if (endpoint.startsWith("/")) return endpoint.length > 1;
  if (endpoint.startsWith("./")) return endpoint.length > 2;
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function canSubmitLive(config) {
  const privacy = config?.privacy;
  const requiredPrivacy = ["purpose", "controller", "retention", "contact"];
  return Boolean(
    config?.mode === "live" &&
    config?.survey?.open === true &&
    isValidEndpoint(config.survey.endpoint) &&
    privacy?.noticeStatus === "confirmed" &&
    requiredPrivacy.every((key) => typeof privacy[key] === "string" && privacy[key].trim())
  );
}
