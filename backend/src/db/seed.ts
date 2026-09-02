/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable n/no-unpublished-import */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-confusing-void-expression */

import { faker } from '@faker-js/faker'
import sample from 'lodash/sample.js'

import CONFIG from '@config/index'
import { categories } from '@constants/categories'
import CreateComment from '@graphql/queries/comments/CreateComment.gql'
import ChangeGroupMemberRole from '@graphql/queries/groups/ChangeGroupMemberRole.gql'
import CreateGroup from '@graphql/queries/groups/CreateGroup.gql'
import JoinGroup from '@graphql/queries/groups/JoinGroup.gql'
import CreateGroupRoom from '@graphql/queries/messaging/CreateGroupRoom.gql'
import CreateMessage from '@graphql/queries/messaging/CreateMessage.gql'
import CreatePost from '@graphql/queries/posts/CreatePost.gql'
import { createApolloTestSetup } from '@root/test/helpers'
import { ensureUserRoleEdges, seedDefaultRoleNodes } from '@src/role/index'

import Factory from './factories'
import { nudgeCacheResync } from './resync-caches'
import { trophies, verification } from './seed/badges'

import type { TestNode } from './testing/node'

// The fixture lookups return null for an unknown key, where neode threw. Everything the seed
// looks up it created a few lines earlier, so a miss means the seed itself changed — worth
// saying which node, rather than failing three statements later on undefined.
const requireNode = (node: TestNode | null, what: string): TestNode => {
  if (!node) {
    throw new Error(`seed: expected ${what} to exist`)
  }
  return node
}

if (CONFIG.PRODUCTION && !CONFIG.PRODUCTION_DB_CLEAN_ALLOW) {
  throw new Error(`You cannot seed the database in a non-staging and real production environment!`)
}

CONFIG.SEND_MAIL = true

const languages = ['de', 'en', 'es', 'fr', 'it', 'pt', 'pl']

