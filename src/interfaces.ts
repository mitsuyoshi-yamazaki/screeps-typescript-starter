
export enum ActionResult {
  OK = 'ok'
}

export interface GroupActionType {
  say(message: string): ActionResult
  expand(roomnames: string[]): ActionResult
}
