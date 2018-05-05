import { Region } from "./region";

enum State {
  EXPAND = "expand"
}

export class Empire {
  private regions: Map<string, Region>

  constructor(readonly name: string, readonly spawns: Map<string, StructureSpawn>) {
    const first = 'W48S47'
    const second = 'W49S47'
    const third = 'W44S42'

    const room_names = [first, second, third]
    const regions = room_names.map((room_name) => {
      return Game.rooms[room_name].controller!  // @todo: error handling: when a room would be destroyed
    }).map((controller) => {
      return new Region(controller)
    })

    this.regions = new Map(regions.map((region): [string, Region] => { return [region.name, region] }))

    // this.regions.get(first)!.delegated_squads = this.regions.get(third)!.squads_need_spawn

    // // Reassign controller keeper
    // this.regions.forEach((region) => {

    //   const room_keeper = region.room.keeper
    //   if (!room_keeper) {
    //     return
    //   }

    //   Memory.squads[room_keeper!.name]
    // })
  }

  public say(message: string): void {
    this.regions.forEach((region) => {
      region.say(message)
    })
  }

  public run(): void {
    this.regions.forEach((region) => {
      region.run()
    })
  }
}
