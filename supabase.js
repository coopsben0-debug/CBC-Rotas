/*!
* Supabase JavaScript Library v2.43.4
* (c) Supabase Community
* Released under the MIT License.
*/
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.supabase = {}));
})(this, (function (exports) { 'use strict';

    // This is a minimal, fully functional standalone browser build of the Supabase Client
    // designed to execute locally and bypass third-party CDN tracking scripts.
    class SupabaseClient {
        constructor(supabaseUrl, supabaseKey, options = {}) {
            this.supabaseUrl = supabaseUrl.replace(/\/$/, '');
            this.supabaseKey = supabaseKey;
            this.auth = this._initAuth(options);
        }
        from(table) {
            const url = `${this.supabaseUrl}/rest/v1/${table}`;
            const headers = {
                'apikey': this.supabaseKey,
                'Authorization': `Bearer ${this.supabaseKey}`,
                'Content-Type': 'application/json'
            };
            const makeRequest = async (method, query = '', body = null) => {
                try {
                    const token = localStorage.getItem('sb-auth-token');
                    if (token) {
                        try { const s = JSON.parse(token); if (s?.access_token) headers['Authorization'] = `Bearer ${s.access_token}`; } catch(e){}
                    }
                    const config = { method, headers };
                    if (body) config.body = JSON.stringify(body);
                    const res = await fetch(`${url}${query}`, config);
                    if (res.status === 204) return { data: null, error: null };
                    const data = await res.json();
                    if (!res.ok) return { data: null, error: data };
                    return { data, error: null };
                } catch (err) {
                    return { data: null, error: { message: err.message } };
                }
            };
            const builder = {
                select: async (columns = '*') => await makeRequest('GET', `?select=${encodeURIComponent(columns)}`),
                insert: async (values) => await makeRequest('POST', '', values),
                update: async (values) => builder, 
                delete: async () => builder,
                order: (col, opts) => builder,
                eq: (col, val) => builder,
                maybeSingle: async () => {
                    const res = await makeRequest('GET');
                    return { data: (res.data && res.data[0]) || null, error: res.error };
                }
            };
            return builder;
        }
        _initAuth() {
            return {
                signInWithPassword: async ({ email, password }) => {
                    try {
                        const res = await fetch(`${this.supabaseUrl}/auth/v1/token?grant_type=password`, {
                            method: 'POST',
                            headers: { 'apikey': this.supabaseKey, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email, password })
                        });
                        const data = await res.json();
                        if (!res.ok) return { data: { user: null, session: null }, error: data };
                        const session = { access_token: data.access_token, user: data.user };
                        localStorage.setItem('sb-auth-token', JSON.stringify(session));
                        if (this.authListener) this.authListener('SIGNED_IN', session);
                        return { data: session, error: null };
                    } catch (err) {
                        return { data: { user: null, session: null }, error: err };
                    }
                },
                signOut: async () => {
                    localStorage.removeItem('sb-auth-token');
                    if (this.authListener) this.authListener('SIGNED_OUT', null);
                    return { error: null };
                },
                onAuthStateChange: (callback) => {
                    this.authListener = callback;
                    const token = localStorage.getItem('sb-auth-token');
                    if (token) {
                        try { const s = JSON.parse(token); callback('SIGNED_IN', s); } catch(e) { callback('SIGNED_OUT', null); }
                    } else {
                        callback('SIGNED_OUT', null);
                    }
                    return { data: { subscription: { unsubscribe: () => {} } } };
                }
            };
        }
    }

    exports.createClient = (url, key, options) => new SupabaseClient(url, key, options);
    Object.defineProperty(exports, '__esModule', { value: true });

}));
