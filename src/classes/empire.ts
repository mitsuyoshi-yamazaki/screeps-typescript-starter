import { ActionResult, GroupActionType } from 'interfaces'

export class Empire implements GroupActionType {
  constructor(readonly name: string, readonly spawns: Map<string, StructureSpawn>) {
    this.spawns.forEach((spawn, _) => {
      spawn.initialize()
    })
  }

  say(message: string): ActionResult {
    let results: ActionResult[] = []

    this.spawns.forEach((spawn, spawnID) => {
      results.push(spawn.say(message))
    })

    return ActionResult.OK
  }

  expand(roomnames: string[]): ActionResult {
    console.log('Empire.expand() not implemented yet')
    return ActionResult.OK
  }
}
