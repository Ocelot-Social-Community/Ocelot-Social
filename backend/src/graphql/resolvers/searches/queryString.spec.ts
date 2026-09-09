import { describe, it, expect } from 'vitest'

import { queryString, escapeSpecialCharacters, normalizeWhitespace } from './queryString'

describe(queryString, () => {
  describe('special characters', () => {
    it('does escaping correctly', () => {
      expect(escapeSpecialCharacters('+ - && || ! ( ) { } [ ] ^ " ~ * ? : \\ / ')).toEqual(
        '\\+ \\- \\&\\& \\|\\| \\! \\( \\) \\{ \\} \\[ \\] \\^ \\" \\~ \\* \\? \\: \\\\ \\/ ',
      )
    })
  })

  describe('whitespace', () => {
    it('normalizes correctly', () => {
      expect(normalizeWhitespace(' a \t \n b \n   ')).toEqual('a b')
    })
  })

  describe('exact match', () => {
    it('boosts score by factor 8', () => {
      expect(queryString('a couple of words')).toContain('"a couple of words"^8')
    })
  })

  describe('match all words exactly', () => {
    it('boosts score by factor 4', () => {
      expect(queryString('a couple of words')).toContain(
        '("a" AND "couple" AND "of" AND "words")^4',
      )
    })
  })

  describe('match at least one word exactly', () => {
    it('boosts score by factor 2', () => {
      expect(queryString('a couple of words')).toContain('"a"^2 "couple"^2 "of"^2 "words"^2')
    })
  })

  describe('globbing for longer words', () => {
    it('globs words with more than three characters', () => {
      expect(queryString('a couple of words')).toContain('couple* of* words*')
    })
  })

  describe('single word queries', () => {
    // The two word-group clauses bail out for a one-word query. Without that guard the same term
    // would be boosted three times over (`"cats"^8 ("cats")^4 "cats"^2`), so a one-word search
    // would rank against a different scale than the multi-word path it is compared with in the
    // combined `searchResults` list. The clauses are simply absent from the output, so only
    // asserting their absence can catch the guard being dropped.
    it('emits neither the AND group nor the per-word clause', () => {
      const result = queryString('cats')

      expect(result).toContain('"cats"^8')
      expect(result).toContain('cats*')
      expect(result).not.toContain('^4')
      expect(result).not.toContain('^2')
    })
  })

  describe('degenerate input', () => {
    // Padding is what a copy-pasted search term looks like. Splitting on ' ' without the
    // preceding trim/collapse yields empty words, and those become `AND ""` and `""^2` — clauses
    // Lucene rejects with a ParseException, which surfaces as a failing search rather than an
    // empty result list.
    it('produces no empty word clauses for padded input', () => {
      const result = queryString('  cats \t  dogs  ')

      expect(result).toContain('"cats dogs"^8')
      expect(result).toContain('("cats" AND "dogs")^4')
      expect(result).not.toContain('""')
    })

    // An empty search box reaches the resolvers unfiltered — `searchResults` strips the type
    // prefix and hands the rest straight to `db.index.fulltext.queryNodes`. All that may remain
    // is the (empty) phrase; a dangling `AND` or a bare `*` would be a syntax error.
    it('reduces an all-whitespace query to the phrase clause alone', () => {
      expect(queryString('   ').trim()).toBe('""^8')
    })
  })

  describe('search type prefixes', () => {
    // `!`, `@` and `#` select the search type in `searchResults` and are not part of the term.
    // They are also Lucene operators (`!` is NOT), so leaving one in place would either search
    // for the wrong string or break the query — dropping it is the only correct option.
    it.each(['!posts', '@people', '#topic'])('drops the leading prefix of %s', (query) => {
      expect(queryString(query)).toContain(`"${query.slice(1)}"^8`)
    })

    // Only the FIRST character is a prefix. An operator inside the term is content and has to be
    // escaped instead, or `rock!roll` would turn into a NOT clause mid-phrase.
    it('escapes the same characters when they appear inside the term', () => {
      expect(queryString('rock!roll')).toContain('"rock\\!roll"^8')
    })
  })

  describe('special characters end to end', () => {
    // The escaping has to happen BEFORE the clauses are built, not on the finished query — the
    // clause syntax uses the very characters that get escaped. An unescaped `+` or `(` from user
    // input is a Lucene ParseException, i.e. a failing search for anyone typing `c++`.
    it('escapes operators inside every clause', () => {
      const result = queryString('c++ (beginners)')

      expect(result).toContain('"c\\+\\+ \\(beginners\\)"^8')
      expect(result).toContain('("c\\+\\+" AND "\\(beginners\\)")^4')
      expect(result).toContain('c\\+\\+* \\(beginners\\)*')
    })
  })
})
