const META = {
  DEFAULT_TITLE: (import.meta.env.PUBLIC_ENV__META__DEFAULT_TITLE as string) ?? 'IT4C',
  DEFAULT_DESCRIPTION:
    (import.meta.env.PUBLIC_ENV__META__DEFAULT_DESCRIPTION as string) ??
    'IT4C Frontend Boilerplate',
}

export { META }
