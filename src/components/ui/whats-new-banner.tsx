'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles, X, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils/general'
import { Badge } from '@/components/ui/badge'

interface NERCStatus {
  page: {
    name: string
    url: string
    status: 'UP' | 'HASISSUES' | 'UNDERMAINTENANCE'
  }
  activeIncidents?: Array<{
    id: string
    name: string
    started: string
    status: string
    impact: string
    url: string
  }>
  activeMaintenances?: Array<{
    id: string
    name: string
    start: string
    status: string
    duration: string
    url: string
  }>
}

interface WhatsNewBannerProps {
  className?: string
}

export function WhatsNewBanner({ className }: WhatsNewBannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [nercStatus, setNercStatus] = useState<NERCStatus | null>(null)

  useEffect(() => {
    const fetchNercStatus = async () => {
      try {
        const response = await fetch('https://nerc.instatus.com/summary.json')
        if (response.ok) {
          const data = await response.json()
          setNercStatus(data)
        }
      } catch (err) {
        // Fail silently - NERC status is not critical
      }
    }

    fetchNercStatus()
  }, [])

  if (!isVisible) {
    return null
  }

  const hasNercIssues = nercStatus && (
    nercStatus.page.status !== 'UP' || 
    (nercStatus.activeIncidents?.length || 0) > 0 || 
    (nercStatus.activeMaintenances?.length || 0) > 0
  )

  return (
    <div className={cn(
      "relative overflow-hidden rounded-lg bg-background border border-border",
      className
    )}>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 z-10 h-6 w-6 p-0 opacity-50 hover:opacity-100"
        onClick={() => setIsVisible(false)}
      >
        <X className="h-4 w-4" />
      </Button>
      
      <div className="p-4 space-y-3">
        {/* NERC Status - Only show if there are issues */}
        {hasNercIssues && (
          <div className="pr-8">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium">Service Notice</span>
            </div>
            
            {(nercStatus.activeMaintenances || []).map((maintenance) => (
              <div key={maintenance.id} className="text-sm">
                <span className="font-medium">
                  {maintenance.name.replace(/Upcoming NERC system maintenance and upgrade/g, 'FAVOR data center maintenance')} {' '}
                  <a
                    href={maintenance.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline"
                  >
                    View Details
                  </a>
                </span>
              </div>
            ))}
            
            {(nercStatus.activeIncidents || []).map((incident) => (
              <div key={incident.id} className="text-sm">
                <span className="font-medium">{incident.name}</span>
                <div className="text-xs text-muted-foreground mt-1">
                  Service impact: {incident.impact} • {' '}
                  <a
                    href={incident.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline"
                  >
                    View Updates
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* What's New - Always show but smaller when NERC issues present */}
        <div className={cn("flex items-center justify-between pr-8", hasNercIssues && "pt-2 border-t")}>
          <div className="flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <div className="flex items-center gap-2">
              <span className={cn("font-medium", hasNercIssues ? "text-sm" : "")}>
                What's New
              </span>
              <Badge variant="secondary" className="text-xs">
                v2025.1
              </Badge>
            </div>
          </div>
          
          <Button variant="ghost" size="sm" asChild className={cn("text-primary hover:underline", hasNercIssues ? "text-xs" : "text-sm")}>
            <Link href="/whats-new">
              View Updates
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}