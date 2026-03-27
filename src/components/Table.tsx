import React from 'react';
import { Text } from 'ink';
import InkTable from 'ink-table';

interface TableProps {
  data: Record<string, unknown>[];
}

type ScalarDict = Record<string, string | number | boolean | null | undefined>;

export function Table({ data }: TableProps): React.ReactElement {
  if (data.length === 0) {
    return <Text color="gray">No results.</Text>;
  }
  return <InkTable data={data as ScalarDict[]} />;
}
