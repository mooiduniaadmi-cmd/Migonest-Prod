import { Profile } from '../types';

/**
 * Calculates a relevance score between two users based on matching criteria:
 * - Country match (Target/Home)
 * - University/Institution match
 * - Academic Qualification match
 * - Area of Interest match
 */
export const calculateRelevanceScore = (currentUser: Profile, otherUser: Profile): number => {
    let score = 0;

    // 1. Country Match
    // If student seeking help for a country and expert specializes in it
    if (currentUser.role === 'STUDENT' && otherUser.role === 'EXPERT') {
        currentUser.targetCountries?.forEach(country => {
            // Direct expertise match
            if (otherUser.targetCountries?.some(c => c.toLowerCase() === country.toLowerCase())) score += 10;
            // Expert is from that country
            if (otherUser.homeCountries?.some(c => c.toLowerCase() === country.toLowerCase())) score += 7;
        });
    } else if (currentUser.role === 'EXPERT' && otherUser.role === 'STUDENT') {
        currentUser.targetCountries?.forEach(country => {
            // I can help with this student's target country
            if (otherUser.targetCountries?.some(c => c.toLowerCase() === country.toLowerCase())) score += 10;
            // This student is from a country I specialize in
            if (otherUser.homeCountries?.some(c => c.toLowerCase() === country.toLowerCase())) score += 5;
        });
    }

    // 2. University / Educational Institution Match
    const myEdu = [
        ...(currentUser.currentStudies || []),
        ...(currentUser.highestQualifications || [])
    ].filter(Boolean);

    const otherEdu = [
        ...(otherUser.currentStudies || []),
        ...(otherUser.highestQualifications || [])
    ].filter(Boolean);

    myEdu.forEach(edu => {
        if (otherEdu.some(o =>
            o.toLowerCase().includes(edu.toLowerCase()) ||
            edu.toLowerCase().includes(o.toLowerCase())
        )) {
            score += 8;
        }
    });

    // 3. Academic Qualification Match
    currentUser.highestQualifications?.forEach(qual => {
        if (otherUser.highestQualifications?.some(q => q.toLowerCase() === qual.toLowerCase())) {
            score += 5;
        }
    });

    // 4. Area of Interest Match
    currentUser.interestAreas?.forEach(area => {
        if (otherUser.interestAreas?.some(a => a.toLowerCase() === area.toLowerCase())) {
            score += 4;
        }
    });

    // 5. Shared Target/Home Country (Same background/destination)
    currentUser.homeCountries?.forEach(country => {
        if (otherUser.homeCountries?.some(c => c.toLowerCase() === country.toLowerCase())) {
            score += 3;
        }
    });

    return score;
};

/**
 * Filters and sorts profiles based on relevance to the current user.
 */
export const getRecommendedProfiles = (
    currentUser: Profile,
    allProfiles: Profile[],
    limit: number = 3
): Profile[] => {
    const connections = currentUser.connections || [];

    // Suggest the opposite role (Students for Experts, Experts for Students)
    // Admins can see suggestions for either, but let's default to Experts
    const targetRole = currentUser.role === 'STUDENT' ? 'EXPERT' : 'STUDENT';

    return allProfiles
        .filter(p =>
            p.id !== currentUser.id &&
            p.role === targetRole &&
            !connections.includes(p.id)
        )
        .map(p => ({ profile: p, score: calculateRelevanceScore(currentUser, p) }))
        // Add small random noise to break ties and rotate suggestions slightly
        .map(item => ({ ...item, score: item.score + (Math.random() * 0.1) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.profile);
};
