import { LocalRepository } from "./localRepository";
import type { Repository } from "./repository";

/*
  The single place that decides which storage backend the app uses.
  Adding Supabase later means implementing Repository and changing this line.
*/
export const repository: Repository = new LocalRepository();

export { STORE_EVENT } from "./localRepository";
export type { Repository } from "./repository";
