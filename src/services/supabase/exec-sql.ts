import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logging';

const createFunctionSql = `
  CREATE OR REPLACE FUNCTION exec_sql(sql text)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
  BEGIN EXECUTE sql; END; $$;
`;

function splitSqlIntoStatements(sql: string): string[] {
  // Basic (imperfect, but same as original!) semicolon splitter, handles $$ and '
  const statements: string[] = [];
  let state = { inFunc: false, inStr: false, esc: false }, stmt = '';
  for (let i = 0; i < sql.length; i++) {
    let c = sql[i], n = sql[i + 1] || '';
    if (c === "'" && !state.esc) state.inStr = !state.inStr;
    state.esc = c === '\\' && state.inStr ? !state.esc : false;
    if (!state.inStr && c === '$' && n === '$') state.inFunc = !state.inFunc;
    stmt += c;
    if (c === ';' && !state.inStr && !state.inFunc) {
      statements.push(stmt);
      stmt = '';
    }
  }
  if (stmt.trim()) statements.push(stmt);
  return statements;
}

export async function createExecSqlFunction(
  url: string, serviceKey: string
): Promise<{ success: boolean; error?: string; }> {
  try {
    logger.info('Checking and creating exec_sql function', { module: 'init' });
    const adminClient = createClient(url, serviceKey);
    // Try calling it
    let exists = false;
    try {
      const { error } = await adminClient.rpc('exec_sql', { sql: 'SELECT 1' });
      exists = !error;
      if (exists) {
        logger.info('Exec_sql function is available', { module: 'init' });
        return { success: true };
      }
      logger.warn('Exec_sql function exists but may have issues, attempting to recreate', { module: 'init' });
    } catch {
      logger.info('The exec_sql function does not exist, creating it now', { module: 'init' });
    }
    // Create the function via SQL (your original logic -- may depend on setup)
    const result = await adminClient.auth.getSession();
    if (!result.data.session) return { success: false, error: 'No session available to execute SQL' };
    const resp = await fetch(`${url}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${result.data.session.access_token}`,
        apikey: serviceKey,
        'X-Client-Info': 'supabase-js'
      },
      body: JSON.stringify({ query: createFunctionSql })
    });
    if (!resp.ok) {
      const errorText = await resp.text();
      logger.error('Error creating exec_sql function:', errorText, { module: 'init' });
      return { success: false, error: `Failed to create exec_sql function: ${errorText}` };
    }
    logger.info('Successfully created exec_sql function', { module: 'init' });
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to check/create exec_sql function:', error, { module: 'init' });
    return { success: false, error: error.message || 'Unknown error' };
  }
}

export async function execSql(
  url: string, serviceKey: string, sql: string
): Promise<{ success: boolean; error?: string; }> {
  try {
    logger.info('Executing SQL query', { module: 'init', sqlLength: sql.length });
    const adminClient = createClient(url, serviceKey);
    const res = await createExecSqlFunction(url, serviceKey);
    if (!res.success) return res;
    const statements = splitSqlIntoStatements(sql);
    logger.info(`Split SQL into ${statements.length} statements`, { module: 'init' });
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (!stmt) continue;
      try {
        const { error } = await adminClient.rpc('exec_sql', { sql: stmt });
        if (error) {
          logger.error(`SQL execution failed at statement ${i + 1}/${statements.length}`, {
            module: 'init',
            error: error.message, details: error.details, hint: error.hint,
            statement: stmt.substring(0, 100) + (stmt.length > 100 ? '...' : '')
          });
          return { success: false, error: `SQL execution failed at statement ${i + 1}: ${error.message}` };
        }
      } catch (err: any) {
        logger.error(`Exception executing SQL statement ${i+1}/${statements.length}`, {
          module: 'init',
          error: err.message,
          statement: stmt.substring(0, 100) + (stmt.length > 100 ? '...' : '')
        });
        return { success: false, error: `SQL execution error at statement ${i+1}: ${err.message || 'Unknown error'}` };
      }
    }
    logger.info('All SQL statements executed successfully', { module: 'init' });
    return { success: true };
  } catch (error: any) {
    logger.error('Error during SQL execution', error);
    return { success: false, error: `SQL execution error: ${error.message || 'Unknown error'}` };
  }
}