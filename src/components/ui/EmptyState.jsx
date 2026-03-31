import React from 'react';
import { PackageOpen } from 'lucide-react';

export default function EmptyState({ title, description, icon: Icon, action }) {
  const DisplayIcon = Icon || PackageOpen;
  
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-card rounded-lg border border-border mt-4">
      <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mb-4">
        <DisplayIcon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title || 'No data found'}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {description || 'There is currently no data to display here. Try adjusting your filters or creating a new item.'}
      </p>
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}
