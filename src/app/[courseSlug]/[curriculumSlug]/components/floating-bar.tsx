'use client'
import { SearchBar } from '@/components/search-bar'

export function FloatingBar() {
  return (
    <div className="fixed bottom-8 z-50 w-full px-8 center sm:px-0">
      <SearchBar />
    </div>
  )
}
