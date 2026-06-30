export type AnalyticsEventName =
    | 'LOGIN_CLICK'
    | 'LOGIN_COMPLETE'
    | 'SIGNUP_CLICK'
    | 'SIGNUP_COMPLETE'
    | 'EXPERT_SIGNUP_CLICK'
    | 'EXPERT_SIGNUP_COMPLETE'
    | 'HIRE_EXPERT_CLICK'
    | 'HIRE_EXPERT_COMPLETE'
    | 'MESSAGE_SUBSCRIPTION_CLICK'
    | 'PROFILE_CLICK'
    | 'APP_OPEN';

export const trackEvent = async (
    eventName: AnalyticsEventName,
    metadata?: Record<string, any>,
    userId?: string
) => {
    try {
        const payload = {
            event_name: eventName,
            user_id: userId || null,
            metadata: metadata || {}
        };

        const response = await fetch('/api/analytics/track', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error('[Analytics] Failed to track event:', eventName);
        }
    } catch (err) {
        console.error('[Analytics] Error tracking event:', err);
    }
};
