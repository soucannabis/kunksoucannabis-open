import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  CircularProgress,
  Grid,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { createApiClient } from '@kunk/api-client';
import { getKunkPublicConfig } from '@kunk/config';
import { useErrorModal } from '../../components/errors/ErrorModalProvider.jsx';
import AnalyticsGlobalFilters from './AnalyticsGlobalFilters.jsx';
import AnalyticsBlock from './AnalyticsBlock.jsx';
import {
  ANALYTICS_TABS,
  allBlockIds,
  blocksForTab,
} from './analyticsLayout.js';
import {
  buildAnalyticsQuery,
  defaultGlobalPeriod,
  emptyBlockFilter,
  filterHash,
  groupByFromPreset,
  periodFromPreset,
  syncDatesToBlocks,
} from './analyticsPeriod.js';

const materialTheme = createTheme({
  palette: {
    primary: { main: '#5a7a5b' },
    secondary: { main: '#7A5B7A' },
  },
});

const GREEN = '#5a7a5b';

function initBlockFilters(period) {
  const map = {};
  for (const id of allBlockIds()) {
    map[id] = emptyBlockFilter(period);
  }
  return map;
}

function fetchForTab(api, tabId, qs) {
  if (tabId === 'associates') return api.getAnalyticsAssociates(qs);
  if (tabId === 'services') return api.getAnalyticsServices(qs);
  if (tabId === 'orders') return api.getAnalyticsOrders(qs);
  return api.getAnalyticsReception(qs);
}

export default function AnalyticsDashboardPage() {
  const { showError } = useErrorModal();
  const bootstrap = useMemo(() => getKunkPublicConfig(), []);
  const api = useMemo(() => createApiClient({ baseUrl: bootstrap.apiUrl }), [bootstrap.apiUrl]);
  const [tab, setTab] = useState('associates');
  const [globalPeriod, setGlobalPeriod] = useState(() => defaultGlobalPeriod());
  const [draftPeriod, setDraftPeriod] = useState(() => defaultGlobalPeriod());
  const [blockFilters, setBlockFilters] = useState(() => initBlockFilters(defaultGlobalPeriod()));
  /** cache: `${tabId}::${hash}` -> { data, loading, error } */
  const [cache, setCache] = useState({});
  const reqSeq = useRef(0);

  const groupBy = groupByFromPreset(globalPeriod.preset);
  const blocks = blocksForTab(tab);

  const neededHashes = useMemo(() => {
    const set = new Set();
    for (const b of blocks) {
      set.add(filterHash(blockFilters[b.id], groupBy));
    }
    return [...set];
  }, [blocks, blockFilters, groupBy]);

  const loadHashes = useCallback(
    async (tabId, hashes, filtersByHash) => {
      const seq = ++reqSeq.current;
      setCache((prev) => {
        const next = { ...prev };
        for (const h of hashes) {
          const key = `${tabId}::${h}`;
          next[key] = { ...(next[key] || {}), loading: true, error: null };
        }
        return next;
      });

      await Promise.all(
        hashes.map(async (h) => {
          const filters = filtersByHash[h];
          const qs = buildAnalyticsQuery(filters, groupBy);
          try {
            const res = await fetchForTab(api, tabId, qs);
            if (seq !== reqSeq.current) return;
            setCache((prev) => ({
              ...prev,
              [`${tabId}::${h}`]: { data: res.data, loading: false, error: null },
            }));
          } catch (err) {
            if (seq !== reqSeq.current) return;
            showError(err);
            setCache((prev) => ({
              ...prev,
              [`${tabId}::${h}`]: {
                data: null,
                loading: false,
                error: err?.message || 'Falha ao carregar analytics',
              },
            }));
          }
        })
      );
    },
    [api, groupBy, showError]
  );

  useEffect(() => {
    const filtersByHash = {};
    for (const b of blocks) {
      const h = filterHash(blockFilters[b.id], groupBy);
      if (!filtersByHash[h]) filtersByHash[h] = blockFilters[b.id];
    }
    loadHashes(tab, neededHashes, filtersByHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: refetch on filter/tab change
  }, [tab, neededHashes.join('|'), groupBy]);

  function applyGlobal() {
    const next = {
      ...draftPeriod,
      preset: draftPeriod.preset || 'month',
    };
    setGlobalPeriod(next);
    setBlockFilters((prev) => syncDatesToBlocks(prev, next));
  }

  function onPreset(presetId) {
    const next = periodFromPreset(presetId);
    setDraftPeriod(next);
    setGlobalPeriod(next);
    setBlockFilters((prev) => syncDatesToBlocks(prev, next));
  }

  function onChangeBlockFilters(blockId, nextFilters) {
    setBlockFilters((prev) => ({ ...prev, [blockId]: nextFilters }));
  }

  const anyLoading = neededHashes.some((h) => cache[`${tab}::${h}`]?.loading);

  return (
    <ThemeProvider theme={materialTheme}>
      <Box sx={{ p: { xs: 1.5, md: 2 } }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5, color: '#2f3b2f' }}>
          Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Visão geral de associados, serviços, pedidos e triagem
        </Typography>

        <AnalyticsGlobalFilters
          period={draftPeriod}
          onPreset={onPreset}
          onChangeRange={(partial) =>
            setDraftPeriod((p) => ({ ...p, ...partial, preset: 'custom' }))
          }
          onApply={applyGlobal}
        />

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            mb: 2,
            borderBottom: '1px solid #e6ebe6',
            '& .Mui-selected': { color: `${GREEN} !important` },
            '& .MuiTabs-indicator': { bgcolor: GREEN },
          }}
        >
          {ANALYTICS_TABS.map((t) => (
            <Tab key={t.id} value={t.id} label={t.label} sx={{ textTransform: 'none' }} />
          ))}
        </Tabs>

        {anyLoading && !neededHashes.some((h) => cache[`${tab}::${h}`]?.data) ? (
          <Box sx={{ py: 8, display: 'grid', placeItems: 'center' }}>
            <CircularProgress sx={{ color: GREEN }} />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {blocks.map((def) => {
              const h = filterHash(blockFilters[def.id], groupBy);
              const entry = cache[`${tab}::${h}`] || { loading: true };
              return (
                <AnalyticsBlock
                  key={def.id}
                  def={def}
                  tabId={tab}
                  filters={blockFilters[def.id]}
                  globalPeriod={globalPeriod}
                  data={entry.data}
                  loading={Boolean(entry.loading)}
                  error={entry.error}
                  onChangeFilters={(next) => onChangeBlockFilters(def.id, next)}
                />
              );
            })}
          </Grid>
        )}
      </Box>
    </ThemeProvider>
  );
}
