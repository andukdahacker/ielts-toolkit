// Drive API v3 Advanced Service type declarations
// The @types/google-apps-script package only includes Drive v2 types,
// but this project uses the v3 Advanced Service (configured in appsscript.json).
// These types augment the existing Drive v2 declarations with v3 method signatures.

interface DriveV3Comment {
  id?: string
  content?: string
  anchor?: string
  quotedFileContent?: {
    mimeType?: string
    value?: string
  }
}

interface DriveV3CommentsCollection {
  create(resource: DriveV3Comment, fileId: string, optionalArgs?: { fields?: string }): DriveV3Comment
  update(resource: DriveV3Comment, fileId: string, commentId: string): DriveV3Comment
  remove(fileId: string, commentId: string): void
}
