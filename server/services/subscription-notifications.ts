import { db } from "../db";
import { userSubscriptions, subscriptionNotifications, users, subscriptionPlans } from "@shared/schema";
import { eq, and, lte, gte, isNull, or } from "drizzle-orm";
import { addDays, differenceInDays } from "date-fns";

interface RenewalAlert {
  userId: string;
  userEmail: string | null;
  userName: string | null;
  subscriptionId: string;
  planName: string;
  currentPeriodEnd: Date;
  daysUntilExpiry: number;
  notificationType: 'renewal_28_day' | 'renewal_7_day' | 'renewal_1_day';
  category: string;
}

export async function checkAndSendRenewalNotifications(): Promise<void> {
  try {
    console.log('[SUBSCRIPTION-NOTIFICATIONS] Starting renewal notification check...');
    
    const today = new Date();
    const alerts: RenewalAlert[] = [];

    const activeSubscriptions = await db
      .select({
        subscription: userSubscriptions,
        user: users,
        plan: subscriptionPlans,
      })
      .from(userSubscriptions)
      .leftJoin(users, eq(userSubscriptions.userId, users.id))
      .leftJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
      .where(
        and(
          eq(userSubscriptions.status, 'active'),
          eq(userSubscriptions.renewalNotificationsStopped, false),
          lte(userSubscriptions.currentPeriodEnd, addDays(today, 28)),
          gte(userSubscriptions.currentPeriodEnd, today)
        )
      );

    for (const item of activeSubscriptions) {
      if (!item.subscription.currentPeriodEnd || !item.user || !item.plan) continue;
      
      if (item.plan.isLifetime) continue;

      const daysUntil = differenceInDays(item.subscription.currentPeriodEnd, today);

      if (daysUntil <= 1 && !item.subscription.renewalNotification1DaySent) {
        alerts.push({
          userId: item.subscription.userId,
          userEmail: item.user.email,
          userName: item.user.firstName || item.user.username,
          subscriptionId: item.subscription.id,
          planName: item.plan.name,
          currentPeriodEnd: item.subscription.currentPeriodEnd,
          daysUntilExpiry: daysUntil,
          notificationType: 'renewal_1_day',
          category: item.subscription.category || 'navigation',
        });
      } else if (daysUntil <= 7 && daysUntil > 1 && !item.subscription.renewalNotification7DaySent) {
        alerts.push({
          userId: item.subscription.userId,
          userEmail: item.user.email,
          userName: item.user.firstName || item.user.username,
          subscriptionId: item.subscription.id,
          planName: item.plan.name,
          currentPeriodEnd: item.subscription.currentPeriodEnd,
          daysUntilExpiry: daysUntil,
          notificationType: 'renewal_7_day',
          category: item.subscription.category || 'navigation',
        });
      } else if (daysUntil <= 28 && daysUntil > 7 && !item.subscription.renewalNotification28DaySent) {
        alerts.push({
          userId: item.subscription.userId,
          userEmail: item.user.email,
          userName: item.user.firstName || item.user.username,
          subscriptionId: item.subscription.id,
          planName: item.plan.name,
          currentPeriodEnd: item.subscription.currentPeriodEnd,
          daysUntilExpiry: daysUntil,
          notificationType: 'renewal_28_day',
          category: item.subscription.category || 'navigation',
        });
      }
    }

    for (const alert of alerts) {
      await sendRenewalNotification(alert);
    }

    console.log(`[SUBSCRIPTION-NOTIFICATIONS] Processed ${alerts.length} renewal notifications`);
  } catch (error) {
    console.error('[SUBSCRIPTION-NOTIFICATIONS] Error checking renewals:', error);
  }
}

