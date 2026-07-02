import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { VercelRequest, VercelResponse } from '@vercel/node';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import { z } from 'zod';
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';

dotenv.config();

process.on('unhandledRejection', (reason, promise) => {
    console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[CRITICAL] Uncaught Exception thrown:', err);
});

const app = express();

// 1. Robust CORS (Must be at the very top for Vercel and preflight stability)
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowedOrigins = [
            'https://www.migonest.com',
            'https://migonest.com',
            'https://staging.migonest.com',
            'https://migonest-prod.vercel.app',
            'https://api.migonest.com',
            'https://api-staging.migonest.com',
            'https://dev.migonest.com',
            'https://api-dev.migonest.com',
            'https://kogedepjtwfritbzshgq.supabase.co',
            'capacitor://localhost',
            'capacitor://*'
        ];
        if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('migonest-prod') || origin.includes('migonest-dev') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
            callback(null, true);
        } else {
            console.warn(`[CORS] Request from unknown origin: ${origin}`);
            callback(null, true);
        }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['X-Requested-With', 'Content-Type', 'Authorization', 'apikey', 'x-client-info', 'x-supabase-auth', 'Accept', 'Accept-Version', 'Content-Length', 'Content-MD5', 'Date', 'X-Api-Version']
}));
app.options('*', cors());

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com", "https://*.supabase.co"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https://*.supabase.co", "https://*.stripe.com", "https://www.migonest.com", "https://cdnjs.cloudflare.com"],
            connectSrc: [
                "'self'", 
                "https://*.supabase.co", 
                "https://*.stripe.com", 
                "https://api.resend.com", 
                "https://gwengahnqgvwoletcovl.supabase.co", 
                "https://kogedepjtwfritbzshgq.supabase.co",
                "https://*.vercel.app",
                "https://*.migonest.com",
                "wss://*.supabase.co"
            ],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'self'", "https://js.stripe.com"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));
app.use(hpp());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS' // Never rate-limit preflight requests
});

// Apply rate limiter to all API routes
app.use('/api/', limiter);

// 2. Logging
app.use((req, res, next) => {
    if (req.url === '/api/stripe-webhook') {
        // Skip logging for webhook body as it will be raw
        console.log(`[Webhook Request] ${req.method} ${req.url}`);
    } else {
        console.log(`[Request] ${req.method} ${req.url}`);
    }
    next();
});

// 3. URL Normalization & Trimming (CRITICAL for Vercel Rewrites)
app.use((req, res, next) => {
    // A. Trim trailing slash to ensure consistent route matching
    if (req.url.length > 1 && req.url.endsWith('/')) {
        req.url = req.url.slice(0, -1);
    }

    // B. Prepend /api if missing (e.g. from Vercel /api/(.*) rewrites)
    // EXCLUDE public social routes (/in/ and /post/) which are handled as HTML by the same API
    const lowerUrl = req.url.toLowerCase();
    if (
        !lowerUrl.startsWith('/api/') && 
        !lowerUrl.startsWith('/auth/') && 
        !lowerUrl.startsWith('/in/') && 
        !lowerUrl.startsWith('/m/') && 
        !lowerUrl.startsWith('/post/')
    ) {
        req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
    next();
});

// --- 1. HEALTH & DIAGNOSTICS ---
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.get('/api/diag', async (req, res) => {
    try {
        const supabase = getSupabase(req);
        const { data: dbCheck, error: dbError } = await supabase.from('profiles').select('id').limit(1);
        
        // Check wallet_entries schema
        const { data: columns, error: colError } = await supabase.from('wallet_entries').select('*').limit(0);

        res.json({
            status: 'ok',
            version: '3.0.0-robust',
            database: dbError ? 'error' : 'connected',
            dbError: dbError || null,
            wallet_entries_columns: columns || colError || 'RPC get_table_columns missing',
            env: {
                HAS_STRIPE: !!process.env.STRIPE_SECRET_KEY,
                HAS_SUPABASE_URL: !!process.env.SUPABASE_URL,
                SUPABASE_URL: process.env.SUPABASE_URL, // Explicit for debug
                HAS_SUPABASE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
                HAS_STRIPE_WEBHOOK: !!process.env.STRIPE_WEBHOOK_SECRET,
                NODE_ENV: process.env.NODE_ENV
            },
            headers: req.headers,
            timestamp: new Date().toISOString()
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});
// --- 1. UTILS & HELPERS ---

// Helper to get robust base URL for redirects (Web & Mobile)
const getBaseUrl = (req: any) => {
    const origin = req.headers.origin || req.headers.referer || '';
    const host = (req?.headers?.host || '').toLowerCase();
    
    // Determine canonical public domain based on the request host (remote server)
    let canonicalDomain = 'https://migonest.com';
    if (host.includes('staging') || host.includes('api-staging')) {
        canonicalDomain = 'https://staging.migonest.com';
    } else if (host.includes('dev') || host.includes('api-dev')) {
        canonicalDomain = 'https://dev.migonest.com';
    }

    // CAPACITOR DETECTION:
    // If origin is localhost but the request host is remote (NOT localhost),
    // it's a mobile app calling a remote production/staging backend.
    // We MUST return the canonical domain because Stripe prohibits localhost redirects in live mode.
    if (origin.includes('localhost') && !host.includes('localhost')) {
        console.log(`[getBaseUrl] Capacitor origin detected on remote host ${host}. Returning canonical: ${canonicalDomain}`);
        return canonicalDomain;
    }

    // Standard logic for Web
    if (origin) {
        try {
            const url = new URL(origin) as any;
            if (url.protocol.startsWith('http')) {
                // If it's a real web domain, use it
                if (!url.host.includes('localhost')) {
                    // Force canonical domain for mobile app origins to ensure Stripe redirects work
                    if (url.host === 'com.migonest.app') return canonicalDomain;
                    return `${url.protocol}//${url.host}`.replace(/\/$/, "");
                }
            }
        } catch (e) {
            // keep going
        }
    }

    // Local development fallback (when both app and API are on localhost)
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return 'http://localhost:5173';
    }
    
    return canonicalDomain;
};

// --- 2. STRIPE WEBHOOK (Must be before express.json) ---
// We use express.raw to get the Buffer required for signature verification
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const rawBody = req.body; 

    console.log(`[Stripe Webhook] Received request. Signature present: ${!!sig}`);

    let event: Stripe.Event;

    try {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
        if (!webhookSecret) {
            console.error('[Stripe Webhook] CRITICAL: STRIPE_WEBHOOK_SECRET is NOT set!');
            return res.status(500).send('Webhook configuration error');
        }
        event = stripe.webhooks.constructEvent(rawBody, sig as string, webhookSecret);
        console.log(`[Stripe Webhook] Verified event ${event.id} of type ${event.type}`);
    } catch (err: any) {
        console.error(`[Stripe Webhook] Signature Verification Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        const migonestUserId = metadata.migonest_user_id || metadata.userId;
        const userId = migonestUserId; // Unified reference for database operations
        const type = metadata.type;
        const app = metadata.app;
        const referrerId = metadata.referrerId;
        const expertId = metadata.expertId;
        const studentId = metadata.studentId;
        
        // Handle both camelCase and snake_case for requestId
        const requestId = metadata.requestId || metadata.request_id;

        console.log(`[Stripe Webhook] Processing event: ${event.id}, Type: ${event.type}`);
        console.log(`[Stripe Webhook] Session: ${session.id}, Metadata Type: ${type}, RequestId: ${requestId}`);

        try {
            const supabase = getSupabase(req);
            const stripeInstance = getStripe(req);

            if (type === 'SUBSCRIPTION') {
                console.log(`[Stripe Webhook] Processing SUBSCRIPTION for user: ${userId}`);
                
                if (!userId) {
                    console.error('[Stripe Webhook] Error: userId missing for SUBSCRIPTION event');
                    return res.status(400).send('Missing userId');
                }

                // 1. Retrieve Subscription details for caching
                let current_period_end = null;
                let subscription_id = session.subscription as string;
                
                if (subscription_id) {
                    try {
                        const sub = await stripeInstance.subscriptions.retrieve(subscription_id) as any;
                        current_period_end = sub.current_period_end;
                    } catch (e) {
                        console.error('[Stripe Webhook] Error fetching subscription details:', e);
                    }
                }

                // 2. Update Profile with cached details
                const { error: profError } = await supabase.from('profiles').update({ 
                    is_subscribed: true,
                    subscription_id: subscription_id,
                    current_period_end: current_period_end,
                    cancel_at_period_end: false
                }).eq('id', userId);
                
                if (profError) {
                    console.error(`[Stripe Webhook] Error updating profile for user ${userId}:`, profError);
                    throw profError;
                }
                console.log(`[Stripe Webhook] Successfully marked user ${userId} as subscribed with sub_id: ${subscription_id}`);

                // 3. Add Wallet Entry
                const SUBSCRIPTION_FEE = 19.99;
                const { error: walletError } = await supabase.from('wallet_entries').insert({
                    profile_id: userId,
                    amount: -SUBSCRIPTION_FEE,
                    type: 'PAYMENT',
                    description: 'Premium Subscription payment to Migonest',
                    status: 'COMPLETED',
                    counterparty_name: 'Migonest',
                    counterparty_role: 'SYSTEM',
                    university: 'Migonest Platform',
                    country: 'Global'
                });
                if (walletError) console.error(`[Stripe Webhook] Warning: Could not create wallet entry for subscription:`, walletError);

                // 4. Trigger real-time UI wakeup via notification
                const { error: notifError } = await supabase.from('notifications').insert({
                    user_id: userId,
                    title: 'Subscription Active!',
                    message: 'Welcome to Migonest Premium! Your account has been upgraded and chat is now unlocked.',
                    type: 'SYSTEM'
                });
                if (notifError) console.error(`[Stripe Webhook] Warning: Could not create notification:`, notifError);

                if (referrerId && referrerId !== userId) {
                    const REFERRAL_REWARD = 2.00;
                    
                    // 5. Idempotency Check: Don't reward the same referrer for the same student twice
                    const { data: existingReward } = await supabase
                        .from('wallet_entries')
                        .select('id')
                        .eq('profile_id', referrerId)
                        .eq('counterparty_id', userId)
                        .ilike('description', '%Referral Reward%')
                        .limit(1);

                    if (existingReward && existingReward.length > 0) {
                        console.log(`[Stripe Webhook] Referral reward already issued for student ${userId} to expert ${referrerId}. Skipping.`);
                    } else {
                        const { data: subProfile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();

                        await supabase.from('wallet_entries').insert({
                            profile_id: referrerId,
                            amount: REFERRAL_REWARD,
                            type: 'EARNING',
                            description: `Referral Reward for ${subProfile?.full_name || 'a new subscriber'}`,
                            status: 'COMPLETED',
                            counterparty_id: userId,
                            counterparty_name: subProfile?.full_name || 'Subscriber',
                            counterparty_role: 'STUDENT',
                            university: 'Migonest Referral Program',
                            country: 'Global'
                        });

                        await supabase.rpc('increment_wallet', { row_id: referrerId, val: REFERRAL_REWARD });
                        await supabase.from('notifications').insert({ user_id: referrerId, title: 'Referral Reward Earned!', message: `You've earned $${REFERRAL_REWARD.toFixed(2)} because ${subProfile?.full_name || 'someone'} upgraded to Premium via your referral!`, type: 'WALLET' });
                        console.log(`[Stripe Webhook] Successfully rewarded referrer ${referrerId} for student ${userId}`);
                    }
                }
            } else if (type === 'HIRE') {
                console.log(`[Stripe Webhook] Processing HIRE update for requestId: ${requestId}`);
                
                if (!requestId) {
                    console.error('[Stripe Webhook] HIRE event missing requestId in metadata!');
                    return res.status(400).json({ error: 'Missing requestId' });
                }

                // Robust metadata fallback
                let finalStudentId = studentId;
                let finalExpertId = expertId;
                let finalFee = 399; // Default Admission Journey fee in USD

                const { data: request } = await supabase.from('service_requests').select('*').eq('id', requestId).single();
                
                if (request) {
                    if (!finalStudentId) finalStudentId = request.student_id;
                    if (!finalExpertId) finalExpertId = request.expert_id;
                    if (request.fee) finalFee = request.fee;
                }

                console.log(`[Stripe Webhook] Attempting DB update for requestId: ${requestId} to PAID`);
                const { data: updatedData, error: updateError } = await supabase
                    .from('service_requests')
                    .update({ status: 'PAID' })
                    .eq('id', requestId)
                    .select();
                
                if (updateError) {
                    console.error(`[Stripe Webhook] CRITICAL: DB Update Error for ${requestId}: ${updateError.message}`);
                    throw updateError;
                }
                
                if (updatedData && updatedData.length > 0) {
                   console.log(`[Stripe Webhook] SUCCESS: Status set to PAID for requestId: ${requestId}`);
                }

                const expertPayout = finalFee * 0.4;
                const { data: studentProfile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', finalStudentId).single();
                const { data: expertProfile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', finalExpertId).single();

                // 1. Record Student Payment
                await supabase.from('wallet_entries').insert({
                    profile_id: finalStudentId,
                    amount: -finalFee,
                    type: 'PAYMENT',
                    description: `$${finalFee} payment for hiring expert`,
                    status: 'COMPLETED',
                    request_id: requestId,
                    counterparty_id: finalExpertId,
                    counterparty_name: expertProfile?.full_name,
                    counterparty_role: 'EXPERT',
                    counterparty_avatar_url: expertProfile?.avatar_url,
                    university: 'Migonest Admission',
                    country: 'Global'
                });

                // 2. Record Expert Earning
                await supabase.from('wallet_entries').insert({
                    profile_id: finalExpertId,
                    amount: expertPayout,
                    type: 'EARNING',
                    description: `Initial 40% fee for Journey`,
                    status: 'COMPLETED',
                    request_id: requestId,
                    counterparty_id: finalStudentId,
                    counterparty_name: studentProfile?.full_name,
                    counterparty_role: 'STUDENT',
                    counterparty_avatar_url: studentProfile?.avatar_url,
                    university: 'Migonest Admission',
                    country: 'Global'
                });

                await supabase.rpc('increment_wallet', { row_id: finalExpertId, val: expertPayout });
                await supabase.from('notifications').insert({ user_id: finalExpertId, title: 'New Hire!', message: 'Your admission journey has officially started. Review the requirements to begin.', type: 'ADMISSION' });
            }

            console.log(`[Stripe Webhook] Successfully processed ${type} for user ${userId || studentId} (RequestId: ${requestId || 'N/A'})`);
        } catch (dbErr: any) {
            console.error(`[Stripe Webhook] Error: ${dbErr.message}`);
            return res.status(500).json({ error: 'Database update failed' });
        }
    } else if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
        const subscription = event.data.object as any;
        
        // SECURITY: Ignore events from other apps (e.g. MooiDunia)
        if (subscription.metadata?.app && subscription.metadata.app !== 'migonest') {
            console.log(`[Stripe Webhook] Ignoring ${event.type} for non-migonest app: ${subscription.metadata.app}`);
            return res.json({ received: true });
        }

        const userId = subscription.metadata?.migonest_user_id || subscription.metadata?.userId;
        const status = subscription.status;
        const isCurrentlyActive = (status === 'active' || status === 'trialing');
        
        if (userId) {
            try {
                const supabase = getSupabase(req);
                const updateData: any = { 
                    is_subscribed: isCurrentlyActive,
                    current_period_end: subscription.current_period_end,
                    cancel_at_period_end: !!subscription.cancel_at_period_end
                };
                
                if (event.type === 'customer.subscription.updated') {
                    updateData.subscription_id = subscription.id;
                } else if (event.type === 'customer.subscription.deleted') {
                    updateData.subscription_id = null;
                    updateData.current_period_end = null;
                }

                await supabase.from('profiles').update(updateData).eq('id', userId);
                console.log(`[Stripe Webhook] Syncing subscription ${subscription.id} for user ${userId}. Active: ${isCurrentlyActive}, End: ${subscription.current_period_end}, CancelAtEnd: ${subscription.cancel_at_period_end}`);
                
                if (userId === 'wahed.aust@gmail.com' || (subscription.metadata?.email === 'wahed.aust@gmail.com')) {
                    console.log(`[SUBSCRIPTION_DEBUG] Webhook sync for Wahed: cancel_at_period_end=${subscription.cancel_at_period_end}`);
                }
                
                if (!isCurrentlyActive && event.type === 'customer.subscription.deleted') {
                    await supabase.from('notifications').insert({
                        user_id: userId,
                        title: 'Subscription Ended',
                        message: 'Your Premium subscription is no longer active. Subscribe again to continue enjoying premium features.',
                        type: 'SYSTEM'
                    });
                }
            } catch (err: any) {
                console.error(`[Stripe Webhook] Database error on subscription sync: ${err.message}`);
            }
        }
    } else if (event.type === 'invoice.paid') {
        const invoice = event.data.object as any;
        if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
            const subscriptionId = invoice.subscription as string;
            try {
                const stripeInstance = getStripe(req);
                const supabase = getSupabase(req);
                const subscription = await stripeInstance.subscriptions.retrieve(subscriptionId) as any;
                
                // SECURITY: Ignore renewals from other apps
                if (subscription.metadata?.app && subscription.metadata.app !== 'migonest') {
                    console.log(`[Stripe Webhook] Ignoring renewal for non-migonest app: ${subscription.metadata.app}`);
                    return res.json({ received: true });
                }

                const userId = subscription.metadata?.migonest_user_id || subscription.metadata?.userId;
                
                if (userId) {
                    console.log(`[Stripe Webhook] Processing RENEWAL for user ${userId}`);
                    const stripeDate = Number(subscription.current_period_end || subscription.trial_end);
                    await supabase.from('profiles').update({ 
                        is_subscribed: true,
                        subscription_id: subscriptionId,
                        current_period_end: (stripeDate && stripeDate > 0) ? Math.floor(stripeDate) : null,
                        cancel_at_period_end: false
                    }).eq('id', userId);
                    
                    await supabase.from('wallet_entries').insert({
                        profile_id: userId,
                        amount: -(invoice.amount_paid / 100),
                        type: 'PAYMENT',
                        description: 'Premium Subscription Renewal payment',
                        status: 'COMPLETED',
                        counterparty_name: 'Migonest',
                        counterparty_role: 'SYSTEM',
                        university: 'Migonest Platform',
                        country: 'Global'
                    });
                }
            } catch (err: any) {
                console.error(`[Stripe Webhook] Renewal error: ${err.message}`);
            }
        }
    } else if (event.type === 'invoice.payment_failed') {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string;
        
        if (subscriptionId) {
            console.log(`[Stripe Webhook] Payment failed for invoice ${invoice.id}. Cancelling subscription ${subscriptionId} immediately.`);
            try {
                const stripeInstance = getStripe(req);
                // Cancel immediately so the user can resubscribe with a new payment method as requested
                await stripeInstance.subscriptions.cancel(subscriptionId);
            } catch (err: any) {
                console.error(`[Stripe Webhook] Error cancelling subscription ${subscriptionId} on payment failure: ${err.message}`);
            }
        }
    }
    res.json({ received: true });
});

