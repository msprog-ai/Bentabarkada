/**
 * Security utilities for input validation, data masking, and file handling
 */

// Allowed file types for uploads
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate uploaded file type and size
 */
export function validateFile(
  file: File,
  options: { allowPdf?: boolean; maxSize?: number } = {}
): FileValidationResult {
  const { allowPdf = false, maxSize = MAX_FILE_SIZE } = options;
  const allowedTypes = allowPdf ? ALLOWED_DOCUMENT_TYPES : ALLOWED_IMAGE_TYPES;

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${allowPdf ? 'JPG, PNG, WebP, PDF' : 'JPG, PNG, WebP'}`,
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`,
    };
  }

  // Check file extension matches MIME type
  const ext = file.name.split('.').pop()?.toLowerCase();
  const validExtensions: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/jpg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/webp': ['webp'],
    'application/pdf': ['pdf'],
  };

  const expectedExts = validExtensions[file.type] || [];
  if (ext && !expectedExts.includes(ext)) {
    return {
      valid: false,
      error: 'File extension does not match file type',
    };
  }

  return { valid: true };
}

/**
 * Generate a secure filename with UUID
 */
export function generateSecureFilename(originalName: string): string {
  const ext = originalName.split('.').pop()?.toLowerCase() || 'bin';
  const safeExt = ext.replace(/[^a-z0-9]/g, '');
  return `${crypto.randomUUID()}.${safeExt}`;
}

/**
 * Sanitize text input - strip HTML tags and limit length
 */
export function sanitizeInput(input: string, maxLength = 500): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[<>'"]/g, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Mask phone number for display: 09XX XXX XX89 → 09** *** **89
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return phone;
  const last4 = phone.slice(-4);
  const masked = phone.slice(0, -4).replace(/\d/g, '*');
  return masked + last4;
}

/**
 * Mask email for display: user@example.com → u***@example.com
 */
export function maskEmail(email: string): string {
  if (!email) return email;
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${'*'.repeat(Math.min(local.length - 1, 5))}@${domain}`;
}

/**
 * Mask address for display: show city/province only
 */
export function maskAddress(address: string): string {
  if (!address) return address;
  // Only show last part (typically city)
  const parts = address.split(',').map(p => p.trim());
  if (parts.length <= 1) return '***';
  return `***, ${parts[parts.length - 1]}`;
}

/**
 * Password strength validation
 */
export interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  suggestions: string[];
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const suggestions: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else suggestions.push('At least 8 characters');

  if (password.length >= 12) score++;

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  else suggestions.push('Mix of uppercase and lowercase letters');

  if (/\d/.test(password)) score++;
  else suggestions.push('At least one number');

  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score++;
  else suggestions.push('At least one special character');

  // Cap at 4
  score = Math.min(score, 4);

  const labels: Record<number, { label: string; color: string }> = {
    0: { label: 'Very Weak', color: 'bg-destructive' },
    1: { label: 'Weak', color: 'bg-destructive' },
    2: { label: 'Fair', color: 'bg-yellow-500' },
    3: { label: 'Good', color: 'bg-blue-500' },
    4: { label: 'Strong', color: 'bg-green-500' },
  };

  return {
    score,
    label: labels[score].label,
    color: labels[score].color,
    suggestions,
  };
}

/**
 * Session inactivity timeout (in milliseconds)
 */
export const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

/**
 * Rate limit check for client-side (basic)
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function clientRateLimit(key: string, maxAttempts = 5, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxAttempts) return false;
  entry.count++;
  return true;
}
