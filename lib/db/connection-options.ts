const dbConnectTimeoutSeconds = 5;
const supabasePoolerHostFragment = "pooler.supabase.com";
const supabasePoolerPort = "6543";

export function getDatabaseConnectionOptions(databaseUrl: string) {
  const isSupabasePooler = isSupabasePoolerDatabaseUrl(databaseUrl);

  return {
    connect_timeout: dbConnectTimeoutSeconds,
    prepare: false,
    max: isSupabasePooler ? 1 : 10,
    ...(isSupabasePooler ? { idle_timeout: 20 } : {}),
  };
}

export function isSupabasePoolerDatabaseUrl(databaseUrl: string) {
  try {
    const url = new URL(databaseUrl);

    return (
      url.hostname.includes(supabasePoolerHostFragment) ||
      url.port === supabasePoolerPort
    );
  } catch {
    return false;
  }
}
