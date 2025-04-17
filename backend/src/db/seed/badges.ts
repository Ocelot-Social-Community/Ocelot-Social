import Factory from '@db/factories'

export const trophies = async () => {
  return {
    // Blue Animals
    trophyBear: await Factory.build('badge', {
      id: 'trophy_bear',
      type: 'trophy',
      description: 'You earned a Bear',
      icon: '/img/badges/trophy_blue_bear.svg',
    }),
    trophyPanda: await Factory.build('badge', {
      id: 'trophy_panda',
      type: 'trophy',
      description: 'You earned a Panda',
      icon: '/img/badges/trophy_blue_panda.svg',
    }),
    trophyRabbit: await Factory.build('badge', {
      id: 'trophy_rabbit',
      type: 'trophy',
      description: 'You earned a Rabbit',
      icon: '/img/badges/trophy_blue_rabbit.svg',
    }),
    trophyRacoon: await Factory.build('badge', {
      id: 'trophy_racoon',
      type: 'trophy',
      description: 'You earned a Racoon',
      icon: '/img/badges/trophy_blue_racoon.svg',
    }),
    trophyRhino: await Factory.build('badge', {
      id: 'trophy_rhino',
      type: 'trophy',
      description: 'You earned a Rhino',
      icon: '/img/badges/trophy_blue_rhino.svg',
    }),
    trophyTiger: await Factory.build('badge', {
      id: 'trophy_tiger',
      type: 'trophy',
      description: 'You earned a Tiger',
      icon: '/img/badges/trophy_blue_tiger.svg',
    }),
    trophyTurtle: await Factory.build('badge', {
      id: 'trophy_turtle',
      type: 'trophy',
      description: 'You earned a Turtle',
      icon: '/img/badges/trophy_blue_turtle.svg',
    }),
    trophyWhale: await Factory.build('badge', {
      id: 'trophy_whale',
      type: 'trophy',
      description: 'You earned a Whale',
      icon: '/img/badges/trophy_blue_whale.svg',
    }),
    trophyWolf: await Factory.build('badge', {
      id: 'trophy_wolf',
      type: 'trophy',
      description: 'You earned a Wolf',
      icon: '/img/badges/trophy_blue_wolf.svg',
    }),
    // Green Transports
    trophyAirship: await Factory.build('badge', {
      id: 'trophy_airship',
      type: 'trophy',
      description: 'You earned an Airship',
      icon: '/img/badges/trophy_green_airship.svg',
    }),
    trophyAlienship: await Factory.build('badge', {
      id: 'trophy_alienship',
      type: 'trophy',
      description: 'You earned an Alienship',
      icon: '/img/badges/trophy_green_alienship.svg',
    }),
    trophyBalloon: await Factory.build('badge', {
      id: 'trophy_balloon',
      type: 'trophy',
      description: 'You earned a Balloon',
      icon: '/img/badges/trophy_green_balloon.svg',
    }),
    trophyBigballoon: await Factory.build('badge', {
      id: 'trophy_bigballoon',
      type: 'trophy',
      description: 'You earned a Big Balloon',
      icon: '/img/badges/trophy_green_bigballoon.svg',
    }),
    trophyCrane: await Factory.build('badge', {
      id: 'trophy_crane',
      type: 'trophy',
      description: 'You earned a Crane',
      icon: '/img/badges/trophy_green_crane.svg',
    }),
    trophyGlider: await Factory.build('badge', {
      id: 'trophy_glider',
      type: 'trophy',
      description: 'You earned a Glider',
      icon: '/img/badges/trophy_green_glider.svg',
    }),
    trophyHelicopter: await Factory.build('badge', {
      id: 'trophy_helicopter',
      type: 'trophy',
      description: 'You earned a Helicopter',
      icon: '/img/badges/trophy_green_helicopter.svg',
    }),
    // Green Animals
    trophyBee: await Factory.build('badge', {
      id: 'trophy_bee',
      type: 'trophy',
      description: 'You earned a Bee',
      icon: '/img/badges/trophy_green_bee.svg',
    }),
    trophyButterfly: await Factory.build('badge', {
      id: 'trophy_butterfly',
      type: 'trophy',
      description: 'You earned a Butterfly',
      icon: '/img/badges/trophy_green_butterfly.svg',
    }),
    // Green Plants
    trophyFlower: await Factory.build('badge', {
      id: 'trophy_flower',
      type: 'trophy',
      description: 'You earned a Flower',
      icon: '/img/badges/trophy_green_flower.svg',
    }),
    trophyLifetree: await Factory.build('badge', {
      id: 'trophy_lifetree',
      type: 'trophy',
      description: 'You earned the tree of life',
      icon: '/img/badges/trophy_green_lifetree.svg',
    }),
    // Green Misc
    trophyDoublerainbow: await Factory.build('badge', {
      id: 'trophy_doublerainbow',
      type: 'trophy',
      description: 'You earned the Double Rainbow',
      icon: '/img/badges/trophy_green_doublerainbow.svg',
    }),
    trophyEndrainbow: await Factory.build('badge', {
      id: 'trophy_endrainbow',
      type: 'trophy',
      description: 'You earned the End of the Rainbow',
      icon: '/img/badges/trophy_green_endrainbow.svg',
    }),
    trophyMagicrainbow: await Factory.build('badge', {
      id: 'trophy_magicrainbow',
      type: 'trophy',
      description: 'You earned the Magic Rainbow',
      icon: '/img/badges/trophy_green_magicrainbow.svg',
    }),
    trophyStarter: await Factory.build('badge', {
      id: 'trophy_starter',
      type: 'trophy',
      description: 'You earned the Starter Badge',
      icon: '/img/badges/trophy_green_starter.svg',
    }),
    trophySuperfounder: await Factory.build('badge', {
      id: 'trophy_superfounder',
      type: 'trophy',
      description: 'You earned the Super Founder Badge',
      icon: '/img/badges/trophy_green_superfounder.svg',
    }),
  }
}

export const verification = async () => {
  return {
    // Red Role
    verificationModerator: await Factory.build('badge', {
      id: 'verification_moderator',
      type: 'verification',
      description: 'You are a Moderator',
      icon: '/img/badges/verification_red_moderator.svg',
    }),
    verificationAdmin: await Factory.build('badge', {
      id: 'verification_admin',
      type: 'verification',
      description: 'You are an Administrator',
      icon: '/img/badges/verification_red_admin.svg',
    }),
    verificationDeveloper: await Factory.build('badge', {
      id: 'verification_developer',
      type: 'verification',
      description: 'You are a Developer',
      icon: '/img/badges/verification_red_developer.svg',
    }),
  }
}
