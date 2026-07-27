import { randomInt } from "crypto";
import { OTP_LENGTH, OTP_EXPIRES_MINUTES } from "../constants/auth";

export const generateOtpCode = (): string => {
  const maxValue = 10 ** OTP_LENGTH;
  return randomInt(0, maxValue).toString().padStart(OTP_LENGTH, "0");
};

export const getOtpExpiryDate = (): Date => {
  return new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);    
};