async function sendRenewalNotification(alert: RenewalAlert): Promise<void> {
  try {
    const notificationRecord = await db.insert(subscriptionNotifications).values({
      userId: alert.userId,
      subscriptionId: alert.subscriptionId,
      notificationType: alert.notificationType,
      emailRecipient: alert.userEmail,
      status: 'pending',
    }).returning();

    const notificationId = notificationRecord[0]?.id;

    if (!alert.userEmail) {
      console.log(`[SUBSCRIPTION-NOTIFICATIONS] No email for user ${alert.userId}, skipping notification`);
      if (notificationId) {
        await db.update(subscriptionNotifications)
          .set({ status: 'skipped', errorMessage: 'No email address' })
          .where(eq(subscriptionNotifications.id, notificationId));
      }
      return;
    }

    const emailSent = await sendEmail(alert);

    if (emailSent) {
      const updateField = alert.notificationType === 'renewal_28_day' 
        ? { renewalNotification28DaySent: true }
        : alert.notificationType === 'renewal_7_day'
        ? { renewalNotification7DaySent: true }
        : { renewalNotification1DaySent: true };

      await db.update(userSubscriptions)
        .set({ 
          ...updateField,
          lastRenewalNotificationSent: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userSubscriptions.id, alert.subscriptionId));

      if (notificationId) {
        await db.update(subscriptionNotifications)
          .set({ 
            status: 'sent', 
            emailSent: true,
            emailSentAt: new Date(),
          })
          .where(eq(subscriptionNotifications.id, notificationId));
      }

      console.log(`[SUBSCRIPTION-NOTIFICATIONS] Sent ${alert.notificationType} notification to ${alert.userEmail}`);
    } else {
      if (notificationId) {
        await db.update(subscriptionNotifications)
          .set({ status: 'failed', errorMessage: 'Email send failed' })
          .where(eq(subscriptionNotifications.id, notificationId));
      }
    }
  } catch (error) {
    console.error(`[SUBSCRIPTION-NOTIFICATIONS] Error sending notification to ${alert.userEmail}:`, error);
  }
}

