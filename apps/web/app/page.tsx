'use client';

import 'reflect-metadata';
import { useEffect, useState } from 'react';
import Footer from '@/components/widgets/Footer/Footer';
import MainSection from '@/components/pages/MainSection';
import { IGame, announcedGames, defaultGames } from './constants/games';
import Header from '@/components/widgets/Header';
import ZkNoidGameContext from '@/lib/contexts/ZkNoidGameContext';
import { BorderBeam } from '@/components/ui/BorderBeam';
import { RotatingCards } from '@/components/rotatingcards';
import { TextHoverEffect } from '@/components/ui/text-hover-effect';
import HyperText from '@/components/magicui/hyper-text';
import Particles from '@/components/magicui/particles';

export default function Home() {
  const [games, setGames] = useState<IGame[]>(
    defaultGames.concat(announcedGames)
  );

  useEffect(() => {
    const zkNoidConfig = import('@/games/config');

    zkNoidConfig.then((zkNoidGames) => {
      setGames(
        (
          zkNoidGames.zkNoidConfig.games.map((x) => ({
            id: x.id,
            logo: x.image,
            logoMode: x.logoMode,
            name: x.name,
            description: x.description,
            genre: x.genre,
            features: x.features,
            tags: [],
            defaultPage: x.pageCompetitionsList
              ? 'competitions-list'
              : x.lobby
                ? 'lobby/undefined'
                : 'global',
            active: true,
            isReleased: x.isReleased,
            releaseDate: x.releaseDate,
            popularity: x.popularity,
            author: x.author,
            rules: x.rules,
            rating: 0,
            externalUrl: x.externalUrl,
          })) as IGame[]
        ).concat(announcedGames)
      );
    });
  }, []);

  return (
    <ZkNoidGameContext.Provider
      value={{
        client: undefined,
        appchainSupported: false,
        buildLocalClient: true,
      }}
    >
      <BorderBeam />
      {/* <Particles
        className="absolute inset-0"
        quantity={100}
        ease={80}
        color={'#ffffff'}
        refresh
      /> */}
      <div className="flex min-h-screen flex-col">
        <Header />

        <main className="flex flex-col px-5">
          <div className="flex h-screen w-screen flex-col-reverse items-center justify-end lg:flex-row  lg:justify-between">
            <div className="flex w-full flex-col items-center md:w-2/5">
              <RotatingCards />
              {/* <Link
                href={'/poker'}
                className="w-96 bg-red-400 !px-3 !py-2 text-black"
              >
                Play Now!!! asdf s
              </Link> */}
            </div>
            <div className="flex w-full flex-col items-center lg:w-3/5">
              <TextHoverEffect text="ZKasino" />
              <HyperText
                text="Spin, Deal, Prove - The Future of Fair Play"
                className="md:text-3xl"
              />
              <HyperText
                text="Where Every Bet is Verified, Every Win is Certain"
                className="md:text-2xl"
              />
            </div>
          </div>
          <MainSection games={games} />
        </main>

        <Footer />

        {/*<ToastContainer />*/}
      </div>
    </ZkNoidGameContext.Provider>
  );
}
