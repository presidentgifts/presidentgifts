import bcrypt from "bcryptjs";

const COST = 12;

export const MIN_PASSWORD_LENGTH = 10;

export function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

let dummyHash: Promise<string> | undefined;

/** Compares against a throwaway hash when the email doesn't exist, so response time doesn't reveal that. */
export async function verifyAgainstDummy(password: string): Promise<false> {
    dummyHash ??= bcrypt.hash("not-a-real-password", COST);
    await bcrypt.compare(password, await dummyHash);
    return false;
}
