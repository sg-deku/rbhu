import * as Sentry from '@sentry/node';
import { httpIntegration, expressIntegration } from '@sentry/node';

export const initSentry = (): void => {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      httpIntegration(),
      expressIntegration(),
    ],
  });
  console.log('✅ Sentry initialized');
};

export const sentryRequestHandler = Sentry.expressErrorHandler;
export const sentryTracingHandler = Sentry.expressErrorHandler;
export const sentryErrorHandler = Sentry.expressErrorHandler;

export const captureException = (error: Error, context?: Record<string, any>): void => {
  Sentry.withScope(scope => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
};
