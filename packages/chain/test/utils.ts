import { PrivateKey, PublicKey } from 'o1js';

export interface IUser {
  publicKey: PublicKey;
  privateKey: PrivateKey;
}

export const getTestAccounts = (amount: number): IUser[] => {
  return [...Array(amount)].map(() => {
    let privateKey = PrivateKey.random();
    return {
      privateKey,
      publicKey: privateKey.toPublicKey(),
    };
  });
};
