import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export const hashValue = async (value: string): Promise<string> => bcrypt.hash(value, SALT_ROUNDS);

export const compareHash = async (value: string, hashedValue: string): Promise<boolean> =>
  bcrypt.compare(value, hashedValue);