function getBrandedEmailTemplate(content: string, category: string = 'navigation'): string {
  const productName = category === 'fleet_management' ? 'Fleet Management' : 'TruckNav Pro';
  const year = new Date().getFullYear();
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${productName}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              
              <!-- Header with Logo -->
              <tr>
                <td style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #0ea5e9 100%); padding: 32px 40px; text-align: center;">
                  <!-- TruckNav Pro Logo SVG -->
                  <div style="margin-bottom: 16px;">
                    <svg width="80" height="80" viewBox="0 0 100 100" style="display: inline-block;">
                      <circle cx="50" cy="50" r="48" fill="white" opacity="0.15"/>
                      <circle cx="50" cy="50" r="40" fill="white" opacity="0.2"/>
                      <!-- Truck body -->
                      <rect x="20" y="40" width="45" height="25" rx="3" fill="white"/>
                      <rect x="65" y="48" width="15" height="17" rx="2" fill="white"/>
                      <!-- Cab window -->
                      <rect x="67" y="50" width="11" height="8" rx="1" fill="#3b82f6"/>
                      <!-- Wheels -->
                      <circle cx="32" cy="68" r="7" fill="#1e3a8a"/>
                      <circle cx="32" cy="68" r="4" fill="white"/>
                      <circle cx="55" cy="68" r="7" fill="#1e3a8a"/>
                      <circle cx="55" cy="68" r="4" fill="white"/>
                      <circle cx="72" cy="68" r="7" fill="#1e3a8a"/>
                      <circle cx="72" cy="68" r="4" fill="white"/>
                      <!-- Navigation pin -->
                      <path d="M75 25 L75 35 L85 30 Z" fill="#22c55e"/>
                      <circle cx="75" cy="25" r="8" fill="#22c55e"/>
                      <circle cx="75" cy="25" r="4" fill="white"/>
                    </svg>
                  </div>
                  <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    ${productName}
                  </h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px; font-weight: 500;">
                    ${category === 'fleet_management' ? 'Enterprise Fleet Solutions' : 'Professional Truck Navigation'}
                  </p>
                </td>
              </tr>
              
              <!-- Email Content -->
              <tr>
                <td style="padding: 40px;">
                  ${content}
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
                  <table role="presentation" style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="text-align: center;">
                        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">
                          Need help? Contact our support team at support@trucknavpro.com
                        </p>
                        <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                          © ${year} TruckNav Pro. All rights reserved.
                        </p>
                        <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 11px;">
                          <a href="${process.env.FRONTEND_URL || 'https://trucknavpro.com'}/privacy" style="color: #6b7280; text-decoration: underline;">Privacy Policy</a>
                          &nbsp;|&nbsp;
                          <a href="${process.env.FRONTEND_URL || 'https://trucknavpro.com'}/terms" style="color: #6b7280; text-decoration: underline;">Terms of Service</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

async function sendEmail(alert: RenewalAlert): Promise<boolean> {
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@trucknavpro.com';

  if (!sendgridApiKey) {
    console.log('[SUBSCRIPTION-NOTIFICATIONS] SendGrid API key not configured, email not sent');
    console.log(`[SUBSCRIPTION-NOTIFICATIONS] Would have sent ${alert.notificationType} to ${alert.userEmail}`);
    return true;
  }

  const urgencyMap = {
    'renewal_28_day': { urgency: 'upcoming', daysText: '4 weeks' },
    'renewal_7_day': { urgency: 'soon', daysText: '1 week' },
    'renewal_1_day': { urgency: 'urgent', daysText: '1 day' },
  };

  const { urgency, daysText } = urgencyMap[alert.notificationType];
  const productName = alert.category === 'fleet_management' ? 'Fleet Management' : 'TruckNav Pro';
  
  const subject = urgency === 'urgent' 
    ? `⚠️ Your ${productName} subscription expires tomorrow!`
    : `Your ${productName} subscription renews in ${daysText}`;

  const emailContent = `
    <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px;">Hi ${alert.userName || 'there'},</h2>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">
      ${urgency === 'urgent' 
        ? 'This is a <strong style="color: #dc2626;">final reminder</strong> that your subscription expires <strong>tomorrow</strong>!'
        : `Your ${alert.planName} subscription will renew in <strong>${daysText}</strong>.`
      }
    </p>
    
    <div style="background: ${urgency === 'urgent' ? '#fef2f2' : '#eff6ff'}; border-left: 4px solid ${urgency === 'urgent' ? '#ef4444' : '#3b82f6'}; padding: 20px; margin: 0 0 24px 0; border-radius: 0 12px 12px 0;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0;">
            <span style="color: ${urgency === 'urgent' ? '#991b1b' : '#1e40af'}; font-weight: 600;">📅 Renewal Date:</span>
            <span style="color: ${urgency === 'urgent' ? '#991b1b' : '#1e40af'};">${alert.currentPeriodEnd.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0;">
            <span style="color: ${urgency === 'urgent' ? '#991b1b' : '#1e40af'}; font-weight: 600;">📦 Plan:</span>
            <span style="color: ${urgency === 'urgent' ? '#991b1b' : '#1e40af'};">${alert.planName}</span>
          </td>
        </tr>
      </table>
    </div>
    
    ${urgency === 'urgent' ? `
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin: 0 0 24px 0;">
        <p style="color: #dc2626; font-weight: 600; margin: 0 0 12px 0;">
          ⚠️ Without renewal, you will lose access to:
        </p>
        <ul style="color: #7f1d1d; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Truck-safe route planning</li>
          <li>Height & weight restriction avoidance</li>
          <li>Real-time traffic updates</li>
          ${alert.category === 'fleet_management' ? '<li>Fleet management dashboard</li><li>GPS tracking & geofencing</li>' : ''}
        </ul>
      </div>
    ` : ''}
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 32px 0;">
      To ensure uninterrupted access, please make sure your payment method is up to date.
    </p>
    
    <div style="text-align: center; margin: 0 0 24px 0;">
      <a href="${process.env.FRONTEND_URL || 'https://trucknavpro.com'}/subscription/manage" 
         style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
        Manage Subscription
      </a>
    </div>
  `;

  const htmlContent = getBrandedEmailTemplate(emailContent, alert.category);

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: alert.userEmail }] }],
        from: { email: fromEmail, name: 'TruckNav Pro' },
        subject,
        content: [
          { type: 'text/html', value: htmlContent },
        ],
      }),
    });

    if (response.ok || response.status === 202) {
      return true;
    } else {
      const errorText = await response.text();
      console.error(`[SUBSCRIPTION-NOTIFICATIONS] SendGrid error: ${response.status} - ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error('[SUBSCRIPTION-NOTIFICATIONS] Failed to send email:', error);
    return false;
  }
}

export async function stopNotificationsForExpiredSubscription(subscriptionId: string): Promise<void> {
  try {
    await db.update(userSubscriptions)
      .set({ 
        renewalNotificationsStopped: true,
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.id, subscriptionId));
    
    console.log(`[SUBSCRIPTION-NOTIFICATIONS] Stopped notifications for subscription ${subscriptionId}`);
  } catch (error) {
    console.error('[SUBSCRIPTION-NOTIFICATIONS] Error stopping notifications:', error);
  }
}

export async function resetNotificationsForRenewedSubscription(subscriptionId: string): Promise<void> {
  try {
    await db.update(userSubscriptions)
      .set({ 
        renewalNotification28DaySent: false,
        renewalNotification7DaySent: false,
        renewalNotification1DaySent: false,
        renewalNotificationsStopped: false,
        lastRenewalNotificationSent: null,
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.id, subscriptionId));
    
    console.log(`[SUBSCRIPTION-NOTIFICATIONS] Reset notifications for renewed subscription ${subscriptionId}`);
  } catch (error) {
    console.error('[SUBSCRIPTION-NOTIFICATIONS] Error resetting notifications:', error);
  }
}

export async function sendPaymentFailedNotification(userId: string, subscriptionId: string): Promise<void> {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const [subscription] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.id, subscriptionId));
    
    if (!user?.email) {
      console.log(`[SUBSCRIPTION-NOTIFICATIONS] No email for user ${userId}, skipping payment failed notification`);
      return;
    }

    const [plan] = subscription?.planId 
      ? await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, subscription.planId))
      : [null];

    await db.insert(subscriptionNotifications).values({
      userId,
      subscriptionId,
      notificationType: 'payment_failed',
      emailRecipient: user.email,
      status: 'sent',
      emailSent: true,
      emailSentAt: new Date(),
    });

    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    if (!sendgridApiKey) {
      console.log(`[SUBSCRIPTION-NOTIFICATIONS] Would have sent payment_failed notification to ${user.email}`);
      return;
    }

    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@trucknavpro.com';
    const productName = subscription?.category === 'fleet_management' ? 'Fleet Management' : 'TruckNav Pro';

    const paymentFailedContent = `
      <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px;">Hi ${user.firstName || 'there'},</h2>
      
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 24px; margin: 0 0 24px 0; text-align: center;">
        <div style="width: 64px; height: 64px; background: #fee2e2; border-radius: 50%; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 32px;">⚠️</span>
        </div>
        <h3 style="color: #dc2626; margin: 0 0 8px 0; font-size: 20px;">Payment Failed</h3>
        <p style="color: #991b1b; margin: 0; font-size: 14px;">We were unable to process your payment</p>
      </div>
      
      <p style="color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">
        We tried to charge your payment method for your <strong>${plan?.name || productName}</strong> subscription, but the payment was unsuccessful.
      </p>
      
      <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 0 0 24px 0; border-radius: 0 12px 12px 0;">
        <p style="color: #92400e; margin: 0; font-weight: 500;">
          🔔 Your subscription access may be interrupted if payment is not updated within the next few days.
        </p>
      </div>
      
      <p style="color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 32px 0;">
        Please update your payment method to continue enjoying uninterrupted access to all premium features.
      </p>
      
      <div style="text-align: center; margin: 0 0 24px 0;">
        <a href="${process.env.FRONTEND_URL || 'https://trucknavpro.com'}/subscription/manage" 
           style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4);">
          Update Payment Method
        </a>
      </div>
    `;

    const brandedPaymentFailedEmail = getBrandedEmailTemplate(paymentFailedContent, subscription?.category || 'navigation');

    await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: user.email }] }],
        from: { email: fromEmail, name: 'TruckNav Pro' },
        subject: `⚠️ Payment failed for your ${productName} subscription`,
        content: [{
          type: 'text/html',
          value: brandedPaymentFailedEmail,
        }],
      }),
    });

    console.log(`[SUBSCRIPTION-NOTIFICATIONS] Sent payment failed notification to ${user.email}`);
  } catch (error) {
    console.error('[SUBSCRIPTION-NOTIFICATIONS] Error sending payment failed notification:', error);
  }
}

let notificationIntervalId: NodeJS.Timeout | null = null;

export function startSubscriptionNotificationScheduler(): void {
  console.log('[SUBSCRIPTION-NOTIFICATIONS] Starting scheduler (runs every hour)...');
  
  setTimeout(() => {
    checkAndSendRenewalNotifications();
  }, 10000);

  notificationIntervalId = setInterval(() => {
    checkAndSendRenewalNotifications();
  }, 60 * 60 * 1000);
}

export function stopSubscriptionNotificationScheduler(): void {
  if (notificationIntervalId) {
    clearInterval(notificationIntervalId);
    notificationIntervalId = null;
    console.log('[SUBSCRIPTION-NOTIFICATIONS] Scheduler stopped');
  }
}

export interface BrandedEmailOptions {
  to: string;
  subject: string;
  content: string;
  category?: 'navigation' | 'fleet_management';
}

export async function sendBrandedEmail(options: BrandedEmailOptions): Promise<boolean> {
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@trucknavpro.com';

  if (!sendgridApiKey) {
    console.log('[EMAIL] SendGrid API key not configured, email not sent');
    console.log(`[EMAIL] Would have sent email to ${options.to}: ${options.subject}`);
    return true;
  }

  const htmlContent = getBrandedEmailTemplate(options.content, options.category || 'navigation');

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: options.to }] }],
        from: { email: fromEmail, name: 'TruckNav Pro' },
        subject: options.subject,
        content: [{ type: 'text/html', value: htmlContent }],
      }),
    });

    if (response.ok || response.status === 202) {
      console.log(`[EMAIL] Sent branded email to ${options.to}`);
      return true;
    } else {
      const errorText = await response.text();
      console.error(`[EMAIL] SendGrid error: ${response.status} - ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error('[EMAIL] Failed to send email:', error);
    return false;
  }
}

export { getBrandedEmailTemplate };
