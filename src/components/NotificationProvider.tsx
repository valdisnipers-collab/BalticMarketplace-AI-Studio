import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

interface NotificationContextType {
  addNotification: (notification: Omit<Notification, 'id'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const socketRef = useRef<Socket | null>(null);

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { ...notification, id }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    if (user) {
      socketRef.current = io();
      socketRef.current.emit('join', user.id);

      socketRef.current.on('new_message', (message: any) => {
        // Don't show notification if we are on the chat page
        if (window.location.pathname !== '/chat') {
          addNotification({
            title: 'Jauna ziņa',
            message: message.content || 'Jums ir jauna ziņa ar attēlu',
            type: 'info'
          });
        }
      });

      socketRef.current.on('order_shipped', (order: any) => {
        addNotification({
          title: 'Pasūtījums izsūtīts!',
          message: `Jūsu pirkums "${order.listing_title}" ir izsūtīts.`,
          type: 'success'
        });
      });

      socketRef.current.on('order_completed', (order: any) => {
        addNotification({
          title: 'Darījums pabeigts',
          message: `Pircējs apstiprināja preces "${order.listing_title}" saņemšanu. Nauda ir pārskaitīta!`,
          type: 'success'
        });
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [user]);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <div className="fixed bottom-24 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {notifications.map(notification => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto w-80 bg-white rounded-2xl shadow-xl border p-4 flex items-start gap-3 ${
                notification.type === 'success' ? 'border-emerald-200' :
                notification.type === 'warning' ? 'border-amber-200' :
                'border-blue-200'
              }`}
            >
              <div className={`mt-0.5 flex-shrink-0 ${
                notification.type === 'success' ? 'text-emerald-500' :
                notification.type === 'warning' ? 'text-amber-500' :
                'text-blue-500'
              }`}>
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-grow">
                <h4 className="text-sm font-bold text-slate-900">{notification.title}</h4>
                <p className="text-xs text-slate-600 mt-1">{notification.message}</p>
              </div>
              <button 
                onClick={() => removeNotification(notification.id)}
                className="text-slate-400 hover:text-slate-600 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
