import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutGrid,
  UserPlus,
  Briefcase,
  UserCircle,
  Settings2,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Box,
  Building2,
  Activity,
  BarChart3,
  Plug,
  Truck,
} from 'lucide-react';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { icon: LayoutGrid, label: 'ภาพรวม', href: '/' },
  { icon: UserPlus, label: 'ลูกค้าเป้าหมาย', href: '/leads' },
  { icon: Briefcase, label: 'การขาย', href: '/pipeline' },
  { icon: Building2, label: 'บัญชีลูกค้า', href: '/customer-accounts' },
  { icon: UserCircle, label: 'รายชื่อติดต่อ', href: '/contacts' },
  { icon: Truck, label: 'คู่ค้าและพันธมิตร', href: '/vendors' },
  { icon: Box, label: 'สินค้า', href: '/products' },
  { icon: Activity, label: 'กิจกรรม', href: '/activities' },
  { icon: CalendarDays, label: 'ปฏิทิน', href: '/calendar' },
  { icon: Plug, label: 'การเชื่อมต่อ', href: '/settings/integrations' },
  { icon: BarChart3, label: 'ประสิทธิภาพทีมขาย', href: '/team-performance', roles: ['ADMIN', 'MANAGER'] },
  { icon: Settings2, label: 'ตั้งค่า', href: '/settings' },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean; // Optional to prevent breaking other usages if any
  isOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ isCollapsed, onToggle, isMobile, isOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { token, user } = useAuth();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [branding, setBranding] = useState({ appName: 'CRM Pro', logo: '' });

  useEffect(() => {
    if (token) {
      api.getSettings(token).then((settings: Record<string, any>) => {
        if (settings.branding) {
          setBranding({
            appName: settings.branding.appName || 'CRM Pro',
            logo: settings.branding.logo || ''
          });
        }
      }).catch(err => {
        // In development mode, mock data is returned automatically
        // In production, this error would indicate backend issues
        if (process.env.NODE_ENV !== 'development') {
          console.error('Failed to load branding:', err);
        }
      });
    }
  }, [token]);

  // Mobile: Use transform to slide in/out
  // Desktop: Use width animation
  const sidebarVariants = isMobile
    ? {
      open: { x: 0, width: 260 },
      closed: { x: '-100%', width: 260 },
    }
    : {
      open: { x: 0, width: 260 },
      closed: { x: 0, width: 72 },
    };

  return (
    <motion.aside
      initial={false}
      animate={isMobile ? (isOpen ? 'open' : 'closed') : (isCollapsed ? 'closed' : 'open')}
      variants={sidebarVariants as any}
      transition={{
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      }}
      className={`fixed left-0 top-0 h-screen glass-sidebar flex flex-col ${isMobile ? 'z-50 shadow-2xl' : 'z-40'}`}
    >
      {/* Logo Section */}
      <div className="h-16 px-5 border-b border-black/[0.04] flex items-center">
        <motion.div
          // Wait, if mobile and closed, we don't see this anyway.
          // If desktop and closed, we see logo icon.
          // Logic: If desktop collapsed -> opacity 0 for text (handled below).
          // If mobile -> always open when visible.
          className="flex items-center gap-3 overflow-hidden w-full"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center flex-shrink-0 overflow-hidden">
            {branding.logo ? (
              <img src={branding.logo} alt="Logo" className="w-full h-full object-contain bg-white" />
            ) : (
              <span className="text-white font-semibold text-sm">{branding.appName.charAt(0)}</span>
            )}
          </div>
          <AnimatePresence>
            {(!isCollapsed || isMobile) && (
              <div className="flex flex-col">
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="font-semibold text-gray-800 whitespace-nowrap"
                >
                  {branding.appName}
                </motion.span>
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                  className="text-xs text-gray-500 whitespace-nowrap leading-tight"
                >
                  By Murph-Tech
                </motion.p>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3">
        <ul className="space-y-1">
          {navItems
            .filter(item => !item.roles || (user?.role && item.roles.includes(user.role)))
            .map((item) => {
              const isActive = item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onMouseEnter={() => setHoveredItem(item.href)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`
                      relative flex items-center gap-3 px-3 py-2.5 rounded-xl
                      transition-all duration-200 ease-out
                      ${isActive
                        ? 'nav-item-active font-medium'
                        : 'text-gray-600 hover:bg-black/[0.04]'
                      }
                    `}
                  >
                    {hoveredItem === item.href && !isActive && (
                      <motion.div
                        layoutId="hoverBg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="absolute inset-0 bg-black/[0.04] rounded-xl -z-10"
                      />
                    )}

                    <Icon
                      size={20}
                      strokeWidth={2.2}
                      className={`flex-shrink-0 transition-colors duration-200 ${isActive ? 'text-[#007AFF]' : ''
                        }`}
                    />

                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2 }}
                          className="whitespace-nowrap"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* Tooltip for collapsed state */}
                    {isCollapsed && hoveredItem === item.href && (
                      <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="absolute left-full ml-2 px-3 py-1.5 bg-gray-800 text-white text-sm rounded-lg whitespace-nowrap z-50 shadow-lg"
                      >
                        {item.label}
                      </motion.div>
                    )}
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>

      {/* Collapse Toggle Button */}
      <div className="p-3 border-t border-black/[0.04]">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-gray-500 hover:bg-black/[0.04] transition-colors duration-200"
        >
          {isCollapsed ? (
            <ChevronRight size={18} />
          ) : (
            <>
              <ChevronLeft size={18} />
              <span className="text-sm">ย่อเมนู</span>
            </>
          )}
        </motion.button>
      </div>
    </motion.aside>
  );
}
