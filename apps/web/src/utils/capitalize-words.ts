export function capitalizeWords(input: string): string {
  return input
    .split(' ')
    .map((word) => {
      if (
        ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'].includes(
          word.toLowerCase(),
        )
      ) {
        return word.toUpperCase()
      } else if (
        [
          'e',
          'a',
          'de',
          'da',
          'do',
          'dos',
          'das',
          'com',
          'em',
          'para',
        ].includes(word.toLowerCase())
      ) {
        return word.toLowerCase()
      } else {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      }
    })
    .join(' ')
}
