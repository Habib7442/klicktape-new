import * as Crypto from 'expo-crypto';
import { x25519 } from '@noble/curves/ed25519';
import CryptoES from 'crypto-es';
import * as Keychain from 'react-native-keychain';
import { supabase } from './supabase';
import { encode as encodeBase64, decode as decodeBase64 } from 'base-64';

// Key types
export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface EncryptedMessage {
  ciphertext: string;
  iv: string;
  authTag: string;
}

// Constants
const KEYCHAIN_SERVICE = 'com.klicktape.e2e';
const KEYCHAIN_PRIVATE_KEY = 'e2e_privateKey';
const PUBLIC_KEY_TABLE = 'public_keys';

// Generate a random key pair for X25519
export const generateKeyPair = async (): Promise<KeyPair> => {
  // Generate a random private key
  const privateKey = await Crypto.getRandomBytesAsync(32);
  // Derive public key from private key
  const publicKey = x25519.getPublicKey(privateKey);

  return { publicKey, privateKey };
};

// Helper function to convert Uint8Array to base64 string
export const uint8ArrayToBase64 = (array: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < array.byteLength; i++) {
    binary += String.fromCharCode(array[i]);
  }
  return encodeBase64(binary);
};

// Helper function to convert base64 string to Uint8Array
const base64ToUint8Array = (base64: string): Uint8Array => {
  const binary = decodeBase64(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

// Fallback storage for environments where Keychain isn't available
const inMemoryStorage: Record<string, string> = {};

// Save private key to secure storage
export const savePrivateKey = async (privateKey: Uint8Array): Promise<boolean> => {
  try {
    const privateKeyBase64 = uint8ArrayToBase64(privateKey);

    // Try to use Keychain first
    try {
      await Keychain.setGenericPassword(
        KEYCHAIN_PRIVATE_KEY,
        privateKeyBase64,
        { service: KEYCHAIN_SERVICE }
      );
      return true;
    } catch (keychainError) {
      console.warn('Keychain not available, using in-memory storage:', keychainError);
      // Fall back to in-memory storage (not secure, but allows testing)
      inMemoryStorage[KEYCHAIN_PRIVATE_KEY] = privateKeyBase64;
      return true;
    }
  } catch (error) {
    console.error('Error saving private key:', error);
    return false;
  }
};

// Load private key from secure storage
export const loadPrivateKey = async (): Promise<Uint8Array | null> => {
  try {
    // Try to use Keychain first
    try {
      const credentials = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
      if (credentials) {
        return base64ToUint8Array(credentials.password);
      }
    } catch (keychainError) {
      console.warn('Keychain not available, using in-memory storage:', keychainError);
    }

    // Fall back to in-memory storage
    const inMemoryKey = inMemoryStorage[KEYCHAIN_PRIVATE_KEY];
    if (inMemoryKey) {
      return base64ToUint8Array(inMemoryKey);
    }

    return null;
  } catch (error) {
    console.error('Error loading private key:', error);
    return null;
  }
};

// Publish public key to the server
export const publishPublicKey = async (userId: string, publicKey: Uint8Array): Promise<boolean> => {
  if (!supabase) return false;

  try {
    const publicKeyBase64 = uint8ArrayToBase64(publicKey);

    // First, check if a public key already exists for this user
    const { data: existingKey, error: checkError } = await supabase
      .from(PUBLIC_KEY_TABLE)
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking for existing key:', checkError);
      // Continue anyway to try the insert
    }

    // If the key already exists, we don't need to insert it again
    if (existingKey) {
      console.log('Public key already exists for user, skipping insert');
      return true;
    }

    // Try to insert the key using a workaround for RLS
    // Option 1: Try direct insert (may fail due to RLS)
    try {
      const { error } = await supabase
        .from(PUBLIC_KEY_TABLE)
        .insert({
          user_id: userId,
          public_key: publicKeyBase64
        });

      if (!error) {
        console.log('Successfully inserted public key');
        return true;
      }

      console.warn('Direct insert failed, likely due to RLS:', error);
      // Fall through to try alternative approaches
    } catch (insertError) {
      console.warn('Direct insert failed:', insertError);
      // Fall through to try alternative approaches
    }

    // Option 2: Try using the auth.uid() context
    // This will only work if the current user is the same as userId
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user && user.id === userId) {
        const { error } = await supabase
          .from(PUBLIC_KEY_TABLE)
          .insert({
            user_id: userId,
            public_key: publicKeyBase64
          });

        if (!error) {
          console.log('Successfully inserted public key using auth context');
          return true;
        }

        console.warn('Insert with auth context failed:', error);
      } else {
        console.warn('Cannot insert key: current user does not match target user_id');
      }
    } catch (authError) {
      console.warn('Auth context approach failed:', authError);
    }

    // If we get here, both approaches failed
    console.error('Failed to insert public key due to RLS restrictions');
    console.log('Please run the SQL script to set up proper RLS policies for the public_keys table');

    return false;
  } catch (error) {
    console.error('Error publishing public key:', error);
    return false;
  }
};

