// Implementation of AES-GCM using Web Crypto API

// Helper para converter string para ArrayBuffer
const getMessageEncoding = (text) => {
    let enc = new TextEncoder();
    return enc.encode(text);
};

// Helper para converter ArrayBuffer para Base64
const bufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

// Helper para converter Base64 para ArrayBuffer
const base64ToBuffer = (base64) => {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
};

// Derivação de chave PBKDF2 baseada no UID do usuário
const getDerivedKey = async (uid) => {
    const material = await window.crypto.subtle.importKey(
        "raw",
        getMessageEncoding(uid + "job-fit-analyzer-salt-2026"),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );
    
    return await window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: getMessageEncoding("fixed-app-salt-do-not-change"),
            iterations: 100000,
            hash: "SHA-256"
        },
        material,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
};

export const encryptText = async (text, uid) => {
    if (!text || !uid) return null;
    const key = await getDerivedKey(uid);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = getMessageEncoding(text);
    
    const ciphertext = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        encoded
    );
    
    // Retornamos iv e ciphertext codificados em base64
    return JSON.stringify({
        iv: bufferToBase64(iv.buffer),
        data: bufferToBase64(ciphertext)
    });
};

export const decryptText = async (encryptedString, uid) => {
    if (!encryptedString || !uid) return null;
    try {
        const { iv, data } = JSON.parse(encryptedString);
        const key = await getDerivedKey(uid);
        
        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: new Uint8Array(base64ToBuffer(iv))
            },
            key,
            base64ToBuffer(data)
        );
        
        let dec = new TextDecoder();
        return dec.decode(decrypted);
    } catch (e) {
        console.error("Falha ao descriptografar:", e);
        return null;
    }
};
