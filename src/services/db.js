import { db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, orderBy, serverTimestamp, deleteDoc } from "firebase/firestore";
import { encryptText, decryptText } from "./crypto";

export const getUserProfile = async (uid) => {
    const docRef = doc(db, "users", uid, "profile", "main");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        return snap.data();
    }
    return null;
};

export const saveUserProfile = async (uid, data) => {
    const docRef = doc(db, "users", uid, "profile", "main");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
    } else {
        await setDoc(docRef, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
};

export const saveResumeToDb = async (uid, resumeContent, source = "markdown", sourceUrl = "") => {
    const docRef = doc(db, "users", uid, "resume", "main");
    const payload = {
        content: resumeContent,
        source,
        sourceUrl,
        updatedAt: serverTimestamp()
    };
    await setDoc(docRef, payload, { merge: true });
};

export const getResumeFromDb = async (uid) => {
    const docRef = doc(db, "users", uid, "resume", "main");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        return snap.data();
    }
    return null;
};

export const saveLlmKey = async (uid, provider, plainKey) => {
    const docRef = doc(db, "users", uid, "llmKeys", provider);
    const encryptedKey = await encryptText(plainKey, uid);
    if (!encryptedKey) throw new Error("Falha ao criptografar a chave.");
    await setDoc(docRef, {
        encryptedKey,
        addedAt: serverTimestamp()
    });
};

export const getLlmKey = async (uid, provider) => {
    const docRef = doc(db, "users", uid, "llmKeys", provider);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        const { encryptedKey } = snap.data();
        if (encryptedKey) {
            return await decryptText(encryptedKey, uid);
        }
    }
    return null;
};

export const removeLlmKey = async (uid, provider) => {
    const docRef = doc(db, "users", uid, "llmKeys", provider);
    await setDoc(docRef, { encryptedKey: "", removedAt: serverTimestamp() });
};

export const saveAnalysis = async (uid, analysisData) => {
    const analysesRef = collection(db, "users", uid, "analyses");
    await addDoc(analysesRef, {
        ...analysisData,
        createdAt: serverTimestamp()
    });
};

export const getAnalysesHistory = async (uid) => {
    const analysesRef = collection(db, "users", uid, "analyses");
    const q = query(analysesRef, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const deleteAnalysis = async (uid, analysisId) => {
    const docRef = doc(db, "users", uid, "analyses", analysisId);
    await deleteDoc(docRef);
};

export const deleteUserData = async (uid) => {
    try {
        // 1. Apagar documento do perfil
        const profileRef = doc(db, "users", uid, "profile", "main");
        await deleteDoc(profileRef);

        // 2. Apagar documento do currículo
        const resumeRef = doc(db, "users", uid, "resume", "main");
        await deleteDoc(resumeRef);

        // 3. Apagar chaves de API
        const providers = ["gemini", "groq", "openai", "anthropic", "openrouter", "deepseek"];
        const deleteKeyPromises = providers.map(p => deleteDoc(doc(db, "users", uid, "llmKeys", p)));
        await Promise.all(deleteKeyPromises);

        // 4. Apagar todo o histórico de análises
        const analysesRef = collection(db, "users", uid, "analyses");
        const snap = await getDocs(analysesRef);
        const deletePromises = snap.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
    } catch (error) {
        console.error("Erro ao apagar dados do Firestore:", error);
        throw error;
    }
};
