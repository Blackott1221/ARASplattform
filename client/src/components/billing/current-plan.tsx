import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { GradientText } from "@/components/ui/gradient-text";
import { motion } from "framer-motion";

interface CurrentPlanProps {
  user: any;
  subscription?: any;
}

export function CurrentPlan({ user, subscription }: CurrentPlanProps) {
  // Check if user is on trial
  const isTrialUser = subscription?.status === "trial" || subscription?.status === "trialing";
  
  const getPlanDetails = (plan: string) => {
    switch (plan) {
      case "pro":
        return { name: "Pro Plan", price: 99, aiMessages: 500, voiceCalls: 100 };
      case "enterprise":
        return { name: "Enterprise Plan", price: 299, aiMessages: null, voiceCalls: null };
      default:
        return { name: "Starter Plan", price: 29, aiMessages: 100, voiceCalls: 10 };
    }
  };

  // Get plan details, but override for trial users
  const planDetails = isTrialUser 
    ? { name: "Free Trial", price: 0, aiMessages: 10, voiceCalls: 0 }
    : getPlanDetails(subscription?.plan || "starter");

  // Enhanced trial message tracking
  const trialMessagesRemaining = isTrialUser ? (subscription?.trialMessagesRemaining || 0) : 0;
  const trialMessagesUsed = isTrialUser ? (subscription?.trialMessagesUsed || 0) : 0;

  const aiUsagePercentage = planDetails.aiMessages ? 
    ((subscription?.aiMessagesUsed || 0) / planDetails.aiMessages) * 100 : 0;
  const voiceUsagePercentage = planDetails.voiceCalls ? 
    ((subscription?.voiceCallsUsed || 0) / planDetails.voiceCalls) * 100 : 0;

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-orbitron font-bold mb-6">
        <GradientText>Current Plan</GradientText>
      </h2>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="border-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-primary">
                    {planDetails.name}
                  </h3>
                  {isTrialUser && (
                    <Badge variant="secondary" className="text-xs">
                      Trial
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">
                  {isTrialUser 
                    ? `${trialMessagesRemaining} messages remaining of ${planDetails.aiMessages} • Upgrade for voice calls`
                    : `${planDetails.aiMessages ? `${planDetails.aiMessages} AI messages` : 'Unlimited AI messages'} • ${planDetails.voiceCalls ? `${planDetails.voiceCalls} voice calls` : 'Unlimited voice calls'}`
                  }
                </p>
              </div>
              <div className="text-right">
                {isTrialUser ? (
                  <div>
                    <p className="text-2xl font-bold text-green-600">FREE</p>
                    <p className="text-sm text-muted-foreground">trial</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl font-bold">${planDetails.price}</p>
                    <p className="text-sm text-muted-foreground">per month</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="pt-4 border-t border-border space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>{isTrialUser ? 'Trial Messages Used' : 'AI Messages Used'}</span>
                  <span className={isTrialUser && trialMessagesRemaining <= 2 ? 'text-yellow-600 font-medium' : ''}>
                    {isTrialUser ? trialMessagesUsed : (subscription?.aiMessagesUsed || 0)} / {planDetails.aiMessages || '∞'}
                    {isTrialUser && trialMessagesRemaining === 0 && (
                      <span className="text-red-600 ml-2">• Trial Limit Reached</span>
                    )}
                  </span>
                </div>
                <Progress value={aiUsagePercentage} className="h-2" />
              </div>
              
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Voice Calls Used</span>
                  <span>
                    {subscription?.voiceCallsUsed || 0} / {planDetails.voiceCalls || '∞'}
                  </span>
                </div>
                <Progress value={voiceUsagePercentage} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
