import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

export class AttackerSquad extends Squad {
  private attacker: Creep | undefined

  private destination: Room | undefined

  constructor(readonly name: string, readonly rooms_to_defend: Room[], readonly room_for_wait: Room) {
    super(name)

    this.creeps.forEach((creep) => {
      if (creep.memory.type != CreepType.ATTACKER) {
        return
      }
      this.attacker = creep
    })

    this.destination = rooms_to_defend[0]
    // console.log(`${this.name} ${this.rooms_to_defend} ${this.attacker}`)
  }

  public get type(): SquadType {
    return SquadType.ATTACKER
  }

  public static generateNewName(): string {
    return UID(SquadType.ATTACKER)
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
    if (!attacker) {
      return
    }
    const hostile_creep: Creep = attacker.pos.findClosestByPath(FIND_HOSTILE_CREEPS)
    if (hostile_creep) {
      if (Game.time % 5) {
        attacker.say('FOUND YOU', true)
      }

      const rr = attacker.rangedAttack(hostile_creep)
      if (rr == ERR_NOT_IN_RANGE) {
        const r = attacker.moveTo(hostile_creep)
        // console.log(`FUGA ${attacker}, ${r}, ${hostile_creep}, ${hostile_creep.pos}`)
      }
      // console.log(`HOGE ${attacker}, ${rr}, ${hostile_creep}, ${hostile_creep.pos}`)
      return
    }

    if (!this.destination) {
      // console.log(`Attacker wait ${attacker!.name}, ${this.name}`)
      // if (attacker!.moveToRoom(this.room_for_wait.name) == ActionResult.IN_PROGRESS) {
      //   attacker!.say(this.room_for_wait.name)
      // }
      return
    }

    const room = this.destination

    if (attacker.moveToRoom(room.name) != ActionResult.DONE) {
      attacker.say(room.name)
      return
    }
  }

  public description(): string {
    const attacker_info = this.attacker ? `${this.attacker.name} ${this.attacker.pos}` : ''
    return `${super.description()}, ${attacker_info}\n    - to ${this.destination} (${this.rooms_to_defend})`
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
