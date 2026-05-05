import React from 'react';
import { Box, Text } from 'ink';

interface MessageBubbleProps {
  author: string;
  content: string;
  align: 'left' | 'right';
  width: number;
}

export function MessageBubble({
  author,
  content,
  align,
  width,
}: MessageBubbleProps): React.ReactElement {
  const isRight = align === 'right';
  const innerWidth = Math.max(10, width - 6);
  const lines = wrapText(content, innerWidth);

  return (
    <Box justifyContent={isRight ? 'flex-end' : 'flex-start'} marginBottom={2}>
      <Box flexDirection="column" width={width}>
        <Box justifyContent={isRight ? 'flex-end' : 'flex-start'}>
          <Text bold color={isRight ? 'cyan' : 'white'}>{author}</Text>
        </Box>
        <Box
          borderStyle="round"
          borderColor={isRight ? 'cyan' : 'gray'}
          paddingX={1}
          paddingY={1}
          flexDirection="column"
          width={width}
        >
          {lines.map((line, index) => (
            <Text key={index} wrap="truncate">{line}</Text>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function wrapText(value: string, width: number): string[] {
  const paragraphs = value.replace(/\r\n/g, '\n').split('\n');
  const lines = paragraphs.flatMap((paragraph) => wrapParagraph(paragraph, width));
  return lines.length > 0 ? lines : [''];
}

function wrapParagraph(paragraph: string, width: number): string[] {
  if (paragraph.trim() === '') return [''];

  const words = paragraph.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (word.length > width) {
      if (current) {
        lines.push(current);
        current = '';
      }
      lines.push(...breakLongWord(word, width));
      continue;
    }

    const next = current ? `${current} ${word}` : word;
    if (next.length > width) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function breakLongWord(word: string, width: number): string[] {
  const parts: string[] = [];
  for (let index = 0; index < word.length; index += width) {
    parts.push(word.slice(index, index + width));
  }
  return parts;
}
