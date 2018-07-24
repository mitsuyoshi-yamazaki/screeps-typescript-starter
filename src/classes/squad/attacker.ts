import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

interface AttackerSquadMemory extends SquadMemory {
  target_room_name: string | undefined
}

export class AttackerSquad extends Squad {
  private destination_room_name: string | undefined
  private energy_unit = 130
  private fix_part_energy = 320
  private max_energy = 1100

  constructor(readonly name: string, readonly rooms_to_defend: string[], readonly base_room: Room, readonly energy_capacity: number) {
    super(name)

    const memory = (Memory.squads[this.name] as AttackerSquadMemory)

    if ((this.rooms_to_defend.indexOf(this.base_room.name) >= 0)) {
      this.destination_room_name = this.base_room.name
    }
    else if (memory.target_room_name) {
      const room = Game.rooms[memory.target_room_name]

      if (room) {
        if (room.attacked) {
          this.destination_room_name = room.name
        }
        else {
          (Memory.squads[this.name] as AttackerSquadMemory).target_room_name = undefined
          this.destination_room_name = rooms_to_defend[0] ? rooms_to_defend[0] : undefined
        }
      }
      else {
        this.destination_room_name = memory.target_room_name
      }
    }

    if (!this.destination_room_name) {
      this.destination_room_name = rooms_to_defend[0] ? rooms_to_defend[0] : undefined;
    }
    (Memory.squads[this.name] as AttackerSquadMemory).target_room_name = this.destination_room_name

    const attacker = Array.from(this.creeps.values())[0]

    // if (this.rooms_to_defend.length > 0) {
    //   if ((Game.time % 7) == 0) {
    //     const attacker_description = attacker ? `${attacker.name}, ${attacker.pos}` : ''
    //     console.log(`Room Attacked!! ${this.rooms_to_defend}, ${attacker_description}`)
    //   }
    // }
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
    if (this.energy_capacity < 280) {
      return SpawnPriority.NONE
    }
    if (!this.destination_room_name) {
      return SpawnPriority.NONE
    }

    let max = 1
    if (this.base_room.name == this.destination_room_name) {
      max = 1
    }
    return this.creeps.size < max ? SpawnPriority.URGENT : SpawnPriority.NONE
  }

  public hasEnoughEnergy(energyAvailable: number, capacity: number): boolean {
    if (capacity < (this.fix_part_energy + this.energy_unit)) {
      if (energyAvailable >= 280) {
        return true
      }
    }

    capacity -= this.fix_part_energy
    const energy_needed = Math.floor(capacity / this.energy_unit) * this.energy_unit // @todo: set upper limit

    return energyAvailable >= Math.min(energy_needed, this.max_energy)
  }

  public addCreep(energyAvailable: number, spawnFunc: SpawnFunction): void {
    const front_part: BodyPartConstant[] = [TOUGH, TOUGH, MOVE, MOVE]
    const move: BodyPartConstant[] = [MOVE]
    const attack: BodyPartConstant[] = [ATTACK]

    const name = this.generateNewName()
    let body: BodyPartConstant[] = []
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.ATTACKER,
      should_notify_attack: false,
      let_thy_die: false,
    }

    if (energyAvailable < (this.fix_part_energy + this.energy_unit)) {
      body = [MOVE, ATTACK, RANGED_ATTACK]
    }
    else {
      energyAvailable = Math.min(energyAvailable, this.max_energy)
      energyAvailable -= this.fix_part_energy

      while(energyAvailable >= this.energy_unit) {
        body = move.concat(body)
        body = body.concat(attack)

        energyAvailable -= this.energy_unit
      }
      body = front_part.concat(body)
      body = body.concat([RANGED_ATTACK, MOVE])
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  public run(): void {
    this.creeps.forEach((attacker) => {
      if (attacker.spawning) {
        return
      }

      const is_safemode_active = (attacker.room.controller) ? ((attacker.room.controller!.safeMode || 0) > 0) : false

      if (attacker.room.name == 'W43N7') {

      }
      else {
        const target = attacker.pos.findClosestByPath(FIND_HOSTILE_CREEPS)
        if (target) {
          attacker.destroy(target)
          return
        }
      }

      if (!this.destination_room_name) {
        if (attacker.moveToRoom(this.base_room.name) == ActionResult.DONE) {
          switch (attacker.room.name) {
            case 'W51S29':
              attacker.moveTo(9, 30)
              break

            case 'W44S7':
              attacker.moveTo(26, 37)
              break

            case 'W48S6':
              attacker.moveTo(24, 28)
              break

            case 'W43S5':
              attacker.moveTo(19, 20)
              break

            case 'W47S6':
              attacker.moveTo(25, 25)
              break

            case 'W45S27':
              attacker.moveTo(16, 36)
              break

            case 'W45S3':
              attacker.moveTo(30, 33)
              break

            case 'W47S9':
              attacker.moveTo(39, 5)
              break

            case 'W46S3':
              attacker.moveTo(39, 44)
              break

            default:
              attacker.moveTo(25, 25)
              // console.log(`Attacker unexpected waiting room ${attacker.room}, ${attacker.name}, ${this.name}`)
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

      if (attacker.room.name == 'W43N7') {

      }
      else {
        attacker.searchAndDestroy()
      }

      if (attacker.moveToRoom(this.destination_room_name) != ActionResult.DONE) {
        attacker.say(this.destination_room_name)
        return
      }
    })
  }

  public description(): string {
    const attacker = Array.from(this.creeps.values())[0]
    const attacker_info = attacker ? `${attacker.name} ${attacker.pos}` : ''
    return `${super.description()}, ${attacker_info}\n    - to ${this.destination_room_name} (${this.rooms_to_defend})`
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
