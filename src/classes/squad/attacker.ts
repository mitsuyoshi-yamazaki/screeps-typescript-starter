import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

export class AttackerSquad extends Squad {
  private destination: Room | undefined
  private energy_unit = 330
  private fix_part_energy = 120
  private max_energy = 1930

  constructor(readonly name: string, readonly rooms_to_defend: Room[], readonly base_room: Room) {
    super(name)

    if ((this.rooms_to_defend.indexOf(this.base_room) >= 0)) {
      this.destination = this.base_room
    }
    else {
      this.destination = rooms_to_defend[0]
    }

    const attacker = Array.from(this.creeps.values())[0]

    if (this.rooms_to_defend.length > 0) {
      const attacker_description = attacker ? `${attacker.name}, ${attacker.pos}` : ''
      console.log(`Room Attacked!! ${this.rooms_to_defend}, ${attacker_description}`)
    }
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
    if (!this.destination) {
      return SpawnPriority.NONE
    }
    if (this.base_room.name == this.destination.name) {
      return SpawnPriority.URGENT
    }
    return this.creeps.size > 0 ? SpawnPriority.NONE : SpawnPriority.URGENT
  }

  public hasEnoughEnergy(energyAvailable: number, capacity: number): boolean {
    capacity -= this.fix_part_energy
    const energy_needed = Math.floor(capacity / this.energy_unit) * this.energy_unit // @todo: set upper limit

    return energyAvailable >= Math.min(energy_needed, this.max_energy)
  }

  public addCreep(energyAvailable: number, spawnFunc: SpawnFunction): void {
    energyAvailable = Math.min(energyAvailable, this.max_energy)

    const front_part: BodyPartConstant[] = [TOUGH, TOUGH, MOVE]
    const move: BodyPartConstant[] = [MOVE, MOVE]
    const attack: BodyPartConstant[] = [RANGED_ATTACK, ATTACK]

    const name = this.generateNewName()
    let body: BodyPartConstant[] = []
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.ATTACKER,
      let_thy_die: false,
    }

    energyAvailable -= this.fix_part_energy

    while(energyAvailable >= this.energy_unit) {
      body = move.concat(body)
      body = body.concat(attack)

      energyAvailable -= this.energy_unit
    }
    body = front_part.concat(body)
    body.push(MOVE)

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  public run(): void {
    this.creeps.forEach((attacker) => {
      if (!this.destination) {
        if (attacker.moveToRoom(this.base_room.name) == ActionResult.DONE) {
          switch (attacker.room.name) {
            case 'W48S47':
              attacker.moveTo(39, 27)
              break

            case 'W49S47':
              attacker.moveTo(17, 26)
              break

            case 'W44S42':
              attacker.moveTo(11, 28)
              break

            default:
              console.log(`Attacker unexpected waiting room ${attacker.room}, ${attacker.name}, ${this.name}`)
              break
          }
        }
        return
      }

      // const hostile_creep: Creep = attacker.pos.findClosestByPath(FIND_HOSTILE_CREEPS)
      // if (hostile_creep) {
      //   if (Game.time % 5) {
      //     attacker.say('FOUND YOU', true)
      //   }

      //   const rr = attacker.rangedAttack(hostile_creep)
      //   if (rr == ERR_NOT_IN_RANGE) {
      //     const r = attacker.moveTo(hostile_creep)
      //     // console.log(`FUGA ${attacker}, ${r}, ${hostile_creep}, ${hostile_creep.pos}`)
      //   }
      //   // console.log(`HOGE ${attacker}, ${rr}, ${hostile_creep}, ${hostile_creep.pos}`)
      //   return
      // }

      // if (!this.destination) {
      //   // console.log(`Attacker wait ${attacker!.name}, ${this.name}`)
      //   // if (attacker!.moveToRoom(this.room_for_wait.name) == ActionResult.IN_PROGRESS) {
      //   //   attacker!.say(this.room_for_wait.name)
      //   // }
      //   return
      // }

      attacker.searchAndDestroy()

      const room = this.destination
      if (attacker.moveToRoom(room.name) != ActionResult.DONE) {
        attacker.say(room.name)
        return
      }
    })
  }

  public description(): string {
    const attacker = Array.from(this.creeps.values())[0]
    const attacker_info = attacker ? `${attacker.name} ${attacker.pos}` : ''
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
