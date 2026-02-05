import posthog from 'posthog-js';

export const initAnalytics = () => {
  const key = process.env.REACT_APP_POSTHOG_KEY;
  const host = process.env.REACT_APP_POSTHOG_HOST || 'https://app.posthog.com';

  if (!key) return;

  posthog.init(key, {
    api_host: host,
    autocapture: true,
    capture_pageview: true
  });
};

export const trackEvent = (event: string, properties?: Record<string, any>) => {
  if (!process.env.REACT_APP_POSTHOG_KEY) return;
  posthog.capture(event, properties || {});
};

export const identifyUser = (userId: string, traits?: Record<string, any>) => {
  if (!process.env.REACT_APP_POSTHOG_KEY) return;
  posthog.identify(userId, traits || {});
};
