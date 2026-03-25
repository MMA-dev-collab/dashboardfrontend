import { memo, useMemo } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Clock, MessageSquare, AlertCircle, CheckCircle, Circle, GripVertical, Tag } from 'lucide-react';

const typeIcons = {
    STORY: <CheckCircle size={14} className="p-text-green" />,
    BUG: <AlertCircle size={14} className="p-text-danger" />,
    TASK: <Circle size={14} className="p-text-info" />,
    EPIC: <Tag size={14} className="p-text-warning" />
};

export const TaskCard = memo(({ task, onClick }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: { task }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
        cursor: 'default',
        transition: isDragging ? 'none' : 'box-shadow 0.2s ease, transform 0.1s ease',
    };

    // Map taskTags to tag objects
    const tags = useMemo(() => (task.taskTags || []).map(tt => tt.tag).filter(Boolean), [task.taskTags]);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="card p-mb-2 p-p-3 p-rounded-lg p-shadow-sm p-bg-white p-transition-shadow p-hover-shadow-md p-border"
            onClick={onClick}
        >
            <div className="p-flex p-justify-between p-items-start p-mb-1">
                <h4 className="m-0 p-text-xs p-font-bold p-text-text" style={{ flex: 1, paddingRight: '0.5rem', lineHeight: '1.4' }}>{task.title}</h4>
                <div className="p-flex p-items-center p-gap-1">
                    <span className="p-text-[10px] p-text-tertiary p-bg-light p-rounded p-px-1.5 p-py-0.5 p-font-bold">{task.storyPoints || '-'}</span>
                    <span
                        {...attributes}
                        {...listeners}
                        onClick={e => e.stopPropagation()}
                        style={{ cursor: 'grab', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', padding: '2px' }}
                        title="Drag to move"
                    >
                        <GripVertical size={14} />
                    </span>
                </div>
            </div>

            {/* Tag Chips */}
            {tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '6px' }}>
                    {tags.map(tag => (
                        <span
                            key={tag.id}
                            style={{
                                display: 'inline-block',
                                background: tag.color + '15',
                                color: tag.color,
                                border: `1px solid ${tag.color}33`,
                                borderRadius: '4px',
                                padding: '0px 4px',
                                fontSize: '9px',
                                fontWeight: 600,
                            }}
                        >
                            {tag.name}
                        </span>
                    ))}
                </div>
            )}

            <div className="p-flex p-justify-between p-items-center p-mt-2">
                <div className="p-flex p-items-center p-gap-2">
                    {typeIcons[task.type] || typeIcons.TASK}
                    {task.assignee ? (
                        <div className="p-flex p-items-center p-gap-1">
                            <div className="p-w-5 p-h-5 p-rounded-full p-bg-primary-light p-text-primary p-flex p-items-center p-justify-center p-text-[9px] p-font-bold p-shrink-0" style={{ overflow: 'hidden' }}>
                                {task.assignee.profilePicture ? (
                                    <img src={task.assignee.profilePicture} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    task.assignee.firstName?.charAt(0) || 'U'
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-w-5 p-h-5 p-rounded-full p-bg-light p-border p-border-dashed p-flex p-items-center p-justify-center p-text-[9px] p-text-tertiary p-shrink-0" title="Unassigned">?</div>
                    )}
                </div>
                {task.comments?.length > 0 && (
                    <div className="p-flex p-items-center p-gap-1 p-text-[10px] p-text-tertiary">
                        <MessageSquare size={10} /> {task.comments.length}
                    </div>
                )}
            </div>
        </div>
    );
});

export const BoardColumn = memo(({ column, tasks, onTaskClick }) => {
    const { isOver, setNodeRef } = useDroppable({
        id: column.id,
        data: { column }
    });

    const sortedTasks = useMemo(() => [...tasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [tasks]);

    return (
        <div
            ref={setNodeRef}
            className={`board-column p-rounded-xl p-p-2`}
            style={{
                minWidth: '280px',
                flex: '0 0 280px',
                height: '100%',
                backgroundColor: isOver ? 'var(--primary-light, #eef2ff)' : 'var(--bg-card, #f4f5f7)',
                border: isOver ? '1px dashed var(--primary)' : '1px solid transparent',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s ease',
            }}
        >
            <div className="p-flex p-justify-between p-items-center p-mb-3 p-px-1">
                <h3 className="m-0 p-text-xs p-font-bold p-uppercase p-text-tertiary" style={{ letterSpacing: '0.05em' }}>{column.name}</h3>
                <span className="p-text-[10px] p-bg-white p-border p-rounded-md p-px-1.5 p-font-bold p-text-tertiary">{tasks.length}</span>
            </div>
            <div className="task-list-container p-overflow-y-auto" style={{ flex: 1, minHeight: '150px' }}>
                {sortedTasks.map(task => (
                    <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
                ))}
            </div>
        </div>
    );
});
