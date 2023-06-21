import sample from 'lodash/sample'
import { createTestClient } from 'apollo-server-testing'
import CONFIG from '../config'
import createServer from '../server'
import { faker } from '@faker-js/faker'
import Factory from '../db/factories'
import { getNeode, getDriver } from '../db/neo4j'
import {
  createGroupMutation,
  joinGroupMutation,
  changeGroupMemberRoleMutation,
} from '../graphql/groups'
import { createPostMutation } from '../graphql/posts'
import { createCommentMutation } from '../graphql/comments'
import { categories } from '../constants/categories'

if (CONFIG.PRODUCTION && !CONFIG.PRODUCTION_DB_CLEAN_ALLOW) {
  throw new Error(`You cannot seed the database in a non-staging and real production environment!`)
}

const languages = ['de', 'en', 'es', 'fr', 'it', 'pt', 'pl']

/* eslint-disable no-multi-spaces */
;(async function () {
  let authenticatedUser = null
  const driver = getDriver()
  const neode = getNeode()

  try {
    const { server } = createServer({
      context: () => {
        return {
          driver,
          neode,
          user: authenticatedUser,
        }
      },
    })
    const { mutate } = createTestClient(server)

    const [Hamburg, Berlin, Germany, Paris, France] = await Promise.all([
      Factory.build('location', {
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
      }),
      Factory.build('location', {
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
      }),
      Factory.build('location', {
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
      }),
      Factory.build('location', {
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
      }),
      Factory.build('location', {
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
      }),
    ])
    await Promise.all([
      Berlin.relateTo(Germany, 'isIn'),
      Hamburg.relateTo(Germany, 'isIn'),
      Paris.relateTo(France, 'isIn'),
    ])

    const [racoon, rabbit, wolf, bear, turtle, rhino] = await Promise.all([
      Factory.build('badge', {
        id: 'indiegogo_en_racoon',
        icon: '/img/badges/indiegogo_en_racoon.svg',
      }),
      Factory.build('badge', {
        id: 'indiegogo_en_rabbit',
        icon: '/img/badges/indiegogo_en_rabbit.svg',
      }),
      Factory.build('badge', {
        id: 'indiegogo_en_wolf',
        icon: '/img/badges/indiegogo_en_wolf.svg',
      }),
      Factory.build('badge', {
        id: 'indiegogo_en_bear',
        icon: '/img/badges/indiegogo_en_bear.svg',
      }),
      Factory.build('badge', {
        id: 'indiegogo_en_turtle',
        icon: '/img/badges/indiegogo_en_turtle.svg',
      }),
      Factory.build('badge', {
        id: 'indiegogo_en_rhino',
        icon: '/img/badges/indiegogo_en_rhino.svg',
      }),
    ])

    const [peterLustig, bobDerBaumeister, jennyRostock, huey, dewey, louie, dagobert] =
      await Promise.all([
        Factory.build(
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
        ),
        Factory.build(
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
        ),
        Factory.build(
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
        ),
        Factory.build(
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
        ),
        Factory.build(
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
        ),
        Factory.build(
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
        ),
        Factory.build(
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
        ),
      ])

    await Promise.all([
      peterLustig.relateTo(Berlin, 'isIn'),
      bobDerBaumeister.relateTo(Hamburg, 'isIn'),
      jennyRostock.relateTo(Paris, 'isIn'),
      huey.relateTo(Paris, 'isIn'),
    ])

    await Promise.all([
      peterLustig.relateTo(racoon, 'rewarded'),
      peterLustig.relateTo(rhino, 'rewarded'),
      peterLustig.relateTo(wolf, 'rewarded'),
      bobDerBaumeister.relateTo(racoon, 'rewarded'),
      bobDerBaumeister.relateTo(turtle, 'rewarded'),
      jennyRostock.relateTo(bear, 'rewarded'),
      dagobert.relateTo(rabbit, 'rewarded'),

      peterLustig.relateTo(bobDerBaumeister, 'friends'),
      peterLustig.relateTo(jennyRostock, 'friends'),
      bobDerBaumeister.relateTo(jennyRostock, 'friends'),

      peterLustig.relateTo(jennyRostock, 'following'),
      peterLustig.relateTo(huey, 'following'),
      bobDerBaumeister.relateTo(huey, 'following'),
      jennyRostock.relateTo(huey, 'following'),
      huey.relateTo(dewey, 'following'),
      dewey.relateTo(huey, 'following'),
      louie.relateTo(jennyRostock, 'following'),

      huey.relateTo(dagobert, 'muted'),
      dewey.relateTo(dagobert, 'muted'),
      louie.relateTo(dagobert, 'muted'),

      dagobert.relateTo(huey, 'blocked'),
      dagobert.relateTo(dewey, 'blocked'),
      dagobert.relateTo(louie, 'blocked'),
    ])

    await Promise.all(
      categories.map(({ icon, name }, index) => {
        return Factory.build('category', {
          id: `cat${index + 1}`,
          slug: name,
          name,
          icon,
        })
      }),
    )

    const [environment, nature, democracy, freedom] = await Promise.all([
      Factory.build('tag', {
        id: 'Environment',
      }),
      Factory.build('tag', {
        id: 'Nature',
      }),
      Factory.build('tag', {
        id: 'Democracy',
      }),
      Factory.build('tag', {
        id: 'Freedom',
      }),
    ])

    // Create Groups

    authenticatedUser = await peterLustig.toJson()
    await Promise.all([
      mutate({
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
      }),
    ])
    await Promise.all([
      mutate({
        mutation: joinGroupMutation(),
        variables: {
          groupId: 'g0',
          userId: 'u2',
        },
      }),
      mutate({
        mutation: joinGroupMutation(),
        variables: {
          groupId: 'g0',
          userId: 'u4',
        },
      }),
      mutate({
        mutation: joinGroupMutation(),
        variables: {
          groupId: 'g0',
          userId: 'u6',
        },
      }),
    ])
    await Promise.all([
      mutate({
        mutation: changeGroupMemberRoleMutation(),
        variables: {
          groupId: 'g0',
          userId: 'u2',
          roleInGroup: 'usual',
        },
      }),
      mutate({
        mutation: changeGroupMemberRoleMutation(),
        variables: {
          groupId: 'g0',
          userId: 'u4',
          roleInGroup: 'admin',
        },
      }),
    ])

    // post into group
    await Promise.all([
      mutate({
        mutation: createPostMutation(),
        variables: {
          id: 'p0-g0',
          groupId: 'g0',
          title: `What happend in Shanghai?`,
          content: 'A sack of rise dropped in Shanghai. Should we further investigate?',
          categoryIds: ['cat6'],
        },
      }),
    ])
    authenticatedUser = await bobDerBaumeister.toJson()
    await Promise.all([
      mutate({
        mutation: createPostMutation(),
        variables: {
          id: 'p1-g0',
          groupId: 'g0',
          title: `The man on the moon`,
          content: 'We have to further investigate about the stories of a man living on the moon.',
          categoryIds: ['cat12', 'cat16'],
        },
      }),
    ])

    authenticatedUser = await jennyRostock.toJson()
    await Promise.all([
      mutate({
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
      }),
    ])
    await Promise.all([
      mutate({
        mutation: joinGroupMutation(),
        variables: {
          groupId: 'g1',
          userId: 'u1',
        },
      }),
      mutate({
        mutation: joinGroupMutation(),
        variables: {
          groupId: 'g1',
          userId: 'u2',
        },
      }),
      mutate({
        mutation: joinGroupMutation(),
        variables: {
          groupId: 'g1',
          userId: 'u5',
        },
      }),
      mutate({
        mutation: joinGroupMutation(),
        variables: {
          groupId: 'g1',
          userId: 'u6',
        },
      }),
      mutate({
        mutation: joinGroupMutation(),
        variables: {
          groupId: 'g1',
          userId: 'u7',
        },
      }),
    ])
    await Promise.all([
      mutate({
        mutation: changeGroupMemberRoleMutation(),
        variables: {
          groupId: 'g1',
          userId: 'u1',
          roleInGroup: 'usual',
        },
      }),
      mutate({
        mutation: changeGroupMemberRoleMutation(),
        variables: {
          groupId: 'g1',
          userId: 'u5',
          roleInGroup: 'admin',
        },
      }),
      mutate({
        mutation: changeGroupMemberRoleMutation(),
        variables: {
          groupId: 'g1',
          userId: 'u6',
          roleInGroup: 'owner',
        },
      }),
    ])
    // post into group
    await Promise.all([
      mutate({
        mutation: createPostMutation(),
        variables: {
          id: 'p0-g1',
          groupId: 'g1',
          title: `Can we use ocelot for education?`,
          content: 'I like the concept of this school. Can we use our software in this?',
          categoryIds: ['cat8'],
        },
      }),
    ])
    authenticatedUser = await peterLustig.toJson()
    await Promise.all([
      mutate({
        mutation: createPostMutation(),
        variables: {
          id: 'p1-g1',
          groupId: 'g1',
          title: `Can we push this idea out of France?`,
          content: 'This idea is too inportant to have the scope only on France.',
          categoryIds: ['cat14'],
        },
      }),
    ])

    authenticatedUser = await bobDerBaumeister.toJson()
    await Promise.all([
      mutate({
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
      }),
    ])
    await Promise.all([
      mutate({
        mutation: joinGroupMutation(),
        variables: {
          groupId: 'g2',
          userId: 'u3',
        },
      }),
      mutate({
        mutation: joinGroupMutation(),
        variables: {
          groupId: 'g2',
          userId: 'u4',
        },
      }),
      mutate({
        mutation: joinGroupMutation(),
        variables: {
          groupId: 'g2',
          userId: 'u5',
        },
      }),
      mutate({
        mutation: joinGroupMutation(),
        variables: {
          groupId: 'g2',
          userId: 'u6',
        },
      }),
      mutate({
        mutation: joinGroupMutation(),
        variables: {
          groupId: 'g2',
          userId: 'u7',
        },
      }),
    ])
    await Promise.all([
      mutate({
        mutation: changeGroupMemberRoleMutation(),
        variables: {
          groupId: 'g2',
          userId: 'u3',
          roleInGroup: 'usual',
        },
      }),
      mutate({
        mutation: changeGroupMemberRoleMutation(),
        variables: {
          groupId: 'g2',
          userId: 'u4',
          roleInGroup: 'pending',
        },
      }),
      mutate({
        mutation: changeGroupMemberRoleMutation(),
        variables: {
          groupId: 'g2',
          userId: 'u5',
          roleInGroup: 'admin',
        },
      }),
      mutate({
        mutation: changeGroupMemberRoleMutation(),
        variables: {
          groupId: 'g2',
          userId: 'u6',
          roleInGroup: 'usual',
        },
      }),
    ])

    authenticatedUser = await louie.toJson()
    await Promise.all([
      mutate({
        mutation: createPostMutation(),
        variables: {
          id: 'p0-g2',
          groupId: 'g2',
          title: `I am a Noob`,
          content: 'I am new to Yoga and did not join this group so far.',
          categoryIds: ['cat4'],
        },
      }),
    ])

    // Create Events (by peter lustig)
    authenticatedUser = await peterLustig.toJson()
    const now = new Date()

    await Promise.all([
      mutate({
        mutation: createPostMutation(),
        variables: {
          id: 'e0',
          title: 'Illegaler Kindergeburtstag',
          content: 'Elli hat nächste Woche Geburtstag. Wir feiern das!',
          categoryIds: ['cat4'],
          postType: 'Event',
          eventInput: {
            eventStart: new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() + 7,
            ).toISOString(),
            eventVenue: 'Ellis Kinderzimmer',
            eventLocationName: 'Deutschland',
          },
        },
      }),
      mutate({
        mutation: createPostMutation(),
        variables: {
          id: 'e1',
          title: 'Wir Schützen den Stuttgarter Schlossgarten',
          content: 'Kein Baum wird gefällt werden!',
          categoryIds: ['cat5'],
          postType: 'Event',
          eventInput: {
            eventStart: new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() + 1,
            ).toISOString(),
            eventVenue: 'Schlossgarten',
            eventLocationName: 'Stuttgart',
          },
        },
      }),
      mutate({
        mutation: createPostMutation(),
        variables: {
          id: 'e2',
          title: 'IT 4 Change Treffen',
          content: 'Wir sitzen eine Woche zusammen rum und glotzen uns blöde an.',
          categoryIds: ['cat5'],
          postType: 'Event',
          eventInput: {
            eventStart: new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() + 1,
            ).toISOString(),
            eventEnd: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 4).toISOString(),
            eventVenue: 'Ferienlager',
            eventLocationName: 'Bahra, Sachsen',
          },
        },
      }),
    ])

    let passedEvent = await neode.find('Post', 'e1')
    await passedEvent.update({ eventStart: new Date(2010, 8, 30, 10).toISOString() })
    passedEvent = await neode.find('Post', 'e2')
    await passedEvent.update({
      eventStart: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3).toISOString(),
    })

    // Create Posts (Articles)

    const [p0, p1, p3, p4, p5, p6, p9, p10, p11, p13, p14, p15] = await Promise.all([
      Factory.build(
        'post',
        {
          id: 'p0',
          language: sample(languages),
        },
        {
          categoryIds: ['cat16'],
          author: peterLustig,
          image: Factory.build('image', {
            url: faker.image.unsplash.food(300, 169),
            sensitive: true,
            aspectRatio: 300 / 169,
          }),
        },
      ),
      Factory.build(
        'post',
        {
          id: 'p1',
          language: sample(languages),
        },
        {
          categoryIds: ['cat1'],
          author: bobDerBaumeister,
          image: Factory.build('image', {
            url: faker.image.unsplash.technology(300, 1500),
            aspectRatio: 300 / 1500,
          }),
        },
      ),
      Factory.build(
        'post',
        {
          id: 'p3',
          language: sample(languages),
        },
        {
          categoryIds: ['cat3'],
          author: huey,
        },
      ),
      Factory.build(
        'post',
        {
          id: 'p4',
          language: sample(languages),
        },
        {
          categoryIds: ['cat4'],
          author: dewey,
        },
      ),
      Factory.build(
        'post',
        {
          id: 'p5',
          language: sample(languages),
        },
        {
          categoryIds: ['cat5'],
          author: louie,
        },
      ),
      Factory.build(
        'post',
        {
          id: 'p6',
          language: sample(languages),
        },
        {
          categoryIds: ['cat6'],
          author: peterLustig,
          image: Factory.build('image', {
            url: faker.image.unsplash.buildings(300, 857),
            aspectRatio: 300 / 857,
          }),
        },
      ),
      Factory.build(
        'post',
        {
          id: 'p9',
          language: sample(languages),
        },
        {
          categoryIds: ['cat9'],
          author: huey,
        },
      ),
      Factory.build(
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
      ),
      Factory.build(
        'post',
        {
          id: 'p11',
          language: sample(languages),
        },
        {
          categoryIds: ['cat11'],
          author: louie,
          image: Factory.build('image', {
            url: faker.image.unsplash.people(300, 901),
            aspectRatio: 300 / 901,
          }),
        },
      ),
      Factory.build(
        'post',
        {
          id: 'p13',
          language: sample(languages),
        },
        {
          categoryIds: ['cat13'],
          author: bobDerBaumeister,
        },
      ),
      Factory.build(
        'post',
        {
          id: 'p14',
          language: sample(languages),
        },
        {
          categoryIds: ['cat14'],
          author: jennyRostock,
          image: Factory.build('image', {
            url: faker.image.unsplash.objects(300, 200),
            aspectRatio: 300 / 450,
          }),
        },
      ),
      Factory.build(
        'post',
        {
          id: 'p15',
          language: sample(languages),
        },
        {
          categoryIds: ['cat15'],
          author: huey,
        },
      ),
    ])

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

    await Promise.all([
      mutate({
        mutation: createPostMutation(),
        variables: {
          id: 'p2',
          title: `Nature Philosophy Yoga`,
          content: hashtag1,
          categoryIds: ['cat2'],
        },
      }),
      mutate({
        mutation: createPostMutation(),
        variables: {
          id: 'p7',
          title: 'This is post #7',
          content: `${mention1} ${faker.lorem.paragraph()}`,
          categoryIds: ['cat7'],
        },
      }),
      mutate({
        mutation: createPostMutation(),
        variables: {
          id: 'p8',
          image: faker.image.unsplash.nature(),
          title: `Quantum Flow Theory explains Quantum Gravity`,
          content: hashtagAndMention1,
          categoryIds: ['cat8'],
        },
      }),
      mutate({
        mutation: createPostMutation(),
        variables: {
          id: 'p12',
          title: 'This is post #12',
          content: `${mention2} ${faker.lorem.paragraph()}`,
          categoryIds: ['cat12'],
        },
      }),
    ])
    const [p2, p7, p8, p12] = await Promise.all(
      ['p2', 'p7', 'p8', 'p12'].map((id) => neode.find('Post', id)),
    )
    authenticatedUser = null

    authenticatedUser = await dewey.toJson()
    const mentionInComment1 =
      'I heard <a class="mention" data-mention-id="u3" href="/profile/u3">@jenny-rostock</a> has practiced it for 3 years now.'
    const mentionInComment2 =
      'Did <a class="mention" data-mention-id="u1" href="/profile/u1">@peter-lustig</a> tell you?'
    await Promise.all([
      mutate({
        mutation: createCommentMutation,
        variables: {
          id: 'c4',
          postId: 'p2',
          content: mentionInComment1,
        },
      }),
      mutate({
        mutation: createCommentMutation,
        variables: {
          id: 'c4-1',
          postId: 'p2',
          content: mentionInComment2,
        },
      }),
      mutate({
        mutation: createCommentMutation,
        variables: {
          postId: 'p14',
          content: faker.lorem.paragraph(),
        },
      }), // should send a notification
    ])
    authenticatedUser = null

    const comments = await Promise.all([
      Factory.build(
        'comment',
        {
          id: 'c1',
        },
        {
          author: jennyRostock,
          postId: 'p1',
        },
      ),
      Factory.build(
        'comment',
        {
          id: 'c2',
        },
        {
          author: huey,
          postId: 'p1',
        },
      ),
      Factory.build(
        'comment',
        {
          id: 'c3',
        },
        {
          author: louie,
          postId: 'p3',
        },
      ),
      Factory.build(
        'comment',
        {
          id: 'c5',
        },
        {
          author: jennyRostock,
          postId: 'p3',
        },
      ),
      Factory.build(
        'comment',
        {
          id: 'c6',
        },
        {
          author: peterLustig,
          postId: 'p4',
        },
      ),
      Factory.build(
        'comment',
        {
          id: 'c7',
        },
        {
          author: jennyRostock,
          postId: 'p2',
        },
      ),
      Factory.build(
        'comment',
        {
          id: 'c8',
        },
        {
          author: huey,
          postId: 'p15',
        },
      ),
      Factory.build(
        'comment',
        {
          id: 'c9',
        },
        {
          author: dewey,
          postId: 'p15',
        },
      ),
      Factory.build(
        'comment',
        {
          id: 'c10',
        },
        {
          author: louie,
          postId: 'p15',
        },
      ),
      Factory.build(
        'comment',
        {
          id: 'c11',
        },
        {
          author: jennyRostock,
          postId: 'p15',
        },
      ),
      Factory.build(
        'comment',
        {
          id: 'c12',
        },
        {
          author: jennyRostock,
          postId: 'p15',
        },
      ),
    ])

    const trollingComment = comments[0]

    await Promise.all([
      democracy.relateTo(p3, 'post'),
      democracy.relateTo(p11, 'post'),
      democracy.relateTo(p15, 'post'),
      democracy.relateTo(p7, 'post'),
      environment.relateTo(p1, 'post'),
      environment.relateTo(p5, 'post'),
      environment.relateTo(p9, 'post'),
      environment.relateTo(p13, 'post'),
      freedom.relateTo(p0, 'post'),
      freedom.relateTo(p4, 'post'),
      freedom.relateTo(p8, 'post'),
      freedom.relateTo(p12, 'post'),
      nature.relateTo(p2, 'post'),
      nature.relateTo(p6, 'post'),
      nature.relateTo(p10, 'post'),
      nature.relateTo(p14, 'post'),
      peterLustig.relateTo(p15, 'emoted', { emotion: 'surprised' }),
      bobDerBaumeister.relateTo(p15, 'emoted', { emotion: 'surprised' }),
      jennyRostock.relateTo(p15, 'emoted', { emotion: 'surprised' }),
      huey.relateTo(p15, 'emoted', { emotion: 'surprised' }),
      dewey.relateTo(p15, 'emoted', { emotion: 'surprised' }),
      louie.relateTo(p15, 'emoted', { emotion: 'surprised' }),
      dagobert.relateTo(p15, 'emoted', { emotion: 'surprised' }),
      bobDerBaumeister.relateTo(p14, 'emoted', { emotion: 'cry' }),
      jennyRostock.relateTo(p13, 'emoted', { emotion: 'angry' }),
      huey.relateTo(p12, 'emoted', { emotion: 'funny' }),
      dewey.relateTo(p11, 'emoted', { emotion: 'surprised' }),
      louie.relateTo(p10, 'emoted', { emotion: 'cry' }),
      dewey.relateTo(p9, 'emoted', { emotion: 'happy' }),
      huey.relateTo(p8, 'emoted', { emotion: 'angry' }),
      jennyRostock.relateTo(p7, 'emoted', { emotion: 'funny' }),
      bobDerBaumeister.relateTo(p6, 'emoted', { emotion: 'surprised' }),
      peterLustig.relateTo(p5, 'emoted', { emotion: 'cry' }),
      bobDerBaumeister.relateTo(p4, 'emoted', { emotion: 'happy' }),
      jennyRostock.relateTo(p3, 'emoted', { emotion: 'angry' }),
      huey.relateTo(p2, 'emoted', { emotion: 'funny' }),
      dewey.relateTo(p1, 'emoted', { emotion: 'surprised' }),
      louie.relateTo(p0, 'emoted', { emotion: 'cry' }),
    ])

    await Promise.all([
      peterLustig.relateTo(p1, 'shouted'),
      peterLustig.relateTo(p6, 'shouted'),
      bobDerBaumeister.relateTo(p0, 'shouted'),
      bobDerBaumeister.relateTo(p6, 'shouted'),
      jennyRostock.relateTo(p6, 'shouted'),
      jennyRostock.relateTo(p7, 'shouted'),
      huey.relateTo(p8, 'shouted'),
      huey.relateTo(p9, 'shouted'),
      dewey.relateTo(p10, 'shouted'),
      peterLustig.relateTo(p2, 'shouted'),
      peterLustig.relateTo(p6, 'shouted'),
      bobDerBaumeister.relateTo(p0, 'shouted'),
      bobDerBaumeister.relateTo(p6, 'shouted'),
      jennyRostock.relateTo(p6, 'shouted'),
      jennyRostock.relateTo(p7, 'shouted'),
      huey.relateTo(p8, 'shouted'),
      huey.relateTo(p9, 'shouted'),
      louie.relateTo(p10, 'shouted'),
    ])

    const reports = await Promise.all([
      Factory.build('report'),
      Factory.build('report'),
      Factory.build('report'),
      Factory.build('report'),
    ])
    const reportAgainstDagobert = reports[0]
    const reportAgainstTrollingPost = reports[1]
    const reportAgainstTrollingComment = reports[2]
    const reportAgainstDewey = reports[3]

    // report resource first time
    await Promise.all([
      reportAgainstDagobert.relateTo(jennyRostock, 'filed', {
        resourceId: 'u7',
        reasonCategory: 'discrimination_etc',
        reasonDescription: 'This user is harassing me with bigoted remarks!',
      }),
      reportAgainstDagobert.relateTo(dagobert, 'belongsTo'),
      reportAgainstTrollingPost.relateTo(jennyRostock, 'filed', {
        resourceId: 'p2',
        reasonCategory: 'doxing',
        reasonDescription: "This shouldn't be shown to anybody else! It's my private thing!",
      }),
      reportAgainstTrollingPost.relateTo(p2, 'belongsTo'),
      reportAgainstTrollingComment.relateTo(huey, 'filed', {
        resourceId: 'c1',
        reasonCategory: 'other',
        reasonDescription: 'This comment is bigoted',
      }),
      reportAgainstTrollingComment.relateTo(trollingComment, 'belongsTo'),
      reportAgainstDewey.relateTo(dagobert, 'filed', {
        resourceId: 'u5',
        reasonCategory: 'discrimination_etc',
        reasonDescription: 'This user is harassing me!',
      }),
      reportAgainstDewey.relateTo(dewey, 'belongsTo'),
    ])

    // report resource a second time
    await Promise.all([
      reportAgainstDagobert.relateTo(louie, 'filed', {
        resourceId: 'u7',
        reasonCategory: 'discrimination_etc',
        reasonDescription: 'this user is attacking me for who I am!',
      }),
      reportAgainstDagobert.relateTo(dagobert, 'belongsTo'),
      reportAgainstTrollingPost.relateTo(peterLustig, 'filed', {
        resourceId: 'p2',
        reasonCategory: 'discrimination_etc',
        reasonDescription: 'This post is bigoted',
      }),
      reportAgainstTrollingPost.relateTo(p2, 'belongsTo'),

      reportAgainstTrollingComment.relateTo(bobDerBaumeister, 'filed', {
        resourceId: 'c1',
        reasonCategory: 'pornographic_content_links',
        reasonDescription: 'This comment is porno!!!',
      }),
      reportAgainstTrollingComment.relateTo(trollingComment, 'belongsTo'),
    ])

    const disableVariables = {
      resourceId: 'undefined-resource',
      disable: true,
      closed: false,
    }

    // review resource first time
    await Promise.all([
      reportAgainstDagobert.relateTo(bobDerBaumeister, 'reviewed', {
        ...disableVariables,
        resourceId: 'u7',
      }),
      dagobert.update({ disabled: true, updatedAt: new Date().toISOString() }),
      reportAgainstTrollingPost.relateTo(peterLustig, 'reviewed', {
        ...disableVariables,
        resourceId: 'p2',
      }),
      p2.update({ disabled: true, updatedAt: new Date().toISOString() }),
      reportAgainstTrollingComment.relateTo(bobDerBaumeister, 'reviewed', {
        ...disableVariables,
        resourceId: 'c1',
      }),
      trollingComment.update({ disabled: true, updatedAt: new Date().toISOString() }),
    ])

    // second review of resource and close report
    await Promise.all([
      reportAgainstDagobert.relateTo(peterLustig, 'reviewed', {
        resourceId: 'u7',
        disable: false,
        closed: true,
      }),
      dagobert.update({ disabled: false, updatedAt: new Date().toISOString(), closed: true }),
      reportAgainstTrollingPost.relateTo(bobDerBaumeister, 'reviewed', {
        resourceId: 'p2',
        disable: true,
        closed: true,
      }),
      p2.update({ disabled: true, updatedAt: new Date().toISOString(), closed: true }),
      reportAgainstTrollingComment.relateTo(peterLustig, 'reviewed', {
        ...disableVariables,
        resourceId: 'c1',
        disable: true,
        closed: true,
      }),
      trollingComment.update({ disabled: true, updatedAt: new Date().toISOString(), closed: true }),
    ])

    const additionalUsers = await Promise.all(
      [...Array(30).keys()].map(() => Factory.build('user')),
    )

    await Promise.all(
      additionalUsers.map(async (user) => {
        await jennyRostock.relateTo(user, 'following')
        await user.relateTo(jennyRostock, 'following')
      }),
    )

    await Promise.all(
      [...Array(30).keys()].map((index) => Factory.build('user', { name: `Jenny${index}` })),
    )

    await Promise.all(
      [...Array(30).keys()].map(() =>
        Factory.build(
          'post',
          { content: `Jenny ${faker.lorem.sentence()}` },
          {
            categoryIds: ['cat1'],
            author: jennyRostock,
            image: Factory.build('image', {
              url: faker.image.unsplash.objects(),
            }),
          },
        ),
      ),
    )

    await Promise.all(
      [...Array(30).keys()].map(() =>
        Factory.build(
          'post',
          {},
          {
            categoryIds: ['cat1'],
            author: jennyRostock,
            image: Factory.build('image', {
              url: faker.image.unsplash.objects(),
            }),
          },
        ),
      ),
    )

    await Promise.all(
      [...Array(6).keys()].map(() =>
        Factory.build(
          'comment',
          {},
          {
            author: jennyRostock,
            postId: 'p2',
          },
        ),
      ),
    )

    await Promise.all(
      [...Array(4).keys()].map(() =>
        Factory.build(
          'comment',
          {},
          {
            author: jennyRostock,
            postId: 'p15',
          },
        ),
      ),
    )

    await Promise.all(
      [...Array(2).keys()].map(() =>
        Factory.build(
          'comment',
          {},
          {
            author: jennyRostock,
            postId: 'p4',
          },
        ),
      ),
    )

    await Promise.all(
      [...Array(21).keys()].map(() =>
        Factory.build(
          'post',
          {},
          {
            categoryIds: ['cat1'],
            author: peterLustig,
            image: Factory.build('image', {
              url: faker.image.unsplash.buildings(),
            }),
          },
        ),
      ),
    )

    await Promise.all(
      [...Array(3).keys()].map(() =>
        Factory.build(
          'comment',
          {},
          {
            author: peterLustig,
            postId: 'p4',
          },
        ),
      ),
    )

    await Promise.all(
      [...Array(3).keys()].map(() =>
        Factory.build(
          'comment',
          {},
          {
            author: peterLustig,
            postId: 'p14',
          },
        ),
      ),
    )

    await Promise.all(
      [...Array(6).keys()].map(() =>
        Factory.build(
          'comment',
          {},
          {
            author: peterLustig,
            postId: 'p0',
          },
        ),
      ),
    )

    await Promise.all(
      [...Array(11).keys()].map(() =>
        Factory.build(
          'post',
          {},
          {
            categoryIds: ['cat1'],
            author: dewey,
            image: Factory.build('image', {
              url: faker.image.unsplash.food(),
            }),
          },
        ),
      ),
    )

    await Promise.all(
      [...Array(7).keys()].map(() =>
        Factory.build(
          'comment',
          {},
          {
            author: dewey,
            postId: 'p2',
          },
        ),
      ),
    )

    await Promise.all(
      [...Array(5).keys()].map(() =>
        Factory.build(
          'comment',
          {},
          {
            author: dewey,
            postId: 'p6',
          },
        ),
      ),
    )

    await Promise.all(
      [...Array(2).keys()].map(() =>
        Factory.build(
          'comment',
          {},
          {
            author: dewey,
            postId: 'p9',
          },
        ),
      ),
    )

    await Promise.all(
      [...Array(16).keys()].map(() =>
        Factory.build(
          'post',
          {},
          {
            categoryIds: ['cat1'],
            author: louie,
            image: Factory.build('image', {
              url: faker.image.unsplash.technology(),
            }),
          },
        ),
      ),
    )

    await Promise.all(
      [...Array(4).keys()].map(() =>
        Factory.build(
          'comment',
          {},
          {
            postId: 'p1',
            author: louie,
          },
        ),
      ),
    )

    await Promise.all(
      [...Array(8).keys()].map(() =>
        Factory.build(
          'comment',
          {},
          {
            author: louie,
            postId: 'p10',
          },
        ),
      ),
    )

    await Promise.all(
      [...Array(5).keys()].map(() =>
        Factory.build(
          'comment',
          {},
          {
            author: louie,
            postId: 'p13',
          },
        ),
      ),
    )

    await Promise.all(
      [...Array(45).keys()].map(() =>
        Factory.build(
          'post',
          {},
          {
            categoryIds: ['cat1'],
            author: bobDerBaumeister,
            image: Factory.build('image', {
              url: faker.image.unsplash.people(),
            }),
          },
        ),
      ),
    )

    await Promise.all(
      [...Array(2).keys()].map(() =>
        Factory.build(
          'comment',
          {},
          {
            author: bobDerBaumeister,
            postId: 'p2',
          },
        ),
      ),
    )

    await Promise.all(
      [...Array(3).keys()].map(() =>
        Factory.build(
          'comment',
          {},
          {
            author: bobDerBaumeister,
            postId: 'p12',
          },
        ),
      ),
    )

    await Promise.all(
      [...Array(7).keys()].map(() =>
        Factory.build(
          'comment',
          {},
          {
            author: bobDerBaumeister,
            postId: 'p13',
          },
        ),
      ),
    )

    await Promise.all(
      [...Array(8).keys()].map(() =>
        Factory.build(
          'post',
          {},
          {
            categoryIds: ['cat1'],
            author: huey,
            image: Factory.build('image', {
              url: faker.image.unsplash.nature(),
            }),
          },
        ),
      ),
    )

    await Promise.all(
      [...Array(6).keys()].map(() =>
        Factory.build(
          'comment',
          {},
          {
            author: huey,
            postId: 'p0',
          },
        ),
      ),
    )

    await Promise.all(
      [...Array(8).keys()].map(() =>
        Factory.build(
          'comment',
          {},
          {
            author: huey,
            postId: 'p13',
          },
        ),
      ),
    )

    await Promise.all(
      [...Array(8).keys()].map(() =>
        Factory.build(
          'comment',
          {},
          {
            author: huey,
            postId: 'p15',
          },
        ),
      ),
    )

    await Factory.build('donations')
    /* eslint-disable-next-line no-console */
    console.log('Seeded Data...')
    await driver.close()
    await neode.close()
    process.exit(0)
  } catch (err) {
    /* eslint-disable-next-line no-console */
    console.error(err)
    process.exit(1)
  }
})()
/* eslint-enable no-multi-spaces */
