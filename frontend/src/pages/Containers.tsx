import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { containersApi } from '../api/containers'
import { usersApi } from '../api/users'
import type { Container } from '../types'
import Button from '../components/ui/Button'
import AutoRefreshSelect from '../components/ui/AutoRefreshSelect'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { Card, ErrorState, EmptyState, Skeleton } from '../components/ui/Misc'
import ContainerRow from '../components/containers/ContainerRow'
import CodeModal from '../components/containers/CodeModal'
import { ToastContainer } from '../components/containers/Toast'
import { useToasts } from '../components/containers/useToasts'
import { useAutoRefresh } from '../utils/useAutoRefresh'
import { useLanguage, type TranslationKey } from '../i18n/useLanguage'
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CubeIcon,
  UsersIcon,
  TagIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'

type GroupMode = 'short_uuid' | 'config_tag'
type SortKey = 'short_uuid' | 'config_tag' | 'created' | 'status'
type SortDir = 'asc' | 'desc'

const COL_SPAN = 11

const groupOptions: { key: GroupMode; labelKey: TranslationKey; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'short_uuid', labelKey: 'byUser', icon: UsersIcon },
  { key: 'config_tag', labelKey: 'byConfigTag', icon: TagIcon },
]

export default function Containers() {
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const [groupMode, setGroupMode] = useState<GroupMode>('short_uuid')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'created', dir: 'desc' })
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [logsTarget, setLogsTarget] = useState<Container | null>(null)
  const [configTarget, setConfigTarget] = useState<Container | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Container | null>(null)
  const [refreshMs, setRefreshMs] = useAutoRefresh('containers')
  const { toasts, dismiss, success, error } = useToasts()
  const queryClient = useQueryClient()

  const { data: containers, isLoading, isError, error: queryError, refetch, isFetching } = useQuery({
    queryKey: ['containers-all'],
    queryFn: () => containersApi.getAll().then((r) => r.data),
    refetchInterval: refreshMs || false,
  })

  const { data: users } = useQuery({
    queryKey: ['users-all'],
    queryFn: () => usersApi.getAll().then((r) => r.data),
    staleTime: 30_000,
  })

  const userMap = useMemo(() => {
    const map = new Map<string, string>()
    if (users) {
      for (const u of users) {
        if (u.name) map.set(u.short_uuid, u.name)
      }
    }
    return map
  }, [users])

  const getUserName = (shortUuid: string, userName?: string | null) => {
    return userName || userMap.get(shortUuid) || null
  }

  const deleteMutation = useMutation({
    mutationFn: (name: string) => containersApi.remove(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers-all'] })
      success(t('containerDeleted', { name: deleteTarget?.name ?? '' }))
      setDeleteTarget(null)
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      error(err?.response?.data?.detail || t('failedToDeleteContainer', { name: deleteTarget?.name ?? '' }))
      setDeleteTarget(null)
    },
  })

  const filtered = useMemo(() => {
    if (!containers) return []
    const q = search.toLowerCase()
    return containers.filter((c) => {
      const uName = getUserName(c.short_uuid, c.user_name)
      return (
        c.name.toLowerCase().includes(q) ||
        c.short_uuid.toLowerCase().includes(q) ||
        (uName && uName.toLowerCase().includes(q)) ||
        c.config_tag.toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q)
      )
    })
  }, [containers, search, userMap])

  const groups = useMemo(() => {
    const map = new Map<string, Container[]>()
    for (const c of filtered) {
      const key = c[groupMode]
      const arr = map.get(key)
      if (arr) arr.push(c)
      else map.set(key, [c])
    }
    const compare = (a: Container, b: Container) => {
      const dir = sort.dir === 'asc' ? 1 : -1
      if (sort.key === 'created') {
        return (new Date(a.created).getTime() - new Date(b.created).getTime()) * dir
      }
      if (sort.key === 'short_uuid') {
        const nameA = getUserName(a.short_uuid, a.user_name) || a.short_uuid
        const nameB = getUserName(b.short_uuid, b.user_name) || b.short_uuid
        return nameA.localeCompare(nameB) * dir
      }
      return a[sort.key].localeCompare(b[sort.key]) * dir
    }
    for (const arr of map.values()) arr.sort(compare)
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (groupMode === 'short_uuid') {
        const nameA = getUserName(a, map.get(a)?.[0]?.user_name) || a
        const nameB = getUserName(b, map.get(b)?.[0]?.user_name) || b
        return nameA.localeCompare(nameB)
      }
      return a.localeCompare(b)
    })
  }, [filtered, groupMode, sort, userMap])

  const runningCount = filtered.filter((c) => c.status === 'running').length

  const toggleSort = (key: SortKey) =>
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        <div className="relative w-full sm:w-auto sm:flex-1 sm:min-w-[220px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('filterContainers')}
            className="w-full h-9 bg-bg-tertiary border border-border rounded-md pl-9 pr-3 text-sm text-text-primary
              placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition-all"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <span className="text-xs text-text-muted tabular-nums">
            {t('nContainers', { total: filtered.length, running: runningCount })}
          </span>
          <GroupToggle mode={groupMode} onChange={setGroupMode} />
          <AutoRefreshSelect value={refreshMs} onChange={setRefreshMs} />
          <Button variant="secondary" onClick={() => refetch()}>
            <ArrowPathIcon className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('refresh')}</span>
          </Button>
        </div>
      </div>

      {isError ? (
        <Card>
          <ErrorState
            message={(queryError as { response?: { data?: { detail?: string } } })?.response?.data?.detail || t('failedToLoadContainers')}
            onRetry={() => refetch()}
          />
        </Card>
      ) : isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            message={containers?.length === 0 ? t('noContainersRunning') : t('noMatchingContainers')}
            hint={containers?.length === 0 ? t('containersHint') : t('tryAdjustingSearch')}
            icon={<CubeIcon className="w-6 h-6" />}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map(([key, items]) => {
            const groupUserName = groupMode === 'short_uuid' ? getUserName(key, items[0]?.user_name) : null
            return (
              <section key={key} className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    {groupMode === 'short_uuid' ? t('user') : t('configTag')}
                  </h3>
                  {groupMode === 'short_uuid' && groupUserName ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-accent/10">
                      <span className="text-xs font-semibold text-accent">{groupUserName}</span>
                      <code className="text-[11px] font-mono text-text-muted">({key})</code>
                    </span>
                  ) : (
                    <code className="text-xs font-mono text-accent bg-accent/10 px-2 py-0.5 rounded">{key}</code>
                  )}
                  <span className="text-xs text-text-muted tabular-nums">{items.length}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto max-h-[70vh]">
                    <table className="w-full text-sm border-collapse">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-bg-tertiary text-left border-b border-border">
                          <SortableTh labelKey="user" sortKey="short_uuid" sort={sort} onSort={toggleSort} />
                          <SortableTh labelKey="configTag" sortKey="config_tag" sort={sort} onSort={toggleSort} />
                          <SortableTh labelKey="created" sortKey="created" sort={sort} onSort={toggleSort} />
                          <Th>{t('uptime')}</Th>
                          <Th>{t('total')}</Th>
                          <Th>{t('download')}</Th>
                          <Th>{t('upload')}</Th>
                          <Th>{t('downSpeed')}</Th>
                          <Th>{t('upSpeed')}</Th>
                          <SortableTh labelKey="status" sortKey="status" sort={sort} onSort={toggleSort} />
                          <Th className="text-right">{t('actions')}</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {items.map((c) => (
                          <ContainerRow
                            key={c.id}
                            container={c}
                            userName={getUserName(c.short_uuid, c.user_name)}
                            expanded={expanded.has(c.id)}
                            onToggle={() => toggleExpand(c.id)}
                            onLogs={setLogsTarget}
                            onConfig={setConfigTarget}
                            onRequestDelete={setDeleteTarget}
                            onSuccess={success}
                            onError={error}
                            colSpan={COL_SPAN}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </section>
            )
          })}
        </div>
      )}

      <LogsModal container={logsTarget} onClose={() => setLogsTarget(null)} />
      <ConfigModal container={configTarget} onClose={() => setConfigTarget(null)} />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.name)}
        title={t('deleteContainer')}
        message={t('deleteContainerConfirm', { name: deleteTarget?.name ?? '' })}
        loading={deleteMutation.isPending}
      />
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-2.5 py-2.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap ${className}`}>
      {children}
    </th>
  )
}

function SortableTh({
  labelKey,
  sortKey,
  sort,
  onSort,
}: {
  labelKey: TranslationKey
  sortKey: SortKey
  sort: { key: SortKey; dir: SortDir }
  onSort: (key: SortKey) => void
}) {
  const { t } = useLanguage()
  const active = sort.key === sortKey
  return (
    <th className="px-2.5 py-2.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">
      <button
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 transition-colors cursor-pointer hover:text-text-primary ${active ? 'text-text-primary' : ''}`}
      >
        {t(labelKey)}
        {active && (sort.dir === 'asc' ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />)}
      </button>
    </th>
  )
}

