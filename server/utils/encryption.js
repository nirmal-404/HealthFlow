const CryptoJS = require('crypto-js');

// Get encryption key from environment variable or use fallback
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-secret-key-healthflow';

const encrypt = (text) => {
  if (!text) return text;
  try {
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Encryption failed:', error);
    return text;
  }
};

const decrypt = (ciphertext) => {
  if (!ciphertext) return ciphertext;
  try {
    // Try to decrypt
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    // If decryption results in empty string but input wasn't empty,
    // this was likely not an encrypted message
    if (!decrypted && ciphertext) {
      return ciphertext;
    }
    return decrypted;
  } catch (error) {
    // If decryption fails, the message might not be encrypted
    console.log('Decryption failed, returning original text');
    return ciphertext;
  }
};

module.exports = { encrypt, decrypt };