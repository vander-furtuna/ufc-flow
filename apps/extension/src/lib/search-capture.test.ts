import { beforeEach, describe, expect, it } from 'vitest'

import { loadFixture } from '../sigaa/test-utils'
import {
  captureCurriculumClick,
  captureSearchPage,
  readSearchCapture,
} from './search-capture'

describe('captura da tela de busca', () => {
  beforeEach(() => sessionStorage.clear())

  it('começa vazia', () => {
    expect(readSearchCapture()).toEqual({
      selectedCourseId: null,
      courses: [],
      curriculum: null,
    })
  })

  it('guarda o curso selecionado e os cursos do select', () => {
    captureSearchPage(loadFixture('busca-estruturas.html'))
    const capture = readSearchCapture()
    expect(capture.selectedCourseId).toBe('657484')
    expect(capture.courses).toHaveLength(170)
    expect(capture.curriculum).toBeNull()
  })

  it('guarda a EC clicada, pelo link do relatório', () => {
    const doc = loadFixture('busca-estruturas.html')
    captureSearchPage(doc)
    captureCurriculumClick(doc.getElementById('resultado:relatorio')!)
    expect(readSearchCapture().curriculum).toEqual({
      code: '2006.2',
      sigaaId: '658760',
    })
  })

  it('ignora clique fora de um link de relatório', () => {
    const doc = loadFixture('busca-estruturas.html')
    captureCurriculumClick(doc.body)
    expect(readSearchCapture().curriculum).toBeNull()
  })

  it('uma nova busca esquece a EC clicada antes', () => {
    const doc = loadFixture('busca-estruturas.html')
    captureSearchPage(doc)
    captureCurriculumClick(doc.getElementById('resultado:relatorio')!)
    captureSearchPage(doc)
    expect(readSearchCapture().curriculum).toBeNull()
  })

  it('ignora o que estiver corrompido no armazenamento', () => {
    sessionStorage.setItem('ufc-flow:search', '{quebrado')
    expect(readSearchCapture().selectedCourseId).toBeNull()
  })

  it('não guarda nada fora da tela de busca', () => {
    captureSearchPage(loadFixture('estrutura-medicina-2024-1.html'))
    expect(readSearchCapture().courses).toEqual([])
  })
})
