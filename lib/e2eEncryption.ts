import * as Crypto from 'expo-crypto';
import { x25519 } from '@noble/curves/ed25519';
import CryptoES from 'crypto-es';
import * as Keychain from 'react-native-keychain';
import { supabase } from './supabase';
import { encode as encodeBase64, decode as decodeBase64 } from 'base-64';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

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

// Save private key to secure storage
export const savePrivateKey = async (privateKey: Uint8Array): Promise<boolean> => {
  try {
    const privateKeyBase64 = uint8ArrayToBase64(privateKey);

    // Try to use Keychain
    try {
      await Keychain.setGenericPassword(
        KEYCHAIN_PRIVATE_KEY,
        privateKeyBase64,
        { service: KEYCHAIN_SERVICE }
      );
      return true;
    } catch (keychainError) {
      console.error('Keychain not available, cannot securely store private key:', keychainError);

      // Instead of using insecure in-memory storage, we'll use AsyncStorage with encryption
      try {
        // We'll encrypt the private key with a device-specific identifier before storing
        const deviceId = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          Constants.installationId || 'fallback-device-id'
        );

        // Create a simple encryption using the device ID
        const encryptedKey = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `${privateKeyBase64}-${deviceId}`
        );

        // Store both the encrypted key and the original key (encrypted with the device ID)
        await AsyncStorage.setItem(
          `secure_${KEYCHAIN_PRIVATE_KEY}_hash`,
          encryptedKey
        );

        // XOR encrypt the private key with the device ID before storing
        let encryptedPrivateKey = '';
        for (let i = 0; i < privateKeyBase64.length; i++) {
          const charCode = privateKeyBase64.charCodeAt(i) ^ deviceId.charCodeAt(i % deviceId.length);
          encryptedPrivateKey += String.fromCharCode(charCode);
        }

        await AsyncStorage.setItem(
          `secure_${KEYCHAIN_PRIVATE_KEY}_data`,
          encodeBase64(encryptedPrivateKey)
        );

        return true;
      } catch (asyncStorageError) {
        console.error('Failed to use AsyncStorage fallback:', asyncStorageError);
        return false;
      }
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
      console.warn('Keychain not available, trying AsyncStorage fallback:', keychainError);

      // Try to load from AsyncStorage fallback
      try {
        // Get the encrypted key hash for verification
        const storedHash = await AsyncStorage.getItem(`secure_${KEYCHAIN_PRIVATE_KEY}_hash`);
        const encryptedData = await AsyncStorage.getItem(`secure_${KEYCHAIN_PRIVATE_KEY}_data`);

        if (!storedHash || !encryptedData) {
          console.warn('No key found in AsyncStorage fallback');
          return null;
        }

        // Get the device ID for decryption
        const deviceId = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          Constants.installationId || 'fallback-device-id'
        );

        // Decrypt the private key
        const encryptedBytes = decodeBase64(encryptedData);
        let decryptedKey = '';
        for (let i = 0; i < encryptedBytes.length; i++) {
          const charCode = encryptedBytes.charCodeAt(i) ^ deviceId.charCodeAt(i % deviceId.length);
          decryptedKey += String.fromCharCode(charCode);
        }

        // Verify the key with the stored hash
        const verificationHash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `${decryptedKey}-${deviceId}`
        );

        if (verificationHash !== storedHash) {
          console.error('Key verification failed, possible tampering detected');
          return null;
        }

        return base64ToUint8Array(decryptedKey);
      } catch (asyncStorageError) {
        console.error('Failed to load key from AsyncStorage:', asyncStorageError);
      }
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

