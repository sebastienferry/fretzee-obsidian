/** A portable starter block using the same JSON format as Fretzee Studio exports. */
export const EXAMPLE_BLOCK = '```fretzee\n' + JSON.stringify({
  title: 'C major',
  stringCount: 6,
  fretCount: 4,
  orientation: 'vertical',
  startFret: 1,
  fingerings: [
    { string: 6, fret: -1 },
    { string: 5, fret: 3, text: '3' },
    { string: 4, fret: 2, text: '2' },
    { string: 3, fret: 0 },
    { string: 2, fret: 1, text: '1' },
    { string: 1, fret: 0 },
  ],
}, null, 2) + '\n```\n';
