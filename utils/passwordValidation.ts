
export const validatePassword = (password: string) => {
    const minLength = 13;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecialChar = /[$&#,._!@#$%^&*()?"':{}|<>]/.test(password);

    return {
        isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasDigit && hasSpecialChar,
        requirements: [
            { label: '13 characters minimum', met: password.length >= minLength },
            { label: 'One uppercase letter', met: hasUpperCase },
            { label: 'One lowercase letter', met: hasLowerCase },
            { label: 'One digit (0-9)', met: hasDigit },
            { label: 'One special character (e.g. $, &, #)', met: hasSpecialChar },
        ]
    };
};