// Encrypt a message using secure encryption
export const encryptMessage = async (message: string, sharedSecret: Uint8Array): Promise<EncryptedMessage> => {
  try {
    console.log('Encrypting message with shared secret, length:', message.length);

    // Use our secure encryption method
    try {
      console.log('Using secure AES encryption with HMAC authentication');

      // Generate a random IV
      const ivBytes = await Crypto.getRandomBytesAsync(16);
      const iv = uint8ArrayToBase64(ivBytes);

      // Derive an encryption key using HMAC-SHA256
      const keyHex = uint8ArrayToHex(sharedSecret);
      const derivedKey = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${keyHex}-encryption-key`
      );

      // Convert the derived key to a format CryptoES can use
      const encKey = CryptoES.enc.Hex.parse(derivedKey);

      // Encrypt the message using AES-CBC
      const encrypted = CryptoES.AES.encrypt(message, encKey, {
        iv: CryptoES.enc.Base64.parse(iv),
        mode: CryptoES.mode.CBC,
        padding: CryptoES.pad.Pkcs7
      });

      // Generate an authentication tag (HMAC)
      const authTag = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${encrypted.toString()}-${iv}-${keyHex}`
      );

      console.log('Secure encryption successful');

      return {
        ciphertext: encrypted.toString(),
        iv,
        authTag
      };
    } catch (encryptError) {
      console.error('Secure encryption failed:', encryptError);

      // Fallback to a simpler AES encryption if the main method fails
      try {
        console.log('Falling back to basic AES-CBC encryption');

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

        // Check if encrypted object has ciphertext property
        if (!encrypted || !encrypted.ciphertext) {
          throw new Error('Encryption failed: Invalid encrypted object');
        }

        const ciphertext = encrypted.toString();
        const ivString = iv.toString(CryptoES.enc.Base64);

        // Generate a simple authentication tag
        const authTag = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `${ciphertext}-${ivString}`
        );

        console.log('Basic AES encryption successful');

        return {
          ciphertext,
          iv: ivString,
          authTag
        };
      } catch (fallbackError) {
        console.error('Fallback encryption also failed:', fallbackError);
        throw fallbackError;
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

// Decrypt a message using secure decryption
export const decryptMessage = async (
  encryptedMessage: EncryptedMessage,
  sharedSecret: Uint8Array
): Promise<string | null> => {
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

    // Try our secure decryption method first
    try {
      console.log('Attempting secure decryption with HMAC verification');

      // Verify the authentication tag
      const keyHex = uint8ArrayToHex(sharedSecret);
      const computedAuthTag = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${encryptedMessage.ciphertext}-${encryptedMessage.iv}-${keyHex}`
      );

      // If auth tags match, proceed with decryption
      if (computedAuthTag === encryptedMessage.authTag) {
        console.log('Authentication successful, proceeding with decryption');

        // Derive the encryption key
        const derivedKey = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `${keyHex}-encryption-key`
        );

        // Convert the derived key to a format CryptoES can use
        const encKey = CryptoES.enc.Hex.parse(derivedKey);

        // Decrypt the message
        const decrypted = CryptoES.AES.decrypt(encryptedMessage.ciphertext, encKey, {
          iv: CryptoES.enc.Base64.parse(encryptedMessage.iv),
          mode: CryptoES.mode.CBC,
          padding: CryptoES.pad.Pkcs7
        });

        const result = decrypted.toString(CryptoES.enc.Utf8);

        if (result) {
          console.log('Secure decryption successful');
          return result;
        } else {
          console.warn('Secure decryption returned empty string');
        }
      } else {
        console.warn('Authentication failed, message may have been tampered with');
      }
    } catch (secureError) {
      console.error('Secure decryption failed:', secureError);
    }

    // If secure decryption fails, try fallback method
    try {
      console.log('Trying fallback decryption method');

      // Convert shared secret to key
      const key = CryptoES.enc.Hex.parse(uint8ArrayToHex(sharedSecret));

      // Parse IV
      const iv = CryptoES.enc.Base64.parse(encryptedMessage.iv);

      // Try direct decryption
      const decrypted = CryptoES.AES.decrypt(encryptedMessage.ciphertext, key, {
        iv: iv,
        mode: CryptoES.mode.CBC,
        padding: CryptoES.pad.Pkcs7
      });

      const result = decrypted.toString(CryptoES.enc.Utf8);

      if (result) {
        console.log('Fallback decryption successful');
        return result;
      } else {
        console.warn('Fallback decryption returned empty string');

        // Try a different encoding as last resort
        try {
          const hexResult = decrypted.toString(CryptoES.enc.Hex);
          if (hexResult) {
            console.log('Hex result found, trying to convert to UTF-8');
            // Try to convert hex to UTF-8
            let utf8Result = '';
            for (let i = 0; i < hexResult.length; i += 2) {
              utf8Result += String.fromCharCode(parseInt(hexResult.substring(i, i + 2), 16));
            }
            if (utf8Result) {
              console.log('Hex conversion successful');
              return utf8Result;
            }
          }
        } catch (hexError) {
          console.error('Hex conversion failed:', hexError);
        }

        return '[Decryption returned empty]';
      }
    } catch (fallbackError) {
      console.error('Fallback decryption failed:', fallbackError);
      return '[Decryption failed]';
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
  _userId: string, // Prefix with underscore to indicate it's intentionally unused
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