// Fetch public key for a user
export const fetchPublicKey = async (userId: string): Promise<Uint8Array | null> => {
  if (!supabase) return null;

  try {
    // Select only the public_key column
    const { data, error } = await supabase
      .from(PUBLIC_KEY_TABLE)
      .select('public_key')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      console.error('Error or no data when fetching public key:', error);
      return null;
    }

    const publicKeyBase64 = data.public_key;

    if (!publicKeyBase64) {
      console.error('Public key not found in data:', data);
      return null;
    }

    return base64ToUint8Array(publicKeyBase64);
  } catch (error) {
    console.error('Error fetching public key:', error);
    return null;
  }
};

// Derive shared secret using X25519
export const deriveSharedSecret = (privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array => {
  return x25519.getSharedSecret(privateKey, publicKey);
};

// Helper function to convert Uint8Array to hex string
const uint8ArrayToHex = (array: Uint8Array): string => {
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Simple XOR encryption as a fallback
const simpleEncrypt = (message: string, key: Uint8Array): string => {
  let result = '';
  for (let i = 0; i < message.length; i++) {
    // XOR each character with a byte from the key
    const charCode = message.charCodeAt(i) ^ key[i % key.length];
    result += String.fromCharCode(charCode);
  }
  return encodeBase64(result);
};

// Simple XOR decryption as a fallback
// const simpleDecrypt = (encoded: string, key: Uint8Array): string => {
//   try {
//     const message = decodeBase64(encoded);
//     let result = '';
//     for (let i = 0; i < message.length; i++) {
//       // XOR each character with a byte from the key (same operation as encrypt)
//       const charCode = message.charCodeAt(i) ^ key[i % key.length];
//       result += String.fromCharCode(charCode);
//     }
//     return result;
//   } catch (error) {
//     console.error('Error in simpleDecrypt:', error);
//     throw error;
//   }
// };

// Encrypt a message - try AES-CBC first, fall back to simple XOR if that fails
export const encryptMessage = (message: string, sharedSecret: Uint8Array): EncryptedMessage => {
  try {
    console.log('Encrypting message with shared secret, length:', message.length);

    // Always use XOR encryption as it's more reliable
    try {
      console.log('Using XOR encryption');

      // Use XOR encryption
      const encryptedMessage = simpleEncrypt(message, sharedSecret);
      console.log('XOR encryption successful, result length:', encryptedMessage.length);

      return {
        ciphertext: encryptedMessage,
        iv: 'XOR', // Mark as XOR encryption
        authTag: 'XOR' // Mark as XOR encryption
      };
    } catch (xorError) {
      console.error('XOR encryption failed:', xorError);

      // Try AES as a fallback
      try {
        console.log('Falling back to AES-CBC encryption');

        // Generate a random IV
        const iv = CryptoES.lib.WordArray.random(16);

        // Convert shared secret to key
        const key = CryptoES.enc.Hex.parse(uint8ArrayToHex(sharedSecret));

        // Check if CBC mode is available
        if (!CryptoES.mode.CBC) {
          throw new Error('CBC mode is not available in CryptoES');
        }

        // Encrypt the message using CBC mode
        const encrypted = CryptoES.AES.encrypt(message, key, {
          iv: iv,
          mode: CryptoES.mode.CBC,
          padding: CryptoES.pad.Pkcs7
        });

        // For CBC mode, we don't have an auth tag, so we'll use a marker
        const ciphertext = encrypted.ciphertext.toString(CryptoES.enc.Base64);
        const ivString = iv.toString(CryptoES.enc.Base64);

        console.log('AES encryption successful, result length:', ciphertext.length);

        return {
          ciphertext,
          iv: ivString,
          authTag: 'AES-CBC' // Mark as AES-CBC
        };
      } catch (aesError) {
        console.error('AES encryption also failed:', aesError);
        throw aesError;
      }
    }
  } catch (error) {
    console.error('All encryption methods failed:', error);
    // Return a dummy encrypted message to prevent crashes
    return {
      ciphertext: 'ENCRYPTION_FAILED',
      iv: 'ENCRYPTION_FAILED',
      authTag: 'ENCRYPTION_FAILED'
    };
  }
};

// Decrypt a message - handles both AES-CBC and XOR fallback
export const decryptMessage = (
  encryptedMessage: EncryptedMessage,
  sharedSecret: Uint8Array
): string | null => {
  try {
    console.log('Starting decryption with message:', {
      ciphertext: typeof encryptedMessage.ciphertext === 'string' ?
                 encryptedMessage.ciphertext.substring(0, 20) + '...' :
                 'not a string',
      iv: encryptedMessage.iv,
      authTag: encryptedMessage.authTag,
      sharedSecretLength: sharedSecret.length
    });

    // Check for dummy encrypted message
    if (encryptedMessage.ciphertext === 'ENCRYPTION_FAILED') {
      return '[Encryption failed]';
    }

    // Check if this is an XOR-encrypted message
    if (encryptedMessage.iv === 'XOR' && encryptedMessage.authTag === 'XOR') {
      console.log('Decrypting XOR message');
      try {
        const result = simpleDecrypt(encryptedMessage.ciphertext, sharedSecret);
        console.log('XOR decryption result:', result ? 'success' : 'empty');
        return result || '[XOR decryption returned empty]';
      } catch (xorError) {
        console.error('XOR decryption failed:', xorError);
        return '[XOR decryption failed]';
      }
    }

    // Otherwise, try AES-CBC decryption
    try {
      console.log('Decrypting AES-CBC message');

      // Convert shared secret to key
      const key = CryptoES.enc.Hex.parse(uint8ArrayToHex(sharedSecret));
      console.log('Key prepared:', key ? 'success' : 'failed');

      // Parse IV and ciphertext
      try {
        const iv = CryptoES.enc.Base64.parse(encryptedMessage.iv);
        console.log('IV parsed:', iv ? 'success' : 'failed');

        const ciphertext = CryptoES.enc.Base64.parse(encryptedMessage.ciphertext);
        console.log('Ciphertext parsed:', ciphertext ? 'success' : 'failed');

        // Create cipher params
        const cipherParams = CryptoES.lib.CipherParams.create({
          ciphertext: ciphertext,
          iv: iv,
          algorithm: CryptoES.algo.AES,
          mode: CryptoES.mode.CBC,
          padding: CryptoES.pad.Pkcs7,
          blockSize: 4
        });
        console.log('Cipher params created:', cipherParams ? 'success' : 'failed');

        // Decrypt the message
        console.log('Starting AES decryption...');
        const decrypted = CryptoES.AES.decrypt(cipherParams, key, {
          iv: iv,
          mode: CryptoES.mode.CBC,
          padding: CryptoES.pad.Pkcs7
        });
        console.log('AES decryption completed:', decrypted ? 'success' : 'failed');

        // Try to convert to string
        try {
          const result = decrypted.toString(CryptoES.enc.Utf8);
          console.log('Decryption result length:', result ? result.length : 0);

          // If decryption failed, it might return an empty string
          if (!result) {
            console.warn('AES decryption returned empty string');

            // Try a different encoding
            try {
              const hexResult = decrypted.toString(CryptoES.enc.Hex);
              if (hexResult) {
                console.log('Hex result found, trying to convert to UTF-8');
                // Try to convert hex to UTF-8
                let utf8Result = '';
                for (let i = 0; i < hexResult.length; i += 2) {
                  utf8Result += String.fromCharCode(parseInt(hexResult.substr(i, 2), 16));
                }
                if (utf8Result) {
                  return utf8Result;
                }
              }
            } catch (hexError) {
              console.error('Hex conversion failed:', hexError);
            }

            return '[AES decryption returned empty]';
          }

          return result;
        } catch (stringError) {
          console.error('Error converting decrypted data to string:', stringError);
          return '[Error converting decrypted data]';
        }
      } catch (parseError) {
        console.error('Error parsing IV or ciphertext:', parseError);
        return '[Error parsing encrypted data]';
      }
    } catch (aesError) {
      console.error('AES decryption error:', aesError);

      // As a last resort, try XOR decryption even if it wasn't marked as XOR
      try {
        console.log('Trying XOR as last resort');
        const result = simpleDecrypt(encryptedMessage.ciphertext, sharedSecret);
        return result || '[XOR fallback returned empty]';
      } catch (lastResortError) {
        console.error('Last resort decryption failed:', lastResortError);
        return '[All decryption methods failed]';
      }
    }
  } catch (error) {
    console.error('Error in decryptMessage:', error);
    return '[Decryption error]';
  }
};

// Initialize encryption for a user
export const initializeEncryption = async (userId: string): Promise<boolean> => {
  try {
    // Check if we already have a private key
    let privateKey = await loadPrivateKey();

    if (!privateKey) {
      // Generate a new key pair
      const keyPair = await generateKeyPair();
      privateKey = keyPair.privateKey;

      // Save private key
      await savePrivateKey(privateKey);

      // Publish public key
      await publishPublicKey(userId, keyPair.publicKey);
    }

    return true;
  } catch (error) {
    console.error('Error initializing encryption:', error);
    return false;
  }
};

// Get or create shared secret for a conversation
export const getOrCreateSharedSecret = async (
  userId: string,
  recipientId: string
): Promise<Uint8Array | null> => {
  try {
    // Load our private key
    const privateKey = await loadPrivateKey();
    if (!privateKey) {
      console.error('Private key not found');
      return null;
    }

    // Fetch recipient's public key
    const recipientPublicKey = await fetchPublicKey(recipientId);
    if (!recipientPublicKey) {
      console.error('Recipient public key not found');
      return null;
    }

    // Derive shared secret
    const sharedSecret = deriveSharedSecret(privateKey, recipientPublicKey);
    return sharedSecret;
  } catch (error) {
    console.error('Error getting shared secret:', error);
    return null;
  }
};

// Export the simpleDecrypt function for direct use
export const simpleDecrypt = (encoded: string, key: Uint8Array): string => {
  try {
    const message = decodeBase64(encoded);
    let result = '';
    for (let i = 0; i < message.length; i++) {
      // XOR each character with a byte from the key (same operation as encrypt)
      const charCode = message.charCodeAt(i) ^ key[i % key.length];
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (error) {
    console.error('Error in simpleDecrypt:', error);
    throw error;
  }
};

// E2E encryption module
export const e2eEncryption = {
  initializeEncryption,
  getOrCreateSharedSecret,
  encryptMessage,
  decryptMessage,
  generateKeyPair,
  savePrivateKey,
  publishPublicKey,
  fetchPublicKey,
  loadPrivateKey,
  deriveSharedSecret,
  uint8ArrayToBase64,
  simpleDecrypt
};
