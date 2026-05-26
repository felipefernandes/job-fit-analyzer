import { auth } from "../firebase";
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, deleteUser, reauthenticateWithPopup } from "firebase/auth";

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

export const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        console.error("Erro ao fazer login com Google:", error);
        throw error;
    }
};

export const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
        throw error;
    }
};

export const subscribeToAuthChanges = (callback) => {
    return onAuthStateChanged(auth, callback);
};

export const deleteCurrentUserAccount = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("Nenhum usuário autenticado.");

    try {
        await deleteUser(user);
    } catch (error) {
        if (error.code === 'auth/requires-recent-login') {
            const reauthProvider = new GoogleAuthProvider();
            reauthProvider.setCustomParameters({ prompt: 'select_account' });
            await reauthenticateWithPopup(user, reauthProvider);
            await deleteUser(user);
        } else {
            console.error("Erro ao excluir conta do Firebase Auth:", error);
            throw error;
        }
    }
};
