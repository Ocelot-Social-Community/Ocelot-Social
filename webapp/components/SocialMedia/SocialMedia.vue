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
  // Everything below comes from the PARSED url, never from the string. Deriving it by pattern
  // got two things wrong that a profile page must not get wrong:
  //
  //   https://user:secret@example.org  favicon https://user/favicon.ico, and the label read
  //                                    "user:secret@example.org" — a password printed on a
  //                                    page open to everyone
  //   https://example.org:8443/x       the port was dropped, so the favicon was fetched from
  //                                    a different origin than the link goes to
  //
  // `origin` answers "which site is this" the way a browser does: credentials stripped, port
  // kept, scheme lower-cased. Parsing cannot throw here — this runs only for values `linkable`
  // already accepted.
  const parsed = new URL(url)
  const { origin, host, pathname } = parsed
  const segments = pathname.split('/').filter(Boolean)
  // Credentials are dropped from the href as well, not just from what is shown: keeping them
  // would leave a password in the DOM of a page open to everyone — copyable, and sent to the
  // site by anyone who clicks. The link still resolves, just unauthenticated, which is the
  // only sane reading of a credential typed into a PUBLIC profile field.
  //
  // Only THEN is the href rewritten. `toString()` also normalises what needs no fixing — it
  // appends a slash to `https://example.org` and lower-cases the scheme — and the stored value
  // is what the owner chose to publish. It is rewritten where there is a reason and left alone
  // otherwise.
  const hasCredentials = parsed.username !== '' || parsed.password !== ''
  parsed.username = ''
  parsed.password = ''
  return {
    url,
    href: hasCredentials ? parsed.toString() : url,
    // The last path segment is the profile name on every site this card is for
    // (instagram.com/name, mastodon.social/@name). Without one, the host stands in for it —
    // `host`, not `hostname`, because a port is part of the address the link goes to. Minus a
    // leading `www.`, which says nothing.
    username: segments.length > 0 ? segments[segments.length - 1] : host.replace(/^www\./i, ''),
    favicon: `${origin}/favicon.ico`,
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
