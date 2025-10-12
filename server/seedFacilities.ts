import { storage } from "./storage";
import { type InsertFacility } from "@shared/schema";

const sampleFacilities: InsertFacility[] = [
  // Facilities near Luton (lat: 51.8787, lng: -0.4200)
  {
    name: "Luton Truck Stop",
    type: "truck_stop",
    coordinates: { lat: 51.8850, lng: -0.4150 },
    address: "M1 Junction 10, Luton, LU1 2AB",
    amenities: ["fuel", "parking", "restaurant", "restrooms", "showers", "wifi"],
    rating: 4.2,
    reviewCount: 156,
    truckParking: true,
    fuel: true,
    restaurant: true,
    restrooms: true,
    showers: true,
    country: "UK"
  },
  {
    name: "Shell Fuel Station Luton",
    type: "fuel",
    coordinates: { lat: 51.8720, lng: -0.4300 },
    address: "Airport Way, Luton, LU2 9LY",
    amenities: ["fuel", "restrooms", "shop"],
    rating: 3.8,
    reviewCount: 89,
    truckParking: false,
    fuel: true,
    restaurant: false,
    restrooms: true,
    showers: false,
    country: "UK"
  },
  {
    name: "Toddington Services",
    type: "truck_stop",
    coordinates: { lat: 51.9550, lng: -0.5300 },
    address: "M1 Northbound, Toddington, LU5 6HR",
    amenities: ["fuel", "parking", "restaurant", "restrooms", "showers", "wifi", "truck_wash"],
    rating: 4.5,
    reviewCount: 324,
    truckParking: true,
    fuel: true,
    restaurant: true,
    restrooms: true,
    showers: true,
    country: "UK"
  },
  {
    name: "BP Connect Dunstable",
    type: "fuel",
    coordinates: { lat: 51.8860, lng: -0.5210 },
    address: "High Street North, Dunstable, LU6 1LA",
    amenities: ["fuel", "restrooms", "shop", "atm"],
    rating: 4.0,
    reviewCount: 67,
    truckParking: true,
    fuel: true,
    restaurant: false,
    restrooms: true,
    showers: false,
    country: "UK"
  },
  {
    name: "Roadside Diner Luton",
    type: "restaurant",
    coordinates: { lat: 51.8910, lng: -0.4050 },
    address: "London Road, Luton, LU1 3XU",
    amenities: ["restaurant", "restrooms", "parking", "wifi"],
    rating: 4.3,
    reviewCount: 201,
    truckParking: true,
    fuel: false,
    restaurant: true,
    restrooms: true,
    showers: false,
    country: "UK"
  },
  
  // Facilities along M1 Motorway
  {
    name: "Watford Gap Services",
    type: "truck_stop",
    coordinates: { lat: 52.3080, lng: -1.1210 },
    address: "M1, Watford, NN6 7UZ",
    amenities: ["fuel", "parking", "restaurant", "restrooms", "showers", "wifi", "hotel"],
    rating: 3.9,
    reviewCount: 567,
    truckParking: true,
    fuel: true,
    restaurant: true,
    restrooms: true,
    showers: true,
    country: "UK"
  },
  {
    name: "Leicester Forest East Services",
    type: "truck_stop",
    coordinates: { lat: 52.6070, lng: -1.1780 },
    address: "M1, Junction 21, Leicester, LE3 3GB",
    amenities: ["fuel", "parking", "restaurant", "restrooms", "showers", "wifi"],
    rating: 4.1,
    reviewCount: 432,
    truckParking: true,
    fuel: true,
    restaurant: true,
    restrooms: true,
    showers: true,
    country: "UK"
  },
  
  // Facilities around London area
  {
    name: "South Mimms Services",
    type: "truck_stop",
    coordinates: { lat: 51.6930, lng: -0.1840 },
    address: "M25, Junction 23, Potters Bar, EN6 3QQ",
    amenities: ["fuel", "parking", "restaurant", "restrooms", "showers", "wifi", "truck_wash"],
    rating: 4.0,
    reviewCount: 789,
    truckParking: true,
    fuel: true,
    restaurant: true,
    restrooms: true,
    showers: true,
    country: "UK"
  },
  {
    name: "Thurrock Services",
    type: "truck_stop",
    coordinates: { lat: 51.4890, lng: 0.2840 },
    address: "M25, Junction 30/31, Thurrock, RM16 3BG",
    amenities: ["fuel", "parking", "restaurant", "restrooms", "showers", "wifi"],
    rating: 3.7,
    reviewCount: 543,
    truckParking: true,
    fuel: true,
    restaurant: true,
    restrooms: true,
    showers: true,
    country: "UK"
  },
  
  // Facilities along M6
  {
    name: "Knutsford Services",
    type: "truck_stop",
    coordinates: { lat: 53.3020, lng: -2.3750 },
    address: "M6, Junction 19, Knutsford, WA16 0TL",
    amenities: ["fuel", "parking", "restaurant", "restrooms", "showers", "wifi"],
    rating: 4.2,
    reviewCount: 412,
    truckParking: true,
    fuel: true,
    restaurant: true,
    restrooms: true,
    showers: true,
    country: "UK"
  },
  {
    name: "Hilton Park Services",
    type: "truck_stop",
    coordinates: { lat: 52.6410, lng: -2.0580 },
    address: "M6, Junction 10A/11, Wolverhampton, WV11 2AT",
    amenities: ["fuel", "parking", "restaurant", "restrooms", "showers", "wifi", "hotel"],
    rating: 3.8,
    reviewCount: 623,
    truckParking: true,
    fuel: true,
    restaurant: true,
    restrooms: true,
    showers: true,
    country: "UK"
  },
  
  // Facilities along M25
  {
    name: "Cobham Services",
    type: "truck_stop",
    coordinates: { lat: 51.3280, lng: -0.4190 },
    address: "M25, Junction 9/10, Cobham, KT11 3DB",
    amenities: ["fuel", "parking", "restaurant", "restrooms", "showers", "wifi"],
    rating: 4.3,
    reviewCount: 891,
    truckParking: true,
    fuel: true,
    restaurant: true,
    restrooms: true,
    showers: true,
    country: "UK"
  },
  {
    name: "Clacket Lane Services",
    type: "truck_stop",
    coordinates: { lat: 51.2710, lng: 0.0380 },
    address: "M25, Junction 5/6, Westerham, TN16 2ER",
    amenities: ["fuel", "parking", "restaurant", "restrooms", "showers", "wifi"],
    rating: 3.9,
    reviewCount: 567,
    truckParking: true,
    fuel: true,
    restaurant: true,
    restrooms: true,
    showers: true,
    country: "UK"
  },
  
  // Additional facilities in Scotland
  {
    name: "Hamilton Services",
    type: "truck_stop",
    coordinates: { lat: 55.7770, lng: -4.0390 },
    address: "M74, Junction 6, Hamilton, ML3 6JW",
    amenities: ["fuel", "parking", "restaurant", "restrooms", "showers", "wifi"],
    rating: 4.0,
    reviewCount: 234,
    truckParking: true,
    fuel: true,
    restaurant: true,
    restrooms: true,
    showers: true,
    country: "UK"
  },
  
  // Additional parking areas
  {
    name: "Luton Airport Parking",
    type: "parking",
    coordinates: { lat: 51.8747, lng: -0.3683 },
    address: "Airport Way, Luton, LU2 9LY",
    amenities: ["parking", "restrooms", "security"],
    rating: 3.5,
    reviewCount: 145,
    truckParking: false,
    fuel: false,
    restaurant: false,
    restrooms: true,
    showers: false,
    country: "UK"
  },
  {
    name: "Secure Truck Park Luton",
    type: "parking",
    coordinates: { lat: 51.9010, lng: -0.4380 },
    address: "Sundon Park Road, Luton, LU3 3AL",
    amenities: ["parking", "restrooms", "security", "cctv"],
    rating: 4.1,
    reviewCount: 78,
    truckParking: true,
    fuel: false,
    restaurant: false,
    restrooms: true,
    showers: false,
    country: "UK"
  },
  
  // Hotels with truck parking
  {
    name: "Premier Inn Luton Airport",
    type: "hotel",
    coordinates: { lat: 51.8790, lng: -0.3950 },
    address: "Osborne Road, Luton, LU1 3XJ",
    amenities: ["parking", "restaurant", "restrooms", "wifi", "breakfast"],
    rating: 4.2,
    reviewCount: 456,
    truckParking: true,
    fuel: false,
    restaurant: true,
    restrooms: true,
    showers: true,
    country: "UK"
  },
  
  // Rest areas
  {
    name: "M1 Rest Area Junction 11",
    type: "rest_area",
    coordinates: { lat: 51.9180, lng: -0.4650 },
    address: "M1 Junction 11, Dunstable, LU5 6JN",
    amenities: ["parking", "restrooms", "picnic_area"],
    rating: 3.6,
    reviewCount: 89,
    truckParking: true,
    fuel: false,
    restaurant: false,
    restrooms: true,
    showers: false,
    country: "UK"
  }
];

async function seedFacilities() {
  console.log("Starting to seed facilities...");
  
  for (const facility of sampleFacilities) {
    try {
      const created = await storage.createFacility(facility);
      console.log(`✅ Created facility: ${created.name} at ${facility.coordinates.lat}, ${facility.coordinates.lng}`);
    } catch (error) {
      console.error(`❌ Failed to create facility ${facility.name}:`, error);
    }
  }
  
  console.log(`\n✨ Facility seeding complete! Added ${sampleFacilities.length} facilities.`);
  process.exit(0);
}

// Run the seeder
seedFacilities().catch(error => {
  console.error("Seeding failed:", error);
  process.exit(1);
});