function getEssayText(): string {
  const doc = DocumentApp.getActiveDocument()
  if (!doc) throw new Error('No active document found')
  return doc.getBody().getText()
}

interface CommentInput {
  text: string
  anchorText: string
  category: string
}

interface CommentInsertionResult {
  inserted: number
  anchored: number
  general: number
  failed: number
  appended: boolean
  commentIds: string[]
}

function insertDocComments(comments: CommentInput[]): CommentInsertionResult {
  const doc = DocumentApp.getActiveDocument()
  if (!doc) throw new Error('No active document found')
  const docId = doc.getId()
  // Cast to v3 types — appsscript.json configures Drive Advanced Service v3,
  // but @types/google-apps-script only ships v2 type definitions
  const comments_api = Drive.Comments as unknown as DriveV3CommentsCollection

  const commentIds: string[] = []
  let anchored = 0
  let general = 0
  let inserted = 0
  let failed = 0
  let allFailed = true

  for (const comment of comments) {
    try {
      const resource: DriveV3Comment = {
        content: comment.text,
        quotedFileContent: {
          mimeType: 'text/html',
          value: comment.anchorText,
        },
      }
      const created = comments_api.create(resource, docId, { fields: 'id,anchor' })
      if (!created.id) {
        failed++
        continue
      }
      commentIds.push(created.id)
      inserted++
      allFailed = false

      if (created.anchor) {
        anchored++
      } else {
        general++
        comments_api.update(
          { content: `[${comment.category}] ${comment.text}` },
          docId,
          created.id,
        )
      }
    } catch (e) {
      failed++
      // Drive API call failed for this comment — continue to next
    }
  }

  // Tier 3: If ALL Drive API calls failed, append feedback to document body
  if (allFailed && comments.length > 0) {
    const body = doc.getBody()
    body.appendParagraph('')
    const header = body.appendParagraph('--- AI Feedback ---')
    header.setHeading(DocumentApp.ParagraphHeading.HEADING3)
    for (const comment of comments) {
      body.appendParagraph(`[${comment.category}] ${comment.text}`)
    }
    return { inserted: 0, anchored: 0, general: 0, failed: comments.length, appended: true, commentIds: [] }
  }

  return { inserted, anchored, general, failed, appended: false, commentIds }
}
