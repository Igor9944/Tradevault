export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export type EmailType = 'new_user' | 'withdrawal_request' | 'approve_user' | 'renewal_confirm';

export async function envoyerEmail(
  type: EmailType, 
  user: { email: string; name?: string; username?: string; amount?: number | string; [key: string]: any }, 
  paymentProof: string = ""
) {
  try {
    // Normalization to ensure 'name' is passed if we use 'username' inside our app
    const payloadUser = {
      ...user,
      name: user.name || user.username || 'Trader'
    };

    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ type, user: payloadUser, paymentProof })
    });
    
    if (!response.ok) {
      console.warn("Edge Function Email Sender responded with status:", response.status);
    }
  } catch (err) {
    console.warn("Failed to send triggered email via Edge Function", err);
  }
}
