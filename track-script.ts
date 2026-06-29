import fs from 'fs';

let content = fs.readFileSync('components/AuthShell.tsx', 'utf8');

if (!content.includes("import { trackEvent }")) {
    content = content.replace("import { SignupModal } from './SignupModal';", "import { SignupModal } from './SignupModal';\nimport { trackEvent } from '../services/analytics';");
    content = content.replace(/setIsSignupModalOpen\(true\)/g, "setIsSignupModalOpen(true); trackEvent('SIGNUP_CLICK')");
    fs.writeFileSync('components/AuthShell.tsx', content);
    console.log("Updated AuthShell.tsx");
}

let signupModal = fs.readFileSync('components/SignupModal.tsx', 'utf8');
if (!signupModal.includes("import { trackEvent }")) {
    signupModal = signupModal.replace("import React", "import { trackEvent } from '../services/analytics';\nimport React");
    // Wait, where is SIGNUP_COMPLETE? Probably in useAuth.ts or SignupModal.tsx
    // The successful signup leads to Onboarding or email verification.
    // Let's just track SIGNUP_COMPLETE when google signup succeeds or email signup succeeds.
}
