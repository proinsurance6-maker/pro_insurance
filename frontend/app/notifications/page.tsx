'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { renewalAPI, commissionAPI } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Bell, CheckCircle, AlertCircle, Info, X } from 'lucide-react';

interface Notification {
  id: string;
  type: 'renewal' | 'commission' | 'info';
  title: string;
  message: string;
  date: string;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const [renewalsRes, commissionsRes] = await Promise.all([
        renewalAPI.getUpcoming(),
        commissionAPI.getAll(),
      ]);

      const renewals = renewalsRes.data.data;
      const commissions = commissionsRes.data.data;

      const notifs: Notification[] = [];

      // Renewal notifications
      renewals.forEach((renewal: any) => {
        if (!renewal.isRenewed) {
          const daysUntil = Math.ceil(
            (new Date(renewal.renewalDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );

          let priority: 'high' | 'medium' | 'low' = 'low';
          if (daysUntil <= 7) priority = 'high';
          else if (daysUntil <= 15) priority = 'medium';

          notifs.push({
            id: `renewal-${renewal.id}`,
            type: 'renewal',
            title: `Policy Renewal Due: ${renewal.policy?.policyNumber}`,
            message: `Policy for ${renewal.policy?.customerName} expires in ${daysUntil} days`,
            date: renewal.renewalDate,
            read: false,
            priority,
          });
        }
      });

      // Commission notifications (pending payments)
      const pendingCommissions = commissions.filter((c: any) => c.paymentStatus === 'pending');
      if (pendingCommissions.length > 0) {
        const totalPending = pendingCommissions.reduce(
          (sum: number, c: any) => sum + parseFloat(c.commissionAmount),
          0
        );

        notifs.push({
          id: 'commission-pending',
          type: 'commission',
          title: 'Pending Commissions',
          message: `You have ${pendingCommissions.length} pending commission payments totaling ₹${totalPending.toLocaleString('en-IN')}`,
          date: new Date().toISOString(),
          read: false,
          priority: 'medium',
        });
      }

      // Sort by priority and date
      notifs.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      setNotifications(notifs);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setLoading(false);
    }
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getIcon = (type: string, priority: string) => {
    if (type === 'renewal') {
      if (priority === 'high') return <AlertCircle className="h-5 w-5 text-red-600" />;
      return <Bell className="h-5 w-5 text-orange-600" />;
    }
    if (type === 'commission') return <Info className="h-5 w-5 text-blue-600" />;
    return <Info className="h-5 w-5 text-gray-600" />;
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex gap-4">
            {unreadCount > 0 && (
              <Button variant="outline" onClick={markAllAsRead}>
                Mark All as Read
              </Button>
            )}
            <Button onClick={() => router.push('/dashboard')}>Dashboard</Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Tabs */}
        <div className="mb-6 flex gap-4">
          <Button
            onClick={() => setFilter('all')}
            variant={filter === 'all' ? 'default' : 'outline'}
          >
            All ({notifications.length})
          </Button>
          <Button
            onClick={() => setFilter('unread')}
            variant={filter === 'unread' ? 'default' : 'outline'}
          >
            Unread ({unreadCount})
          </Button>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-lg font-medium">All caught up!</p>
                <p className="text-sm mt-1">You have no {filter} notifications</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`${
                  !notification.read ? 'border-l-4 border-l-blue-500' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getIcon(notification.type, notification.priority)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-600'}`}>
                            {notification.title}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {formatDate(notification.date)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Mark read
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
