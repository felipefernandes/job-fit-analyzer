import { createContext, useContext, useEffect, useState } from "react";
import { subscribeToAuthChanges } from "../services/auth";

const AuthContext = createContext();

/* eslint-disable-next-line react-refresh/only-export-components */
export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = subscribeToAuthChanges((user) => {
            setUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        user,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
