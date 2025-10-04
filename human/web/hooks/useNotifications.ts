'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'

interface NotificationPermission {
  granted: boolean
  denied: boolean
  requesting: boolean
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>({
    granted: false,
    denied: false,
    requesting: false,
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return
    }

    const currentPermission = Notification.permission
    setPermission({
      granted: currentPermission === 'granted',
      denied: currentPermission === 'denied',
      requesting: false,
    })
  }, [])

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('Notifications not supported')
      return false
    }

    if (permission.granted) {
      return true
    }

    if (permission.denied) {
      toast.error('Notification permission was denied. Please enable in browser settings.')
      return false
    }

    setPermission((prev) => ({ ...prev, requesting: true }))

    try {
      const result = await Notification.requestPermission()
      const granted = result === 'granted'

      setPermission({
        granted,
        denied: result === 'denied',
        requesting: false,
      })

      if (granted) {
        toast.success('Notifications enabled!')
      } else {
        toast.error('Notification permission denied')
      }

      return granted
    } catch (error) {
      setPermission((prev) => ({ ...prev, requesting: false }))
      toast.error('Failed to request notification permission')
      return false
    }
  }, [permission])

  const sendNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!permission.granted) {
        console.warn('Notification permission not granted')
        return
      }

      try {
        const notification = new Notification(title, {
          icon: '/icon.png',
          badge: '/badge.png',
          ...options,
        })

        notification.onclick = () => {
          window.focus()
          notification.close()
        }

        return notification
      } catch (error) {
        console.error('Failed to send notification:', error)
      }
    },
    [permission.granted]
  )

  return {
    permission,
    requestPermission,
    sendNotification,
    isSupported: typeof window !== 'undefined' && 'Notification' in window,
  }
}
