'use client';

import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { useT } from '@/lib/i18n/client';
import { buildGraphOptions } from '@/lib/dashboard/derive';
import { HomeView } from './HomeView';
import { MasteryTrackingView } from './MasteryTrackingView';
import { ReportView } from './ReportView';
import { CommunityView } from './CommunityView';
import type { DashboardHubProps } from './types';

export { buildGraphOptions };

/** Four tabs. The map picker only shows when the learner has more than one active map. */
export function DashboardTabbedHub(props: DashboardHubProps) {
  const { t } = useT();
  const { graphs, progress, nowIso, userId } = props;
  const [graphId, setGraphId] = useState(graphs[0]?.id);
  const graph = graphs.find(g => g.id === graphId) ?? graphs[0];
  const rows = graph ? progress.filter(r => r.graph_id === graph.id) : [];
  const now = new Date(nowIso);

  const options = useMemo(() => {
    return buildGraphOptions(graphs, (done, total) => t('dashboard.graphs.progress', { done, total }));
  }, [graphs, t]);

  return (
    <Tabs defaultValue="home">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList aria-label={t('dashboard.tabs.label')} className="max-sm:grid max-sm:w-full max-sm:grid-cols-4 max-sm:gap-0">
          <TabsTrigger value="home" className="max-sm:px-1 max-sm:text-[13px]">{t('dashboard.tabs.home')}</TabsTrigger>
          <TabsTrigger value="mastery" className="max-sm:px-1 max-sm:text-[13px]">{t('dashboard.tabs.mastery')}</TabsTrigger>
          <TabsTrigger value="report" className="max-sm:px-1 max-sm:text-[13px]">{t('dashboard.tabs.report')}</TabsTrigger>
          <TabsTrigger value="community" className="max-sm:px-1 max-sm:text-[13px]">{t('dashboard.tabs.community')}</TabsTrigger>
        </TabsList>
        {graphs.length > 1 && (
          <Select
            ariaLabel={t('dashboard.graphs.pick')}
            value={graph?.id}
            onValueChange={setGraphId}
            options={options}
          />
        )}
      </div>

      <TabsContent value="home">
        <HomeView graphs={graphs} graph={graph} rows={rows} now={now} />
      </TabsContent>
      <TabsContent value="mastery">
        <MasteryTrackingView graph={graph} />
      </TabsContent>
      <TabsContent value="report">
        <ReportView graph={graph} rows={rows} now={now} />
      </TabsContent>
      <TabsContent value="community">
        <CommunityView userId={userId} concepts={graphs.flatMap(g => g.nodes.map(n => n.label))} />
      </TabsContent>
    </Tabs>
  );
}