;(async function () {
  /* eslint-disable-next-line no-console */
  console.log('Seeded Data...')

  let authenticatedUser = null

  // locations
  const context = () => ({
    authenticatedUser,
    config: CONFIG,
    policy: { categoriesActive: true },
  })
  const apolloSetup = await createApolloTestSetup({ context })
  const { mutate, server, database } = apolloSetup
  const { neode } = database

  try {
    // Single-role system: seed the default role nodes up front so every user gets
    // their HAS_ROLE edge at creation time (the factory links to the role node), and
    // peterLustig can be created directly as owner. This script runs as a CLI without
    // RoleService.init(), so nothing else seeds the role nodes.
    await seedDefaultRoleNodes(database)

    // eslint-disable-next-line no-console
    console.log('seed', 'locations')

    // locations
    const Hamburg = await Factory.build('location', {
      id: 'region.5127278006398860',
      name: 'Hamburg',
      type: 'region',
      lng: 10.0,
      lat: 53.55,
      nameES: 'Hamburgo',
      nameFR: 'Hambourg',
      nameIT: 'Amburgo',
      nameEN: 'Hamburg',
      namePT: 'Hamburgo',
      nameDE: 'Hamburg',
      nameNL: 'Hamburg',
      namePL: 'Hamburg',
      nameRU: 'Гамбург',
    })
    const Berlin = await Factory.build('location', {
      id: 'region.14880313158564380',
      type: 'region',
      name: 'Berlin',
      lng: 13.38333,
      lat: 52.51667,
      nameES: 'Berlín',
      nameFR: 'Berlin',
      nameIT: 'Berlino',
      nameEN: 'Berlin',
      namePT: 'Berlim',
      nameDE: 'Berlin',
      nameNL: 'Berlijn',
      namePL: 'Berlin',
      nameRU: 'Берлин',
    })
    const Germany = await Factory.build('location', {
      id: 'country.10743216036480410',
      name: 'Germany',
      type: 'country',
      namePT: 'Alemanha',
      nameDE: 'Deutschland',
      nameES: 'Alemania',
      nameNL: 'Duitsland',
      namePL: 'Niemcy',
      nameFR: 'Allemagne',
      nameIT: 'Germania',
      nameEN: 'Germany',
      nameRU: 'Германия',
    })
    const Paris = await Factory.build('location', {
      id: 'region.9397217726497330',
      name: 'Paris',
      type: 'region',
      lng: 2.35183,
      lat: 48.85658,
      nameES: 'París',
      nameFR: 'Paris',
      nameIT: 'Parigi',
      nameEN: 'Paris',
      namePT: 'Paris',
      nameDE: 'Paris',
      nameNL: 'Parijs',
      namePL: 'Paryż',
      nameRU: 'Париж',
    })
    const France = await Factory.build('location', {
      id: 'country.9759535382641660',
      name: 'France',
      type: 'country',
      namePT: 'França',
      nameDE: 'Frankreich',
      nameES: 'Francia',
      nameNL: 'Frankrijk',
      namePL: 'Francja',
      nameFR: 'France',
      nameIT: 'Francia',
      nameEN: 'France',
      nameRU: 'Франция',
    })
    await Berlin.relateTo(Germany, 'isIn')
    await Hamburg.relateTo(Germany, 'isIn')
    await Paris.relateTo(France, 'isIn')

    const {
      trophyAirship,
      trophyBee,
      trophyStarter,
      trophyFlower,
      trophyPanda,
      trophyTiger,
      trophyAlienship,
      trophyBalloon,
      trophyMagicrainbow,
      trophySuperfounder,
      trophyBigballoon,
      trophyLifetree,
      trophyRacoon,
      trophyRhino,
      trophyWolf,
      trophyTurtle,
      trophyBear,
      trophyRabbit,
    } = await trophies()

    const { verificationAdmin, verificationModerator, verificationDeveloper } = await verification()

    // eslint-disable-next-line no-console
    console.log('seed', 'users')
    // Two role-assignment patterns below, by design (see relateUserToRole in
    // factories.ts): the `owner` is granted explicitly via the `roleName` option,
    // while the admin/moderator/user *tiers* use the `role` build-attr selector.
    // Petra Lustig is the instance OWNER — the failsafe superuser (single HAS_ROLE
    // edge to the owner role). Login: owner@example.org / 1234.
    await Factory.build(
      'user',
      {
        id: 'u0',
        name: 'Petra Lustig',
        slug: 'petra-lustig',
      },
      {
        email: 'owner@example.org',
        roleName: 'owner',
        avatar: null,
      },
    )
    const peterLustig = await Factory.build(
      'user',
      {
        id: 'u1',
        name: 'Peter Lustig',
        slug: 'peter-lustig',
        role: 'admin',
        locationName: 'Berlin, Germany',
      },
      {
        // peterLustig is an admin (admin role via the 'admin' tier selector).
        // Login: admin@example.org / 1234.
        email: 'admin@example.org',
      },
    )
    const bobDerBaumeister = await Factory.build(
      'user',
      {
        id: 'u2',
        name: 'Bob der Baumeister',
        slug: 'bob-der-baumeister',
        role: 'moderator',
        locationName: 'Hamburg, Germany',
      },
      {
        email: 'moderator@example.org',
        avatar: null,
      },
    )
    const jennyRostock = await Factory.build(
      'user',
      {
        id: 'u3',
        name: 'Jenny Rostock',
        slug: 'jenny-rostock',
        role: 'user',
        locationName: 'Paris, France',
      },
      {
        email: 'user@example.org',
      },
    )
    const huey = await Factory.build(
      'user',
      {
        id: 'u4',
        name: 'Huey',
        slug: 'huey',
        role: 'user',
        locationName: 'Paris, France',
      },
      {
        email: 'huey@example.org',
      },
    )
    const dewey = await Factory.build(
      'user',
      {
        id: 'u5',
        name: 'Dewey',
        slug: 'dewey',
        role: 'user',
      },
      {
        email: 'dewey@example.org',
        avatar: null,
      },
    )
    const louie = await Factory.build(
      'user',
      {
        id: 'u6',
        name: 'Louie',
        slug: 'louie',
        role: 'user',
      },
      {
        email: 'louie@example.org',
      },
    )
    const dagobert = await Factory.build(
      'user',
      {
        id: 'u7',
        name: 'Dagobert',
        slug: 'dagobert',
        role: 'user',
      },
      {
        email: 'dagobert@example.org',
      },
    )

    await peterLustig.relateTo(Berlin, 'isIn')
    await bobDerBaumeister.relateTo(Hamburg, 'isIn')
    await jennyRostock.relateTo(Paris, 'isIn')
    await huey.relateTo(Paris, 'isIn')

    // eslint-disable-next-line no-console
    console.log('seed', 'badges')
    await peterLustig.relateTo(trophyRacoon, 'rewarded')
    await peterLustig.relateTo(trophyRhino, 'rewarded')
    await peterLustig.relateTo(trophyWolf, 'rewarded')
    await peterLustig.relateTo(trophyAirship, 'rewarded')
    await peterLustig.relateTo(verificationAdmin, 'verifies')
    await peterLustig.relateTo(trophyRacoon, 'selected', { slot: 0 })
    await peterLustig.relateTo(trophyRhino, 'selected', { slot: 1 })
    await peterLustig.relateTo(trophyAirship, 'selected', { slot: 5 })

    await bobDerBaumeister.relateTo(trophyRacoon, 'rewarded')
    await bobDerBaumeister.relateTo(trophyTurtle, 'rewarded')
    await bobDerBaumeister.relateTo(trophyBee, 'rewarded')
    await bobDerBaumeister.relateTo(verificationModerator, 'verifies')
    await bobDerBaumeister.relateTo(trophyRacoon, 'selected', { slot: 1 })
    await bobDerBaumeister.relateTo(trophyTurtle, 'selected', { slot: 2 })

    await jennyRostock.relateTo(trophyBear, 'rewarded')
    await jennyRostock.relateTo(trophyStarter, 'rewarded')
    await jennyRostock.relateTo(trophyFlower, 'rewarded')
    await jennyRostock.relateTo(trophyBear, 'selected', { slot: 0 })
    await jennyRostock.relateTo(trophyStarter, 'selected', { slot: 1 })
    await jennyRostock.relateTo(trophyFlower, 'selected', { slot: 2 })

    for (const url of [
      'https://t.me/jenny_rostock_test',
      'http://nsosp.org/de/Quanten-Fluss-Theorie',
      'http://nsosp.org/de/Superial-Zahlen',
      'http://nsosp.org/de/New-Soul-Of-Science-Project',
    ]) {
      const sm = await Factory.build('socialMedia', { url })
      await sm.relateTo(jennyRostock, 'ownedBy')
    }

    await huey.relateTo(trophyPanda, 'rewarded')
    await huey.relateTo(trophyTiger, 'rewarded')
    await huey.relateTo(trophyAlienship, 'rewarded')
    await huey.relateTo(trophyBalloon, 'rewarded')
    await huey.relateTo(trophyMagicrainbow, 'rewarded')
    await huey.relateTo(trophySuperfounder, 'rewarded')
    await huey.relateTo(verificationDeveloper, 'verifies')
    await huey.relateTo(trophyPanda, 'selected', { slot: 0 })
    await huey.relateTo(trophyTiger, 'selected', { slot: 1 })
    await huey.relateTo(trophyAlienship, 'selected', { slot: 2 })

    await dewey.relateTo(trophyBigballoon, 'rewarded')
    await dewey.relateTo(trophyLifetree, 'rewarded')
    await dewey.relateTo(trophyBigballoon, 'selected', { slot: 7 })
    await dewey.relateTo(trophyLifetree, 'selected', { slot: 8 })

    await louie.relateTo(trophyRabbit, 'rewarded')
    await louie.relateTo(trophyRabbit, 'selected', { slot: 4 })

    // eslint-disable-next-line no-console
    console.log('seed', 'friends')
    await peterLustig.relateTo(bobDerBaumeister, 'friends')
    await peterLustig.relateTo(jennyRostock, 'friends')
    await bobDerBaumeister.relateTo(jennyRostock, 'friends')

    await peterLustig.relateTo(jennyRostock, 'following')
    await peterLustig.relateTo(huey, 'following')
    await bobDerBaumeister.relateTo(huey, 'following')
    await jennyRostock.relateTo(huey, 'following')
    await huey.relateTo(dewey, 'following')
    await dewey.relateTo(huey, 'following')
    await louie.relateTo(jennyRostock, 'following')

    await huey.relateTo(dagobert, 'muted')
    await dewey.relateTo(dagobert, 'muted')
    await louie.relateTo(dagobert, 'muted')

    await dagobert.relateTo(huey, 'blocked')
    await dagobert.relateTo(dewey, 'blocked')
    await dagobert.relateTo(louie, 'blocked')

    // eslint-disable-next-line no-console
    console.log('seed', 'categories')
    for (const category of categories) {
      await Factory.build('category', {
        id: category.id,
        slug: category.slug,
        name: category.name,
        icon: category.icon,
      })
    }

    // eslint-disable-next-line no-console
    console.log('seed', 'tags')
    const environment = await Factory.build('tag', {
      id: 'Environment',
    })
    const nature = await Factory.build('tag', {
      id: 'Nature',
    })
    const democracy = await Factory.build('tag', {
      id: 'Democracy',
    })
    const freedom = await Factory.build('tag', {
      id: 'Freedom',
    })

    // eslint-disable-next-line no-console
    console.log('seed', 'groups')
    authenticatedUser = await peterLustig.toJson()
    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g0',
        name: 'Investigative Journalism',
        about: 'Investigative journalists share ideas and insights and can collaborate.',
        description: `<p class=""><em>English:</em></p><p class="">This group is hidden.</p><h3>What is our group for?</h3><p>This group was created to allow investigative journalists to share and collaborate.</p><h3>How does it work?</h3><p>Here you can internally share posts and comments about them.</p><p><br></p><p><em>Deutsch:</em></p><p class="">Diese Gruppe ist verborgen.</p><h3>Wofür ist unsere Gruppe?</h3><p class="">Diese Gruppe wurde geschaffen, um investigativen Journalisten den Austausch und die Zusammenarbeit zu ermöglichen.</p><h3>Wie funktioniert das?</h3><p class="">Hier könnt ihr euch intern über Beiträge und Kommentare zu ihnen austauschen.</p>`,
        groupType: 'hidden',
        actionRadius: 'global',
        categoryIds: ['cat6', 'cat12', 'cat16'],
        locationName: 'Hamburg, Germany',
      },
    })
    await mutate({
      mutation: JoinGroup,
      variables: {
        groupId: 'g0',
        userId: 'u2',
      },
    })
    await mutate({
      mutation: JoinGroup,
      variables: {
        groupId: 'g0',
        userId: 'u4',
      },
    })
    await mutate({
      mutation: JoinGroup,
      variables: {
        groupId: 'g0',
        userId: 'u6',
      },
    })

    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: {
        groupId: 'g0',
        userId: 'u2',
        roleInGroup: 'usual',
      },
    })

    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: {
        groupId: 'g0',
        userId: 'u4',
        roleInGroup: 'admin',
      },
    })

    // eslint-disable-next-line no-console
    console.log('seed', 'group posts')
    await mutate({
      mutation: CreatePost,
      variables: {
        id: 'p0-g0',
        groupId: 'g0',
        title: `What happend in Shanghai?`,
        content: 'A sack of rise dropped in Shanghai. Should we further investigate?',
        categoryIds: ['cat6'],
      },
    })

    authenticatedUser = await bobDerBaumeister.toJson()
    await mutate({
      mutation: CreatePost,
      variables: {
        id: 'p1-g0',
        groupId: 'g0',
        title: `The man on the moon`,
        content: 'We have to further investigate about the stories of a man living on the moon.',
        categoryIds: ['cat12', 'cat16'],
      },
    })

    authenticatedUser = await jennyRostock.toJson()
    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g1',
        name: 'School For Citizens',
        about: 'Our children shall receive education for life.',
        description: `<p class=""><em>English</em></p><h3>Our goal</h3><p>Only those who enjoy learning and do not lose their curiosity can obtain a good education for life and continue to learn with joy throughout their lives.</p><h3>Curiosity</h3><p>For this we need a school that takes up the curiosity of the children, the people, and satisfies it through a lot of experience.</p><p><br></p><p><em>Deutsch</em></p><h3>Unser Ziel</h3><p class="">Nur wer Spaß am Lernen hat und seine Neugier nicht verliert, kann gute Bildung für's Leben erlangen und sein ganzes Leben mit Freude weiter lernen.</p><h3>Neugier</h3><p class="">Dazu benötigen wir eine Schule, die die Neugier der Kinder, der Menschen, aufnimmt und durch viel Erfahrung befriedigt.</p>`,
        groupType: 'closed',
        actionRadius: 'national',
        categoryIds: ['cat8', 'cat14'],
        locationName: 'France',
      },
    })
    await database.write({
      query: `MATCH (group:Group {id: 'g1'}) SET group.showMembers = true`,
      variables: {},
    })
    await mutate({
      mutation: JoinGroup,
      variables: {
        groupId: 'g1',
        userId: 'u1',
      },
    })
    await mutate({
      mutation: JoinGroup,
      variables: {
        groupId: 'g1',
        userId: 'u2',
      },
    })
    await mutate({
      mutation: JoinGroup,
      variables: {
        groupId: 'g1',
        userId: 'u5',
      },
    })
    await mutate({
      mutation: JoinGroup,
      variables: {
        groupId: 'g1',
        userId: 'u6',
      },
    })
    await mutate({
      mutation: JoinGroup,
      variables: {
        groupId: 'g1',
        userId: 'u7',
      },
    })

    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: {
        groupId: 'g1',
        userId: 'u1',
        roleInGroup: 'usual',
      },
    })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: {
        groupId: 'g1',
        userId: 'u5',
        roleInGroup: 'admin',
      },
    })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: {
        groupId: 'g1',
        userId: 'u6',
        roleInGroup: 'owner',
      },
    })
    await mutate({
      mutation: CreatePost,
      variables: {
        id: 'p0-g1',
        groupId: 'g1',
        title: `Can we use ocelot for education?`,
        content: 'I like the concept of this school. Can we use our software in this?',
        categoryIds: ['cat8'],
      },
    })
    authenticatedUser = await peterLustig.toJson()
    await mutate({
      mutation: CreatePost,
      variables: {
        id: 'p1-g1',
        groupId: 'g1',
        title: `Can we push this idea out of France?`,
        content: 'This idea is too inportant to have the scope only on France.',
        categoryIds: ['cat14'],
      },
    })

    authenticatedUser = await bobDerBaumeister.toJson()
    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g2',
        name: 'Yoga Practice',
        about: 'We do yoga around the clock.',
        description: `<h3>What Is yoga?</h3><p>Yoga is not just about practicing asanas. It's about how we do it.</p><p class="">And practicing asanas doesn't have to be yoga, it can be more athletic than yogic.</p><h3>What makes practicing asanas yogic?</h3><p class="">The important thing is:</p><ul><li><p>Use the exercises (consciously) for your personal development.</p></li></ul>`,
        groupType: 'public',
        actionRadius: 'interplanetary',
        categoryIds: ['cat4', 'cat5', 'cat17'],
      },
    })
    await mutate({
      mutation: JoinGroup,
      variables: {
        groupId: 'g2',
        userId: 'u3',
      },
    })
    await mutate({
      mutation: JoinGroup,
      variables: {
        groupId: 'g2',
        userId: 'u4',
      },
    })
    await mutate({
      mutation: JoinGroup,
      variables: {
        groupId: 'g2',
        userId: 'u5',
      },
    })
    await mutate({
      mutation: JoinGroup,
      variables: {
        groupId: 'g2',
        userId: 'u6',
      },
    })
    await mutate({
      mutation: JoinGroup,
      variables: {
        groupId: 'g2',
        userId: 'u7',
      },
    })

    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: {
        groupId: 'g2',
        userId: 'u3',
        roleInGroup: 'usual',
      },
    })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: {
        groupId: 'g2',
        userId: 'u4',
        roleInGroup: 'pending',
      },
    })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: {
        groupId: 'g2',
        userId: 'u5',
        roleInGroup: 'admin',
      },
    })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: {
        groupId: 'g2',
        userId: 'u6',
        roleInGroup: 'usual',
      },
    })

    authenticatedUser = await jennyRostock.toJson()
    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g3',
        name: 'Quantum Flow Theory',
        about: 'Exploring the Quantum Flow Theory as a new foundation for physics.',
        description: `<h3>What is Quantum Flow Theory?</h3><p>Quantum Flow Theory proposes a new way of understanding the building blocks of nature — not as particles or waves, but as flows of quantised information.</p><h3>Goals</h3><p>We discuss research, share papers, and develop ideas together that challenge and extend current physical models.</p>`,
        groupType: 'public',
        actionRadius: 'global',
        categoryIds: ['cat9', 'cat16'],
        locationName: 'France',
      },
    })
    await mutate({
      mutation: JoinGroup,
      variables: { groupId: 'g3', userId: 'u1' },
    })
    await mutate({
      mutation: JoinGroup,
      variables: { groupId: 'g3', userId: 'u4' },
    })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g3', userId: 'u1', roleInGroup: 'usual' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g4',
        name: 'New Soul Of Science Project',
        about: 'A project bridging science, philosophy, and the human soul.',
        description: `<h3>The Project</h3><p>The New Soul Of Science Project (NSOSP) aims to develop a holistic scientific worldview that integrates consciousness, matter, and meaning into a coherent framework.</p><h3>Topics</h3><p>We explore superial numbers, quantum flow, and the foundations of a new natural philosophy.</p>`,
        groupType: 'public',
        actionRadius: 'global',
        categoryIds: ['cat9', 'cat16'],
        locationName: 'France',
      },
    })
    await mutate({
      mutation: JoinGroup,
      variables: { groupId: 'g4', userId: 'u4' },
    })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g4', userId: 'u4', roleInGroup: 'usual' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g5',
        name: 'Superial Numbers',
        about: 'Research group for a new kind of number beyond real and complex numbers.',
        description: `<h3>What are Superial Numbers?</h3><p>Superial numbers extend the known number systems — real, complex, and hypercomplex — into a new domain that may help describe quantum phenomena and consciousness mathematically.</p><h3>Members</h3><p>This is a closed research group for people actively working on or studying superial number theory.</p>`,
        groupType: 'closed',
        actionRadius: 'continental',
        categoryIds: ['cat9'],
        locationName: 'France',
      },
    })
    await mutate({
      mutation: JoinGroup,
      variables: { groupId: 'g5', userId: 'u4' },
    })
    await mutate({
      mutation: JoinGroup,
      variables: { groupId: 'g5', userId: 'u5' },
    })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g5', userId: 'u4', roleInGroup: 'admin' },
    })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g5', userId: 'u5', roleInGroup: 'usual' },
    })

    // authenticatedUser is still jennyRostock (u3)
    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g6',
        name: 'Gradido – Wertschätzungseinheit',
        about:
          'Eine Wertschätzungseinheit nach dem Vorbild der Natur für Wohlstand, Frieden und Freiheit.',
        description: `<h3>Was ist Gradido?</h3><p>Gradido wurde aus über 20 Jahren Forschung an der Gradido-Akademie für Wirtschaftsbionik entwickelt. Es ist eine Wertschätzungseinheit, die darauf abzielt, „Wohlstand, Frieden und Freiheit für alle Menschen – im Einklang mit der Natur" zu schaffen.</p><h3>Wie funktioniert es?</h3><p>Das Dreifache Wohl bildet das ethische Fundament: das Wohl des Einzelnen, das Wohl der Gemeinschaft und das Wohl der Natur. Neue Gradidos werden bevölkerungsbasiert ausgegeben – ohne Schulden. Entscheidend: 50 % der Guthaben verfallen jährlich, was Stabilität gewährleistet und Blasen verhindert.</p><h3>Wirtschaftsbionik</h3><p>Das theoretische Fundament der Initiative ist die „Wirtschaftsbionik", die Prinzipien der Natur untersucht, die seit Milliarden von Jahren Fülle, Vielfalt und Balance erhalten.</p>`,
        groupType: 'public',
        actionRadius: 'global',
        categoryIds: ['cat6', 'cat9', 'cat16'],
        locationName: 'Germany',
      },
    })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g6', userId: 'u1' } })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g6', userId: 'u4' } })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g6', userId: 'u1', roleInGroup: 'usual' },
    })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g6', userId: 'u4', roleInGroup: 'usual' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g7',
        name: 'Gesundheit fängt im Boden an',
        about:
          'Das Bodenmikrobiom als Grundlage menschlicher Gesundheit – von der Erde bis zum Darm.',
        description: `<h3>Unsere Mission</h3><p>Das Projekt, geleitet von Ulrike B. Rapp (Agraringenieurin für regenerative Landwirtschaft), zielt darauf ab, „humus- und mikrobiomreiche Böden als Grundlage gesunden Lebens" in den Händen von Gartenanbauern, Landwirten und Gemeinschaftsgärten zu entwickeln und zu sichern.</p><h3>Kerngedanke</h3><p>Wachsende Belege deuten darauf hin, dass das Darmmikrobiom eine entscheidende Rolle bei psychischer Gesundheit, Immunerkrankungen, Allergien, Stoffwechselstörungen und Krebs spielt. Der Grundsatz „gesunder Boden – gesunde Pflanze – gesunder Mensch" erfährt durch die Mikrobiomforschung wissenschaftliche Bestätigung.</p><h3>Aktivitäten</h3><ul><li><p>Vorträge und Workshops zu biozyklischem Humusboden und Kompostierung</p></li><li><p>Beratung für Gärtner und Gemeinschaftsinitiativen</p></li><li><p>Chroma-Bodentests zur Visualisierung der Bodenqualität</p></li></ul>`,
        groupType: 'public',
        actionRadius: 'national',
        categoryIds: ['cat12', 'cat14'],
        locationName: 'Germany',
      },
    })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g7', userId: 'u4' } })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g7', userId: 'u5' } })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g7', userId: 'u4', roleInGroup: 'usual' },
    })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g7', userId: 'u5', roleInGroup: 'usual' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g8',
        name: 'Minuto – Komplementärwährung',
        about:
          'Zeitgutscheine als dezentrales, regionales Zahlungsmittel für Leistungen und Waren.',
        description: `<h3>Was ist Minuto?</h3><p>Minuto ist „ein Zahlungsmittel zum Selbermachen in Form von Zeitgutscheinen für qualitative Leistung" – ein dezentrales, regionales Zahlungssystem, das menschliche Fähigkeiten und Kooperation statt Konkurrenz betont.</p><h3>So funktioniert es</h3><p>Teilnehmende drucken Vorlagen aus, ergänzen persönliche Angaben und holen die Unterschriften zweier Bürgen. Es gibt keine zentrale Ausgabestelle – jeder ist seine eigene Zentralbank. Das System wirkt am besten in geografischen Gemeinschaften, wo Menschen sich leicht vernetzen können.</p><h3>Einsatzmöglichkeiten</h3><p>Gutscheine können für Dienstleistungen (Backen, Computerhilfe, Gartenarbeit, Transport) und Waren (handgefertigte Artikel, Gebrauchtes, Vermietung) getauscht werden.</p>`,
        groupType: 'closed',
        actionRadius: 'regional',
        categoryIds: ['cat6', 'cat9'],
        locationName: 'Stralsund, Germany',
      },
    })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g8', userId: 'u4' } })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g8', userId: 'u4', roleInGroup: 'admin' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g9',
        name: 'IT4C – Technologie für Wandel',
        about:
          'Freie Software und offene Prozesse im Dienst des Gemeinwohls und gesellschaftlichen Wandels.',
        description: `<h3>Wer wir sind</h3><p>IT4C ist ein Netzwerk engagierter Softwareentwickler:innen, Designer:innen und Berater:innen, das „Initiativen, Organisationen und Bewegungen" begleitet, die sich für eine gerechte, nachhaltige und demokratische Welt einsetzen. Die Arbeitsweise ist „open, solidarisch, menschenzentriert".</p><h3>Was wir tun</h3><p>IT4C betrachtet Softwareentwicklung nicht als Selbstzweck, sondern als Vehikel für sozialen Wandel. Digitale Souveränität steht im Mittelpunkt – durch transparente, ethisch reflektierte und partizipative Entwicklungsprozesse.</p><h3>Projekte</h3><ul><li><p><strong>Ocelot.social</strong>: Open-Source-Software für demokratische Alternativen zu kommerziellen Plattformen</p></li><li><p><strong>Utopia Map</strong>: Kollaborative Mapping-Plattform für Transformationsinitiativen</p></li></ul>`,
        groupType: 'public',
        actionRadius: 'global',
        categoryIds: ['cat13', 'cat15'],
        locationName: 'Germany',
      },
    })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g9', userId: 'u1' } })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g9', userId: 'u4' } })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g9', userId: 'u1', roleInGroup: 'usual' },
    })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g9', userId: 'u4', roleInGroup: 'admin' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g10',
        name: 'Linux Werkstatt – Privatsphäre',
        about:
          'Privatsphäre auf digitalen Geräten umsetzen – von Linux auf dem PC bis zu GrapheneOS auf dem Smartphone.',
        description: `<h3>Worum geht es?</h3><p>Die Linux Werkstatt entstand aus Datenschutzvorträgen von Chriz Stein und hat inzwischen Teilnehmende in ganz Deutschland. Das dezentrale Netzwerk lokaler Teams teilt technisches Wissen und Best Practices rund um datenschutzfreundliche Betriebssysteme und Anwendungen.</p><h3>Computer und Notebooks</h3><p>Wir begleiten den Umstieg auf Linux-basierte Betriebssysteme und Open-Source-Alternativen zu proprietärer Software wie Microsoft Office.</p><h3>Smartphones</h3><p>Teams helfen dabei, datenschutzfokussierte Systeme wie GrapheneOS, /e/OS und LineageOS zu evaluieren und empfehlen alternative Apps für Messaging, E-Mail, Navigation und digitale Geldbörsen.</p>`,
        groupType: 'closed',
        actionRadius: 'national',
        categoryIds: ['cat15', 'cat11'],
        locationName: 'Germany',
      },
    })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g10', userId: 'u4' } })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g10', userId: 'u5' } })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g10', userId: 'u4', roleInGroup: 'usual' },
    })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g10', userId: 'u5', roleInGroup: 'usual' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g11',
        name: 'Terra Nova – Gemeinschaft & Biohotel',
        about:
          'Ein Gemeinschaftsort an der Ostsee – Begegnungsraum, essbare Landschaft und Biohotel.',
        description: `<h3>Terra Nova auf Gut Nisdorf</h3><p>18 km von Stralsund entfernt liegt auf einem 700 Jahre alten Gutshof das Terra-Nova-Projekt. Im Sommer ist es ein Biohotel für Familien und Naturliebende, in den anderen Jahreszeiten „eine Oase der Stille". Das Anwesen bietet Gärten, einen Naturteich und Waldgebiete mit legendären Sonnenuntergängen über den Bodden.</p><h3>Unsere Vision</h3><p>Wir entwickeln eine essbare Landschaft und einen Begegnungsort, an dem authentische menschliche Verbindung jenseits von Meinungen und Vorurteilen entstehen kann. Die Gründungsgemeinschaft vereint Expertise in Bau, Ökologie, Permakultur, Unternehmensberatung, Journalismus und sozialer Moderation.</p><h3>Mitmachen</h3><p>Praktikant:innen und Interessierte können lernen und gleichzeitig zu Bau-, Garten-, Küchen- und Konstruktionsprojekten beitragen.</p>`,
        groupType: 'public',
        actionRadius: 'regional',
        categoryIds: ['cat1', 'cat12', 'cat10'],
        locationName: 'Nisdorf, Germany',
      },
    })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g11', userId: 'u4' } })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g11', userId: 'u6' } })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g11', userId: 'u4', roleInGroup: 'usual' },
    })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g11', userId: 'u6', roleInGroup: 'usual' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g12',
        name: 'Lehren 2.0 – Beruf sinnvoll leben',
        about:
          'Professionelle Entwicklung für Lehrkräfte: Wandel von der Defizit- zur Potenzialkultur.',
        description: `<h3>Das Programm</h3><p>Lehren 2.0 ist ein inspirierender, kreativer Online-Kurs mit Präsenzterminen in vier Modulen für Lehrkräfte, Schulleitungen und Eltern an freien Schulen. Das Ziel: das bestehende Bildungssystem durch gleichwertige Beziehungen und Selbstverantwortung der Lernenden umgestalten.</p><h3>Holistische Pädagogik</h3><p>Im Mittelpunkt steht, dass „eine logopädagogische Haltung der Lehrperson eine entscheidende Rolle für die Bindung an Kinder" und ihre Lernentwicklung spielt. Der Lehrplan bietet Werkzeuge, die Erziehende dabei unterstützen, das Potenzial von Kindern durch bedeutungsvolle Pädagogik zu fördern.</p><h3>Abschluss</h3><p>Das Programm endet mit einer Zertifizierung durch einen Bildungsbrief.</p>`,
        groupType: 'closed',
        actionRadius: 'national',
        categoryIds: ['cat3', 'cat17'],
        locationName: 'Germany',
      },
    })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g12', userId: 'u4' } })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g12', userId: 'u5' } })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g12', userId: 'u4', roleInGroup: 'usual' },
    })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g12', userId: 'u5', roleInGroup: 'usual' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g13',
        name: 'Montessori Grundschule Nordzypern',
        about:
          'Aufbau einer Montessori-Grundschule in Nordzypern für kindgerechtes, selbstbestimmtes Lernen.',
        description: `<h3>Das Projekt</h3><p>Die Initiative entstand, als Uri Reick mit seiner Familie nach Nordzypern zog und nur staatliche Schulen oder britische Privatschulen vorfand. Gemeinsam mit Dincel Sukrettin, Leiter eines Montessori-Kindergartens, und zwei weiteren deutschen Familien startete er den Aufbau einer neuen Schule.</p><h3>Pädagogik</h3><p>Der geplante Lehrplan betont Montessori- und Freie-Lern-Ansätze bei gleichzeitiger Erfüllung staatlicher Anforderungen für die Anerkennung. Unterrichtssprachen sind Englisch, Türkisch und Deutsch; weitere Schwerpunkte sind Gartenanbau, Ernährung und digitale Kompetenz.</p><h3>Zahlen & Ziele</h3><p>Im ersten Jahr sollen 20–40 Kinder der Klassen 1–3 aufgenommen werden. Die Vision wächst auf bis zu 100 Schüler:innen in den Klassen 1–5 innerhalb von vier Jahren. Finanzielle Unterstützung durch Genossenschaft und Crowdfunding ist geplant.</p>`,
        groupType: 'public',
        actionRadius: 'continental',
        categoryIds: ['cat7', 'cat8'],
        locationName: 'North Cyprus',
      },
    })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g13', userId: 'u4' } })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g13', userId: 'u4', roleInGroup: 'usual' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g14',
        name: 'Lebenswege – Potenzialentfaltung',
        about:
          'Kreative Wegbegleitung durch Wissen, Tanz, Worte, Gestaltung und Lieder zur Entfaltung des Seelensinns.',
        description: `<h3>Die Initiative</h3><p>Gegründet von Kersten Elisabeth Pfaff, Choreografin und Tanzpädagogin, fokussiert sich diese Initiative auf den „inneren Ausdruck des Menschen" durch multiple kreative Ausdrucksformen. Die Arbeit zielt darauf ab, menschliches Potenzial über verschiedene Modalitäten zugänglich zu machen.</p><h3>Angebote</h3><ul><li><p><strong>Vorträge</strong> mit anthroposophischen Grundlagen: „Die lebendige Kraft der Sprache", Märchen als Seelenbilder, Bewusstseinserweiterung</p></li><li><p><strong>Bewegung & Tanz</strong>: feminine Archetypen, mythologische Themen, kreativem und Seelentanz</p></li><li><p><strong>Persönlichkeitsentwicklung</strong>: Programme zu Ruf, Beruf und Berufung, Lebensgestaltung und Lebensalter</p></li><li><p><strong>Jahreszeitliche Feste & Singen</strong>: Rauhnächte, Gemeinschaftssingen</p></li></ul>`,
        groupType: 'public',
        actionRadius: 'regional',
        categoryIds: ['cat3', 'cat16', 'cat17'],
        locationName: 'Germany',
      },
    })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g14', userId: 'u1' } })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g14', userId: 'u4' } })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g14', userId: 'u1', roleInGroup: 'usual' },
    })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g14', userId: 'u4', roleInGroup: 'usual' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g15',
        name: 'Treffpunkt Genossenschaft',
        about: 'Platz, um Ideen vorzustellen und sich aktiv im Netzwerk zu vernetzen.',
        description: `<h3>Was ist der Treffpunkt Genossenschaft?</h3><p>Ein Begegnungsort für Menschen mit Ideen, die zu den Werten der Genossenschaft passen und Unterstützung bei der Umsetzung suchen oder sich aktiv im Netzwerk vernetzen möchten.</p><h3>Wie es funktioniert</h3><p>Interessierte stellen sich vor, indem sie ihren persönlichen Hintergrund, ihre motivierenden Ideen oder ihr Projektwerk teilen und Gemeinsamkeiten für die Zusammenarbeit benennen. Das Team meldet sich dann zur Vorbereitung der nächsten Treffen.</p><h3>Wen wir suchen</h3><ul><li><p>Menschen mit Interesse an der Arbeit mit oder in der Genossenschaft</p></li><li><p>Personen mit guten Ideen, die Umsetzungsunterstützung benötigen</p></li><li><p>Projektgründende, die dem Netzwerk beitreten möchten</p></li></ul>`,
        groupType: 'closed',
        actionRadius: 'national',
        categoryIds: ['cat9', 'cat0'],
        locationName: 'Germany',
      },
    })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g15', userId: 'u4' } })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g15', userId: 'u6' } })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g15', userId: 'u4', roleInGroup: 'usual' },
    })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g15', userId: 'u6', roleInGroup: 'usual' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g16',
        name: 'pack&satt – der Einpott',
        about: 'Bio-vegane Fertigmahlzeit in Papierverpackung: satt in 5 Minuten, überall.',
        description: `<h3>Was ist pack&satt?</h3><p>Der Einpott macht dich in 5 Minuten satt – egal ob im Büro, unterwegs oder zu Hause. Alles bio, alles vegan, alles in Papier verpackt.</p><h3>Unser Ansatz</h3><p>Nachhaltige Ernährung muss praktisch sein. Wir verzichten auf Plastik und setzen auf regionale Bio-Zutaten. Der Einpott ist fertig in wenigen Minuten und hinterlässt keine ökologische Schuld.</p>`,
        groupType: 'public',
        actionRadius: 'national',
        categoryIds: ['cat12', 'cat14', 'cat9'],
        locationName: 'Germany',
      },
    })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g16', userId: 'u4' } })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g16', userId: 'u4', roleInGroup: 'usual' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g17',
        name: 'Ocelot.Social – Plattform',
        about:
          'Freie Open-Source-Plattform für selbstverwaltete soziale Netzwerke von Gruppen und Initiativen.',
        description: `<h3>Was ist Ocelot.Social?</h3><p>Ocelot.Social ist eine freie Open-Source-Plattform, die es Gruppen und Initiativen ermöglicht, eigene soziale Netzwerke zu betreiben – selbstgehostet, transparent und unabhängig von kommerziellen Anbietern.</p><h3>Unsere Werte</h3><p>Digitale Souveränität, Datenschutz und demokratische Strukturen stehen im Mittelpunkt. Der Code ist öffentlich zugänglich, die Weiterentwicklung erfolgt kollaborativ.</p>`,
        groupType: 'public',
        actionRadius: 'global',
        categoryIds: ['cat15', 'cat0', 'cat13'],
        locationName: 'Germany',
      },
    })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g17', userId: 'u1' } })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g17', userId: 'u4' } })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g17', userId: 'u1', roleInGroup: 'admin' },
    })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g17', userId: 'u4', roleInGroup: 'usual' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g18',
        name: 'Die Regionalgesellschaft',
        about: 'Erfahrungsaustausch für Energiewendedörfer und erfolgreiche Regionalprojekte.',
        description: `<h3>Peter Schmucks Regionalgesellschaft</h3><p>In dieser Initiative werden Erfahrungen rund um Energiewendedörfer und erfolgreiche regionale Projekte geteilt. Der Fokus liegt auf dem praktischen Erfahrungsaustausch zwischen Gemeinden, die Energie- und Versorgungsprojekte umsetzen.</p><h3>Aktivitäten</h3><p>Regelmäßige Treffen, Vorträge und Exkursionen in Modellregionen. Ziel ist die Übertragbarkeit gelungener Projekte auf andere Gemeinschaften.</p>`,
        groupType: 'public',
        actionRadius: 'national',
        categoryIds: ['cat2', 'cat9', 'cat0'],
        locationName: 'Germany',
      },
    })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g18', userId: 'u5' } })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g18', userId: 'u5', roleInGroup: 'usual' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g19',
        name: 'Geflügelhof Schubert',
        about:
          'Bio-Lebensmittel – ursprünglich, biologisch und regional aus bäuerlicher Landwirtschaft.',
        description: `<h3>Unsere Philosophie</h3><p>Der Geflügelhof Schubert steht für „ursprünglich, biologisch und regional". Artgerechte Haltung, kurze Transportwege und transparente Produktion sind keine Versprechen, sondern gelebte Praxis.</p><h3>Produkte</h3><p>Freilandeier, Geflügel und saisonale Bio-Produkte direkt vom Hof. Einkauf ab Hof und regionale Lieferung für Gemeinschaftsinitiativen.</p>`,
        groupType: 'public',
        actionRadius: 'regional',
        categoryIds: ['cat12', 'cat9'],
        locationName: 'Germany',
      },
    })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g19', userId: 'u6' } })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g19', userId: 'u6', roleInGroup: 'usual' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g20',
        name: 'Menschliche Werte Medien',
        about:
          'Alternatives Mediennetzwerk für gemeinschaftsorientierte Inhalte und Netzwerkjournalismus.',
        description: `<h3>MWM – Menschliche Werte Medien</h3><p>Ein alternatives Mediennetzwerk, das Netzwerkjournalisten und gemeinschaftsorientierte Inhalte verbindet. Die MWM-Onlinezeitung veröffentlicht Beiträge aus der Perspektive einer menschlicheren Wirtschaft.</p><h3>Mitmachen</h3><p>Autorinnen und Autoren, die über Initiativen, Projekte und Persönlichkeiten aus dem Umfeld von Menschlich Wirtschaften berichten möchten, sind herzlich eingeladen.</p>`,
        groupType: 'closed',
        actionRadius: 'national',
        categoryIds: ['cat15', 'cat11'],
        locationName: 'Germany',
      },
    })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g20', userId: 'u1' } })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g20', userId: 'u5' } })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g20', userId: 'u1', roleInGroup: 'usual' },
    })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g20', userId: 'u5', roleInGroup: 'usual' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g21',
        name: 'Natürlich gesund!',
        about:
          'Forum für Gesundheitskultur mit Expertenvorträgen und Austausch zu ganzheitlichem Wohlbefinden.',
        description: `<h3>Die Initiative</h3><p>„Natürlich gesund!" ist ein Forum, das Expertenvorträge und offene Diskussionen zu ganzheitlicher Gesundheitskultur anbietet. Im Mittelpunkt stehen natürliche Heilmethoden, Prävention und das Zusammenspiel von Körper, Geist und Seele.</p><h3>Angebote</h3><p>Regelmäßige Vortragsabende, Workshops und Gesprächsrunden mit Heilpraktikerinnen, Ärzten und Forschenden aus dem Bereich integrativer Medizin.</p>`,
        groupType: 'public',
        actionRadius: 'regional',
        categoryIds: ['cat14', 'cat16'],
        locationName: 'Germany',
      },
    })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g21', userId: 'u4' } })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g21', userId: 'u6' } })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g21', userId: 'u4', roleInGroup: 'usual' },
    })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g21', userId: 'u6', roleInGroup: 'usual' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g22',
        name: 'Unsere kleine Burderei',
        about:
          'Tiere stärken Menschen – tiergestützte Persönlichkeitsentwicklung für Kinder und Erwachsene.',
        description: `<h3>Tiere stärken Menschen</h3><p>Die „kleine Burderei" verbindet Menschen mit Tieren, um persönliche Stärken zu entfalten. Im Zentrum stehen tiergestützte Angebote für Kinder, Jugendliche und Erwachsene in Bereichen wie Selbstvertrauen, Teamfähigkeit und emotionale Resilienz.</p><h3>Programm</h3><p>Einzel- und Gruppenangebote mit Eseln, Ziegen und anderen Hoftieren. Die Tiere spiegeln ohne Urteil – und helfen dabei, zu sich selbst zu finden.</p>`,
        groupType: 'public',
        actionRadius: 'regional',
        categoryIds: ['cat3', 'cat7'],
        locationName: 'Germany',
      },
    })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g22', userId: 'u4' } })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g22', userId: 'u4', roleInGroup: 'usual' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g23',
        name: 'Naturwahrnehmung & Gemeinschaftsbildung',
        about:
          'Ausbildung für naturverbundene Gärten und Landschaften durch sinnliche Wahrnehmung.',
        description: `<h3>Über die Initiative</h3><p>Dieses Angebot verbindet Naturwahrnehmung mit Gemeinschaftsbildung. In Ausbildungskursen lernen Teilnehmende, naturverbundene Gärten und Landschaften durch sinnliche Erfahrung zu gestalten und zu beleben.</p><h3>Inhalte</h3><p>Phänomenologisches Beobachten in der Natur, Pflanzenwahrnehmung, gemeinschaftliche Gestaltungsprozesse und die Verbindung von innerem Erleben und äußerer Landschaftsgestaltung.</p>`,
        groupType: 'closed',
        actionRadius: 'national',
        categoryIds: ['cat12', 'cat3', 'cat1'],
        locationName: 'Germany',
      },
    })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g23', userId: 'u5' } })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g23', userId: 'u5', roleInGroup: 'usual' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g24',
        name: 'Konstitutionstherapie',
        about: 'Ganzheitliche Heilkunde mit Planetenmetallen: Akademie und Vortragsreihe.',
        description: `<h3>Was ist Konstitutionstherapie?</h3><p>Die Konstitutionstherapie verbindet traditionelles Heilwissen mit modernen ganzheitlichen Ansätzen. Im Mittelpunkt stehen die sieben Planetenmetalle der klassischen Alchemie und ihre Bedeutung für Körper, Seele und Geist.</p><h3>Akademie & Vorträge</h3><p>Regelmäßige Vortragsreihen und Ausbildungsangebote für Heilpraktikerinnen, Therapeuten und Interessierte. Ziel ist die Erneuerung einer umfassenden Heilkultur.</p>`,
        groupType: 'public',
        actionRadius: 'national',
        categoryIds: ['cat14', 'cat16'],
        locationName: 'Germany',
      },
    })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g24', userId: 'u4' } })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g24', userId: 'u4', roleInGroup: 'usual' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g25',
        name: 'Aufgabe Führung',
        about: 'Führungskräfteentwicklung mit Selbstführung als Grundlage wirksamer Organisation.',
        description: `<h3>Die Initiative</h3><p>„Aufgabe Führung" ist ein Ausbildungs- und Beratungsangebot für Menschen in Führungspositionen. Kernthese: Wirksame Führung beginnt mit der Fähigkeit zur Selbstführung.</p><h3>Inhalte</h3><p>Workshops und Coachings zu Selbstwahrnehmung, Kommunikation, Entscheidungskultur und der Frage, was Führung in einer sich wandelnden Welt bedeutet. Der Ansatz verbindet systemisches Denken mit persönlicher Reifung.</p>`,
        groupType: 'closed',
        actionRadius: 'national',
        categoryIds: ['cat3', 'cat0'],
        locationName: 'Germany',
      },
    })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g25', userId: 'u1' } })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g25', userId: 'u5' } })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g25', userId: 'u1', roleInGroup: 'usual' },
    })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g25', userId: 'u5', roleInGroup: 'usual' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g26',
        name: 'Berge versetzen',
        about:
          'Coaching zur Potenzialentfaltung: begrenzende Glaubenssätze erkennen und transformieren.',
        description: `<h3>Über das Angebot</h3><p>„Berge versetzen" ist ein Coaching-Angebot, das persönliche Ressourcen erkundet und begrenzende Überzeugungen durch stärkende Haltungen ersetzt. Der Name ist Programm: Was unmöglich scheint, wird mit dem richtigen Werkzeug möglich.</p><h3>Methoden</h3><p>Systemisches Coaching, lösungsorientierte Gesprächsführung und Körperwahrnehmung helfen dabei, eingefahrene Muster zu erkennen und neue Wege zu gehen.</p>`,
        groupType: 'public',
        actionRadius: 'regional',
        categoryIds: ['cat3', 'cat16'],
        locationName: 'Germany',
      },
    })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g26', userId: 'u6' } })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g26', userId: 'u6', roleInGroup: 'usual' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g27',
        name: 'Naturerlebnis Zingst',
        about:
          'Außerschulischer Lernort mit Aktivem Artenschutz, regionalem Honig und Bienenlehrpfad in Zingst.',
        description: `<h3>Naturerlebnis in Zingst</h3><p>Auf der Halbinsel Zingst entstand ein außerschulischer Lernort, der Naturerlebnis mit aktivem Artenschutz verbindet. Herzstück ist ein Bienenlehrpfad, der Besucher aller Altersgruppen für die Bedeutung der Biene im Ökosystem sensibilisiert.</p><h3>Produkte & Aktivitäten</h3><p>Regionaler Honig aus artgerechter Bienenhaltung, Schulklassenbesuche, Familienführungen und Workshops zu Imkerei und Artenvielfalt.</p>`,
        groupType: 'public',
        actionRadius: 'regional',
        categoryIds: ['cat12', 'cat7'],
        locationName: 'Zingst, Germany',
      },
    })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g27', userId: 'u4' } })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g27', userId: 'u4', roleInGroup: 'usual' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g28',
        name: 'Eisenfeustel – Handwerk & Versorgung',
        about:
          'Qualitäts-Handwerkserzeugnisse für Bestellgruppen und Wanderjahr-Teilnehmende aus Dresden.',
        description: `<h3>Eisenfeustel aus Dresden</h3><p>Eisenfeustel beliefert Bestellgruppen und Wanderjahr-Teilnehmende mit hochwertigen Handwerkserzeugnissen. Der Name steht für Handwerksqualität, Verlässlichkeit und eine Verbindung zur handwerklichen Tradition Sachsens.</p><h3>Sortiment</h3><p>Selbst hergestellte Produkte aus Holz, Metall und anderen Naturmaterialien sowie Vermittlung zu regionalen Handwerksbetrieben im Netzwerk.</p>`,
        groupType: 'public',
        actionRadius: 'regional',
        categoryIds: ['cat9', 'cat18'],
        locationName: 'Dresden, Germany',
      },
    })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g28', userId: 'u5' } })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g28', userId: 'u5', roleInGroup: 'usual' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g29',
        name: 'Landladen Rullstorf',
        about:
          'Regionaler Hofladen mit saisonalen Bio-Produkten: regional – ökologisch – nachhaltig.',
        description: `<h3>Der Landladen in Rullstorf</h3><p>Der Landladen Rullstorf steht für das Motto „regional – ökologisch – nachhaltig". Saisonale Produkte aus der Region werden direkt vermarktet und kurze Lieferketten bewusst gefördert.</p><h3>Sortiment</h3><p>Gemüse, Obst, Molkereiprodukte und Eingemachtes von lokalen Höfen. Regelmäßige Hofmarkttage und Möglichkeiten zur Mitgliedschaft in einer Solidarischen Landwirtschaft.</p>`,
        groupType: 'public',
        actionRadius: 'regional',
        categoryIds: ['cat12', 'cat9'],
        locationName: 'Rullstorf, Germany',
      },
    })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g29', userId: 'u6' } })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g29', userId: 'u6', roleInGroup: 'usual' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g30',
        name: 'Hofgemeinschaft Seelenschatz',
        about: 'Gemeinschaftshof nach Naturprinzipien mit intergenerationeller Nachhaltigkeit.',
        description: `<h3>Die Hofgemeinschaft</h3><p>Der Seelenschatz ist eine Hofgemeinschaft, die nach natürlichen Prinzipien und intergenerationeller Nachhaltigkeit gestaltet ist. Menschen unterschiedlicher Generationen leben und wirtschaften hier gemeinsam.</p><h3>Leben auf dem Hof</h3><p>Gemüseanbau, Tierhaltung, gemeinsames Kochen und Feiern. Besondere Bedeutung haben Feste im Jahreskreis und das Bewusstsein für die Verbundenheit von Mensch, Tier und Erde.</p>`,
        groupType: 'public',
        actionRadius: 'regional',
        categoryIds: ['cat1', 'cat12', 'cat16'],
        locationName: 'Germany',
      },
    })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g30', userId: 'u4' } })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g30', userId: 'u6' } })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g30', userId: 'u4', roleInGroup: 'usual' },
    })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g30', userId: 'u6', roleInGroup: 'usual' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g31',
        name: 'AllmendeLand rettet Bauernhöfe',
        about:
          'Gemeinschaftliche Sicherung wertvoller Landflächen für biologische Bewirtschaftung.',
        description: `<h3>Was ist AllmendeLand?</h3><p>AllmendeLand sichert gemeinschaftlich wertvolle landwirtschaftliche Flächen für biologische Bewirtschaftung – als moderne Form des Allmendeprinzips. Höfe, die aufgegeben werden müssten, werden durch kollektives Engagement dauerhaft gerettet.</p><h3>Funktionsweise</h3><p>Interessierte beteiligen sich finanziell und erhalten dafür Rechte zur Nutzung oder Mitentscheidung. Die Flächen bleiben dauerhaft ökologisch bewirtschaftet und dem Spekulationsmarkt entzogen.</p>`,
        groupType: 'public',
        actionRadius: 'national',
        categoryIds: ['cat12', 'cat9', 'cat11'],
        locationName: 'Germany',
      },
    })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g31', userId: 'u1' } })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g31', userId: 'u4' } })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g31', userId: 'u1', roleInGroup: 'usual' },
    })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g31', userId: 'u4', roleInGroup: 'usual' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g32',
        name: 'Wanderjahr – Innovationsprojekt',
        about:
          'Ein Projekt von Menschen für Menschen: Innovationsjahr für junge Menschen zwischen Schule und Beruf.',
        description: `<h3>Das Wanderjahr</h3><p>Das Wanderjahr ist ein Innovationsprojekt, das jungen Menschen nach der Schule ermöglicht, sich in Praxisprojekten, Gemeinschaften und Initiativen zu erproben – bevor sie den klassischen Ausbildungs- oder Studienweg einschlagen.</p><h3>Ziele</h3><p>Selbstwirksamkeit erfahren, Netzwerke aufbauen und die eigene Berufung erkunden. Das Wanderjahr verbindet praktische Arbeit mit persönlicher Entwicklung und gemeinschaftlichem Erleben.</p>`,
        groupType: 'closed',
        actionRadius: 'national',
        categoryIds: ['cat7', 'cat3', 'cat17'],
        locationName: 'Germany',
      },
    })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g32', userId: 'u4' } })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g32', userId: 'u5' } })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g32', userId: 'u4', roleInGroup: 'usual' },
    })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g32', userId: 'u5', roleInGroup: 'usual' },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g33',
        name: 'Unterstützung von Hebammen',
        about:
          'Liebevolle und professionelle Begleitung rund um Schwangerschaft, Geburt und Wochenbett.',
        description: `<h3>Worum geht es?</h3><p>Diese Initiative setzt sich für eine umfassende Unterstützung von Hebammen und für eine menschliche Geburtskultur ein. Ziel ist eine „liebevolle und professionelle Begleitung – nicht nur während der Geburt", sondern entlang des gesamten Weges rund um Schwangerschaft und Wochenbett.</p><h3>Aktivitäten</h3><p>Vernetzung von Hebammen, Beratungsangebote für werdende Eltern, Aufklärung über Geburtsrechte und Advocacy für bessere Rahmenbedingungen im Hebammenwesen.</p>`,
        groupType: 'public',
        actionRadius: 'national',
        categoryIds: ['cat14', 'cat7'],
        locationName: 'Germany',
      },
    })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g33', userId: 'u4' } })
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g33', userId: 'u6' } })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g33', userId: 'u4', roleInGroup: 'usual' },
    })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'g33', userId: 'u6', roleInGroup: 'usual' },
    })

    // eslint-disable-next-line no-console
    console.log('seed', 'group avatars')
    for (const { groupId, url, alt, aspectRatio } of [
      {
        groupId: 'g3',
        url: 'http://nsosp.org/share/images/FrQFT/FrQFT_header_v01_3.jpg',
        alt: 'Quantum Flow Theory',
        aspectRatio: 1.78,
      },
      {
        groupId: 'g4',
        url: 'http://nsosp.org/share/images/NSOSP/NSOSP_header_v01_9.jpg',
        alt: 'New Soul Of Science Project',
        aspectRatio: 1.78,
      },
      {
        groupId: 'g5',
        url: 'https://nsosp.org/share/images/SN/SN_header_v04-01.jpg',
        alt: 'Superial Numbers',
        aspectRatio: 1.0,
      },
      {
        groupId: 'g6',
        url: 'https://menschlichwirtschaften.de/wp-content/uploads/gradido_coin.png',
        alt: 'Gradido Coin',
        aspectRatio: 1.0,
      },
      {
        groupId: 'g7',
        url: 'https://menschlichwirtschaften.de/wp-content/uploads/Mikrobiom-Biozyklische-Humuserde-gesund.jpg',
        alt: 'Gesundheit im Boden',
        aspectRatio: 1.5,
      },
      {
        groupId: 'g8',
        url: 'https://menschlichwirtschaften.de/wp-content/uploads/pixabay-arttower-ancient-cropped-2000x500-1.jpg',
        alt: 'Minuto Komplementärwährung',
        aspectRatio: 4.0,
      },
      {
        groupId: 'g9',
        url: 'https://menschlichwirtschaften.de/wp-content/uploads/IT4C-Website-Bild-ohne-Text.webp',
        alt: 'IT4C Team',
        aspectRatio: 1.5,
      },
      {
        groupId: 'g10',
        url: 'https://menschlichwirtschaften.de/wp-content/uploads/Logo_Linux_Werkstatt.jpg',
        alt: 'Linux Werkstatt Logo',
        aspectRatio: 1.0,
      },
      {
        groupId: 'g11',
        url: 'https://menschlichwirtschaften.de/wp-content/uploads/TerraNova-Rittergut.jpg',
        alt: 'Terra Nova Rittergut',
        aspectRatio: 1.5,
      },
      {
        groupId: 'g12',
        url: 'https://menschlichwirtschaften.de/wp-content/uploads/Lehren-2_0-fortbildung-modular.jpg',
        alt: 'Lehren 2.0 Fortbildung',
        aspectRatio: 1.5,
      },
      {
        groupId: 'g13',
        url: 'https://menschlichwirtschaften.de/wp-content/uploads/Gruppenfoto-e1738164285204.jpg',
        alt: 'Montessori Nordzypern Gruppe',
        aspectRatio: 1.33,
      },
      {
        groupId: 'g14',
        url: 'https://menschlichwirtschaften.de/wp-content/uploads/Kersten-Pfaff-header-chateau-neu1.jpg',
        alt: 'Lebenswege Potenzialentfaltung',
        aspectRatio: 1.78,
      },
      {
        groupId: 'g15',
        url: 'https://menschlichwirtschaften.de/wp-content/uploads/82tpeld0_e4-e1741358592420.jpg',
        alt: 'Treffpunkt Genossenschaft',
        aspectRatio: 1.5,
      },
      {
        groupId: 'g16',
        url: 'https://menschlichwirtschaften.de/wp-content/uploads/packsatt-Grafik-Menschlich-Wirtschaften.jpg',
        alt: 'pack&satt Einpott',
        aspectRatio: 1.5,
      },
      {
        groupId: 'g17',
        url: 'https://menschlichwirtschaften.de/wp-content/uploads/ocelot.social-Logo-Text-normal-v02-945x630-2.webp',
        alt: 'Ocelot.Social Logo',
        aspectRatio: 1.5,
      },
      {
        groupId: 'g18',
        url: 'https://menschlichwirtschaften.de/wp-content/uploads/Peter-Schmuck-Initiative.jpg',
        alt: 'Die Regionalgesellschaft',
        aspectRatio: 1.5,
      },
      {
        groupId: 'g19',
        url: 'https://menschlichwirtschaften.de/wp-content/uploads/Gefluegelhof-Schubert-Bild3.jpg',
        alt: 'Geflügelhof Schubert',
        aspectRatio: 1.5,
      },
      {
        groupId: 'g20',
        url: 'https://menschlichwirtschaften.de/wp-content/uploads/Logo_MWM_Star_4C_Schutzraum.jpg',
        alt: 'Menschliche Werte Medien Logo',
        aspectRatio: 1.0,
      },
      {
        groupId: 'g21',
        url: 'https://menschlichwirtschaften.de/wp-content/uploads/isgbjkz9erg-e1741360891578.jpg',
        alt: 'Natürlich gesund!',
        aspectRatio: 1.5,
      },
      {
        groupId: 'g22',
        url: 'https://menschlichwirtschaften.de/wp-content/uploads/Andrea-Hauser-Home-Page-e1740239845438.jpg',
        alt: 'Unsere kleine Burderei',
        aspectRatio: 1.5,
      },
      {
        groupId: 'g23',
        url: 'https://menschlichwirtschaften.de/wp-content/uploads/Sonja_Schuerger_IMG_Abb_11_2.jpg',
        alt: 'Naturwahrnehmung und Gemeinschaftsbildung',
        aspectRatio: 1.33,
      },
      {
        groupId: 'g24',
        url: 'https://menschlichwirtschaften.de/wp-content/uploads/Hermesstab-schwarzweisseFluegel-v01-clip-3-2.jpg',
        alt: 'Konstitutionstherapie Hermesstab',
        aspectRatio: 1.0,
      },
      {
        groupId: 'g27',
        url: 'https://menschlichwirtschaften.de/wp-content/uploads/Natur-und-Imkerhof-Zingst.jpg',
        alt: 'Naturerlebnis Zingst Imkerhof',
        aspectRatio: 1.5,
      },
      {
        groupId: 'g28',
        url: 'https://menschlichwirtschaften.de/wp-content/uploads/ef_logo_primary-1.png',
        alt: 'Eisenfeustel Logo',
        aspectRatio: 1.0,
      },
      {
        groupId: 'g29',
        url: 'https://menschlichwirtschaften.de/wp-content/uploads/Landladen-Rullstorf.jpg',
        alt: 'Landladen Rullstorf',
        aspectRatio: 1.5,
      },
      {
        groupId: 'g30',
        url: 'https://menschlichwirtschaften.de/wp-content/uploads/Seelenschatz_ScheuneWohnhaus-1.jpg',
        alt: 'Hofgemeinschaft Seelenschatz Scheune',
        aspectRatio: 1.5,
      },
      {
        groupId: 'g31',
        url: 'https://menschlichwirtschaften.de/wp-content/uploads/AllmendeLand-Felder-Beispiel-2.jpg',
        alt: 'AllmendeLand Felder',
        aspectRatio: 1.5,
      },
      {
        groupId: 'g32',
        url: 'https://menschlichwirtschaften.de/wp-content/uploads/Foto-Jugend-scaled.jpg',
        alt: 'Wanderjahr Jugendliche',
        aspectRatio: 1.33,
      },
      {
        groupId: 'g33',
        url: 'https://menschlichwirtschaften.de/wp-content/uploads/pregnant-6189040_640.jpg',
        alt: 'Unterstützung von Hebammen',
        aspectRatio: 1.0,
      },
    ]) {
      await database.write({
        query: `
          MATCH (group:Group {id: $groupId})
          MERGE (img:Image {url: $url})
          SET img.alt = $alt, img.aspectRatio = $aspectRatio, img.type = 'image/jpeg'
          MERGE (group)-[:AVATAR_IMAGE]->(img)
        `,
        variables: { groupId, url, alt, aspectRatio },
      })
    }

    authenticatedUser = await louie.toJson()
    await mutate({
      mutation: CreatePost,
      variables: {
        id: 'p0-g2',
        groupId: 'g2',
        title: `I am a Noob`,
        content: 'I am new to Yoga and did not join this group so far.',
        categoryIds: ['cat4'],
      },
    })

    // eslint-disable-next-line no-console
    console.log('seed', 'events')
    authenticatedUser = await peterLustig.toJson()
    const now = new Date()

    await mutate({
      mutation: CreatePost,
      variables: {
        id: 'e0',
        title: 'Illegaler Kindergeburtstag',
        content: 'Elli hat nächste Woche Geburtstag. Wir feiern das!',
        categoryIds: ['cat4'],
        postType: 'Event',
        eventInput: {
          eventStart: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString(),
          eventVenue: 'Ellis Kinderzimmer',
          eventLocationName: 'Deutschland',
        },
      },
    })
    await mutate({
      mutation: CreatePost,
      variables: {
        id: 'e1',
        title: 'Wir Schützen den Stuttgarter Schlossgarten',
        content: 'Kein Baum wird gefällt werden!',
        categoryIds: ['cat5'],
        postType: 'Event',
        eventInput: {
          eventStart: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString(),
          eventVenue: 'Schlossgarten',
          eventLocationName: 'Stuttgart',
        },
      },
    })
    await mutate({
      mutation: CreatePost,
      variables: {
        id: 'e2',
        title: 'IT 4 Change Treffen',
        content: 'Wir sitzen eine Woche zusammen rum und glotzen uns blöde an.',
        categoryIds: ['cat5'],
        postType: 'Event',
        eventInput: {
          eventStart: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString(),
          eventEnd: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 4).toISOString(),
          eventVenue: 'Ferienlager',
          eventLocationName: 'Bahra, Sachsen',
        },
      },
    })

    // find() returns null for an unknown key now, where neode threw. The seed knows these
    // nodes exist — it just created them — so a non-null assertion would be honest, but the
    // explicit throw says which one is missing if the seed above ever changes.
    let passedEvent = requireNode(await neode.find('Post', 'e1'), 'Post e1')
    await passedEvent.update({ eventStart: new Date(2010, 8, 30, 10).toISOString() })
    passedEvent = requireNode(await neode.find('Post', 'e2'), 'Post e2')
    await passedEvent.update({
      eventStart: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3).toISOString(),
    })

    // eslint-disable-next-line no-console
    console.log('seed', 'posts')
    const p0 = await Factory.build(
      'post',
      {
        id: 'p0',
        language: sample(languages),
      },
      {
        categoryIds: ['cat16'],
        author: peterLustig,
        image: Factory.build('image', {
          width: 300,
          height: 169,
          sensitive: true,
        }),
      },
    )
    const p1 = await Factory.build(
      'post',
      {
        id: 'p1',
        language: sample(languages),
      },
      {
        categoryIds: ['cat1'],
        author: bobDerBaumeister,
        image: Factory.build('image', {
          width: 300,
          height: 1500,
        }),
      },
    )
    const p3 = await Factory.build(
      'post',
      {
        id: 'p3',
        language: sample(languages),
      },
      {
        categoryIds: ['cat3'],
        author: huey,
      },
    )
    const p4 = await Factory.build(
      'post',
      {
        id: 'p4',
        language: sample(languages),
      },
      {
        categoryIds: ['cat4'],
        author: dewey,
      },
    )
    const p5 = await Factory.build(
      'post',
      {
        id: 'p5',
        language: sample(languages),
      },
      {
        categoryIds: ['cat5'],
        author: louie,
      },
    )
    const p6 = await Factory.build(
      'post',
      {
        id: 'p6',
        language: sample(languages),
      },
      {
        categoryIds: ['cat6'],
        author: peterLustig,
        image: Factory.build('image', {
          width: 300,
          height: 857,
        }),
      },
    )
    const p9 = await Factory.build(
      'post',
      {
        id: 'p9',
        language: sample(languages),
      },
      {
        categoryIds: ['cat9'],
        author: huey,
      },
    )
    const p10 = await Factory.build(
      'post',
      {
        id: 'p10',
      },
      {
        categoryIds: ['cat10'],
        author: dewey,
        image: Factory.build('image', {
          sensitive: true,
        }),
      },
    )
    const p11 = await Factory.build(
      'post',
      {
        id: 'p11',
        language: sample(languages),
      },
      {
        categoryIds: ['cat11'],
        author: louie,
        image: Factory.build('image', {
          width: 300,
          height: 901,
        }),
      },
    )
    const p13 = await Factory.build(
      'post',
      {
        id: 'p13',
        language: sample(languages),
      },
      {
        categoryIds: ['cat13'],
        author: bobDerBaumeister,
      },
    )
    const p14 = await Factory.build(
      'post',
      {
        id: 'p14',
        language: sample(languages),
      },
      {
        categoryIds: ['cat14'],
        author: jennyRostock,
        image: Factory.build('image', {
          width: 300,
          height: 200,
        }),
      },
    )
    const p15 = await Factory.build(
      'post',
      {
        id: 'p15',
        language: sample(languages),
      },
      {
        categoryIds: ['cat15'],
        author: huey,
      },
    )

    // eslint-disable-next-line no-console
    console.log('seed', 'api-keys')

    // API Keys for Peter (admin) — active keys
    await database.write({
      query: `MATCH (u:User { id: 'u1' })
              CREATE (u)-[:HAS_API_KEY]->(k:ApiKey {
                id: 'ak-peter-ci', name: 'CI Bot', keyPrefix: 'oak_peterCI',
                keyHash: 'seed-hash-peter-ci', createdAt: toString(datetime() - duration('P30D')),
                lastUsedAt: toString(datetime() - duration('PT2H')), disabled: false
              })`,
      variables: {},
    })
    await database.write({
      query: `MATCH (u:User { id: 'u1' })
              CREATE (u)-[:HAS_API_KEY]->(k:ApiKey {
                id: 'ak-peter-backup', name: 'Backup Script', keyPrefix: 'oak_peterBU',
                keyHash: 'seed-hash-peter-backup', createdAt: toString(datetime() - duration('P14D')),
                lastUsedAt: toString(datetime() - duration('P3D')), disabled: false
              })`,
      variables: {},
    })
    // Peter's revoked key
    await database.write({
      query: `MATCH (u:User { id: 'u1' })
              CREATE (u)-[:HAS_API_KEY]->(k:ApiKey {
                id: 'ak-peter-old', name: 'Old Script', keyPrefix: 'oak_peterOL',
                keyHash: 'seed-hash-peter-old', createdAt: '2025-01-01T00:00:00.000Z',
                lastUsedAt: '2025-05-15T00:00:00.000Z',
                disabled: true, disabledAt: '2025-06-01T00:00:00.000Z'
              })`,
      variables: {},
    })

    // API Key for Jenny (user) — active, with expiry
    await database.write({
      query: `MATCH (u:User { id: 'u3' })
              CREATE (u)-[:HAS_API_KEY]->(k:ApiKey {
                id: 'ak-jenny-bot', name: 'Weather Bot', keyPrefix: 'oak_jennyWB',
                keyHash: 'seed-hash-jenny-bot', createdAt: toString(datetime() - duration('P7D')),
                lastUsedAt: toString(datetime() - duration('PT30M')), disabled: false,
                expiresAt: toString(datetime() + duration('P365D'))
              })`,
      variables: {},
    })

    // API Key for Huey (user) — active, all his posts created via this key
    await database.write({
      query: `MATCH (u:User { id: 'u4' })
              CREATE (u)-[:HAS_API_KEY]->(k:ApiKey {
                id: 'ak-huey-auto', name: 'Auto Publisher', keyPrefix: 'oak_hueyAUT',
                keyHash: 'seed-hash-huey-auto', createdAt: toString(datetime() - duration('P60D')),
                lastUsedAt: toString(datetime() - duration('PT5M')), disabled: false
              })`,
      variables: {},
    })

    // API Key for Bob (moderator) — active
    await database.write({
      query: `MATCH (u:User { id: 'u2' })
              CREATE (u)-[:HAS_API_KEY]->(k:ApiKey {
                id: 'ak-bob-monitor', name: 'Monitoring', keyPrefix: 'oak_bobMON',
                keyHash: 'seed-hash-bob-monitor', createdAt: toString(datetime()),
                disabled: false
              })`,
      variables: {},
    })

    // Create some posts via API key (Peter's CI Bot)
    authenticatedUser = { ...(await peterLustig.toJson()), apiKeyId: 'ak-peter-ci' }
    await mutate({
      mutation: CreatePost,
      variables: {
        id: 'p-api-1',
        title: 'Automated Daily Report',
        content: 'This post was created automatically via API key by the CI Bot.',
        categoryIds: ['cat16'],
      },
    })
    await mutate({
      mutation: CreatePost,
      variables: {
        id: 'p-api-2',
        title: 'Weekly Statistics Summary',
        content: 'Automated weekly summary of community statistics.',
        categoryIds: ['cat9'],
      },
    })

    // Jenny's Weather Bot creates a post
    authenticatedUser = { ...(await jennyRostock.toJson()), apiKeyId: 'ak-jenny-bot' }
    await mutate({
      mutation: CreatePost,
      variables: {
        id: 'p-api-3',
        title: 'Weather Report Paris',
        content: 'Sunny, 22°C. Perfect day for a walk along the Seine.',
        categoryIds: ['cat4'],
      },
    })
    // Jenny's bot also comments
    await mutate({
      mutation: CreateComment,
      variables: {
        id: 'c-api-1',
        postId: 'p-api-1',
        content: 'Automated cross-reference: See also the weather report.',
      },
    })

    authenticatedUser = null

    // eslint-disable-next-line no-console
    console.log('seed', 'invitecodes')

    // Peter invited the core users: Jenny, Bob, Huey
    await Factory.build(
      'inviteCode',
      { code: 'PETER1', comment: 'For Jenny' },
      { generatedBy: peterLustig },
    )
    await Factory.build(
      'inviteCode',
      { code: 'PETER2', comment: 'For Bob' },
      { generatedBy: peterLustig },
    )
    await Factory.build(
      'inviteCode',
      { code: 'PETER3', comment: 'For Huey' },
      { generatedBy: peterLustig },
    )

    // Jenny invited Dewey, Louie, Dagobert
    await Factory.build(
      'inviteCode',
      { code: 'JENNY1', comment: 'For Dewey' },
      { generatedBy: jennyRostock },
    )
    await Factory.build(
      'inviteCode',
      { code: 'JENNY2', comment: 'For Louie' },
      { generatedBy: jennyRostock },
    )
    await Factory.build(
      'inviteCode',
      { code: 'JENNY3', comment: 'For Dagobert' },
      { generatedBy: jennyRostock },
    )
    // Jenny's shared code (used by additional users)
    await Factory.build(
      'inviteCode',
      { code: 'ABCDEF', comment: 'Share link' },
      { generatedBy: jennyRostock },
    )
    // Jenny's unused code (still active)
    await Factory.build('inviteCode', { code: 'JNEW01' }, { generatedBy: jennyRostock })
    // Jenny's invalidated code (was used once, then deactivated)
    await Factory.build(
      'inviteCode',
      { code: 'JENNY0', comment: 'Old link', expiresAt: new Date().toISOString() },
      { generatedBy: jennyRostock },
    )
    // Jenny total: JENNY1, JENNY2, JENNY3, ABCDEF, JNEW01 (5 active) + JENNY0 (1 expired) = 6 codes

    // Create REDEEMED and INVITED relationships via Cypher
    const inviteSession = database.driver.session()
    try {
      await inviteSession.writeTransaction((txc) =>
        txc.run(`
          // Peter's invitations
          MATCH (jenny:User {id: 'u3'}), (code1:InviteCode {code: 'PETER1'}), (peter:User {id: 'u1'})
          MERGE (jenny)-[:REDEEMED {createdAt: toString(datetime())}]->(code1)
          MERGE (peter)-[:INVITED {createdAt: toString(datetime())}]->(jenny)
          MERGE (jenny)-[:FOLLOWS {createdAt: toString(datetime())}]->(peter)
          MERGE (peter)-[:FOLLOWS {createdAt: toString(datetime())}]->(jenny)
          WITH 1 AS dummy
          MATCH (bob:User {id: 'u2'}), (code2:InviteCode {code: 'PETER2'}), (peter:User {id: 'u1'})
          MERGE (bob)-[:REDEEMED {createdAt: toString(datetime())}]->(code2)
          MERGE (peter)-[:INVITED {createdAt: toString(datetime())}]->(bob)
          MERGE (bob)-[:FOLLOWS {createdAt: toString(datetime())}]->(peter)
          MERGE (peter)-[:FOLLOWS {createdAt: toString(datetime())}]->(bob)
          WITH 1 AS dummy
          MATCH (huey:User {id: 'u4'}), (code3:InviteCode {code: 'PETER3'}), (peter:User {id: 'u1'})
          MERGE (huey)-[:REDEEMED {createdAt: toString(datetime())}]->(code3)
          MERGE (peter)-[:INVITED {createdAt: toString(datetime())}]->(huey)
          MERGE (huey)-[:FOLLOWS {createdAt: toString(datetime())}]->(peter)
          MERGE (peter)-[:FOLLOWS {createdAt: toString(datetime())}]->(huey)
          WITH 1 AS dummy
          // Jenny's invitations
          MATCH (dewey:User {id: 'u5'}), (code4:InviteCode {code: 'JENNY1'}), (jenny:User {id: 'u3'})
          MERGE (dewey)-[:REDEEMED {createdAt: toString(datetime())}]->(code4)
          MERGE (jenny)-[:INVITED {createdAt: toString(datetime())}]->(dewey)
          MERGE (dewey)-[:FOLLOWS {createdAt: toString(datetime())}]->(jenny)
          MERGE (jenny)-[:FOLLOWS {createdAt: toString(datetime())}]->(dewey)
          WITH 1 AS dummy
          MATCH (louie:User {id: 'u6'}), (code5:InviteCode {code: 'JENNY2'}), (jenny:User {id: 'u3'})
          MERGE (louie)-[:REDEEMED {createdAt: toString(datetime())}]->(code5)
          MERGE (jenny)-[:INVITED {createdAt: toString(datetime())}]->(louie)
          MERGE (louie)-[:FOLLOWS {createdAt: toString(datetime())}]->(jenny)
          MERGE (jenny)-[:FOLLOWS {createdAt: toString(datetime())}]->(louie)
          WITH 1 AS dummy
          MATCH (dagobert:User {id: 'u7'}), (code6:InviteCode {code: 'JENNY3'}), (jenny:User {id: 'u3'})
          MERGE (dagobert)-[:REDEEMED {createdAt: toString(datetime())}]->(code6)
          MERGE (jenny)-[:INVITED {createdAt: toString(datetime())}]->(dagobert)
          MERGE (dagobert)-[:FOLLOWS {createdAt: toString(datetime())}]->(jenny)
          MERGE (jenny)-[:FOLLOWS {createdAt: toString(datetime())}]->(dagobert)
        `),
      )
    } finally {
      await inviteSession.close()
    }

    authenticatedUser = await louie.toJson()
    const mention1 =
      'Hey <a class="mention" data-mention-id="u3" href="/profile/u3">@jenny-rostock</a>, what\'s up?'
    const mention2 =
      'Hey <a class="mention" data-mention-id="u3" href="/profile/u3">@jenny-rostock</a>, here is another notification for you!'
    const hashtag1 =
      'See <a class="hashtag" data-hashtag-id="NaturphilosophieYoga" href="/?hashtag=NaturphilosophieYoga">#NaturphilosophieYoga</a>, it can really help you!'
    const hashtagAndMention1 =
      'The new physics of <a class="hashtag" data-hashtag-id="QuantenFlussTheorie" href="/?hashtag=QuantenFlussTheorie">#QuantenFlussTheorie</a> can explain <a class="hashtag" data-hashtag-id="QuantumGravity" href="/?hashtag=QuantumGravity">#QuantumGravity</a>! <a class="mention" data-mention-id="u1" href="/profile/u1">@peter-lustig</a> got that already. ;-)'

    await mutate({
      mutation: CreatePost,
      variables: {
        id: 'p2',
        title: `Nature Philosophy Yoga`,
        content: hashtag1,
        categoryIds: ['cat2'],
      },
    })
    await mutate({
      mutation: CreatePost,
      variables: {
        id: 'p7',
        title: 'This is post #7',
        content: `${mention1} ${faker.lorem.paragraph()}`,
        categoryIds: ['cat7'],
      },
    })
    await mutate({
      mutation: CreatePost,
      variables: {
        id: 'p8',
        title: `Quantum Flow Theory explains Quantum Gravity`,
        content: hashtagAndMention1,
        categoryIds: ['cat8'],
      },
    })
    await mutate({
      mutation: CreatePost,
      variables: {
        id: 'p12',
        title: 'This is post #12',
        content: `${mention2} ${faker.lorem.paragraph()}`,
        categoryIds: ['cat12'],
      },
    })

    const p2 = requireNode(await neode.find('Post', 'p2'), 'Post p2')
    const p7 = await neode.find('Post', 'p7')
    const p8 = await neode.find('Post', 'p8')
    const p12 = await neode.find('Post', 'p12')

    authenticatedUser = null

    // eslint-disable-next-line no-console
    console.log('seed', 'comments')
    authenticatedUser = await dewey.toJson()
    const mentionInComment1 =
      'I heard <a class="mention" data-mention-id="u3" href="/profile/u3">@jenny-rostock</a> has practiced it for 3 years now.'
    const mentionInComment2 =
      'Did <a class="mention" data-mention-id="u1" href="/profile/u1">@peter-lustig</a> tell you?'
    await mutate({
      mutation: CreateComment,
      variables: {
        id: 'c4',
        postId: 'p2',
        content: mentionInComment1,
      },
    })
    await mutate({
      mutation: CreateComment,
      variables: {
        id: 'c4-1',
        postId: 'p2',
        content: mentionInComment2,
      },
    })
    await mutate({
      mutation: CreateComment,
      variables: {
        postId: 'p14',
        content: faker.lorem.paragraph(),
      },
    }) // should send a notification

    authenticatedUser = null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comments: any[] = []
    comments.push(
      await Factory.build(
        'comment',
        {
          id: 'c1',
        },
        {
          author: jennyRostock,
          postId: 'p1',
        },
      ),
      await Factory.build(
        'comment',
        {
          id: 'c2',
        },
        {
          author: huey,
          postId: 'p1',
        },
      ),
      await Factory.build(
        'comment',
        {
          id: 'c3',
        },
        {
          author: louie,
          postId: 'p3',
        },
      ),
      await Factory.build(
        'comment',
        {
          id: 'c5',
        },
        {
          author: jennyRostock,
          postId: 'p3',
        },
      ),
      await Factory.build(
        'comment',
        {
          id: 'c6',
        },
        {
          author: peterLustig,
          postId: 'p4',
        },
      ),
      await Factory.build(
        'comment',
        {
          id: 'c7',
        },
        {
          author: jennyRostock,
          postId: 'p2',
        },
      ),
      await Factory.build(
        'comment',
        {
          id: 'c8',
        },
        {
          author: huey,
          postId: 'p15',
        },
      ),
      await Factory.build(
        'comment',
        {
          id: 'c9',
        },
        {
          author: dewey,
          postId: 'p15',
        },
      ),
      await Factory.build(
        'comment',
        {
          id: 'c10',
        },
        {
          author: louie,
          postId: 'p15',
        },
      ),
      await Factory.build(
        'comment',
        {
          id: 'c11',
        },
        {
          author: jennyRostock,
          postId: 'p15',
        },
      ),
      await Factory.build(
        'comment',
        {
          id: 'c12',
        },
        {
          author: jennyRostock,
          postId: 'p15',
        },
      ),
    )

    const trollingComment = comments[0]

    await democracy.relateTo(p3, 'post')
    await democracy.relateTo(p11, 'post')
    await democracy.relateTo(p15, 'post')
    await democracy.relateTo(p7, 'post')
    await environment.relateTo(p1, 'post')
    await environment.relateTo(p5, 'post')
    await environment.relateTo(p9, 'post')
    await environment.relateTo(p13, 'post')
    await freedom.relateTo(p0, 'post')
    await freedom.relateTo(p4, 'post')
    await freedom.relateTo(p8, 'post')
    await freedom.relateTo(p12, 'post')
    await nature.relateTo(p2, 'post')
    await nature.relateTo(p6, 'post')
    await nature.relateTo(p10, 'post')
    await nature.relateTo(p14, 'post')
    await peterLustig.relateTo(p15, 'emoted', { emotion: 'surprised' })
    await bobDerBaumeister.relateTo(p15, 'emoted', { emotion: 'surprised' })
    await jennyRostock.relateTo(p15, 'emoted', { emotion: 'surprised' })
    await huey.relateTo(p15, 'emoted', { emotion: 'surprised' })
    await dewey.relateTo(p15, 'emoted', { emotion: 'surprised' })
    await louie.relateTo(p15, 'emoted', { emotion: 'surprised' })
    await dagobert.relateTo(p15, 'emoted', { emotion: 'surprised' })
    await bobDerBaumeister.relateTo(p14, 'emoted', { emotion: 'cry' })
    await jennyRostock.relateTo(p13, 'emoted', { emotion: 'angry' })
    await huey.relateTo(p12, 'emoted', { emotion: 'funny' })
    await dewey.relateTo(p11, 'emoted', { emotion: 'surprised' })
    await louie.relateTo(p10, 'emoted', { emotion: 'cry' })
    await dewey.relateTo(p9, 'emoted', { emotion: 'happy' })
    await huey.relateTo(p8, 'emoted', { emotion: 'angry' })
    await jennyRostock.relateTo(p7, 'emoted', { emotion: 'funny' })
    await bobDerBaumeister.relateTo(p6, 'emoted', { emotion: 'surprised' })
    await peterLustig.relateTo(p5, 'emoted', { emotion: 'cry' })
    await bobDerBaumeister.relateTo(p4, 'emoted', { emotion: 'happy' })
    await jennyRostock.relateTo(p3, 'emoted', { emotion: 'angry' })
    await huey.relateTo(p2, 'emoted', { emotion: 'funny' })
    await dewey.relateTo(p1, 'emoted', { emotion: 'surprised' })
    await louie.relateTo(p0, 'emoted', { emotion: 'cry' })

    await peterLustig.relateTo(p1, 'shouted')
    await peterLustig.relateTo(p6, 'shouted')
    await bobDerBaumeister.relateTo(p0, 'shouted')
    await bobDerBaumeister.relateTo(p6, 'shouted')
    await jennyRostock.relateTo(p6, 'shouted')
    await jennyRostock.relateTo(p7, 'shouted')
    await huey.relateTo(p8, 'shouted')
    await huey.relateTo(p9, 'shouted')
    await dewey.relateTo(p10, 'shouted')
    await peterLustig.relateTo(p2, 'shouted')
    await peterLustig.relateTo(p6, 'shouted')
    await bobDerBaumeister.relateTo(p0, 'shouted')
    await bobDerBaumeister.relateTo(p6, 'shouted')
    await jennyRostock.relateTo(p6, 'shouted')
    await jennyRostock.relateTo(p7, 'shouted')
    await huey.relateTo(p8, 'shouted')
    await huey.relateTo(p9, 'shouted')
    await louie.relateTo(p10, 'shouted')

    // eslint-disable-next-line no-console
    console.log('seed', 'reports')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reports: any[] = []
    reports.push(
      await Factory.build('report'),
      await Factory.build('report'),
      await Factory.build('report'),
      await Factory.build('report'),
    )
    const reportAgainstDagobert = reports[0]
    const reportAgainstTrollingPost = reports[1]
    const reportAgainstTrollingComment = reports[2]
    const reportAgainstDewey = reports[3]

    // report resource first time
    await reportAgainstDagobert.relateTo(jennyRostock, 'filed', {
      resourceId: 'u7',
      reasonCategory: 'discrimination_etc',
      reasonDescription: 'This user is harassing me with bigoted remarks!',
    })
    await reportAgainstDagobert.relateTo(dagobert, 'belongsTo')
    await reportAgainstTrollingPost.relateTo(jennyRostock, 'filed', {
      resourceId: 'p2',
      reasonCategory: 'doxing',
      reasonDescription: "This shouldn't be shown to anybody else! It's my private thing!",
    })
    await reportAgainstTrollingPost.relateTo(p2, 'belongsTo')
    await reportAgainstTrollingComment.relateTo(huey, 'filed', {
      resourceId: 'c1',
      reasonCategory: 'other',
      reasonDescription: 'This comment is bigoted',
    })
    await reportAgainstTrollingComment.relateTo(trollingComment, 'belongsTo')
    await reportAgainstDewey.relateTo(dagobert, 'filed', {
      resourceId: 'u5',
      reasonCategory: 'discrimination_etc',
      reasonDescription: 'This user is harassing me!',
    })
    await reportAgainstDewey.relateTo(dewey, 'belongsTo')

    // report resource a second time
    await reportAgainstDagobert.relateTo(louie, 'filed', {
      resourceId: 'u7',
      reasonCategory: 'discrimination_etc',
      reasonDescription: 'this user is attacking me for who I am!',
    })
    await reportAgainstDagobert.relateTo(dagobert, 'belongsTo')
    await reportAgainstTrollingPost.relateTo(peterLustig, 'filed', {
      resourceId: 'p2',
      reasonCategory: 'discrimination_etc',
      reasonDescription: 'This post is bigoted',
    })
    await reportAgainstTrollingPost.relateTo(p2, 'belongsTo')

    await reportAgainstTrollingComment.relateTo(bobDerBaumeister, 'filed', {
      resourceId: 'c1',
      reasonCategory: 'pornographic_content_links',
      reasonDescription: 'This comment is porno!!!',
    })
    await reportAgainstTrollingComment.relateTo(trollingComment, 'belongsTo')

    const disableVariables = {
      resourceId: 'undefined-resource',
      disable: true,
      closed: false,
    }

    // review resource first time
    await reportAgainstDagobert.relateTo(bobDerBaumeister, 'reviewed', {
      disable: disableVariables.disable,
      closed: disableVariables.closed,
    })
    await dagobert.update({ disabled: true, updatedAt: new Date().toISOString() })
    await reportAgainstTrollingPost.relateTo(peterLustig, 'reviewed', {
      disable: disableVariables.disable,
      closed: disableVariables.closed,
    })
    await p2.update({ disabled: true, updatedAt: new Date().toISOString() })
    await reportAgainstTrollingComment.relateTo(bobDerBaumeister, 'reviewed', {
      disable: disableVariables.disable,
      closed: disableVariables.closed,
    })
    await trollingComment.update({ disabled: true, updatedAt: new Date().toISOString() })

    // second review of resource and close report
    await reportAgainstDagobert.relateTo(peterLustig, 'reviewed', {
      disable: false,
      closed: true,
    })
    await dagobert.update({ disabled: false, updatedAt: new Date().toISOString(), closed: true })
    await reportAgainstTrollingPost.relateTo(bobDerBaumeister, 'reviewed', {
      disable: true,
      closed: true,
    })
    await p2.update({ disabled: true, updatedAt: new Date().toISOString(), closed: true })
    await reportAgainstTrollingComment.relateTo(peterLustig, 'reviewed', {
      disable: true,
      closed: true,
    })
    await trollingComment.update({
      disabled: true,
      updatedAt: new Date().toISOString(),
      closed: true,
    })

    // eslint-disable-next-line no-console
    console.log('seed', 'users additional with map locations around Zwingenberg')

    // Region Hessen (Mapbox-compatible hierarchy: place -> region -> country)
    const Hessen = await Factory.build('location', {
      id: 'region.8967011281068080',
      name: 'Hessen',
      type: 'region',
      lng: 8.6528,
      lat: 50.6521,
      nameDE: 'Hessen',
      nameEN: 'Hesse',
      nameES: 'Hesse',
      nameFR: 'Hesse',
      nameIT: 'Assia',
      namePT: 'Hessen',
      nameNL: 'Hessen',
      namePL: 'Hesja',
      nameRU: 'Гессен',
    })
    await Hessen.relateTo(Germany, 'isIn')

    // 50 villages around Zwingenberg (64673), Zwingenberg excluded
    // Mapbox-compatible: type 'place', realistic IDs
    const zwingenbergVillages = [
      // Bergstraße (west)
      { id: 'place.8652241', name: 'Alsbach-Hähnlein', lat: 49.7389, lng: 8.6331 },
      { id: 'place.8652242', name: 'Bickenbach', lat: 49.7567, lng: 8.6178 },
      { id: 'place.8652243', name: 'Seeheim-Jugenheim', lat: 49.7631, lng: 8.6506 },
      { id: 'place.8652244', name: 'Bensheim', lat: 49.6812, lng: 8.6167 },
      { id: 'place.8652245', name: 'Auerbach', lat: 49.7053, lng: 8.6389 },
      { id: 'place.8652246', name: 'Heppenheim', lat: 49.6428, lng: 8.6392 },
      { id: 'place.8652247', name: 'Lorsch', lat: 49.6539, lng: 8.5678 },
      { id: 'place.8652248', name: 'Einhausen', lat: 49.6775, lng: 8.5578 },
      { id: 'place.8652249', name: 'Gernsheim', lat: 49.7528, lng: 8.4906 },
      { id: 'place.8652250', name: 'Pfungstadt', lat: 49.8056, lng: 8.6042 },
      // Odenwald (east)
      { id: 'place.8652251', name: 'Reichenbach', lat: 49.725, lng: 8.67 },
      { id: 'place.8652252', name: 'Lautertal', lat: 49.7253, lng: 8.6914 },
      { id: 'place.8652253', name: 'Lindenfels', lat: 49.6836, lng: 8.7781 },
      { id: 'place.8652254', name: 'Modautal', lat: 49.7736, lng: 8.7258 },
      { id: 'place.8652255', name: 'Mühltal', lat: 49.8003, lng: 8.6917 },
      { id: 'place.8652256', name: 'Ober-Ramstadt', lat: 49.8306, lng: 8.7486 },
      { id: 'place.8652257', name: 'Reinheim', lat: 49.8289, lng: 8.8356 },
      { id: 'place.8652258', name: 'Groß-Bieberau', lat: 49.7906, lng: 8.8281 },
      { id: 'place.8652259', name: 'Fränkisch-Crumbach', lat: 49.745, lng: 8.8444 },
      { id: 'place.8652260', name: 'Brensbach', lat: 49.7742, lng: 8.8819 },
      // Ried (west/southwest)
      { id: 'place.8652261', name: 'Bürstadt', lat: 49.6433, lng: 8.4506 },
      { id: 'place.8652262', name: 'Lampertheim', lat: 49.5978, lng: 8.47 },
      { id: 'place.8652263', name: 'Biblis', lat: 49.6878, lng: 8.4531 },
      { id: 'place.8652264', name: 'Groß-Rohrheim', lat: 49.7228, lng: 8.4822 },
      { id: 'place.8652265', name: 'Riedstadt', lat: 49.835, lng: 8.4944 },
      { id: 'place.8652266', name: 'Stockstadt am Rhein', lat: 49.8094, lng: 8.4656 },
      { id: 'place.8652267', name: 'Biebesheim', lat: 49.7806, lng: 8.4672 },
      { id: 'place.8652268', name: 'Trebur', lat: 49.9211, lng: 8.4081 },
      { id: 'place.8652269', name: 'Nauheim', lat: 49.9456, lng: 8.4494 },
      { id: 'place.8652270', name: 'Griesheim', lat: 49.8619, lng: 8.5722 },
      // Darmstadt area (north)
      { id: 'place.8652271', name: 'Roßdorf', lat: 49.8572, lng: 8.7578 },
      { id: 'place.8652272', name: 'Messel', lat: 49.9333, lng: 8.75 },
      { id: 'place.8652273', name: 'Eppertshausen', lat: 49.95, lng: 8.85 },
      { id: 'place.8652274', name: 'Münster', lat: 49.9253, lng: 8.8653 },
      { id: 'place.8652275', name: 'Dieburg', lat: 49.8983, lng: 8.8467 },
      { id: 'place.8652276', name: 'Babenhausen', lat: 49.965, lng: 8.9511 },
      { id: 'place.8652277', name: 'Schaafheim', lat: 49.9244, lng: 8.9703 },
      { id: 'place.8652278', name: 'Groß-Umstadt', lat: 49.8667, lng: 8.9333 },
      { id: 'place.8652279', name: 'Otzberg', lat: 49.82, lng: 8.91 },
      { id: 'place.8652280', name: 'Höchst im Odenwald', lat: 49.7994, lng: 8.9986 },
      // Further south
      { id: 'place.8652281', name: 'Mörlenbach', lat: 49.5969, lng: 8.7378 },
      { id: 'place.8652282', name: 'Rimbach', lat: 49.6256, lng: 8.7611 },
      { id: 'place.8652283', name: 'Fürth', lat: 49.6522, lng: 8.7789 },
      { id: 'place.8652284', name: 'Grasellenbach', lat: 49.6353, lng: 8.8531 },
      { id: 'place.8652285', name: 'Wald-Michelbach', lat: 49.57, lng: 8.83 },
      { id: 'place.8652286', name: 'Abtsteinach', lat: 49.5536, lng: 8.78 },
      { id: 'place.8652287', name: 'Gorxheimertal', lat: 49.5322, lng: 8.7322 },
      { id: 'place.8652288', name: 'Viernheim', lat: 49.5403, lng: 8.5783 },
      { id: 'place.8652289', name: 'Weinheim', lat: 49.5489, lng: 8.6639 },
      { id: 'place.8652290', name: 'Hemsbach', lat: 49.59, lng: 8.65 },
    ]

    // Create village location nodes (one per village, shared by all users in that village)
    const villageLocationNodes: (typeof Hamburg)[] = []
    for (const village of zwingenbergVillages) {
      const location = await Factory.build('location', {
        id: village.id,
        name: village.name,
        type: 'place',
        lng: village.lng,
        lat: village.lat,
        nameDE: village.name,
        nameEN: village.name,
        nameES: village.name,
        nameFR: village.name,
        nameIT: village.name,
        namePT: village.name,
        nameNL: village.name,
        namePL: village.name,
        nameRU: village.name,
      })
      await location.relateTo(Hessen, 'isIn')
      villageLocationNodes.push(location)
    }

    // Create 1000 additional users with locations assigned during creation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const additionalUsers: any[] = []
    for (let i = 0; i < 1000; i++) {
      if (i % 100 === 0) {
        // eslint-disable-next-line no-console
        console.log('seed', `additional users ${i}/1000`)
      }
      const user = await Factory.build('user')
      await jennyRostock.relateTo(user, 'following')
      await user.relateTo(jennyRostock, 'following')
      // Assign village location (round-robin across 50 villages = ~20 users per village)
      await user.relateTo(villageLocationNodes[i % villageLocationNodes.length], 'isIn')
      additionalUsers.push(user)

      const userObj = await user.toJson()
      authenticatedUser = userObj

      await mutate({
        mutation: JoinGroup,
        variables: {
          groupId: 'g2',
          userId: userObj.id,
        },
      })
    }
    // eslint-disable-next-line no-console
    console.log('seed', 'additional users 1000/1000 done')

    // Jenny's first 99 additional users all redeemed code ABCDEF
    // eslint-disable-next-line no-console
    console.log('seed', 'invite redemptions for additional users')
    const jennyInviteSession = database.driver.session()
    try {
      for (let i = 0; i < Math.min(99, additionalUsers.length); i++) {
        // eslint-disable-next-line security/detect-object-injection
        const userObj = await additionalUsers[i].toJson()
        const userId = userObj.id as string
        await jennyInviteSession.writeTransaction((txc) =>
          txc.run(
            `
            MATCH (user:User {id: $userId}), (inviteCode:InviteCode {code: 'ABCDEF'}), (jenny:User {id: 'u3'})
            MERGE (user)-[:REDEEMED {createdAt: toString(datetime())}]->(inviteCode)
            MERGE (jenny)-[:INVITED {createdAt: toString(datetime())}]->(user)
            MERGE (user)-[:FOLLOWS {createdAt: toString(datetime())}]->(jenny)
            MERGE (jenny)-[:FOLLOWS {createdAt: toString(datetime())}]->(user)
            `,
            { userId },
          ),
        )
      }
    } finally {
      await jennyInviteSession.close()
    }

    // Jenny users
    for (let i = 0; i < 30; i++) {
      await Factory.build('user', { name: `Jenny${i}` })
    }

    // Jenny posts
    for (let i = 0; i < 30; i++) {
      await Factory.build(
        'post',
        { content: `Jenny ${faker.lorem.sentence()}` },
        {
          categoryIds: ['cat1'],
          author: jennyRostock,
        },
      )
    }

    // comments on p2 jenny
    for (let i = 0; i < 6; i++) {
      await Factory.build(
        'comment',
        {},
        {
          author: jennyRostock,
          postId: 'p2',
        },
      )
    }

    // comments on p15 jenny
    for (let i = 0; i < 4; i++) {
      await Factory.build(
        'comment',
        {},
        {
          author: jennyRostock,
          postId: 'p15',
        },
      )
    }

    // comments on p4 jenny
    for (let i = 0; i < 2; i++) {
      await Factory.build(
        'comment',
        {},
        {
          author: jennyRostock,
          postId: 'p4',
        },
      )
    }

    // Posts Peter Lustig
    for (let i = 0; i < 21; i++) {
      await Factory.build(
        'post',
        {},
        {
          categoryIds: ['cat1'],
          author: peterLustig,
        },
      )
    }

    // comments p4 peter
    for (let i = 0; i < 3; i++) {
      await Factory.build(
        'comment',
        {},
        {
          author: peterLustig,
          postId: 'p4',
        },
      )
    }

    // comments p14 peter
    for (let i = 0; i < 3; i++) {
      await Factory.build(
        'comment',
        {},
        {
          author: peterLustig,
          postId: 'p14',
        },
      )
    }

    // comments p0 peter
    for (let i = 0; i < 3; i++) {
      await Factory.build(
        'comment',
        {},
        {
          author: peterLustig,
          postId: 'p0',
        },
      )
    }

    // Posts dewey
    for (let i = 0; i < 11; i++) {
      await Factory.build(
        'post',
        {},
        {
          categoryIds: ['cat1'],
          author: dewey,
        },
      )
    }

    // Comments p2 dewey
    for (let i = 0; i < 7; i++) {
      await Factory.build(
        'comment',
        {},
        {
          author: dewey,
          postId: 'p2',
        },
      )
    }

    // Comments p6 dewey
    for (let i = 0; i < 5; i++) {
      await Factory.build(
        'comment',
        {},
        {
          author: dewey,
          postId: 'p6',
        },
      )
    }

    // Comments p9 dewey
    for (let i = 0; i < 2; i++) {
      await Factory.build(
        'comment',
        {},
        {
          author: dewey,
          postId: 'p9',
        },
      )
    }

    // Posts louie
    for (let i = 0; i < 16; i++) {
      await Factory.build(
        'post',
        {},
        {
          categoryIds: ['cat1'],
          author: louie,
        },
      )
    }

    // Comments p1 louie
    for (let i = 0; i < 4; i++) {
      await Factory.build(
        'comment',
        {},
        {
          postId: 'p1',
          author: louie,
        },
      )
    }

    // Comments p10 louie
    for (let i = 0; i < 8; i++) {
      await Factory.build(
        'comment',
        {},
        {
          author: louie,
          postId: 'p10',
        },
      )
    }

    // Comments p13 louie
    for (let i = 0; i < 5; i++) {
      await Factory.build(
        'comment',
        {},
        {
          author: louie,
          postId: 'p13',
        },
      )
    }

    // Posts Bob der Baumeister
    for (let i = 0; i < 45; i++) {
      await Factory.build(
        'post',
        {},
        {
          categoryIds: ['cat1'],
          author: bobDerBaumeister,
        },
      )
    }

    // Comments p2 bob
    for (let i = 0; i < 2; i++) {
      await Factory.build(
        'comment',
        {},
        {
          author: bobDerBaumeister,
          postId: 'p2',
        },
      )
    }

    // Comments p12 bob
    for (let i = 0; i < 3; i++) {
      await Factory.build(
        'comment',
        {},
        {
          author: bobDerBaumeister,
          postId: 'p12',
        },
      )
    }

    // Comments p13 bob
    for (let i = 0; i < 7; i++) {
      await Factory.build(
        'comment',
        {},
        {
          author: bobDerBaumeister,
          postId: 'p13',
        },
      )
    }

    // Posts huey
    for (let i = 0; i < 8; i++) {
      await Factory.build(
        'post',
        {},
        {
          categoryIds: ['cat1'],
          author: huey,
        },
      )
    }

    // Comments p0 huey
    for (let i = 0; i < 6; i++) {
      await Factory.build(
        'comment',
        {},
        {
          author: huey,
          postId: 'p0',
        },
      )
    }

    // Comments p13 huey
    for (let i = 0; i < 8; i++) {
      await Factory.build(
        'comment',
        {},
        {
          author: huey,
          postId: 'p13',
        },
      )
    }

    // Comments p15 huey
    for (let i = 0; i < 8; i++) {
      await Factory.build(
        'comment',
        {},
        {
          author: huey,
          postId: 'p15',
        },
      )
    }

    // Mark all Huey's posts and comments as created via API key
    await database.write({
      query: `MATCH (u:User { id: 'u4' })-[:WROTE]->(content)
              WHERE content:Post OR content:Comment
              SET content.createdByApiKey = 'ak-huey-auto'`,
      variables: {},
    })

    await Factory.build('donations')

    // eslint-disable-next-line no-console
    console.log('seed', 'chat')
    // DM chat: Huey <-> Peter (first message creates room via userId)
    authenticatedUser = await huey.toJson()
    const { data: firstMsgHueyPeter } = await mutate({
      mutation: CreateMessage,
      variables: {
        userId: (await peterLustig.toJson()).id,
        content: faker.lorem.sentence(),
      },
    })
    const roomIdHueyPeter = firstMsgHueyPeter?.CreateMessage.room.id

    for (let i = 0; i < 29; i++) {
      authenticatedUser = await peterLustig.toJson()
      await mutate({
        mutation: CreateMessage,
        variables: { roomId: roomIdHueyPeter, content: faker.lorem.sentence() },
      })
      authenticatedUser = await huey.toJson()
      await mutate({
        mutation: CreateMessage,
        variables: { roomId: roomIdHueyPeter, content: faker.lorem.sentence() },
      })
    }

    // DM chat: Huey <-> Jenny (first message creates room via userId)
    authenticatedUser = await huey.toJson()
    const { data: firstMsgHueyJenny } = await mutate({
      mutation: CreateMessage,
      variables: {
        userId: (await jennyRostock.toJson()).id,
        content: faker.lorem.sentence(),
      },
    })
    const roomIdHueyJenny = firstMsgHueyJenny?.CreateMessage.room.id

    for (let i = 0; i < 999; i++) {
      authenticatedUser = await jennyRostock.toJson()
      await mutate({
        mutation: CreateMessage,
        variables: { roomId: roomIdHueyJenny, content: faker.lorem.sentence() },
      })
      authenticatedUser = await huey.toJson()
      await mutate({
        mutation: CreateMessage,
        variables: { roomId: roomIdHueyJenny, content: faker.lorem.sentence() },
      })
    }

    // DM chats: Jenny <-> additionalUsers
    for (const user of additionalUsers.slice(0, 99)) {
      authenticatedUser = await jennyRostock.toJson()
      const { data: firstMsg } = await mutate({
        mutation: CreateMessage,
        variables: {
          userId: (await user.toJson()).id,
          content: faker.lorem.sentence(),
        },
      })
      const dmRoomId = firstMsg?.CreateMessage.room.id

      for (let i = 0; i < 28; i++) {
        authenticatedUser = await user.toJson()
        await mutate({
          mutation: CreateMessage,
          variables: { roomId: dmRoomId, content: faker.lorem.sentence() },
        })
        authenticatedUser = await jennyRostock.toJson()
        await mutate({
          mutation: CreateMessage,
          variables: { roomId: dmRoomId, content: faker.lorem.sentence() },
        })
      }
    }

    // eslint-disable-next-line no-console
    console.log('seed', 'group chat')

    // Group g1 (School For Citizens) - active members: Jenny(owner/creator), Peter(usual), Bob(usual), Dewey(admin), Louie(owner), Dagobert(usual)
    // Create group room as Jenny (creator of g1)
    authenticatedUser = await jennyRostock.toJson()
    const { data: roomG1 } = await mutate({
      mutation: CreateGroupRoom,
      variables: { groupId: 'g1' },
    })
    const g1RoomId = roomG1?.CreateGroupRoom.id

    // Members have a conversation
    const g1Members = [
      { user: jennyRostock, name: 'Jenny' },
      { user: peterLustig, name: 'Peter' },
      { user: dewey, name: 'Dewey' },
      { user: louie, name: 'Louie' },
    ]
    for (let i = 0; i < 20; i++) {
      const member = g1Members[i % g1Members.length]
      authenticatedUser = await member.user.toJson()
      await mutate({
        mutation: CreateMessage,
        variables: {
          roomId: g1RoomId,
          content: faker.lorem.sentence(),
        },
      })
    }

    // Group g2 (Yoga Practice) - active members: Bob(owner/creator), Jenny(usual), Dewey(admin), Louie(usual), Dagobert(usual) - Huey is pending
    authenticatedUser = await bobDerBaumeister.toJson()
    const { data: roomG2 } = await mutate({
      mutation: CreateGroupRoom,
      variables: { groupId: 'g2' },
    })
    const g2RoomId = roomG2?.CreateGroupRoom.id

    const g2Members = [
      { user: bobDerBaumeister, name: 'Bob' },
      { user: jennyRostock, name: 'Jenny' },
      { user: dewey, name: 'Dewey' },
      { user: louie, name: 'Louie' },
      { user: dagobert, name: 'Dagobert' },
    ]
    for (let i = 0; i < 25; i++) {
      const member = g2Members[i % g2Members.length]
      authenticatedUser = await member.user.toJson()
      await mutate({
        mutation: CreateMessage,
        variables: {
          roomId: g2RoomId,
          content: faker.lorem.sentence(),
        },
      })
    }

    // Group g0 (Investigative Journalism) - intentionally NO chat seeded

    // Safety net: give any user still without a HAS_ROLE edge their tier edge (users
    // built by the factory after seeding the role nodes already have one). Idempotent.
    await ensureUserRoleEdges()

    // A running server still holds stale role/policy caches after this seed — nudge it
    // to resync (best-effort; no-op if the backend is down).
    await nudgeCacheResync()
  } catch (err) {
    /* eslint-disable-next-line no-console */
    console.error(err)
    throw err
  } finally {
    await server.stop()
    await database.driver.close()
    // eslint-disable-next-line @typescript-eslint/await-thenable
    await neode.close()
    process.exit(0)
  }
})()
