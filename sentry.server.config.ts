import * as Sentry from "@sentry/nextjs";
import { sentryBeforeSend } from "@/lib/sentry-scrub";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend: sentryBeforeSend,
  enabled: process.env.NODE_ENV === "production",
});
