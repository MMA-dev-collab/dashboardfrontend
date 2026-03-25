import { create } from 'zustand';
import api from '../api/client';

const useBoardStore = create((set, get) => ({
  columns: [],
  tasks: [],
  sprints: [],
  loading: false,
  metrics: {
    totalPoints: 0,
    completedPoints: 0,
    completionRate: 0,
    taskCount: 0,
    completedCount: 0
  },

  fetchBoardData: async (projectId) => {
    set({ loading: true });
    try {
      const [colsRes, tasksRes, sprintsRes] = await Promise.all([
        api.get(`/projects/${projectId}/columns`),
        api.get(`/projects/${projectId}/tasks`),
        api.get(`/projects/${projectId}/sprints`)
      ]);
      
      const columns = colsRes.data.data;
      const tasks = tasksRes.data.data;
      const sprints = sprintsRes.data.data;
      
      // Calculate Metrics
      const doneColumn = columns.find(c => c.name.toUpperCase() === 'DONE');
      const totalPoints = tasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
      const completedTasks = doneColumn ? tasks.filter(t => t.columnId === doneColumn.id) : [];
      const completedPoints = completedTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
      
      set({ 
        columns, 
        tasks, 
        sprints,
        metrics: {
            totalPoints,
            completedPoints,
            completionRate: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
            taskCount: tasks.length,
            completedCount: completedTasks.length
        },
        loading: false 
      });
    } catch {
      set({ loading: false });
    }
  },

  // Optimistic UI updates
  moveTask: async (projectId, taskId, toColumnId, version) => {
    // 1. Save previous state for rollback
    const previousTasks = get().tasks;
    
    // 2. Optimistically update local state
    set((state) => ({
      tasks: state.tasks.map(t => 
        t.id === taskId ? { ...t, columnId: toColumnId, version: t.version + 1 } : t
      )
    }));

    try {
      // 3. Fire to backend
      const { data } = await api.patch(`/projects/${projectId}/tasks/${taskId}/move`, {
        toColumnId,
        version
      });
      // Optional: sync with returned accurate server data
      set((state) => {
          const newTasks = state.tasks.map(t => t.id === taskId ? data.data : t);
          // Re-calculate metrics
          const doneColumn = state.columns.find(c => c.name.toUpperCase() === 'DONE');
          const totalPoints = newTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
          const completedTasks = doneColumn ? newTasks.filter(t => t.columnId === doneColumn.id) : [];
          const completedPoints = completedTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
          
          return {
              tasks: newTasks,
              metrics: {
                  totalPoints,
                  completedPoints,
                  completionRate: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
                  taskCount: newTasks.length,
                  completedCount: completedTasks.length
              }
          };
      });
    } catch (error) {
      // 4. Rollback on failure (optimistic lock rejection, network error)
      alert(error.response?.data?.message || 'Failed to move task. Reverting.');
      set({ tasks: previousTasks });
    }
  },

  addTask: async (projectId, data) => {
    const res = await api.post(`/projects/${projectId}/tasks`, data);
    set((state) => {
        const newTasks = [res.data.data, ...state.tasks];
        // Re-calculate metrics
        const doneColumn = state.columns.find(c => c.name.toUpperCase() === 'DONE');
        const totalPoints = newTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
        const completedTasks = doneColumn ? newTasks.filter(t => t.columnId === doneColumn.id) : [];
        const completedPoints = completedTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);

        return {
            tasks: newTasks,
            metrics: {
                totalPoints,
                completedPoints,
                completionRate: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
                taskCount: newTasks.length,
                completedCount: completedTasks.length
            }
        };
    });
  }
}));

export default useBoardStore;
