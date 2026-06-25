import { Profile } from '../types';

export const matchesSearchQuery = (profile: Profile, query: string): boolean => {
    if (!query) return true;
    const lowerQuery = query.toLowerCase().trim();

    // Helper to check array of strings
    const arrayMatches = (arr?: string[]) => arr?.some(item => item.toLowerCase().includes(lowerQuery));

    // 1. Name
    if (profile.fullName.toLowerCase().includes(lowerQuery)) return true;

    // 2. Tag/Role (Exact or partial)
    // Check if query matches "student" or "expert"
    if (profile.role.toLowerCase().includes(lowerQuery)) return true;

    // 3. Location
    if (profile.currentLocation?.toLowerCase().includes(lowerQuery)) return true;

    // 4. University ("currentStudies")
    if (arrayMatches(profile.currentStudies)) return true;

    // 5. Country (Expertise / Target / Home)
    // targetCountries covers "Countries I can help with" for Experts, and "Countries I want to go to" for Students
    if (arrayMatches(profile.targetCountries)) return true;
    // homeCountries covers Nationality
    if (arrayMatches(profile.homeCountries)) return true;

    // 6. Language
    if (arrayMatches(profile.languages)) return true;

    // 7. Degree
    if (arrayMatches(profile.highestQualifications)) return true;
    if (arrayMatches(profile.targetDegree)) return true;

    // 8. Area of Interest
    if (arrayMatches(profile.interestAreas)) return true;

    return false;
};
