import { BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

const encryptionKey = process.env.ENCRYPTION_KEY;
const algorithm = process.env.ALGORITHM;
const IV = '0000000000000000';

export const decrypt = (message) => {
  try {
    const decipher = crypto.createDecipheriv(algorithm, encryptionKey, IV);
    var decryptedData = decipher.update(message, 'base64', 'utf-8');
    decryptedData += decipher.final('utf8');
    return decryptedData;
  } catch (error) {
    throw new BadRequestException('Invalid message format.');
  }
};

export const encrypt = (message) => {
  const cipher = crypto.createCipheriv(algorithm, encryptionKey, IV);
  var encryptedData = cipher.update(message, 'utf-8', 'base64');
  encryptedData += cipher.final('base64');
  return encryptedData;
};