function GroupToggle({ mode, onChange }: { mode: GroupMode; onChange: (m: GroupMode) => void }) {
  const { t } = useLanguage()
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 bg-bg-tertiary border border-border rounded-md shrink-0">
      {groupOptions.map((opt) => {
        const active = mode === opt.key
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={`inline-flex items-center gap-1.5 h-7 px-2 sm:px-2.5 text-xs font-medium rounded transition-all cursor-pointer whitespace-nowrap
              ${active
                ? 'bg-accent text-white shadow-soft'
                : 'text-text-secondary hover:text-text-primary'}`}
          >
            <opt.icon className="w-3.5 h-3.5" />
            <span>{t(opt.labelKey)}</span>
          </button>
        )
      })}
    </div>
  )
}

function LogsModal({ container, onClose }: { container: Container | null; onClose: () => void }) {
  const { t } = useLanguage()
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['container-logs', container?.name],
    queryFn: () => containersApi.logs(container!.name).then((r) => r.data),
    enabled: !!container,
  })

  return (
    <CodeModal
      open={!!container}
      onClose={onClose}
      title={container ? t('logsTitle', { name: container.name }) : 'Logs'}
      description={t('containerOutput')}
      content={data?.logs || ''}
      loading={isLoading}
      error={isError ? (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || t('failedToLoadLogs') : undefined}
      onRefresh={() => refetch()}
      refreshing={isFetching}
    />
  )
}

function ConfigModal({ container, onClose }: { container: Container | null; onClose: () => void }) {
  const { t } = useLanguage()
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['container-config', container?.name],
    queryFn: () => containersApi.getConfig(container!.name).then((r) => r.data),
    enabled: !!container,
  })

  return (
    <CodeModal
      open={!!container}
      onClose={onClose}
      title={container ? t('configTitle', { name: container.name }) : 'Config'}
      description={t('configYaml')}
      content={data?.config || ''}
      loading={isLoading}
      error={isError ? (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || t('failedToLoadConfig') : undefined}
      onRefresh={() => refetch()}
      refreshing={isFetching}
    />
  )
}
