// Script to remove all toast notifications from navigation.tsx
import fs from 'fs';

// Read the file
let content = fs.readFileSync('client/src/pages/navigation.tsx', 'utf8');

// Replace all toast calls with a comment
// Match toast({ ... }) including multiline
content = content.replace(/toast\(\{[\s\S]*?\}\);?/g, '// REMOVED TOAST: No popups per user request');

// Write back to file
fs.writeFileSync('client/src/pages/navigation.tsx', content);

console.log('All toast notifications removed from navigation.tsx');