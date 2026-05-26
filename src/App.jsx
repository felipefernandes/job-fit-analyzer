import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Landing from './pages/Landing';
import AppLayout from './layouts/AppLayout';
import Analyzer from './pages/Analyzer';
import History from './pages/History';
import Profile from './pages/Profile';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import ConsentBanner from './components/ConsentBanner';

export default function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    
                    <Route path="/app" element={<AppLayout />}>
                        <Route index element={<Analyzer />} />
                        <Route path="history" element={<History />} />
                        <Route path="profile" element={<Profile />} />
                    </Route>
                </Routes>
                <ConsentBanner />
            </Router>
        </AuthProvider>
    );
}
