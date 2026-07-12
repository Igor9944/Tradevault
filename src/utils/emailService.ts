// ─── Email Service ──────────────────────────────────────────────────────────────
// Service for triggering email notifications via backend API

import { safeLocalStorage } from './safeStorage';

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Trigger welcome email for new user signup
 */
export async function triggerSignupEmail(email: string, username: string, 
  paymentScreenshot: string, amount: number, network: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/notify/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, username, paymentScreenshot, amount, network }),
      credentials: 'include'
    });

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('[EMAIL_SERVICE] Failed to trigger signup email:', error);
    return false;
  }
}

/**
 * Trigger account approval email
 */
export async function triggerApprovalEmail(email: string, username: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/notify/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, username }),
      credentials: 'include'
    });

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('[EMAIL_SERVICE] Failed to trigger approval email:', error);
    return false;
  }
}

/**
 * Trigger subscription renewal request email
 */
export async function triggerRenewalRequestEmail(email: string, username: string, 
  plan: string, amount: number): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/notify/renewal-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, username, plan, amount }),
      credentials: 'include'
    });

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('[EMAIL_SERVICE] Failed to trigger renewal request email:', error);
    return false;
  }
}

/**
 * Trigger subscription renewal approval email
 */
export async function triggerRenewalApprovalEmail(email: string, username: string, 
  plan: string, amount: number): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/notify/renewal-approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, username, plan, amount }),
      credentials: 'include'
    });

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('[EMAIL_SERVICE] Failed to trigger renewal approval email:', error);
    return false;
  }
}

/**
 * Send password reset OTP email (calls backend forgot password endpoint)
 */
export async function sendPasswordResetEmail(email: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/forgot-password-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
      credentials: 'include'
    });

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('[EMAIL_SERVICE] Failed to send password reset email:', error);
    return false;
  }
}

// Legacy function names for backward compatibility if needed elsewhere
export const emailService = {
  triggerSignupEmail,
  triggerApprovalEmail,
  triggerRenewalRequestEmail,
  triggerRenewalApprovalEmail,
  sendPasswordResetEmail
};

export default emailService;
