import { ActionResult, GroupActionType } from 'interfaces'

export class Squad implements GroupActionType {
  creeps = new Map<string, Creep>()

  constructor(readonly id: string, creeps: Creep[]) {
    creeps.forEach(creep => {
      this.creeps.set(creep.id, creep)
    })
  }

  say(message: string): ActionResult {
    this.creeps.forEach((creep, _) => {
      creep.say(message)
    })

    return ActionResult.OK
  }

  expand(roomnames: string[]): ActionResult {
    console.log('Squad.expand() not implemented yet')
    return ActionResult.OK
  }
}
