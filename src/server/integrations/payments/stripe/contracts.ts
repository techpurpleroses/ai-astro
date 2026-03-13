export interface StripeWebhookEvent {
  id: string;
  type: string;
  created: number;
  payload: Record<string, unknown>;
}

export interface StripeSubscriptionState {
  userId: string;
  subscriptionId: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
}

