'use client';

import ConsistencyChecker, { type ConsistencyCheck } from '@/components/ConsistencyChecker';
import { useState } from 'react';

interface DashboardWithCheckerProps {
  children: React.ReactNode;
  consistencyChecks: ConsistencyCheck[];
}

export default function DashboardWithChecker({ 
  children, 
  consistencyChecks 
}: DashboardWithCheckerProps) {
  const [checks, setChecks] = useState(consistencyChecks);
  
  const handleRefresh = async () => {
    // Refresh consistency checks
    try {
      const response = await fetch('/api/consistency-check');
      const newChecks = await response.json();
      setChecks(newChecks);
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Konsistenz-Checks:', error);
    }
  };
  
  return (
    <>
      {children}
      <ConsistencyChecker 
        checks={checks} 
        onRefresh={handleRefresh}
      />
    </>
  );
}
