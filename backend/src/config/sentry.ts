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

export const sentryRequestHandler = (req: any, res: any, next: any) => next();
export const sentryTracingHandler = (req: any, res: any, next: any) => next();
export const sentryErrorHandler = (req: any, res: any, next: any) => next();

export const captureException = (error: Error, context?: Record<string, any>): void => {
  Sentry.withScope(scope => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureException(error);
  });
};
