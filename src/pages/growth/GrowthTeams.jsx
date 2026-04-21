import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Users, UserPlus, Clock, Calendar, Shield, Plus, Loader2, Check, X as XIcon, ChevronRight
} from 'lucide-react';
import { useGrowthTeams, useCreateTeam, useLeaveTeam, useFriends, useAvailableUsers, useSendFriendRequest, useAvailability, useSetAvailability, usePendingInvites, useRespondToInvite } from '../../hooks/queries/useGrowthTeams';
import api from '../../api/client';
import './GrowthTeams.css';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function GrowthTeams() {
  const { data: teams, isLoading } = useGrowthTeams();
  const { data: friends } = useFriends();
  const { data: availableUsers } = useAvailableUsers();
  const { data: invites } = usePendingInvites();
  const { data: availability } = useAvailability();

  const createTeamMutation = useCreateTeam();
  const leaveTeamMutation = useLeaveTeam();
  const sendFriendMutation = useSendFriendRequest();
  const setAvailMutation = useSetAvailability();
  const respondInviteMutation = useRespondToInvite();

  const [activeTab, setActiveTab] = useState('teams');
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

  const slots = DAYS.flatMap(d =>
    (availability || []).filter(s => s.dayOfWeek === DAYS.indexOf(d)).length > 0
      ? (availability || []).filter(s => s.dayOfWeek === DAYS.indexOf(d))
      : []
  );

  const [availForm, setAvailForm] = useState(
    DAYS.map((_, i) => [{ dayOfWeek: i, startTime: '20:00', endTime: '23:00', enabled: false }])
  );

  useEffect(() => {
    if (!availability || availability.length === 0) return;
    const grouped = DAYS.map((_, i) => {
      const daySlots = availability.filter(s => s.dayOfWeek === i);
      if (daySlots.length === 0) return [{ dayOfWeek: i, startTime: '20:00', endTime: '23:00', enabled: false }];
      return daySlots.map(s => ({ dayOfWeek: i, startTime: s.startTime, endTime: s.endTime, enabled: true, id: s.id }));
    });
    setAvailForm(grouped);
  }, [availability]);

  const addSlotToDay = (dayIndex) => {
    setAvailForm(prev => prev.map((slots, i) =>
      i === dayIndex ? [...slots, { dayOfWeek: dayIndex, startTime: '12:00', endTime: '15:00', enabled: true }] : slots
    ));
  };

  const removeSlotFromDay = (dayIndex, slotIndex) => {
    setAvailForm(prev => prev.map((slots, i) => {
      if (i !== dayIndex) return slots;
      const updated = slots.filter((_, j) => j !== slotIndex);
      return updated.length === 0 ? [{ dayOfWeek: dayIndex, startTime: '20:00', endTime: '23:00', enabled: false }] : updated;
    }));
  };

  const updateSlot = (dayIndex, slotIndex, field, value) => {
    setAvailForm(prev => prev.map((slots, i) => {
      if (i !== dayIndex) return slots;
      return slots.map((s, j) => j === slotIndex ? { ...s, [field]: value } : s);
    }));
  };

  const toggleDayEnabled = (dayIndex, slotIndex, enabled) => {
    setAvailForm(prev => prev.map((slots, i) => {
      if (i !== dayIndex) return slots;
      return slots.map((s, j) => j === slotIndex ? { ...s, enabled } : s);
    }));
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    await createTeamMutation.mutateAsync({ name: newTeamName });
    setNewTeamName('');
    setShowCreateTeam(false);
  };

  const handleSendFriendRequest = async () => {
    if (!selectedUserId) return;
    await sendFriendMutation.mutateAsync(selectedUserId);
    setSelectedUserId('');
  };

  const handleSaveAvailability = async () => {
    const enabledSlots = availForm.flatMap(daySlots =>
      daySlots.filter(s => s.enabled).map(s => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        isRecurring: true,
      }))
    );
    await setAvailMutation.mutateAsync(enabledSlots);
  };

  const handleRespondInvite = async (inviteId, status) => {
    await respondInviteMutation.mutateAsync({ inviteId, status });
  };

  if (isLoading) return <div className="gtm-page fade-in"><div className="gtm-loading"><Loader2 size={28} className="spinning" /></div></div>;

  return (
    <div className="gtm-page fade-in">
      <header className="ftm-header">
        <h1 className="ftm-title">Teams & Friends</h1>
        <span className="ftm-subtitle">Coordinate. Compete. Connect.</span>
      </header>

      <div className="ftm-tabs">
        {['teams', 'friends', 'availability', 'invites'].map(t => (
          <button key={t} className={`ftm-tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
            {t === 'teams' ? <Users size={14} /> : t === 'friends' ? <UserPlus size={14} /> : t === 'availability' ? <Clock size={14} /> : <Calendar size={14} />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'invites' && (invites || []).length > 0 && <span className="ftm-badge">{invites.length}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'teams' && (
        <div className="ftm-section">
          <div className="ftm-section-header">
            <h2>Your Teams</h2>
            <button className="ftm-add-btn" onClick={() => setShowCreateTeam(true)}><Plus size={14} /> Create</button>
          </div>
          <div className="ftm-teams-grid">
            {(teams || []).length === 0 ? (
              <div className="ftm-empty">No teams yet. Create one to start coordinating!</div>
            ) : teams.map(team => (
              <div key={team.id} className="ftm-team-card">
                <div className="ftm-team-header">
                  <h3>{team.name}</h3>
                  <span className="ftm-team-role">{team.role}</span>
                </div>
                {team.description && <p className="ftm-team-desc">{team.description}</p>}
                <div className="ftm-team-meta">
                  <span><Users size={12} /> {team.memberCount || team.members?.length || 0} members</span>
                </div>
                <div className="ftm-team-members">
                  {(team.members || []).slice(0, 5).map(m => (
                    <div key={m.id} className="ftm-member-avatar" title={`${m.user.firstName} ${m.user.lastName}`}>
                      {m.user.profilePicture ? <img src={m.user.profilePicture} alt="" /> : (m.user.firstName || 'U').charAt(0)}
                    </div>
                  ))}
                </div>
                <button className="ftm-leave-btn" onClick={() => leaveTeamMutation.mutate(team.id)}>Leave</button>
              </div>
            ))}
          </div>
          <div className="gt-collab-section" style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.75rem' }}>Today's Collaborative Schedule</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: '0 0 0.75rem' }}>Find the best time to play with your team</p>
            {teams && teams.length > 0 ? teams.map(team => (
              <div key={team.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{team.name}</span>
                <button
                  style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--primary)', background: 'none', border: '1px solid var(--primary)', borderRadius: 'var(--radius-sm)', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
                  onClick={async () => {
                    try {
                      const memberIds = team.members?.map(m => m.userId || m.id) || [];
                      if (memberIds.length < 2) {
                        toast.error('Need at least 2 members');
                        return;
                      }
                      const { data } = await api.post('/growth/teams/overlap', { userIds: memberIds });
                      toast.success(`Found ${data.data?.length || 0} overlapping slots`);
                    } catch { toast.error('Could not find overlap'); }
                  }}
                >
                  Find Best Time
                </button>
              </div>
            )) : (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: 0 }}>Join a team first to coordinate gaming sessions</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'friends' && (
        <div className="ftm-section">
          <div className="ftm-section-header"><h2>Friends</h2></div>
          <div className="ftm-add-friend">
            <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="ftm-user-select">
              <option value="">Select a user to add...</option>
              {(availableUsers || []).map(u => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
            <button className="ftm-add-btn" onClick={handleSendFriendRequest} disabled={!selectedUserId || sendFriendMutation.isPending}><UserPlus size={14} /> Add</button>
          </div>
          {(availableUsers || []).length === 0 && (
            <p className="ftm-hint">No more users available to add.</p>
          )}
          <div className="ftm-friends-list">
            {(friends || []).length === 0 ? (
              <div className="ftm-empty">No friends yet. Add someone to get started!</div>
            ) : friends.map(f => (
              <div key={f.friendshipId} className="ftm-friend-row">
                <div className="ftm-member-avatar">{(f.firstName || 'U').charAt(0)}</div>
                <span className="ftm-friend-name">{f.firstName} {f.lastName}</span>
              </div>
            ))}
          </div>
          {(invites || []).length > 0 && (
            <div className="ftm-pending-friends" style={{ marginTop: '1rem' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Pending Friend Requests</h3>
              {invites.filter(inv => !inv.team).map(inv => (
                <div key={inv.id} className="ftm-friend-row" style={{ marginBottom: '0.35rem' }}>
                  <div className="ftm-member-avatar">{(inv.inviter?.firstName || 'U').charAt(0)}</div>
                  <span className="ftm-friend-name">{inv.inviter?.firstName} {inv.inviter?.lastName}</span>
                  <div className="ftm-invite-actions" style={{ marginLeft: 'auto' }}>
                    <button className="ftm-accept-btn" onClick={() => handleRespondInvite(inv.id, 'ACCEPTED')}><Check size={14} /></button>
                    <button className="ftm-decline-btn" onClick={() => handleRespondInvite(inv.id, 'DECLINED')}><XIcon size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'availability' && (
        <div className="ftm-section">
          <div className="ftm-section-header"><h2>Gaming Availability</h2></div>
          <div className="ftm-avail-grid">
            {availForm.map((daySlots, dayIndex) => (
              <div key={dayIndex} className={`ftm-avail-row ${daySlots.some(s => s.enabled) ? 'enabled' : ''}`}>
                <div className="ftm-avail-day-header">
                  <label className="ftm-avail-day">
                    <input type="checkbox" checked={daySlots.some(s => s.enabled)}
                      onChange={e => {
                        const enabled = e.target.checked;
                        setAvailForm(prev => prev.map((slots, i) => {
                          if (i !== dayIndex) return slots;
                          return slots.map(s => ({ ...s, enabled }));
                        }));
                      }} />
                    {DAYS[dayIndex]}
                  </label>
                  <button className="ftm-add-slot-btn" onClick={() => addSlotToDay(dayIndex)} title="Add slot">
                    <Plus size={12} />
                  </button>
                </div>
                {daySlots.some(s => s.enabled) && daySlots.map((slot, slotIndex) => (
                  <div key={slotIndex} className="ftm-avail-slot">
                    <div className="ftm-avail-times">
                      <input type="time" value={slot.startTime}
                        onChange={e => updateSlot(dayIndex, slotIndex, 'startTime', e.target.value)} />
                      <span>to</span>
                      <input type="time" value={slot.endTime}
                        onChange={e => updateSlot(dayIndex, slotIndex, 'endTime', e.target.value)} />
                    </div>
                    {daySlots.length > 1 && (
                      <button className="ftm-remove-slot-btn" onClick={() => removeSlotFromDay(dayIndex, slotIndex)} title="Remove">
                        <XIcon size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <button className="ftm-save-btn" onClick={handleSaveAvailability} disabled={setAvailMutation.isPending}>
            {setAvailMutation.isPending ? <Loader2 size={14} className="spinning" /> : 'Save Availability'}
          </button>
        </div>
      )}

      {activeTab === 'invites' && (
        <div className="ftm-section">
          <div className="ftm-section-header"><h2>Pending Invites</h2></div>
          <div className="ftm-invites-list">
            {(invites || []).length === 0 ? (
              <div className="ftm-empty">No pending invites</div>
            ) : invites.map(inv => (
              <div key={inv.id} className="ftm-invite-row">
                <div className="ftm-invite-info">
                  <span className="ftm-invite-from">{inv.inviter.firstName} {inv.inviter.lastName}</span>
                  {inv.team && <span className="ftm-invite-team">{inv.team.name}</span>}
                </div>
                <div className="ftm-invite-actions">
                  <button className="ftm-accept-btn" onClick={() => handleRespondInvite(inv.id, 'ACCEPTED')}>
                    <Check size={14} />
                  </button>
                  <button className="ftm-decline-btn" onClick={() => handleRespondInvite(inv.id, 'DECLINED')}>
                    <XIcon size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreateTeam && (
        <div className="gt-modal-overlay" onClick={() => setShowCreateTeam(false)}>
          <div className="gt-modal" onClick={e => e.stopPropagation()}>
            <div className="gt-modal-header"><h2>Create Team</h2><button onClick={() => setShowCreateTeam(false)}>×</button></div>
            <div className="gt-modal-body">
              <label>Team Name</label>
              <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="Enter team name" />
            </div>
            <div className="gt-modal-footer">
              <button className="gt-btn-secondary" onClick={() => setShowCreateTeam(false)}>Cancel</button>
              <button className="gt-btn-primary" onClick={handleCreateTeam} disabled={createTeamMutation.isPending}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
