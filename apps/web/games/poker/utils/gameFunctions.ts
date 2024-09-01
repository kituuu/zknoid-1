type Suit = 'diamonds' | 'clubs' | 'spades' | 'hearts';
type CardValue = number | 'J' | 'Q' | 'K' | 'A';

interface Deck {
  value: CardValue;
  suit: Suit;
}

interface Hand {
  type: HandType;
  primary?: number;
  secondary?: number;
  tertiary?: number;
}

type HandType =
  | 'None'
  | 'One Pair'
  | 'Two Pair'
  | 'Three of a kind'
  | 'Straight'
  | 'Flush'
  | 'Full House'
  | 'Four of a kind'
  | 'Straight Flush'
  | 'Royal Flush';

type SuitMatch = {
  [key in Suit]?: number;
};

export function getHand(pDeck: Deck[], hDeck: Deck[]): Hand | 'Error' {
  const valueMatch: number[] = [];
  const suitMatch: SuitMatch = {};
  const twoMatches: number[] = [];
  const threeMatches: number[] = [];
  const fourMatches: number[] = [];
  let hand: Hand = { type: 'None' };

  const playerDeck = pDeck.filter((item): item is Deck => !!item);
  const houseDeck = hDeck.filter((item): item is Deck => !!item);

  const combined = playerDeck.concat(houseDeck).map((item) => {
    if (item.value === 'J') return { suit: item.suit, value: 11 };
    if (item.value === 'Q') return { suit: item.suit, value: 12 };
    if (item.value === 'K') return { suit: item.suit, value: 13 };
    if (item.value === 'A') return { suit: item.suit, value: 14 };
    return { suit: item.suit, value: item.value as number };
  });

  if (!combined.length) return 'Error';

  const values = combined.map((item) => item.value);
  const descending = values.sort((a, b) => b - a);
  const suits = combined.map((item) => item.suit);

  values.forEach((x) => {
    valueMatch[x] = (valueMatch[x] || 0) + 1;
  });
  suits.forEach((x) => {
    suitMatch[x] = (suitMatch[x] || 0) + 1;
  });

  for (let i = 1; i < 14; i++) {
    if (valueMatch[i] === 2) twoMatches.push(i);
    else if (valueMatch[i] === 3) threeMatches.push(i);
    else if (valueMatch[i] === 4) fourMatches.push(i);
  }

  combined.forEach((card) => {
    const { suit, value } = card;
    const Straight =
      values.includes(value + 1) &&
      values.includes(value + 2) &&
      values.includes(value + 3) &&
      values.includes(value + 4);

    const StraightFlush =
      combined.some((e) => e.value === value + 1 && e.suit === suit) &&
      combined.some((e) => e.value === value + 2 && e.suit === suit) &&
      combined.some((e) => e.value === value + 3 && e.suit === suit) &&
      combined.some((e) => e.value === value + 4 && e.suit === suit);

    const FiveHigh =
      values.includes(14) &&
      values.includes(2) &&
      values.includes(3) &&
      values.includes(4) &&
      values.includes(5);

    const SteelWheel =
      combined.some((e) => e.value === 14 && e.suit === suit) &&
      combined.some((e) => e.value === 2 && e.suit === suit) &&
      combined.some((e) => e.value === 3 && e.suit === suit) &&
      combined.some((e) => e.value === 4 && e.suit === suit) &&
      combined.some((e) => e.value === 5 && e.suit === suit);

    if (value === 10 && StraightFlush) {
      hand.type = 'Royal Flush';
    } else if (StraightFlush) {
      hand.type = 'Straight Flush';
      hand.primary = value + 4;
    } else if (Straight) {
      hand.type = 'Straight';
      hand.primary = value + 4;
    } else if ([14, 2, 3, 4, 5].includes(value) && SteelWheel) {
      hand.type = 'Straight Flush';
      hand.primary = 5;
    } else if ([14, 2, 3, 4, 5].includes(value) && FiveHigh) {
      hand.type = 'Straight';
      hand.primary = 5;
    }
  });

  if (
    hand.type === 'None' &&
    twoMatches.length === 1 &&
    threeMatches.length === 0
  ) {
    hand.type = 'One Pair';
    hand.primary = twoMatches[0];

    const descendingFiltered = descending.filter((e) => e !== hand.primary);
    hand.secondary = descendingFiltered[0];
    hand.tertiary = descendingFiltered[1];
  } else if (twoMatches.length === 2) {
    hand.type = 'Two Pair';
    hand.primary = twoMatches[1];
    hand.secondary = twoMatches[0];

    hand.tertiary = descending.filter(
      (e) => e !== hand.primary && e !== hand.secondary
    )[0];
  } else if (twoMatches.length > 2) {
    hand.type = 'Two Pair';
    hand.primary = twoMatches[twoMatches.length - 1];
    hand.secondary = twoMatches[twoMatches.length - 2];

    hand.tertiary = descending.filter(
      (e) => e !== hand.primary && e !== hand.secondary
    )[0];
  } else if (twoMatches.length === 0 && threeMatches.length === 1) {
    hand.type = 'Three of a kind';
    hand.primary = threeMatches[0];

    hand.secondary = descending.filter((e) => e !== hand.primary)[0];
  } else if (Object.keys(suitMatch).length < 4 && checkFlush(suitMatch)) {
    hand.type = 'Flush';
    hand.primary = descending[0];
  } else if (twoMatches.length === 1 && threeMatches.length === 1) {
    hand.type = 'Full House';
    hand.primary = threeMatches[0];
    hand.secondary = twoMatches[0];
  } else if (fourMatches.length === 1) {
    hand.type = 'Four of a kind';
    hand.primary = fourMatches[0];
    hand.secondary = descending.filter((e) => e !== hand.primary)[0];
  } else if (
    hand.type === 'None' ||
    ['Royal Flush', 'Straight Flush', 'Straight'].includes(hand.type)
  ) {
    hand.primary = descending[0];
    hand.secondary = descending[1];
  }

  return hand;
}

