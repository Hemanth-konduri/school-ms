'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle } from 'lucide-react'

export default function SyncStudentsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSync = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/sync-students', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, message: data.message })
      } else {
        setResult({ success: false, message: data.error || 'Sync failed' })
      }
    } catch (error: any) {
      setResult({ success: false, message: error.message || 'Network error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Sync Students to Profiles</h1>
        <p className="text-gray-600 mb-6">
          This will create profile entries for all existing students who don't have one yet.
          Run this once to fix login issues for existing students.
        </p>

        <Button
          onClick={handleSync}
          disabled={loading}
          className="w-full mb-4"
        >
          {loading ? 'Syncing...' : 'Sync Students'}
        </Button>

        {result && (
          <Alert variant={result.success ? 'default' : 'destructive'}>
            {result.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>{result.success ? 'Success' : 'Error'}</AlertTitle>
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
