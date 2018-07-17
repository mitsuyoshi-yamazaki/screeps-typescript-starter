import { ErrorMapper } from "utils/ErrorMapper"

import { Empire } from "classes/empire"
import * as Initializer from "classes/init"

Initializer.init()
console.log(`Initializer.init() v${Game.version} at ${Game.time}`)

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  if (Memory.debug.cpu.show_usage) {
    console.log(`\n\n--------------\n\n`)
  }

  ErrorMapper.wrapLoop(() => {
    Initializer.tick()
  }, `Initializer.init`)()

  ErrorMapper.wrapLoop(() => {
    const empire = new Empire("Mitsuyoshi")

    empire.run()
  }, `empire.run`)()

  if ((Game.time % 29) == 3) {
    ErrorMapper.wrapLoop(() => {
      for (const creep_name in Game.creeps) {
        const creep = Game.creeps[creep_name]

        if ((creep.ticksToLive || 0) < 1450) {
          continue
        }

        creep.notifyWhenAttacked(!(!creep.memory.should_notify_attack))

        if (creep.squad || creep.spawning) {
          continue
        }

        console.log(`Creep missing squad ${creep.name}, squad name: ${creep.memory.squad_name}, ${creep.memory.status}, ${creep.memory.type}, at ${creep.pos}`)
        creep.say(`NO SQD`)

        // creep.memory.let_thy_die = true
        // creep.memory.squad_name = 'worker771957135'  // W48N11
      }
    }, `Creeps.gc`)()
  }

  if ((Game.time % 997) == 17) {
    ErrorMapper.wrapLoop(() => {
      for (const squad_name in Memory.squads) {
        const squad_memory = Memory.squads[squad_name]
        const room = Game.rooms[squad_memory.owner_name]

        if (room && room.controller && room.controller.my) {
          continue
        }

        delete Memory.squads[squad_name]
      }
    }, `Squads.gc`)()
  }

  const test_send_resources = Memory.debug.test_send_resources
  if (test_send_resources) {
    Memory.debug.test_send_resources = false
  }

  // const hoge = false

  // // if (test_send_resources || ((Game.time % 97) == 1)) {
  // if (hoge) {
  //   ErrorMapper.wrapLoop(() => {


  //     if (test_send_resources) {
  //       Memory.debug.test_send_resources = false
  //     }

  //     const hydrogen_first_room_name = 'W44S7'  // H
  //     const hydrogen_second_room_name = 'W48S6'  // H
  //     const hydrogen_third_room_name = 'W47N2'  // H
  //     const utrium_first_room_name = 'W43S5'    // U
  //     const zynthium_first_room_name = 'W43N5'  // Z
  //     const lemergium_first_room_name = 'W51S29'// L
  //     const catalyst_first_room_name = 'W42N1'  // C
  //     const oxygen_first_room_name = 'W48N11'   // O

  //     const transports: {from: string, to: string, resource_type: ResourceConstant, is_output: boolean}[] = [
  //       { from: catalyst_first_room_name, to: utrium_first_room_name, resource_type: RESOURCE_GHODIUM_HYDRIDE, is_output: true },
  //       { from: hydrogen_second_room_name, to: utrium_first_room_name, resource_type: RESOURCE_HYDROXIDE, is_output: true },
  //       { from: utrium_first_room_name, to: zynthium_first_room_name, resource_type: RESOURCE_KEANIUM, is_output: true },
  //       { from: hydrogen_third_room_name, to: hydrogen_second_room_name, resource_type: RESOURCE_OXYGEN, is_output: true },
  //       { from: hydrogen_first_room_name, to: hydrogen_second_room_name, resource_type: RESOURCE_HYDROGEN, is_output: false },
  //       { from: hydrogen_first_room_name, to: oxygen_first_room_name, resource_type: RESOURCE_ENERGY, is_output: false },
  //       // optional above
  //       { from: zynthium_first_room_name, to: hydrogen_third_room_name, resource_type: RESOURCE_ZYNTHIUM_KEANITE, is_output: true },
  //       { from: lemergium_first_room_name, to: utrium_first_room_name, resource_type: RESOURCE_LEMERGIUM, is_output: false },
  //       { from: utrium_first_room_name, to: hydrogen_third_room_name, resource_type: RESOURCE_UTRIUM_LEMERGITE, is_output: true },
  //       { from: hydrogen_third_room_name, to: catalyst_first_room_name, resource_type: RESOURCE_HYDROGEN, is_output: true },
  //       { from: hydrogen_third_room_name, to: catalyst_first_room_name, resource_type: RESOURCE_GHODIUM, is_output: true },
  //       { from: catalyst_first_room_name, to: hydrogen_first_room_name, resource_type: RESOURCE_GHODIUM_HYDRIDE, is_output: true },
  //       { from: hydrogen_second_room_name, to: hydrogen_first_room_name, resource_type: RESOURCE_HYDROXIDE, is_output: true },
  //       { from: oxygen_first_room_name, to: hydrogen_second_room_name, resource_type: RESOURCE_OXYGEN, is_output: false },
  //     ]

  //     transports.forEach((transport) => {
  //       const from_room = Game.rooms[transport.from]
  //       const to_room = Game.rooms[transport.to]
  //       const capacity = (transport.resource_type == RESOURCE_ENERGY) ? 100000 : 10000

  //       if (to_room && to_room.terminal && ((_.sum(to_room.terminal.store) > (to_room.terminal.storeCapacity - capacity)))) {
  //         const message = `Terminal ${to_room.name} is full ${from_room.name} ${transport.resource_type}`
  //         console.log(message)

  //         if (transport.resource_type != RESOURCE_ENERGY) {
  //           Game.notify(message)
  //         }
  //         return
  //       }

  //       let amount_needed = transport.is_output ? 500 : 4900
  //       let resource_capacity = 3000
  //       let amount_send: number = transport.is_output ? (from_room.terminal!.store[transport.resource_type] || 0) : 2000

  //       if (transport.resource_type == RESOURCE_ENERGY) {
  //         amount_needed = 140000
  //         resource_capacity = 110000
  //         amount_send = 100000
  //       }

  //       const from_room_ready: boolean = !(!from_room)
  //         && !(!from_room.terminal)
  //         && (from_room.terminal.cooldown == 0)
  //         && ((from_room.terminal.store[transport.resource_type] || 0) > amount_needed)

  //       const to_room_ready: boolean = !(!to_room) && !(!to_room.terminal) && ((to_room.terminal.store[transport.resource_type] || 0) < resource_capacity)

  //       if (from_room_ready && to_room_ready) {
  //         const result = from_room.terminal!.send(transport.resource_type, amount_send, transport.to)
  //         console.log(`Send ${transport.resource_type} from ${transport.from} to ${transport.to} ${result}`)
  //       }
  //     })
  //   }, `SendResources`)()
  // }

  if ((Game.time % 97) == 5) {
    ErrorMapper.wrapLoop(() => {
      // if ((Game.time % 7) == 0) {  // @fixme:
        trade()
    }, `Trade`)()
  }

  ErrorMapper.wrapLoop(() => {
    for (const creep_name in Game.creeps) {
      const creep = Game.creeps[creep_name]

      if (!creep.memory.debug) {
        continue
      }

      creep.say(creep.memory.status)
    }
  }, `Creep.debug`)()

  if (Memory.debug.show_costmatrix) {
    const room_name: string = Memory.debug.show_costmatrix

    ErrorMapper.wrapLoop(() => {
      const room = Game.rooms[room_name]
      const room_memory = Memory.rooms[room_name]

      if (!room) {
        console.log(`Show costmatrix no room ${room_name} found`)
      }
      else if (!room_memory || !room_memory.cost_matrix) {
        console.log(`NO costmatrix on the room ${room_name}`)
      }
      else {
        console.log(`Showing costmatrix ${room_name}`)

        const cost_matrix = PathFinder.CostMatrix.deserialize(room_memory.cost_matrix)
        const room_size = 50

        for (let i = 0; i < room_size; i++) {
          for (let j = 0; j < room_size; j++) {
            const cost = cost_matrix.get(i, j)

            room.visual.text(`${cost}`, i, j, {
              color: '#ffffff',
              align: 'center',
              font: '12px',
              opacity: 0.8,
            })
          }
        }
      }
    }, `Show costmatrix ${room_name}`)()
  }

  if (Memory.debug.reset_costmatrix) {
    console.log(`RESET costmatrix`)

    ErrorMapper.wrapLoop(() => {
      for (const room_name in Memory.rooms) {
        const room_memory = Memory.rooms[room_name]

        if (!room_memory) {
          console.log(`Reset costmatrix no room memory for ${room_name}: probably writing wrong code`)
          break
        }

        Memory.rooms[room_name].cost_matrix = undefined
      }
    }, `Reset costmatrix`)()

    Memory.debug.reset_costmatrix = false
  }

  const all_cpu = Math.ceil(Game.cpu.getUsed())
  Memory.cpu_usages.push(all_cpu)

  if ((all_cpu > Memory.debug.cpu.stop_threshold) && Memory.debug.cpu.show_usage) {
    Memory.debug.cpu.show_usage = false
  }

  // console.log(`HOGE ${before_cpu} : ${after_cpu1} : ${after_cpu2} , all: ${all_cpu}`)

  // console.log(`HOGE ${sellOrders(RESOURCE_HYDROGEN, 0.16).map(o=>[o.price])}`)

  if ((Game.time % 47) == 13) {
    ErrorMapper.wrapLoop(() => {
      const credit = Game.market.credits
      let message: string | undefined

      if (Game.cpu.bucket < 6000) {
        message = `CPU Bucket ${Game.cpu.bucket}`
      }

      if (credit < 190000) {
        const credit_message = `Credit ${credit}`
        message = message ? (message + credit_message) : credit_message
      }

      if (message) {
        message = '[WARNING] ' + message

        console.log(message)
        Game.notify(message)
      }
    }, `Notigy credit | cpu`)()
  }
}, `Main`)

