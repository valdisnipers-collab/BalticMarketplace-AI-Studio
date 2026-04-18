/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './components/AuthContext';
import { I18nProvider } from './components/I18nContext';
import { NotificationProvider } from './components/NotificationProvider';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AddListing from './pages/AddListing';
import EditListing from './pages/EditListing';
import ListingDetails from './pages/ListingDetails';
import Profile from './pages/Profile';
import Search from './pages/Search';
import Chat from './pages/Chat';
import AdminDashboard from './pages/AdminDashboard';
import StorePage from './pages/StorePage';

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -10 }
};

const pageTransition = {
  duration: 0.3
};

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><Home /></motion.div>} />
        <Route path="/search" element={<motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><Search /></motion.div>} />
        <Route path="/chat" element={<motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><Chat /></motion.div>} />
        <Route path="/login" element={<motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><Login /></motion.div>} />
        <Route path="/register" element={<motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><Register /></motion.div>} />
        <Route path="/add" element={<motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><AddListing /></motion.div>} />
        <Route path="/edit/:id" element={<motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><EditListing /></motion.div>} />
        <Route path="/listing/:id" element={<motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><ListingDetails /></motion.div>} />
        <Route path="/profile" element={<motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><Profile /></motion.div>} />
        <Route path="/admin" element={<motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><AdminDashboard /></motion.div>} />
        <Route path="/store/:slug" element={<motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><StorePage /></motion.div>} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <I18nProvider>
        <AuthProvider>
          <NotificationProvider>
            <Router>
              <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
                <Navbar />
                {/* Fade-out efekts, kas darbojas zem galvenes */}
                <div className="sticky top-0 z-[95] h-20 w-full bg-gradient-to-t from-transparent to-slate-50 pointer-events-none -mb-20" />
                <main className="flex-grow">
                  <AnimatedRoutes />
                </main>
                <BottomNav />
              </div>
            </Router>
          </NotificationProvider>
        </AuthProvider>
      </I18nProvider>
    </HelmetProvider>
  );
}
