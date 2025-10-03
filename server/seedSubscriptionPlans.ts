import { db } from "./db";
import { subscriptionPlans } from "@shared/schema";

async function seedSubscriptionPlans() {
  console.log("🌱 Starting subscription plans seeding...");

  const plans = [
    {
      name: "3 Months",
      stripePriceId: "price_3months_test",
      priceGBP: "25.99",
      durationMonths: 3,
      isLifetime: false,
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
    console.log("\n📊 Summary:");
    console.log(`   - 3 Months: £25.99`);
    console.log(`   - 6 Months: £49.99`);
    console.log(`   - 12 Months: £99.00`);
    console.log(`   - Lifetime: £200.00`);

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
