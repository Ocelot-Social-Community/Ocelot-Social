import Factory from '@db/factories'

export const badges = async () => {
  return {
    // Blue Animals
    badgeBear: await Factory.build('badge', {
      id: 'badge_bear',
      type: 'badge',
      description: 'You earned a Bear',
      icon: '/img/badges/badge_blue_bear.svg',
    }),
    badgePanda: await Factory.build('badge', {
      id: 'badge_panda',
      type: 'badge',
      description: 'You earned a Panda',
      icon: '/img/badges/badge_blue_panda.svg',
    }),
    badgeRabbit: await Factory.build('badge', {
      id: 'badge_rabbit',
      type: 'badge',
      description: 'You earned a Rabbit',
      icon: '/img/badges/badge_blue_rabbit.svg',
    }),
    badgeRacoon: await Factory.build('badge', {
      id: 'badge_racoon',
      type: 'badge',
      description: 'You earned a Racoon',
      icon: '/img/badges/badge_blue_racoon.svg',
    }),
    badgeRhino: await Factory.build('badge', {
      id: 'badge_rhino',
      type: 'badge',
      description: 'You earned a Rhino',
      icon: '/img/badges/badge_blue_rhino.svg',
    }),
    badgeTiger: await Factory.build('badge', {
      id: 'badge_tiger',
      type: 'badge',
      description: 'You earned a Tiger',
      icon: '/img/badges/badge_blue_tiger.svg',
    }),
    badgeTurtle: await Factory.build('badge', {
      id: 'badge_turtle',
      type: 'badge',
      description: 'You earned a Turtle',
      icon: '/img/badges/badge_blue_turtle.svg',
    }),
    badgeWhale: await Factory.build('badge', {
      id: 'badge_whale',
      type: 'badge',
      description: 'You earned a Whale',
      icon: '/img/badges/badge_blue_whale.svg',
    }),
    badgeWolf: await Factory.build('badge', {
      id: 'badge_wolf',
      type: 'badge',
      description: 'You earned a Wolf',
      icon: '/img/badges/badge_blue_wolf.svg',
    }),
    // Green Transports
    badgeAirship: await Factory.build('badge', {
      id: 'badge_airship',
      type: 'badge',
      description: 'You earned an Airship',
      icon: '/img/badges/badge_green_airship.svg',
    }),
    badgeAlienship: await Factory.build('badge', {
      id: 'badge_alienship',
      type: 'badge',
      description: 'You earned an Alienship',
      icon: '/img/badges/badge_green_alienship.svg',
    }),
    badgeBalloon: await Factory.build('badge', {
      id: 'badge_balloon',
      type: 'badge',
      description: 'You earned a Balloon',
      icon: '/img/badges/badge_green_balloon.svg',
    }),
    badgeBigballoon: await Factory.build('badge', {
      id: 'badge_bigballoon',
      type: 'badge',
      description: 'You earned a Big Balloon',
      icon: '/img/badges/badge_green_bigballoon.svg',
    }),
    badgeCrane: await Factory.build('badge', {
      id: 'badge_crane',
      type: 'badge',
      description: 'You earned a Crane',
      icon: '/img/badges/badge_green_crane.svg',
    }),
    badgeGlider: await Factory.build('badge', {
      id: 'badge_glider',
      type: 'badge',
      description: 'You earned a Glider',
      icon: '/img/badges/badge_green_glider.svg',
    }),
    badgeHelicopter: await Factory.build('badge', {
      id: 'badge_helicopter',
      type: 'badge',
      description: 'You earned a Helicopter',
      icon: '/img/badges/badge_green_helicopter.svg',
    }),
    // Green Animals
    badgeBee: await Factory.build('badge', {
      id: 'badge_bee',
      type: 'badge',
      description: 'You earned a Bee',
      icon: '/img/badges/badge_green_bee.svg',
    }),
    badgeButterfly: await Factory.build('badge', {
      id: 'badge_butterfly',
      type: 'badge',
      description: 'You earned a Butterfly',
      icon: '/img/badges/badge_green_butterfly.svg',
    }),
    // Green Plants
    badgeFlower: await Factory.build('badge', {
      id: 'badge_flower',
      type: 'badge',
      description: 'You earned a Flower',
      icon: '/img/badges/badge_green_flower.svg',
    }),
    badgeLifetree: await Factory.build('badge', {
      id: 'badge_lifetree',
      type: 'badge',
      description: 'You earned the tree of life',
      icon: '/img/badges/badge_green_lifetree.svg',
    }),
    // Green Misc
    badgeDoublerainbow: await Factory.build('badge', {
      id: 'badge_doublerainbow',
      type: 'badge',
      description: 'You earned the Double Rainbow',
      icon: '/img/badges/badge_green_doublerainbow.svg',
    }),
    badgeEndrainbow: await Factory.build('badge', {
      id: 'badge_endrainbow',
      type: 'badge',
      description: 'You earned the End of the Rainbow',
      icon: '/img/badges/badge_green_endrainbow.svg',
    }),
    badgeMagicrainbow: await Factory.build('badge', {
      id: 'badge_magicrainbow',
      type: 'badge',
      description: 'You earned the Magic Rainbow',
      icon: '/img/badges/badge_green_magicrainbow.svg',
    }),
    badgeStarter: await Factory.build('badge', {
      id: 'badge_starter',
      type: 'badge',
      description: 'You earned the Starter Badge',
      icon: '/img/badges/badge_green_starter.svg',
    }),
    badgeSuperfounder: await Factory.build('badge', {
      id: 'badge_superfounder',
      type: 'badge',
      description: 'You earned the Super Founder Badge',
      icon: '/img/badges/badge_green_superfounder.svg',
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
      type: 'badge',
      description: 'You are an Administrator',
      icon: '/img/badges/verification_red_admin.svg',
    }),
    verificationDeveloper: await Factory.build('badge', {
      id: 'verification_developer',
      type: 'badge',
      description: 'You are a Developer',
      icon: '/img/badges/verification_red_developer.svg',
    }),
  }
}
