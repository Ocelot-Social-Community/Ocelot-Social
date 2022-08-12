import { getDriver } from '../neo4j'

export const description = `
  We add the categories back to the database: delete all present and add them new.
`

const categories = [
  {
    id: 'cat1',
    name: 'Just For Fun',
    slug: 'just-for-fun',
    icon: 'smile',
  },
  {
    id: 'cat2',
    name: 'Happiness & Values',
    slug: 'happiness-values',
    icon: 'heart-o',
  },
  {
    id: 'cat3',
    name: 'Health & Wellbeing',
    slug: 'health-wellbeing',
    icon: 'medkit',
  },
  {
    id: 'cat4',
    name: 'Environment & Nature',
    slug: 'environment-nature',
    icon: 'tree',
  },
  {
    id: 'cat5',
    name: 'Animal Protection',
    slug: 'animal-protection',
    icon: 'paw',
  },
  {
    id: 'cat6',
    name: 'Human Rights & Justice',
    slug: 'human-rights-justice',
    icon: 'balance-scale',
  },
  {
    id: 'cat7',
    name: 'Education & Sciences',
    slug: 'education-sciences',
    icon: 'graduation-cap',
  },
  {
    id: 'cat8',
    name: 'Cooperation & Development',
    slug: 'cooperation-development',
    icon: 'users',
  },
  {
    id: 'cat9',
    name: 'Democracy & Politics',
    slug: 'democracy-politics',
    icon: 'university',
  },
  {
    id: 'cat10',
    name: 'Economy & Finances',
    slug: 'economy-finances',
    icon: 'money',
  },
  {
    id: 'cat11',
    name: 'Energy & Technology',
    slug: 'energy-technology',
    icon: 'flash',
  },
  {
    id: 'cat12',
    name: 'IT, Internet & Data Privacy',
    slug: 'it-internet-data-privacy',
    icon: 'mouse-pointer',
  },
  {
    id: 'cat13',
    name: 'Art, Culture & Sport',
    slug: 'art-culture-sport',
    icon: 'paint-brush',
  },
  {
    id: 'cat14',
    name: 'Freedom of Speech',
    slug: 'freedom-of-speech',
    icon: 'bullhorn',
  },
  {
    id: 'cat15',
    name: 'Consumption & Sustainability',
    slug: 'consumption-sustainability',
    icon: 'shopping-cart',
  },
  {
    id: 'cat16',
    name: 'Global Peace & Nonviolence',
    slug: 'global-peace-nonviolence',
    icon: 'angellist',
  },
]

export async function up(next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()

  try {
    // Implement your migration here.
    await transaction.run(`
      MATCH (category:Category)
      DETACH DELETE category
    `)
    categories.forEach(async (category) => {
      await transaction.run(`
        MERGE (category:Category { id: "${category.id}" })
        ON CREATE SET
        category.name      = "${category.name}",
        category.slug      = "${category.slug}",
        category.icon      = "${category.icon}",
        category.createdAt = toString(datetime()),
        category.updatedAt = category.createdAt
      `)
    })
    await transaction.commit()
    next()
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error)
    await transaction.rollback()
    // eslint-disable-next-line no-console
    console.log('rolled back')
    throw new Error(error)
  } finally {
    session.close()
  }
}

export async function down(next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()

  try {
    // Implement your migration here.
    await transaction.run(`
      MATCH (category:Category)
      DETACH DELETE category
    `)
    await transaction.commit()
    next()
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error)
    await transaction.rollback()
    // eslint-disable-next-line no-console
    console.log('rolled back')
    throw new Error(error)
  } finally {
    session.close()
  }
}
