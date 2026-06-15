import { eq } from 'drizzle-orm'
import { db, schema } from '../../db/index.js'

function safeParseJSON<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function getCreativeContextSummary(dramaId: number, episodeId?: number | null) {
  const [drama] = db.select().from(schema.dramas).where(eq(schema.dramas.id, dramaId)).all()
  const episode = episodeId
    ? db.select().from(schema.episodes).where(eq(schema.episodes.id, episodeId)).all()[0]
    : null

  const metadata = safeParseJSON<Record<string, any>>(drama?.metadata, {})
  const outlines = Array.isArray(metadata.episode_outlines) ? metadata.episode_outlines : []
  const matchedOutline = episode
    ? outlines.find((item: any, index: number) => {
      if (item?.episode_id === episode.id) return true
      const episodeNumber = Number(item?.episode_number || item?.episodeNumber || index + 1)
      return episodeNumber === episode.episodeNumber
    }) || null
    : null

  return {
    drama: drama ? {
      title: drama.title,
      genre: drama.genre || '',
      style: drama.style || '',
      creative_brief: metadata.creative_brief || {},
      character_bible: metadata.character_bible || {},
      world_book: metadata.world_book || {},
    } : null,
    episode: episode ? {
      id: episode.id,
      episode_number: episode.episodeNumber,
      title: episode.title,
      description: episode.description || '',
      matched_outline: matchedOutline,
    } : null,
  }
}
