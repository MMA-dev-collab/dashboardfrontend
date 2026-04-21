import { Outlet, NavLink } from 'react-router-dom';
import { Target, CalendarRange, Gamepad2, Trophy, Users, Settings, LayoutDashboard } from 'lucide-react';
import './GrowthLayout.css';

const tabs = [
  { path: '/growth', label: 'Overview', icon: LayoutDashboard, end: true },
  { path: '/growth/tasks', label: 'Tasks', icon: Target },
  { path: '/growth/schedule', label: 'Schedule', icon: CalendarRange },
  { path: '/growth/gaming', label: 'Gaming', icon: Gamepad2 },
  { path: '/growth/xp', label: 'XP', icon: Trophy },
  { path: '/growth/teams', label: 'Teams', icon: Users },
  { path: '/growth/settings', label: 'Settings', icon: Settings },
];

export default function GrowthLayout() {
  return (
    <div className="gl-container">
      <div className="gl-tabs">
        <div className="gl-tabs-inner">
          {tabs.map(tab => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.end}
              className={({ isActive }) => `gl-tab ${isActive ? 'active' : ''}`}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
      <div className="gl-content">
        <Outlet />
      </div>
    </div>
  );
}
