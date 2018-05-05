import { Region } from "./region";

enum State {
  EXPAND = "expand"
}

export class Empire {
  private regions: Region[]

  constructor(readonly name: string, readonly spawns: Map<string, StructureSpawn>) {
    const room_names = ['W48S47', 'W49S47', 'W44S42']
    this.regions = room_names.map((room_name) => {
      return Game.rooms[room_name].controller!  // @todo: error handling: when a room would be destroyed
    }).map((controller) => {
      return new Region(controller)
    })
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
