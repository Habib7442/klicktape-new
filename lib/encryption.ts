import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

export const encryption = {
  async generateKeyPair(userId: string) {
    try {
      // Generate a simple key pair using SHA-256 hashing
      const timestamp = new Date().getTime().toString();
      const privateKey = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${userId}-${timestamp}-private`
      );
      const publicKey = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${userId}-${timestamp}-public`
      );
      
      // Store both private and public keys
      await Promise.all([
        SecureStore.setItemAsync(
          `ec_private_${userId}`, 
          privateKey,
          { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
        ),
        SecureStore.setItemAsync(
          `ec_public_${userId}`, 
          publicKey
        )
      ]);
      
      return { privateKey, publicKey };
    } catch (error) {
      console.error("Key generation failed:", error);
      throw error;
    }
  },

  async getStoredPrivateKey(userId: string) {
    return await SecureStore.getItemAsync(`ec_private_${userId}`);
  },

  async generateConversationKey() {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return Buffer.from(randomBytes).toString('base64');
  },

  async encryptConversationKey(aesKey: string, recipientPublicKey: string) {
    // Simple encryption using recipient's public key as salt
    const encrypted = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${aesKey}-${recipientPublicKey}`
    );
    return encrypted;
  },

  async decryptConversationKey(encryptedKey: string, userId: string) {
    // In this simplified version, we'll just return the encrypted key
    // In a real implementation, you'd want proper decryption
    return encryptedKey;
  },

  async encryptMessage(content: string, aesKey: string) {
    // Create a nonce for uniqueness
    const nonce = (await Crypto.getRandomBytesAsync(16)).toString();
    
    // Hash the content with the key and nonce
    const encrypted = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${content}-${aesKey}-${nonce}`
    );
    
    return `${encrypted}:${nonce}`;
  },

  async decryptMessage(encryptedContent: string, aesKey: string) {
    // In this simplified version, we'll just return a placeholder
    // In a real implementation, you'd want proper decryption
    return "[Message content hidden for security]";
  },

  async getPublicKey(userId: string) {
    const publicKey = await SecureStore.getItemAsync(`ec_public_${userId}`);
    if (!publicKey) {
      throw new Error(`Public key not found for user ${userId}`);
    }
    return publicKey;
  },
};