import get from 'lodash/get'
import update from 'lodash/update'
import xor from 'lodash/xor'
import isEmpty from 'lodash/isEmpty'
import isEqual from 'lodash/isEqual'
import clone from 'lodash/clone'

const defaultFilter = {}
const filterPostTypes = ['Article', 'Event']
const orderByTypes = {
  creationDate: ['createdAt_asc', 'createdAt_desc'],
  startDate: ['eventStart_asc', 'eventStart_desc'],
}

export const state = () => {
  return {
    filter: {
      ...defaultFilter,
    },
    order: 'createdAt_desc',
    eventsEnded: null,
  }
}

const TOGGLE_POST_TYPE = (state, postType) => {
  const filter = clone(state.filter)
  if (postType && !(filter.postType_in && filter.postType_in.includes(postType))) {
    filter.postType_in = [postType]
    if (postType === 'Event') {
      filter.eventStart_gte = new Date()
      state.order = 'eventStart_asc'
    } else {
      delete filter.eventStart_gte
      state.order = 'createdAt_desc'
    }
  } else {
    delete filter.eventStart_gte
    delete filter.postType_in
    state.order = 'createdAt_desc'
  }
  state.filter = filter
}

const TOGGLE_UNSET_ALL_POST_TYPES_FILTERS = (state) => {
  const beforeEventSetInPostTypeFilter = eventSetInPostTypeFilter(state)
  filterPostTypes.forEach((postType) => {
    if (filteredPostTypes(state).includes(postType)) TOGGLE_POST_TYPE(state, postType)
  })
  adjustEventsEnded(state, beforeEventSetInPostTypeFilter)
  adjustOrder(state)
}
const TOGGLE_SET_UNSET_POST_TYPE_FILTER = (state, setPostType) => {
  const beforeEventSetInPostTypeFilter = eventSetInPostTypeFilter(state)
  if (noneSetInPostTypeFilter(state)) {
    if (setPostType !== 'All') TOGGLE_POST_TYPE(state, setPostType)
  } else {
    if (setPostType !== 'All') {
      if (filteredPostTypes(state).includes(setPostType)) {
        TOGGLE_UNSET_ALL_POST_TYPES_FILTERS(state)
      } else {
        // if 'setPostType' is not set then set it and unset all others
        TOGGLE_POST_TYPE(state, setPostType)
        filterPostTypes.forEach((postType) => {
          if (postType !== setPostType && filteredPostTypes(state).includes(postType))
            TOGGLE_POST_TYPE(state, postType)
        })
      }
    } else {
      TOGGLE_UNSET_ALL_POST_TYPES_FILTERS(state)
    }
  }
  adjustEventsEnded(state, beforeEventSetInPostTypeFilter)
  adjustOrder(state)
}
const TOGGLE_EVENTS_ENDED = (state) => {
  if (state.filter.eventStart_gte) {
    delete state.filter.eventStart_gte
  } else {
    if (state.filter.postType_in && state.filter.postType_in.includes('Event')) {
      state.filter.eventStart_gte = new Date()
    }
  }
}

const TOGGLE_ORDER = (state, value) => {
  state.order = value
}
const adjustEventsEnded = (state, beforeEventSetInPostTypeFilter) => {
  if (eventSetInPostTypeFilter(state) !== beforeEventSetInPostTypeFilter) {
    if (eventSetInPostTypeFilter(state)) {
      TOGGLE_EVENTS_ENDED(state, true)
    } else {
      TOGGLE_EVENTS_ENDED(state, false)
    }
  }
}
const adjustOrder = (state) => {
  if (orderedByCreationDate(state)) {
    if (!orderByTypes.creationDate.includes(orderBy(state))) {
      TOGGLE_ORDER(state, 'createdAt_desc')
    }
  } else {
    if (!orderByTypes.startDate.includes(orderBy(state))) {
      TOGGLE_ORDER(state, 'eventStart_asc')
    }
  }
}

