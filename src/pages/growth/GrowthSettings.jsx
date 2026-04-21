import { useState, useEffect } from 'react';
import { Moon, Sun, Gamepad2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGrowthSettings, useUpdateGrowthSettings } from '../../hooks/queries/useGrowthSettings';
import './GrowthSettings.css';

const COMMON_TIMEZONES = [
  'Africa/Cairo', 'Africa/Lagos', 'Africa/Johannesburg',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Shanghai', 'Asia/Tokyo',
  'Australia/Sydney', 'Pacific/Auckland', 'UTC',
];

export default function GrowthSettings() {
  const { data: settings, isLoading } = useGrowthSettings();
  const updateSettings = useUpdateGrowthSettings();

  const [form, setForm] = useState({
    sleepTime: '23:00',
    wakeTime: '08:00',
    timezone: '',
    totalGamingMinutes: 120,
    soloGamingMinutes: 60,
    collabGamingMinutes: 60,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        sleepTime: settings.sleepTime || '23:00',
        wakeTime: settings.wakeTime || '08:00',
        timezone: settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        totalGamingMinutes: settings.totalGamingMinutes || 120,
        soloGamingMinutes: settings.soloGamingMinutes || 60,
        collabGamingMinutes: settings.collabGamingMinutes || 60,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    if (form.soloGamingMinutes + form.collabGamingMinutes !== form.totalGamingMinutes) {
      toast.error('Solo + Collaborative must equal Total gaming time');
      return;
    }
    try {
      await updateSettings.mutateAsync(form);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    }
  };

  const handleRatioChange = (total, soloPercent) => {
    const solo = Math.round(total * soloPercent / 100);
    const collab = total - solo;
    setForm(f => ({ ...f, totalGamingMinutes: total, soloGamingMinutes: solo, collabGamingMinutes: collab }));
  };

  if (isLoading) return <div className="gs-loading"><div className="spinner" /> Loading settings...</div>;

  const soloPercent = form.totalGamingMinutes > 0
    ? Math.round((form.soloGamingMinutes / form.totalGamingMinutes) * 100)
    : 50;

  const sleepWindowEnd = form.sleepTime
    ? (() => { const [h, m] = form.sleepTime.split(':').map(Number); const t = h * 60 + m + 30; return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; })()
    : '';

  const wakeWindowEnd = form.wakeTime
    ? (() => { const [h, m] = form.wakeTime.split(':').map(Number); const t = h * 60 + m + 30; return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; })()
    : '';

  return (
    <div className="gs-container">
      <div className="gs-header">
        <h1>Growth Settings</h1>
        <p className="gs-subtitle">Configure your daily routine and gaming time</p>
      </div>

      <div className="gs-grid">
        <div className="gs-card">
          <h2 className="gs-card-title">Timezone</h2>
          <div className="gs-form-group">
            <label className="gs-label">Your timezone</label>
            <select
              className="gs-select"
              value={form.timezone}
              onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
            >
              {COMMON_TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="gs-card">
          <h2 className="gs-card-title">Sleep & Wake Times</h2>
          <div className="gs-time-grid">
            <div className="gs-form-group">
              <label className="gs-label"><Moon size={14} /> Sleep time</label>
              <input
                type="time"
                className="gs-input"
                value={form.sleepTime}
                onChange={e => setForm(f => ({ ...f, sleepTime: e.target.value }))}
              />
              {sleepWindowEnd && <span className="gs-window-hint">Window: {form.sleepTime} — {sleepWindowEnd}</span>}
            </div>
            <div className="gs-form-group">
              <label className="gs-label"><Sun size={14} /> Wake time</label>
              <input
                type="time"
                className="gs-input"
                value={form.wakeTime}
                onChange={e => setForm(f => ({ ...f, wakeTime: e.target.value }))}
              />
              {wakeWindowEnd && <span className="gs-window-hint">Window: {form.wakeTime} — {wakeWindowEnd}</span>}
            </div>
          </div>
        </div>

        <div className="gs-card">
          <h2 className="gs-card-title"><Gamepad2 size={16} /> Gaming Time</h2>
          <div className="gs-form-group">
            <label className="gs-label">Total daily gaming time: {form.totalGamingMinutes} min ({Math.floor(form.totalGamingMinutes / 60)}h {form.totalGamingMinutes % 60}m)</label>
            <input
              type="range"
              min={30}
              max={480}
              step={15}
              value={form.totalGamingMinutes}
              onChange={e => handleRatioChange(Number(e.target.value), soloPercent)}
              className="gs-range"
            />
          </div>
          <div className="gs-form-group">
            <label className="gs-label">Solo vs Collaborative: {soloPercent}% solo / {100 - soloPercent}% collaborative</label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={soloPercent}
              onChange={e => handleRatioChange(form.totalGamingMinutes, Number(e.target.value))}
              className="gs-range"
            />
          </div>
          <div className="gs-split-preview">
            <div className="gs-split-bar">
              <div className="gs-split-solo" style={{ width: `${soloPercent}%` }} />
            </div>
            <div className="gs-split-labels">
              <span><span className="gs-dot solo" /> Solo: {form.soloGamingMinutes} min</span>
              <span><span className="gs-dot collab" /> Collab: {form.collabGamingMinutes} min</span>
            </div>
          </div>
        </div>
      </div>

      <div className="gs-actions">
        <button className="gs-save-btn" onClick={handleSave} disabled={updateSettings.isPending}>
          <Save size={16} />
          {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
