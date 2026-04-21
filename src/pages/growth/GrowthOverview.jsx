import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, Flame, Gamepad2, Target, ChevronRight, Clock, CheckCircle2, XCircle, AlarmClock } from 'lucide-react';
import { useRoutineStatus, useRoutineCheckin } from '../../hooks/queries/useGrowthRoutine';
import { useGamingStatus } from '../../hooks/queries/useGrowthGaming';
import { useGrowthTodayTasks } from '../../hooks/queries/useGrowthTasks';
import './GrowthOverview.css';

export default function GrowthOverview() {
  const navigate = useNavigate();
  const { data: routine, isLoading: routineLoading } = useRoutineStatus();
  const { data: gaming, isLoading: gamingLoading } = useGamingStatus();
  const { data: taskData, isLoading: tasksLoading } = useGrowthTodayTasks();
  const checkin = useRoutineCheckin();
  const [checkingType, setCheckingType] = useState(null);

  const handleCheckin = async (type) => {
    setCheckingType(type);
    try {
      await checkin.mutateAsync(type);
    } finally {
      setCheckingType(null);
    }
  };

  if (routineLoading || gamingLoading || tasksLoading) {
    return <div className="go-loading"><div className="spinner" /> Loading your growth data...</div>;
  }

  const taskStats = taskData?.stats || {};
  const totalTasks = taskStats.total || 0;
  const completedTasks = taskStats.completed || 0;
  const tasks = taskData?.tasks || [];
  const nextTask = tasks.find(t => t.status === 'PENDING' || t.status === 'ACTIVE');

  const gamingPct = gaming?.baseMinutes > 0
    ? Math.min(100, Math.round((gaming.availableMinutes / gaming.baseMinutes) * 100))
    : 0;

  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (gamingPct / 100) * circumference;

  return (
    <div className="go-container">
      <div className="go-header">
        <h1>Growth Overview</h1>
        <p className="go-subtitle">Your daily progress at a glance</p>
      </div>

      <div className="go-grid">
        <div className="go-card go-routine">
          <h2 className="go-card-title">Daily Routine</h2>
          <div className="go-routine-items">
            <div className={`go-routine-item ${routine?.todaySleep?.checkedIn ? (routine.todaySleep.isEarly ? 'on-time' : routine.todaySleep.isOnTime ? 'on-time' : 'late') : 'pending'}`}>
              <div className="go-routine-icon"><Moon size={20} /></div>
              <div className="go-routine-info">
                <span className="go-routine-label">Sleep</span>
                {routine?.sleepTime ? (
                  <span className="go-routine-time">{routine.sleepTime} — {routine.sleepWindowEnd}</span>
                ) : (
                  <span className="go-routine-unset">Not set</span>
                )}
              </div>
              <div className="go-routine-status">
                {routine?.todaySleep?.checkedIn ? (
                  routine.todaySleep.isEarly ? (
                    <span className="go-badge go-badge-info"><AlarmClock size={14} /> Early</span>
                  ) : routine.todaySleep.isOnTime ? (
                    <span className="go-badge go-badge-success"><CheckCircle2 size={14} /> On time</span>
                  ) : (
                    <span className="go-badge go-badge-danger"><XCircle size={14} /> Late</span>
                  )
                ) : routine?.sleepTime ? (
                  <button className="go-checkin-btn" onClick={() => handleCheckin('SLEEP')} disabled={checkingType === 'SLEEP'}>
                    {checkingType === 'SLEEP' ? '...' : 'Check In'}
                  </button>
                ) : null}
              </div>
            </div>

            <div className={`go-routine-item ${routine?.todayWake?.checkedIn ? (routine.todayWake.isEarly ? 'on-time' : routine.todayWake.isOnTime ? 'on-time' : 'late') : 'pending'}`}>
              <div className="go-routine-icon"><Sun size={20} /></div>
              <div className="go-routine-info">
                <span className="go-routine-label">Wake</span>
                {routine?.wakeTime ? (
                  <span className="go-routine-time">{routine.wakeTime} — {routine.wakeWindowEnd}</span>
                ) : (
                  <span className="go-routine-unset">Not set</span>
                )}
              </div>
              <div className="go-routine-status">
                {routine?.todayWake?.checkedIn ? (
                  routine.todayWake.isEarly ? (
                    <span className="go-badge go-badge-info"><AlarmClock size={14} /> Early</span>
                  ) : routine.todayWake.isOnTime ? (
                    <span className="go-badge go-badge-success"><CheckCircle2 size={14} /> On time</span>
                  ) : (
                    <span className="go-badge go-badge-danger"><XCircle size={14} /> Late</span>
                  )
                ) : routine?.wakeTime ? (
                  <button className="go-checkin-btn" onClick={() => handleCheckin('WAKE')} disabled={checkingType === 'WAKE'}>
                    {checkingType === 'WAKE' ? '...' : 'Check In'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="go-streaks">
            <div className="go-streak">
              <Moon size={14} />
              <Flame size={14} className="go-flame" />
              <span>{routine?.sleepStreak || 0} day sleep streak</span>
            </div>
            <div className="go-streak">
              <Sun size={14} />
              <Flame size={14} className="go-flame" />
              <span>{routine?.wakeStreak || 0} day wake streak</span>
            </div>
          </div>

          {(!routine?.sleepTime || !routine?.wakeTime) && (
            <button className="go-setup-btn" onClick={() => navigate('/growth/settings')}>
              Set up routine times <ChevronRight size={14} />
            </button>
          )}
        </div>

        <div className="go-card go-gaming">
          <h2 className="go-card-title">Gaming Time</h2>
          <div className="go-gaming-ring">
            <svg viewBox="0 0 120 120" className="go-ring-svg">
              <circle cx="60" cy="60" r="54" className="go-ring-bg" />
              <circle cx="60" cy="60" r="54" className="go-ring-fill" style={{ strokeDasharray: circumference, strokeDashoffset: offset }} />
            </svg>
            <div className="go-ring-content">
              <Gamepad2 size={20} />
              <span className="go-ring-value">{gaming?.availableMinutes || 0}</span>
              <span className="go-ring-label">min</span>
            </div>
          </div>
          <div className="go-gaming-split">
            <div className="go-split-item">
              <span className="go-split-dot solo" />
              <span>Solo: {gaming?.soloMinutes || 0} min</span>
            </div>
            <div className="go-split-item">
              <span className="go-split-dot collab" />
              <span>Collab: {gaming?.collabMinutes || 0} min</span>
            </div>
          </div>
          <div className="go-gaming-actions">
            <button className="go-action-btn" onClick={() => navigate('/growth/gaming')}>
              Start Gaming <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="go-card go-tasks">
          <h2 className="go-card-title">Tasks Today</h2>
          <div className="go-task-progress">
            <div className="go-task-bar">
              <div className="go-task-bar-fill" style={{ width: totalTasks > 0 ? `${(completedTasks / totalTasks) * 100}%` : '0%' }} />
            </div>
            <span className="go-task-count">{completedTasks}/{totalTasks} completed</span>
          </div>
          {nextTask ? (
            <div className="go-next-task">
              <Target size={16} />
              <div>
                <span className="go-next-task-title">{nextTask.title}</span>
                {nextTask.dueDate && (
                  <span className="go-next-task-due"><Clock size={12} /> Due {new Date(nextTask.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                )}
              </div>
            </div>
          ) : (
            <p className="go-no-tasks">All tasks completed for today!</p>
          )}
          <button className="go-action-btn" onClick={() => navigate('/growth/tasks')}>
            View Tasks <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
