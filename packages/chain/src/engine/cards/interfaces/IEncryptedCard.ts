export interface IEncrypedCard<C> {
  toCard(): C;
  add(ec: ThisType<this>): ThisType<this>;
}
