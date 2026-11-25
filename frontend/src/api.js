export async function apiRequest(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: 'same-origin',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  })
  const text = await response.text()
  let result = {}
  if (text) {
    try {
      result = JSON.parse(text)
    } catch {
      throw new Error('The backend returned an invalid response.')
    }
  }
  if (!response.ok) {
    throw new Error(result.error || `Request failed (${response.status}).`)
  }
  return result
}

const post = (path, body, headers = {}) => apiRequest(path, {
  method: 'POST',
  body: JSON.stringify(body),
  headers
})

export const checkHealth = () => apiRequest('/health')
export const getSession = async () => (await apiRequest('/auth/session')).user
export const signIn = async credentials => (await post('/auth/login', credentials)).user
export const signOut = () => post('/auth/logout', {})
export const register = async details => (await post('/auth/register', details)).user
export const createInvitation = email => post('/invitations', { email })
export const loadInvitations = () => apiRequest('/invitations')
export const loadPublication = id => apiRequest(`/publications/${encodeURIComponent(id)}`)
export const loadPublicationComments = id => apiRequest(`/publications/${encodeURIComponent(id)}/comments`)
export const submitPublicationComment = (id, comment) => post(`/publications/${encodeURIComponent(id)}/comments`, comment)
export const loadFamilyMembers = () => apiRequest('/family/members')
export const loadFamilyFeed = () => apiRequest('/family/feed')
export const createFamilyPost = content => post('/family/feed', { content })
export const createFamilyComment = (id, content) => post(`/family/feed/${encodeURIComponent(id)}/comments`, { content })
export const loadProfile = userId => apiRequest(`/profile${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`)
export const saveProfile = (profile, userId) => apiRequest(`/profile${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`, {
  method: 'PUT',
  body: JSON.stringify(profile)
})
export const loadPendingPublicationComments = () => apiRequest('/admin/publication-comments')
export const moderatePublicationComment = (id, status) => post(`/admin/publication-comments/${encodeURIComponent(id)}/moderate`, { status })
