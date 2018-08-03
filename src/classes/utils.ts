let index = 0

export function UID(seed: string): string {
  index += 1
  return `${seed}${Game.time}${index}`
}

export interface StructureFilter {
  (structure: AnyStructure): boolean
}

export function room_link(room_name: string, text?: string) {
  return `<a href="https://screeps.com/a/#!/room/shard2/${room_name}">${text || room_name}</a>`
}

export function room_history_link(room_name: string, ticks: number, text?: string) {
  return `<a href="https://screeps.com/a/#!/history/shard2/${room_name}?t=${ticks}">${text || room_name}</a>`
}
