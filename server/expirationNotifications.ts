import { db } from "./db";
import { operators, serviceRecords, amprTollRegistrations, fleetVehicles } from "@shared/schema";
import { eq, and, lte, gte, isNull, or } from "drizzle-orm";
import { addDays } from "date-fns";
import nodemailer from "nodemailer";

// Email transporter setup (using Replit environment variables or local testing)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "localhost",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true",
  auth: process.env.EMAIL_USER && process.env.EMAIL_PASS ? {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  } : undefined,
});

interface ExpirationAlert {
  type: 'license' | 'cqc' | 'tachograph' | 'service' | 'toll_registration';
  vehicleId?: string;
  vehicleName?: string;
  operatorId?: string;
  operatorName?: string;
  expiryDate: Date;
  daysUntilExpiry: number;
  description: string;
  email?: string;
}

export async function checkAndSendExpirationNotifications() {
  try {
    const alerts: ExpirationAlert[] = [];
    const today = new Date();
    const twentyEightDaysFromNow = addDays(today, 28);
    const sevenDaysFromNow = addDays(today, 7);

    // Check Operator Licenses (28 days and 7 days before expiry)
    const expiringLicenses = await db
      .select()
      .from(operators)
      .where(
        and(
          or(
            and(
              lte(operators.licenseExpiry, twentyEightDaysFromNow),
              gte(operators.licenseExpiry, today)
            ),
            and(
              lte(operators.licenseExpiry, sevenDaysFromNow),
              gte(operators.licenseExpiry, today)
            )
          ),
          isNull(operators.status) // Don't notify if already flagged
        )
      );

    for (const op of expiringLicenses) {
      const daysUntil = Math.ceil((op.licenseExpiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil === 28 || daysUntil === 7) {
        alerts.push({
          type: 'license',
          operatorId: op.id,
          operatorName: `${op.firstName} ${op.lastName}`,
          expiryDate: op.licenseExpiry,
          daysUntilExpiry: daysUntil,
          description: `Driver's License (${op.licenseType}) for ${op.firstName} ${op.lastName}`,
          email: op.email || undefined,
        });
      }
    }

    // Check Driver CPC/CQC Certification (28 days and 7 days before expiry)
    const expiringCQC = await db
      .select()
      .from(operators)
      .where(
        and(
          or(
            and(
              lte(operators.driverCQCExpiry, twentyEightDaysFromNow),
              gte(operators.driverCQCExpiry, today)
            ),
            and(
              lte(operators.driverCQCExpiry, sevenDaysFromNow),
              gte(operators.driverCQCExpiry, today)
            )
          ),
          or(isNull(operators.driverCQCExpiry), isNull(operators.status))
        )
      );

    for (const op of expiringCQC) {
      if (!op.driverCQCExpiry) continue;
      const daysUntil = Math.ceil((op.driverCQCExpiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil === 28 || daysUntil === 7) {
        alerts.push({
          type: 'cqc',
          operatorId: op.id,
          operatorName: `${op.firstName} ${op.lastName}`,
          expiryDate: op.driverCQCExpiry,
          daysUntilExpiry: daysUntil,
          description: `Driver CPC Certificate for ${op.firstName} ${op.lastName}`,
          email: op.email || undefined,
        });
      }
    }

    // Check Tachograph Card Expiry (28 days and 7 days before expiry)
    const expiringTachograph = await db
      .select()
      .from(operators)
      .where(
        and(
          or(
            and(
              lte(operators.tachographCardExpiry, twentyEightDaysFromNow),
              gte(operators.tachographCardExpiry, today)
            ),
            and(
              lte(operators.tachographCardExpiry, sevenDaysFromNow),
              gte(operators.tachographCardExpiry, today)
            )
          ),
          or(isNull(operators.tachographCardExpiry), isNull(operators.status))
        )
      );

    for (const op of expiringTachograph) {
      if (!op.tachographCardExpiry) continue;
      const daysUntil = Math.ceil((op.tachographCardExpiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil === 28 || daysUntil === 7) {
        alerts.push({
          type: 'tachograph',
          operatorId: op.id,
          operatorName: `${op.firstName} ${op.lastName}`,
          expiryDate: op.tachographCardExpiry,
          daysUntilExpiry: daysUntil,
          description: `Tachograph Card (${op.tachographCardNumber}) for ${op.firstName} ${op.lastName}`,
          email: op.email || undefined,
        });
      }
    }

    // Check Service Records - Next Service Due (28 days and 7 days before expiry)
    const expiringServices = await db
      .select({
        service: serviceRecords,
        vehicle: fleetVehicles,
      })
      .from(serviceRecords)
      .leftJoin(fleetVehicles, eq(serviceRecords.vehicleId, fleetVehicles.id))
      .where(
        and(
          or(
            and(
              lte(serviceRecords.nextServiceDue, twentyEightDaysFromNow),
              gte(serviceRecords.nextServiceDue, today)
            ),
            and(
              lte(serviceRecords.nextServiceDue, sevenDaysFromNow),
              gte(serviceRecords.nextServiceDue, today)
            )
          ),
          isNull(serviceRecords.status) // Not yet completed
        )
      );

    for (const item of expiringServices) {
      if (!item.service.nextServiceDue) continue;
      const daysUntil = Math.ceil((item.service.nextServiceDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil === 28 || daysUntil === 7) {
        alerts.push({
          type: 'service',
          vehicleId: item.service.vehicleId,
          vehicleName: `${item.vehicle?.make} ${item.vehicle?.model} (${item.vehicle?.registration})`,
          expiryDate: item.service.nextServiceDue,
          daysUntilExpiry: daysUntil,
          description: `${item.service.serviceType} Service for ${item.vehicle?.registration || 'Vehicle'} due`,
        });
      }
    }

    // Check AMPR/Toll Registrations - Renewal Dates (28 days and 7 days before expiry)
    const expiringTolls = await db
      .select({
        toll: amprTollRegistrations,
        vehicle: fleetVehicles,
      })
      .from(amprTollRegistrations)
      .leftJoin(fleetVehicles, eq(amprTollRegistrations.vehicleId, fleetVehicles.id))
      .where(
        and(
          eq(amprTollRegistrations.status, 'active'),
          or(
            and(
              lte(amprTollRegistrations.renewalDate, twentyEightDaysFromNow),
              gte(amprTollRegistrations.renewalDate, today)
            ),
            and(
              lte(amprTollRegistrations.renewalDate, sevenDaysFromNow),
              gte(amprTollRegistrations.renewalDate, today)
            )
          )
        )
      );

    for (const item of expiringTolls) {
      if (!item.toll.renewalDate) continue;
      const daysUntil = Math.ceil((item.toll.renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil === 28 || daysUntil === 7) {
        alerts.push({
          type: 'toll_registration',
          vehicleId: item.toll.vehicleId,
          vehicleName: `${item.vehicle?.make} ${item.vehicle?.model} (${item.vehicle?.registration})`,
          expiryDate: item.toll.renewalDate,
          daysUntilExpiry: daysUntil,
          description: `${item.toll.description} (${item.toll.tollType}) renewal needed for ${item.vehicle?.registration || 'Vehicle'}`,
        });
      }
    }

    // Send notifications
    for (const alert of alerts) {
      await sendExpirationNotification(alert);
    }

    console.log(`✅ Expiration notifications checked. Found ${alerts.length} alerts.`);
    return alerts;
  } catch (error) {
    console.error('❌ Error checking expiration notifications:', error);
  }
}

async function sendExpirationNotification(alert: ExpirationAlert) {
  try {
    const daysLabel = alert.daysUntilExpiry === 7 ? '7 days' : '28 days';
    const subject = `⚠️ Fleet Alert: ${alert.description} expires in ${daysLabel}`;
    
    const htmlContent = `
      <h2>Fleet Management Alert</h2>
      <p>This is an automated notification from your Fleet Management System.</p>
      <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3>${alert.description}</h3>
        <p><strong>Expiry Date:</strong> ${alert.expiryDate.toLocaleDateString()}</p>
        <p><strong>Time Until Expiry:</strong> ${alert.daysUntilExpiry} days</p>
        <p><strong>Alert Type:</strong> ${alert.type.toUpperCase()}</p>
        ${alert.vehicleName ? `<p><strong>Vehicle:</strong> ${alert.vehicleName}</p>` : ''}
        ${alert.operatorName ? `<p><strong>Operator:</strong> ${alert.operatorName}</p>` : ''}
      </div>
      <p>Please take action to renew or update the relevant documentation before expiry.</p>
      <p>Best regards,<br>TruckNav Pro Fleet Management System</p>
    `;

    // For development/testing, log instead of actually sending
    if (process.env.EMAIL_HOST === 'localhost' || !alert.email) {
      console.log(`📧 [EMAIL NOTIFICATION - Not Sent in Dev Mode]`);
      console.log(`   To: ${alert.email || 'admin@example.com'}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Alert: ${alert.description}`);
      console.log(`   Days Until Expiry: ${alert.daysUntilExpiry}`);
      return;
    }

    // Send actual email if configured
    if (alert.email) {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'fleet@trucknav.local',
        to: alert.email,
        subject,
        html: htmlContent,
      });
      console.log(`📧 Email sent to ${alert.email} for ${alert.description}`);
    }
  } catch (error) {
    console.error(`Failed to send notification for ${alert.description}:`, error);
  }
}

// Export for manual triggering or testing
export { sendExpirationNotification };