app.get('/api/revenuecat-webhook', (req, res) => res.json({ status: 'active', message: 'RevenueCat Webhook endpoint is reachable. Actual events must use POST.' }));
app.post('/api/revenuecat-webhook', async (req, res) => {
    const { event } = req.body;
    if (!event) return res.status(400).send('Missing event data');

    const { type, app_user_id, subscriber_attributes } = event;
    const referrerId = subscriber_attributes?.referrerId?.value;

    console.log(`[RevenueCat Webhook] Received ${type} for user: ${app_user_id} (Referrer: ${referrerId || 'None'})`);

    try {
        const supabase = createClient(process.env.SUPABASE_URL || 'https://gwengahnqgvwoletcovl.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
        
        if (type === 'INITIAL_PURCHASE' || type === 'RENEWAL' || type === 'UNCANCELLATION') {
            await supabase.from('profiles').update({ is_subscribed: true }).eq('id', app_user_id);
            console.log(`[RevenueCat] User ${app_user_id} is now PREMIUM`);

            // Apply Referral Reward on Initial Purchase
            if (type === 'INITIAL_PURCHASE' && referrerId) {
                // Idempotency Check: Don't reward the same referrer for the same student twice
                const { data: existingReward } = await supabase
                    .from('wallet_entries')
                    .select('id')
                    .eq('profile_id', referrerId)
                    .eq('counterparty_id', app_user_id)
                    .ilike('description', '%Referral Reward%')
                    .limit(1);

                if (existingReward && existingReward.length > 0) {
                    console.log(`[RevenueCat Webhook] Referral reward already issued for user ${app_user_id} to referrer ${referrerId}. Skipping.`);
                } else {
                    const { data: subscriber } = await supabase.from('profiles').select('full_name').eq('id', app_user_id).single();
                    await supabase.from('wallet_entries').insert({
                        profile_id: referrerId,
                        amount: 2.00,
                        type: 'EARNING',
                        description: `Referral Reward: ${subscriber?.full_name || 'New user'} subscribed to Premium (Apple)`,
                        status: 'COMPLETED',
                        counterparty_id: app_user_id,
                        counterparty_name: subscriber?.full_name,
                        counterparty_role: 'STUDENT',
                        university: 'Migonest Referral Program',
                        country: 'Global'
                    });
                    await supabase.rpc('increment_wallet', { row_id: referrerId, val: 2.00 });
                    await supabase.from('notifications').insert({
                        user_id: referrerId,
                        title: 'New Referral Reward! 🎁',
                        message: `You earned $2.00 because ${subscriber?.full_name || 'a user'} joined Premium using your link on iOS.`,
                        type: 'WALLET'
                    });
                }
            }
        } else if (type === 'EXPIRATION' || type === 'CANCELLATION') {
            await supabase.from('profiles').update({ is_subscribed: false }).eq('id', app_user_id);
            console.log(`[RevenueCat] User ${app_user_id} subscription EXPIRED/CANCELLED`);
        }
        res.json({ success: true });
    } catch (err: any) {
        console.error('[RevenueCat Webhook] DB Error:', err.message);
        res.status(500).send('Internal Server Error');
    }
});

app.use(express.json({ limit: '50mb' }) as any);

// Supabase Setup
let _supabase: any = null;
const getSupabase = (req?: any) => {
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const envUrl = (process.env.SUPABASE_URL || '').trim();
    
    // Default to the provided env URL
    let finalUrl = envUrl || 'https://gwengahnqgvwoletcovl.supabase.co';

    // Robust environment detection from request host if available
    const host = (req?.headers?.host || '').toLowerCase();
    
    if (host.includes('staging') || host.includes('api-staging')) {
        finalUrl = 'https://kogedepjtwfritbzshgq.supabase.co';
    } else if (host.includes('dev') || host.includes('api-dev')) {
        finalUrl = 'https://kogedepjtwfritbzshgq.supabase.co';
    } else if (host.includes('api.migonest.com') || host.includes('www.migonest.com') || host === 'migonest.com') {
        finalUrl = 'https://gwengahnqgvwoletcovl.supabase.co';
    }

    // Only cache if we don't have a specific request context forcing a pivot
    if (!req && _supabase) return _supabase;
    
    const client = createClient(finalUrl, key);
    if (!req) _supabase = client; 
    return client;
};

/**
 * Sends an instant broadcast signal to the frontend for UI synchronization.
 * This is significantly faster than waiting for Postgres replication lag.
 */
const broadcastAdmissionUpdate = (req: any, id: string, userId: string) => {
    try {
        const supabase = getSupabase(req);
        supabase.channel('journey_sync').send({
            type: 'broadcast',
            event: 'ADMISSION_UPDATE',
            payload: { id, userId, timestamp: new Date().toISOString() }
        });
        console.log(`[Broadcast] Admission update sent for journey ${id} to user ${userId}`);
    } catch (err) {
        console.error('[Broadcast] Failed to send admission update:', err);
    }
};

// Stripe Setup helper for dynamic environment-specific keys
const getStripe = (req: any) => {
    const host = (req?.headers?.host || '').toLowerCase();
    let key = process.env.STRIPE_SECRET_KEY || '';

    // If host contains staging or dev, prefer the staging secret key if available
    if (host.includes('staging') || host.includes('dev')) {
        const stagingKey = process.env.STRIPE_SECRET_KEY_STAGING || process.env.STRIPE_SECRET_KEY;
        if (stagingKey) key = stagingKey;
    }

    return new Stripe(key.trim());
};

// Default instance for webhooks or generic background tasks (uses the primary key)
const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || '').trim());


// --- Routes ---
const SITE_URL = process.env.VITE_SITE_URL || 'https://www.migonest.com';