function trade():void {
  if (Memory.trading.stop) {
    console.log(`STOP TRADING ${Memory.trading.stop}`)
    return
  }

  const credit_amount = Game.market.credits

  const hydrogen_first_room_name = 'W44S7'  // H
  const hydrogen_second_room_name = 'W48S6'  // H
  const hydrogen_third_room_name = 'W47N2'  // H
  const utrium_first_room_name = 'W43S5'    // U
  const zynthium_first_room_name = 'W43N5'  // Z
  const catalyst_first_room_name = 'W42N1'  // C
  const oxygen_first_room_name = 'W48N11'   // O

  sellResource({
    resource_type: RESOURCE_HYDROGEN,
    price: 0.201,
    trader_room_names: [
      hydrogen_first_room_name,
      hydrogen_second_room_name,
      hydrogen_third_room_name,
    ]
  })

  buyResource({
    resource_type: RESOURCE_KEANIUM,
    price: 0.03,
    trader_room_names: [
      zynthium_first_room_name,
      utrium_first_room_name,
    ],
  }, credit_amount)

  buyResource({
    resource_type: RESOURCE_ZYNTHIUM,
    price: 0.03,
    trader_room_names: [
      zynthium_first_room_name,
      utrium_first_room_name,
    ],
  }, credit_amount)

  buyResource({
    resource_type: RESOURCE_UTRIUM,
    price: 0.03,
    trader_room_names: [
      zynthium_first_room_name,
      utrium_first_room_name,
    ],
  }, credit_amount)

  buyResource({
    resource_type: RESOURCE_LEMERGIUM,
    price: 0.03,
    trader_room_names: [
      zynthium_first_room_name,
      utrium_first_room_name,
    ],
  }, credit_amount)

  buyResource({
    resource_type: RESOURCE_CATALYST,
    price: 0.03,
    trader_room_names: [
      zynthium_first_room_name,
      utrium_first_room_name,
    ],
  }, credit_amount)

  buyResource({
    resource_type: RESOURCE_POWER,
    price: 0.03,
    trader_room_names: [
      zynthium_first_room_name,
      utrium_first_room_name,
    ],
  }, credit_amount)

  buyResource({
    resource_type: RESOURCE_OXYGEN,
    price: 0.03,
    trader_room_names: [
      hydrogen_second_room_name,
      hydrogen_third_room_name,
    ],
  }, credit_amount)

  buyResource({
    resource_type: RESOURCE_HYDROGEN,
    price: 0.03,
    trader_room_names: [
      hydrogen_first_room_name,
      hydrogen_second_room_name,
      hydrogen_third_room_name,
    ]
  }, credit_amount)
}

