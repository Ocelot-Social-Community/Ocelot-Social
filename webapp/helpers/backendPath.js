export const backendPath = (url) => (url.startsWith('/') ? '/api' + url : '/api/' + url)