function injectOGMetadata(html: string, title: string, description: string, image: string, url: string): string {
    return html
        .replace(/__OG_TITLE__/g, title)
        .replace(/__OG_DESCRIPTION__/g, description)
        .replace(/__OG_IMAGE__/g, image)
        .replace(/__OG_URL__/g, url)
        .replace(/Migonest - Study Abroad Made Simple/g, title)
        .replace(/Connect with University Experts for personalized guidance on admissions and visas\. Your journey to international education starts here\./g, description)
        .replace(/https:\/\/migonest\.com\/assets\/Migonest-Primary-Logo-Square\.png/g, image)
        .replace(/https:\/\/migonest\.com\/assets\/Migonest-Primary-Logo\.png/g, image)
        .replace(/https:\/\/migonest\.com\/logo\.png/g, image)
        .replace(/<meta property="og:url" content="https:\/\/migonest\.com" \/>/g, `<meta property="og:url" content="${url}" />`);
}

/**
 * Social Sharing - Serve Profile HTML with dynamic OG tags
 */
app.get(['/in/:slug', '/m/:slug'], async (req, res) => {
    const { slug } = req.params;
    const supabase = getSupabase(req);

    try {
        // 1. Fetch Profile Data
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, role')
            .eq('slug', slug)
            .single();

        // 2. Read index.html (Prioritize dist folder for production)
        const distPath = path.join(process.cwd(), 'dist', 'index.html');
        const rootPath = path.join(process.cwd(), 'index.html');
        const indexPath = fs.existsSync(distPath) ? distPath : rootPath;
        let html = fs.readFileSync(indexPath, 'utf8');

        // 3. Prepare Metadata
        const title = profile ? `${profile.full_name} | Migonest` : 'Migonest - Profile Not Found';
        const description = profile
            ? `Connect with ${profile.full_name}, a ${profile.role.toLowerCase()} on Migonest.`
            : 'Study Abroad Made Simple. Connect with experts and students globally.';
        const image = profile?.avatar_url || `${SITE_URL}/assets/default-cover.png`;
        const url = `${SITE_URL}/m/${slug}`;

        // 4. Inject Metadata
        html = injectOGMetadata(html, title, description, image, url);

        // 5. Send modified HTML
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        console.error('[OG] Error generating profile preview:', error);
        // Fallback to basic index.html on error
        const distPath = path.join(process.cwd(), 'dist', 'index.html');
        const rootPath = path.join(process.cwd(), 'index.html');
        const indexPath = fs.existsSync(distPath) ? distPath : rootPath;
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.status(500).send('Internal Server Error');
        }
    }
});

/**
 * Social Sharing - Serve Post HTML with dynamic OG tags
 */
app.get('/post/:id', async (req, res) => {
    const { id } = req.params;
    const supabase = getSupabase(req);

    try {
        // 1. Fetch Post Data with Author
        const { data: post } = await supabase
            .from('posts')
            .select('content, author:profiles(full_name, avatar_url)')
            .eq('id', id)
            .single();

        // 2. Read index.html (Prioritize dist folder for production)
        const distPath = path.join(process.cwd(), 'dist', 'index.html');
        const rootPath = path.join(process.cwd(), 'index.html');
        const indexPath = fs.existsSync(distPath) ? distPath : rootPath;
        let html = fs.readFileSync(indexPath, 'utf8');

        // 3. Prepare Metadata
        const authorName = post?.author?.full_name || 'Someone';
        const title = `${authorName} on Migonest`;

        // Strip HTML from post content for description
        const plainContent = post?.content ? post.content.replace(/<[^>]+>/g, '') : '';
        const description = plainContent || 'Check out this post on Migonest - Study Abroad Made Simple.';

        const image = post?.author?.avatar_url || `${SITE_URL}/assets/default-cover.png`;
        const url = `${SITE_URL}/post/${id}`;

        // 4. Inject Metadata
        html = injectOGMetadata(html, title, description, image, url);

        // 5. Send modified HTML
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        console.error('[OG] Error generating post preview:', error);
        const indexPath = path.join(process.cwd(), 'index.html');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.status(500).send('Internal Server Error');
        }
    }
});

app.get('/api/expert-applications', async (req, res) => {
    const { expertId } = req.query;
    const supabase = getSupabase(req);

    try {
        const { data: applications, error } = await supabase
            .from('expert_applications')
            .select('*')
            .eq('expert_id', expertId);
        if (error) throw error;
        res.json(applications);
    } catch (error: any) {
        console.error('[ExpertApplications] Error fetching applications:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/db-test', async (req, res) => {
    try {
        const { error } = await getSupabase(req).from('profiles').select('id').limit(1);
        if (error) throw error;
        res.json({ status: 'ok', database: 'connected', version: '2.0.0-consolidated' });
    } catch (error: any) {
        res.status(503).json({ status: 'degraded', error: error.message });
    }
});

app.get('/api/expert-reviews', async (req, res) => {
    const { expertId, limit, offset } = req.query;
    try {
        const supabase = getSupabase(req);
        
        const query = supabase
            .from('expert_reviews')
            .select('*, student:profiles(full_name, avatar_url)')
            .eq('expert_id', expertId as string)
            .order('created_at', { ascending: false });

        if (limit) query.limit(Number(limit));
        if (offset) query.range(Number(offset), Number(offset) + Number(limit) - 1);

        const { data: reviews, error } = await query;
        if (error) throw error;
        res.json(reviews);
    } catch (error: any) {
        console.error('[ExpertReviews] Error fetching reviews:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/health', async (req, res) => {
    try {
        const host = req.headers.host || '';
        const supabase = getSupabase(req);
        const { error } = await supabase.from('profiles').select('id').limit(1);
        if (error) throw error;
        
        const stripeKey = process.env.STRIPE_SECRET_KEY || '';
        res.json({ 
            status: 'ok', 
            database: 'connected', 
            version: '2.0.2-diag',
            host,
            envDetection: host.includes('staging') ? 'STAGING' : (host.includes('dev') ? 'DEV' : 'PRODUCTION'),
            stripe: {
                hasKey: !!stripeKey,
                keyPrefix: stripeKey.substring(0, 7),
                hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET
            }
        });
    } catch (error: any) {
        res.status(503).json({ status: 'degraded', error: error.message });
    }
});

app.post('/api/subscribe', async (req, res) => {
    const subscribeSchema = z.object({
        userId: z.string().uuid(),
        referrerId: z.string().uuid().optional().nullable(),
        force: z.boolean().optional()
    });

    const validation = subscribeSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ error: 'Invalid request data', details: validation.error.format() });
    }

    const { userId, referrerId, force } = validation.data;
    const SUBSCRIPTION_FEE = 1999; // $19.99 in cents

    try {
        const stripeInstance = getStripe(req);
        // If Stripe keys are missing, fallback to mock (for now, until user provides keys)
        if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'YOUR_STRIPE_SECRET_KEY') {
            console.log('[Subscribe] Falling back to mock subscription (Missing Stripe Keys) - NO AUTO-FLIP');
            // We NO LONGER update the database here. Mock should also go through a fake checkout or manual approval to avoid confusion.
            return res.json({ success: true, mode: 'mock', message: 'Stripe keys not configured. Contact support.' });
        }

        let customerId;
        const supabase = getSupabase(req);
        // GET THE USER PROFILE STATUS FIRST
        const { data: userProfile } = await supabase.from('profiles').select('email, full_name, is_subscribed').eq('id', userId).single();
        if (!userProfile?.email) return res.status(404).json({ error: 'User email not found' });
        
        const isDbSubscribed = userProfile?.is_subscribed === true;
        console.log(`[Subscribe] Checking subscription for ${userId} (DB Status: ${isDbSubscribed})`);
        // Robust customer search by namespaced metadata and email
        const customerSearch = await stripeInstance.customers.search({
            query: `metadata['migonest_user_id']:'${userId}' OR metadata['userId']:'${userId}' OR email:'${userProfile.email}'`,
            limit: 5
        });
        
        // Collect all active/trialing subscriptions across all found customers
        let foundActiveSub: any = null;

        for (const customer of customerSearch.data) {
            const customerEmail = (customer.email || '').toLowerCase().trim();
            const profileEmail = (userProfile.email || '').toLowerCase().trim();
            const isMigonestMetaMatch = customer.metadata?.migonest_user_id === userId;
            const isLegacyMetaMatch = customer.metadata?.userId === userId;
            const isMetaMatch = isMigonestMetaMatch || isLegacyMetaMatch;
            const isEmailMatch = customerEmail === profileEmail;

            console.log(`[Subscribe] Vector Buy: Checking customer ${customer.id} | email: ${customerEmail} | Meta Match: ${isMetaMatch} | Email Match: ${isEmailMatch}`);

            // Stripe search can be fuzzy. We MUST be exact here.
            if (!isMetaMatch && !isEmailMatch) {
                console.log(`[Subscribe] Vector Buy: Skipping customer ${customer.id} due to non-exact match.`);
                continue;
            }

            const subs = await stripeInstance.subscriptions.list({
                customer: customer.id,
                status: 'all',
                limit: 10
            });
            
            // Only count it as a match if the subscription status is active/trialing AND it belongs to this specific user
            const active = subs.data.find(s => {
                const isStatusMatch = s.status === 'active' || s.status === 'trialing';
                
                // Transition logic: look for namespaced ID first, then legacy ID
                const isMigonestMetaMatch = s.metadata?.migonest_user_id === userId;
                const isLegacyMetaMatch = s.metadata?.userId === userId;
                const isAppMatch = s.metadata?.app === 'migonest';

                // If app tag exists, it MUST be migonest. 
                // If no app tag, we allow legacy match for backward compatibility.
                const isSubMetaMatch = isMigonestMetaMatch || (isLegacyMetaMatch && !isAppMatch);
                return isStatusMatch && isSubMetaMatch;
            });

            if (active) {
                console.log(`[Subscribe] Vector Buy: ACTIVE SUB FOUND: ${active.id} (Status: ${active.status}) on customer ${customer.id}`);
                foundActiveSub = active;
                customerId = customer.id;
                break;
            } else {
                console.log(`[Subscribe] Vector Buy: No relevant active subs on customer ${customer.id}`);
            }
        }

        if (foundActiveSub && force !== true) {
            console.log(`[Subscribe] User ${userId} has active sub ${foundActiveSub.id} in Stripe.`);
            
            // CRITICAL FIX: Only block the purchase if the database ALREADY says they are subscribed.
            // If the database is FALSE, we allow them to proceed (this fixes the sync lock).
            if (isDbSubscribed) {
                console.log(`[Subscribe] Blocking purchase: User is premium in BOTH Stripe and DB.`);
                return res.json({ 
                    success: true, 
                    alreadySubscribed: true, 
                    debugTrace: { 
                        subId: foundActiveSub.id, 
                        customerId: customerId,
                        status: foundActiveSub.status,
                        syncLock: true
                    } 
                });
            } else {
                console.log(`[Subscribe] Bypass Block: Stripe has active sub but DB is FALSE. Allowing new purchase to fix sync.`);
            }
        } else if (foundActiveSub && force === true) {
            console.log(`[Subscribe] FORCE BYPASS: User has active sub ${foundActiveSub.id} but force=true was provided. Proceeding with new checkout.`);
        }

        // If no active sub, use the exact customer found or create a new one
        const exactCustomer = customerSearch.data.find(c => 
            c.metadata?.migonest_user_id === userId || 
            (c.metadata?.userId === userId && !c.metadata?.app) || 
            c.email === userProfile.email
        );
        if (exactCustomer) {
            customerId = exactCustomer.id;
        } else {
            const customer = await stripeInstance.customers.create({
                email: userProfile.email,
                name: userProfile.full_name || undefined,
                metadata: { 
                    migonest_user_id: userId,
                    app: 'migonest'
                }
            });
            customerId = customer.id;
        }

        const baseUrl = getBaseUrl(req);
        const session = await stripeInstance.checkout.sessions.create({
            customer: customerId, // Keep customer ID for existing customers
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: { 
                        name: 'Migonest Premium Subscription',
                        description: 'Unlimited messaging and premium networking tools'
                    },
                    unit_amount: SUBSCRIPTION_FEE,
                    recurring: { interval: 'month' }
                },
                quantity: 1,
            }],
            mode: 'subscription',
            success_url: `${baseUrl}/?view=PROFILE&success=true`,
            cancel_url: `${baseUrl}/?view=PROFILE&canceled=true&type=subscription`,
            subscription_data: {
                metadata: {
                    type: 'SUBSCRIPTION',
                    migonest_user_id: userId,
                    app: 'migonest',
                    referrerId: referrerId || ''
                }
            },
            metadata: {
                type: 'SUBSCRIPTION',
                migonest_user_id: userId,
                app: 'migonest',
                referrerId: referrerId || ''
            },
            // Pre-fill email only if customer ID is not provided
            customer_email: customerId ? undefined : (userProfile?.email || undefined)
        });

        console.log(`[Subscribe] Created Stripe session: ${session.id} for user ${userId}. Redirecting to: ${session.url}`);
        return res.json({ success: true, url: session.url });
    } catch (error: any) {
        console.error('[Subscribe] Error creating checkout session:', error.message, error);
        res.status(500).json({ error: error.message });
    }
});

