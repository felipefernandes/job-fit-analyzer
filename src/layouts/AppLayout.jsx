import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logout } from '../services/auth';

export default function AppLayout() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    React.useEffect(() => {
        if (!loading && !user) {
            navigate('/');
        }
    }, [user, loading, navigate]);

    if (loading || !user) return (
        <div style={{ minHeight: "100vh", background: "#0b0b11", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem", color: "#22d78f" }}>carregando...</span>
        </div>
    );

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const navLinkStyle = ({ isActive }) => ({
        color: isActive ? "#00ff88" : "#8888a8",
        textDecoration: "none",
        fontWeight: isActive ? 700 : 400,
        padding: "8px 12px",
        borderRadius: "4px",
        background: isActive ? "rgba(0, 255, 136, 0.1)" : "transparent",
        transition: "all 0.2s"
    });

    return (
        <div style={{ minHeight: "100vh", background: "#0b0b11", color: "#ddddf5", fontFamily: "'DM Sans', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
                .mono { font-family: 'JetBrains Mono', monospace; }
                .navbar { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; background: #13131f; border-bottom: 1px solid #1e1e32; }
                .nav-links { display: flex; gap: 1rem; }
                .user-info { display: flex; align-items: center; gap: 1rem; }
                .avatar { width: 32px; height: 32px; border-radius: 50%; border: 1px solid #1e1e32; }
                .logout-btn { background: transparent; border: 1px solid #383858; color: #8888a8; padding: 6px 12px; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
                .logout-btn:hover { border-color: #ff4466; color: #ff4466; }
                
                @media (max-width: 600px) {
                    .navbar { flex-direction: column; gap: 1rem; align-items: stretch; }
                    .nav-links { justify-content: center; }
                    .user-info { justify-content: space-between; }
                }
            `}</style>
            
            <nav className="navbar">
                <div className="mono" style={{ color: "#00d4ff", fontWeight: 700 }}>job-fit-analyzer</div>
                
                <div className="nav-links mono" style={{ fontSize: "0.8rem" }}>
                    <NavLink to="/app" end style={navLinkStyle}>Nova Análise</NavLink>
                    <NavLink to="/app/history" style={navLinkStyle}>Histórico</NavLink>
                    <NavLink to="/app/profile" style={navLinkStyle}>Perfil</NavLink>
                </div>
                
                <div className="user-info">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {user.photoURL && <img src={user.photoURL} alt="Avatar" className="avatar" />}
                        <span style={{ fontSize: "0.85rem", color: "#c0c0de" }}>{user.displayName?.split(" ")[0] || "Usuário"}</span>
                    </div>
                    <button className="logout-btn mono" style={{ fontSize: "0.7rem" }} onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </nav>

            <main style={{ flex: 1 }}>
                <Outlet />
            </main>
        </div>
    );
}
