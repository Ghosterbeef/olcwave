import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { settingsApi } from '../../api/settings'
import { useLanguage, type TranslationKey, type SupportedLanguage } from '../../i18n/useLanguage'
import { useAuthStore } from '../../store/auth'
import { Bars3Icon } from '@heroicons/react/24/outline'

const pageTitles: Record<string, { titleKey: TranslationKey; subtitleKey: TranslationKey }> = {
  '/dashboard': { titleKey: 'pageDashboard', subtitleKey: 'pageDashboardSubtitle' },
  '/users': { titleKey: 'pageUsers', subtitleKey: 'pageUsersSubtitle' },
  '/profiles': { titleKey: 'pageProfiles', subtitleKey: 'pageProfilesSubtitle' },
  '/routing': { titleKey: 'pageRouting', subtitleKey: 'pageRoutingSubtitle' },
  '/containers': { titleKey: 'pageContainers', subtitleKey: 'pageContainersSubtitle' },
  '/subscriptions': { titleKey: 'pageSubscriptions', subtitleKey: 'pageSubscriptionsSubtitle' },
  '/settings': { titleKey: 'pageSettings', subtitleKey: 'pageSettingsSubtitle' },
}

const languages: { value: SupportedLanguage; labelKey: TranslationKey }[] = [
  { value: 'en', labelKey: 'english' },
  { value: 'ru', labelKey: 'russian' },
]

interface TopbarProps {
  onMenuClick?: () => void
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { t, language, setLanguage } = useLanguage()
  const location = useLocation()
  const page = pageTitles[location.pathname] || pageTitles['/dashboard']
  const username = useAuthStore((s) => s.username)
  const [langOpen, setLangOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data: rwEnabled } = useQuery({
    queryKey: ['rw-enabled'],
    queryFn: () => settingsApi.getRwEnabled(),
    staleTime: Infinity,
  })

  useEffect(() => {
    if (!langOpen) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setLangOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setLangOpen(false)
    document.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [langOpen])

  return (
    <header className="sticky top-0 z-20 h-14 bg-bg-secondary/80 backdrop-blur-md border-b border-border
      flex items-center justify-between px-3 sm:px-6 shrink-0 gap-2">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="p-1.5 -ml-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover
            transition-colors cursor-pointer lg:hidden shrink-0"
          aria-label="Open menu"
        >
          <Bars3Icon className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-semibold text-text-primary leading-tight truncate">{t(page.titleKey)}</h1>
          <p className="text-[11px] sm:text-xs text-text-muted truncate hidden sm:block">{t(page.subtitleKey)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {rwEnabled !== undefined && (
          <div
            title={t(rwEnabled ? 'rwModeEnabled' : 'rwModeDisabled')}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium border ${
              rwEnabled
                ? 'bg-accent/10 border-accent/20 text-accent'
                : 'bg-success/10 border-success/20 text-success'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${rwEnabled ? 'bg-accent' : 'bg-success'}`} />
            <span className="hidden md:inline">{t(rwEnabled ? 'rwModeEnabled' : 'rwModeDisabled')}</span>
            <span className="inline md:hidden text-[10px] font-mono">{rwEnabled ? 'RW' : 'Local'}</span>
          </div>
        )}
        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => setLangOpen((v) => !v)}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium text-text-muted
              hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer border border-border"
          >
            <span className="hidden sm:inline">{t(language === 'en' ? 'english' : 'russian')}</span>
            <span className="sm:hidden">{language === 'en' ? 'EN' : 'RU'}</span>
            <svg className={`w-3 h-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {langOpen && (
            <div className="absolute right-0 z-30 mt-1.5 w-32 p-1 bg-bg-elevated border border-border-light rounded-lg
              shadow-elevated animate-scale-in origin-top-right">
              {languages.map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => { setLanguage(lang.value); setLangOpen(false) }}
                  className={`flex w-full items-center px-2.5 h-8 rounded-md text-xs font-medium transition-colors cursor-pointer
                    ${language === lang.value
                      ? 'bg-accent/10 text-accent'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'}`}
                >
                  {t(lang.labelKey)}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20">
          <span className="text-xs sm:text-sm font-semibold text-accent">v1.0.8</span>
        </div>
        <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-accent/15 text-accent text-xs font-semibold shrink-0">
          {username.charAt(0).toUpperCase() || 'A'}
        </div>
      </div>
    </header>
  )
}
