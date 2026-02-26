/**
 * SMS Provider — Fast2SMS
 *
 * Add to your .env:
 *   FAST2SMS_API_KEY=your_new_key_here
 *
 * Fast2SMS OTP route automatically sends:
 *   "Your OTP is XXXXXX. Valid for 5 minutes."
 * No DLT template needed for OTP route in dev/testing.
 */

/**
 * Normalize Indian phone numbers:
 * - Strip spaces, dashes, +91, leading 0
 * - Return 10-digit number (Fast2SMS expects 10 digits, no country code)
 */
function normalizeIndianPhone(phone) {
  let p = String(phone || "").replace(/[\s\-().]/g, "").trim();
  if (p.startsWith("+91")) p = p.slice(3);
  if (p.startsWith("91") && p.length === 12) p = p.slice(2);
  if (p.startsWith("0")) p = p.slice(1);
  return p; // 10 digits
}

/**
 * Send OTP via Fast2SMS
 * @param {string} phone - raw phone number (any format)
 * @param {string} otp   - 6-digit OTP string
 */
async function sendOtp(phone, otp) {
  const normalized = normalizeIndianPhone(phone);

  // Dev fallback: if no API key set, just log to console
  if (!process.env.FAST2SMS_API_KEY) {
    console.log(`[SMS-DEV] OTP for ${normalized}: ${otp}`);
    return { success: true, dev: true };
  }

  try {
    const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        authorization: process.env.FAST2SMS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        route: "otp",          // OTP route — no DLT needed
        variables_values: otp, // injected into the OTP template
        numbers: normalized,   // 10-digit Indian number
        flash: 0,
      }),
    });

    const data = await res.json();

    if (!data?.return) {
      console.error("[SMS] Fast2SMS error:", data);
      return { success: false, error: data?.message?.[0] || "SMS failed" };
    }

    console.log(`[SMS] OTP sent to ${normalized} ✅`);
    return { success: true, data };
  } catch (err) {
    console.error("[SMS] Fast2SMS fetch error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Generic SMS sender (for non-OTP messages)
 */
async function sendSMS(phone, message) {
  const normalized = normalizeIndianPhone(phone);

  if (!process.env.FAST2SMS_API_KEY) {
    console.log(`[SMS-DEV] To ${normalized}: ${message}`);
    return { success: true, dev: true };
  }

  try {
    const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        authorization: process.env.FAST2SMS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        route: "q",           // quick transactional route
        message,
        numbers: normalized,
        flash: 0,
      }),
    });

    const data = await res.json();
    return { success: !!data?.return, data };
  } catch (err) {
    console.error("[SMS] sendSMS error:", err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendOtp, sendSMS, normalizeIndianPhone };