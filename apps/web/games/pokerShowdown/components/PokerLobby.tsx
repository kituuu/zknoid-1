import GamePage from '@/components/framework/GamePage';
import { useContext, useState } from 'react';
import ZkNoidGameContext from '@/lib/contexts/ZkNoidGameContext';
import { ClientAppChain, ProtoUInt64 } from 'zknoid-chain-dev';
import { useNetworkStore } from '@/lib/stores/network';
import LobbyPage from '@/components/framework/Lobby/LobbyPage';
import { pokerShowdownConfig } from '../config';

export default function PokerLobby({
  params,
}: {
  params: { lobbyId: string };
}) {
  const networkStore = useNetworkStore();

  const { client } = useContext(ZkNoidGameContext);

  if (!client) {
    throw Error('Context app chain client is not set');
  }

  const client_ = client as ClientAppChain<
    typeof pokerShowdownConfig.runtimeModules,
    any,
    any,
    any
  >;

  return (
    <GamePage gameConfig={pokerShowdownConfig} defaultPage={'Lobby list'}>
      <LobbyPage
        lobbyId={params.lobbyId}
        query={
          networkStore.protokitClientStarted
            ? client_.query.runtime.RandzuLogic
            : undefined
        }
        contractName={'RandzuLogic'}
        config={pokerShowdownConfig}
      />
    </GamePage>
  );
}
