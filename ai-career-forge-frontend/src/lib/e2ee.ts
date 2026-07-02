/**
 * Client-side End-to-End Encryption (E2EE) utilities using the browser Web Crypto API.
 * Uses ECDH (curve P-256) for key agreement and AES-GCM (256-bit) for message encryption.
 */

// Helper to convert Uint8Array or ArrayBuffer to Base64
function bufferToBase64(bytes: Uint8Array | ArrayBuffer): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return window.btoa(binary);
}

// Helper to convert Base64 to Uint8Array
function base64ToBuffer(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generates an ECDH (curve P-256) keypair for the user.
 * Returns public and private keys in JWK (JSON Web Key) format.
 */
export async function generateE2eeKeyPair(): Promise<{ publicKeyJwk: any; privateKeyJwk: any }> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true, // extractable
    ["deriveKey", "deriveBits"]
  );

  const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

  return { publicKeyJwk, privateKeyJwk };
}

/**
 * Derives a shared AES-GCM 256-bit key from the user's private key and another user's public key.
 */
export async function deriveSharedKey(
  myPrivateKeyJwk: any,
  theirPublicKeyJwk: any
): Promise<CryptoKey> {
  const privateKey = await window.crypto.subtle.importKey(
    "jwk",
    myPrivateKeyJwk,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey"]
  );

  const publicKey = await window.crypto.subtle.importKey(
    "jwk",
    theirPublicKeyJwk,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    []
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: publicKey,
    },
    privateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a plaintext message using a derived shared key.
 * Returns a JSON payload string containing the ciphertext and IV in Base64 format.
 */
export async function encryptMessage(
  plaintext: string,
  sharedKey: CryptoKey
): Promise<string> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12-byte IV is standard for AES-GCM
  const encodedContent = new TextEncoder().encode(plaintext);

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as any,
    },
    sharedKey,
    encodedContent as any
  );

  const ciphertextBase64 = bufferToBase64(ciphertextBuffer);
  const ivBase64 = bufferToBase64(iv);

  return JSON.stringify({
    encrypted: true,
    iv: ivBase64,
    ciphertext: ciphertextBase64,
  });
}

/**
 * Decrypts an encrypted message payload string using a derived shared key.
 */
export async function decryptMessage(
  encryptedPayload: string,
  sharedKey: CryptoKey
): Promise<string> {
  try {
    const payload = JSON.parse(encryptedPayload);
    if (!payload.encrypted || !payload.iv || !payload.ciphertext) {
      throw new Error("Invalid E2EE payload structure");
    }

    const iv = base64ToBuffer(payload.iv);
    const ciphertext = base64ToBuffer(payload.ciphertext);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv as any,
      },
      sharedKey,
      ciphertext as any
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error("E2EE Decryption failed:", error);
    return "[E2EE Decryption Failed: Unable to decode content]";
  }
}
