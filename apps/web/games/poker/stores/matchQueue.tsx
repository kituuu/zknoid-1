import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { PublicKey, UInt32, UInt64 } from 'o1js';
import { useContext, useEffect } from 'react';
import { useProtokitChainStore } from '@/lib/stores/protokitChain';
import { useNetworkStore } from '@/lib/stores/network';
import { RoundIdxUser } from 'zknoid-chain-dev';
import AppChainClientContext from '@/lib/contexts/AppChainClientContext';
import { pokerConfig } from '../config';
import { ClientAppChain } from '@proto-kit/sdk';

export interface IGameInfo {
  gameId: bigint;
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
    client: ClientAppChain<typeof pokerConfig.runtimeModules>,
    blockHeight: number,
  ) => Promise<void>;
  loadActiveGame: (
    client: ClientAppChain<typeof pokerConfig.runtimeModules>,
    blockHeight: number,
    address: PublicKey,
  ) => Promise<void>;
  resetLastGameState: () => void;
}

const PENDING_BLOCKS_NUM = UInt64.from(5);

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
      client: ClientAppChain<typeof pokerConfig.runtimeModules>,
      blockHeight: number,
    ) {
      set((state) => {
        state.loading = true;
      });

      const queueLength = await client.query.runtime.Poker.queueLength.get(
        UInt64.from(blockHeight).div(PENDING_BLOCKS_NUM),
      );

      set((state) => {
        // @ts-ignore
        state.queueLength = Number(queueLength?.toBigInt() || 0);
        state.loading = false;
      });
    },
    async loadActiveGame(
      client: ClientAppChain<typeof pokerConfig.runtimeModules>,
      blockHeight: number,
      address: PublicKey,
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
          }),
        );

      console.log('Active game id', activeGameId?.toBigInt());
      console.log('In queue', inQueue?.toBoolean());

      if (
        activeGameId?.equals(UInt64.from(0)).toBoolean() &&
        this.gameInfo?.gameId
      ) {
        console.log('Setting last game state', this.gameInfo?.gameId);
        const gameInfo = (await client.query.runtime.Poker.games.get(
          UInt64.from(this.gameInfo?.gameId!),
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
            gameId: activeGameId.toBigInt(),
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
  })),
);

export const useObservePokerMatchQueue = () => {
  const chain = useProtokitChainStore();
  const network = useNetworkStore();
  const matchQueue = usePokerMatchQueueStore();
  const client = useContext<
    ClientAppChain<typeof pokerConfig.runtimeModules> | undefined
  >(AppChainClientContext);

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
    );
  }, [chain.block?.height, network.walletConnected]);
};
