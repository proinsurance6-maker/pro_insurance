'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import EmptyState from '@/components/dashboard/empty-state';
import { ANIMATIONS } from '@/lib/animations';

export default function ExamplePage() {
  const router = useRouter();
  const [hasData, setHasData] = useState(false);

  // Example: Check if data exists
  if (!hasData) {
    return (
      <EmptyState
        title="No Data Found"
        description="You haven't added any items yet. Start by creating your first entry."
        animationUrl={ANIMATIONS.NO_DATA}
        action={{
          label: "Add New Item",
          onClick: () => router.push('/dashboard/add')
        }}
      />
    );
  }

  return (
    <div>
      {/* Your normal page content */}
    </div>
  );
}