// type OrderTypeConstant = ORDER_SELL | ORDER_BUY  // not working

/**
 * @param resource_type
 * @param order_type If you want to BUY something, it seeks SELL order
 */
interface TradeResourceOptions {
  resource_type: ResourceConstant,
  price: number,
  trader_room_names: string[],
}

// Sell
function sellResource(opt: TradeResourceOptions): void {

  const orders = buyOrders(opt.resource_type, opt.price)
  const order = orders[0]

  if (order) {
    const trader: Room | undefined = sellerRoom(opt.trader_room_names, opt.resource_type, order.amount)
    let message: string

    if (trader && trader.terminal) {
      const buyer_resource_amount = Math.min((trader.terminal.store[opt.resource_type] || 0), order.amount)


      // const trade_result = "simulate"
      const trade_result = Game.market.deal(order.id, buyer_resource_amount, trader.name)
      message = `SELL ${opt.resource_type}: ${trade_result}, [${order.price} * ${buyer_resource_amount} (+${order.price * buyer_resource_amount})] ${trader.name} orders: ${orders.map(o=>`\n${o.price} * ${o.amount}`)}`
    }
    else {
      message = `[NO Trader] SELL ${opt.resource_type} ${order.price} * ${order.amount} orders: ${orders.map(o=>`\n${o.price} * ${o.amount}`)}`

      const detail: any[] = opt.trader_room_names.map((room_name) => {
        const room = Game.rooms[room_name]
        if (!room) {
          return `\nNO ${room_name}`
        }
        if (!room.terminal || !room.storage) {
          return `\n${room_name} no storage`
        }
        return `\n${room_name}: t${room.terminal.store[opt.resource_type] || 0}, s${room.storage.store[opt.resource_type] || 0}`
      })
      message += `${detail}`
    }

    console.log(message)
    Game.notify(message)
  }
  else {
    // console.log(`No ${opt.resource_type} buy orders (${opt.price})`)
  }
}

