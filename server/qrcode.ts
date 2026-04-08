import QRCode from "qrcode";
import { ENV } from "./_core/env";

export async function generateReferralQRCode(referralCode: string): Promise<string> {
  const url = `${ENV.appUrl}/join?ref=${encodeURIComponent(referralCode)}`;

  const dataUrl = await QRCode.toDataURL(url, {
    width: 400,
    margin: 2,
    color: {
      dark: "#0D0F14",
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "H",
  });

  return dataUrl;
}

export async function generateReferralQRCodeSVG(referralCode: string): Promise<string> {
  const url = `${ENV.appUrl}/join?ref=${encodeURIComponent(referralCode)}`;

  const svg = await QRCode.toString(url, {
    type: "svg",
    width: 400,
    margin: 2,
    color: {
      dark: "#0D0F14",
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "H",
  });

  return svg;
}
