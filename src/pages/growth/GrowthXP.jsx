import { useState } from 'react';
import {
  Trophy, Flame, TrendingUp, Zap, Star, Crown, Medal, Award, Loader2
} from 'lucide-react';
import { useXpProfile, useXpLogs, useXpLeaderboard, useXpStreak, useXpMultipliers } from '../../hooks/queries/useGrowthXP';
import './GrowthXP.css';

const RANK_ICONS = [Crown, Medal, Award];

export default function GrowthXP() {
  const { data: profile, isLoading: profileLoading } = useXpProfile();
  const { data: streak } = useXpStreak();
  const { data: multipliers } = useXpMultipliers();
  const { data: logs } = useXpLogs({ page: 1, limit: 20 });
  const [lbType, setLbType] = useState('global');
  const { data: leaderboard } = useXpLeaderboard(lbType);

  if (profileLoading) return <div className="gxp-page fade-in"><div className="gxp-loading"><Loader2 size={28} className="spinning" /></div></div>;

  const totalXp = profile?.totalXp || 0;
  const level = profile?.currentLevel || 1;
  const xpInfo = profile?.xpToNextLevel || {};
  const progressPct = xpInfo.progressPct || 0;
  const currentStreak = streak?.currentStreak || 0;
  const longestStreak = streak?.longestStreak || 0;
  const streakMultiplier = streak?.multiplier || 1.0;

  return (
    <div className="gxp-page fade-in">
      <header className="gxp-header">
        <h1 className="gxp-title">XP & Leaderboard</h1>
        <span className="gxp-subtitle">Track your growth. Climb the ranks.</span>
      </header>

      <div className="gxp-top-row">
        <div className="gxp-level-card">
          <div className="gxp-level-badge">
            <span className="gxp-level-num">{level}</span>
            <span className="gxp-level-label">LEVEL</span>
          </div>
          <div className="gxp-xp-info">
            <div className="gxp-xp-bar-container">
              <div className="gxp-xp-bar" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="gxp-xp-text">
              <span className="gxp-xp-current">{totalXp.toLocaleString()} XP</span>
              <span className="gxp-xp-remaining">{xpInfo.remaining || 0} XP to Level {level + 1}</span>
            </div>
          </div>
        </div>

        <div className="gxp-streak-card">
          <div className="gxp-streak-visual">
            <Flame size={32} className={`gxp-flame ${currentStreak >= 7 ? 'legendary' : currentStreak >= 5 ? 'epic' : currentStreak >= 3 ? 'hot' : ''}`} />
            <div className="gxp-streak-stats">
              <span className="gxp-streak-count">{currentStreak}</span>
              <span className="gxp-streak-label">day streak</span>
            </div>
          </div>
          <div className="gxp-streak-meta">
            <div className="gxp-sm"><span>Best</span><span className="gxp-sm-val">{longestStreak} days</span></div>
            <div className="gxp-sm"><span>Multiplier</span><span className="gxp-sm-val gxp-mult">{streakMultiplier}x</span></div>
          </div>
        </div>

        {multipliers?.activeMultipliers?.length > 0 && (
          <div className="gxp-multi-card">
            <h3>Active Multipliers</h3>
            {multipliers.activeMultipliers.map((m, i) => (
              <div key={i} className="gxp-multi-item">
                <span className="gxp-multi-name">{m.name}</span>
                <span className="gxp-multi-val">{m.value}x</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="gxp-bottom-row">
        <div className="gxp-log-card">
          <h3>XP History</h3>
          <div className="gxp-log-list">
            {(logs?.data || []).length === 0 ? (
              <p className="gxp-empty">No XP earned yet. Complete tasks to start!</p>
            ) : (logs.data || []).map(log => (
              <div key={log.id} className={`gxp-log-item ${log.amount < 0 ? 'negative' : 'positive'}`}>
                <div className="gxp-log-left">
                  <Zap size={14} />
                  <div>
                    <span className="gxp-log-source">{log.source.replace(/_/g, ' ').toLowerCase()}</span>
                    {log.description && <span className="gxp-log-desc">{log.description}</span>}
                  </div>
                </div>
                <div className="gxp-log-right">
                  <span className="gxp-log-amount">{log.amount > 0 ? '+' : ''}{log.amount} XP</span>
                  {log.multiplier > 1.0 && <span className="gxp-log-mult">×{log.multiplier}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="gxp-lb-card">
          <div className="gxp-lb-header">
            <h3>Leaderboard</h3>
            <div className="gxp-lb-tabs">
              <button className={`gxp-lb-tab ${lbType === 'global' ? 'active' : ''}`} onClick={() => setLbType('global')}>All Time</button>
              <button className={`gxp-lb-tab ${lbType === 'weekly' ? 'active' : ''}`} onClick={() => setLbType('weekly')}>This Week</button>
            </div>
          </div>
          <div className="gxp-lb-list">
            {(leaderboard || []).length === 0 ? (
              <p className="gxp-empty">No one on the leaderboard yet</p>
            ) : leaderboard.map((entry, i) => {
              const RankIcon = RANK_ICONS[i] || Star;
              const xpVal = lbType === 'weekly' ? entry.weeklyXp : entry.totalXp;
              return (
                <div key={entry.id || i} className={`gxp-lb-row ${i < 3 ? `rank-${i + 1}` : ''}`}>
                  <div className="gxp-lb-rank">
                    {i < 3 ? <RankIcon size={18} /> : <span className="gxp-lb-rank-num">{entry.rank || i + 1}</span>}
                  </div>
                  <div className="gxp-lb-user">
                    <span className="gxp-lb-name">{entry.firstName} {entry.lastName}</span>
                    <span className="gxp-lb-level">Lvl {entry.currentLevel}</span>
                  </div>
                  <span className="gxp-lb-xp">{(xpVal || 0).toLocaleString()} XP</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
