export async function saveSlugToCookie(slug: string) {
  const response = await fetch('/api/save-slug', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ slug }),
  })

  console.log('Slug salvo:', response.body)
}
