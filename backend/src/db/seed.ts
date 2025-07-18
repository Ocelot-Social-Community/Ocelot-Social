/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable n/no-process-exit */
import { faker } from '@faker-js/faker'
import sample from 'lodash/sample'

import CONFIG from '@config/index'
import { categories } from '@constants/categories'
import { changeGroupMemberRoleMutation } from '@graphql/queries/changeGroupMemberRoleMutation'
import { createCommentMutation } from '@graphql/queries/createCommentMutation'
import { createGroupMutation } from '@graphql/queries/createGroupMutation'
import { CreateMessage } from '@graphql/queries/CreateMessage'
import { createPostMutation } from '@graphql/queries/createPostMutation'
import { createRoomMutation } from '@graphql/queries/createRoomMutation'
import { joinGroupMutation } from '@graphql/queries/joinGroupMutation'
import { createApolloTestSetup } from '@root/test/helpers'

import Factory from './factories'
import { trophies, verification } from './seed/badges'

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
  })
  const apolloSetup = createApolloTestSetup({ context })
  const { mutate, server, database } = apolloSetup
  const { neode } = database

  try {
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
    const peterLustig = await Factory.build(
      'user',
      {
        id: 'u1',
        name: 'Peter Lustig',
        slug: 'peter-lustig',
        role: 'admin',
      },
      {
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
      mutation: createGroupMutation(),
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
      mutation: joinGroupMutation(),
      variables: {
        groupId: 'g0',
        userId: 'u2',
      },
    })
    await mutate({
      mutation: joinGroupMutation(),
      variables: {
        groupId: 'g0',
        userId: 'u4',
      },
    })
    await mutate({
      mutation: joinGroupMutation(),
      variables: {
        groupId: 'g0',
        userId: 'u6',
      },
    })

    await mutate({
      mutation: changeGroupMemberRoleMutation(),
      variables: {
        groupId: 'g0',
        userId: 'u2',
        roleInGroup: 'usual',
      },
    })

    await mutate({
      mutation: changeGroupMemberRoleMutation(),
      variables: {
        groupId: 'g0',
        userId: 'u4',
        roleInGroup: 'admin',
      },
    })

    // eslint-disable-next-line no-console
    console.log('seed', 'group posts')
    await mutate({
      mutation: createPostMutation(),
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
      mutation: createPostMutation(),
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
      mutation: createGroupMutation(),
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
    await mutate({
      mutation: joinGroupMutation(),
      variables: {
        groupId: 'g1',
        userId: 'u1',
      },
    })
    await mutate({
      mutation: joinGroupMutation(),
      variables: {
        groupId: 'g1',
        userId: 'u2',
      },
    })
    await mutate({
      mutation: joinGroupMutation(),
      variables: {
        groupId: 'g1',
        userId: 'u5',
      },
    })
    await mutate({
      mutation: joinGroupMutation(),
      variables: {
        groupId: 'g1',
        userId: 'u6',
      },
    })
    await mutate({
      mutation: joinGroupMutation(),
      variables: {
        groupId: 'g1',
        userId: 'u7',
      },
    })

    await mutate({
      mutation: changeGroupMemberRoleMutation(),
      variables: {
        groupId: 'g1',
        userId: 'u1',
        roleInGroup: 'usual',
      },
    })
    await mutate({
      mutation: changeGroupMemberRoleMutation(),
      variables: {
        groupId: 'g1',
        userId: 'u5',
        roleInGroup: 'admin',
      },
    })
    await mutate({
      mutation: changeGroupMemberRoleMutation(),
      variables: {
        groupId: 'g1',
        userId: 'u6',
        roleInGroup: 'owner',
      },
    })
    await mutate({
      mutation: createPostMutation(),
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
      mutation: createPostMutation(),
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
      mutation: createGroupMutation(),
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
      mutation: joinGroupMutation(),
      variables: {
        groupId: 'g2',
        userId: 'u3',
      },
    })
    await mutate({
      mutation: joinGroupMutation(),
      variables: {
        groupId: 'g2',
        userId: 'u4',
      },
    })
    await mutate({
      mutation: joinGroupMutation(),
      variables: {
        groupId: 'g2',
        userId: 'u5',
      },
    })
    await mutate({
      mutation: joinGroupMutation(),
      variables: {
        groupId: 'g2',
        userId: 'u6',
      },
    })
    await mutate({
      mutation: joinGroupMutation(),
      variables: {
        groupId: 'g2',
        userId: 'u7',
      },
    })

    await mutate({
      mutation: changeGroupMemberRoleMutation(),
      variables: {
        groupId: 'g2',
        userId: 'u3',
        roleInGroup: 'usual',
      },
    })
    await mutate({
      mutation: changeGroupMemberRoleMutation(),
      variables: {
        groupId: 'g2',
        userId: 'u4',
        roleInGroup: 'pending',
      },
    })
    await mutate({
      mutation: changeGroupMemberRoleMutation(),
      variables: {
        groupId: 'g2',
        userId: 'u5',
        roleInGroup: 'admin',
      },
    })
    await mutate({
      mutation: changeGroupMemberRoleMutation(),
      variables: {
        groupId: 'g2',
        userId: 'u6',
        roleInGroup: 'usual',
      },
    })

    authenticatedUser = await louie.toJson()
    await mutate({
      mutation: createPostMutation(),
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
      mutation: createPostMutation(),
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
      mutation: createPostMutation(),
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
      mutation: createPostMutation(),
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

    let passedEvent = await neode.find('Post', 'e1')
    await passedEvent.update({ eventStart: new Date(2010, 8, 30, 10).toISOString() })
    passedEvent = await neode.find('Post', 'e2')
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
    console.log('seed', 'invitecodes')
    await Factory.build(
      'inviteCode',
      {
        code: 'ABCDEF',
      },
      {
        generatedBy: jennyRostock,
      },
    )

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
      mutation: createPostMutation(),
      variables: {
        id: 'p2',
        title: `Nature Philosophy Yoga`,
        content: hashtag1,
        categoryIds: ['cat2'],
      },
    })
    await mutate({
      mutation: createPostMutation(),
      variables: {
        id: 'p7',
        title: 'This is post #7',
        content: `${mention1} ${faker.lorem.paragraph()}`,
        categoryIds: ['cat7'],
      },
    })
    await mutate({
      mutation: createPostMutation(),
      variables: {
        id: 'p8',
        title: `Quantum Flow Theory explains Quantum Gravity`,
        content: hashtagAndMention1,
        categoryIds: ['cat8'],
      },
    })
    await mutate({
      mutation: createPostMutation(),
      variables: {
        id: 'p12',
        title: 'This is post #12',
        content: `${mention2} ${faker.lorem.paragraph()}`,
        categoryIds: ['cat12'],
      },
    })

    const p2 = await neode.find('Post', 'p2')
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
      mutation: createCommentMutation,
      variables: {
        id: 'c4',
        postId: 'p2',
        content: mentionInComment1,
      },
    })
    await mutate({
      mutation: createCommentMutation,
      variables: {
        id: 'c4-1',
        postId: 'p2',
        content: mentionInComment2,
      },
    })
    await mutate({
      mutation: createCommentMutation,
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
      ...disableVariables,
      resourceId: 'u7',
    })
    await dagobert.update({ disabled: true, updatedAt: new Date().toISOString() })
    await reportAgainstTrollingPost.relateTo(peterLustig, 'reviewed', {
      ...disableVariables,
      resourceId: 'p2',
    })
    await p2.update({ disabled: true, updatedAt: new Date().toISOString() })
    await reportAgainstTrollingComment.relateTo(bobDerBaumeister, 'reviewed', {
      ...disableVariables,
      resourceId: 'c1',
    })
    await trollingComment.update({ disabled: true, updatedAt: new Date().toISOString() })

    // second review of resource and close report
    await reportAgainstDagobert.relateTo(peterLustig, 'reviewed', {
      resourceId: 'u7',
      disable: false,
      closed: true,
    })
    await dagobert.update({ disabled: false, updatedAt: new Date().toISOString(), closed: true })
    await reportAgainstTrollingPost.relateTo(bobDerBaumeister, 'reviewed', {
      resourceId: 'p2',
      disable: true,
      closed: true,
    })
    await p2.update({ disabled: true, updatedAt: new Date().toISOString(), closed: true })
    await reportAgainstTrollingComment.relateTo(peterLustig, 'reviewed', {
      ...disableVariables,
      resourceId: 'c1',
      disable: true,
      closed: true,
    })
    await trollingComment.update({
      disabled: true,
      updatedAt: new Date().toISOString(),
      closed: true,
    })

    // eslint-disable-next-line no-console
    console.log('seed', 'users additional')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const additionalUsers: any[] = []
    for (let i = 0; i < 1000; i++) {
      const user = await Factory.build('user')
      await jennyRostock.relateTo(user, 'following')
      await user.relateTo(jennyRostock, 'following')
      additionalUsers.push(user)

      const userObj = await user.toJson()
      authenticatedUser = userObj

      await mutate({
        mutation: joinGroupMutation(),
        variables: {
          groupId: 'g2',
          userId: userObj.id,
        },
      })
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

    await Factory.build('donations')

    // eslint-disable-next-line no-console
    console.log('seed', 'chat')
    authenticatedUser = await huey.toJson()
    const { data: roomHueyPeter } = await mutate({
      mutation: createRoomMutation(),
      variables: {
        userId: (await peterLustig.toJson()).id,
      },
    })

    for (let i = 0; i < 30; i++) {
      authenticatedUser = await huey.toJson()
      await mutate({
        mutation: CreateMessage,
        variables: {
          roomId: roomHueyPeter?.CreateRoom.id,
          content: faker.lorem.sentence(),
        },
      })
      authenticatedUser = await peterLustig.toJson()
      await mutate({
        mutation: CreateMessage,
        variables: {
          roomId: roomHueyPeter?.CreateRoom.id,
          content: faker.lorem.sentence(),
        },
      })
    }

    authenticatedUser = await huey.toJson()
    const { data: roomHueyJenny } = await mutate({
      mutation: createRoomMutation(),
      variables: {
        userId: (await jennyRostock.toJson()).id,
      },
    })
    for (let i = 0; i < 1000; i++) {
      authenticatedUser = await huey.toJson()
      await mutate({
        mutation: CreateMessage,
        variables: {
          roomId: roomHueyJenny?.CreateRoom.id,
          content: faker.lorem.sentence(),
        },
      })
      authenticatedUser = await jennyRostock.toJson()
      await mutate({
        mutation: CreateMessage,
        variables: {
          roomId: roomHueyJenny?.CreateRoom.id,
          content: faker.lorem.sentence(),
        },
      })
    }

    for (const user of additionalUsers.slice(0, 99)) {
      authenticatedUser = await jennyRostock.toJson()
      const { data: room } = await mutate({
        mutation: createRoomMutation(),
        variables: {
          userId: (await user.toJson()).id,
        },
      })

      for (let i = 0; i < 29; i++) {
        authenticatedUser = await jennyRostock.toJson()
        await mutate({
          mutation: CreateMessage,
          variables: {
            roomId: room?.CreateRoom.id,
            content: faker.lorem.sentence(),
          },
        })
        authenticatedUser = await user.toJson()
        await mutate({
          mutation: CreateMessage,
          variables: {
            roomId: room?.CreateRoom.id,
            content: faker.lorem.sentence(),
          },
        })
      }
    }
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
