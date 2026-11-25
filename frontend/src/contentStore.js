import { apiRequest } from './api'

export const loadPublications = () => apiRequest('/publications')
export const loadPhotos = () => apiRequest('/photos')
export const savePublication = publication => apiRequest('/publications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(publication)
})
export const savePhoto = photo => apiRequest('/photos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(photo)
})
