import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { glob } from 'fast-glob'

export interface ReleaseFeature {
  id: string
  title: string
  description: string
  status: 'new' | 'improved' | 'beta' | 'coming-soon'
  category: 'genomics' | 'ui' | 'data' | 'performance' | 'api' | 'visualization' | 'interface'
  date?: string
  version?: string
  content?: string
  image?: string
  demo?: string
  icon?: string
  impact?: 'high' | 'medium' | 'low'
  users?: number
}

const CONTENT_PATH = path.join(process.cwd(), 'src/components/content/releases')

export async function getReleaseFeatures(): Promise<ReleaseFeature[]> {
  try {
    const mdxFiles = await glob('**/*.mdx', {
      cwd: CONTENT_PATH,
      absolute: true
    })

    const features = await Promise.all(
      mdxFiles.map(async (filePath) => {
        const fileContent = fs.readFileSync(filePath, 'utf8')
        const { data: frontmatter, content } = matter(fileContent)
        
        const filename = path.basename(filePath, '.mdx')
        const versionMatch = filename.match(/^(v[\d.]+)-/)
        const version = versionMatch ? versionMatch[1] : frontmatter.version || 'v2025.1'

        return {
          id: frontmatter.id || filename,
          title: frontmatter.title || 'Untitled Feature',
          description: frontmatter.description || '',
          status: frontmatter.status || 'new',
          category: frontmatter.category || 'genomics',
          date: frontmatter.date,
          version,
          content: content.trim(),
          image: frontmatter.image,
          demo: frontmatter.demo,
          icon: frontmatter.icon,
          impact: frontmatter.impact,
          users: frontmatter.users
        } as ReleaseFeature
      })
    )

    return features.sort((a, b) => {
      if (a.date && b.date) {
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      }
      
      const parseVersion = (version: string) => {
        const cleaned = version.replace(/^v/, '')
        const parts = cleaned.split('.').map(part => parseInt(part, 10) || 0)
        
        if (parts[0] >= 2025) {
          return [parts[0], parts[1] || 0, parts[2] || 0]
        } else {
          return [parts[0] + 2023, parts[1] || 0, parts[2] || 0]
        }
      }
      
      const [majorA, minorA, patchA] = parseVersion(a.version || 'v0.0.0')
      const [majorB, minorB, patchB] = parseVersion(b.version || 'v0.0.0')
      
      if (majorA !== majorB) return majorB - majorA
      if (minorA !== minorB) return minorB - minorA
      return patchB - patchA
    })
  } catch (error) {
    console.error('Error reading release features:', error)
    return []
  }
}