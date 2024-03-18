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

const processHigh = (cards: Card[], proposal: Int64[]): [Combination, Bool] => {
  let card = pickCard(cards, proposal[0].magnitude);

  return [
    new Combination({ id: Combination.highId, value: card.value }),
    Bool(true),
  ];
};

const processPair = (cards: Card[], proposal: Int64[]): [Combination, Bool] => {
  let first = pickCard(cards, proposal[0].magnitude);
  let second = pickCard(cards, proposal[1].magnitude);

  return [
    new Combination({ id: Combination.pairId, value: first.value }),
    first.value.equals(second.value),
  ];
};

const processTwoPair = (
  cards: Card[],
  proposal: Int64[],
): [Combination, Bool] => {
  let first = pickCard(cards, proposal[0].magnitude); // Biggest. Should be checked on front
  let second = pickCard(cards, proposal[1].magnitude);
  let third = pickCard(cards, proposal[2].magnitude); // Lowest
  let fourth = pickCard(cards, proposal[3].magnitude);

  return [
    new Combination({
      id: Combination.pairId,
      value: first.value.mul(100).add(third.value),
    }),
    first.value.equals(second.value).and(third.value.equals(fourth.value)),
  ];
};

const processThree = (
  cards: Card[],
  proposal: Int64[],
): [Combination, Bool] => {
  let first = pickCard(cards, proposal[0].magnitude);
  let second = pickCard(cards, proposal[1].magnitude);
  let third = pickCard(cards, proposal[2].magnitude);

  return [
    new Combination({ id: Combination.threeId, value: first.value }),
    first.value.equals(second.value).and(first.value.equals(third.value)),
  ];
};

const processStraight = (
  cards: Card[],
  proposal: Int64[],
): [Combination, Bool] => {
  let first = pickCard(cards, proposal[0].magnitude); // Lowest to highest
  let second = pickCard(cards, proposal[1].magnitude);
  let third = pickCard(cards, proposal[2].magnitude);
  let fourth = pickCard(cards, proposal[3].magnitude);
  let fifth = pickCard(cards, proposal[4].magnitude);

  let expectedFirst = first.value;
  let expectedSecond = expectedFirst.add(1);
  let expectedThird = expectedSecond.add(1);
  let expectedFourth = expectedThird.add(1);
  let expectedFifth = expectedFourth.add(1);

  return [
    new Combination({ id: Combination.straightId, value: first.value }),
    second.value
      .equals(expectedSecond)
      .and(third.value.equals(expectedThird))
      .and(fourth.value.equals(expectedFourth))
      .and(fifth.value.equals(expectedFifth)),
  ];
};

const processFlush = (
  cards: Card[],
  proposal: Int64[],
): [Combination, Bool] => {
  let first = pickCard(cards, proposal[0].magnitude); // First should be biggest. Should be checked on front
  let second = pickCard(cards, proposal[1].magnitude);
  let third = pickCard(cards, proposal[2].magnitude);
  let fourth = pickCard(cards, proposal[3].magnitude);
  let fifth = pickCard(cards, proposal[4].magnitude);
  let color = first.color;

  return [
    new Combination({ id: Combination.flushId, value: first.value }),
    second.color
      .equals(color)
      .and(third.color.equals(color))
      .and(fourth.color.equals(color))
      .and(fifth.color.equals(color)),
  ];
};

const processFullHouse = (
  cards: Card[],
  proposal: Int64[],
): [Combination, Bool] => {
  /// 3 + 2
  let first = pickCard(cards, proposal[0].magnitude);
  let second = pickCard(cards, proposal[1].magnitude);
  let third = pickCard(cards, proposal[2].magnitude);
  let fourth = pickCard(cards, proposal[3].magnitude);
  let fifth = pickCard(cards, proposal[4].magnitude);

  return [
    new Combination({
      id: Combination.fullHouseId,
      value: first.value.mul(100).add(fourth.value),
    }),
    first.value
      .equals(second.value)
      .and(first.value.equals(third.value))
      .and(fourth.value.equals(fifth.value)),
  ];
};

const processFour = (cards: Card[], proposal: Int64[]): [Combination, Bool] => {
  let first = pickCard(cards, proposal[0].magnitude);
  let second = pickCard(cards, proposal[1].magnitude);
  let third = pickCard(cards, proposal[2].magnitude);
  let fourth = pickCard(cards, proposal[3].magnitude);

  return [
    new Combination({ id: Combination.fourId, value: first.value }),
    first.value
      .equals(second.value)
      .and(first.value.equals(third.value))
      .and(first.value.equals(fourth.value)),
  ];
};

const processStraightFlush = (
  cards: Card[],
  proposal: Int64[],
): [Combination, Bool] => {
  let first = pickCard(cards, proposal[0].magnitude); // First should be biggest. Should be checked on front
  let second = pickCard(cards, proposal[1].magnitude);
  let third = pickCard(cards, proposal[2].magnitude);
  let fourth = pickCard(cards, proposal[3].magnitude);
  let fifth = pickCard(cards, proposal[4].magnitude);
  let color = first.color;

  let expectedFirst = first.value;
  let expectedSecond = expectedFirst.add(1);
  let expectedThird = expectedSecond.add(1);
  let expectedFourth = expectedThird.add(1);
  let expectedFifth = expectedFourth.add(1);

  return [
    new Combination({ id: Combination.straightFlushId, value: first.value }),
    second.color
      .equals(color)
      .and(third.color.equals(color))
      .and(fourth.color.equals(color))
      .and(fifth.color.equals(color))
      .and(
        second.value
          .equals(expectedSecond)
          .and(third.value.equals(expectedThird))
          .and(fourth.value.equals(expectedFourth))
          .and(fifth.value.equals(expectedFifth)),
      ),
  ];
};

interface CombVariant {
  id: UInt64;
  process: (cards: Card[], proposal: Int64[]) => [Combination, Bool];
}

const combVariants: CombVariant[] = [
  {
    id: Combination.highId,
    process: processHigh,
  },
  {
    id: Combination.pairId,
    process: processPair,
  },
  {
    id: Combination.twoPairId,
    process: processTwoPair,
  },
  {
    id: Combination.threeId,
    process: processThree,
  },
  {
    id: Combination.straightId,
    process: processStraight,
  },
  {
    id: Combination.flushId,
    process: processFlush,
  },
  {
    id: Combination.fullHouseId,
    process: processFullHouse,
  },
  {
    id: Combination.fourId,
    process: processFour,
  },
  {
    id: Combination.straightFlushId,
    process: processStraightFlush,
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