const filteredPostTypes = (state) => {
  return get(state.filter, 'postType_in') || []
}
const noneSetInPostTypeFilter = (state) => {
  return !articleSetInPostTypeFilter(state) && !eventSetInPostTypeFilter(state)
}
const articleSetInPostTypeFilter = (state) => {
  return filteredPostTypes(state).includes('Article')
}
const eventSetInPostTypeFilter = (state) => {
  return filteredPostTypes(state).includes('Event')
}
const orderedByCreationDate = (state) => {
  return noneSetInPostTypeFilter(state) || articleSetInPostTypeFilter(state)
}
const orderBy = (state) => {
  return state.order
}

export const mutations = {
  TOGGLE_FILTER_BY_FOLLOWED(state, currentUserId) {
    const filter = clone(state.filter)
    const id = get(filter, 'author.followedBy_some.id')
    if (id) {
      delete filter.author
      state.filter = filter
    } else {
      state.filter = {
        ...filter,
        author: { followedBy_some: { id: currentUserId } },
      }
    }
  },
  TOGGLE_FILTER_BY_MY_GROUPS(state) {
    const filter = clone(state.filter)
    if (get(filter, 'postsInMyGroups')) {
      delete filter.postsInMyGroups
      state.filter = filter
    } else {
      state.filter = {
        ...filter,
        postsInMyGroups: true,
      }
    }
  },
  RESET_CATEGORIES(state) {
    const filter = clone(state.filter)
    delete filter.categories_some
    state.filter = filter
  },
  RESET_EMOTIONS(state) {
    const filter = clone(state.filter)
    delete filter.emotions_some
    state.filter = filter
  },
  RESET_LANGUAGES(state) {
    const filter = clone(state.filter)
    delete filter.language_in
    state.filter = filter
  },
  TOGGLE_CATEGORY(state, categoryId) {
    const filter = clone(state.filter)
    update(filter, 'categories_some.id_in', (categoryIds) => xor(categoryIds, [categoryId]))
    if (isEmpty(get(filter, 'categories_some.id_in'))) delete filter.categories_some
    state.filter = filter
  },
  TOGGLE_LANGUAGE(state, languageCode) {
    const filter = clone(state.filter)
    update(filter, 'language_in', (languageCodes) => xor(languageCodes, [languageCode]))
    if (isEmpty(get(filter, 'language_in'))) delete filter.language_in
    state.filter = filter
  },
  TOGGLE_EMOTION(state, emotion) {
    const filter = clone(state.filter)
    update(filter, 'emotions_some.emotion_in', (emotions) => xor(emotions, [emotion]))
    if (isEmpty(get(filter, 'emotions_some.emotion_in'))) delete filter.emotions_some
    state.filter = filter
  },
  TOGGLE_POST_TYPE,
  TOGGLE_UNSET_ALL_POST_TYPES_FILTERS,
  TOGGLE_SET_UNSET_POST_TYPE_FILTER,
  TOGGLE_EVENTS_ENDED,
  TOGGLE_ORDER,
}

export const getters = {
  isActive(state) {
    return !isEqual(state.filter, defaultFilter)
  },
  filter(state) {
    return state.filter
  },
  filteredCategoryIds(state) {
    return get(state.filter, 'categories_some.id_in') || []
  },
  filteredPostTypes,
  filteredLanguageCodes(state) {
    return get(state.filter, 'language_in') || []
  },
  filteredByUsersFollowed(state) {
    return !!get(state.filter, 'author.followedBy_some.id')
  },
  filteredByPostsInMyGroups(state) {
    return !!get(state.filter, 'postsInMyGroups')
  },
  filteredByEmotions(state) {
    return get(state.filter, 'emotions_some.emotion_in') || []
  },
  noneSetInPostTypeFilter,
  articleSetInPostTypeFilter,
  eventSetInPostTypeFilter,
  orderedByCreationDate,
  eventsEnded(state) {
    return state.eventsEnded
  },
  orderBy,
}
