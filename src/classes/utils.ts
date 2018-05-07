let index = 0

export function UID(seed: string): string {
  index += 1
  return `${seed}${Game.time}${index}`
}
