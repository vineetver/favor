'use client'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MarkdownRenderer, ImageRenderer } from '@/components/ui/markdown-renderer'
import { 
  Search,
  ExternalLink,
} from 'lucide-react'
import type { ReleaseFeature } from '@/lib/mdx'


const statusConfig = {
  new: { label: 'New', variant: 'default' as const, color: 'bg-green-500' },
  improved: { label: 'Updated', variant: 'secondary' as const, color: 'bg-blue-500' },
  beta: { label: 'Beta', variant: 'outline' as const, color: 'bg-yellow-500' },
  'coming-soon': { label: 'Coming Soon', variant: 'outline' as const, color: 'bg-purple-500' }
}

interface WhatsNewContentProps {
  features: ReleaseFeature[]
}

function getDefaultReleaseDate(version: string): string {
  // Extract year from version for better default dates
  const versionMatch = version.match(/v(\d{4})/)
  const year = versionMatch ? versionMatch[1] : '2025'
  return `January ${year}`
}

export function WhatsNewContent({ features }: WhatsNewContentProps) {
  // Group features by version/date for sidebar
  const groupedFeatures = features.reduce((acc, feature) => {
    const version = feature.version || 'v2025.1'
    if (!acc[version]) {
      acc[version] = []
    }
    acc[version].push(feature)
    return acc
  }, {} as Record<string, ReleaseFeature[]>)

  // Sort versions properly (newest first)
  const versions = Object.keys(groupedFeatures).sort((a, b) => {
    const parseVersion = (version: string) => {
      const cleaned = version.replace(/^v/, '')
      const parts = cleaned.split('.').map(part => parseInt(part, 10) || 0)
      
      // Handle different version formats
      if (parts[0] >= 2025) {
        // New format: v2025.1 -> [2025, 1, 0]
        return [parts[0], parts[1] || 0, parts[2] || 0]
      } else {
        // Old format: v2.1.0 -> [2, 1, 0] but adjust major version for proper sorting
        return [parts[0] + 2023, parts[1] || 0, parts[2] || 0]
      }
    }
    
    const [majorA, minorA, patchA] = parseVersion(a)
    const [majorB, minorB, patchB] = parseVersion(b)
    
    // Compare versions (newest first)
    if (majorA !== majorB) return majorB - majorA
    if (minorA !== minorB) return minorB - minorA
    return patchB - patchA
  })

  return (
    <div className="flex gap-12">
      {/* Sidebar Navigation */}
      <div className="w-80 flex-shrink-0">
        <div className="sticky top-25">
          <div className="bg-muted/30 rounded-xl p-6 border">
            <h3 className="font-semibold text-lg mb-6">Table of Contents</h3>
            <div className="space-y-4">
              {versions.map(version => (
                <div key={version}>
                  <button
                    onClick={() => {
                      const element = document.getElementById(version)
                      if (element) {
                        const elementTop = element.offsetTop - 100
                        window.scrollTo({ top: elementTop, behavior: 'smooth' })
                      }
                    }}
                    className="block text-base font-medium text-foreground hover:text-primary mb-3 text-left"
                  >
                    {version}
                  </button>
                  <div className="ml-6 space-y-2 mb-4">
                    {groupedFeatures[version].map(feature => (
                      <button
                        key={feature.id}
                        onClick={() => {
                          const element = document.getElementById(feature.id)
                          if (element) {
                            const elementTop = element.offsetTop - 100
                            window.scrollTo({ top: elementTop, behavior: 'smooth' })
                          }
                        }}
                        className="block text-sm text-muted-foreground hover:text-primary text-left"
                      >
                        {feature.title}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-20">
        {versions.map(version => (
          <section key={version} id={version} className="space-y-12">
            <div className="border-b border-border pb-8">
              <h2 className="text-2xl font-bold tracking-tight mb-4">{version}</h2>
              <p className="text-base leading-7 text-muted-foreground">
                Released {groupedFeatures[version][0]?.date ? 
                  new Date(groupedFeatures[version][0].date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }) : getDefaultReleaseDate(version)}
              </p>
            </div>

            <div className="space-y-16">
              {groupedFeatures[version].map(feature => (
                <article key={feature.id} id={feature.id} className="space-y-8">
                  <header className="space-y-4">
                    <div className="flex items-center gap-4">
                      <h3 className="text-xl font-bold tracking-tight">{feature.title}</h3>
                      <Badge variant={statusConfig[feature.status].variant} className="text-sm">
                        {statusConfig[feature.status].label}
                      </Badge>
                    </div>
                    <p className="text-base leading-7 text-muted-foreground max-w-4xl">
                      {feature.description}
                    </p>
                  </header>

                  {feature.image && (
                    <div className="my-8">
                      <ImageRenderer 
                        src={feature.image} 
                        alt={`${feature.title} screenshot`}
                        className="rounded-2xl shadow-xl border border-border"
                      />
                    </div>
                  )}

                  {feature.content && (
                    <div className="prose prose-lg prose-gray dark:prose-invert max-w-none">
                      <MarkdownRenderer content={feature.content} />
                    </div>
                  )}

                  {feature.demo && (
                    <div className="pt-6">
                      <Button size="lg" asChild>
                        <a href={feature.demo} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-5 w-5 mr-3" />
                          Try This Feature
                        </a>
                      </Button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
      
      {features.length === 0 && (
        <Card className="p-8 text-center">
          <div className="text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No features found</h3>
            <p className="text-sm">No release features available.</p>
          </div>
        </Card>
      )}
    </div>
  )
}