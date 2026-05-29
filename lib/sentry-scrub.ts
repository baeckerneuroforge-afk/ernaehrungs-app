import type { ErrorEvent } from "@sentry/nextjs";

// Routes whose request bodies / breadcrumb URLs may carry health data (Art. 9
// DSGVO) or other PII — scrub aggressively before anything leaves for Sentry.
const SENSITIVE_PATH = /\/(chat|food-log|tagebuch|profile)/;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

function redactEmails(value: string): string {
  return value.replace(EMAIL_RE, "[email]");
}

/**
 * Shared Sentry beforeSend hook (client + server + edge). Strips request
 * bodies on sensitive routes, drops breadcrumb payloads for those routes, and
 * redacts email addresses from URLs and exception messages as a backstop.
 */
export function sentryBeforeSend(event: ErrorEvent): ErrorEvent | null {
  if (event.request) {
    const url = typeof event.request.url === "string" ? event.request.url : "";
    if (event.request.data !== undefined && SENSITIVE_PATH.test(url)) {
      event.request.data = "[redacted]";
    }
    if (typeof event.request.url === "string") {
      event.request.url = redactEmails(event.request.url);
    }
  }

  if (event.breadcrumbs) {
    for (const b of event.breadcrumbs) {
      const u = typeof b.data?.url === "string" ? b.data.url : "";
      if (u && SENSITIVE_PATH.test(u)) {
        b.data = { url: u };
      }
    }
  }

  if (event.exception?.values) {
    for (const ex of event.exception.values) {
      if (ex.value) ex.value = redactEmails(ex.value);
    }
  }

  return event;
}
