import { db } from "./db";
import { operators, serviceRecords, amprTollRegistrations, fleetVehicles, fleetNotifications } from "@shared/schema";
import { eq, and, lte, gte, isNull, or } from "drizzle-orm";
import { addDays } from "date-fns";

interface ExpirationAlert {
  type: 'license' | 'cqc' | 'tachograph' | 'service' | 'toll_registration';
  vehicleId?: string;
  vehicleName?: string;
  operatorId?: string;
  operatorName?: string;
  expiryDate: Date;
  daysUntilExpiry: number;
  description: string;
}

export async function checkAndCreateExpirationNotifications() {
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
          )
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
        });
      }
    }

    // Check Driver CPC/CQC Certification (28 days and 7 days before expiry)
    const expiringCQC = await db
      .select()
      .from(operators)
      .where(
        and(
          lte(operators.driverCQCExpiry, twentyEightDaysFromNow),
          gte(operators.driverCQCExpiry, today)
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
        });
      }
    }

    // Check Tachograph Card Expiry (28 days and 7 days before expiry)
    const expiringTachograph = await db
      .select()
      .from(operators)
      .where(
        and(
          lte(operators.tachographCardExpiry, twentyEightDaysFromNow),
          gte(operators.tachographCardExpiry, today)
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
          lte(serviceRecords.nextServiceDue, twentyEightDaysFromNow),
          gte(serviceRecords.nextServiceDue, today)
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
          lte(amprTollRegistrations.renewalDate, twentyEightDaysFromNow),
          gte(amprTollRegistrations.renewalDate, today)
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

    // Create database notifications for each alert
    for (const alert of alerts) {
      await createFleetNotification(alert);
    }

    console.log(`✅ Expiration notifications created. Found ${alerts.length} alerts.`);
    return alerts;
  } catch (error) {
    console.error('❌ Error checking expiration notifications:', error);
  }
}

async function createFleetNotification(alert: ExpirationAlert) {
  try {
    // Check if notification already exists for this item to avoid duplicates
    const existing = await db
      .select()
      .from(fleetNotifications)
      .where(
        and(
          eq(fleetNotifications.notificationType, alert.type),
          eq(fleetNotifications.status, 'active'),
          alert.operatorId ? eq(fleetNotifications.operatorId, alert.operatorId) : isNull(fleetNotifications.operatorId),
          alert.vehicleId ? eq(fleetNotifications.vehicleId, alert.vehicleId) : isNull(fleetNotifications.vehicleId)
        )
      );

    if (existing.length > 0) {
      console.log(`ℹ️ Notification already exists for ${alert.description}`);
      return;
    }

    const severity = alert.daysUntilExpiry === 7 ? 'high' : 'medium';

    await db.insert(fleetNotifications).values({
      vehicleId: alert.vehicleId,
      operatorId: alert.operatorId,
      notificationType: alert.type,
      message: alert.description,
      expiryDate: alert.expiryDate,
      daysUntilExpiry: alert.daysUntilExpiry,
      severity,
      status: 'active',
    });

    console.log(`📢 Notification created for ${alert.description}`);
  } catch (error) {
    console.error(`Failed to create notification for ${alert.description}:`, error);
  }
}

export { createFleetNotification };
