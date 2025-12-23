// Replace the sendSMS implementation with your provider (Twilio/MSG91) later
const sendSMS = async (phone, message) => {
  // For now, just log the OTP to console (dev)
  console.log(`[SMS] To ${phone}: ${message}`);
  return { success: true };
};

module.exports = { sendSMS };
