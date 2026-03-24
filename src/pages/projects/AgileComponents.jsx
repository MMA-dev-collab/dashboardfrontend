import { memo } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Clock, MessageSquare, AlertCircle, CheckCircle, Circle, GripVertical } from 'lucide-react';

const typeIcons = {
    STORY: <CheckCircle size={14} className="p-text-green" />,
    BUG: <AlertCircle size={14} className="p-text-danger" />,
    TASK: <Circle size={14} className="p-text-info" />
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

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="card p-mb-3 p-p-4 p-rounded-xl p-shadow-sm p-bg-white p-transition-shadow p-hover-shadow-md"
            onClick={onClick}
        >
            <div className="p-flex p-justify-between p-items-start p-mb-3">
                <h4 className="m-0 p-text-sm p-font-bold p-text-primary" style={{ flex: 1, paddingRight: '0.5rem', lineHeight: '1.4' }}>{task.title}</h4>
                <div className="p-flex p-items-center p-gap-2">
                    <span className="p-text-xs p-bg-light p-rounded-md p-px-2 p-py-1 p-font-semibold">{task.storyPoints || '-'}</span>
                    <span
                        {...attributes}
                        {...listeners}
                        onClick={e => e.stopPropagation()}
                        style={{ cursor: 'grab', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', padding: '4px' }}
                        title="Drag to move"
                    >
                        <GripVertical size={18} />
                    </span>
                </div>
            </div>
            
            <div className="p-flex p-justify-between p-items-center p-mt-4">
                <div className="p-flex p-items-center p-gap-2">
                    {typeIcons[task.type] || typeIcons.TASK}
                    {task.assignee ? (
                        <div className="p-flex p-items-center p-gap-2">
                            <div className="p-w-6 p-h-6 p-rounded-full p-bg-primary-light p-text-primary p-flex p-items-center p-justify-center p-text-[10px] p-font-bold p-shrink-0" style={{ overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                                {task.assignee.profilePicture ? (
                                    <img src={task.assignee.profilePicture} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    task.assignee.firstName?.charAt(0) || 'U'
                                )}
                            </div>
                            <span className="p-text-xs p-text-secondary p-font-medium">{task.assignee.firstName}</span>
                        </div>
                    ) : (
                        <span className="p-text-[10px] p-text-tertiary p-uppercase p-font-bold">Unassigned</span>
                    )}
                </div>
                {task.comments?.length > 0 && (
                    <div className="p-flex p-items-center p-gap-1 p-text-xs p-text-tertiary p-bg-light p-px-2 p-py-1 p-rounded-md">
                        <MessageSquare size={12} /> {task.comments.length}
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

    return (
        <div
            ref={setNodeRef}
            className={`board-column p-bg-light p-rounded-lg p-p-3 ${isOver ? 'p-border-primary' : ''}`}
            style={{
                minWidth: '300px',
                flex: '0 0 300px',
                height: '100%',
                border: isOver ? '2px dashed #007bff' : '2px solid transparent',
                transition: 'all 0.2s ease'
            }}
        >
            <div className="p-flex p-justify-between p-items-center p-mb-4">
                <h3 className="m-0 p-text-sm p-font-bold p-uppercase p-text-tertiary">{column.name}</h3>
                <span className="p-text-xs p-bg-card p-rounded-lg p-p-1 p-font-semibold">{tasks.length}</span>
            </div>
            <div className="task-list-container" style={{ minHeight: '150px' }}>
                {tasks.map(task => (
                    <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
                ))}
            </div>
        </div>
    );
});
