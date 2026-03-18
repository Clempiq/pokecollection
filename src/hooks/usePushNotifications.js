<<<<<<< HEAD
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const VAPID_PUBLIC_KEY = 'BHRkK-waI-0j8FosX6K6MxcmZAH7shu2vckvsq2ZwBHNyFpryoq5zyjUgUS5Ctqie1X8BXMzB11dhtiH8aDf0v4'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export function usePushNotifications() {
  const { user } = useAuth()
  const [permission, setPermission] = useState(Notification.permission)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [supported] = useState(() => 'serviceWorker' in navigator && 'PushManager' in window)

  // Check existing subscription on mount
  useEffect(() => {
    if (!supported || !user) return
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      setIsSubscribed(!!sub)
    })
  }, [supported, user])

  const subscribe = useCallback(async () => {
    if (!supported || !user) return
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      setPermission(permission)
      if (permission !== 'granted') return

      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const sub = subscription.toJSON()
      await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      }, { onConflict: 'user_id,endpoint' })

      setIsSubscribed(true)
    } catch (err) {
      console.error('Push subscribe error:', err)
    } finally {
      setLoading(false)
    }
  }, [supported, user])

  const unsubscribe = useCallback(async () => {
    if (!supported || !user) return
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.getSubscription()
      if (subscription) {
        await supabase.from('push_subscriptions').delete()
          .eq('user_id', user.id).eq('endpoint', subscription.endpoint)
        await subscription.unsubscribe()
      }
      setIsSubscribed(false)
    } finally {
      setLoading(false)
    }
  }, [supported, user])

  return { supported, permission, isSubscribed, loading, subscribe, unsubscribe }
}
=======
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const VAPID_KEY = import.meta.env.VITE_VAPID_KEY

export function usePushNotifications() {
  const { user } = useAuth()
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSupported(false)
      setLoading(false)
      return
    }
    setSupported(true)
    setPermission(Notification.permission)
    checkSubscription()
  }, [user])

  const checkSubscription = useCallback(async () => {
    if (!user) return
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (err) {
      console.error('Error checking subscription:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  const subscribe = useCallback(async () => {
    if (!user || !supported) return
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      setPermission(permission)
      if (permission !== 'granted') {
        setLoading(false)
        return
      }
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
      })
      await supabase.from('push_subscriptions').insert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
        auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')))),
      })
      setIsSubscribed(true)
    } catch (err) {
      console.error('Subscription error:', err)
    } finally {
      setLoading(false)
    }
  }, [user, supported])

  const unsubscribe = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
        await supabase.from('push_subscriptions').delete().eq('user_id', user.id)
        setIsSubscribed(false)
      }
    } catch (err) {
      console.error('Unsubscribe error:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  return { supported, permission, isSubscribed, loading, subscribe, unsubscribe }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
>>>>>>> 75bda405994aff8b32f967b0793cc12339417565
