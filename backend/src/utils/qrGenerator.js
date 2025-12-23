const QRCode = require("qrcode");

/**
 * Generates QR as Data URL (base64 PNG)
 */
exports.generateQrDataUrl = async (text) => {
  return await QRCode.toDataURL(text, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 300,
  });
};
