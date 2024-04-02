'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import { GameView } from './GameView';
import Link from 'next/link';
import { useNetworkStore } from '@/lib/stores/network';
import { useMinaBridge } from '@/lib/stores/protokitBalances';
import { useStore } from 'zustand';
import GamePage from '@/components/framework/GamePage';
import AppChainClientContext from '@/lib/contexts/AppChainClientContext';
import { getRandomEmoji } from '@/games/randzu/utils';
import { pokerConfig } from '../config';
import {
  useObservePokerMatchQueue,
  usePokerMatchQueueStore,
} from '../stores/matchQueue';
import { useSessionKeyStore } from '@/lib/stores/sessionKeyStorage';
import { PublicKey, UInt64 } from 'o1js';
import { usePokerWorkerClientStore } from '../stores/pokerWorker';
import { useRegisterWorkerClient } from '@/lib/stores/workerClient';
import { EncryptedCard, GameStatus } from 'zknoid-chain-dev';
import { decryptOne } from 'zknoid-chain-dev/dist/src/engine/ElGamal';
import { walletInstalled } from '@/lib/helpers';

enum GameState {
  NotStarted,
  MatchRegistration,
  Matchmaking,
  Active,
  Won,
  Lost,
}

export default function PokerPage({
  params,
}: {
  params: { competitionId: string };
}) {
  const [gameState, setGameState] = useState(GameState.NotStarted);
  const client = useContext(AppChainClientContext);

  let initialSended = useRef(false);

  if (!client) {
    throw Error('Context app chain client is not set');
  }

  useObservePokerMatchQueue();

  let [loading, setLoading] = useState(true);

  const networkStore = useNetworkStore();
  const matchQueue = usePokerMatchQueueStore();
  const sessionPublicKey = useStore(useSessionKeyStore, (state) =>
    state.getSessionKey()
  ).toPublicKey();
  const sessionPrivateKey = useStore(useSessionKeyStore, (state) =>
    state.getSessionKey()
  );

  // useRegisterWorkerClient();

  const workerClientStore = usePokerWorkerClientStore();

  const bridge = useMinaBridge();

  useEffect(() => {
    if (matchQueue.inQueue && !matchQueue.activeGameId) {
      setGameState(GameState.Matchmaking);
    } else if (matchQueue.activeGameId) {
      setGameState(GameState.Active);
    } else {
      if (matchQueue.lastGameState == 'win') setGameState(GameState.Won);

      if (matchQueue.lastGameState == 'lost') setGameState(GameState.Lost);
    }
  }, [matchQueue.activeGameId, matchQueue.inQueue, matchQueue.lastGameState]);

  useEffect(() => {
    setLoading(false);
    if (gameState != GameState.Active) {
      return;
    }

    if (
      matchQueue.gameInfo?.nextUser.toBase58() == networkStore.address &&
      matchQueue.gameInfo?.status == GameStatus.SETUP
    ) {
      encryptAll();
    }

    if (
      !initialSended.current &&
      matchQueue.gameInfo?.status == GameStatus.INITIAL_OPEN
    ) {
      initialSended.current = true;
      proveInitial();
    }
  }, [gameState, matchQueue.gameInfo?.nextUser]);

  const restart = () => {};

  const startGame = async () => {
    // if (competition!.enteringPrice > 0) {
    //   console.log(await bridge(competition?.enteringPrice! * 10 ** 9));
    // }

    const poker = client.runtime.resolve('Poker');

    const tx = await client.transaction(
      PublicKey.fromBase58(networkStore.address!),
      () => {
        poker.register(
          sessionPublicKey,
          UInt64.from(Math.round(Date.now() / 1000))
        );
      }
    );

    await tx.sign();
    await tx.send();

    setGameState(GameState.MatchRegistration);
  };

  const encryptAll = async () => {
    let pokerWorkerClient = await workerClientStore.start();

    const shuffleProof = await pokerWorkerClient.proveShuffle(
      matchQueue.gameInfo!.contractDeck,
      matchQueue.gameInfo!.agrigatedPubKey
    );

    const poker = client.runtime.resolve('Poker');

    const tx = await client.transaction(sessionPublicKey, () => {
      poker.setup(UInt64.from(matchQueue.activeGameId), shuffleProof);
    });

    setLoading(true);

    tx.transaction = tx.transaction?.sign(sessionPrivateKey);
    await tx.send();
  };

  const decryptSingle = async (cardId: number) => {
    let card = matchQueue.gameInfo!.contractDeck.cards[cardId];
    // console.log(card);
    // console.log(cardId);
    // console.log(matchQueue.gameInfo!);
    // Change to single workerClientStore.start
    let pokerWorkerClient = await workerClientStore.start();

    const decryptProof = await pokerWorkerClient.proveDecrypt(
      card,
      sessionPrivateKey
    );

    const poker = client.runtime.resolve('Poker');

    const tx = await client.transaction(sessionPublicKey, () => {
      poker.decryptCard(
        UInt64.from(matchQueue.activeGameId),
        UInt64.from(cardId),
        decryptProof
      );
    });

    setLoading(true);

    tx.transaction = tx.transaction?.sign(sessionPrivateKey);
    await tx.send();
  };

  const proveInitial = async () => {
    let pokerWorkerClient = await workerClientStore.start();

    const initalProof = await pokerWorkerClient.proveInitial(
      matchQueue.gameInfo!.contractDeck,
      sessionPrivateKey,
      matchQueue.gameInfo?.selfIndex!
    );

    const poker = client.runtime.resolve('Poker');

    const tx = await client.transaction(sessionPublicKey, () => {
      poker.initialOpen(UInt64.from(matchQueue.activeGameId), initalProof);
    });

    setLoading(true);

    tx.transaction = tx.transaction?.sign(sessionPrivateKey);
    await tx.send();
  };

  const nextTurn = async () => {
    console.log('nextTurn');
    let pokerWorkerClient = await workerClientStore.start();

    const publicOpenProof = await pokerWorkerClient.provePublicOpen(
      matchQueue.gameInfo!.contractDeck,
      sessionPrivateKey,
      UInt64.from(matchQueue.gameInfo!.round)
    );

    console.log('prove ready');

    const poker = client.runtime.resolve('Poker');

    const tx = await client.transaction(sessionPublicKey, () => {
      poker.openNext(UInt64.from(matchQueue.activeGameId), publicOpenProof);
    });

    setLoading(true);

    tx.transaction = tx.transaction?.sign(sessionPrivateKey);
    await tx.send();
  };

  return (
    <GamePage
      gameConfig={pokerConfig}
      image={'/image/game-page/arkanoid-title.svg'} // #TODO change to poker title image
      defaultPage={'Game'}
    >
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

        {gameState == GameState.MatchRegistration && (
          <div>Registering in the match pool 📝 ...</div>
        )}
        {gameState == GameState.Matchmaking && (
          <div>Searching for opponents 🔍 ...</div>
        )}

        {loading && <div> Transaction execution </div>}

        <GameView
          gameInfo={matchQueue.gameInfo}
          publicKey={networkStore.address!}
          sessionKey={sessionPublicKey.toBase58()}
          encryptAll={encryptAll}
          decryptSingle={decryptSingle}
          nextTurn={nextTurn}
        />
        <div>Players in queue: {matchQueue.getQueueLength()}</div>
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
