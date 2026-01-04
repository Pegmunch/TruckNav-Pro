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

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🚛 ${productName}</h1>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1f2937; margin-top: 0;">Hi ${alert.userName || 'there'},</h2>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          ${urgency === 'urgent' 
            ? 'This is a final reminder that your subscription expires <strong>tomorrow</strong>!'
            : `Your ${alert.planName} subscription will renew in <strong>${daysText}</strong>.`
          }
        </p>
        
        <div style="background: ${urgency === 'urgent' ? '#fef2f2' : '#eff6ff'}; border-left: 4px solid ${urgency === 'urgent' ? '#ef4444' : '#3b82f6'}; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; color: ${urgency === 'urgent' ? '#991b1b' : '#1e40af'}; font-weight: 500;">
            📅 Renewal Date: ${alert.currentPeriodEnd.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p style="margin: 8px 0 0 0; color: ${urgency === 'urgent' ? '#991b1b' : '#1e40af'};">
            📦 Plan: ${alert.planName}
          </p>
        </div>
        
        ${urgency === 'urgent' ? `
          <p style="color: #dc2626; font-weight: 500;">
            ⚠️ If your subscription is not renewed, you will lose access to premium features including:
          </p>
          <ul style="color: #4b5563;">
            <li>Truck-safe route planning</li>
            <li>Height & weight restriction avoidance</li>
            <li>Real-time traffic updates</li>
            ${alert.category === 'fleet_management' ? '<li>Fleet management dashboard</li>' : ''}
          </ul>
        ` : ''}
        
        <p style="color: #4b5563; font-size: 16px;">
          To ensure uninterrupted access, please make sure your payment method is up to date.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'https://trucknavpro.com'}/subscription/manage" 
             style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Manage Subscription
          </a>
        </div>
        
        <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; text-align: center;">
          If you have any questions, please contact our support team.<br>
          © ${new Date().getFullYear()} TruckNav Pro. All rights reserved.
        </p>
      </div>
    </div>
  `;

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
          value: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #dc2626;">Payment Failed</h1>
              <p>Hi ${user.firstName || 'there'},</p>
              <p>We were unable to process your payment for your <strong>${plan?.name || productName}</strong> subscription.</p>
              <p>Please update your payment method to avoid service interruption.</p>
              <a href="${process.env.FRONTEND_URL || 'https://trucknavpro.com'}/subscription/manage" 
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
                Update Payment Method
              </a>
            </div>
          `,
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
