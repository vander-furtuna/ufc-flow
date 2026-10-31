export async function saveSlugToCookie(slug: string) {
  await fetch('/api/save-slug', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ slug }),
  })
}
