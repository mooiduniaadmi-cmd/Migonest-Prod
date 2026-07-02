import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import { z } from 'zod';
import Stripe from 'stripe';

dotenv.config();

// Stripe Setup
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-01-27.acacia' as any,
});

const app = express();

// 0. Security Middleware (Very top)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com", "https://*.supabase.co"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://*.supabase.co", "https://*.stripe.com", "https://www.migonest.com"],
      connectSrc: ["'self'", "https://*.supabase.co", "https://*.stripe.com", "https://api.resend.com", "https://gwengahnqgvwoletcovl.supabase.co", "https://kogedepjtwfritbzshgq.supabase.co"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
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
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter to all API routes
app.use('/api/', limiter);

// 1. Logging Middleware (Very top for debugging)
app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.url} (Origin: ${req.headers.origin || 'None'})`);
  next();
});

// 2. Standard CORS
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['X-Requested-With', 'Content-Type', 'Authorization', 'apikey', 'x-client-info', 'x-supabase-auth', 'Accept', 'Accept-Version', 'Content-Length', 'Content-MD5', 'Date', 'X-Api-Version']
}));

// 3. URL Normalization (Handle stripping of /api in Vercel functions)
app.use((req, res, next) => {
  if (req.url.startsWith('/requests/') && !req.url.startsWith('/api/')) {
    req.url = '/api' + req.url;
  }
  next();
});

// 4. Body Parser
// IMPORTANT: express.json() MUST be after the webhook route to avoid breaking raw body parsing
app.use(express.json({ limit: '10mb' }) as any);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.get('/api/requests/:id/sync-status', async (req, res) => {
    const { id } = req.params;
    console.log(`[SyncStatus] Checking payment status for requestId: ${id}`);

    try {
        const supabase = createClient(process.env.SUPABASE_URL || 'https://gwengahnqgvwoletcovl.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
        
        const { data: request, error: reqError } = await supabase
            .from('service_requests')
            .select('*')
            .eq('id', id)
            .single();

        if (reqError || !request) return res.status(404).json({ error: 'Request not found' });
        if (request.status === 'PAID') return res.json({ success: true, status: 'PAID', source: 'db' });

        const sessions = await stripe.checkout.sessions.list({ limit: 5 });
        const session = sessions.data.find(s => (s.metadata?.requestId === id || s.metadata?.request_id === id) && (s.payment_status === 'paid' || s.status === 'complete'));

        if (session) {
            await supabase.from('service_requests').update({ status: 'PAID' }).eq('id', id);
            
            const TOTAL_FEE = 399; // $399
            const expertPayout = TOTAL_FEE * 0.4;
            const studentId = session.metadata?.studentId;
            const expertId = session.metadata?.expertId;

            if (studentId && expertId) {
                const { data: studentProfile } = await supabase.from('profiles').select('full_name').eq('id', studentId).single();
                await supabase.from('wallet_entries').insert({
                    profile_id: expertId,
                    amount: expertPayout,
                    type: 'EARNING',
                    description: `Initial release for Journey with ${studentProfile?.full_name || 'Student'}`,
                    status: 'COMPLETED',
                    request_id: id,
                    counterparty_id: studentId,
                    counterparty_role: 'STUDENT',
                    university: 'Migonest Admission',
                    country: 'Global'
                });
                await supabase.rpc('increment_wallet', { row_id: expertId, val: expertPayout });
                await supabase.from('notifications').insert({ user_id: expertId, title: 'New Hire!', message: 'Your admission journey has started.', type: 'ADMISSION' });
            }
            return res.json({ success: true, status: 'PAID', source: 'stripe_sync' });
        }
        res.json({ success: true, status: request.status, source: 'db_unsynced' });
    } catch (error: any) {
        console.error('[SyncStatus] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/requests/:id/report-visa-rejection', async (req, res) => {
    const { id } = req.params;
    const { proofUrl } = req.body;
    try {
        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { error } = await supabase
            .from('service_requests')
            .update({ 
                visa_denial_proof_url: proofUrl, 
                is_milestone_rejected: true,
                is_pending_student_confirmation: false 
            })
            .eq('id', id);
        if (error) throw error;
        res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// Mirroring the webhook handler to server.ts for environment parity
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const rawBody = req.body; 
    let event: Stripe.Event;

    try {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
        if (!webhookSecret) return res.status(500).send('Webhook configuration error');
        event = stripe.webhooks.constructEvent(rawBody, sig as string, webhookSecret);
    } catch (err: any) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        const { type, userId, requestId: metaRid, expertId, studentId } = metadata;
        const requestId = metaRid || metadata.request_id;

        try {
            const supabase = createClient(process.env.SUPABASE_URL || 'https://gwengahnqgvwoletcovl.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
            if ((type === 'HIRE' || type === 'HIRE_INSTALLMENT') && requestId) {
                const updatePayload: any = { status: 'PAID' };
                if (type === 'HIRE_INSTALLMENT' && session.subscription) {
                    updatePayload.stripe_subscription_id = session.subscription as string;
                }
                const { data: updatedData } = await supabase.from('service_requests').update(updatePayload).eq('id', requestId).select();
                
                if (updatedData && updatedData.length > 0) {
                    if (type === 'HIRE') {
                        const TOTAL_FEE = 399; 
                        const expertPayout = TOTAL_FEE * 0.4;
                    
                    const { data: studentProfile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', studentId).single();
                    const { data: expertProfile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', expertId).single();

                    // 1. Record Student Payment
                    await supabase.from('wallet_entries').insert({
                        profile_id: studentId,
                        amount: -TOTAL_FEE,
                        type: 'PAYMENT',
                        description: `$${TOTAL_FEE} payment for hiring Expert: ${expertProfile?.full_name || 'Expert'}`,
                        status: 'COMPLETED',
                        request_id: requestId,
                        counterparty_id: expertId,
                        counterparty_name: expertProfile?.full_name,
                        counterparty_role: 'EXPERT',
                        counterparty_avatar_url: expertProfile?.avatar_url,
                        university: 'Migonest Admission',
                        country: 'Global'
                    });

                    // 2. Record Expert Earning
                    await supabase.from('wallet_entries').insert({
                        profile_id: expertId,
                        amount: expertPayout,
                        type: 'EARNING',
                        description: `Initial release for Journey with ${studentProfile?.full_name || 'Student'}`,
                        status: 'COMPLETED',
                        request_id: requestId,
                        counterparty_id: studentId,
                        counterparty_name: studentProfile?.full_name,
                        counterparty_role: 'STUDENT',
                        counterparty_avatar_url: studentProfile?.avatar_url,
                        university: 'Migonest Admission',
                        country: 'Global'
                    });

                    await supabase.rpc('increment_wallet', { row_id: expertId, val: expertPayout });
                    
                    // Notifications
                    await supabase.from('notifications').insert([
                        { user_id: studentId, title: 'Expert Hired', message: `You have successfully hired ${expertProfile?.full_name || 'an expert'}. Journey started!`, type: 'WALLET' },
                        { user_id: expertId, title: 'New Hire!', message: `Your admission journey with ${studentProfile?.full_name || 'a student'} has started.`, type: 'ADMISSION' }
                    ]);
                    } else if (type === 'HIRE_INSTALLMENT') {
                        // The actual wallet distribution for installments happens in invoice.paid
                        const { data: studentProfile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', studentId).single();
                        const { data: expertProfile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', expertId).single();
                        await supabase.from('notifications').insert([
                            { user_id: studentId, title: 'Expert Hired (Installments)', message: `You have successfully hired ${expertProfile?.full_name || 'an expert'}. Journey started!`, type: 'WALLET' },
                            { user_id: expertId, title: 'New Hire!', message: `Your admission journey with ${studentProfile?.full_name || 'a student'} has started on an installment plan.`, type: 'ADMISSION' }
                        ]);
                    }
                }
            } else if (type === 'SUBSCRIPTION' && userId) {
                await supabase.from('profiles').update({ is_subscribed: true }).eq('id', userId);
                
                // Process Referral Reward for Stripe
                const referrerId = metadata.referrerId;
                if (referrerId) {
                    const { data: subscriber } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
                    await supabase.from('wallet_entries').insert({
                        profile_id: referrerId,
                        amount: 2.00,
                        type: 'EARNING',
                        description: `Referral Reward: ${subscriber?.full_name || 'New user'} subscribed to Premium`,
                        status: 'COMPLETED',
                        counterparty_id: userId,
                        counterparty_name: subscriber?.full_name,
                        counterparty_role: 'SUBSCRIBER'
                    });
                    await supabase.rpc('increment_wallet', { row_id: referrerId, val: 2.00 });
                    await supabase.from('notifications').insert({
                        user_id: referrerId,
                        title: 'New Referral Reward! 🎁',
                        message: `You earned $2.00 because ${subscriber?.full_name || 'a user'} joined Premium using your link.`,
                        type: 'WALLET'
                    });
                }
            }
        } catch (dbErr: any) {
            console.error('[Webhook] DB Error:', dbErr.message);
            return res.status(500).send('Database error');
        }
    } else if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
        const subscription = event.data.object as any;
        const userId = subscription.metadata?.migonest_user_id || subscription.metadata?.userId;
        const status = subscription.status;
        const isCurrentlyActive = (status === 'active' || status === 'trialing');
        
        if (userId) {
            try {
                const supabase = createClient(process.env.SUPABASE_URL || 'https://gwengahnqgvwoletcovl.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
                const updateData: any = { 
                    is_subscribed: isCurrentlyActive,
                    current_period_end: subscription.current_period_end 
                };
                
                if (event.type === 'customer.subscription.deleted') {
                    updateData.subscription_id = null;
                    updateData.current_period_end = null;
                } else {
                    updateData.subscription_id = subscription.id;
                }

                await supabase.from('profiles').update(updateData).eq('id', userId);
                console.log(`[Stripe Webhook] Syncing subscription ${subscription.id} for user ${userId}. Active: ${isCurrentlyActive}`);
            } catch (err: any) {
                console.error(`[Stripe Webhook] Database error on subscription sync: ${err.message}`);
            }
        }
    } else if (event.type === 'invoice.paid') {
        const invoice = event.data.object as any;
        if (invoice.subscription) {
            const subscriptionId = invoice.subscription as string;
            try {
                const supabase = createClient(process.env.SUPABASE_URL || 'https://gwengahnqgvwoletcovl.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
                const sub = await stripe.subscriptions.retrieve(subscriptionId) as any;
                
                if (sub.metadata?.type === 'HIRE_INSTALLMENT') {
                    const { expertId, studentId, requestId } = sub.metadata;
                    
                    const { data: sr } = await supabase.from('service_requests').select('installments_paid').eq('id', requestId).single();
                    const newCount = (sr?.installments_paid || 0) + 1;
                    
                    await supabase.from('service_requests').update({ 
                        installments_paid: newCount,
                        is_locked: false
                    }).eq('id', requestId);
                    
                    const INSTALLMENT_TOTAL = 79.80;
                    const expertPayout = INSTALLMENT_TOTAL * 0.4;
                    
                    const { data: studentProfile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', studentId).single();
                    const { data: expertProfile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', expertId).single();

                    await supabase.from('wallet_entries').insert({
                        profile_id: studentId, amount: -INSTALLMENT_TOTAL, type: 'PAYMENT',
                        description: `Installment ${newCount}/5 for Expert: ${expertProfile?.full_name || 'Expert'}`, status: 'COMPLETED',
                        request_id: requestId, counterparty_id: expertId, counterparty_name: expertProfile?.full_name,
                        counterparty_role: 'EXPERT', counterparty_avatar_url: expertProfile?.avatar_url,
                        university: 'Migonest Admission', country: 'Global'
                    });

                    await supabase.from('wallet_entries').insert({
                        profile_id: expertId, amount: expertPayout, type: 'EARNING',
                        description: `Release (Installment ${newCount}/5) for Journey with ${studentProfile?.full_name || 'Student'}`, status: 'COMPLETED',
                        request_id: requestId, counterparty_id: studentId, counterparty_name: studentProfile?.full_name,
                        counterparty_role: 'STUDENT', counterparty_avatar_url: studentProfile?.avatar_url,
                        university: 'Migonest Admission', country: 'Global'
                    });

                    await supabase.rpc('increment_wallet', { row_id: expertId, val: expertPayout });
                    
                    if (newCount >= 5) {
                        console.log(`[Stripe Webhook] 5th installment paid. Cancelling subscription ${subscriptionId}`);
                        await stripe.subscriptions.cancel(subscriptionId);
                    }
                } else if (invoice.billing_reason === 'subscription_cycle') {
                    const userId = sub.metadata?.migonest_user_id || sub.metadata?.userId;
                    if (userId) {
                        await supabase.from('profiles').update({ 
                            is_subscribed: true,
                            subscription_id: subscriptionId,
                            current_period_end: sub.current_period_end
                        }).eq('id', userId);
                    }
                }
            } catch (err: any) {
                console.error(`[Stripe Webhook] Renewal error: ${err.message}`);
            }
        }
    } else if (event.type === 'invoice.payment_failed') {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string;
        
        if (subscriptionId) {
            try {
                const sub = await stripe.subscriptions.retrieve(subscriptionId) as any;
                if (sub.metadata?.type === 'HIRE_INSTALLMENT') {
                    const requestId = sub.metadata.requestId;
                    console.log(`[Stripe Webhook] Installment failed. Locking journey ${requestId}`);
                    const supabase = createClient(process.env.SUPABASE_URL || 'https://gwengahnqgvwoletcovl.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
                    await supabase.from('service_requests').update({ is_locked: true }).eq('id', requestId);
                } else {
                    console.log(`[Stripe Webhook] Payment failed for invoice ${invoice.id}. Cancelling subscription ${subscriptionId} immediately.`);
                    await stripe.subscriptions.cancel(subscriptionId);
                }
            } catch (err: any) {
                console.error(`[Stripe Webhook] Error on payment failure logic: ${err.message}`);
            }
        }
    }
    res.json({ received: true });
});

// 5. RevenueCat Webhook (iOS Subscriptions)
app.get('/api/revenuecat-webhook', (req, res) => res.json({ status: 'active', message: 'RevenueCat Webhook endpoint is reachable. Actual events must use POST.' }));
app.post('/api/revenuecat-webhook', async (req, res) => {
    // Note: Secure this with a custom header or RevenueCat Auth if desired
    const { event } = req.body;

    if (!event) return res.status(400).send('Missing event data');

    const { type, app_user_id, subscriber_attributes } = event;
    const referrerId = subscriber_attributes?.referrerId?.value;

    console.log(`[RevenueCat Webhook] Received ${type} for user: ${app_user_id} (Referrer: ${referrerId || 'None'})`);

    try {
        const supabase = createClient(process.env.SUPABASE_URL || 'https://gwengahnqgvwoletcovl.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
        
        // Handle subscription lifecycle events
        if (type === 'INITIAL_PURCHASE' || type === 'RENEWAL' || type === 'UNCANCELLATION') {
            await supabase.from('profiles').update({ is_subscribed: true }).eq('id', app_user_id);
            console.log(`[RevenueCat] User ${app_user_id} is now PREMIUM`);

            // Apply Referral Reward on Initial Purchase
            if (type === 'INITIAL_PURCHASE' && referrerId) {
                const { data: subscriber } = await supabase.from('profiles').select('full_name').eq('id', app_user_id).single();
                await supabase.from('wallet_entries').insert({
                    profile_id: referrerId,
                    amount: 2.00,
                    type: 'EARNING',
                    description: `Referral Reward: ${subscriber?.full_name || 'New user'} subscribed to Premium (Apple)`,
                    status: 'COMPLETED',
                    counterparty_id: app_user_id,
                    counterparty_name: subscriber?.full_name,
                    counterparty_role: 'SUBSCRIBER'
                });
                await supabase.rpc('increment_wallet', { row_id: referrerId, val: 2.00 });
                await supabase.from('notifications').insert({
                    user_id: referrerId,
                    title: 'New Referral Reward! 🎁',
                    message: `You earned $2.00 because ${subscriber?.full_name || 'a user'} joined Premium using your link on iOS.`,
                    type: 'WALLET'
                });
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

let _supabase: any = null;
const getSupabase = () => {
  if (_supabase) return _supabase;

  const url = process.env.SUPABASE_URL || 'https://gwengahnqgvwoletcovl.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!key) {
    console.error('[Backend] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing');
    // We don't throw to allow health check to still run if possible
  }

  // If URL is self-referencing (misconfiguration), fallback to real Supabase
  const finalUrl = (url.includes('api.migonest.com')) ? 'https://gwengahnqgvwoletcovl.supabase.co' : url;

  _supabase = createClient(finalUrl, key);
  return _supabase;
};

const PORT = process.env.BE_PORT || 3001;
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
  const supabase = getSupabase();

  try {
    // 1. Fetch Profile Data
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, role')
      .eq('slug', slug)
      .single();

    // 2. Read index.html
    const indexPath = path.join(process.cwd(), 'index.html');
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
    const indexPath = path.join(process.cwd(), 'index.html');
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
  const supabase = getSupabase();

  try {
    // 1. Fetch Post Data with Author
    const { data: post } = await supabase
      .from('posts')
      .select('content, author:profiles(full_name, avatar_url)')
      .eq('id', id)
      .single();

    // 2. Read index.html
    const indexPath = path.join(process.cwd(), 'index.html');
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

app.get('/api/health', async (req, res) => {
  try {
    const { error } = await getSupabase().from('profiles').select('id').limit(1);
    if (error) throw error;
    res.json({
      status: 'ok',
      database: 'connected',
      message: 'Migonest API is healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'degraded',
      database: 'error',
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 0. Subscribe to Premium
 * Deducts $19.99 and sets is_subscribed to true.
 */
app.post('/api/subscribe', async (req, res) => {
  const subscribeSchema = z.object({
    userId: z.string().uuid(),
    referrerId: z.string().uuid().optional().nullable(),
  });

  const validation = subscribeSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: 'Invalid request data', details: validation.error.format() });
  }

  const { userId, referrerId } = validation.data;
  const SUBSCRIPTION_FEE = 19.99;
  const REFERRAL_REWARD = 2.00;

  try {
    // If Stripe keys are missing, fallback to mock (for now, until user provides keys)
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'YOUR_STRIPE_SECRET_KEY') {
        console.log('[Subscribe] Falling back to mock subscription (Missing Stripe Keys)');
        const supabase = getSupabase();
        await supabase.from('profiles').update({ is_subscribed: true }).eq('id', userId);
        await supabase.from('wallet_entries').insert({
            profile_id: userId, amount: -19.99, type: 'PAYMENT', description: 'Migonest Premium (Mock)', status: 'COMPLETED'
        });
        await supabase.rpc('increment_wallet', { row_id: userId, val: -19.99 });
        return res.json({ success: true, mode: 'mock' });
    }

    // Create missing Stripe Customer if doesn't exist to attach subscription
    let customerId;
    const supabase = getSupabase();
    const { data: userProfile } = await supabase.from('profiles').select('email, full_name').eq('id', userId).single();
    
    // Search for existing customer
    const customers = await stripe.customers.list({
        email: userProfile?.email || undefined,
        limit: 1
    });
    
    if (customers.data.length > 0) {
        customerId = customers.data[0].id;
    } else {
        const customer = await stripe.customers.create({
            email: userProfile?.email || undefined,
            name: userProfile?.full_name || undefined,
            metadata: { userId }
        });
        customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'usd',
                product_data: { name: 'Migonest Premium Subscription' },
                unit_amount: SUBSCRIPTION_FEE * 100, // in cents!
                recurring: { interval: 'month' }
            },
            quantity: 1,
        }],
        mode: 'subscription',
        success_url: `${req.headers.origin}/onboarding?success=true`,
        cancel_url: `${req.headers.origin}/onboarding?canceled=true`,
        subscription_data: {
            metadata: {
                type: 'SUBSCRIPTION',
                userId,
                referrerId: referrerId || ''
            }
        },
        metadata: {
            type: 'SUBSCRIPTION',
            userId,
            referrerId: referrerId || ''
        }
    });

    res.json({ success: true, url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/create-portal-session', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    try {
        const supabase = getSupabase();
        const { data: userProfile } = await supabase.from('profiles').select('email').eq('id', userId).single();
        if (!userProfile?.email) return res.status(400).json({ error: 'User email not found' });

        const customers = await stripe.customers.list({
            email: userProfile.email,
            limit: 1
        });

        if (customers.data.length === 0) {
             return res.status(404).json({ error: 'Stripe customer not found' });
        }

        const returnOrigin = req.headers.origin || req.headers.referer?.replace(/\/+$/, '') || 'https://www.migonest.com';
        const portalSession = await stripe.billingPortal.sessions.create({
             customer: customers.data[0].id,
             return_url: `${returnOrigin}/?view=PROFILE`,
        });

        res.json({ url: portalSession.url });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/wallet/withdraw', async (req, res) => {
    const { userId, amount } = req.body;
    if (!userId || !amount) return res.status(400).json({ error: 'Missing parameters' });
    
    const wAmount = Number(amount);
    if (isNaN(wAmount) || wAmount < 50 || wAmount > 150) {
        return res.status(400).json({ error: 'Withdrawal amount must be between $50 and $150 per day' });
    }

    try {
        const supabase = getSupabase();
        
        // 1. Check daily withdrawal limits
        const startOfDay = new Date();
        startOfDay.setHours(0,0,0,0);
        
        const { data: todayWithdrawals } = await supabase
            .from('wallet_entries')
            .select('amount')
            .eq('profile_id', userId)
            .eq('type', 'WITHDRAWAL')
            .gte('created_at', startOfDay.toISOString());
            
        const withdrawnToday = (todayWithdrawals || []).reduce((sum: number, entry: any) => sum + Math.abs(entry.amount), 0);
        if (withdrawnToday + wAmount > 150) {
            return res.status(400).json({ error: `Daily limit exceeded. You have already withdrawn $${withdrawnToday.toFixed(2)} today. Max daily limit is $150.` });
        }

        // 2. Check balance
        const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('id', userId).single();
        if ((profile?.wallet_balance || 0) < wAmount) {
            return res.status(400).json({ error: 'Insufficient wallet balance' });
        }

        // 3. Deduct balance and record entry
        const { data: entry, error: insertError } = await supabase.from('wallet_entries').insert({
            profile_id: userId,
            amount: -wAmount,
            type: 'WITHDRAWAL',
            description: 'Migonest Withdrawal Request',
            status: 'PENDING',
            counterparty_name: 'Migonest',
            counterparty_role: 'SYSTEM',
            university: 'Migonest Platform',
            country: 'Global'
        }).select().single();

        if (insertError) throw insertError;

        await supabase.rpc('increment_wallet', { row_id: userId, val: -wAmount });

        res.json({ success: true, message: 'Withdrawal requested securely. Processing will complete shortly.', entry });
    } catch (error: any) {
        console.error('[Withdrawal] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * 1. Hire Expert (Round 1: Initial Escrow split)
 * Student pays $399.
 * - 20% to Platform
 * - 40% released to Expert Wallet
 * - 40% locked in Escrow
 */
app.post('/api/hire', async (req, res) => {
  const hireSchema = z.object({
    studentId: z.string().uuid(),
    expertId: z.string().uuid(),
    questionnaire: z.any(),
    agreements: z.any()
  });

  const validation = hireSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: 'Invalid request data', details: validation.error.format() });
  }

  const { studentId, expertId, questionnaire, agreements } = validation.data;
  const TOTAL_FEE = 399;

  try {
    // 1. Create Journey (Restriction removed: Always allow new journeys)
    const { data: request, error: reqError } = await getSupabase()
      .from('service_requests')
      .insert({
        student_id: studentId,
        expert_id: expertId,
        status: 'PAID',
        current_step: 'REQUIREMENTS',
        fee: TOTAL_FEE,
        questionnaire,
        agreements
      })
      .select()
      .single();

    if (reqError) throw reqError;

    // 2. Financial Distribution (Ledger entries)
    // 40% Immediate payout to Expert
    const expertPayout = TOTAL_FEE * 0.4;

    // Fetch Expert name for metadata
    const { data: expertProfile } = await getSupabase().from('profiles').select('full_name').eq('id', expertId).single();
    const { data: studentProfile } = await getSupabase().from('profiles').select('full_name').eq('id', studentId).single();

    const university = questionnaire?.targetUnis || '';
    const country = questionnaire?.targetCountries || '';

    await getSupabase().from('wallet_entries').insert({
      profile_id: expertId,
      amount: expertPayout,
      type: 'EARNING',
      description: `Initial release for Journey with ${studentProfile?.full_name || studentId}`,
      status: 'COMPLETED',
      request_id: request.id,
      counterparty_id: studentId,
      counterparty_name: studentProfile?.full_name || '',
      counterparty_role: 'STUDENT',
      university,
      country
    });

    // Update Expert Balances
    await getSupabase().rpc('increment_wallet', {
      row_id: expertId,
      val: expertPayout
    });

    // Update Student (Lock 40% in Escrow conceptually - tracked in service_request.fee)
    // In a real app, you'd deduct from student balance here if they used platform credits

    // 3. Notify Expert
    await getSupabase().from('notifications').insert({
      user_id: expertId,
      title: 'New Student Hired You!',
      message: `You have been hired for a full assistance journey. $${expertPayout.toFixed(2)} released to your wallet.`,
      type: 'ADMISSION'
    });

    res.json({ success: true, request });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 2. Expert Milestone Handshake
 * Expert marks the current step as complete.
 */
app.put('/api/requests/:id/handshake/expert', async (req, res) => {
  const { id } = req.params;

  try {
    const { data: request, error } = await getSupabase()
      .from('service_requests')
      .update({ is_pending_student_confirmation: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Notify Student
    await getSupabase().from('notifications').insert({
      user_id: request.student_id,
      title: 'Milestone Review Required',
      message: `Your expert marked "${request.current_step}" as complete. Please review and approve.`,
      type: 'ADMISSION'
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 3. Student Milestone Approval
 * Student confirms the work. Advance to next step.
 */
app.put('/api/requests/:id/handshake/student', async (req, res) => {
  const { id } = req.params;
  const { nextStep, currentStep, completedSteps } = req.body;

  try {
    const isFinal = currentStep === 'ACCOMMODATION';

    const { data: currentRequest } = await getSupabase()
      .from('service_requests')
      .select('milestone_dates, completed_steps, fee')
      .eq('id', id)
      .single();

    const milestoneDates = currentRequest?.milestone_dates || {};
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;

    const existingCompleted = currentRequest?.completed_steps || [];
    const newCompletedSteps = Array.from(new Set([...existingCompleted, ...completedSteps, currentStep]));
    milestoneDates[currentStep] = formattedDate;

    const updates: any = {
      is_pending_student_confirmation: false,
      completed_steps: newCompletedSteps,
      current_step: isFinal ? 'ACCOMMODATION' : nextStep,
      milestone_dates: milestoneDates,
      rejection_count: 0
    };

    if (isFinal) {
      updates.status = 'COMPLETED';
      updates.visa_status = 'APPROVED';
    }

    const { data: request, error } = await getSupabase()
      .from('service_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Notify Expert that Student approved the milestone
    await getSupabase().from('notifications').insert({
      user_id: request.expert_id,
      title: 'Milestone Approved',
      message: `Student approved milestone "${currentStep}". ${isFinal ? 'Journey completed!' : `Moving to "${nextStep}".`}`,
      type: 'ADMISSION'
    });

    if (currentStep === 'VISA') {
      // Escrow Logic - 40% Visa Success Release to Expert
      const TOTAL_FEE = currentRequest.fee || 399;
      const visaApprovedExpertBonus = TOTAL_FEE * 0.40;
      
      // Fetch names for description
      const { data: reqData } = await getSupabase().from('service_requests').select('student_id, expert_id').eq('id', id).single();
      if (reqData) {
          const { data: studentProfile } = await getSupabase().from('profiles').select('full_name').eq('id', reqData.student_id).single();
          
          await getSupabase().from('wallet_entries').insert({
              profile_id: reqData.expert_id,
              amount: visaApprovedExpertBonus,
              type: 'UNLOCK',
              description: `40% payout to Expert on Visa success - Journey with ${studentProfile?.full_name || 'Student'}`,
              status: 'COMPLETED',
              request_id: id,
              counterparty_id: reqData.student_id,
              counterparty_name: studentProfile?.full_name,
              counterparty_role: 'STUDENT',
              university: currentRequest?.questionnaire?.university || 'Migonest Admission',
              country: currentRequest?.questionnaire?.country || 'Global'
          });
          
          await getSupabase().rpc('increment_wallet', { row_id: reqData.expert_id, val: visaApprovedExpertBonus });
          await getSupabase().from('notifications').insert({ user_id: reqData.expert_id, title: 'Visa Approved! 🎉', message: `$${visaApprovedExpertBonus.toFixed(2)} released from escrow to your wallet!`, type: 'WALLET' });
          
          // Add notification for STUDENT as well
          await getSupabase().from('notifications').insert({ 
              user_id: reqData.student_id, 
              title: 'Visa Approved! 🎉', 
              message: 'Congratulations! Your visa has been approved and your admission journey is successfully completed.', 
              type: 'ADMISSION' 
          });
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 4. Visa Denial Handling
 * Student uploads proof. Expert confirms. 20% Refund triggered.
 */
app.post('/api/requests/:id/deny-confirm', async (req, res) => {
  const { id } = req.params;

  try {
    const { data: request, error: fetchError } = await getSupabase()
      .from('service_requests')
      .select('student_id, expert_id, fee')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // 1. Update Request
    const { error: updateError } = await getSupabase().from('service_requests')
      .update({ status: 'COMPLETED', visa_status: 'DENIED', is_milestone_rejected: false })
      .eq('id', id);

    if (updateError) {
        console.error('[DenyConfirm] Failed to update request:', updateError);
        return res.status(500).json({ error: 'Failed to update service request status.' });
    }

    // 2. Trigger Financial Rejection Logic (20% Refund to Student, 20% Payout to Expert)
    const TOTAL_FEE = request.fee || 399;
    const expertBonus = TOTAL_FEE * 0.20;
    const studentRefund = TOTAL_FEE * 0.20;

    const { data: studentProf } = await getSupabase().from('profiles').select('full_name').eq('id', request.student_id).single();
    const { data: expertProf } = await getSupabase().from('profiles').select('full_name').eq('id', request.expert_id).single();

    // 1. Release 20% to Expert
    await getSupabase().from('wallet_entries').insert({
        profile_id: request.expert_id,
        amount: expertBonus,
        type: 'UNLOCK',
        description: `20% payout to Expert on Visa rejection - Journey with ${studentProf?.full_name || 'Student'}`,
        status: 'COMPLETED',
        request_id: id,
        counterparty_id: request.student_id,
        counterparty_name: studentProf?.full_name,
        counterparty_role: 'STUDENT',
        university: request.questionnaire?.university || 'Migonest Admission',
        country: request.questionnaire?.country || 'Global'
    });
    await getSupabase().rpc('increment_wallet', { row_id: request.expert_id, val: expertBonus });
    await getSupabase().from('notifications').insert({ user_id: request.expert_id, title: 'Visa Denied', message: `$${expertBonus.toFixed(2)} released from escrow as per denial policy.`, type: 'WALLET' });

    // 2. Refund 20% to Student
    await getSupabase().from('wallet_entries').insert({
        profile_id: request.student_id,
        amount: studentRefund,
        type: 'REFUND',
        description: `20% refund to Student on Visa rejection - Expert: ${expertProf?.full_name || 'Expert'}`,
        status: 'COMPLETED',
        request_id: id,
        counterparty_id: request.expert_id,
        counterparty_name: expertProf?.full_name,
        counterparty_role: 'EXPERT',
        university: request.questionnaire?.university || 'Migonest Admission',
        country: request.questionnaire?.country || 'Global'
    });
    await getSupabase().rpc('increment_wallet', { row_id: request.student_id, val: studentRefund });
    await getSupabase().from('notifications').insert({ 
        user_id: request.student_id, 
        title: 'Visa Refund', 
        message: `$${studentRefund.toFixed(2)} (20% of total fee) has been automatically refunded to your wallet.`, 
        type: 'WALLET' 
    });


    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 5. Expert Application Approval Notification
 */
app.post('/api/expert-applications/:id/notify-approved', async (req, res) => {
  const { id } = req.params;

  try {
    const supabase = getSupabase();

    // 1. Verify Application Status is actually APPROVED
    const { data: appData } = await supabase
      .from('expert_applications')
      .select('student_id, status, data')
      .eq('id', id)
      .single();

    if (!appData || appData.status !== 'APPROVED') {
      res.status(400).json({ error: 'Application not found or not approved' });
      return;
    }

    // 1.5 Sync Profile Data from Application
    if (appData.data?.formData) {
      const form = appData.data.formData;
      const updates: any = {};

      console.log(`[Backend] Processing Expert Application Form Data:`, form);

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

    // 2. Send Email
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

/**
 * 6. Notify Admin of New Expert Application
 */
app.post('/api/expert-applications/:id/notify-admin', async (req, res) => {
  const { id } = req.params;

  try {
    const supabase = getSupabase();

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


// Export the app for Vercel (Serverless)
export default app;

// Only listen if running directly (Local Dev)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Migonest Backend running on port ${PORT}`);
  });
}
