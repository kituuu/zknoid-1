import OrbitingCircles from './ui/OrbitingCircles';

export function RotatingCards() {
  return (
    <div className="relative flex h-[500px] w-full flex-col items-center justify-center overflow-hidden">
      <span className="pointer-events-none whitespace-pre-wrap bg-gradient-to-b from-black to-gray-300 bg-clip-text text-center text-8xl font-semibold leading-none text-transparent dark:from-white dark:to-black">
        {/* Circles */}
      </span>

      {/* Inner Circles */}
      <OrbitingCircles
        className="size-[20px] border-none bg-transparent"
        duration={20}
        delay={20}
        radius={80}
      >
        <Icons.redjoker />
      </OrbitingCircles>
      <OrbitingCircles
        className="size-[25px] border-none bg-transparent"
        duration={20}
        delay={10}
        radius={80}
      >
        <Icons.blackking />
      </OrbitingCircles>

      {/* Outer Circles (reverse) */}
      <OrbitingCircles
        className="size-[40px] border-none bg-transparent"
        radius={190}
        duration={20}
        reverse
      >
        <Icons.redqueen />
      </OrbitingCircles>
      <OrbitingCircles
        className="size-[35px] border-none bg-transparent"
        radius={190}
        duration={20}
        delay={20}
        reverse
      >
        <Icons.blackace />
      </OrbitingCircles>
    </div>
  );
}

const Icons = {
  redjoker: () => {
    return <img src="/poker_cards/11_2.svg" alt="" />;
  },
  blackking: () => {
    return <img src="/poker_cards/13_0.svg" alt="" />;
  },
  redqueen: () => {
    return <img src="/poker_cards/12_1.svg" alt="" />;
  },
  blackace: () => {
    return <img src="/poker_cards/14_3.svg" alt="" />;
  },
};
