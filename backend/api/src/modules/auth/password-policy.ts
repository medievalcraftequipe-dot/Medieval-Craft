export function validatePasswordPolicy(password: string): string[] {
  const issues: string[] = [];

  if (password.length < 10) {
    issues.push("Use at least 10 characters.");
  }

  if (!/[a-z]/.test(password)) {
    issues.push("Add a lowercase letter.");
  }

  if (!/[A-Z]/.test(password)) {
    issues.push("Add an uppercase letter.");
  }

  if (!/\d/.test(password)) {
    issues.push("Add a number.");
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    issues.push("Add a symbol.");
  }

  return issues;
}
