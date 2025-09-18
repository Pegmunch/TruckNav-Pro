// Check current localStorage state
console.log('Current localStorage keys:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  const value = localStorage.getItem(key);
  console.log(`${key}: ${value}`);
}

// Check specifically for legal consent
const consent = localStorage.getItem('trucknav_legal_consent');
console.log('Legal consent data:', consent);

// Check if consent exists and is valid
if (consent) {
  try {
    const parsed = JSON.parse(consent);
    console.log('Parsed consent:', parsed);
  } catch (e) {
    console.log('Failed to parse consent data:', e);
  }
}
