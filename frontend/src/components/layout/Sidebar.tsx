import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import { useLanguage, type TranslationKey } from '../../i18n/useLanguage'
import {
  HomeIcon,
  UsersIcon,
  UserCircleIcon,
  CubeIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  BoltIcon,
  ChevronLeftIcon,
  ArrowsRightLeftIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

const nav: { to: string; labelKey: TranslationKey; icon: React.ComponentType<{ className?: string }> }[] = [
  { to: '/dashboard', labelKey: 'navDashboard', icon: HomeIcon },
  { to: '/users', labelKey: 'navUsers', icon: UsersIcon },
  { to: '/profiles', labelKey: 'navProfiles', icon: UserCircleIcon },
  { to: '/containers', labelKey: 'navContainers', icon: CubeIcon },
  { to: '/routing', labelKey: 'navRouting', icon: ArrowsRightLeftIcon },
  { to: '/settings', labelKey: 'navSettings', icon: Cog6ToothIcon },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const { t } = useLanguage()
  const { logout, username } = useAuthStore()
  const location = useLocation()

  // Close mobile sidebar on navigation
  useEffect(() => {
    onMobileClose()
  }, [location.pathname])

  // Close on Escape
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMobileClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen, onMobileClose])

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity animate-fade-in"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full bg-bg-secondary border-r border-border z-50 lg:z-30
          flex flex-col transition-all duration-200
          ${mobileOpen ? 'translate-x-0 w-64 max-w-[85vw] shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'lg:w-16' : 'lg:w-60'}`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/15 text-accent shrink-0">
            <BoltIcon className="w-4.5 h-4.5" />
          </div>
          <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
            <p className="text-sm font-semibold text-text-primary leading-tight truncate">{t('appName')}</p>
            <p className="text-[10px] text-text-muted uppercase tracking-wider">{t('adminPanel')}</p>
          </div>
          {/* Desktop collapse button */}
          <button
            onClick={onToggle}
            className={`ml-auto p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover
              transition-colors cursor-pointer hidden lg:block ${collapsed ? 'lg:hidden' : ''}`}
            title={t('collapseSidebar')}
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            className="ml-auto p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover
              transition-colors cursor-pointer lg:hidden"
            title="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          <p className={`px-4 mb-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wider ${collapsed ? 'lg:hidden' : ''}`}>
            {t('navMenu')}
          </p>
          <div className="px-2.5 space-y-0.5">
            {nav.map((item) => {
              const active = location.pathname === item.to
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onMobileClose}
                  className={`group relative flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium
                    transition-colors ${active
                      ? 'bg-accent/10 text-accent'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'}
                    ${collapsed ? 'lg:justify-center' : ''}`}
                  title={collapsed ? t(item.labelKey) : undefined}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-accent" />
                  )}
                  <item.icon className="w-4.5 h-4.5 shrink-0" />
                  <span className={collapsed ? 'lg:hidden' : ''}>{t(item.labelKey)}</span>
                </NavLink>
              )
            })}
          </div>
        </nav>

        {/* Collapsed expand button (desktop only) */}
        {collapsed && (
          <div className="px-2.5 pb-2 shrink-0 hidden lg:block">
            <button
              onClick={onToggle}
              className="flex items-center justify-center w-full py-2 rounded-lg text-text-muted
                hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
              title={t('expandSidebar')}
            >
              <ChevronLeftIcon className="w-4 h-4 rotate-180" />
            </button>
          </div>
        )}

        {/* Footer / account */}
        <div className="p-2.5 border-t border-border shrink-0">
          <div className={`flex items-center gap-2.5 px-2 py-2 mb-1 ${collapsed ? 'lg:hidden' : ''}`}>
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/15 text-accent text-xs font-semibold shrink-0">
              {username.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary leading-tight truncate">{username || 'admin'}</p>
              <p className="text-[10px] text-text-muted truncate">{t('administrator')}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className={`flex items-center gap-3 w-full px-2.5 py-2 rounded-lg text-sm font-medium
              text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer
              ${collapsed ? 'lg:justify-center' : ''}`}
            title={collapsed ? t('logout') : undefined}
          >
            <ArrowLeftOnRectangleIcon className="w-4.5 h-4.5 shrink-0" />
            <span className={collapsed ? 'lg:hidden' : ''}>{t('logout')}</span>
          </button>
        </div>
      </aside>
    </>
  )
}
