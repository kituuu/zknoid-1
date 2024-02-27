'use client';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import PokerWorkerClient from '@/worker/pokerWorkerClient';
import { useCallback, useEffect, useMemo } from 'react';

export interface ClientState {
  status: string;
  client?: PokerWorkerClient;
  start: () => Promise<PokerWorkerClient>;
}

// #TODO Merge all workerClientStore to single generic workerClientStore
export const usePokerWorkerClientStore = create<
  ClientState,
  [['zustand/immer', never]]
>(
  immer((set) => ({
    status: 'Not loaded',
    async start() {
      set((state) => {
        state.status = 'Loading worker';
      });

      const zkappWorkerClient = new PokerWorkerClient();

      await zkappWorkerClient.waitFor();

      //   set((state) => {
      //     state.status = 'Loading contracts';
      //   });

      //   await zkappWorkerClient.loadContracts();

      //   set((state) => {
      //     state.status = 'Compiling contracts';
      //   });

      //   await zkappWorkerClient.compileContracts();

      //   set((state) => {
      //     state.status = 'Initializing zkapp';
      //   });

      //   await zkappWorkerClient.initZkappInstance(
      //     'B62qjTmjVvvXnYCWSiEc1eVAz8vWVzJUK4xtBu7oq5ZuNT7aqAnAVub',
      //   );

      set((state) => {
        state.status = 'Initialized';
        state.client = zkappWorkerClient;
      });

      return zkappWorkerClient;
    },
  })),
);

export const useRegisterPokerWorkerClient = () => {
  const workerClientStore = usePokerWorkerClientStore();

  useMemo(() => {
    workerClientStore.start();
  }, []);
};
