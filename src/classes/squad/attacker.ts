import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

export class AttackerSquad extends Squad {
  private attacker: Creep | undefined

  constructor(readonly name: string, readonly rooms_to_defend: Room[]) {
    super(name)

    this.creeps.forEach((creep) => {
      if (creep.memory.type != CreepType.ATTACKER) {
        return
      }
      this.attacker = creep
    })
  }

  public get type(): SquadType {
    return SquadType.ATTACKER
  }

  public static generateNewName(): string {
    return `${SquadType.ATTACKER}${Game.time}`
  }

  public generateNewName(): string {
    return AttackerSquad.generateNewName()
  }

  // --
  public get spawnPriority(): SpawnPriority {
    const needs_attacker = (!this.attacker) && (this.rooms_to_defend.length > 0)
    return needs_attacker ? SpawnPriority.URGENT : SpawnPriority.NONE
  }

  public hasEnoughEnergy(energyAvailable: number, capacity: number): boolean {
    const energy_unit = 200
    const energy_needed = Math.floor(capacity / energy_unit) * energy_unit // @todo: set upper limit

    return energyAvailable >= energy_needed
  }

  public addCreep(energyAvailable: number, spawnFunc: SpawnFunction): void {
    const energy_unit = 200
    const move: BodyPartConstant[] = [MOVE]
    const attack: BodyPartConstant[] = [RANGED_ATTACK]

    const name = this.generateNewName()
    let body: BodyPartConstant[] = []
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.ATTACKER,
    }

    while(energyAvailable >= energy_unit) {
      body = move.concat(body)
      body = body.concat(attack)

      energyAvailable -= energy_unit
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  public run(): void {
    const attacker = this.attacker
    if ((this.rooms_to_defend.length == 0) || !attacker) {
      return
    }

    const room = this.rooms_to_defend[0]

    if (attacker.moveToRoom(room.name) != ActionResult.DONE) {
      attacker.say(room.name)
      return
    }

    const hostile_creep: Creep = attacker.pos.findClosestByPath(FIND_HOSTILE_CREEPS)

    if (hostile_creep) {
      if (Game.time % 5) {
        attacker.say('FOUND YOU', true)
      }

      if (attacker.attack(hostile_creep) == ERR_NOT_IN_RANGE) {
        attacker.moveTo(hostile_creep)
      }
    }
  }

  // -- Private --
  private suicide(): void {
    // @todo:
  }

  private addAttacker(spawnFunc: SpawnFunction) {
    // @todo:
  }

  private addHealer(spawnFunc: SpawnFunction) {
    // @todo:
  }
}
