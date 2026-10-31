import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // 1. Recebe os dados do corpo da requisição
    const body = await request.json()
    const { slug } = body

    if (!slug) {
      return NextResponse.json(
        { error: 'O parâmetro "slug" é obrigatório.' },
        { status: 400 },
      )
    }

    // 2. Acessa a store de cookies (Async no Next.js 15, compatível com 13/14)
    const cookieStore = await cookies()

    // 3. Define o cookie
    cookieStore.set('meu_cookie_slug', slug, {
      httpOnly: true, // Segurança: impede acesso via JavaScript no navegador (document.cookie)
      secure: process.env.NODE_ENV === 'production', // Apenas HTTPS em produção
      maxAge: 60 * 60 * 24 * 7, // Duração: 1 semana (em segundos)
      path: '/', // Disponível em toda a aplicação
    })

    return NextResponse.json({ message: 'Slug salvo com sucesso!' })
  } catch {
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição.' },
      { status: 500 },
    )
  }
}
