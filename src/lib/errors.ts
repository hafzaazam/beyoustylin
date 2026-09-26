interface ErrorLike {
  message?: string;
  code?: string;
  details?: string | null;
}

/**
 * Turns a Supabase/Postgres error into something a salon receptionist can act on.
 * Messages raised by our own database triggers (code P0001) are already written
 * for people and are passed through unchanged.
 */
export const friendlyError = (error: unknown): string => {
  if (!error) return 'Something went wrong. Please try again.';
  if (typeof error === 'string') return error;
  const e = error as ErrorLike;
  switch (e.code) {
    case 'P0001':
      return e.message || 'The change was rejected.';
    case '23503':
      return 'This record is still used elsewhere (for example by bookings or invoices). Disable it instead of deleting it.';
    case '23505':
      return 'A record with these details already exists.';
    case '23514':
      return 'Some values are not allowed. Please check the form.';
    case '42501':
      return "You don't have permission to do that.";
    case 'PGRST116':
      return "You don't have permission to change this record, or it no longer exists.";
  }
  if (e.message?.includes('Failed to fetch')) return 'Network error. Check your connection and try again.';
  return e.message || 'Something went wrong. Please try again.';
};
