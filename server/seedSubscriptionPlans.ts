import { db } from "./db";
import { subscriptionPlans } from "@shared/schema";

async function seedSubscriptionPlans() {
  console.log("🌱 Starting subscription plans seeding...");

  const plans = [
    {
      name: "1 Month",
      stripePriceId: "price_1month_test",
      priceGBP: "6.99",
      durationMonths: 1,
      isLifetime: false,
      category: "navigation",
      features: [
        "Full truck navigation",
        "Real-time traffic",
        "Route planning",
        "Incident reporting"
      ],
      isActive: true,
    },
    {
      name: "3 Months",
      stripePriceId: "price_3months_test",
      priceGBP: "25.99",
      durationMonths: 3,
      isLifetime: false,
      category: "navigation",
      features: [
        "Full truck navigation",
        "Real-time traffic",
        "Route planning",
        "Incident reporting"
      ],
      isActive: true,
    },
    {
      name: "6 Months",
      stripePriceId: "price_6months_test",
      priceGBP: "49.99",
      durationMonths: 6,
      isLifetime: false,
      category: "navigation",
      features: [
        "Full truck navigation",
        "Real-time traffic",
        "Route planning",
        "Incident reporting",
        "Priority support"
      ],
      isActive: true,
    },
    {
      name: "12 Months",
      stripePriceId: "price_12months_test",
      priceGBP: "99.00",
      durationMonths: 12,
      isLifetime: false,
      category: "navigation",
      features: [
        "Full truck navigation",
        "Real-time traffic",
        "Route planning",
        "Incident reporting",
        "Priority support",
        "Exclusive features"
      ],
      isActive: true,
    },
    {
      name: "Lifetime",
      stripePriceId: "price_lifetime_test",
      priceGBP: "200.00",
      durationMonths: null,
      isLifetime: true,
      category: "navigation",
      features: [
        "Full truck navigation",
        "Real-time traffic",
        "Route planning",
        "Incident reporting",
        "Priority support",
        "Exclusive features",
        "Lifetime updates"
      ],
      isActive: true,
    },
    {
      name: "Small Fleet Monthly",
      stripePriceId: "price_fleet_small_monthly_test",
      priceGBP: "250.00",
      durationMonths: 1,
      isLifetime: false,
      category: "fleet_management",
      features: [
        "Up to 30 fleet vehicles",
        "Driver/operator management",
        "Service records tracking",
        "Fuel consumption logs",
        "Vehicle assignments",
        "Maintenance alerts",
        "Tachograph calibration tracking",
        "Desktop-only fleet management interface"
      ],
      isActive: true,
    },
    {
      name: "Large Fleet Monthly",
      stripePriceId: "price_fleet_large_monthly_test",
      priceGBP: "350.00",
      durationMonths: 1,
      isLifetime: false,
      category: "fleet_management",
      features: [
        "Unlimited fleet vehicles (30+)",
        "Driver/operator management",
        "Service records tracking",
        "Fuel consumption logs",
        "Vehicle assignments",
        "Maintenance alerts",
        "Tachograph calibration tracking",
        "Desktop-only fleet management interface",
        "Priority support"
      ],
      isActive: true,
    },
    {
      name: "Fleet Management Lifetime",
      stripePriceId: "price_fleet_lifetime_test",
      priceGBP: "10000.00",
      durationMonths: null,
      isLifetime: true,
      category: "fleet_management",
      features: [
        "Unlimited fleet vehicles",
        "Driver/operator management",
        "Service records tracking",
        "Fuel consumption logs",
        "Vehicle assignments",
        "Maintenance alerts",
        "Tachograph calibration tracking",
        "Desktop-only fleet management interface",
        "Lifetime updates and support"
      ],
      isActive: true,
    },
  ];

  try {
    for (const plan of plans) {
      await db
        .insert(subscriptionPlans)
        .values(plan)
        .onConflictDoNothing();
      
      console.log(`✅ Seeded plan: ${plan.name} (£${plan.priceGBP})`);
    }

    console.log("\n🎉 Successfully seeded all subscription plans!");
    console.log("\n📊 Navigation App Summary:");
    console.log(`   - 3 Months: £25.99`);
    console.log(`   - 6 Months: £49.99`);
    console.log(`   - 12 Months: £99.00`);
    console.log(`   - Lifetime: £200.00`);
    console.log("\n📊 Fleet Management Summary:");
    console.log(`   - Small Fleet Monthly (up to 30 lorries): £250.00/month`);
    console.log(`   - Large Fleet Monthly (30+ lorries): £350.00/month`);
    console.log(`   - Lifetime: £10000.00`);

    const allPlans = await db.select().from(subscriptionPlans);
    console.log(`\n✨ Total plans in database: ${allPlans.length}`);
    
  } catch (error) {
    console.error("❌ Error seeding subscription plans:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

seedSubscriptionPlans();
