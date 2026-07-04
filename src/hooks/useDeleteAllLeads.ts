import { useState } from 'react';

import { useLeads } from '@/hooks/LeadsContext';
import { deleteAllLeads } from '@/services/leads';

/** Delete-all-leads action with a confirm prompt and busy state. */
export function useDeleteAllLeads() {
  const { refresh } = useLeads();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (busy) return;
    if (
      !window.confirm(
        'Delete all leads? This permanently removes every lead in your workspace.'
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await deleteAllLeads();
      await refresh();
    } catch (err) {
      console.error('Failed to clear leads:', err);
      window.alert('Sorry — clearing leads failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return { run, busy };
}
