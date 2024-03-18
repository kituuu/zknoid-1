import { Bool, Experimental, Int64, Provable, Struct, UInt64 } from 'o1js';
import { Card, Combination } from './types';
import assert from 'assert';

// Can be done without proof, if needed

export class CombProposal extends Struct({
  proposedComb: UInt64,
  indexes: Provable.Array(Int64, 5),
}) {}

export class CombPublicInput extends Struct({
  encryptedCards: Provable.Array(Card, 7),
  cards: Provable.Array(Card, 7),
  combinationProposal: Provable.Array(CombProposal, 6),
}) {}

export class CombPublicOutput extends Struct({
  combinations: Provable.Array(Combination, 6), // Max 6 combination
}) {}

const pickCard = (cards: Card[], index: UInt64): Card => {
  let card = cards[0];

  for (let i = 0; i < cards.length; i++) {
    card = Provable.if(
      cards[i].getIndex().equals(index),
      Card,
      cards[i],
      card,
    ) as Card;
  }

  return card;
};

const processPair = (cards: Card[], proposal: Int64[]): [Combination, Bool] => {
  let first = pickCard(cards, proposal[0].magnitude);
  let second = pickCard(cards, proposal[1].magnitude);

  return [
    new Combination({ id: Combination.pairId, value: first.value }),
    first.value.equals(second.value),
  ];
};

interface CombVariant {
  id: UInt64;
  process: (cards: Card[], proposal: Int64[]) => [Combination, Bool];
}

const combVariants: CombVariant[] = [
  {
    id: Combination.pairId,
    process: processPair,
  },
];

const processProposal = (
  cards: Card[],
  proposal: CombProposal,
): Combination => {
  let processResults: [Bool, [Combination, Bool]][] = combVariants.map(
    (variant) => [
      proposal.proposedComb.equals(variant.id),
      variant.process(cards, proposal.indexes),
    ],
  );

  // Rewrite to readable form
  let splitted = processResults.reduce(
    (acc: [Bool[], Combination[]], val) => {
      assert(val[0].not().or(val[1][1])); // Check thet proposed check succeed

      acc[0].push(val[0]);
      acc[1].push(val[1][0]);

      return acc;
    },
    [[], []],
  );

  // let isDoubleProposed = proposal.proposedComb.equals(Combination.doubleId);
  // let [doubleCombination, doubleRes] = processDouble(cards, proposal.indexes);
  // assert(isDoubleProposed.not().or(doubleRes));

  return Provable.switch(splitted[0], Combination, splitted[1]);
};

export const proveCombintations = (
  publicInput: CombPublicInput,
): CombPublicOutput => {
  // Check that card is decrypted right

  // Check that combinationProposal do not have duplicate items

  return new CombPublicOutput({
    combinations: publicInput.combinationProposal.map((proposal) =>
      processProposal(publicInput.cards, proposal),
    ),
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
