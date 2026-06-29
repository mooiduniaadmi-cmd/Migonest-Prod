import Stripe from 'stripe';
let params: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ['card', 'link'], // Apple Pay is also enabled by card?
    // Let's check wallet_options.link again
};
