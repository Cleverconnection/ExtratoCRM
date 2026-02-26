import { normalizeText } from './normalizeText'

export function getDescriptionKey(description) {
  return normalizeText(description)
}
