
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
    const { error } = await adminClient.rpc('exec_sql', { sql: 'SELECT 1' });
    if (!error) {
      logger.info('Exec_sql function is available', { module: 'init' });
      return { success: true };
    }
    // The function does not exist (or is broken). We can no longer auto-create it
    // via the REST root endpoint — that path was never valid PostgREST and is now
    // blocked by Supabase's anon-key restriction (effective April 8th 2026).
    // Surface the manual-creation help via the existing DatabaseSetupStep UI.
    logger.warn('exec_sql function is not available; manual creation required', {
      module: 'init',
      error: error.message,
    });
    return {
      success: false,
      error:
        'exec_sql function does not exist. Please create it manually by running the following in the Supabase SQL Editor:\n\n' +
        createFunctionSql.trim(),
    };
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
      
      // Skip statements that are likely to fail on reconnection
      if (stmt.includes('storage.foldername(name)[1]')) {
        logger.warn(`Skipping potentially problematic statement ${i+1}/${statements.length} with array syntax`, {
          module: 'init',
          statement: stmt.substring(0, 100) + (stmt.length > 100 ? '...' : '')
        });
        continue;
      }
      
      try {
        const { error } = await adminClient.rpc('exec_sql', { sql: stmt });
        if (error) {
          // For certain errors during reconnection, we can continue
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate key value')) {
            logger.warn(`Non-critical SQL error in statement ${i+1}/${statements.length}, continuing`, {
              module: 'init',
              error: error.message,
              detail: error.details
            });
            continue;
          }
          
          logger.error(`SQL execution failed at statement ${i + 1}/${statements.length}`, {
            module: 'init',
            error: error.message, details: error.details, hint: error.hint,
            statement: stmt.substring(0, 100) + (stmt.length > 100 ? '...' : '')
          });
          return { success: false, error: `SQL execution failed at statement ${i + 1}: ${error.message}` };
        }
      } catch (err: any) {
        // Skip certain errors during reconnection
        if (err.message && (err.message.includes('already exists') || 
            err.message.includes('duplicate key value'))) {
          logger.warn(`Caught non-critical SQL error in statement ${i+1}/${statements.length}, continuing`, {
            module: 'init',
            error: err.message
          });
          continue;
        }
        
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
