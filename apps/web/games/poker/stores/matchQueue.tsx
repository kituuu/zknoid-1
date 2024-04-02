import { create, useStore } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Group, PrivateKey, PublicKey, UInt32, UInt64 } from 'o1js';
import { useContext, useEffect } from 'react';
import { useProtokitChainStore } from '@/lib/stores/protokitChain';
import { useNetworkStore } from '@/lib/stores/network';
import { RoundIdxUser } from 'zknoid-chain-dev';
import AppChainClientContext from '@/lib/contexts/AppChainClientContext';
import { pokerConfig } from '../config';
import { ClientAppChain } from '@proto-kit/sdk';
import {
  EncryptedCard,
  EncryptedDeck,
  GameIndex,
} from 'zknoid-chain-dev/dist/src/poker/types';
import { decryptOne } from 'zknoid-chain-dev/dist/src/engine/ElGamal';
import { useSessionKeyStore } from '@/lib/stores/sessionKeyStorage';

export interface ICard {
  value: [Group, Group];
  numOfEncryptions: number;
}

export interface IGameInfo {
  status: number;
  gameId: bigint;
  contractDeck: EncryptedDeck;
  contractDeckDecrypted: EncryptedDeck;
  deck: ICard[];
  nextUser: PublicKey;
  agrigatedPubKey: PublicKey;
  players: number;
  selfIndex: number;
  round: number;
}

export interface MatchQueueState {
  loading: boolean;
  queueLength: number;
  inQueue: boolean;
  activeGameId: bigint;
  gameInfo: IGameInfo | undefined;
  lastGameState: 'win' | 'lost' | undefined;
  getQueueLength: () => number;
  loadMatchQueue: (
    client: ClientAppChain<typeof pokerConfig.runtimeModules, any, any, any>,
    blockHeight: number
  ) => Promise<void>;
  loadActiveGame: (
    client: ClientAppChain<typeof pokerConfig.runtimeModules, any, any, any>,
    blockHeight: number,
    address: PublicKey,
    sessionPrivateKey: PrivateKey
  ) => Promise<void>;
  resetLastGameState: () => void;
}

const PENDING_BLOCKS_NUM = UInt64.from(20);

const decryptOwnCards = (
  initialDeck: EncryptedDeck,
  selfIndex: number,
  privateKey: PrivateKey
): EncryptedDeck => {
  console.log('Decrypt own cards');

  let deck = EncryptedDeck.fromJSONString(initialDeck.toJSONString());

  for (let i = 0; i < 2; i++) {
    let cardIndex = 5 + 2 * selfIndex + i;
    let curCard = deck.cards[cardIndex];

    if (+curCard.numOfEncryption.toString() == 1) {
      console.log(deck.cards[cardIndex].value);
      deck.cards[cardIndex].value[2] = curCard.value[2].add(
        decryptOne(privateKey, curCard.value[0])
      );
      deck.cards[cardIndex].numOfEncryption =
        deck.cards[cardIndex].numOfEncryption.sub(1);
    }
  }

  return deck;
};

export const usePokerMatchQueueStore = create<
  MatchQueueState,
  [['zustand/immer', never]]
