import { State, StateMap } from '@proto-kit/protocol';
import { MatchMaker, QueueListItem } from '../engine/MatchMaker';
import { state, runtimeMethod, runtimeModule } from '@proto-kit/module';
import { Proof, Provable, Struct, UInt64 } from 'o1js';
import { GameInfo } from 'src/randzu/RandzuLogic';

const FOOL_DECK_SIZE = 36;

export class Card extends Struct({
    value: UInt64,
}) {}

export class Deck extends Struct({
    cards: Provable.Array(Card, FOOL_DECK_SIZE),
}) {}

@runtimeModule()
export class FoolHub extends MatchMaker {
    @state() public games = StateMap.from<UInt64, GameInfo>(UInt64, GameInfo);

    @state() public gamesNum = State.from<UInt64>(UInt64);
}
