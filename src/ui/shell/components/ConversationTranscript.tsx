import React from 'react';
import { Box, Text } from 'ink';

export interface TranscriptMessage {
  id: string;
  author: string;
  content: string;
  align: 'left' | 'right';
}

interface TranscriptViewProps {
  messages: TranscriptMessage[];
  transcriptWidth: number;
  bubbleWidth: number;
  visibleLines: number;
  scrollOffsetFromBottom: number;
}

interface TranscriptLine {
  key: string;
  text: string;
  align: 'left' | 'right';
  color?: string;
  withinBubble?: boolean;
}

export function ConversationTranscript({
  messages,
  transcriptWidth,
  bubbleWidth,
  visibleLines,
  scrollOffsetFromBottom,
}: TranscriptViewProps): React.ReactElement {
  const lines = buildTranscriptLines(messages, bubbleWidth);
  const maxOffset = getMaxTranscriptScrollOffset(messages, bubbleWidth, visibleLines);
  const offset = Math.min(scrollOffsetFromBottom, maxOffset);
  const end = Math.max(0, lines.length - offset);
  const start = Math.max(0, end - visibleLines);
  const visible = lines.slice(start, end);

  return (
    <Box flexDirection="column" width={transcriptWidth}>
      {visible.map(line => (
        <Box
          key={line.key}
          width={transcriptWidth}
          justifyContent={line.align === 'right' ? 'flex-end' : 'flex-start'}
        >
          {line.withinBubble ? (
            <Box width={bubbleWidth} justifyContent={line.align === 'right' ? 'flex-end' : 'flex-start'}>
              <Text color={line.color}>{line.text}</Text>
            </Box>
          ) : (
            <Text color={line.color}>{line.text}</Text>
          )}
        </Box>
      ))}
    </Box>
  );
}

export function getTranscriptLineCount(messages: TranscriptMessage[], bubbleWidth: number): number {
  return buildTranscriptLines(messages, bubbleWidth).length;
}

export function getMaxTranscriptScrollOffset(
  messages: TranscriptMessage[],
  bubbleWidth: number,
  visibleLines: number,
): number {
  return Math.max(0, getTranscriptLineCount(messages, bubbleWidth) - visibleLines);
}

function buildTranscriptLines(messages: TranscriptMessage[], bubbleWidth: number): TranscriptLine[] {
  return messages.flatMap((message, messageIndex) => buildMessageLines(message, bubbleWidth, messageIndex));
}

function buildMessageLines(message: TranscriptMessage, bubbleWidth: number, messageIndex: number): TranscriptLine[] {
  const isRight = message.align === 'right';
  const color = isRight ? 'cyan' : 'gray';
  const textColor = isRight ? 'cyan' : 'white';
  const innerWidth = Math.max(10, bubbleWidth - 4);
  const border = '─'.repeat(bubbleWidth - 2);
  const wrapped = wrapText(message.content, innerWidth);
  const keyPrefix = `${message.id}:${messageIndex}`;

  return [
    {
      key: `${keyPrefix}:author`,
      text: message.author,
      align: message.align,
      color: isRight ? 'cyan' : 'white',
      withinBubble: true,
    },
    { key: `${keyPrefix}:top`, text: `╭${border}╮`, align: message.align, color },
    ...wrapped.map((line, lineIndex) => ({
      key: `${keyPrefix}:body:${lineIndex}`,
      text: `│ ${line.padEnd(innerWidth)} │`,
      align: message.align,
      color: textColor,
    })),
    { key: `${keyPrefix}:bottom`, text: `╰${border}╯`, align: message.align, color },
    { key: `${keyPrefix}:space`, text: '', align: message.align },
  ];
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
