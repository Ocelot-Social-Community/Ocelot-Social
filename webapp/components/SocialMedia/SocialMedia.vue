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
import { fallbackIconFor, faviconFor, followable, mailAddress } from '~/utils/followableUrl'

// The rule lives in ~/utils/followableUrl.js, shared with the settings form that accepts these
// values. It used to sit here, and the form validated with its own — so a `mailto:` this card
// could render was one the form refused to save.

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
    return { url, href: url, username: address, favicon: null, fallbackIcon: fallbackIconFor(url) }
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
  // `origin` answers "which site is this" the way a browser does: port kept, scheme
  // lower-cased. Parsing cannot throw here — this runs only for values `followable` already
  // accepted.
  //
  // Credentials are no longer stripped here, because they can no longer arrive: `followable`
  // refuses a url that carries them. Stripping was the weaker half of the fix anyway — it kept
  // the password out of the label and the href while the profile query still shipped the raw
  // string to every visitor and every API client. The href is therefore the stored value,
  // untouched: `toString()` would normalise what needs no fixing, appending a slash to
  // `https://example.org` and lower-casing the scheme, and what the owner chose to publish is
  // what gets published.
  const { host, pathname } = new URL(url)
  const segments = pathname.split('/').filter(Boolean)
  return {
    url,
    href: url,
    // The last path segment is the profile name on every site this card is for
    // (instagram.com/name, mastodon.social/@name). Without one, the host stands in for it —
    // `host`, not `hostname`, because a port is part of the address the link goes to. Minus a
    // leading `www.`, which says nothing.
    username: segments.length > 0 ? segments[segments.length - 1] : host.replace(/^www\./i, ''),
    favicon: faviconFor(url),
    fallbackIcon: fallbackIconFor(url),
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
      return socialMedia.filter(({ url }) => followable(url)).map(({ url }) => describe(url))
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
