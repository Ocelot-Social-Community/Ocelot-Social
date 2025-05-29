const META = {
  BASE_URL: (import.meta.env.PUBLIC_ENV__META__BASE_URL ?? 'http://localhost:3000') as string,
  DEFAULT_AUTHOR: (import.meta.env.PUBLIC_ENV__META__DEFAULT_AUTHOR ??
    'IT Team 4 Change') as string,
  DEFAULT_DESCRIPTION: (import.meta.env.PUBLIC_ENV__META__DEFAULT_DESCRIPTION ??
    'IT4C Frontend Boilerplate') as string,
  DEFAULT_TITLE: (import.meta.env.PUBLIC_ENV__META__DEFAULT_TITLE ?? 'IT4C') as string,
}

export { META }
