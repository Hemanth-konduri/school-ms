'use client'

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function NotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch('/api/notifications/count')
        if (response.ok) {
          const { unread_count } = await response.json()
          setUnreadCount(unread_count)
        }
      } catch (error) {
        console.error('Error fetching notification count:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCount()

    // Refresh count every 30 seconds
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative">
      <Bell className="h-5 w-5 text-gray-600 cursor-pointer hover:text-gray-800 transition-colors" />
      {!loading && unreadCount > 0 && (
        <Badge
          className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-600 hover:bg-red-700"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      )}
    </div>
  )
}
