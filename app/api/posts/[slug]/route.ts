import { NextResponse } from 'next/server'
import { db } from '@/drizzle/db'
import { posts, categories, tags, postCategories, postTags } from '@/drizzle/schema'
import { eq, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const [post] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.slug, params.slug), eq(posts.status, 'published')))
      .limit(1)

    if (!post) {
      return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })
    }

    const postCats = await db
      .select({ category: categories })
      .from(postCategories)
      .innerJoin(categories, eq(postCategories.category_id, categories.id))
      .where(eq(postCategories.post_id, post.id))

    const postTagsList = await db
      .select({ tag: tags })
      .from(postTags)
      .innerJoin(tags, eq(postTags.tag_id, tags.id))
      .where(eq(postTags.post_id, post.id))

    return NextResponse.json({
      post: {
        ...post,
        categories: postCats.map((r) => r.category),
        tags: postTagsList.map((r) => r.tag),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
