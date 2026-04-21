import { useState } from 'react';
import {
  Gamepad2, Lock, Unlock, Clock, Zap, Shield, Loader2, Play, Square, Plus
} from 'lucide-react';
import { useGamingStatus, useGamingSessions, useCreateGamingSession, useStartGamingSession, useEndGamingSession, useGamingSuggestions } from '../../hooks/queries/useGrowthGaming';
import './GrowthGaming.css';

export default function GrowthGaming() {
  const { data: status, isLoading: statusLoading } = useGamingStatus();
  const { data: sessions } = useGamingSessions();
  const { data: suggestions } = useGamingSuggestions();
  const createMutation = useCreateGamingSession();
  const startMutation = useStartGamingSession();
  const endMutation = useEndGamingSession();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ plannedDuration: 60, startHour: 20, startMin: 0 });

  const handleCreate = async () => {
    const d = new Date();
    d.setHours(form.startHour, form.startMin, 0, 0);
    await createMutation.mutateAsync({
      sessionType: 'SOLO',
      startTime: d.toISOString(),
      plannedDuration: form.plannedDuration,
    });
    setShowCreate(false);
  };

  if (statusLoading) return <div className="gg-page fade-in"><div className="gg-loading"><Loader2 size={28} className="spinning" /></div></div>;

  const availableMinutes = status?.availableMinutes || 0;
  const baseMinutes = status?.baseMinutes || 120;
  const isLocked = status?.isLocked;
  const lockReason = status?.lockReason;
  const penalties = status?.penalties || {};
  const bonuses = status?.bonuses || {};

  const ringPct = Math.min(100, (availableMinutes / baseMinutes) * 100);
  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (ringPct / 100) * circumference;

  return (
    <div className="gg-page fade-in">
      <header className="gg-header">
        <h1 className="gg-title">Gaming</h1>
        <span className="gg-subtitle">Earn your playtime. Stay disciplined.</span>
      </header>

      <div className="gg-layout">
        <div className="gg-main">
          <div className="gg-meter-card">
            <div className="gg-meter">
              <svg viewBox="0 0 160 160" className="gg-ring-svg">
                <circle cx="80" cy="80" r="70" fill="none" stroke="var(--border-light)" strokeWidth="8" />
                <circle cx="80" cy="80" r="70" fill="none"
                  stroke={isLocked ? '#ff4757' : availableMinutes < 30 ? '#ffa502' : '#2ed573'}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  transform="rotate(-90 80 80)"
                  style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s' }}
                />
              </svg>
              <div className="gg-meter-inner">
                {isLocked ? <Lock size={24} className="gg-lock-icon" /> : <Gamepad2 size={24} className="gg-game-icon" />}
                <span className="gg-meter-time">{Math.floor(availableMinutes / 60)}h {availableMinutes % 60}m</span>
                <span className="gg-meter-label">{isLocked ? 'LOCKED' : availableMinutes < 30 ? 'LIMITED' : 'AVAILABLE'}</span>
              </div>
            </div>
            {isLocked && <div className="gg-lock-reason"><Shield size={14} /> {lockReason}</div>}
            {!isLocked && availableMinutes >= 30 && (
              <button className="gg-play-btn" onClick={() => setShowCreate(true)}>
                <Play size={16} /> Start Solo Session
              </button>
            )}
          </div>

          <div className="gg-split">
            <div className="gg-split-item">
              <span className="gg-split-dot solo" />
              <div>
                <span className="gg-split-value">{status?.soloMinutes || 0} min</span>
                <span className="gg-split-label">Solo Time</span>
              </div>
            </div>
            <div className="gg-split-item">
              <span className="gg-split-dot collab" />
              <div>
                <span className="gg-split-value">{status?.collabMinutes || 0} min</span>
                <span className="gg-split-label">Collaborative</span>
              </div>
            </div>
          </div>

          <div className="gg-breakdown">
            <div className="gg-breakdown-card penalties">
              <h3>Penalties</h3>
              <div className="gg-breakdown-items">
                <div className="gg-bi"><span>Overdue tasks</span><span className="gg-bi-val neg">-{penalties.overdue || 0}m</span></div>
                <div className="gg-bi"><span>Carry-overs</span><span className="gg-bi-val neg">-{penalties.carryOver || 0}m</span></div>
                <div className="gg-bi total"><span>Total penalties</span><span className="gg-bi-val neg">-{penalties.total || 0}m</span></div>
              </div>
            </div>
            <div className="gg-breakdown-card bonuses">
              <h3>Bonuses</h3>
              <div className="gg-breakdown-items">
                <div className="gg-bi"><span>Completed tasks</span><span className="gg-bi-val pos">+{bonuses.completedTasks || 0}m</span></div>
                <div className="gg-bi"><span>Streak</span><span className="gg-bi-val pos">+{bonuses.streak || 0}m</span></div>
                <div className="gg-bi total"><span>Total bonuses</span><span className="gg-bi-val pos">+{bonuses.total || 0}m</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="gg-sidebar">
          <div className="gg-sessions-card">
            <h3>Sessions</h3>
            <div className="gg-sessions-list">
              {(sessions || []).length === 0 ? (
                <p className="gg-sessions-empty">No gaming sessions yet</p>
              ) : sessions.map(s => (
                <div key={s.id} className={`gg-session ${s.status.toLowerCase()}`}>
                  <div className="gg-session-left">
                    <Gamepad2 size={16} />
                    <div>
                      <span className="gg-session-type">{s.sessionType === 'SOLO' ? 'Solo' : 'Team'}</span>
                      <span className="gg-session-duration">{s.plannedDuration}m planned</span>
                    </div>
                  </div>
                  <div className="gg-session-right">
                    {s.status === 'SCHEDULED' && !s.isLocked && (
                      <button className="gg-session-start" onClick={() => startMutation.mutate(s.id)}>
                        <Play size={12} />
                      </button>
                    )}
                    {s.status === 'ACTIVE' && (
                      <button className="gg-session-end" onClick={() => endMutation.mutate(s.id)}>
                        <Square size={12} />
                      </button>
                    )}
                    <span className="gg-session-status">{s.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {suggestions && suggestions.length > 0 && (
            <div className="gg-suggestions-card">
              <h3>Suggestions</h3>
              {suggestions.map((s, i) => (
                <div key={i} className="gg-suggestion">
                  <Zap size={14} className="gg-suggest-icon" />
                  <div>
                    <span className="gg-suggest-title">{s.title}</span>
                    <span className="gg-suggest-desc">{s.description}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="gt-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="gt-modal" onClick={e => e.stopPropagation()}>
            <div className="gt-modal-header"><h2>New Gaming Session</h2><button onClick={() => setShowCreate(false)}>×</button></div>
            <div className="gt-modal-body">
              <label>Start Time</label>
              <div className="gs-time-inputs">
                <select value={form.startHour} onChange={e => setForm({ ...form, startHour: parseInt(e.target.value) })}>
                  {Array.from({ length: 18 }, (_, i) => i + 6).map(h => <option key={h} value={h}>{h}:00</option>)}
                </select>
                <select value={form.startMin} onChange={e => setForm({ ...form, startMin: parseInt(e.target.value) })}>
                  <option value={0}>:00</option><option value={15}>:15</option><option value={30}>:30</option><option value={45}>:45</option>
                </select>
              </div>
              <label>Duration (min)</label>
              <input type="number" value={form.plannedDuration} onChange={e => setForm({ ...form, plannedDuration: parseInt(e.target.value) || 30 })} min={15} max={300} />
            </div>
            <div className="gt-modal-footer">
              <button className="gt-btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="gt-btn-primary" onClick={handleCreate} disabled={createMutation.isPending}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