// Manual subscription sync - fallback when webhook is delayed or fails
app.get('/api/sync-subscription', async (req, res) => {
    const userId = req.query.userId as string;
    const sessionIdArg = req.query.sessionId as string;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    console.log(`[Sync] Manual sync requested for user: ${userId}, sessionId: ${sessionIdArg || 'NONE'}`);

    try {
        const supabase = getSupabase(req);

        // 1. Check if already subscribed in DB first
        const { data: profile } = await supabase.from('profiles').select('email, is_subscribed').eq('id', userId).single();
        if (profile?.is_subscribed) {
            console.log(`[Sync] User ${userId} already subscribed in DB`);
            return res.json({ success: true, activated: true, source: 'database' });
        }

        let successfulSession: Stripe.Checkout.Session | undefined;

        // 2. Direct lookup if sessionId provided
        if (sessionIdArg) {
            console.log(`[Sync] Attempting direct retrieval for sessionId: ${sessionIdArg}`);
            try {
                const stripeInstance = getStripe(req);
                const session = await stripeInstance.checkout.sessions.retrieve(sessionIdArg);
                if (session.payment_status === 'paid' && (session.metadata?.userId === userId || session.customer_details?.email === profile?.email)) {
                    successfulSession = session;
                    console.log(`[Sync] Found match via direct sessionId lookup!`);
                }
            } catch (err: any) {
                console.error(`[Sync] Error retrieving specific session: ${err.message}`);
            }
        }

        // 3. Fallback to customer search if no match yet
        if (!successfulSession && profile?.email) {
            console.log(`[Sync] Searching for customer by email: ${profile?.email}`);
            
            // 2. Search Stripe customer for this user
            const stripeInstance = getStripe(req);
            const customers = await stripeInstance.customers.list({
                email: profile?.email || undefined,
                limit: 1
            });

            const customerId = customers.data[0]?.id;
            console.log(`[Sync] Found Stripe customerId: ${customerId || 'NONE'} for email: ${profile?.email}`);

            // 3. Search Stripe sessions for this customer or generally
            const sessions = await stripeInstance.checkout.sessions.list({
                customer: customerId || undefined,
                limit: 50,
                status: 'complete'
            });

            console.log(`[Sync] Found ${sessions.data.length} recent sessions for customer ${customerId || 'N/A'}.`);

            const potentialSessions = sessions.data.filter(s =>
                s.payment_status === 'paid' &&
                (s.metadata?.userId === userId || s.customer === customerId || s.customer_details?.email === profile?.email) &&
                (s.metadata?.type === 'SUBSCRIPTION' || s.mode === 'subscription')
            );

            for (const s of potentialSessions) {
                if (s.subscription) {
                    try {
                        const sub = await stripeInstance.subscriptions.retrieve(s.subscription as string);
                        if (sub.status === 'active' || sub.status === 'trialing') {
                            successfulSession = s;
                            break;
                        }
                    } catch (e) {
                        console.error(`[Sync] Error retrieving subscription ${s.subscription}:`, e);
                    }
                }
            }
        }

        if (successfulSession) {
            console.log(`[Sync] Match found! Session ${successfulSession.id}. Updating DB for user ${userId}`);

            // Perform activation
            const { error: updateErr } = await supabase.from('profiles').update({ is_subscribed: true }).eq('id', userId);
            if (updateErr) {
                console.error(`[Sync] DB update error:`, updateErr);
                return res.status(500).json({ error: 'Failed to update profile', details: updateErr });
            }

            // Check if wallet entry exists, if not add it
            const { data: existingWallet } = await supabase
                .from('wallet_entries')
                .select('id')
                .eq('profile_id', userId)
                .eq('description', 'Premium Subscription payment to Migonest')
                .limit(1);

            if (!existingWallet || existingWallet.length === 0) {
                await supabase.from('wallet_entries').insert({
                    profile_id: userId,
                    amount: -19.99,
                    type: 'PAYMENT',
                    description: 'Premium Subscription payment to Migonest',
                    status: 'COMPLETED',
                    counterparty_name: 'Migonest',
                    counterparty_role: 'SYSTEM',
                    university: 'Migonest Platform',
                    country: 'Global'
                });
            }

            return res.json({ success: true, activated: true, source: 'stripe', sessionId: successfulSession.id });
        }

        console.log(`[Sync] No paid subscription session found for user ${userId}`);
        return res.json({ success: true, activated: false, message: 'No paid session found on Stripe' });
    } catch (err: any) {
        console.error('[Sync] Error during manual subscription sync:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/create-portal-session', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    try {
        const supabase = getSupabase(req);
        const { data: userProfile } = await supabase.from('profiles').select('email').eq('id', userId).single();
        if (!userProfile?.email) return res.status(400).json({ error: 'User email not found' });

        const stripeInstance = getStripe(req);
        const customers = await stripeInstance.customers.list({
            email: userProfile.email,
            limit: 1
        });

        if (customers.data.length === 0) {
             return res.status(404).json({ error: 'Stripe customer not found' });
        }

        const portalSession = await stripeInstance.billingPortal.sessions.create({
             customer: customers.data[0].id,
             return_url: `${getBaseUrl(req)}/?view=PROFILE`, // Redirect back to profile view
        });

        res.json({ url: portalSession.url });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/subscription-status', async (req, res) => {
    try {
        const userId = req.query.userId as string;
        if (!userId) return res.status(400).json({ error: 'UserId required' });

        const supabase = getSupabase(req);
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();

        let bestSub: any = null;
        const stripeInstance = getStripe(req);

        // Optimized updateBestSub logic
        const updateBestSub = (s: any, vector: string) => {
            if (!s) return;
            
            // SECURITY: Explicitly ignore other apps
            if (s.metadata?.app && s.metadata.app !== 'migonest') {
                return;
            }

            // Only consider active, trialing, OR recently cancelled (but still in period)
            const isValidStatus = s.status === 'active' || s.status === 'trialing' || (s.status === 'canceled' && s.current_period_end > Date.now() / 1000);
            if (!isValidStatus) return;

            // 2. Identify Match Strength
            const hasMigonestId = s.metadata?.migonest_user_id === userId || s.metadata?.userId === userId;
            const hasMigonestApp = s.metadata?.app === 'migonest';
            
            // A match is only "Strong" if it has explicit Migonest identifiers.
            // Generic 'SUBSCRIPTION' tags are treated as "Weak" because multiple apps use them.
            const isStrongMatch = hasMigonestId || hasMigonestApp;
            
            const customerEmail = (s.customer_email || (typeof s.customer === 'object' ? s.customer?.email : ''))?.toLowerCase();
            const emailMatch = customerEmail && profile?.email && customerEmail === profile.email.toLowerCase();
            const isGenericMatch = s.metadata?.type === 'SUBSCRIPTION';
            
            if (!isStrongMatch && !emailMatch && !isGenericMatch) return;

            // 3. Selection Logic
            if (!bestSub) {
                bestSub = s;
                console.log(`[SubscriptionStatus] Initial match ${s.id} (${isStrongMatch ? 'Strong' : 'Weak'}) via ${vector}`);
            } else {
                const wasStrongMatch = bestSub.metadata?.migonest_user_id === userId || 
                                     bestSub.metadata?.userId === userId || 
                                     bestSub.metadata?.app === 'migonest';

                // Rule A: Strong match ALWAYS beats a weak match
                if (isStrongMatch && !wasStrongMatch) {
                    console.log(`[SubscriptionStatus] Upgrading to Strong Match: ${s.id}`);
                    bestSub = s;
                    return;
                }
                
                // Rule B: Weak match NEVER beats a strong match
                if (!isStrongMatch && wasStrongMatch) {
                    return;
                }

                // Rule C: Same strength? Pick the one with the furthest end date
                const sDate = s.current_period_end || 0;
                const bDate = bestSub.current_period_end || 0;
                if (sDate > bDate) {
                    bestSub = s;
                }
            }
        };

        // SEARCH VECTORS
        if (profile?.subscription_id) {
            try {
                const sub = await stripeInstance.subscriptions.retrieve(profile.subscription_id);
                updateBestSub(sub, 'DB_ID');
            } catch (e) {}
        }

        if (!bestSub && profile?.email) {
            try {
                const customers = await stripeInstance.customers.list({ email: profile.email.toLowerCase().trim(), limit: 2 });
                for (const cust of customers.data) {
                    const subs = await stripeInstance.subscriptions.list({ customer: cust.id, status: 'all', limit: 5 });
                    for (const s of subs.data) updateBestSub(s, 'EMAIL_SEARCH');
                }
            } catch (e) {}
        }

        if (!bestSub) {
            try {
                const metaSearch = await stripeInstance.subscriptions.search({
                    query: `metadata["migonest_user_id"]:"${userId}" OR metadata["userId"]:"${userId}"`,
                    limit: 3
                });
                for (const s of metaSearch.data) updateBestSub(s, 'META_SEARCH');
            } catch (e) {}
        }

        // Anniversary Fallback Helper
        const calculateAnniversaryFallback = (p: any, uid: string) => {
            const baseDate = p?.created_at ? new Date(p.created_at) : new Date();
            let nextBilling = new Date(baseDate.getTime());
            const now = new Date();
            while (nextBilling <= now) { nextBilling.setMonth(nextBilling.getMonth() + 1); }
            return Math.floor(nextBilling.getTime() / 1000);
        };

        const isReviewer = profile?.email === 'wahedtestbd1@gmail.com';
        let finalIsSubscribed = isReviewer ? true : (bestSub !== null);
        let currentPeriodEnd = bestSub?.current_period_end || profile?.current_period_end || calculateAnniversaryFallback(profile, userId);

        if (profile?.is_subscribed && !bestSub && !isReviewer) {
            console.warn(`[SubscriptionStatus] Kill-Switch: Deactivating stale flag for ${userId}`);
            finalIsSubscribed = false;
            await supabase.from('profiles').update({ is_subscribed: false, cancel_at_period_end: false }).eq('id', userId);
        } else if (bestSub) {
            // Always sync the latest Stripe state to the DB to avoid timeout fallbacks being wrong
            await supabase.from('profiles').update({ 
                is_subscribed: true, 
                subscription_id: bestSub.id,
                current_period_end: currentPeriodEnd,
                cancel_at_period_end: !!bestSub.cancel_at_period_end || !!bestSub.cancel_at
            }).eq('id', userId);
        }

        return res.json({ 
            isSubscribed: finalIsSubscribed, 
            currentPeriodEnd,
            subscriptionId: bestSub?.id || profile?.subscription_id || null,
            cancelAtPeriodEnd: bestSub ? (!!bestSub.cancel_at_period_end || !!bestSub.cancel_at) : (profile?.cancel_at_period_end || false)
        });
    } catch (error: any) {
        console.error('[SubscriptionStatus] Global Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/resume-subscription', async (req, res) => {
    const { subscriptionId } = req.body;
    if (!subscriptionId) return res.status(400).json({ error: 'Missing subscriptionId' });
    try {
        const stripeInstance = getStripe(req);
        const updatedSub = await stripeInstance.subscriptions.update(subscriptionId, {
            cancel_at_period_end: false
        });
        res.json({ success: true, cancelAtPeriodEnd: updatedSub.cancel_at_period_end });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});


// --- STRIPE CONNECT (PAYOUTS) ---

app.post('/api/connect/create-account-link', async (req, res) => {
    try {
        const { userId, email: customEmail, country: customCountry } = req.body;
        if (!userId) return res.status(400).json({ error: 'Missing userId' });

        const supabaseAdmin = getSupabase(req);
        const { data: profile } = await supabaseAdmin.from('profiles').select('stripe_connect_id, email, full_name, first_name, last_name, payouts_enabled').eq('id', userId).single();

        let stripeAccountId = profile?.stripe_connect_id;
        const stripeInstance = getStripe(req);

        // 1. Check if existing account country matches selection
        if (stripeAccountId && customCountry) {
            try {
                const existingAccount = await stripeInstance.accounts.retrieve(stripeAccountId);
                if (existingAccount.country !== customCountry) {
                    console.log(`[Stripe Connect] Country mismatch: ${existingAccount.country} vs ${customCountry}. Creating new account.`);
                    stripeAccountId = null; // Trigger new account creation
                } else if (!existingAccount.business_profile?.url) {
                    console.log(`[Stripe Connect] Updating existing account ${stripeAccountId} with business URL.`);
                    await stripeInstance.accounts.update(stripeAccountId, {
                        business_profile: { url: 'https://www.migonest.com' }
                    });
                }
            } catch (err) {
                console.error('[Stripe Connect] Error fetching/updating existing account:', err);
                stripeAccountId = null; // Assume we need a new one if fetch fails
            }
        }

        // 2. Create Stripe account if missing or country mismatch
        if (!stripeAccountId) {
            const account = await stripeInstance.accounts.create({
                type: 'express',
                email: customEmail || profile?.email,
                country: customCountry || undefined,
                individual: {
                  email: customEmail || profile?.email,
                  first_name: profile?.first_name || profile?.full_name?.split(' ')[0],
                  last_name: profile?.last_name || profile?.full_name?.split(' ').slice(1).join(' '),
                },
                capabilities: {
                    transfers: { requested: true },
                    card_payments: { requested: true },
                },
                business_type: 'individual',
                business_profile: {
                    url: 'https://www.migonest.com',
                },
                metadata: { userId }
            });
            stripeAccountId = account.id;
            // Update profile with new ID and reset payouts_enabled if we switched accounts
            await supabaseAdmin.from('profiles').update({ 
                stripe_connect_id: stripeAccountId,
                payouts_enabled: false 
            }).eq('id', userId);
        }

        // 2. Create Account Link
        const { platform } = req.body;
        const baseUrl = getBaseUrl(req);
        
        // Use a public success path for mobile to avoid the "logged out" login screen in the in-app browser
        const successPath = (platform === 'native') ? '/stripe-success' : '/wallet';
        
        const accountLink = await stripeInstance.accountLinks.create({
            account: stripeAccountId,
            refresh_url: `${baseUrl}${successPath}?tab=activity&refresh=true`,
            return_url: `${baseUrl}${successPath}?tab=activity&connect=success`,
            type: 'account_onboarding',
        });

        res.json({ url: accountLink.url });
    } catch (error: any) {
        console.error('[Stripe Connect] Error creating account link:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/connect/login-link', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    try {
        const supabase = getSupabase(req);
        const { data: profile } = await supabase.from('profiles').select('stripe_connect_id').eq('id', userId).single();

        if (!profile?.stripe_connect_id) {
            return res.status(400).json({ error: 'No connected Stripe account found' });
        }

        const stripeInstance = getStripe(req);
        const loginLink = await stripeInstance.accounts.createLoginLink(profile.stripe_connect_id);
        res.json({ url: loginLink.url });
    } catch (error: any) {
        // Handle case where Stripe account was deleted/closed/revoked
        const isMissing = error.code === 'resource_missing' || 
                         (error.message && (
                             error.message.includes('No such account') || 
                             error.message.includes('does not exist') || 
                             error.message.includes('revoked')
                         ));

        if (isMissing) {
            console.warn(`[Stripe Connect] Login failed: Account ${userId} missing or revoked. Clearing records.`);
            const supabase = getSupabase(req);
            await supabase.from('profiles')
                .update({ stripe_connect_id: null, payouts_enabled: false })
                .eq('id', userId);
            
            return res.status(404).json({ error: 'Stripe account no longer exists or access was revoked. Please refresh and link again.' });
        }

        console.error('[Stripe Connect] Error creating login link:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/connect/account-status', async (req, res) => {
    const { userId, force } = req.query;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    try {
        const supabase = getSupabase(req);
        const { data: profile } = await supabase.from('profiles').select('stripe_connect_id, payouts_enabled').eq('id', userId as string).single();

        if (!profile?.stripe_connect_id) {
            return res.json({ payouts_enabled: false, stripe_connect_id: null });
        }

        // Sync status from Stripe
        const stripeInstance = getStripe(req);
        const account = await stripeInstance.accounts.retrieve(profile.stripe_connect_id);
        const payoutsEnabled = account.payouts_enabled;

        if (payoutsEnabled !== profile.payouts_enabled) {
            await supabase.from('profiles').update({ payouts_enabled: payoutsEnabled }).eq('id', userId as string);
        }

        res.json({ payouts_enabled: payoutsEnabled, stripe_connect_id: profile.stripe_connect_id });
    } catch (error: any) {
        // Handle case where Stripe account was deleted/closed/revoked
        const isMissing = error.code === 'resource_missing' || 
                         (error.message && (
                             error.message.includes('No such account') || 
                             error.message.includes('does not exist') || 
                             error.message.includes('revoked')
                         ));

        if (isMissing) {
            console.warn(`[Stripe Connect] Status check failed: Account ${userId} missing or revoked. Clearing records.`);
            const supabase = getSupabase(req);
            await supabase.from('profiles')
                .update({ stripe_connect_id: null, payouts_enabled: false })
                .eq('id', userId as string);
            
            return res.json({ payouts_enabled: false, stripe_connect_id: null });
        }

        console.error('[Stripe Connect] Error checking status:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/connect/reset', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    try {
        console.warn(`[Stripe Connect] Manual reset requested for user ${userId}. Clearing records.`);
        const supabase = getSupabase(req);
        await supabase.from('profiles')
            .update({ stripe_connect_id: null, payouts_enabled: false })
            .eq('id', userId);
        
        res.json({ success: true, message: 'Stripe setup has been reset successfully.' });
    } catch (error: any) {
        console.error('[Stripe Connect] Error resetting setup:', error);
        res.status(500).json({ error: error.message });
    }
});



app.post('/api/wallet/withdraw', async (req, res) => {
    const { userId, amount } = req.body;
    if (!userId || !amount) return res.status(400).json({ error: 'Missing parameters' });
    
    const wAmount = Number(amount);
    // Minimum Payout: $50
    if (isNaN(wAmount) || wAmount < 50 || wAmount > 150) {
        return res.status(400).json({ error: 'Withdrawal amount must be between $50 and $150 per day' });
    }

    try {
        const supabase = getSupabase(req);
        
        // 1. Check daily withdrawal limits (excluding FAILED entries)
        const startOfDay = new Date();
        startOfDay.setHours(0,0,0,0);
        
        const { data: todayWithdrawals } = await supabase
            .from('wallet_entries')
            .select('amount')
            .eq('profile_id', userId)
            .eq('type', 'WITHDRAWAL')
            .neq('status', 'FAILED') // Important: ignore failed attempts
            .gte('created_at', startOfDay.toISOString());
            
        const withdrawnToday = (todayWithdrawals || []).reduce((sum: number, entry: any) => sum + Math.abs(Number(entry.amount)), 0);
        if (withdrawnToday + wAmount > 150) {
            return res.status(400).json({ error: `Daily limit exceeded. You have already withdrawn $${withdrawnToday.toFixed(2)} today. Max daily limit is $150.` });
        }

        // 2. Check balance
        const { data: profile } = await supabase.from('profiles').select('wallet_balance, stripe_connect_id, payouts_enabled, full_name').eq('id', userId).single();
        if ((profile?.wallet_balance || 0) < wAmount) {
            return res.status(400).json({ error: 'Insufficient wallet balance' });
        }

        // 3. Check Stripe Connect Setup
        if (!profile?.payouts_enabled || !profile?.stripe_connect_id) {
            return res.status(400).json({ error: 'Please set up your payout method first via Stripe Connect.' });
        }

        // 4. Create COMPLETED wallet entry
        const stripeInstance = getStripe(req);
        let accountDisplayName = profile?.full_name || "Stripe Account";
        
        try {
            console.log(`[Withdrawal] Retrieving Stripe account for: ${profile.stripe_connect_id}`);
            const account = await stripeInstance.accounts.retrieve(profile.stripe_connect_id);
            
            // Try to find the most human-readable name from Stripe
            const stripeName = account.settings?.dashboard?.display_name || 
                             account.business_profile?.name || 
                             (account.individual ? `${account.individual.first_name} ${account.individual.last_name}`.trim() : null);
            
            if (stripeName) {
                accountDisplayName = stripeName;
            } else if (profile?.full_name) {
                accountDisplayName = profile.full_name;
            }
        } catch (err: any) {
            console.error(`[Withdrawal] Failed to fetch account name for ${profile.stripe_connect_id}:`, err);
            // Handle case where account is missing during withdrawal
            const isMissing = err.code === 'resource_missing' || 
                             (err.message && (
                                 err.message.includes('No such account') || 
                                 err.message.includes('does not exist') || 
                                 err.message.includes('revoked')
                             ));

            if (isMissing) {
                console.warn(`[Withdrawal] Account missing or revoked for ${userId}. Clearing records.`);
                await supabase.from('profiles')
                    .update({ stripe_connect_id: null, payouts_enabled: false })
                    .eq('id', userId as string);
                return res.status(400).json({ error: 'Your Stripe account no longer exists or access was revoked. Please re-link your bank account.' });
            }
            // Fallback to profile.full_name is already set in the initializer
        }

        console.log(`[Withdrawal] Inserting wallet entry for user ${userId}, amount -${wAmount}`);
        const { data: entry, error: insertError } = await supabase.from('wallet_entries').insert({
            profile_id: userId,
            amount: -wAmount,
            type: 'WITHDRAWAL',
            description: `Migonest Withdrawal to ${accountDisplayName}`,
            status: 'COMPLETED',
            counterparty_name: accountDisplayName,
            counterparty_role: 'SYSTEM',
            university: 'Migonest Platform',
            country: 'Global'
        }).select().single();

        if (insertError) {
            console.error('[Withdrawal] Wallet insert error:', insertError);
            throw insertError;
        }

        const entryId = entry?.id;
        if (!entryId) {
            console.error('[Withdrawal] No entry ID returned from insert');
            throw new Error('Failed to create wallet transaction record.');
        }

        // 5. Trigger Direct Stripe Transfer
        const amountCents = Math.round(wAmount * 100);
        console.log(`[Withdrawal] Triggering direct transfer for User: ${userId}, Amount: ${amountCents}c, Entry: ${entryId}`);
        
        try {
            const transfer = await stripeInstance.transfers.create({
                amount: amountCents,
                currency: 'usd',
                destination: profile.stripe_connect_id,
                description: `Migonest Direct Withdrawal: ${entryId}`,
                metadata: {
                    walletEntryId: entryId,
                    userId
                }
            });
            console.log(`[Withdrawal] Transfer successful: ${transfer.id}`);
        } catch (transferErr: any) {
            console.error(`[Withdrawal] Stripe Transfer Failed:`, transferErr);
            
            let userMessage = transferErr.message;
            if (transferErr.raw?.code === 'balance_insufficient' || transferErr.message?.includes('insufficient available funds')) {
                userMessage = "Insufficient funds in the Migonest Stripe account for this withdrawal. Please contact Migonest support to resolve this.";
            }

            // Revert the wallet entry to FAILED or similar
            await supabase.from('wallet_entries').update({ 
                status: 'FAILED',
                description: `Migonest Withdrawal failed: ${userMessage}`
            }).eq('id', entryId);
            return res.status(500).json({ error: `Stripe Transfer Failed: ${userMessage}` });
        }

        // 6. Deduct balance in DB
        console.log(`[Withdrawal] Deducting balance via RPC for user: ${userId}`);
        const { error: rpcError } = await supabase.rpc('increment_wallet', { row_id: userId, val: -wAmount });
        if (rpcError) {
            console.error('[Withdrawal] RPC Balance deduction failed:', rpcError);
            throw rpcError;
        }

        res.json({ 
            success: true, 
            message: `Withdrawal of $${wAmount.toFixed(2)} successful! 🚀 The funds have been transferred to your Stripe account and will be paid out to your bank according to your Stripe schedule.`,
            entry 
        });
    } catch (err: any) {
        console.error('[Withdrawal] Final Catch Error:', err);
        res.status(500).json({ error: err.message || 'Unknown withdrawal error' });
    }
});

app.post('/api/admin/approve-withdrawal', async (req, res) => {
    try {
        const { withdrawalId } = req.body;
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

        const token = authHeader.split(' ')[1];
        const supabase = getSupabase(req);
        
        // 1. Verify Admin Role
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return res.status(401).json({ error: 'Session expired' });

        const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (adminProfile?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });

        // 2. Fetch Withdrawal Entry
        const { data: entry, error: entryError } = await supabase
            .from('wallet_entries')
            .select('*, profile:profiles!profile_id(stripe_connect_id)')
            .eq('id', withdrawalId)
            .single();

        if (entryError || !entry) return res.status(404).json({ error: 'Withdrawal not found' });
        if (entry.status !== 'PENDING_APPROVAL') return res.status(400).json({ error: 'Withdrawal is not pending approval' });

        const connectId = entry.profile?.stripe_connect_id;
        if (!connectId) return res.status(400).json({ error: 'User Stripe account not linked' });

        const amountCents = Math.round(Math.abs(entry.amount) * 100);

        // 3. Trigger Stripe Transfer
        console.log(`[Admin] Approving withdrawal ${withdrawalId} for Connect Account ${connectId}, amount: ${amountCents} cents`);
        
        const transfer = await stripe.transfers.create({
            amount: amountCents,
            currency: 'usd',
            destination: connectId,
            description: `Migonest Withdrawal: ${withdrawalId}`,
            metadata: {
                walletEntryId: entry.id,
                userId: entry.profile_id
            }
        });

        // 4. Update Wallet Entry
        await supabase.from('wallet_entries').update({
            status: 'COMPLETED',
            description: entry.description.replace(' (Pending Approval)', '')
        }).eq('id', withdrawalId);

        // 5. Notify User
        await supabase.from('notifications').insert({
            user_id: entry.profile_id,
            title: 'Withdrawal Approved!',
            message: `Your withdrawal of $${Math.abs(entry.amount).toFixed(2)} has been approved and transferred to your Stripe account.`,
            type: 'WALLET',
            read: false,
            timestamp: Date.now()
        });

        res.json({ success: true, transferId: transfer.id });
    } catch (err: any) {
        console.error('[Admin Approval] Error:', err);
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
});

app.post('/api/hire', async (req, res) => {
    const hireSchema = z.object({
        studentId: z.string().uuid(),
        expertId: z.string().uuid(),
        questionnaire: z.any(),
        agreements: z.any(),
        hiringDocuments: z.array(z.any()).optional().default([]),
        platform: z.string().optional(),
        paymentPlan: z.enum(['ONE_TIME', 'INSTALLMENTS']).optional().default('ONE_TIME')
    });

    const validation = hireSchema.safeParse(req.body);
    if (!validation.success) {
        console.error('[Hire] Validation failed:', JSON.stringify(validation.error.format(), null, 2));
        res.status(400).json({ error: 'Invalid hiring request data', details: validation.error.format() });
        return;
    }

    const { studentId, expertId, questionnaire, agreements, hiringDocuments, platform, paymentPlan } = validation.data;
    const TOTAL_FEE = 39900; // $399.00 in cents (Reverted)
    const INSTALLMENT_FEE = 7980; // $79.80 in cents

    try {
        const supabase = getSupabase(req);
        console.log(`[Hire] Request from ${studentId} for expert ${expertId} (platform: ${platform || 'web'})`);

        // Prepare profiles for descriptions and redirects
        const { data: studentProfile } = await supabase.from('profiles').select('full_name, avatar_url, email').eq('id', studentId).single();
        const { data: expertProfile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', expertId).single();

        const { data: existingJourneys, error: findError } = await getSupabase(req)
            .from('service_requests')
            .select('id, status, visa_status')
            .eq('student_id', studentId)
            .eq('expert_id', expertId);

        if (findError) {
            console.error('[Hire] DB Check Error:', findError);
            return res.status(500).json({ error: 'Database check failed.' });
        }

        if (existingJourneys && existingJourneys.length > 0) {
            // A journey is ONLY truly active if it's PAID or ACCEPTED AND not denied
            const activeJourneys = existingJourneys.filter(j => 
                (j.status === 'PAID' || j.status === 'ACCEPTED') && 
                j.visa_status !== 'DENIED' &&
                j.status !== 'REJECTED'
            );

            if (activeJourneys.length > 0) {
                return res.status(400).json({ error: 'You already have an active admission journey with this expert. If this is unexpected, please check your Admission dashboard or contact support.' });
            }
            
            // If only non-active journeys exist, deep clean them to allow a fresh hire
            const toClear = existingJourneys.map(j => j.id);
            
            if (toClear.length > 0) {
                console.log(`[Hire] Found ${toClear.length} old/rejected journeys. Performing deep clean: ${toClear.join(', ')}`);
                const supabaseAdmin = getSupabase(req);
                
                // Cascaded deletion of all related records to avoid FK constraints
                await supabaseAdmin.from('milestone_history').delete().in('service_request_id', toClear);
                await supabaseAdmin.from('admission_step_handshakes').delete().in('service_request_id', toClear);
                await supabaseAdmin.from('documents').delete().in('request_id', toClear);
                await supabaseAdmin.from('wallet_entries').delete().in('request_id', toClear);
                
                // Finally delete the request itself
                const { error: delError } = await supabaseAdmin.from('service_requests').delete().in('id', toClear);
                if (delError) {
                    console.error('[Hire] Failed to clear old journeys:', delError);
                    // Continue anyway, it might just be specific RLS/FK issues
                }
            }
        }

        // 1. Create new PENDING_PAYMENT record
        console.log('[Hire] Creating new PENDING_PAYMENT record');
        const { data: request, error: reqError } = await supabase.from('service_requests').insert({
            student_id: studentId,
            expert_id: expertId,
            status: 'PENDING_PAYMENT',
            current_step: 'REQUIREMENTS',
            fee: TOTAL_FEE / 100,
            payment_plan: paymentPlan,
            questionnaire,
            agreements
        }).select().single();

        if (reqError) {
            console.error('[Hire] Supabase insert error:', reqError);
            throw reqError;
        }

        console.log('[Hire] Service request ready:', request.id);

        // If Stripe keys are missing, fallback to mock (auto-confirm)
        if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'YOUR_STRIPE_SECRET_KEY') {
            console.log('[Hire] Falling back to mock hiring (Missing Stripe Keys)');
            await supabase.from('service_requests').update({ status: 'PAID' }).eq('id', request.id);
            
            const expertPayout = TOTAL_FEE * 0.4;
            // Record mock entries
            await supabase.from('wallet_entries').insert({
                profile_id: expertId,
                amount: expertPayout / 100,
                type: 'EARNING',
                description: 'Initial 40% fee for Journey (Mock)',
                status: 'COMPLETED',
                request_id: request.id,
                counterparty_id: studentId,
                counterparty_role: 'STUDENT'
            });
            await supabase.rpc('increment_wallet', { row_id: expertId, val: expertPayout / 100 });
            await supabase.from('notifications').insert({ 
                user_id: expertId, 
                title: 'New Hire!', 
                message: 'Your admission journey has officially started. Review the requirements to begin.', 
                type: 'ADMISSION' 
            });
            
            res.json({ success: true, mode: 'mock', requestId: request.id });
            return;
        }

        // 2. Create Stripe Session
        const baseUrl = getBaseUrl(req);
        const isNative = platform === 'native';
        
        const successUrl = isNative
            ? `${baseUrl}/stripe-success?type=hire&rid=${request.id}`
            : `${baseUrl}/admission?success=true&rid=${request.id}`;

        console.log('[Hire] Creating Stripe session. successUrl:', successUrl);
        
        try {
            const stripeInstance = getStripe(req);
            
            const isInstallment = paymentPlan === 'INSTALLMENTS';
            
            let sessionConfig: Stripe.Checkout.SessionCreateParams = {
                customer_email: studentProfile?.email || undefined,
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: 'usd',
                        product_data: { 
                            name: `Expert Hire: ${expertProfile?.full_name || 'Expert'}`,
                            description: isInstallment 
                                ? `Admission assistance journey with ${expertProfile?.full_name || 'Expert'} (Installment 1 of 5)` 
                                : `Admission assistance journey with ${expertProfile?.full_name || 'Expert'}`
                        },
                        unit_amount: isInstallment ? INSTALLMENT_FEE : TOTAL_FEE,
                        ...(isInstallment ? { recurring: { interval: 'month' } } : {})
                    },
                    quantity: 1,
                }],
                mode: isInstallment ? 'subscription' : 'payment',
                success_url: successUrl,
                cancel_url: `${baseUrl}/admission?canceled=true&type=hire`,
                metadata: {
                    type: isInstallment ? 'HIRE_INSTALLMENT' : 'HIRE',
                    studentId,
                    expertId,
                    requestId: request.id
                }
            };
            
            if (isInstallment) {
                sessionConfig.subscription_data = {
                    metadata: {
                        type: 'HIRE_INSTALLMENT',
                        studentId,
                        expertId,
                        requestId: request.id
                    }
                };
            }

            const session = await stripeInstance.checkout.sessions.create(sessionConfig);
            console.log('[Hire] Stripe session created:', session.id);
            res.json({ success: true, url: session.url, requestId: request.id });
        } catch (stripeErr: any) {
            console.error('[Hire] Stripe Checkout Error:', stripeErr);
            throw stripeErr;
        }

    } catch (error: any) {
        console.error('[Hire] Fatal Error:', error);
        res.status(500).json({ 
            error: error.message || 'Internal Server Error',
            details: error.details || undefined,
            stack: error.stack 
        });
    }
});

app.post('/api/requests/:id/resume-payment', async (req, res) => {
    const { id } = req.params;
    const TOTAL_FEE = 39900; // $399.00 in cents (Reverted)

    try {
        const supabase = getSupabase(req);
        const { data: request, error: reqError } = await supabase
            .from('service_requests')
            .select('*')
            .eq('id', id)
            .single();

        if (reqError || !request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        if (request.status !== 'PENDING_PAYMENT') {
            return res.status(400).json({ error: 'Request is already paid or processed' });
        }

        const { data: studentEmailProfile } = await supabase.from('profiles').select('email').eq('id', request.student_id).single();
        if (!studentEmailProfile?.email) return res.status(400).json({ error: 'Student email not found' });

        const stripeInstance = getStripe(req);
        const baseUrl = getBaseUrl(req);

        // Robust customer lookup (strong consistency)
        const customers = await stripeInstance.customers.list({
            email: studentEmailProfile.email,
            limit: 1
        });
        const customerId = customers.data[0]?.id;
        const platform = req.body.platform;
        const isNative = platform === 'native';
        const successUrl = isNative
            ? `${baseUrl}/stripe-success?type=hire&rid=${id}`
            : `${baseUrl}/admission?success=true&rid=${id}`;

        const session = await stripeInstance.checkout.sessions.create({
            customer: customerId, // Use ID if found
            customer_email: customerId ? undefined : studentEmailProfile.email, // Fallback to email
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: { name: 'Admission Expert Hire (Resume)' },
                    unit_amount: TOTAL_FEE,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: successUrl,
            cancel_url: `${baseUrl}/admission?canceled=true&type=hire`,
            metadata: {
                type: 'HIRE',
                studentId: request.student_id,
                expertId: request.expert_id,
                requestId: request.id
            }
        });

        res.json({ success: true, url: session.url });
    } catch (error: any) {
        console.error('[ResumePayment] Error:', error.message || error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

app.get('/api/requests/:id/sync-status', async (req, res) => {
    const { id } = req.params;
    console.log(`[SyncStatus] Checking payment status for requestId: ${id}`);

    try {
        const supabase = getSupabase(req);
        
        // 1. Check local status first
        const { data: request, error: reqError } = await supabase
            .from('service_requests')
            .select('*')
            .eq('id', id)
            .single();

        if (reqError || !request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        if (request.status === 'PAID') {
            return res.json({ success: true, status: 'PAID', source: 'db' });
        }

        // 2. If not PAID in DB, check Stripe directly
        console.log(`[SyncStatus] Checking Stripe for requestId: ${id}`);
        const sessions = await stripe.checkout.sessions.list({
            limit: 5,
            expand: ['data.payment_intent']
        });

        // Filter for this specific request in metadata
        const session = sessions.data.find(s => 
            (s.metadata?.requestId === id || s.metadata?.request_id === id) && 
            (s.payment_status === 'paid' || s.status === 'complete')
        );

        if (session) {
            console.log(`[SyncStatus] Found paid session: ${session.id}. Updating DB...`);
            
            // Mirror Webhook Fulfillment Logic
            const { error: updateError } = await supabase
                .from('service_requests')
                .update({ status: 'PAID' })
                .eq('id', id);

            if (updateError) throw updateError;

            // Trigger expert reward (simplified mirror of webhook)
            let sId = session.metadata?.studentId;
            let eId = session.metadata?.expertId;
            let actualFee = 399; // Reverted

            if (!sId || !eId) {
                console.log(`[SyncStatus] Metadata flaky for session ${session.id}, checking DB fallback...`);
                if (request) {
                    sId = sId || request.student_id;
                    eId = eId || request.expert_id;
                    actualFee = request.fee || 399;
                }
            }

            if (sId && eId) {
                const { data: studentProfile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', sId).single();
                const { data: expertProfile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', eId).single();
                
                const expertPayout = actualFee * 0.4;

                // 1. Record Student Payment
                const { error: sEntryError } = await supabase.from('wallet_entries').insert({
                    profile_id: sId,
                    amount: -actualFee,
                    type: 'PAYMENT',
                    description: `$${actualFee} payment for hiring expert`,
                    status: 'COMPLETED',
                    request_id: id,
                    counterparty_id: eId,
                    counterparty_name: expertProfile?.full_name,
                    counterparty_role: 'EXPERT',
                    counterparty_avatar_url: expertProfile?.avatar_url,
                    university: 'Migonest Admission',
                    country: 'Global'
                });
                if (sEntryError) console.error('[Sync Status] Student wallet entry error:', sEntryError.message);

                // 2. Record Expert Earning
                const { error: eEntryError } = await supabase.from('wallet_entries').insert({
                    profile_id: eId,
                    amount: expertPayout,
                    type: 'EARNING',
                    description: `Initial 40% fee for Journey`,
                    status: 'COMPLETED',
                    request_id: id,
                    counterparty_id: sId,
                    counterparty_name: studentProfile?.full_name,
                    counterparty_role: 'STUDENT',
                    counterparty_avatar_url: studentProfile?.avatar_url,
                    university: 'Migonest Admission',
                    country: 'Global'
                });
                if (eEntryError) console.error('[Sync Status] Expert wallet entry error:', eEntryError.message);

                await supabase.rpc('increment_wallet', { row_id: eId, val: expertPayout });
                await supabase.from('notifications').insert({ 
                    user_id: eId, 
                    title: 'New Hire!', 
                    message: 'Your admission journey has officially started.', 
                    type: 'ADMISSION' 
                });
            }

            return res.json({ success: true, status: 'PAID', source: 'stripe_sync' });
        }

        console.log(`[SyncStatus] No paid session found in Stripe for: ${id}`);
        res.json({ success: true, status: request.status, source: 'db_unsynced' });

    } catch (error: any) {
        console.error('[SyncStatus] Error:', error.message || error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

app.delete('/api/requests/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const supabase = getSupabase(req);
        
        // 1. Verify it's a PENDING_PAYMENT request
        const { data: request, error: reqError } = await supabase
            .from('service_requests')
            .select('status, student_id')
            .eq('id', id)
            .single();

        if (reqError || !request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        if (request.status === 'PAID' || request.status === 'COMPLETED') {
            return res.status(400).json({ error: 'Paid or completed journeys cannot be deleted. Please contact support if you need a refund or cancellation.' });
        }

        // 2. Delete related wallet entries if any (defensive)
        await supabase.from('wallet_entries').delete().eq('request_id', id);

        // 3. Delete the request permanently as per user request
        const { error: delError } = await supabase
            .from('service_requests')
            .delete()
            .eq('id', id);
        
        if (delError) throw delError;

        console.log(`[CancelHire] Permanently deleted pending request: ${id}`);
        res.json({ success: true });
    } catch (error: any) {
        console.error('[CancelHire] Error:', error.message || error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});




app.put('/api/requests/:id/handshake/expert', async (req, res) => {
    const { id } = req.params;
    const { feedback, userId } = req.body;
    try {
        const supabase = getSupabase(req);
        const { data: current } = await supabase
            .from('service_requests')
            .select('current_step, milestone_history, student_id')
            .eq('id', id)
            .single();

        const history = current?.milestone_history || [];
        const newEntry = {
            step: current?.current_step,
            type: 'COMPLETED',
            note: feedback?.message || '',
            documentUrl: feedback?.documentUrl,
            timestamp: new Date().toISOString(),
            uploadedBy: userId
        };

        const { error } = await supabase
            .from('service_requests')
            .update({ 
                is_pending_student_confirmation: true,
                is_milestone_rejected: false,
                completion_feedback: feedback || null,
                milestone_history: [...history, newEntry]
            })
            .eq('id', id);
        if (error) throw error;

        await supabase.from('notifications').insert({ 
            user_id: current.student_id, 
            title: 'Milestone Review', 
            message: `The expert completed the ${current.current_step} milestone.`, 
            type: 'ADMISSION' 
        });
        
        // Instant Sync
        broadcastAdmissionUpdate(req, id, current.student_id);
        
        res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/requests/:id/handshake/reject', async (req, res) => {
    const { id } = req.params;
    const { feedback, nextCount, userId } = req.body;
    try {
        const supabase = getSupabase(req);
        const { data: current } = await supabase
            .from('service_requests')
            .select('current_step, milestone_history, expert_id')
            .eq('id', id)
            .single();

        const history = current?.milestone_history || [];
        const newEntry = {
            step: current?.current_step,
            type: 'REJECTED',
            note: feedback?.message || feedback?.note || '',
            documentUrl: feedback?.documentUrl,
            timestamp: new Date().toISOString(),
            uploadedBy: userId
        };

        const { error } = await supabase
            .from('service_requests')
            .update({
                is_milestone_rejected: true,
                is_pending_student_confirmation: false,
                rejection_count: nextCount,
                rejection_feedback: feedback,
                milestone_history: [...history, newEntry]
            })
            .eq('id', id);
        if (error) throw error;

        await supabase.from('notifications').insert({ 
            user_id: current.expert_id, 
            title: 'Milestone Rejected', 
            message: 'Milestone rejected with feedback.', 
            type: 'ADMISSION' 
        });

        // Instant Sync
        broadcastAdmissionUpdate(req, id, current.expert_id);

        res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/requests/:id/handshake/student', async (req, res) => {
    const { id } = req.params;
    const { nextStep, currentStep, completedSteps } = req.body;
    try {
        const isFinal = currentStep === 'ACCOMMODATION';
        const { data: currentRequest } = await getSupabase(req).from('service_requests').select('milestone_dates, completed_steps, fee, questionnaire').eq('id', id).single();

        const milestoneDates = currentRequest?.milestone_dates || {};
        const now = new Date();
        const formattedDate = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
        
        let newCompletedSteps = Array.from(new Set([...(currentRequest?.completed_steps || []), ...completedSteps, currentStep]));
        milestoneDates[currentStep] = formattedDate;

        const updates: any = { 
            is_pending_student_confirmation: false, 
            completed_steps: newCompletedSteps, 
            current_step: isFinal ? 'ACCOMMODATION' : nextStep, // nextStep is calculated in frontend and passed here
            milestone_dates: milestoneDates, 
            rejection_count: 0 
        };

        if (currentStep === 'VISA') {
            // After Visa success, we now continue to ADMITTED
            updates.current_step = 'ADMITTED';
            updates.visa_status = 'APPROVED';
        } else if (currentStep === 'ADMITTED') {
            // After Admitted success, we continue to ACCOMMODATION
            updates.current_step = 'ACCOMMODATION';
        } else if (currentStep === 'ACCOMMODATION') {
            // Final completion after Accommodation
            updates.status = 'COMPLETED'; 
            updates.visa_status = 'APPROVED'; 
        }

        const { error: updateError } = await getSupabase(req).from('service_requests').update(updates).eq('id', id);
        if (updateError) throw updateError;

        if (currentStep === 'VISA' || currentStep === 'ACCOMMODATION') {
            // Escrow Logic - Fractional Release to Expert
            const TOTAL_FEE = currentRequest.fee || 399;
            const payoutPercent = currentStep === 'VISA' ? 0.40 : 0.00; // 40% for Visa success, 0% for final (80% released total)
            const expertBonus = TOTAL_FEE * payoutPercent;
            
            if (expertBonus > 0) {
                // Fetch names for description
                const { data: reqData } = await getSupabase(req).from('service_requests').select('student_id, expert_id').eq('id', id).single();
                if (reqData) {
                    const { data: studentProfile } = await getSupabase(req).from('profiles').select('full_name, avatar_url').eq('id', reqData.student_id).single();
                    
                    const description = `40% payout to Expert on Visa success - Journey with ${studentProfile?.full_name || 'Student'}`;

                    const walletEntry = {
                        profile_id: reqData.expert_id,
                        amount: expertBonus,
                        type: 'UNLOCK',
                        description: description,
                        status: 'COMPLETED',
                        request_id: id,
                        counterparty_id: reqData.student_id,
                        counterparty_name: studentProfile?.full_name,
                        counterparty_role: 'STUDENT',
                        counterparty_avatar_url: studentProfile?.avatar_url,
                        university: currentRequest?.questionnaire?.university || 'Migonest Admission',
                        country: currentRequest?.questionnaire?.country || 'Global'
                    };
                    
                    const { error: insertErr } = await getSupabase(req).from('wallet_entries').insert(walletEntry).select().single();
                    if (insertErr) {
                        console.error(`[Handshake] CRITICAL: Failed to insert ${payoutPercent*100}% ${currentStep} payout to Expert:`, insertErr);
                    }
                    
                    await getSupabase(req).rpc('increment_wallet', { row_id: reqData.expert_id, val: expertBonus });
                    
                    const notifTitle = 'Visa Success Bonus! 🎉';
                    const notifMsg = `$${expertBonus.toFixed(2)} added to your wallet for Visa success! Journey continues to final stages.`;

                    await getSupabase(req).from('notifications').insert({ user_id: reqData.expert_id, title: notifTitle, message: notifMsg, type: 'WALLET' });
                }
            }

            if (currentStep === 'ACCOMMODATION') {
                const { data: reqData } = await getSupabase(req).from('service_requests').select('student_id, expert_id').eq('id', id).single();
                if (reqData) {
                    const studentNotifMsg = 'Congratulations! Your journey to study abroad is now completely successful and finished.';
                    await getSupabase(req).from('notifications').insert({ 
                        user_id: reqData.student_id, 
                        title: 'Journey Completed! 🏆', 
                        message: studentNotifMsg, 
                        type: 'ADMISSION' 
                    });
                    
                    await getSupabase(req).from('notifications').insert({ 
                        user_id: reqData.expert_id, 
                        title: 'Journey Completed! 🏆', 
                        message: 'The journey has been marked as fully completed. Excellent work!', 
                        type: 'ADMISSION' 
                    });
                }
            }
        }

        // --- NEW: ADMISSION Notification for Expert ---
        // This ensures the Expert's app re-fetches the journey status immediately.
        const { data: rd } = await getSupabase(req).from('service_requests').select('expert_id').eq('id', id).single();
        if (rd) {
            await getSupabase(req).from('notifications').insert({ 
                user_id: rd.expert_id, 
                title: 'Milestone Approved', 
                message: `The student approved the ${currentStep} milestone.`, 
                type: 'ADMISSION' 
            });

            // Instant Sync
            broadcastAdmissionUpdate(req, id, rd.expert_id);
        }

        res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/requests/:id/report-visa-rejection', async (req, res) => {
    const { id } = req.params;
    const { proofUrl } = req.body;
    try {
        const { error } = await getSupabase(req)
            .from('service_requests')
            .update({ 
                visa_denial_proof_url: proofUrl, 
                is_milestone_rejected: true,
                is_pending_student_confirmation: false 
            })
            .eq('id', id);
        if (error) throw error;

        // --- NEW: ADMISSION Notification for Expert ---
        const { data: reqData } = await getSupabase(req).from('service_requests').select('expert_id').eq('id', id).single();
        if (reqData) {
            await getSupabase(req).from('notifications').insert({ 
                user_id: reqData.expert_id, 
                title: 'Visa Rejection Reported', 
                message: 'A student has reported a visa rejection for review.', 
                type: 'ADMISSION' 
            });

            // Instant Sync
            broadcastAdmissionUpdate(req, id, reqData.expert_id);
        }

        res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/requests/:id/deny-confirm', async (req, res) => {
    const { id } = req.params;
    try {
        const supabaseAdmin = getSupabase(req);
        const { data: request, error: fetchError } = await supabaseAdmin.from('service_requests').select('student_id, expert_id, fee, questionnaire').eq('id', id).single();
        if (fetchError) throw fetchError;

        const { error: updateError } = await supabaseAdmin.from('service_requests').update({ status: 'COMPLETED', visa_status: 'DENIED', is_milestone_rejected: false }).eq('id', id);
        if (updateError) {
            console.error('[DenyConfirm] Failed to update request:', updateError);
            return res.status(500).json({ error: 'Failed to update service request status.' });
        }

        // 0. Fetch profiles for notifications and wallet
        const { data: studentProf } = await supabaseAdmin.from('profiles').select('full_name, avatar_url').eq('id', request.student_id).single();
        const { data: expertProf } = await supabaseAdmin.from('profiles').select('full_name, avatar_url').eq('id', request.expert_id).single();

        // Escrow logic - Visa Rejection: 20% Refund to Student, 20% Payout to Expert
        const TOTAL_FEE = request.fee || 399;
        const expertBonus = TOTAL_FEE * 0.20;
        const studentRefund = TOTAL_FEE * 0.20;

        // 1. Release 20% to Expert
        const expertWalletEntry = {
            profile_id: request.expert_id,
            amount: expertBonus,
            type: 'EARNING',
            description: `20% payout on Visa rejection - Journey with ${studentProf?.full_name || 'Student'}`,
            status: 'COMPLETED',
            request_id: id,
            counterparty_id: request.student_id,
            counterparty_name: studentProf?.full_name,
            counterparty_role: 'STUDENT',
            counterparty_avatar_url: studentProf?.avatar_url,
            university: request.questionnaire?.university || 'Migonest Admission',
            country: request.questionnaire?.country || 'Global'
        };

        const { error: insertErr1 } = await supabaseAdmin.from('wallet_entries').insert(expertWalletEntry);
        if (insertErr1) console.error('[DenyConfirm] CRITICAL: Failed to insert Expert payout:', insertErr1);

        await supabaseAdmin.rpc('increment_wallet', { row_id: request.expert_id, val: expertBonus });
        
        await supabaseAdmin.from('notifications').insert([
            { 
                user_id: request.expert_id, 
                title: 'Visa Denied', 
                message: `$${expertBonus.toFixed(2)} compensation released from escrow. Journey closed.`, 
                type: 'WALLET' 
            },
            { 
                user_id: request.expert_id, 
                title: 'Journey Closed', 
                message: `Verification complete. The admission journey with ${studentProf?.full_name || 'Student'} is now officially closed following visa denial.`, 
                type: 'ADMISSION' 
            }
        ]);

        // 2. Refund 20% to Student
        const studentWalletEntry = {
            profile_id: request.student_id,
            amount: studentRefund,
            type: 'REFUND',
            description: `20% refund on Visa rejection - Expert: ${expertProf?.full_name || 'Expert'}`,
            status: 'COMPLETED',
            request_id: id,
            counterparty_id: request.expert_id,
            counterparty_name: expertProf?.full_name,
            counterparty_role: 'EXPERT',
            counterparty_avatar_url: expertProf?.avatar_url,
            university: request.questionnaire?.university || 'Migonest Admission',
            country: request.questionnaire?.country || 'Global'
        };

        const { error: insertErr2 } = await supabaseAdmin.from('wallet_entries').insert(studentWalletEntry);
        if (insertErr2) console.error('[DenyConfirm] CRITICAL: Failed to insert Student refund:', insertErr2);

        await supabaseAdmin.rpc('increment_wallet', { row_id: request.student_id, val: studentRefund });
        
        await supabaseAdmin.from('notifications').insert([
            { 
                user_id: request.student_id, 
                title: 'Visa Refund', 
                message: `$${studentRefund.toFixed(2)} (20% of fee) has been refunded to your wallet.`, 
                type: 'WALLET' 
            },
            { 
                user_id: request.student_id, 
                title: 'Journey Closed', 
                message: 'Visa rejection verified. Your journey is closed. Please share your experience and submit feedback.', 
                type: 'ADMISSION' 
            }
        ]);

        // Instant Sync for both
        broadcastAdmissionUpdate(req, id, request.student_id);
        broadcastAdmissionUpdate(req, id, request.expert_id);

        res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// Expert Application Review & Notify
// Expert Application Approval Notification
app.post('/api/expert-applications/:id/notify-approved', async (req, res) => {
    const { id } = req.params;

    const { userId } = req.query;
    const supabase = getSupabase(req);

    try {
        // 1. Verify Application Status is actually APPROVED
        const { data: appData } = await supabase
            .from('expert_applications')
            .select('student_id, status, data')
            .eq('id', id)
            .single();

        if (!appData || appData.status !== 'APPROVED') {
            return res.status(400).json({ error: 'Application not found or not approved' });
        }

        // 1.5 Sync Profile Data from Application (`expert_applications.data` -> `profiles`)
        if (appData.data?.formData) {
            const form = appData.data.formData;
            const updates: any = {};
            const toArray = (str: any) => (typeof str === 'string' ? str.split(',').map((s: string) => s.trim()).filter(Boolean) : Array.isArray(str) ? str : []);

            if (form.education) updates.highest_qualifications = toArray(form.education);
            if (form.languages) updates.languages = toArray(form.languages);
            if (form.residency) updates.current_location = form.residency;
            if (form.nationality) updates.home_countries = toArray(form.nationality);
            if (form.currentStudies) updates.current_studies = toArray(form.currentStudies);
            if (form.assistedCountries) updates.target_countries = toArray(form.assistedCountries);
            updates.role = 'EXPERT';

            if (Object.keys(updates).length > 0) {
                const { error: updateError } = await supabase.from('profiles').update(updates).eq('id', appData.student_id);

                if (updateError) {
                    console.error('[Backend] Profile sync failed:', updateError);
                } else {
                    console.log('[Backend] Profile synced successfully');
                }
            }
        }

        // 2. Send Email (Log for now)
        const { data: userData } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', appData.student_id)
            .single();

        if (userData?.email) {
            console.log(`[Email] 📧 Sending 'Expert Approval' email to user ID: ${appData.student_id}`);

            try {
                const emailResponse = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from: 'Migonest <team@migonest.com>',
                        to: userData.email,
                        subject: 'Congratulations! You are now a Uni Expert',
                        html: `
                            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                                <h2 style="color: #02569B;">Welcome to the Expert Team!</h2>
                                <p>Hi ${userData.full_name},</p>
                                <p>We are thrilled to inform you that your application to become a <strong>Uni Expert</strong> has been approved!</p>
                                <p>You can now connect with Students and start earning money while guiding Students.</p>
                                <br/>
                                <a href="https://migonest.com/" style="background-color: #02569B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Migonest</a>
                                <br/><br/>
                                <p>Best regards,<br/>The Migonest Team</p>
                            </div>
                        `
                    })
                });

                if (!emailResponse.ok) {
                    const errText = await emailResponse.text();
                    console.error('[Email] Failed to send email via Resend:', errText);
                } else {
                    console.log('[Email] Email sent successfully via Resend.');
                }
            } catch (emailErr) {
                console.error('[Email] Verification email fetch error:', emailErr);
            }
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error('Expert notification error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Notify Admin of New Expert Application
app.post('/api/expert-applications/:id/notify-admin', async (req, res) => {
    const { id } = req.params;

    try {
        const supabase = getSupabase(req);

        // 1. Get Application Details
        const { data: appData } = await supabase
            .from('expert_applications')
            .select('student_name')
            .eq('id', id)
            .single();

        if (!appData) {
            res.status(404).json({ error: 'Application not found' });
            return;
        }

        // 2. Get All Admins
        const { data: admins } = await supabase
            .from('profiles')
            .select('email')
            .eq('role', 'ADMIN');

        if (!admins || admins.length === 0) {
            console.log('[Email] No admins found to notify.');
            res.json({ success: true, message: 'No admins found' });
            return;
        }

        console.log(`[Email] Found ${admins.length} admins to notify.`);

        // 3. Send Email to each Admin
        const sendPromises = admins
            .filter((admin: any) => admin.email)
            .map(async (admin: any) => {
                try {
                    const emailResponse = await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            from: 'Migonest <team@migonest.com>',
                            to: admin.email,
                            subject: `New Expert Application: ${appData.student_name}`,
                            html: `
                                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                                    <h2 style="color: #02569B;">New Expert Application</h2>
                                    <p><strong>${appData.student_name}</strong> has applied to become a Uni Expert.</p>
                                    <p>Please review their application in the admin dashboards.</p>
                                    <br/>
                                    <a href="https://migonest.com/expert_reviews" style="background-color: #02569B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Review Application</a>
                                    <br/><br/>
                                    <p>Best regards,<br/>The Migonest Team</p>
                                </div>
                            `
                        })
                    });

                    if (!emailResponse.ok) {
                        console.error(`[Email] Failed to send to admin ${admin.email}:`, await emailResponse.text());
                    }
                } catch (err) {
                    console.error(`[Email] Error sending to admin ${admin.email}:`, err);
                }
            });

        await Promise.all(sendPromises);

        res.json({ success: true });
    } catch (error: any) {
        console.error('Admin notification error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Delete Account
 * Permanently deletes the user from Supabase Auth and all related tables.
 * High-privilege operation requiring service_role key.
 */
app.post('/api/delete-account', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Missing authorization header' });

    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabase(req);

    try {
        // 1. Verify user identity using the token
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            console.error('[DeleteAccount] Auth Error:', authError);
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        console.log(`[DeleteAccount] Initializing deletion for: ${user.email} (${user.id})`);

        // 2. SAFETY CHECKS: Prevent deletion if there are active commitments
        const { data: profile } = await supabase.from('profiles').select('is_subscribed, wallet_balance').eq('id', user.id).single();
        
        // 2a. Check Wallet Balance
        if (profile?.wallet_balance && profile.wallet_balance > 0) {
            return res.status(400).json({ 
                error: 'Account Cannot Be Deleted',
                message: `You still have a balance of $${profile.wallet_balance.toFixed(2)} in your wallet. Please withdraw or spend your funds before deleting your account.` 
            });
        }

        // 2c. Check Ongoing Admission Journeys
        const { data: activeJourneys } = await supabase
            .from('service_requests')
            .select('id')
            .or(`student_id.eq.${user.id},expert_id.eq.${user.id}`)
            .not('status', 'in', '("COMPLETED","REJECTED")')
            .limit(1);

        if (activeJourneys && activeJourneys.length > 0) {
             return res.status(400).json({ 
                error: 'Account Cannot Be Deleted',
                message: 'You have ongoing Admission Journeys. Please complete or cancel all active journeys before deleting your account.' 
            });
        }

        // 3. Perform manual profile deletion to guarantee public data removal
        const { error: profileDeleteError } = await supabase.from('profiles').delete().eq('id', user.id);
        if (profileDeleteError) {
            console.error('[DeleteAccount] Failed to explicitly delete profile:', profileDeleteError);
        }

        // 4. Perform hard deletion using admin privileges
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id, false);
        
        if (deleteError) {
            console.error('[DeleteAccount] Failed to delete user from Supabase Auth:', deleteError);
            throw deleteError;
        }

        console.log(`[DeleteAccount] User ${user.id} deleted successfully.`);
        res.json({ success: true, message: 'Your account and all associated data have been permanently deleted.' });
    } catch (error: any) {
        console.error('[DeleteAccount] Unexpected Error:', error.message);
        res.status(500).json({ error: 'Failed to delete account. Please contact support.' });
    }
});

// --- Global Catch-all for 404 ---
app.use((req, res) => {
    console.warn(`[404] ${req.method} ${req.url}`);
    res.status(404).json({ error: 'Route not found' });
});

// --- Global Error Handler (CRITICAL for preventing text/plain 500s) ---
app.use((err: any, req: any, res: any, next: any) => {
    console.error('[Global Error Handler]', err);
    res.status(500).json({ 
        error: 'Global Server Error',
        message: err.message || 'Unknown error',
        stack: err.stack
    });
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Pass to Express since cors middleware handles everything natively
    return app(req, res);
}


// ==========================================
// ANALYTICS EVENTS
// ==========================================
import { UAParser } from 'ua-parser-js';

app.post('/api/analytics/track', async (req, res) => {
    try {
        const { event_name, user_id, metadata } = req.body;

        if (!event_name) {
            return res.status(400).json({ error: 'event_name is required' });
        }

        const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
        const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        const country = req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'] || null;
        const city = req.headers['x-vercel-ip-city'] || null;
        const userAgent = req.headers['user-agent'] || '';

        const parser = new UAParser(userAgent);
        const deviceType = parser.getDevice().type || 'desktop';
        const browser = parser.getBrowser().name || 'Unknown';

        const { error } = await supabase
            .from('analytics_events')
            .insert({
                event_name,
                user_id: user_id || null,
                country,
                city,
                device_type: deviceType,
                browser,
                metadata: metadata || {}
            });

        if (error) {
            console.error('[Analytics] Insert Error:', error);
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).json({ success: true });
    } catch (err: any) {
        console.error('[Analytics] Handler Error:', err);
        return res.status(500).json({ error: err.message });
    }
});

// --- 404 CATCH-ALL
// --- 404 CATCH-ALL (JSON for diagnostics) ---
app.use((req, res) => {
    console.error(`[404] Not Found: ${req.method} ${req.url}`);
    res.status(404).json({
        error: "Not Found",
        message: `Route ${req.method} ${req.url} not found on this API instance.`,
        diagnostics: {
            method: req.method,
            path: req.path,
            originalUrl: req.originalUrl,
            url: req.url,
            env: process.env.NODE_ENV,
            timestamp: new Date().toISOString()
        }
    });
});