function sellerRoom(room_names: string[], resource_type: ResourceConstant, order_amount: number): Room | undefined {
  return room_names.map((room_name) => {
    return Game.rooms[room_name]
  }).filter((room) => {
    if (!room || !room.terminal || !room.storage) {
      return false
    }

    const storage_amount = (room.storage.store[resource_type] || 0)
    if (storage_amount < 40000) {
      return false
    }

    if (room.terminal.cooldown > 0) {
      return false
    }

    const terminal_amount = (room.terminal.store[resource_type] || 0)
    if (terminal_amount > order_amount) {
      return true
    }
    if (terminal_amount >= 10000) {
      return true
    }
    return false
  })[0]
}

function buyOrders(resource_type: ResourceConstant, price: number): Order[] {
  return Game.market.getAllOrders((order) => {
    if (order.type != ORDER_BUY) {
      return false
    }
    if (order.resourceType != resource_type) {
      return false
    }
    if (order.price < price) {
        return false
    }
    if (order.amount < 100) {
      return false
    }
    return true
  }).sort(function(lhs, rhs){
    if( lhs.price > rhs.price ) return -1
    if( lhs.price < rhs.price ) return 1
    return 0
  })
}

// -- Buy
function buyResource(opt: TradeResourceOptions, credit_amount: number): void {
  if (credit_amount < 190000) {
    const message = `main.tradeResource lack of credit ${credit_amount}`
    // console.log(message)
    // Game.notify(message)
    return
  }

  const orders = sellOrders(opt.resource_type, opt.price)
  const order = orders[0]

  if (order) {
    const trader: Room | undefined = buyerRoom(opt.trader_room_names, order.amount)
    let message: string

    if (trader && trader.terminal) {
      const buy_amount = Math.min(order.amount, 20000)

      // const trade_result = "simulate"
      const trade_result = Game.market.deal(order.id, buy_amount, trader.name)
      message = `BUY ${opt.resource_type}: ${trade_result}, [${order.price} * ${buy_amount} (-${order.price * buy_amount})] ${trader.name} orders: ${orders.map(o=>`\n${o.price} * ${o.amount}`)}`
    }
    else {
      message = `[NO Trader] BUY ${opt.resource_type} ${order.price} * ${order.amount} orders: ${orders.map(o=>`\n${o.price} * ${o.amount}`)}`
    }

    console.log(message)
    Game.notify(message)
  }
  else {
    console.log(`No ${opt.resource_type} sell orders (${opt.price})`)
  }
}

