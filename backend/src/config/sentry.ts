import * as Sentry from '@sentry/node';

export const initSentry = (): void => {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
  console.log('✅ Sentry initialized');
};

export const sentryRequestHandler = (): any => (req: any, res: any, next: any) => next();
export const sentryTracingHandler = (): any => (req: any, res: any, next: any) => next();
export const sentryErrorHandler = (): any => (err: any, req: any, res: any, next: any) => next(err);

export const captureException = (error: Error, context?: Record<string, any>): void => {
  Sentry.withScope(scope => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
};
