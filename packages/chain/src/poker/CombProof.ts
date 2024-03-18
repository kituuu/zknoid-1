import { Experimental, Provable, Struct } from 'o1js';
import { Combination } from './types';

export class CombPublicInput extends Struct({}) {}

export class CombPublicOutput extends Struct({
  combinations: Provable.Array(Combination, 6), // Max 6 combination
}) {}

export const proveCombintations = (
  publicInput: CombPublicInput,
): CombPublicOutput => {
  return new CombPublicOutput({
    combinations: [],
  });
};

export const CombinationApp = Experimental.ZkProgram({
  publicInput: CombPublicInput,
  publicOutput: CombPublicOutput,
  methods: {
    proveInitialOpen: {
      privateInputs: [],
      method: proveCombintations,
    },
  },
});

export class CombinationProof extends Experimental.ZkProgram.Proof(
  CombinationApp,
) {}