function buyerRoom(room_names: string[], order_amount: number): Room | undefined {
  return room_names.map((room_name) => {
    return Game.rooms[room_name]
  }).filter((room) => {
    if (!room || !room.terminal || !room.storage) {
      return false
    }

    const storage_amount = _.sum(room.storage.store)
    if (storage_amount > (room.storage.storeCapacity * 0.8)) {
      return false
    }

    if (room.terminal.cooldown > 0) {
      return false
    }

    const terminal_amount = _.sum(room.terminal.store)
    if ((terminal_amount + order_amount) < (room.terminal.storeCapacity * 0.9)) {
      return true
    }
    return false
  })[0]
}


function sellOrders(resource_type: ResourceConstant, price: number): Order[] {
  return Game.market.getAllOrders((order) => {
    if (order.type != ORDER_SELL) {
      return false
    }
    if (order.resourceType != resource_type) {
      return false
    }
    if (order.price > price) {
        return false
    }
    if (order.amount < 100) {
      return false
    }
    return true
  }).sort(function(lhs, rhs){
    if( lhs.price < rhs.price ) return -1
    if( lhs.price > rhs.price ) return 1
    return 0
  })
}

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
  * Game.rooms['W48S47'].terminal.send(RESOURCE_OXYGEN, 100, 'W49S47', '')
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

/**
 * 2 3 5 7 11 13 17 19 23 29 31 37 41 43 47 53 59 61 67 71 73 79 83 89 97 101 103 107 109 113 127 131 137 139 149 151 157 163 167 173 179 181 191 193 197 199 211 223 227 229 233 239 241 251 257 263 269 271 277 281 283 293 307 311 313 317 331 337 347 349 353 359 367 373 379 383 389 397 401 409 419 421 431 433 439 443 449 457 461 463 467 479 487 491 499 503 509 521 523 541 547 557 563 569 571 577 587 593 599 601 607 613 617 619 631 641 643 647 653 659 661 673 677 683 691 701 709 719 727 733 739 743 751 757 761 769 773 787 797 809 811 821 823 827 829 839 853 857 859 863 877 881 883 887 907 911 919 929 937 941 947 953 967 971 977 983 991 997
 */
