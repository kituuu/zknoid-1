'use client';

import { IGameInfo } from '@/lib/stores/matchQueue';
import { RandzuField } from 'zknoid-chain-dev';
import { useEffect, useRef, useState } from 'react';
import Game from '@/components/pages/Poker/game/Game';
interface IGameViewProps {
  gameInfo: IGameInfo<RandzuField> | undefined;
  onCellClicked: (x: number, y: number) => void;
  loadingElement: { x: number; y: number } | undefined;
  loading: boolean;
}

export const GameView = (props: IGameViewProps) => {
  const fieldActive =
    props.gameInfo?.isCurrentUserMove && !props.gameInfo?.winner;
  const highlightCells = props.gameInfo?.isCurrentUserMove && !props.loading;
  const displayBall = (i: number, j: number) =>
    props.gameInfo?.isCurrentUserMove &&
    !props.loading &&
    +props.gameInfo?.field?.value?.[j]?.[i] == 0;
  const isLoadingBall = (i: number, j: number) =>
    props.loadingElement &&
    props.loadingElement.x == i &&
    props.loadingElement.y == j;
  const isCurrentRedBall = props.gameInfo?.currentUserIndex == 0;
  const fieldRef = useRef<HTMLDivElement>(null);

  const [fieldHeight, setFieldHeight] = useState<number | 'auto'>(0);
  useEffect(() => {
    const resizeField = () => {
      if (window.innerWidth <= 1024) {
        setFieldHeight('auto');
      } else {
        fieldRef.current && setFieldHeight(fieldRef.current.offsetWidth);
      }
      // fieldRef.current && setFieldHeight(fieldRef.current.offsetWidth);
    };
    resizeField();
    addEventListener('resize', resizeField);
    return () => {
      removeEventListener('resize', resizeField);
    };
  }, []);

  return <Game />;
};
