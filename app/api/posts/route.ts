import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/drizzle/db'
import { posts, categories, tags, postCategories, postTags } from '@/drizzle/schema'
import { eq, and, inArray, sql, count } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  category: z.string().optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams))

    if (!parsed.success) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    const { page, limit, category, tag, search } = parsed.data
    const offset = (page - 1) * limit

    const conditions = [eq(posts.status, 'published')]

    if (search) {
      conditions.push(
        sql`(${posts.title} ILIKE ${'%' + search + '%'} OR ${posts.content} ILIKE ${'%' + search + '%'})`
      )
    }

    let postIds: number[] | undefined

    if (category) {
      const cat = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, category))
        .limit(1)

      if (cat.length > 0) {
        const rels = await db
          .select({ post_id: postCategories.post_id })
          .from(postCategories)
          .where(eq(postCategories.category_id, cat[0].id))
        postIds = rels.map((r) => r.post_id)
      } else {
        postIds = []
      }
    }

    if (tag) {
      const t = await db
        .select({ id: tags.id })
        .from(tags)
        .where(eq(tags.slug, tag))
        .limit(1)

      if (t.length > 0) {
        const tagRels = await db
          .select({ post_id: postTags.post_id })
          .from(postTags)
          .where(eq(postTags.tag_id, t[0].id))
        const tagPostIds = tagRels.map((r) => r.post_id)
        postIds = postIds ? postIds.filter((id) => tagPostIds.includes(id)) : tagPostIds
      } else {
        postIds = []
      }
    }

    if (postIds !== undefined) {
      if (postIds.length === 0) {
        return NextResponse.json({ posts: [], total: 0, page, pages: 0 })
      }
      conditions.push(inArray(posts.id, postIds))
    }

    const whereClause = and(...conditions)

    const [{ total }] = await db
      .select({ total: count() })
      .from(posts)
      .where(whereClause)

    const postRows = await db
      .select()
      .from(posts)
      .where(whereClause)
      .orderBy(sql`${posts.published_at} DESC`)
      .limit(limit)
      .offset(offset)

    if (postRows.length === 0) {
      return NextResponse.json({ posts: [], total, page, pages: Math.ceil(total / limit) })
    }

    const ids = postRows.map((p) => p.id)

    const allPostCats = await db
      .select({ post_id: postCategories.post_id, category: categories })
      .from(postCategories)
      .innerJoin(categories, eq(postCategories.category_id, categories.id))
      .where(inArray(postCategories.post_id, ids))

    const allPostTags = await db
      .select({ post_id: postTags.post_id, tag: tags })
      .from(postTags)
      .innerJoin(tags, eq(postTags.tag_id, tags.id))
      .where(inArray(postTags.post_id, ids))

    const postWithRelations = postRows.map((post) => ({
      ...post,
      categories: allPostCats.filter((r) => r.post_id === post.id).map((r) => r.category),
      tags: allPostTags.filter((r) => r.post_id === post.id).map((r) => r.tag),
    }))

    return NextResponse.json({
      posts: postWithRelations,
      total,
      page,
      pages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error('[/api/posts]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
