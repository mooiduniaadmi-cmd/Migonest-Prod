
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(?:com|org|net|edu|gov|io|co|me|ai|app|info|university|expert|study)(?:\/[^\s]*)?)/gi;

const examples = [
    "google.com",
    "www.google.com",
    "http://google.com",
    "https://google.com",
    "http://www.google.com",
    "https://www.google.com",
    "Check this: google.com",
    "Follow me on google.com/test",
    "Email me at test@example.com", // Should be blocked by email regex anyway
    "Go to website.education" // Should it be blocked? university/study are there but not education
];

examples.forEach(ex => {
    URL_REGEX.lastIndex = 0; // reset
    console.log(`"${ex}" matches: ${URL_REGEX.test(ex)}`);
});
