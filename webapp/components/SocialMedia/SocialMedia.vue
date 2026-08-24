<template>
  <div v-if="$policy.get('socialMediaEnabled') && socialMediaLinks.length" class="ds-my-large">
    <os-card class="social-media-bc">
      <h5 class="title spacer-x-small" data-test="social-media-list-headline">
        {{ $t('profile.socialMedia') }} {{ userName | truncate(15) }}?
      </h5>
      <div v-for="link in socialMediaLinks" :key="link.url" class="ds-my-x-small">
        <a :href="link.href" target="_blank" rel="noopener noreferrer">
          <favicon :src="link.favicon" :fallback-icon="link.fallbackIcon" :size="22" />
          {{ link.username }}
        </a>
      </div>
    </os-card>
  </div>
</template>

<script>
import { OsCard } from '@ocelot-social/ui'
import Favicon from './Favicon.vue'

// Vue does not sanitise an `:href` binding, so whatever is bound there is what the browser
// runs on click — `javascript:alert(document.cookie)` included. The backend only accepts the
// schemes below for a social media url, but this profile also renders rows that were stored
// before that rule existed, on a page every visitor can open. So the value is checked once
// more, here.
//
// Parsed rather than pattern-matched: a `^https?://` test also passes a bare `https://`, which
// has no host to go to. That rendered an entry with a dead link and a favicon derived from the
// leftover `https`. The parser answers the question actually being asked — is this an address
// a browser can follow — and it normalises the scheme, so uppercase needs no separate case.

/**
 * The address of a `mailto:` url, or null for anything else.
 *
 * A single recipient and no query. A mailto may carry `?bcc=`, `?subject=` and `?body=`, and a
 * click then opens the composer with all of it pre-filled — a reader who clicks "write to me"
 * would send a message they never wrote, to recipients they never saw. The same holds for the
 * comma-separated recipient list. This card publishes a way to REACH someone; anything beyond
 * the address is a pre-written message, which is a different thing.
 */
const mailAddress = (value) => {
  try {
    const { protocol, pathname, search } = new URL(value)
    if (protocol !== 'mailto:' || search !== '') return null
    const address = decodeURIComponent(pathname)
    const [local, domain, ...rest] = address.split('@')
    const single = rest.length === 0 && Boolean(local) && Boolean(domain) && !address.includes(',')
    return single ? address : null
  } catch {
    return null
  }
}

const webAddress = (value) => {
  try {
    const { protocol, hostname } = new URL(value)
    return (protocol === 'http:' || protocol === 'https:') && hostname !== ''
  } catch {
    // Not a URL at all: `not-a-url`, an empty string, a legacy row from before the rule.
    return false
  }
}

const linkable = (value) => webAddress(value) || mailAddress(value) !== null

/**
 * What the card shows for one url: where it goes, what it is called, what sits in front of it.
 *
 * A mail address has no host, so there is no favicon to fetch from one — it gets the envelope
 * from the icon set instead. Deriving one anyway is what the earlier version did to every
 * value it did not understand, and `mailto:a@example.org` would have asked the browser for
 * `ailto/favicon.ico`.
 */
const describe = (url) => {
  const address = mailAddress(url)
  if (address !== null) {
    return { url, href: url, username: address, favicon: null, fallbackIcon: 'envelope' }
  }
  // Case-insensitive for the same reason the parsing above is: a browser reads a scheme
  // without regard to case, so `HTTPS://example.org` is a link this card accepts. Without the
  // flag the scheme group failed to match and the favicon was derived from the leftover
  // `HTTPS`, giving `HTTPS/favicon.ico` — a broken image next to a working link.
  const matches = url.match(/^(?:https?:\/\/)?(?:[^@\n])?(?:www\.)?([^:/\n?]+)/gi)
  const [domain] = matches || []
  const parts = url
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
    .split('/')
  return {
    url,
    href: url,
    username: parts.length > 1 ? parts[parts.length - 1] : parts[0].replace(/^www\./i, ''),
    favicon: domain ? `${domain}/favicon.ico` : null,
    fallbackIcon: 'link',
  }
}

export default {
  name: 'social-media',
  components: { OsCard, Favicon },
  props: {
    userName: { type: String, required: true },
    user: { type: Object, required: true },
  },
  computed: {
    // A computed, not a method: `v-if` and `v-for` must agree on the SAME list. While the
    // condition still asked `user.socialMedia.length` and the loop asked the filtered one, a
    // profile whose links are all unfollowable rendered the card with a heading and nothing
    // under it. Computing it once per render rather than twice is the smaller half of it.
    socialMediaLinks() {
      const { socialMedia = [] } = this.user
      // Filtered, not just stripped of its href: this card is a list of links to follow, and
      // an entry nobody can follow is noise here — its favicon and label would be derived
      // from a string that is not an address. The owner still sees and can fix the row on
      // their own settings page, which renders no href at all.
      return socialMedia.filter(({ url }) => linkable(url)).map(({ url }) => describe(url))
    },
  },
}
</script>

<style scoped>
.social-media-bc {
  position: relative;
  height: auto;

  > .title {
    color: var(--text-color-soft);
    font-size: var(--font-size-base);
    margin-bottom: var(--space-small);
  }
}
</style>
