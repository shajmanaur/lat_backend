require('dotenv').config();
import { encrypt } from './src/utils/encryption';
console.log('Encrypted password123:', encrypt('password123'));
