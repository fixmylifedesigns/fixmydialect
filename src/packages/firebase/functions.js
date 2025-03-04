import * as functions from 'firebase-functions';
import Stripe from 'stripe';

const stripe = new Stripe(functions.config().stripe.secret_key, {
  apiVersion: '2023-10-16'
});

export const cancelSubscription = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated', 
      'User must be authenticated to cancel a subscription.'
    );
  }

  const { subscriptionId } = data;

  try {
    // Cancel the subscription at the end of the current billing period
    const canceledSubscription = await stripe.subscriptions.update(
      subscriptionId,
      {
        cancel_at_period_end: true
      }
    );

    return {
      success: true,
      message: 'Subscription will be canceled at the end of the current billing period.',
      canceledSubscription
    };
  } catch (error) {
    console.error('Subscription cancellation error:', error);
    throw new functions.https.HttpsError(
      'internal', 
      'Failed to cancel subscription',
      error.message
    );
  }
});