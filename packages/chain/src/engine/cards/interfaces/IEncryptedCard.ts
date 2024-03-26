import { UInt64 } from 'o1js';

export interface IEncrypedCard<C> {
  toCard(): C;
  add(ec: ThisType<this>): ThisType<this>;
  numOfEncryption: UInt64;
}
