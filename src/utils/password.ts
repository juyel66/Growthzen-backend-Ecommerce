import bcrypt from "bcryptjs";
import { PASSWORD_SALT_ROUNDS } from "../constants/auth";

export const hashValue = async (value: string): Promise<string> => {
  return bcrypt.hash(value, PASSWORD_SALT_ROUNDS);
};

export const compareValue = async (value: string, hashedValue: string): Promise<boolean> => {
  return bcrypt.compare(value, hashedValue);
};