// Script to clear localStorage for fresh testing
console.log('=== TESTING: Clearing localStorage for fresh user experience ===');

// Log current state
console.log('Before clearing - localStorage keys:', Object.keys(localStorage));
const currentConsent = localStorage.getItem('trucknav_legal_consent');
console.log('Current consent data:', currentConsent);

// Clear localStorage
localStorage.clear();

// Verify cleared
console.log('After clearing - localStorage keys:', Object.keys(localStorage));
console.log('localStorage cleared successfully for fresh testing');

// Reload page to test fresh experience
window.location.reload();
