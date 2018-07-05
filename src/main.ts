import { ErrorMapper } from "utils/ErrorMapper"

import { Empire } from "classes/empire"
import * as Initializer from "classes/init"

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {

  Initializer.init()

  const spawns = new Map<string, StructureSpawn>()
  for (const spawnName in Game.spawns) {
    const spawn = Game.spawns[spawnName]

    spawns.set(spawnName, spawn)
  }

  ErrorMapper.wrapLoop(() => {
    const empire = new Empire("Mitsuyoshi", spawns)
    empire.run()
  })()

  ErrorMapper.wrapLoop(() => {
    if (((Game.time + 3) % 11) == 0) {
      for (const creep_name in Game.creeps) {
        const creep = Game.creeps[creep_name]

        creep.notifyWhenAttacked(!(!creep.memory.should_notify_attack))

        if (creep.squad || creep.spawning) {
          continue
        }

        console.log(`Creep missing squad ${creep.name}, squad name: ${creep.memory.squad_name}, ${creep.memory.status}, ${creep.memory.type}, at ${creep.pos}`)
        creep.say(`NO SQD`)

        // creep.memory.let_thy_die = true
        // creep.memory.squad_name = 'worker72214031'  // W44S7
      }
    }
  })()

  ErrorMapper.wrapLoop(() => {

  // const first_room_name = 'W48S47'  // O
  // const second_room_name = 'W49S47' // U
  // const third_room_name = 'W49S48'  // H
  // const fourth_room_name = 'W49S34' // K
  // const fifth_room_name = 'W46S33'  // Z
  // const sixth_room_name = 'W51S29'  // L
  const hydrogen_first_room_name = 'W44S7'  // H
  const hydrogen_second_room_name = 'W48S6'  // H
  const hydrogen_third_room_name = 'W47N2'  // H
  const utrium_first_room_name = 'W43S5'    // U
  const zynthium_first_room_name = 'W43N5'  // Z
  const catalyst_first_room_name = 'W42N1'  // C

  const transports: {from: string, to: string, resource_type: ResourceConstant, is_output: boolean}[] = [
    { from: zynthium_first_room_name, to: catalyst_first_room_name, resource_type: RESOURCE_ZYNTHIUM_KEANITE, is_output: true },
    // { from: hydrogen_third_room_name, to: hydrogen_first_room_name, resource_type: RESOURCE_HYDROXIDE, is_output: true },
    // { from: utrium_first_room_name, to: hydrogen_first_room_name, resource_type: RESOURCE_UTRIUM_LEMERGITE, is_output: true },
  ]

  if ((Game.time % 13) == 11) {
    transports.forEach((transport) => {
      const from_room = Game.rooms[transport.from]
      const to_room = Game.rooms[transport.to]

      if (to_room && to_room.terminal && (_.sum(to_room.terminal.store) > (to_room.terminal.storeCapacity - 10000))) {
        const message = `Terminal ${to_room.name} is full ${from_room.name} ${transport.resource_type}`
        console.log(message)
        Game.notify(message)
        return
      }

      const amount_needed = transport.is_output ? 500 : 4900

      const from_room_ready: boolean = !(!from_room)
        && !(!from_room.terminal)
        && (from_room.terminal.cooldown == 0)
        && ((from_room.terminal.store[transport.resource_type] || 0) > amount_needed)

      const to_room_ready: boolean = !(!to_room) && !(!to_room.terminal) && ((to_room.terminal.store[transport.resource_type] || 0) < 3000)

      if (from_room_ready && to_room_ready) {
        const amount_send: number = transport.is_output ? (from_room.terminal!.store[transport.resource_type] || 0) : 2000
        const result = from_room.terminal!.send(transport.resource_type, amount_send, transport.to)
        console.log(`Send ${transport.resource_type} from ${transport.from} to ${transport.to} ${result}`)
      }
    })
  }
  })()

  ErrorMapper.wrapLoop(() => {
    for (const creep_name in Game.creeps) {
      const creep = Game.creeps[creep_name]

      if (!creep.memory.debug) {
        continue
      }

      creep.say(creep.memory.status)
    }
  })()
})

/**
 * @fixme:
 * renewing creeps blocks attacker spawn
 * carrier blocks harvester position
 * if creeps start dying or script crashes, notify them
 */

/**
 * @todo:
 * Spawn7 construction site id: 5b039954704a56771cb6345f
 * cancel spawning attacker if the invader is eliminated within 10 ticks
 * remove renew codes
 * use the new spawn
 * check cheap minerals on the market (Game.market.checkCheapest())
 * measure all minerals and compounds
 * if there're too many 'waiting for renwew's or high priority spawns, quit renew-ing
 * in worker squad, assign each tasks for worker, carrier and upgrader
 * add current pos & room name to creep memory
 * notify when eliminate invaders and loot resources
 * add heal body part to attacker and heal others
 * make assertion
 * refactor harvester to room:source = 1:n
 * construct walls to hard to pass throuough to rooms
 * random move on build / upgrade
 * creeps run away from attacker
 * reassign controller keeper after claiming the controller
 */

/**
 * Storategy
 * Enforce upgraders using mineral
 * Harvest from wild mineral in npc rooms
 */

 /**
 * Tactics
 * an attacker(or a harvester) creep holds a CARRY and construct rampart, then the other creeps continuously repair it
 */

 /**
  * memo:
  * 6045600
  * Game.rooms['W48S47'].terminal.send(RESOURCE_OXYGEN, 100, 'W49S47', '')
  * Game.market.deal('xxx', 100, 'W48S47')
  * Game.market.calcTransactionCost(40000, 'E16S42', 'W48S47')
  * Object.keys(Game.creeps).map((n)=>{return Game.creeps[n]}).filter((c)=>{return c.memory.squad_name == 'harvester5863442'})[0]
  * Game.rooms['W48S47'].terminal.send(RESOURCE_ENERGY, 100, 'W48S45', "Hi neighbour, it's test")
  */

  // attacker
//   // heal
// Game.getObjectById('5af7c5180ce89a3235fd46d8').boostCreep(Game.creeps['invader61324821'])

// // attack
// Game.getObjectById('5af7db5db44f464c8ea3a7f5').boostCreep(Game.creeps['invader61324821'])


// // healer
// // heal
// Game.getObjectById('5af7c5180ce89a3235fd46d8').boostCreep(Game.creeps['invader61326144'])

// Game.market.deal('5a591e77ce9bb61c7260a89a', 7487, 'W48S47')

/**
 * 2 3 5 7 11 13 17 19 23 29 31 37 41 43 47 53 59 61 67 71 73 79 83 89 97 101 103 107 109 113 127 131 137 139 149 151 157 163 167 173 179 181 191 193 197 199 211 223 227 229 233 239 241 251 257 263 269 271 277 281 283 293 307 311 313 317 331 337 347 349 353 359 367 373 379 383 389 397 401 409 419 421 431 433 439 443 449 457 461 463 467 479 487 491 499 503 509 521 523 541 547 557 563 569 571 577 587 593 599 601 607 613 617 619 631 641 643 647 653 659 661 673 677 683 691 701 709 719 727 733 739 743 751 757 761 769 773 787 797 809 811 821 823 827 829 839 853 857 859 863 877 881 883 887 907 911 919 929 937 941 947 953 967 971 977 983 991 997
 */
