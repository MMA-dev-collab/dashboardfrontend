import { BarChart2, TrendingUp, Activity } from 'lucide-react';
import useBoardStore from '../../store/useBoardStore';
import '../Shared.css';

export default function AgileMetrics({ projectId }) {
    const { metrics } = useBoardStore();

    return (
        <div className="fade-in">
            <div className="card-grid p-mb-6">
                <div className="card">
                    <div className="card-body p-flex p-items-center p-gap-4">
                        <div className="p-avatar p-bg-light p-text-primary"><Activity size={24} /></div>
                        <div>
                            <div className="p-text-sm p-text-tertiary">Current Project Velocity</div>
                            <div className="p-text-2xl p-font-bold">{metrics.totalPoints} <span className="p-text-sm p-font-medium p-text-tertiary">pts</span></div>
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="card-body p-flex p-items-center p-gap-4">
                        <div className="p-avatar p-bg-light p-text-success"><TrendingUp size={24} /></div>
                        <div>
                            <div className="p-text-sm p-text-tertiary">Completion Rate</div>
                            <div className="p-text-2xl p-font-bold">{metrics.completionRate}%</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header p-border-b p-flex p-items-center p-gap-2">
                    <BarChart2 size={18} className="p-text-primary" />
                    <h3 className="card-title m-0">Sprint Burndown & Analytics</h3>
                </div>
                <div className="card-body p-flex p-items-center p-justify-center" style={{ height: '300px' }}>
                    <div className="p-text-center p-text-tertiary p-text-sm">
                        <p>A dynamically rendering Burndown SVG Chart reading from `TaskHistory` over time.</p>
                        <p>Implementation of Chart.js or Recharts to map velocity per sprint goes here.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