export function getWinner(
  p1: string,
  p2: string,
  hand1: Hand,
  hand2: Hand
): string {
  const rank1 = getRank(hand1.type);
  const rank2 = getRank(hand2.type);

  function getRank(handType: HandType): number {
    switch (handType) {
      case 'None':
        return 0;
      case 'One Pair':
        return 1;
      case 'Two Pair':
        return 2;
      case 'Three of a kind':
        return 3;
      case 'Straight':
        return 4;
      case 'Flush':
        return 5;
      case 'Full House':
        return 6;
      case 'Four of a kind':
        return 7;
      case 'Straight Flush':
      case 'Royal Flush':
        return 8;
    }
  }

  if (rank1 > rank2) return p1;
  if (rank1 < rank2) return p2;
  if (rank1 === rank2) {
    if (hand1.type !== 'Royal Flush') {
      if (hand1.primary! > hand2.primary!) return p1;
      if (hand1.primary! < hand2.primary!) return p2;
      if (hand1.primary === hand2.primary) {
        if (hand1.secondary !== undefined && hand2.secondary !== undefined) {
          if (hand1.secondary > hand2.secondary) return p1;
          if (hand1.secondary < hand2.secondary) return p2;
          if (hand1.secondary === hand2.secondary) {
            if (hand1.tertiary !== undefined && hand2.tertiary !== undefined) {
              if (hand1.tertiary > hand2.tertiary) return p1;
              if (hand1.tertiary < hand2.tertiary) return p2;
              if (hand1.tertiary === hand2.tertiary) return 'Tie';
            } else return 'Tie';
          }
        } else return 'Tie';
      }
    } else if (hand1.type === 'Royal Flush') {
      return 'Tie';
    }
  }
  return 'Tie'; // Default case
}

function checkFlush(suitMatch: SuitMatch): boolean {
  return Object.values(suitMatch).some((count) => count >= 5);
}
