import React, { useEffect, useState } from 'react';
import { Box, Text, useApp } from 'ink';
import { useWindowSize } from '../../../hooks/useWindowSize.js';
import { SelectList, SelectItem } from '../components/SelectList.js';
import { HelpBar } from '../components/HelpBar.js';
import { Screen } from '../components/Screen.js';
import type { Route } from '../App.js';

interface MainMenuProps {
  onNavigate: (route: Route) => void;
  onOpenChat: () => void;
}

type MainMenuAction =
  | { type: 'route'; route: Route }
  | { type: 'chat' };

const MENU_ITEMS: SelectItem<MainMenuAction>[] = [
  {
    id: 'chat',
    label: 'Owner Chat',
    value: { type: 'chat' },
    description: 'Open a full-screen chat with a Robin',
  },
  {
    id: 'agents',
    label: 'Robins',
    value: { type: 'route', route: { type: 'agents' } },
    description: 'Select a Robin to access its conversations and customers',
  },
];

const ROBIN_BANNER = [
  ' ▄████▄   ▄████▄   ▄████▄  ██  ███▄  ██',
  ' ██  ██   ██  ██   ██  ██  ██  ████▄ ██',
  ' █████▀   ██  ██   █████▀  ██  ██ ▀█▄██',
  ' ██  ██   ██  ██   ██  ██  ██  ██  ▀███',
  ' ██  ██   ▀████▀   █████▀  ██  ██   ▀██',
].join('\n');

const README_ROBIN = [
  '            +nLpOQdX                          qFut@wcz|@t',
  '          lp@@@@DRmYk@@pc>                      F@zLc^ !rB@',
  '     |@@@@DDBqOOmO00YtUB@@@@+                  p@zcZ|>XvR@',
  '    Y@zl!~=   :!nYL0QXn!~~ld@v                c@Jzct!vn#@',
  '    J@n=              ~!<   U@               ihmLzfjun@d',
  '     v@l)hd&@@rLB@@@@@bYrJu  O@              pwCjrJjr@U',
  '   =  +@@x  :h@@@RRp;     ;<  u@            ZddXjztj@r',
  ' @@@@@@#@! +t 0@   r;)nLLOQwdw> LC   ;     OppzfJtr@x',
  'i@(rl(z  q, x(@@jUzYLQLvJpwmOmdOcwm@@l    Xdhv|)t(@n',
  ' J@@QtrzzJhh0ZU(LOLJuY0LZLnzUYQQ0JU#c    cdC)v<FkDz',
  '   cF@R0@Gd0z>trt)lxvzCYULQJJLOCLLYYBGd<)qciY(X@@t',
  '        @mOOOOcfvcuOZbQLQQQQJcYJCCCL0ZkZlr0@btm@c',
  '        @OLXrvY0OJQwcJQQJYYzXzvcuYXYJL>,rd@GpL@d',
  '       (@UzrzcvfjvxnxxXJnvXvuf)rYLGRLn c@@@dqB@bq',
  '       FBD((xtl(tflfnrxzncJLmwvjvJLLurrb@@#F#@@@|',
  '       @bkzvYLnccvcYYLQzvczQZppLt|jjx|zbpGG@@#@@',
  '       @mbqnrvrrrmkRmUczLJzuvvLdQ(+~~<)= :nuqh@@(',
  '       @@b0J> urQO, ;)junxXzYntjY0X!   +LcYB&&@@w:',
  '        @@O@GXfnf++vx)<itvXzzYzcflt<== c@@@@hFu OGv',
  '        =@@qbqXzcz>,l)((|)frnnnnxvcXrnwcftxLCr   x#O',
  '         ^@@kR#DGFGdJUnnnnrnnfnxjtvnjk@@@qR@@@Cq<  O|',
  '           @@@RZh0LZR@FJflxzXvrjnrzX!Y@@#G@@@   vhL;n~',
  '            )@@@@DhmQLdRDw0CYLZJx>;^>,^rQ@Bn      <ffY+',
  '              !@@@@@@DdR#RFk0JvO&@@RCjrlt@           lpX',
  '                 )@@@@@@@O@@@@@@@@@@@@v+iUx            +',
  '                     : d@kwq&hX|)+  px',
  '                       k            h',
  '                     O@            ;@',
  '                    &D             ZQ',
  '                  ,&n              Y>',
  '           +QJ),:QCv     ; um@DRLZL(r |',
  '          =uZmdbFkpG@##bJuJZJOqpR@@@@F@m(li<^',
];

const SPLASH_COLORS = ['yellow', 'red', 'magenta', 'cyan'] as const;

let hasShownSplash = false;

export function MainMenu({ onNavigate, onOpenChat }: MainMenuProps): React.ReactElement {
  const { exit } = useApp();
  const [showSplash, setShowSplash] = useState(!hasShownSplash);
  const { columns } = useWindowSize();
  const panelWidth = Math.min(Math.max(1, columns), 76);

  useEffect(() => {
    if (!showSplash) return undefined;

    const timer = setTimeout(() => {
      hasShownSplash = true;
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [showSplash]);

  if (showSplash) {
    return <LoadingSplash />;
  }

  return (
    <Screen footer={(
      <HelpBar bindings={[
        { key: '↑↓', label: 'navigate' },
        { key: 'Enter', label: 'select' },
        { key: 'q', label: 'quit' },
      ]} />
    )}>
      <Box flexDirection="column" flexGrow={1} justifyContent="center">
        <Box alignItems="center" justifyContent="center" marginBottom={1}>
          <Box
            flexDirection="column"
            width={panelWidth}
            paddingX={2}
            paddingY={1}
          >
            <Box flexDirection="column" alignItems="center" marginBottom={1}>
              <Text color="yellow" bold>{ROBIN_BANNER}</Text>
            </Box>
            <SelectList
              items={MENU_ITEMS}
              onSelect={(item) => {
                if (item.value.type === 'chat') {
                  onOpenChat();
                  return;
                }

                onNavigate(item.value.route);
              }}
              onCancel={() => exit()}
            />
          </Box>
        </Box>
      </Box>
    </Screen>
  );
}

function LoadingSplash(): React.ReactElement {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick(current => current + 1), 140);
    return () => clearInterval(timer);
  }, []);

  return (
    <Screen>
      <Box flexDirection="column" flexGrow={1}>
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          <Box flexDirection="column">
            {README_ROBIN.map((line, index) => (
              <Text
                key={index}
                color={SPLASH_COLORS[Math.floor((index + tick) / 3) % SPLASH_COLORS.length]}
                bold={index % 4 === tick % 4}
                dimColor={index % 4 !== tick % 4}
              >
                {line}
              </Text>
            ))}
          </Box>
        </Box>
        <Box justifyContent="center" marginBottom={1}>
          <Text color={SPLASH_COLORS[tick % SPLASH_COLORS.length]}>loading robin shell...</Text>
        </Box>
      </Box>
    </Screen>
  );
}
