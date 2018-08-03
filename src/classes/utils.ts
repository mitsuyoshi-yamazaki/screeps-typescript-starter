let index = 0

export function UID(seed: string): string {
  index += 1
  return `${seed}${Game.time}${index}`
}

export interface StructureFilter {
  (structure: AnyStructure): boolean
}

export function room_link(room_name: string, opts?: {text?: string, color?: string}): string {
  opts = opts || {}
  const color = opts.color || '#FFFFFF'
  const text = opts.text || room_name
  return `<a href="https://screeps.com/a/#!/room/shard2/${room_name}", style='color:${color}'>${text}</a>`
}

export function room_history_link(room_name: string, ticks: number, opts?: {text?: string, color?: string}): string {
  opts = opts || {}
  const color = opts.color || '#FFFFFF'
  const text = opts.text || room_name
  return `<a href="https://screeps.com/a/#!/history/shard2/${room_name}?t=${ticks}", style='color:${color}'>${text}</a>`
}