>(
  immer((set) => ({
    loading: Boolean(false),
    leaderboard: {},
    queueLength: 0,
    activeGameId: BigInt(0),
    inQueue: Boolean(false),
    gameInfo: undefined as IGameInfo | undefined,
    lastGameState: undefined as 'win' | 'lost' | undefined,
    resetLastGameState() {
      set((state) => {
        state.lastGameState = undefined;
        state.gameInfo = undefined;
      });
    },
    getQueueLength() {
      return this.queueLength;
    },
    async loadMatchQueue(
      client: ClientAppChain<typeof pokerConfig.runtimeModules, any, any, any>,
      blockHeight: number
    ) {
      set((state) => {
        state.loading = true;
      });

      const queueLength = await client.query.runtime.Poker.queueLength.get(
        UInt64.from(blockHeight).div(PENDING_BLOCKS_NUM)
      );

      set((state) => {
        // @ts-ignore
        state.queueLength = Number(queueLength?.toBigInt() || 0);
        state.loading = false;
      });
    },
    async loadActiveGame(
      client: ClientAppChain<typeof pokerConfig.runtimeModules, any, any, any>,
      blockHeight: number,
      address: PublicKey,
      sessionPrivateKey: PrivateKey
    ) {
      set((state) => {
        state.loading = true;
      });

      const activeGameId =
        await client.query.runtime.Poker.activeGameId.get(address);
      console.log('Active game id', activeGameId);
      const inQueue =
        await client.query.runtime.Poker.queueRegisteredRoundUsers.get(
          // @ts-expect-error
          new RoundIdxUser({
            roundId: UInt64.from(blockHeight).div(PENDING_BLOCKS_NUM),
            userAddress: address,
          })
        );

      console.log('Active game id', activeGameId?.toBigInt());
      console.log('In queue', inQueue?.toBoolean());

      if (
        activeGameId?.equals(UInt64.from(0)).toBoolean() &&
        this.gameInfo?.gameId
      ) {
        console.log('Setting last game state', this.gameInfo?.gameId);
        const gameInfo = (await client.query.runtime.Poker.games.get(
          UInt64.from(this.gameInfo?.gameId!)
        ))!;
        console.log('Fetched last game info', gameInfo);
        console.log('Game winner', gameInfo.winner.toBase58());

        //     const field = (gameInfo.field as RandzuField).value.map((x: UInt32[]) =>
        //       x.map((x) => x.toBigint()),
        //     );

        //     set((state) => {
        //       state.lastGameState = gameInfo.winner.equals(address).toBoolean()
        //         ? 'win'
        //         : 'lost';
        //       state.gameInfo!.field = field;
        //       state.gameInfo!.isCurrentUserMove = false;
        //     });
      }

      if (activeGameId?.greaterThan(UInt64.from(0)).toBoolean()) {
        const gameInfo =
          (await client.query.runtime.Poker.games.get(activeGameId))!;
        console.log('Raw game info', gameInfo);

        let deck = gameInfo.deck.cards.map((card: EncryptedCard) => {
          return {
            value: card.value,
            numOfEncryptions: +card.numOfEncryption.toString(), // #TODO change to the same name
          };
        });

        let nextUserIndex = gameInfo.round.curPlayerIndex;
        // @ts-ignore
        let userIndex = new GameIndex({
          gameId: activeGameId!,
          index: nextUserIndex,
        });
        let nextUser =
          (await client.query.runtime.Poker.players.get(userIndex))!;

        let status = +gameInfo.status.toString();
        let agrigatedPubKey = gameInfo.agrigatedPubKey;
        let players = +gameInfo.meta.maxPlayers.toString();
        let selfIndex = -1;
        let round = +gameInfo.round.index.toString();

        for (let i = 0; i < players; i++) {
          // @ts-ignore
          let index = new GameIndex({
            gameId: activeGameId!,
            index: UInt64.from(i),
          });
          let curPlayer = await client.query.runtime.Poker.players.get(index);

          if (curPlayer?.equals(address).toBoolean()) {
            selfIndex = i;
          }
        }

        // Decrypt own cards
        let contractDeck = gameInfo.deck;
        let contractDeckDecrypted = decryptOwnCards(
          contractDeck,
          selfIndex,
          sessionPrivateKey
        );

        // const currentUserIndex = address
        //   .equals(gameInfo.player1 as PublicKey)
        //   .toBoolean()
        //   ? 0
        //   : 1;
        // const player1 = gameInfo.player1 as PublicKey;
        // const player2 = gameInfo.player2 as PublicKey;
        // const field = (gameInfo.field as RandzuField).value.map((x: UInt32[]) =>
        //   x.map((x) => x.toBigint()),
        // );
        set((state) => {
          // @ts-ignore
          state.gameInfo = {
            status,
            gameId: activeGameId.toBigInt(),
            contractDeck,
            contractDeckDecrypted,
            deck,
            nextUser,
            agrigatedPubKey,
            players,
            selfIndex,
            round,
          };
          console.log('Parsed game info', state.gameInfo);
        });
      }

      set((state) => {
        // @ts-ignore
        state.activeGameId = activeGameId?.toBigInt() || 0n;
        state.inQueue = inQueue?.toBoolean();
        state.loading = false;
      });
    },
  }))
);

export const useObservePokerMatchQueue = () => {
  const chain = useProtokitChainStore();
  const network = useNetworkStore();
  const matchQueue = usePokerMatchQueueStore();
  const client = useContext<
    ClientAppChain<typeof pokerConfig.runtimeModules, any, any, any> | undefined
  >(AppChainClientContext);
  const sessionPrivateKey = useStore(useSessionKeyStore, (state) =>
    state.getSessionKey()
  );

  useEffect(() => {
    if (!network.walletConnected) {
      return;
    }

    if (!client) {
      throw Error('Context app chain client is not set');
    }

    matchQueue.loadMatchQueue(client, parseInt(chain.block?.height ?? '0'));
    matchQueue.loadActiveGame(
      client,
      parseInt(chain.block?.height ?? '0'),
      PublicKey.fromBase58(network.address!),
      sessionPrivateKey
    );
  }, [chain.block?.height, network.walletConnected]);
};
