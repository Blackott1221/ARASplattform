// Usage Limits Configuration
export const USAGE_LIMITS = {
  starter: {
    calls: 1,
    messages: 5,
    name: 'Starter'
  },
  pro: {
    calls: 100,
    messages: 500,
    name: 'Pro'
  },
  enterprise: {
    calls: 20000,
    messages: -1, // -1 = unlimited
    name: 'Enterprise'
  }
};

export function checkUsageLimit(
  plan: string,
  currentUsage: number,
  limitType: 'calls' | 'messages'
): { allowed: boolean; limit: number; remaining: number } {
  const limits = USAGE_LIMITS[plan as keyof typeof USAGE_LIMITS] || USAGE_LIMITS.starter;
  const limit = limits[limitType];
  
  if (limit === -1) {
    return { allowed: true, limit: -1, remaining: -1 };
  }
  
  const remaining = Math.max(0, limit - currentUsage);
  const allowed = currentUsage < limit;
  
  return { allowed, limit, remaining };
}
