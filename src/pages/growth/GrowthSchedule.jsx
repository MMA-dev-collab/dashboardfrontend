import { useState, useMemo, useCallback } from 'react';
import {
  Clock, Zap, Gamepad2, Coffee, Calendar, Plus, Trash2, Loader2, Wand2, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useGrowthSchedule, useAddBlock, useRemoveBlock } from '../../hooks/queries/useGrowthSchedule';
import { useGrowthTodayTasks } from '../../hooks/queries/useGrowthTasks';
import { useVirtualizer } from '@tanstack/react-virtual';
import './GrowthSchedule.css';

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);
const BLOCK_COLORS = { TASK: '#6c5ce7', FIXED_EVENT: '#ff6348', GAMING: '#2ed573', FOCUS_BLOCK: '#1e90ff', BREAK: '#ffa502' };
const BLOCK_ICONS = { TASK: Zap, FIXED_EVENT: Calendar, GAMING: Gamepad2, FOCUS_BLOCK: Clock, BREAK: Coffee };

export default function GrowthSchedule() {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [newBlock, setNewBlock] = useState({ title: '', blockType: 'TASK', startHour: 9, startMin: 0, duration: 60 });

  const { data: schedule, isLoading } = useGrowthSchedule(selectedDate);
  const { data: todayTasks } = useGrowthTodayTasks();
  const addBlockMutation = useAddBlock();
  const removeBlockMutation = useRemoveBlock();

  const blocks = schedule?.blocks || [];
  const unscheduledTasks = (todayTasks?.tasks || []).filter(t => t.status === 'PENDING' || t.status === 'ACTIVE');

  const needsVirtualization = blocks.length > 50;

  const parentRef = useCallback((node) => {
    if (!node) return;
  }, []);

  const virtualizer = useVirtualizer({
    count: HOURS.length * 2,
    getScrollElement: () => null,
    estimateSize: () => 60,
    overscan: 5,
  });

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getBlockPosition = (block) => {
    const start = new Date(block.startTime);
    const end = new Date(block.endTime);
    const startMinutes = (start.getHours() - 6) * 60 + start.getMinutes();
    const endMinutes = (end.getHours() - 6) * 60 + end.getMinutes();
    return { top: (startMinutes / (18 * 60)) * 100, height: ((endMinutes - startMinutes) / (18 * 60)) * 100 };
  };

  const handleAddBlock = async () => {
    if (!schedule?.id || !newBlock.title) return;
    const d = new Date(selectedDate);
    const startTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), newBlock.startHour, newBlock.startMin);
    const endTime = new Date(startTime.getTime() + newBlock.duration * 60000);
    await addBlockMutation.mutateAsync({
      scheduleId: schedule.id,
      title: newBlock.title,
      blockType: newBlock.blockType,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      color: BLOCK_COLORS[newBlock.blockType],
    });
    setShowAddBlock(false);
    setNewBlock({ title: '', blockType: 'TASK', startHour: 9, startMin: 0, duration: 60 });
  };

  const handleRemoveBlock = async (blockId) => {
    if (!schedule?.id) return;
    await removeBlockMutation.mutateAsync({ scheduleId: schedule.id, blockId });
  };

  const navigateDate = (offset) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const freeTime = schedule?.totalFreeTime || 0;
  const scheduledTime = schedule?.totalScheduledTime || 0;
  const totalDay = 18 * 60;

  return (
    <div className="gs-page fade-in">
      <header className="gs-header">
        <div className="gs-header-left">
          <h1 className="gs-title">Schedule</h1>
          <div className="gs-date-nav">
            <button onClick={() => navigateDate(-1)}><ChevronLeft size={18} /></button>
            <span className="gs-date-label">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            <button onClick={() => navigateDate(1)}><ChevronRight size={18} /></button>
          </div>
        </div>
        <button className="gs-add-btn" onClick={() => setShowAddBlock(true)}>
          <Plus size={16} /> Add Block
        </button>
      </header>

      <div className="gs-layout">
        <div className="gs-sidebar">
          <div className="gs-sidebar-section">
            <h3>Free Time</h3>
            <div className="gs-free-time-ring">
              <svg viewBox="0 0 100 100" className="gs-ring-svg">
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-light)" strokeWidth="8" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#2ed573" strokeWidth="8"
                  strokeDasharray={`${(freeTime / totalDay) * 251.3} 251.3`}
                  strokeDashoffset="0" strokeLinecap="round" transform="rotate(-90 50 50)" />
              </svg>
              <div className="gs-ring-text">
                <span className="gs-ring-value">{Math.floor(freeTime / 60)}h {freeTime % 60}m</span>
                <span className="gs-ring-label">free</span>
              </div>
            </div>
            <div className="gs-time-stats">
              <div className="gs-time-stat"><span>Scheduled</span><span>{Math.floor(scheduledTime / 60)}h {scheduledTime % 60}m</span></div>
              <div className="gs-time-stat"><span>Free</span><span className="gs-free-val">{Math.floor(freeTime / 60)}h {freeTime % 60}m</span></div>
            </div>
          </div>

          <div className="gs-sidebar-section">
            <h3>Task Pool</h3>
            <div className="gs-task-pool">
              {unscheduledTasks.length === 0 ? (
                <p className="gs-pool-empty">All tasks scheduled</p>
              ) : unscheduledTasks.map(t => (
                <div key={t.id} className="gs-pool-item">
                  <span className="gs-pool-dot" style={{ background: BLOCK_COLORS.TASK }} />
                  <span className="gs-pool-title">{t.title}</span>
                  <span className="gs-pool-duration">{t.duration}m</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="gs-timeline-container">
          <div className="gs-timeline">
            <div className="gs-time-labels">
              {HOURS.map(h => (
                <div key={h} className="gs-time-label">
                  {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                </div>
              ))}
            </div>
            <div className="gs-grid" ref={parentRef}>
              {HOURS.map(h => (
                <div key={h} className="gs-hour-row">
                  <div className="gs-hour-line" />
                </div>
              ))}
              <div className="gs-blocks-layer">
                {blocks.map(block => {
                  const pos = getBlockPosition(block);
                  const Icon = BLOCK_ICONS[block.blockType] || Clock;
                  const color = block.color || BLOCK_COLORS[block.blockType] || '#6c5ce7';
                  return (
                    <div key={block.id} className="gs-block" style={{
                      top: `${pos.top}%`, height: `${Math.max(pos.height, 2)}%`,
                      background: `${color}18`, borderLeft: `3px solid ${color}`,
                    }}>
                      <div className="gs-block-header">
                        <Icon size={12} style={{ color }} />
                        <span className="gs-block-title">{block.title}</span>
                        <button className="gs-block-delete" onClick={() => handleRemoveBlock(block.id)}>
                          <Trash2 size={10} />
                        </button>
                      </div>
                      <span className="gs-block-time" style={{ color }}>
                        {formatTime(block.startTime)} – {formatTime(block.endTime)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="gs-now-line" style={{
                top: `${(((new Date().getHours() - 6) * 60 + new Date().getMinutes()) / (18 * 60)) * 100}%`,
              }}>
                <div className="gs-now-dot" />
                <div className="gs-now-bar" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAddBlock && (
        <div className="gt-modal-overlay" onClick={() => setShowAddBlock(false)}>
          <div className="gt-modal" onClick={e => e.stopPropagation()}>
            <div className="gt-modal-header">
              <h2>Add Schedule Block</h2>
              <button onClick={() => setShowAddBlock(false)}>×</button>
            </div>
            <div className="gt-modal-body">
              <label>Title</label>
              <input value={newBlock.title} onChange={e => setNewBlock({ ...newBlock, title: e.target.value })} placeholder="Block name" />
              <label>Type</label>
              <select value={newBlock.blockType} onChange={e => setNewBlock({ ...newBlock, blockType: e.target.value })}>
                <option value="TASK">Task</option>
                <option value="FIXED_EVENT">Fixed Event</option>
                <option value="GAMING">Gaming</option>
                <option value="FOCUS_BLOCK">Focus Block</option>
                <option value="BREAK">Break</option>
              </select>
              <label>Start Time</label>
              <div className="gs-time-inputs">
                <select value={newBlock.startHour} onChange={e => setNewBlock({ ...newBlock, startHour: parseInt(e.target.value) })}>
                  {HOURS.map(h => <option key={h} value={h}>{h}:00</option>)}
                </select>
                <select value={newBlock.startMin} onChange={e => setNewBlock({ ...newBlock, startMin: parseInt(e.target.value) })}>
                  <option value={0}>:00</option>
                  <option value={15}>:15</option>
                  <option value={30}>:30</option>
                  <option value={45}>:45</option>
                </select>
              </div>
              <label>Duration (min)</label>
              <input type="number" value={newBlock.duration} onChange={e => setNewBlock({ ...newBlock, duration: parseInt(e.target.value) || 30 })} min={15} max={480} />
            </div>
            <div className="gt-modal-footer">
              <button className="gt-btn-secondary" onClick={() => setShowAddBlock(false)}>Cancel</button>
              <button className="gt-btn-primary" onClick={handleAddBlock} disabled={addBlockMutation.isPending}>Add Block</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
