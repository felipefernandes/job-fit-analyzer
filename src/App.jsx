import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Landing from './pages/Landing';
import AppLayout from './layouts/AppLayout';
import Analyzer from './pages/Analyzer';
import History from './pages/History';
import Profile from './pages/Profile';

export default function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<Landing />} />
                    
                    <Route path="/app" element={<AppLayout />}>
                        <Route index element={<Analyzer />} />
                        <Route path="history" element={<History />} />
                        <Route path="profile" element={<Profile />} />
                    </Route>
                </Routes>
            </Router>
        </AuthProvider>
    );
}
