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

  const empire = new Empire("Mitsuyoshi", spawns)

  empire.run()

  for (const creep_name in Game.creeps) {
    const creep = Game.creeps[creep_name]

    if (creep.squad || creep.spawning) {
      continue
    }

    console.log(`Creep missing squad ${creep.name}, squad name: ${creep.memory.squad_name}, ${creep.memory.status}, ${creep.memory.type}, at ${creep.pos}`)
    // creep.suicide()
  }

  const w48s47 = Game.rooms['W48S47']
  const o_amount = (w48s47.terminal!.store[RESOURCE_OXYGEN] || 0)
  if (o_amount > 4900) {
    console.log(`Send HYDROGEN from W48S47 to W44S42 ${w48s47.terminal!.send(RESOURCE_OXYGEN, 2000, 'W44S42')}`)
  }

  const w49s47 = Game.rooms['W49S47']
  const uh_amount = (w49s47.terminal!.store[RESOURCE_UTRIUM_HYDRIDE] || 0)
  if (uh_amount > 100) {
    console.log(`Send UTRIUM_HYDRIDE from W49S47 to W48S47 ${w49s47.terminal!.send(RESOURCE_UTRIUM_HYDRIDE, uh_amount, 'W48S47')}`)
  }

  const w44s42 = Game.rooms['W44S42']
  const ho_amount = (w44s42.terminal!.store[RESOURCE_HYDROXIDE] || 0)
  if (ho_amount > 100) {
    console.log(`Send HYDROXIDE from W44S42 to W48S47 ${w44s42.terminal!.send(RESOURCE_HYDROXIDE, ho_amount, 'W48S47')}`)
  }
  const h_amount = (w44s42.terminal!.store[RESOURCE_HYDROGEN] || 0)
  if (h_amount > 4900) {
    console.log(`Send HYDROGEN from W44S42 to W49S47 ${w44s42.terminal!.send(RESOURCE_HYDROGEN, 2000, 'W49S47')}`)
  }
})

/**
 * @fixme:
 * renewing creeps blocks attacker spawn
 * carrier blocks harvester position
 * if creeps start dying or script crashes, notify them
 */

/**
 * @todo:
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
