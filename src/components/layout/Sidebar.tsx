import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  GitBranch,
  Contact,
  Settings,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Package,
} from 'lucide-react';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Users, label: 'Leads', href: '/leads' },
  { icon: GitBranch, label: 'Deals', href: '/pipeline' },
  { icon: Contact, label: 'Contacts', href: '/contacts' },
  { icon: Calendar, label: 'Activities', href: '/activities' },
  { icon: Package, label: 'Products', href: '/products' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { token } = useAuth();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [branding, setBranding] = useState({ appName: 'CRM Pro', logo: '' });

  useEffect(() => {
    if (token) {
      api.getSettings(token).then(settings => {
        if (settings.branding) {
          setBranding({
            appName: settings.branding.appName || 'CRM Pro',
            logo: settings.branding.logo || ''
          });
        }
      }).catch(err => console.error('Failed to load branding:', err));
    }
  }, [token]);

  return (
    <motion.aside
      initial={false}
      animate={{
        width: isCollapsed ? 72 : 260,
      }}
      transition={{
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      }}
      className="fixed left-0 top-0 h-screen z-40 glass-sidebar flex flex-col"
    >
      {/* Logo Section */}
      <div className="h-16 flex items-center px-5 border-b border-black/[0.04]">
        <motion.div
          initial={false}
          animate={{ opacity: isCollapsed ? 0 : 1 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-3 overflow-hidden"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center flex-shrink-0 overflow-hidden">
            {branding.logo ? (
              <img src={branding.logo} alt="Logo" className="w-full h-full object-contain bg-white" />
            ) : (
              <span className="text-white font-semibold text-sm">{branding.appName.charAt(0)}</span>
            )}
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="font-semibold text-gray-800 whitespace-nowrap"
              >
                {branding.appName}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
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
                  {/* Hover background animation */}
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
              <span className="text-sm">Collapse</span>
            </>
          )}
        </motion.button>
      </div>
    </motion.aside>
  );
}
