import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.REACT_APP_DATABASE_URL, {
    fullResults: true,
    disableWarningInBrowsers: true
});

// Helper function for queries - extracts rows from result
export async function query(strings, ...values) {
    try {
        const result = await sql(strings, ...values);
        // Extract rows from the result object
        const data = result.rows || result || [];
        return { data, error: null };
    } catch (error) {
        console.error('Database query error:', error);
        return { data: null, error };
    }
}

// Export sql for direct use
export { sql };
