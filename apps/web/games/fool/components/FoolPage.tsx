'use client';

import { useContext, useState } from 'react';
import { GameView } from './GameView';
import Link from 'next/link';
import { useNetworkStore } from '@/lib/stores/network';
import { useMinaBridge } from '@/lib/stores/protokitBalances';
import { walletInstalled } from '@/lib/utils';
import { useStore } from 'zustand';
import GamePage from '@/components/framework/GamePage';
import AppChainClientContext from '@/lib/contexts/AppChainClientContext';
import { getRandomEmoji } from '@/games/randzu/utils';
import { foolConfig } from '../config';

enum GameState {
  NotStarted,
  MatchRegistration,
  Matchmaking,
  Active,
  Won,
  Lost,
}

export default function RandzuPage({
  params,
}: {
  params: { competitionId: string };
}) {
  const [gameState, setGameState] = useState(GameState.NotStarted);
  const client = useContext(AppChainClientContext);

  if (!client) {
    throw Error('Context app chain client is not set');
  }

  let [loading, setLoading] = useState(true);
  let [loadingElement, setLoadingElement] = useState<
    { x: number; y: number } | undefined
  >({ x: 0, y: 0 });

  const networkStore = useNetworkStore();

  const bridge = useMinaBridge();

  const restart = () => {};

  const startGame = async () => {};

  return (
    <GamePage gameConfig={foolConfig}>
      <main className="flex grow flex-col items-center gap-5 p-5">
        {networkStore.address ? (
          <div className="flex flex-col gap-5">
            {gameState == GameState.Won && (
              <div>{getRandomEmoji('happy')} You won!</div>
            )}
            {gameState == GameState.Lost && (
              <div>{getRandomEmoji('sad')} You lost!</div>
            )}

            <div className="flex flex-row items-center justify-center gap-5">
              {(gameState == GameState.Won || gameState == GameState.Lost) && (
                <div
                  className="rounded-xl bg-slate-300 p-5 hover:bg-slate-400"
                  onClick={() => restart()}
                >
                  Restart
                </div>
              )}
              {gameState == GameState.NotStarted && (
                <div
                  className="rounded-xl bg-slate-300 p-5 hover:bg-slate-400"
                  onClick={() => startGame()}
                >
                  Start for {/*competition?.enteringPrice*/ 0} 🪙
                </div>
              )}
            </div>
          </div>
        ) : walletInstalled() ? (
          <div
            className="rounded-xl bg-slate-300 p-5"
            onClick={async () => networkStore.connectWallet()}
          >
            Connect wallet
          </div>
        ) : (
          <Link
            href="https://www.aurowallet.com/"
            className="rounded-xl bg-slate-300 p-5"
            rel="noopener noreferrer"
            target="_blank"
          >
            Install wallet
          </Link>
        )}

        <GameView />
        <div>Players in queue: {/*matchQueue.getQueueLength()*/ 0}</div>
        <div className="grow"></div>
        {/* <div className="flex flex-col gap-10">
          <div>
            Active competitions:
            <div className="flex flex-col">
              {randzuCompetitions.map((competition) => (
                <Link
                  href={`/games/randzu/${competition.id}`}
                  key={competition.id}
                >
                  {competition.name} – {competition.prizeFund} 🪙
                </Link>
              ))}
            </div>
          </div>
        </div> */}
      </main>
    </GamePage>
  );
}
