import crypto from 'crypto';
import bcrypt from 'bcryptjs';

function generateApiKey() {
  const apiKey = crypto.randomBytes(32).toString('hex');
  return apiKey;
};

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  return hash;
}

export { generateApiKey, hashPassword };