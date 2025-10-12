// Test POI search with St Albans location and 10km radius
const stAlbansLat = 51.755;
const stAlbansLng = -0.336;
const radiusKm = 10;

const testUrl = `http://localhost:5000/api/facilities?lat=${stAlbansLat}&lng=${stAlbansLng}&radius=${radiusKm}&type=fuel`;

console.log('Testing POI search with:');
console.log(`  Location: St Albans (${stAlbansLat}, ${stAlbansLng})`);
console.log(`  Radius: ${radiusKm}km`);
console.log(`  Type: fuel`);
console.log(`  URL: ${testUrl}`);
console.log('');

fetch(testUrl)
  .then(response => response.json())
  .then(facilities => {
    console.log(`Found ${facilities.length} facilities within ${radiusKm}km:\n`);
    
    facilities.forEach((facility, index) => {
      console.log(`${index + 1}. ${facility.name}`);
      console.log(`   Location: (${facility.coordinates.lat}, ${facility.coordinates.lng})`);
      console.log(`   Distance: ${facility.distance ? facility.distance.toFixed(2) : 'N/A'}km`);
      console.log(`   Expected: ${facility.id === 'facility-st-albans-test' ? '✅ CORRECT (within 10km)' : 
                                  facility.id === 'facility-1' ? '❌ ERROR (Watford Gap is 80km away!)' :
                                  facility.id === 'facility-2' ? '❌ ERROR (Birmingham is even farther!)' : '❓ Unknown'}`);
      console.log('');
    });
    
    // Verify results
    const hasStAlbansFuel = facilities.some(f => f.id === 'facility-st-albans-test');
    const hasWatfordGap = facilities.some(f => f.id === 'facility-1');
    const hasBirmingham = facilities.some(f => f.id === 'facility-2');
    
    console.log('VERIFICATION RESULTS:');
    console.log(`✅ St Albans Fuel Station included: ${hasStAlbansFuel ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Watford Gap Services excluded: ${!hasWatfordGap ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Birmingham facility excluded: ${!hasBirmingham ? 'PASS' : 'FAIL'}`);
    
    if (hasStAlbansFuel && !hasWatfordGap && !hasBirmingham) {
      console.log('\n🎉 POI DISTANCE FILTERING IS WORKING CORRECTLY!');
    } else {
      console.log('\n❌ POI DISTANCE FILTERING STILL HAS ISSUES!');
    }
  })
  .catch(error => {
    console.error('Error testing POI search:', error);
  });